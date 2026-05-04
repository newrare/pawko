import { Peg } from "./peg-classic.js";
import { PLINKO, SHOP_PEG_RARITIES } from "../configs/constants.js";

/**
 * ShopPeg — a destructible peg that opens the shop when destroyed.
 *
 * Requires `hitsRequired` ball contacts (determined by rarity) before it
 * breaks. The hit counter decrements in real-time so the DOM element can
 * display the remaining hits live. Subclasses Peg so the physics loop treats
 * it as a standard circle.
 *
 * Rarity pool (common → legendary): more hits required, rarer spawn,
 * better bonus pool offered on destruction.
 */
export class ShopPeg extends Peg {
  /** @type {'common' | 'rare' | 'epic' | 'legendary'} */
  rarity;

  /** @type {number} */
  hitsRemaining;

  /**
   * @param {{ rarity?: 'common' | 'rare' | 'epic' | 'legendary', x?: number, y?: number, slot?: number }} [opts]
   */
  constructor({ rarity = "common", ...rest } = {}) {
    super(rest);
    this.type = "shop";
    this.rarity = rarity;
    this.hitsRemaining = SHOP_PEG_RARITIES[rarity].hitsRequired;
  }

  get radius() {
    return PLINKO.SHOP_PEG_RADIUS;
  }

  get score() {
    return 0;
  }

  get restitution() {
    return PLINKO.RESTITUTION_SHOP_PEG;
  }

  get isDestroyed() {
    return this.hitsRemaining <= 0;
  }

  /** Registers one hit. Returns true when the peg is destroyed. */
  hit() {
    if (this.hitsRemaining > 0) this.hitsRemaining--;
    return this.isDestroyed;
  }
}
