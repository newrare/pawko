import { Peg } from "./peg-classic.js";

/**
 * TeleportPeg — on ball contact, teleports the ball to a random
 * position elsewhere on the grid. The peg is not consumed by the
 * teleport itself (HP-based destruction still applies).
 */
export class TeleportPeg extends Peg {
  constructor(opts = {}) {
    super(opts);
    this.type = "teleport";
    this._resolveHp();
  }

  /**
   * Signal the controller to teleport the ball.
   * @param {import('./ball-classic.js').Ball} _ball
   * @returns {{ teleport: true }}
   */
  consumeReward(_ball) {
    return { teleport: true, popText: "⚡ ZAP!", popClass: "pk-popup pk-popup--teleport" };
  }
}
