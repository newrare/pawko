import { STORAGE_KEYS } from "../configs/constants.js";
import { EventEmitter } from "../utils/event-emitter.js";

/**
 * CurrencyManager — single soft-currency (coins).
 *
 * Persistent across runs. Read by the Shop / Ability scenes, written by
 * the game controller (coin pegs) and the dev admin panel.
 *
 * Emits `change` whenever the balance moves; the new balance is passed
 * to subscribers as the first argument.
 */
class CurrencyManager extends EventEmitter {
  /** @type {number} */
  #coins = 0;

  constructor() {
    super();
    this.#load();
  }

  /** @returns {number} */
  get() {
    return this.#coins;
  }

  /**
   * Credit the balance. Negative or zero amounts are ignored.
   * @param {number} amount
   */
  add(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.#coins += Math.floor(amount);
    this.#save();
    this.emit("change", this.#coins);
  }

  /**
   * Attempt to spend `amount`. Returns true on success, false if the
   * balance is insufficient or the amount invalid.
   * @param {number} amount
   * @returns {boolean}
   */
  spend(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const cost = Math.floor(amount);
    if (this.#coins < cost) return false;
    this.#coins -= cost;
    this.#save();
    this.emit("change", this.#coins);
    return true;
  }

  reset() {
    if (this.#coins === 0) {
      this.#save();
      return;
    }
    this.#coins = 0;
    this.#save();
    this.emit("change", 0);
  }

  /** @internal — for tests */
  _resetForTests() {
    this.#coins = 0;
    localStorage.removeItem(STORAGE_KEYS.CURRENCY);
    this.clear();
  }

  // ─── Persistence ─────────────────────────────────────

  #load() {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENCY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (Number.isFinite(data?.coins)) this.#coins = Math.max(0, data.coins);
    } catch {
      /* ignore malformed payload */
    }
  }

  #save() {
    try {
      localStorage.setItem(
        STORAGE_KEYS.CURRENCY,
        JSON.stringify({ coins: this.#coins }),
      );
    } catch (err) {
      console.error("[currency] failed to persist:", err);
    }
  }
}

export const currencyManager = new CurrencyManager();
