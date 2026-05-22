import { STORAGE_KEYS } from "../configs/constants.js";
import { EventEmitter } from "../utils/event-emitter.js";
import {
  BONUS_TYPES,
  BONUS_CATEGORIES,
  PERMANENT_BONUSES,
  SESSION_BONUSES,
  SESSION_MALUSES,
  findBonus,
} from "../configs/bonus-defs.js";

/**
 * BonusManager — owns four pieces of state:
 *
 *  1. **unlocked** (persistent): permanent bonuses the player owns.
 *     Persisted under `STORAGE_KEYS.BONUSES`.
 *  2. **session** (transient): session bonuses *and* maluses currently
 *     active. Each entry has a `remaining` counter expressed in levels;
 *     `Infinity` means run-scoped (only cleared on `clearSession()` /
 *     `resetAll()` / a new run).
 *  3. **directive queue** (transient): one-shot actions queued at the
 *     moment a session entry is activated. Drained by the game
 *     controller at the start of the next round via
 *     `consumeDirectives()`.
 *
 * `resolve(paramKey, baseValue)` walks every active modifier
 * (permanent + session bonus + session malus) and applies them in
 * `add → multiply → set` order.
 *
 * Emits `change` on every state mutation.
 */
class BonusManager extends EventEmitter {
  /** @type {Set<string>} owned permanent bonus IDs */
  #unlocked = new Set();

  /** @type {Map<string, number>} session id → remaining levels (Infinity = run-scoped) */
  #session = new Map();

  /** @type {import('../configs/bonus-defs.js').BonusDirective[]} */
  #directives = [];

  constructor() {
    super();
    this.#load();
  }

  // ─── Permanent bonuses ─────────────────────────────────────

  /**
   * @param {string} id
   * @returns {boolean} true when newly unlocked
   */
  unlockPermanent(id) {
    const def = findBonus(id);
    if (!def || def.type !== BONUS_TYPES.PERMANENT) return false;
    if (this.#unlocked.has(id)) return false;
    this.#unlocked.add(id);
    this.#save();
    this.emit("change");
    return true;
  }

  /** @param {string} id */
  isPermanentUnlocked(id) {
    return this.#unlocked.has(id);
  }

  /** @returns {string[]} */
  getUnlockedPermanent() {
    return [...this.#unlocked];
  }

  // ─── Session entries (bonuses + maluses) ───────────────────

  /**
   * Activate a session entry — bonus OR malus. `durationLevels == null`
   * is stored as Infinity (run-scoped). Refreshes the duration when
   * already active. Queues every directive carried by the def.
   * @param {string} id
   * @returns {boolean}
   */
  activateSession(id) {
    const def = findBonus(id);
    if (!def || def.type !== BONUS_TYPES.SESSION) return false;
    const dur = def.durationLevels == null ? Infinity : def.durationLevels;
    this.#session.set(id, dur);
    if (Array.isArray(def.directives)) {
      for (const d of def.directives) this.#directives.push(d);
    }
    this.emit("change");
    return true;
  }

  /**
   * Convenience wrapper for maluses. Same semantics as activateSession()
   * but rejects ids that are not maluses.
   * @param {string} id
   */
  activateMalus(id) {
    const def = findBonus(id);
    if (!def || def.category !== BONUS_CATEGORIES.MALUS) return false;
    return this.activateSession(id);
  }

  /** @param {string} id */
  isSessionActive(id) {
    return this.#session.has(id);
  }

  /**
   * @returns {Array<{ id: string, remaining: number, def: import('../configs/bonus-defs.js').BonusDef }>}
   */
  getActiveSession() {
    const out = [];
    for (const [id, remaining] of this.#session) {
      const def = findBonus(id);
      if (def) out.push({ id, remaining, def });
    }
    return out;
  }

  /**
   * Drain and return every pending one-shot directive. Called once per
   * round by the game controller.
   * @returns {import('../configs/bonus-defs.js').BonusDirective[]}
   */
  consumeDirectives() {
    if (this.#directives.length === 0) return [];
    const out = this.#directives;
    this.#directives = [];
    return out;
  }

  /**
   * Tick session counters down by one level. Entries with Infinity
   * remaining (run-scoped) are skipped. Expiring entries' `onExpire`
   * callbacks run before they are removed.
   * @param {object} [ctx]
   */
  onLevelUp(ctx = {}) {
    if (this.#session.size === 0) return;
    const expired = [];
    for (const [id, remaining] of this.#session) {
      if (!Number.isFinite(remaining)) continue;
      const next = remaining - 1;
      if (next <= 0) expired.push(id);
      else this.#session.set(id, next);
    }
    for (const id of expired) {
      this.#session.delete(id);
      const def = findBonus(id);
      def?.onExpire?.(ctx);
    }
    this.emit("change");
  }

  /** Clears every session entry + pending directive (used on game over / new run). */
  clearSession() {
    if (this.#session.size === 0 && this.#directives.length === 0) return;
    this.#session.clear();
    this.#directives = [];
    this.emit("change");
  }

  // ─── Modifier resolution ───────────────────────────────────

  /**
   * Apply every active modifier targeting `paramKey` to `baseValue`.
   * Order: add → multiply → set.
   * @template T
   * @param {string} paramKey
   * @param {T} baseValue
   * @returns {T}
   */
  resolve(paramKey, baseValue) {
    const adds = [];
    const muls = [];
    const sets = [];
    for (const def of this.#activeDefs()) {
      for (const mod of def.modifiers ?? []) {
        if (mod.paramKey !== paramKey) continue;
        if (mod.op === "add") adds.push(mod.value);
        else if (mod.op === "multiply") muls.push(mod.value);
        else if (mod.op === "set") sets.push(mod.value);
      }
    }

    let value = baseValue;
    if (adds.length || muls.length) {
      let n = Number(value);
      for (const v of adds) n += Number(v);
      for (const v of muls) n *= Number(v);
      value = /** @type {T} */ (n);
    }
    if (sets.length) value = /** @type {T} */ (sets[sets.length - 1]);
    return value;
  }

  *#activeDefs() {
    for (const id of this.#unlocked) {
      const def = findBonus(id);
      if (def) yield def;
    }
    for (const id of this.#session.keys()) {
      const def = findBonus(id);
      if (def) yield def;
    }
  }

  // ─── Catalogue helpers ─────────────────────────────────────

  getAllPermanent() {
    return PERMANENT_BONUSES;
  }

  getAllSession() {
    return SESSION_BONUSES;
  }

  getAllMaluses() {
    return SESSION_MALUSES;
  }

  /** Shop catalogue — maluses are never sold. */
  getAll() {
    return [...PERMANENT_BONUSES, ...SESSION_BONUSES];
  }

  // ─── Reset ─────────────────────────────────────────────────

  resetAll() {
    this.#unlocked.clear();
    this.#session.clear();
    this.#directives = [];
    this.#save();
    this.emit("change");
  }

  /**
   * Remove every owned permanent bonus. Leaves session entries
   * untouched.
   * @returns {boolean} true if at least one entry was cleared
   */
  clearPermanent() {
    if (this.#unlocked.size === 0) return false;
    this.#unlocked.clear();
    this.#save();
    this.emit("change");
    return true;
  }

  /**
   * Remove every active session entry whose category matches
   * `category`. Pending directives are left alone — they were already
   * queued for the next round and may have come from entries we are
   * keeping.
   * @param {'bonus' | 'malus'} category
   * @returns {boolean} true if at least one entry was cleared
   */
  #clearSessionByCategory(category) {
    const toDelete = [];
    for (const id of this.#session.keys()) {
      const def = findBonus(id);
      if (def?.category === category) toDelete.push(id);
    }
    if (toDelete.length === 0) return false;
    for (const id of toDelete) this.#session.delete(id);
    this.emit("change");
    return true;
  }

  /**
   * Remove every active session **bonus** (category === 'bonus').
   * Maluses stay in place.
   * @returns {boolean} true if at least one entry was cleared
   */
  clearSessionBonuses() {
    return this.#clearSessionByCategory(BONUS_CATEGORIES.BONUS);
  }

  /**
   * Remove every active session **malus** (category === 'malus').
   * Bonuses stay in place.
   * @returns {boolean} true if at least one entry was cleared
   */
  clearSessionMaluses() {
    return this.#clearSessionByCategory(BONUS_CATEGORIES.MALUS);
  }

  /** @internal — for tests */
  _resetForTests() {
    this.#unlocked.clear();
    this.#session.clear();
    this.#directives = [];
    localStorage.removeItem(STORAGE_KEYS.BONUSES);
    this.clear();
  }

  // ─── Persistence ───────────────────────────────────────────

  #load() {
    const raw = localStorage.getItem(STORAGE_KEYS.BONUSES);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data?.unlocked)) {
        for (const id of data.unlocked) {
          const def = findBonus(id);
          if (def?.type === BONUS_TYPES.PERMANENT) this.#unlocked.add(id);
        }
      }
    } catch {
      /* ignore malformed payload */
    }
  }

  #save() {
    try {
      localStorage.setItem(
        STORAGE_KEYS.BONUSES,
        JSON.stringify({ unlocked: [...this.#unlocked] }),
      );
    } catch (err) {
      console.error("[bonus] failed to persist:", err);
    }
  }
}

export const bonusManager = new BonusManager();
