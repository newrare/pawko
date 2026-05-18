import { Entity } from "./entity.js";
import { PLINKO } from "../configs/constants.js";

/**
 * Ball — base class for every ball variant.
 *
 * Pure data: position, velocity, recycle counter, alive flag, per-ball score.
 * The controller mutates these fields each physics step and pushes the result
 * to a paired DOM node via `transform: translate(...)`.
 *
 * Subclasses (IceBall, FireBall, …) override `kind`, `cssModifier`,
 * `applyEffectTo()` and `onBeforeContact()` to describe their behaviour.
 * Always go through `createBall(kind, opts)` (ball-factory.js) to spawn the
 * right subclass from a kind string.
 */
export class Ball extends Entity {
  /** @type {number} */
  x = 0;
  /** @type {number} */
  y = 0;
  /** @type {number} */
  vx = 0;
  /** @type {number} */
  vy = 0;
  /** @type {number} */
  recycles = 0;
  /** @type {boolean} */
  alive = true;
  /** @type {number} Points accumulated by this ball during its path. */
  score = 0;
  /** @type {'held' | 'active' | 'captured'} */
  state = "active";
  /** @type {string | null} Gate that captured this ball. */
  gateId = null;
  /** @type {number} Sublaunch index this ball belongs to (for held balls). */
  sublaunchIdx = -1;
  /** @type {Set<number>} ids of pegs hit during the current contact frame. */
  recentPegs = new Set();
  /** @type {Set<string>} arc keys this ball is currently inside (debounces combo). */
  recentArcs = new Set();

  /**
   * @param {{ x?: number, y?: number, vx?: number, vy?: number }} [opts]
   */
  constructor({ x = 0, y = 0, vx = 0, vy = 0 } = {}) {
    super({ type: "ball" });
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
  }

  get radius() {
    return PLINKO.BALL_RADIUS;
  }

  /** @returns {string} one of BALL_KINDS (see ball-factory.js). */
  get kind() {
    return "classic";
  }

  /** CSS modifier appended to `pk-ball--`. Empty string means none. */
  get cssModifier() {
    return "";
  }

  /** True if this ball requires a controller-side arc refresh after a hit. */
  get triggersArcRefresh() {
    return false;
  }

  /** Returns true when the recycle gate may still send this ball back. */
  canRecycle() {
    return this.recycles < PLINKO.MAX_RECYCLES;
  }

  /**
   * Pre-contact hook. Subclasses may mutate `this` (e.g. glass increments
   * its hit counter) and request the controller skip the rest of the
   * pipeline. Returns one of:
   *   "alive"   — proceed normally
   *   "shatter" — destroy this ball, skip everything else
   * @param {import('./peg-classic.js').Peg} _peg
   * @returns {"alive"|"shatter"}
   */
  onBeforeContact(_peg) {
    return "alive";
  }

  /**
   * Whether this ball consumes the peg on contact with no scoring (black).
   * @param {import('./peg-classic.js').Peg} _peg
   * @returns {boolean}
   */
  consumesPeg(_peg) {
    return false;
  }

  /**
   * Mutate `peg` with this ball's side-effect (freeze, burn, electrify).
   * Default: no effect. Returns `true` when peg state changed.
   * @param {import('./peg-classic.js').Peg} _peg
   * @returns {boolean}
   */
  applyEffectTo(_peg) {
    return false;
  }
}
