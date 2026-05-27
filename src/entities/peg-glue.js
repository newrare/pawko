import { Peg } from "./peg-classic.js";

/**
 * GluePeg — traps a ball on contact. The ball is stuck and cannot reach
 * a gate. If the glue peg is destroyed, the trapped ball is freed.
 *
 * Only one ball can be trapped at a time.
 */
export class GluePeg extends Peg {
  /** @type {import('./ball-classic.js').Ball | null} */
  trappedBall = null;

  constructor(opts = {}) {
    super(opts);
    this.type = "glue";
    this._resolveHp();
  }

  /** Whether this peg can still trap a ball. */
  get canTrap() {
    return this.trappedBall === null;
  }

  /**
   * Trap the ball. Returns a directive for the controller to immobilize it.
   * @param {import('./ball-classic.js').Ball} ball
   * @returns {{ trapped: true } | null}
   */
  consumeReward(ball) {
    if (!this.canTrap) return null;
    this.trappedBall = ball;
    return { trapped: true, popText: "GLUE!", popClass: "pk-popup pk-popup--glue" };
  }

  /**
   * On destruction, signal that the trapped ball should be released.
   * @returns {{ releaseBall: import('./ball-classic.js').Ball } | null}
   */
  onDestroyed(_ball) {
    if (this.trappedBall) {
      const freed = this.trappedBall;
      this.trappedBall = null;
      return { releaseBall: freed, popText: "FREE!", popClass: "pk-popup pk-popup--free" };
    }
    return null;
  }
}
