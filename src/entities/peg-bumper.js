import { Peg } from "./peg-classic.js";
import { PLINKO } from "../configs/constants.js";

/**
 * Bumper — golden boosted peg. Higher restitution so the ball flies off
 * harder. Subclasses Peg so collision code only ever talks to a single
 * shape (`.x`, `.y`, `.radius`, `.restitution`). See `docs/SLOT.md`.
 */
export class Bumper extends Peg {
  constructor(opts = {}) {
    super(opts);
    this.type = "bumper";
    this._resolveHp();
  }

  get radius() {
    return PLINKO.BUMPER_RADIUS;
  }

  get restitution() {
    return PLINKO.RESTITUTION_BUMPER;
  }

}
