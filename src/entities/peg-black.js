import { Peg } from "./peg-classic.js";

/**
 * BlackPeg — on contact, instantly kills the ball (sets HP to 0).
 * The peg is NOT consumed — it stays on the board for repeated use.
 */
export class BlackPeg extends Peg {
  constructor(opts = {}) {
    super(opts);
    this.type = "black";
    this._resolveHp();
  }

  /**
   * Signal to the controller that the ball should die instantly.
   * @param {import('./ball-classic.js').Ball} _ball
   * @returns {{ instantKill: true, popText: string, popClass: string }}
   */
  consumeReward(_ball) {
    return { instantKill: true, popText: "💀", popClass: "pk-popup pk-popup--black" };
  }
}
