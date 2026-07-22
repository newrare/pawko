import { STORAGE_KEYS } from "../configs/constants.js";
import { EventEmitter } from "../utils/event-emitter.js";
import { ABILITY_DEFS, findAbility } from "../configs/ability-defs.js";

/**
 * AbilityManager — persistent, direct-effect unlocks paid in diamonds.
 *
 * Buying an ability is one-time and persists across runs. Its `modifiers`
 * apply immediately, resolved through `resolve(paramKey, baseValue)` — this
 * manager is the single source of every **permanent** parameter (shop
 * discount, gate widths, map reveal, slot-machine wheels).
 *
 * Side note: this manager does not deduct diamonds — callers are expected
 * to call `diamondManager.spend(def.cost)` first and then `unlock()` on
 * success.
 */
class AbilityManager extends EventEmitter {
  /** @type {Set<string>} */
  #unlocked = new Set();

  constructor() {
    super();
    this.#load();
  }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  isUnlocked(id) {
    return this.#unlocked.has(id);
  }

  /** @returns {string[]} */
  getUnlocked() {
    return [...this.#unlocked];
  }

  getAll() {
    return ABILITY_DEFS;
  }

  /**
   * Mark an ability as unlocked. No-op if already unlocked or unknown id.
   * Does not deduct coins — caller is responsible for that.
   * @param {string} id
   * @returns {boolean} true when the unlock was performed
   */
  unlock(id) {
    if (!findAbility(id)) return false;
    if (this.#unlocked.has(id)) return false;
    this.#unlocked.add(id);
    this.#save();
    this.emit("change", id);
    return true;
  }

  /**
   * Apply every unlocked ability's `modifiers` targeting `paramKey` to
   * `baseValue`. Mirrors `bonusManager.resolve()` — order add → multiply →
   * set. Used by direct-effect abilities (e.g. GATE), whose effect applies
   * the moment they are unlocked, with no shop step.
   * @template T
   * @param {string} paramKey
   * @param {T} baseValue
   * @returns {T}
   */
  resolve(paramKey, baseValue) {
    const adds = [];
    const muls = [];
    const sets = [];
    for (const id of this.#unlocked) {
      const def = findAbility(id);
      for (const mod of def?.modifiers ?? []) {
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

  reset() {
    if (this.#unlocked.size === 0) return;
    this.#unlocked.clear();
    this.#save();
    this.emit("change", null);
  }

  /** @internal — for tests */
  _resetForTests() {
    this.#unlocked.clear();
    localStorage.removeItem(STORAGE_KEYS.ABILITIES);
    this.clear();
  }

  // ─── Persistence ─────────────────────────────────────

  #load() {
    const raw = localStorage.getItem(STORAGE_KEYS.ABILITIES);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data?.unlocked)) {
        for (const id of data.unlocked) {
          if (findAbility(id)) this.#unlocked.add(id);
        }
      }
    } catch {
      /* ignore malformed payload */
    }
  }

  #save() {
    try {
      localStorage.setItem(
        STORAGE_KEYS.ABILITIES,
        JSON.stringify({ unlocked: [...this.#unlocked] }),
      );
    } catch (err) {
      console.error("[ability] failed to persist:", err);
    }
  }
}

export const abilityManager = new AbilityManager();
