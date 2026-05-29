import { Peg } from "./peg-classic.js";

/**
 * FirePeg — on contact, applies the "burning" DoT effect to the ball.
 * The ball loses 1 HP every 1s for 3s. The peg itself is not consumed
 * (HP-based destruction still applies).
 */
export class FirePeg extends Peg {
  constructor(opts = {}) {
    super(opts);
    this.type = "fire";
    this._resolveHp();
  }

  /**
   * Signal to the controller that the ball should receive the "burning" effect.
   * @param {import('./ball-classic.js').Ball} _ball
   * @returns {{ effect: string, popText: string, popClass: string }}
   */
  consumeReward(_ball) {
    return { effect: "burning" };
  }
}
