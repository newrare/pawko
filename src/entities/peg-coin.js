import { Peg } from "./peg-classic.js";
import { PLINKO } from "../configs/constants.js";

/**
 * CoinPeg — a peg that drops coins instead of score points.
 *
 * Same hitbox as a classic peg so collision code stays uniform. The
 * controller checks `peg.type === 'coin'` to award coins via
 * `currencyManager.add()` and remove the peg for the rest of the round.
 *
 * Awards 0 score (so it does not interact with score gates) and
 * `coinValue` coins on first contact.
 */
export class CoinPeg extends Peg {
  constructor(opts = {}) {
    super(opts);
    this.type = "coin";
  }

  get score() {
    return 0;
  }

  get coinValue() {
    return PLINKO.COIN_VALUE;
  }
}
