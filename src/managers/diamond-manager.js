import { STORAGE_KEYS } from "../configs/constants.js";
import { EventEmitter } from "../utils/event-emitter.js";

/**
 * DiamondManager — premium currency used to unlock abilities.
 *
 * Mirrors `currencyManager` but stores diamonds. Diamonds drop from
 * `DiamondPeg`, `ChestPeg`, `MysteryPeg`, etc.
 */
class DiamondManager extends EventEmitter {
  /** @type {number} */
  #diamonds = 0;

  constructor() {
    super();
    this.#load();
  }

  /** @returns {number} */
  get() {
    return this.#diamonds;
  }

  /** @param {number} amount */
  add(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.#diamonds += Math.floor(amount);
    this.#save();
    this.emit("change", this.#diamonds);
  }

  /**
   * @param {number} amount
   * @returns {boolean}
   */
  spend(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const cost = Math.floor(amount);
    if (this.#diamonds < cost) return false;
    this.#diamonds -= cost;
    this.#save();
    this.emit("change", this.#diamonds);
    return true;
  }

  reset() {
    if (this.#diamonds === 0) {
      this.#save();
      return;
    }
    this.#diamonds = 0;
    this.#save();
    this.emit("change", 0);
  }

  /** @internal — for tests */
  _resetForTests() {
    this.#diamonds = 0;
    localStorage.removeItem(STORAGE_KEYS.DIAMONDS);
    this.clear();
  }

  #load() {
    const raw = localStorage.getItem(STORAGE_KEYS.DIAMONDS);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (Number.isFinite(data?.diamonds)) {
        this.#diamonds = Math.max(0, data.diamonds);
      }
    } catch {
      /* ignore malformed payload */
    }
  }

  #save() {
    try {
      localStorage.setItem(
        STORAGE_KEYS.DIAMONDS,
        JSON.stringify({ diamonds: this.#diamonds }),
      );
    } catch (err) {
      console.error("[diamond] failed to persist:", err);
    }
  }
}

export const diamondManager = new DiamondManager();
