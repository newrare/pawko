/**
 * Lightweight pub/sub for cross-module communication.
 *
 * @example
 * import { gameEvents } from '../utils/event-emitter.js';
 * const off = gameEvents.on('score:changed', (s) => console.log(s));
 * gameEvents.emit('score:changed', 42);
 * off(); // unsubscribe
 */
export class EventEmitter {
  /** @type {Map<string, Set<Function>>} */
  #listeners = new Map();

  /**
   * @param {string} event
   * @param {Function} callback
   * @returns {() => void} Unsubscribe
   */
  on(event, callback) {
    let set = this.#listeners.get(event);
    if (!set) {
      set = new Set();
      this.#listeners.set(event, set);
    }
    set.add(callback);
    return () => this.off(event, callback);
  }

  /**
   * @param {string} event
   * @param {Function} callback
   * @returns {() => void} Unsubscribe
   */
  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };
    wrapper._original = callback;
    return this.on(event, wrapper);
  }

  /**
   * @param {string} event
   * @param {Function} [callback] — if omitted, removes all listeners for the event.
   */
  off(event, callback) {
    const set = this.#listeners.get(event);
    if (!set) return;
    if (!callback) {
      this.#listeners.delete(event);
      return;
    }
    set.delete(callback);
    for (const fn of set) {
      if (fn._original === callback) set.delete(fn);
    }
    if (set.size === 0) this.#listeners.delete(event);
  }

  /**
   * @param {string} event
   * @param {...unknown} args
   */
  emit(event, ...args) {
    const set = this.#listeners.get(event);
    if (!set) return;
    for (const fn of [...set]) fn(...args);
  }

  clear() {
    this.#listeners.clear();
  }
}

/** Global singleton for game-wide events. */
export const gameEvents = new EventEmitter();
