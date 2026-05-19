import { Peg } from "./peg-classic.js";
import { PLINKO } from "../configs/constants.js";

/**
 * CoinPeg — a peg that drops coins instead of score points.
 *
 * Same hitbox as a classic peg so collision code stays uniform. On first
 * contact the peg consumes itself: `consumeReward()` tells the controller
 * to credit currency, pop a `+N` label and remove the peg for the rest
 * of the round. Awards no score (so it does not interact with score
 * gates) — `scoreForContact()` returns 0.
 */
export class CoinPeg extends Peg {
  constructor(opts = {}) {
    super(opts);
    this.type = "coin";
    this._resolveHp();
  }

  get score() {
    return 0;
  }

  get coinValue() {
    return PLINKO.COIN_VALUE;
  }

  scoreForContact() {
    return 0;
  }

  consumeReward(_ball) {
    return {
      coins: this.coinValue,
      popText: `+${this.coinValue}`,
      popClass: "pk-popup pk-popup--coin",
    };
  }
}
