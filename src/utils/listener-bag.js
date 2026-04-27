/**
 * ListenerBag — collects DOM listeners, timers, RAF handles, and arbitrary
 * teardown functions, then disposes them all in one call.
 *
 * Eliminates the listener-leak class of bug — every component that adds DOM
 * listeners owns one bag and calls `dispose()` from its `destroy()` method.
 *
 * @example
 * const bag = new ListenerBag();
 * bag.on(window, 'resize', this.#onResize);
 * bag.on(button, 'click', () => …, { passive: true });
 * bag.add(i18n.onChange(this.#refresh));   // any unsubscribe function
 * bag.timeout(() => doX(), 500);
 * // …later
 * bag.dispose();
 */
export class ListenerBag {
  /** @type {Array<() => void>} */
  #cleanups = [];

  /** @type {boolean} */
  #disposed = false;

  /**
   * Add a DOM event listener. The matching `removeEventListener` is queued.
   * @param {EventTarget} target
   * @param {string} type
   * @param {EventListenerOrEventListenerObject} handler
   * @param {boolean | AddEventListenerOptions} [options]
   * @returns {() => void} Cleanup function (also called by `dispose`).
   */
  on(target, type, handler, options) {
    if (this.#disposed) return () => {};
    target.addEventListener(type, handler, options);
    const cleanup = () => target.removeEventListener(type, handler, options);
    this.#cleanups.push(cleanup);
    return cleanup;
  }

  /**
   * Add an arbitrary cleanup function (e.g. a returned unsubscribe).
   * @param {() => void} cleanup
   * @returns {() => void}
   */
  add(cleanup) {
    if (this.#disposed) {
      cleanup();
      return () => {};
    }
    this.#cleanups.push(cleanup);
    return cleanup;
  }

  /**
   * Schedule a setTimeout that is auto-cancelled on dispose.
   * @param {() => void} fn
   * @param {number} ms
   * @returns {() => void} Cancel function.
   */
  timeout(fn, ms) {
    if (this.#disposed) return () => {};
    const id = setTimeout(fn, ms);
    const cancel = () => clearTimeout(id);
    this.#cleanups.push(cancel);
    return cancel;
  }

  /**
   * Schedule a setInterval that is auto-cancelled on dispose.
   * @param {() => void} fn
   * @param {number} ms
   * @returns {() => void}
   */
  interval(fn, ms) {
    if (this.#disposed) return () => {};
    const id = setInterval(fn, ms);
    const cancel = () => clearInterval(id);
    this.#cleanups.push(cancel);
    return cancel;
  }

  /**
   * Schedule a requestAnimationFrame that is auto-cancelled on dispose.
   * @param {FrameRequestCallback} fn
   * @returns {() => void}
   */
  raf(fn) {
    if (this.#disposed) return () => {};
    const id = requestAnimationFrame(fn);
    const cancel = () => cancelAnimationFrame(id);
    this.#cleanups.push(cancel);
    return cancel;
  }

  /** Run every queued cleanup. Idempotent. */
  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    const cleanups = this.#cleanups;
    this.#cleanups = [];
    for (const fn of cleanups) {
      try {
        fn();
      } catch (err) {
        console.error("[ListenerBag] cleanup threw:", err);
      }
    }
  }

  /** @returns {boolean} */
  get disposed() {
    return this.#disposed;
  }

  /** @returns {number} Active cleanup count (mainly for tests). */
  get size() {
    return this.#cleanups.length;
  }
}
