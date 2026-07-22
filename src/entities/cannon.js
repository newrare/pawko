import { CANNON } from "../configs/constants.js";

/**
 * Number of balls loaded into the cannon for a given level. Grows one per
 * level (level 1 → 1, level 2 → 2, …) and is capped at `CANNON.BALLS_MAX`.
 * Non-positive / non-finite ids fall back to a single ball.
 * @param {number} levelId — 1-based level id
 * @returns {number}
 */
export function ballsForLevel(levelId) {
  const id = Math.floor(levelId || 1);
  return Math.max(1, Math.min(id, CANNON.BALLS_MAX));
}

/** Clamp `v` to the inclusive range [min, max]. */
function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

/**
 * Cannon — pure data/logic for the top-center launcher.
 *
 * Holds the remaining ball count and the current aim angle. The angle is
 * measured from the straight-down axis: `0` points straight down, positive
 * values rotate toward the right, negative toward the left. The barrel is
 * always constrained to a downward cone (`±CANNON.MAX_ANGLE`) so a launched
 * ball can never travel back up out of the board.
 *
 * No DOM dependency — the controller renders the paired `.pk-cannon` element
 * and reads {@link muzzle} / {@link launchVelocity} when firing.
 */
export class Cannon {
  /** @type {number} aim angle in radians, 0 = straight down. */
  #angle = 0;
  /** @type {number} balls left to fire. */
  #balls = 0;

  /** @type {number} pivot x in pinboard space. */
  pivotX = 0;
  /** @type {number} pivot y in pinboard space. */
  pivotY = 0;

  /**
   * @param {{ balls?: number, pivotX?: number, pivotY?: number }} [opts]
   */
  constructor({ balls = 0, pivotX = 0, pivotY = 0 } = {}) {
    this.#balls = Math.max(0, Math.floor(balls));
    this.pivotX = pivotX;
    this.pivotY = pivotY;
  }

  /** @returns {number} current aim angle (radians, 0 = down). */
  get angle() {
    return this.#angle;
  }

  /** @returns {number} aim angle in degrees for CSS `rotate()`. */
  get degrees() {
    return (this.#angle * 180) / Math.PI;
  }

  /** @returns {number} balls remaining to fire. */
  get ballsRemaining() {
    return this.#balls;
  }

  /** @returns {boolean} true when no balls are left to fire. */
  get isEmpty() {
    return this.#balls <= 0;
  }

  /**
   * Point the cannon toward a target point (pinboard space). The resulting
   * angle is clamped to the downward cone; a target at or above the pivot is
   * treated as straight down before clamping.
   * @param {number} px
   * @param {number} py
   * @returns {number} the clamped angle (radians)
   */
  aimAt(px, py) {
    const dx = px - this.pivotX;
    const dy = Math.max(1, py - this.pivotY); // never aim flat/upward
    return this.setAngle(Math.atan2(dx, dy));
  }

  /**
   * Set the aim angle directly, clamped to the downward cone.
   * @param {number} angle — radians, 0 = straight down
   * @returns {number} the clamped angle
   */
  setAngle(angle) {
    this.#angle = clamp(angle, -CANNON.MAX_ANGLE, CANNON.MAX_ANGLE);
    return this.#angle;
  }

  /**
   * Muzzle tip position (where a ball spawns) derived from the pivot and
   * current angle.
   * @returns {{ x: number, y: number }}
   */
  get muzzle() {
    return {
      x: this.pivotX + Math.sin(this.#angle) * CANNON.MUZZLE_LENGTH,
      y: this.pivotY + Math.cos(this.#angle) * CANNON.MUZZLE_LENGTH,
    };
  }

  /**
   * Initial velocity vector for a launched ball along the current aim.
   * @param {number} [speed=CANNON.LAUNCH_SPEED]
   * @returns {{ vx: number, vy: number }}
   */
  launchVelocity(speed = CANNON.LAUNCH_SPEED) {
    return {
      vx: Math.sin(this.#angle) * speed,
      vy: Math.cos(this.#angle) * speed,
    };
  }

  /**
   * Consume one ball. Returns true when a ball was available (and removed).
   * @returns {boolean}
   */
  pop() {
    if (this.#balls <= 0) return false;
    this.#balls -= 1;
    return true;
  }

  /**
   * Add balls to the cannon (bonus directives).
   * @param {number} n
   */
  addBalls(n) {
    this.#balls += Math.max(0, Math.floor(n));
  }

  /**
   * Remove up to `n` balls from the cannon (malus directives). Never goes
   * below zero.
   * @param {number} n
   */
  removeBalls(n) {
    this.#balls = Math.max(0, this.#balls - Math.max(0, Math.floor(n)));
  }
}
