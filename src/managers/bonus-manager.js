import { EventEmitter } from "../utils/event-emitter.js";
import {
  BONUS_CATEGORIES,
  DURATION_UNITS,
  RANDOM_DURATIONS,
  REWARD_BONUSES,
  REWARD_MALUSES,
  findBonus,
} from "../configs/bonus-defs.js";

/**
 * BonusManager — owns the **run-scoped** reward state. Nothing here is
 * persisted: rewards live and die within a single run.
 *
 *  1. **session** (transient): reward bonuses *and* maluses currently active.
 *     Each entry is `{ unit, remaining, modifiers }`:
 *       - `unit` — the countdown unit (`level` / `shop` / `mystery` / `run`).
 *       - `remaining` — ticks left in that unit; `Infinity` = run-scoped.
 *       - `modifiers` — the def's modifiers with any `values` magnitude
 *         **already rolled** at activation and frozen for the lifetime.
 *  2. **directive queue** (transient): one-shot actions queued when a reward
 *     is activated. Drained by the game controller once per round via
 *     `consumeDirectives()`.
 *  3. **pending session** (transient): rewards queued to activate at the start
 *     of the next round (used by the mystery peg).
 *
 * Both a reward's duration (when `durationRandom`) and each `values` modifier
 * magnitude are rolled **once, at activation**, using an injectable RNG.
 *
 * `resolve(paramKey, baseValue)` walks every active modifier (bonus + malus)
 * and applies them in `add → multiply → set` order.
 * `getActiveTriggers(event)` returns the active event-driven triggers for a
 * gameplay event, dispatched by the controller.
 *
 * Emits `change` on every state mutation.
 */
class BonusManager extends EventEmitter {
  /** @type {Map<string, { unit: string, remaining: number, modifiers: import('../configs/bonus-defs.js').BonusModifier[] }>} */
  #session = new Map();

  /** @type {import('../configs/bonus-defs.js').BonusDirective[]} */
  #directives = [];

  /** @type {string[]} reward ids queued to activate at the next pinboard start */
  #pendingSession = [];

  // ─── Session entries (bonuses + maluses) ───────────────────

  /**
   * Roll a reward's duration into `{ unit, remaining }`. `durationRandom` picks
   * uniformly from `RANDOM_DURATIONS`; otherwise `durationLevels` is used
   * (`null` → run-scoped / Infinity).
   * @param {import('../configs/bonus-defs.js').BonusDef} def
   * @param {() => number} rng
   */
  #rollDuration(def, rng) {
    if (def.durationRandom) {
      const i = Math.min(
        RANDOM_DURATIONS.length - 1,
        Math.floor(rng() * RANDOM_DURATIONS.length),
      );
      const opt = RANDOM_DURATIONS[i];
      return { unit: opt.unit, remaining: opt.count };
    }
    if (def.durationLevels == null) {
      return { unit: DURATION_UNITS.RUN, remaining: Infinity };
    }
    return { unit: DURATION_UNITS.LEVEL, remaining: def.durationLevels };
  }

  /**
   * Resolve a def's modifiers into concrete `{ paramKey, op, value }`, rolling
   * one magnitude from any `values` array.
   * @param {import('../configs/bonus-defs.js').BonusDef} def
   * @param {() => number} rng
   * @returns {import('../configs/bonus-defs.js').BonusModifier[]}
   */
  #rollModifiers(def, rng) {
    return (def.modifiers ?? []).map((m) => {
      if (Array.isArray(m.values) && m.values.length > 0) {
        const i = Math.min(
          m.values.length - 1,
          Math.floor(rng() * m.values.length),
        );
        return { paramKey: m.paramKey, op: m.op, value: m.values[i] };
      }
      return { paramKey: m.paramKey, op: m.op, value: m.value };
    });
  }

  /**
   * Activate a reward — bonus OR malus. The duration (and any variable modifier
   * magnitude) is rolled now and frozen. Re-activating refreshes the entry.
   * Queues every directive carried by the def.
   * @param {string} id
   * @param {{ rng?: () => number }} [opts]
   * @returns {boolean}
   */
  activateSession(id, { rng = Math.random } = {}) {
    const def = findBonus(id);
    if (!def) return false;
    const { unit, remaining } = this.#rollDuration(def, rng);
    const modifiers = this.#rollModifiers(def, rng);
    this.#session.set(id, { unit, remaining, modifiers });
    if (Array.isArray(def.directives)) {
      for (const d of def.directives) this.#directives.push(d);
    }
    this.emit("change");
    return true;
  }

  /**
   * Convenience wrapper for maluses. Same semantics as activateSession() but
   * rejects ids that are not maluses.
   * @param {string} id
   * @param {{ rng?: () => number }} [opts]
   */
  activateMalus(id, opts) {
    const def = findBonus(id);
    if (!def || def.category !== BONUS_CATEGORIES.MALUS) return false;
    return this.activateSession(id, opts);
  }

  /** @param {string} id */
  isSessionActive(id) {
    return this.#session.has(id);
  }

  /**
   * @returns {Array<{ id: string, remaining: number, unit: string, def: import('../configs/bonus-defs.js').BonusDef }>}
   */
  getActiveSession() {
    const out = [];
    for (const [id, entry] of this.#session) {
      const def = findBonus(id);
      if (def)
        out.push({ id, remaining: entry.remaining, unit: entry.unit, def });
    }
    return out;
  }

  /**
   * Drain and return every pending one-shot directive. Called once per round
   * by the game controller.
   * @returns {import('../configs/bonus-defs.js').BonusDirective[]}
   */
  consumeDirectives() {
    if (this.#directives.length === 0) return [];
    const out = this.#directives;
    this.#directives = [];
    return out;
  }

  /**
   * Queue a reward to be activated at the start of the next pinboard. Used by
   * MysteryPeg so the reward takes effect on the following level.
   * @param {string} id
   */
  queueSessionNext(id) {
    if (!findBonus(id)) return;
    this.#pendingSession.push(id);
  }

  /**
   * Activate every pending queued reward. Called once at the start of each
   * pinboard round (alongside consumeDirectives).
   */
  consumeQueuedSessions() {
    if (this.#pendingSession.length === 0) return;
    for (const id of this.#pendingSession) this.activateSession(id);
    this.#pendingSession = [];
  }

  /**
   * Tick every session entry counted in `unit` down by one. Run-scoped entries
   * (Infinity) and entries in other units are skipped. Expiring entries'
   * `onExpire` callbacks run before removal.
   * @param {string} unit — a DURATION_UNITS value
   * @param {object} [ctx]
   */
  #tick(unit, ctx = {}) {
    if (this.#session.size === 0) return;
    const expired = [];
    for (const [id, entry] of this.#session) {
      if (entry.unit !== unit) continue;
      if (!Number.isFinite(entry.remaining)) continue;
      const next = entry.remaining - 1;
      if (next <= 0) expired.push(id);
      else entry.remaining = next;
    }
    for (const id of expired) {
      this.#session.delete(id);
      findBonus(id)?.onExpire?.(ctx);
    }
    this.emit("change");
  }

  /**
   * Tick level-scoped entries. Called on level victory.
   * @param {object} [ctx]
   */
  onLevelUp(ctx = {}) {
    this.#tick(DURATION_UNITS.LEVEL, ctx);
  }

  /**
   * Tick shop-scoped entries. Called when the boutique is entered.
   * @param {object} [ctx]
   */
  onShopVisited(ctx = {}) {
    this.#tick(DURATION_UNITS.SHOP, ctx);
  }

  /**
   * Tick mystery-scoped entries. Called when a mystery reward is drawn (before
   * the new reward is applied, so the drawing mystery does not count itself).
   * @param {object} [ctx]
   */
  onMysteryDraw(ctx = {}) {
    this.#tick(DURATION_UNITS.MYSTERY, ctx);
  }

  /** Clears every session entry + pending directive + queued sessions (used on game over / new run). */
  clearSession() {
    if (
      this.#session.size === 0 &&
      this.#directives.length === 0 &&
      this.#pendingSession.length === 0
    )
      return;
    this.#session.clear();
    this.#directives = [];
    this.#pendingSession = [];
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
    for (const entry of this.#session.values()) {
      for (const mod of entry.modifiers ?? []) {
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

  /**
   * Return the active event-driven triggers for a gameplay event, in
   * activation order. The controller applies each `{ def, trigger }` through
   * its `#applyTriggers` dispatcher.
   * @param {string} event — one of TRIGGER_EVENTS
   * @returns {Array<{ def: import('../configs/bonus-defs.js').BonusDef, trigger: import('../configs/bonus-defs.js').BonusTrigger }>}
   */
  getActiveTriggers(event) {
    const out = [];
    for (const id of this.#session.keys()) {
      const def = findBonus(id);
      for (const trigger of def?.triggers ?? []) {
        if (trigger.on === event) out.push({ def, trigger });
      }
    }
    return out;
  }

  // ─── Catalogue helpers ─────────────────────────────────────

  getAllBonuses() {
    return REWARD_BONUSES;
  }

  getAllMaluses() {
    return REWARD_MALUSES;
  }

  // ─── Reset ─────────────────────────────────────────────────

  resetAll() {
    this.clearSession();
  }

  /**
   * Remove every active session entry whose category matches `category`.
   * Pending directives are left alone.
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
   * @returns {boolean} true if at least one entry was cleared
   */
  clearSessionBonuses() {
    return this.#clearSessionByCategory(BONUS_CATEGORIES.BONUS);
  }

  /**
   * Remove every active session **malus** (category === 'malus').
   * @returns {boolean} true if at least one entry was cleared
   */
  clearSessionMaluses() {
    return this.#clearSessionByCategory(BONUS_CATEGORIES.MALUS);
  }

  /** @internal — for tests */
  _resetForTests() {
    this.#session.clear();
    this.#directives = [];
    this.#pendingSession = [];
    this.clear();
  }
}

export const bonusManager = new BonusManager();
