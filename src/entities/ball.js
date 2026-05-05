import { Entity } from "./entity.js";
import { PLINKO } from "../configs/constants.js";

/**
 * Ball — the physical bead that falls through the pinboard.
 *
 * Pure data: position, velocity, recycle counter, alive flag. The
 * controller mutates these fields each physics step and pushes the result
 * to a paired DOM node via `transform: translate(...)`. See `docs/BALL.md`.
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
  /** @type {boolean} True when this ball carries the ice-ball bonus effect. */
  isIce = false;
  /** @type {'held' | 'active' | 'captured'} */
  state = "active";
  /** @type {string | null} Gate that captured this ball. */
  gateId = null;
  /** @type {number} Sublaunch index this ball belongs to (for held balls). */
  sublaunchIdx = -1;
  /** @type {Set<number>} ids of pegs hit during the current contact frame. */
  recentPegs = new Set();

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

  /** Returns true when the recycle gate may still send this ball back. */
  canRecycle() {
    return this.recycles < PLINKO.MAX_RECYCLES;
  }
}
