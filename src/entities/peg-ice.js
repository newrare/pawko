import { Peg } from "./peg-classic.js";

/**
 * IcePeg — on contact, applies the "frozen" effect to the ball.
 * The ball moves at half speed for 2s.
 */
export class IcePeg extends Peg {
  constructor(opts = {}) {
    super(opts);
    this.type = "ice";
    this._resolveHp();
  }

  /**
   * Signal to the controller that the ball should receive the "frozen" effect.
   * @param {import('./ball-classic.js').Ball} _ball
   * @returns {{ effect: string, popText: string, popClass: string }}
   */
  consumeReward(_ball) {
    return { effect: "frozen" };
  }
}
