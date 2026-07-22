import { Entity } from "./entity.js";
import { Slot } from "./slot.js";
import { PLINKO } from "../configs/constants.js";
import { createPeg, PEG_TYPES } from "./peg-factory.js";

/**
 * Layer — one horizontal plank holding up to `SLOTS_PER_LAYER` pegs.
 *
 * Generation rule:
 *   - one slot out of two is filled (alternating pattern);
 *   - the first filled slot (`startSlot`) is randomly picked from
 *     `START_SLOT_CHOICES` so consecutive layers shift the staggered grid;
 *   - all pegs spawn as classic.
 */
export class Layer extends Entity {
  /** @type {number} */
  level = 0;

  /** @type {number} 0,1,2 — picks the first filled slot. */
  startSlot = 0;

  /** @type {Peg[]} All peg instances positioned in pinboard space. */
  pegs = [];

  /**
   * @param {{
   *   level: number,
   *   width: number,
   *   y: number,
   *   rng?: () => number,
   * }} args
   */
  constructor({ level, width, y, rng = Math.random }) {
    super({ type: "layer" });
    this.level = level;
    this.y = y;
    this.startSlot =
      PLINKO.START_SLOT_CHOICES[
        Math.floor(rng() * PLINKO.START_SLOT_CHOICES.length)
      ];

    /* Drop edge pegs that would hug the board walls (see Slot.isClear).
       Rows may end up with fewer pegs, which is intended. */
    for (let i = this.startSlot; i < Slot.count; i += 2) {
      if (!Slot.isClear(i, width)) continue;
      const x = Slot.xFor(i, width);
      this.pegs.push(createPeg(PEG_TYPES.CLASSIC, { x, y, slot: i }));
    }
  }
}
