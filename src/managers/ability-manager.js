import { STORAGE_KEYS } from "../configs/constants.js";
import { EventEmitter } from "../utils/event-emitter.js";
import {
  ABILITY_DEFS,
  abilityForBonus,
  findAbility,
} from "../configs/ability-defs.js";

/**
 * AbilityManager — persistent unlocks that gate bonuses in the shop.
 *
 * Buying an ability is one-time, persistent across runs. The Shop scene
 * filters its catalogue through `canBuyBonus(id)`.
 *
 * Side note: this manager does not deduct coins — callers are expected
 * to call `currencyManager.spend(def.cost)` first and then `unlock()`
 * on success.
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
   * Returns true if at least one unlocked ability gates `bonusId`,
   * or if the bonus has no ability gate at all.
   * @param {string} bonusId
   * @returns {boolean}
   */
  canBuyBonus(bonusId) {
    const ab = abilityForBonus(bonusId);
    if (!ab) return true; // ungated
    return this.#unlocked.has(ab.id);
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
