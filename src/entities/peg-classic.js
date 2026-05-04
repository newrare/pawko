import { Entity } from "./entity.js";
import { PLINKO } from "../configs/constants.js";

/**
 * Peg — basic metallic clou. Score +1 per ball contact.
 *
 * Pure data: position is set by the layer that owns this peg, in the
 * pinboard coordinate space. No DOM dependency — the controller renders
 * the corresponding `.gt-peg` element.
 *
 * See `docs/SLOT.md` for the family hierarchy (peg, bumper, future…).
 */
export class Peg extends Entity {
  /** @type {number} */
  x = 0;
  /** @type {number} */
  y = 0;

  /**
   * @param {{ x?: number, y?: number, slot?: number }} [opts]
   */
  constructor({ x = 0, y = 0, slot = 0 } = {}) {
    super({ type: "peg" });
    this.x = x;
    this.y = y;
    this.slot = slot;
  }

  get radius() {
    return PLINKO.PEG_RADIUS;
  }

  get score() {
    return PLINKO.SCORE_PEG;
  }

  get restitution() {
    return PLINKO.RESTITUTION_PEG;
  }
}
