import { STORAGE_KEYS } from "../configs/constants.js";
import { EventEmitter } from "../utils/event-emitter.js";
import {
  BONUS_TYPES,
  PERMANENT_BONUSES,
  SESSION_BONUSES,
  ALL_BONUSES,
  findBonus,
} from "../configs/bonus-defs.js";

/**
 * BonusManager — owns two pieces of state:
 *
 *  1. **unlocked** (persistent): permanent bonuses the player owns.
 *     Persisted under `STORAGE_KEYS.BONUSES`.
 *  2. **active session** (transient): session bonuses currently running,
 *     each with a `remaining` level counter. Cleared on `clearSession()`.
 *
 * `resolve(paramKey, baseValue)` walks every active modifier (permanent
 * unlocked + session active) and applies them in `add → multiply → set`
 * order. The game controller calls this at the few sites that consume
 * gameplay tuning instead of reading `PLINKO.*` directly.
 *
 * Emits `change` on every state mutation.
 */
class BonusManager extends EventEmitter {
  /** @type {Set<string>} owned permanent bonus IDs */
  #unlocked = new Set();

  /** @type {Map<string, number>} session bonus id -> remaining levels */
  #session = new Map();

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

  // ─── Session bonuses ───────────────────────────────────────

  /**
   * Activate a session bonus with its full `durationLevels`. If already
   * active, refreshes the duration.
   * @param {string} id
   * @returns {boolean}
   */
  activateSession(id) {
    const def = findBonus(id);
    if (!def || def.type !== BONUS_TYPES.SESSION) return false;
    this.#session.set(id, def.durationLevels ?? 1);
    this.emit("change");
    return true;
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
   * Tick session counters down by one level. Calls each expiring bonus's
   * `onExpire(ctx)` callback before removing it.
   * @param {object} [ctx] context passed to onExpire callbacks
   */
  onLevelUp(ctx = {}) {
    if (this.#session.size === 0) return;
    const expired = [];
    for (const [id, remaining] of this.#session) {
      const next = remaining - 1;
      if (next <= 0) {
        expired.push(id);
      } else {
        this.#session.set(id, next);
      }
    }
    for (const id of expired) {
      this.#session.delete(id);
      const def = findBonus(id);
      def?.onExpire?.(ctx);
    }
    this.emit("change");
  }

  clearSession() {
    if (this.#session.size === 0) return;
    this.#session.clear();
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
    if (sets.length) {
      // Last 'set' wins, matching the order the bonuses are iterated.
      value = /** @type {T} */ (sets[sets.length - 1]);
    }
    return value;
  }

  /** Iterates every currently active bonus def (permanent + session). */
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

  getAll() {
    return ALL_BONUSES;
  }

  // ─── Reset ─────────────────────────────────────────────────

  /** Wipes everything (unlocked + session). Used by `Reset all data`. */
  resetAll() {
    this.#unlocked.clear();
    this.#session.clear();
    this.#save();
    this.emit("change");
  }

  /** @internal — for tests */
  _resetForTests() {
    this.#unlocked.clear();
    this.#session.clear();
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
