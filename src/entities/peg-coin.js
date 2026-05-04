import { Peg } from "./peg-classic.js";
import { PLINKO } from "../configs/constants.js";

/**
 * CoinPeg — a special peg that awards no score but drops a coin when hit.
 * Subclasses Peg so collision code treats it as a standard shape.
 * See `docs/SLOT.md`.
 */
export class CoinPeg extends Peg {
  constructor(opts = {}) {
    super(opts);
    this.type = "coin";
  }

  get radius() {
    return PLINKO.COIN_PEG_RADIUS;
  }

  get score() {
    return PLINKO.SCORE_COIN;
  }

  get restitution() {
    return PLINKO.RESTITUTION_COIN;
  }
}
