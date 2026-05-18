import { Peg } from "./peg-classic.js";
import { PLINKO } from "../configs/constants.js";

/**
 * Bumper — golden boosted peg. Score +10 per ball contact and a higher
 * restitution so the ball flies off harder. Subclasses Peg so collision
 * code only ever talks to a single shape (`.x`, `.y`, `.radius`,
 * `.score`, `.restitution`). See `docs/SLOT.md`.
 */
export class Bumper extends Peg {
  constructor(opts = {}) {
    super(opts);
    this.type = "bumper";
  }

  get radius() {
    return PLINKO.BUMPER_RADIUS;
  }

  get score() {
    return PLINKO.SCORE_BUMPER;
  }

  get restitution() {
    return PLINKO.RESTITUTION_BUMPER;
  }

  /** Bumper points already encode the bonus — multipliers don't stack. */
  get appliesPegMultiplier() {
    return false;
  }
}
