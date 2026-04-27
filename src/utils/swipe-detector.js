import { SWIPE_THRESHOLD } from '../configs/constants.js';
import { ListenerBag } from './listener-bag.js';

/**
 * SwipeDetector — pure detect-on-move swipe recogniser.
 *
 * Direction fires during `touchmove` as soon as the finger crosses
 * `SWIPE_THRESHOLD` px from the start position. The gesture is then consumed
 * (`#fired = true`) and no further direction can fire until a new touchstart
 * begins.
 *
 * Why this shape:
 * - Ghost touch cycles (Android WebView / Capacitor) report near-zero
 *   displacement → never cross the threshold → no false trigger.
 * - One-direction-per-gesture is flag-based, not time-based: legitimate
 *   fast successive swipes work with zero artificial delay.
 * - Firing on move (vs. end) is perceptibly faster.
 * - Extracted from the input manager so it can be unit-tested in isolation.
 *
 * @typedef {'up' | 'down' | 'left' | 'right'} Direction
 */
export class SwipeDetector {
  /** @type {ListenerBag} */
  #bag = new ListenerBag();

  /** @type {(dir: Direction) => void} */
  #onDirection;

  /** @type {(target: EventTarget | null) => boolean} */
  #shouldIgnore;

  /** @type {number} */
  #threshold;

  // ── Gesture state ────────────────────────────────────────────────────────

  /** Identifier of the finger currently tracked, or `null`. */
  #touchId = null;
  #startX = 0;
  #startY = 0;
  #fired = false;
  #touchOnUI = false;

  /**
   * @param {{
   *   onDirection: (dir: Direction) => void,
   *   shouldIgnore?: (target: EventTarget | null) => boolean,
   *   threshold?: number,
   *   target?: EventTarget,
   * }} options
   */
  constructor({ onDirection, shouldIgnore, threshold = SWIPE_THRESHOLD, target = window }) {
    this.#onDirection = onDirection;
    this.#shouldIgnore = shouldIgnore ?? (() => false);
    this.#threshold = threshold;

    this.#bag.on(target, 'touchstart', this.#onTouchStart, { passive: false });
    this.#bag.on(target, 'touchmove', this.#onTouchMove, { passive: false });
    this.#bag.on(target, 'touchend', this.#onTouchEnd, { passive: false });
    this.#bag.on(target, 'touchcancel', this.#onTouchCancel, { passive: true });
  }

  /** Tear down all listeners. Idempotent. */
  destroy() {
    this.#bag.dispose();
  }

  /** @param {TouchEvent} e */
  #onTouchStart = (e) => {
    if (e.touches.length !== 1) {
      this.#touchId = null;
      return;
    }
    if (this.#shouldIgnore(e.target)) {
      this.#touchOnUI = true;
      return;
    }
    this.#touchOnUI = false;
    this.#touchId = e.touches[0].identifier;
    this.#startX = e.touches[0].clientX;
    this.#startY = e.touches[0].clientY;
    this.#fired = false;
    e.preventDefault();
  };

  /** @param {TouchEvent} e */
  #onTouchMove = (e) => {
    if (this.#touchOnUI || this.#touchId === null || this.#fired) return;
    e.preventDefault();
    const touch = [...e.changedTouches].find((t) => t.identifier === this.#touchId);
    if (!touch) return;

    const dx = touch.clientX - this.#startX;
    const dy = touch.clientY - this.#startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < this.#threshold) return;

    this.#fired = true;
    this.#onDirection(directionOf(dx, dy, absDx, absDy));
  };

  /** @param {TouchEvent} e */
  #onTouchEnd = (e) => {
    if (this.#touchOnUI) {
      this.#touchOnUI = false;
      return;
    }
    if (this.#touchId === null) return;
    const touch = [...e.changedTouches].find((t) => t.identifier === this.#touchId);
    if (!touch) return;

    /* Fallback when touchmove was throttled and the finger lifted before a
       move event reported the full displacement. */
    if (!this.#fired) {
      const dx = touch.clientX - this.#startX;
      const dy = touch.clientY - this.#startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (Math.max(absDx, absDy) >= this.#threshold) {
        this.#onDirection(directionOf(dx, dy, absDx, absDy));
      }
      this.#fired = true;
    }
    this.#touchId = null;
    e.preventDefault();
  };

  /** @param {TouchEvent} e */
  #onTouchCancel = (e) => {
    if (this.#touchOnUI) {
      this.#touchOnUI = false;
      return;
    }
    if (this.#touchId !== null) {
      const cancelled = [...e.changedTouches].find((t) => t.identifier === this.#touchId);
      if (cancelled) {
        this.#touchId = null;
        this.#fired = false;
      }
    }
  };
}

/**
 * @param {number} dx
 * @param {number} dy
 * @param {number} absDx
 * @param {number} absDy
 * @returns {'up' | 'down' | 'left' | 'right'}
 */
function directionOf(dx, dy, absDx, absDy) {
  if (absDx >= absDy) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}
