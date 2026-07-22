import { EventEmitter } from "../utils/event-emitter.js";
import { findPegShopItem } from "../configs/peg-shop-defs.js";

/**
 * PegShopManager — the boutique's **run-scoped** acquisition state.
 *
 * Buying a peg type in the boutique adds it to the slot-machine pool for the
 * **current run only**. This state is fully transient: it is NOT persisted and
 * is wiped by `reset()` at the start of every run (game over / fresh grid).
 *
 * The manager does not deduct coins — the boutique calls
 * `currencyManager.spend(cost)` first, then `acquire(type)` on success.
 *
 * Emits `change` on every mutation.
 */
class PegShopManager extends EventEmitter {
  /** @type {Set<string>} peg types acquired this run */
  #acquired = new Set();

  /**
   * Mark a peg type as acquired for this run. No-op for unknown types or an
   * already-acquired type.
   * @param {string} type — a PEG_TYPES value present in PEG_SHOP_DEFS
   * @returns {boolean} true when newly acquired
   */
  acquire(type) {
    if (!findPegShopItem(type)) return false;
    if (this.#acquired.has(type)) return false;
    this.#acquired.add(type);
    this.emit("change");
    return true;
  }

  /** @param {string} type */
  isAcquired(type) {
    return this.#acquired.has(type);
  }

  /** @returns {string[]} */
  getAcquired() {
    return [...this.#acquired];
  }

  /** Wipe every run-scoped acquisition. Called at the start of each run. */
  reset() {
    if (this.#acquired.size === 0) return;
    this.#acquired.clear();
    this.emit("change");
  }

  /** @internal — for tests */
  _resetForTests() {
    this.#acquired.clear();
    this.clear();
  }
}

export const pegShopManager = new PegShopManager();
