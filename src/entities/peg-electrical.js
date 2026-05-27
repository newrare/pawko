import { Peg } from "./peg-classic.js";

/**
 * ElectricalPeg — on contact, applies the "electrified" DoT effect to the ball.
 * The ball loses 1 HP every 0.5s for 3s.
 */
export class ElectricalPeg extends Peg {
  constructor(opts = {}) {
    super(opts);
    this.type = "electrical";
    this._resolveHp();
  }

  /**
   * Signal to the controller that the ball should receive the "electrified" effect.
   * @param {import('./ball-classic.js').Ball} _ball
   * @returns {{ effect: string, popText: string, popClass: string }}
   */
  consumeReward(_ball) {
    return { effect: "electrified", popText: "⚡", popClass: "pk-popup pk-popup--electrical" };
  }
}
