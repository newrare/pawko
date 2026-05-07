import { Entity } from "./entity.js";
import { Peg } from "./peg-classic.js";
import { Bumper } from "./peg-bumper.js";
import { CoinPeg } from "./peg-coin.js";
import { Slot } from "./slot.js";
import { PLINKO } from "../configs/constants.js";

/**
 * Layer — one horizontal plank holding up to `SLOTS_PER_LAYER` pegs.
 *
 * Generation rule:
 *   - one slot out of two is filled (alternating pattern);
 *   - the first filled slot (`startSlot`) is randomly picked from
 *     `START_SLOT_CHOICES` so consecutive layers shift the staggered grid;
 *   - each filled slot is rolled with a single uniform random in [0,1):
 *     bumper if roll < bumperChance, coin peg if roll < bumperChance + coinChance,
 *     otherwise a classic peg.
 */
export class Layer extends Entity {
  /** @type {number} */
  level = 0;

  /** @type {number} 0,1,2 — picks the first filled slot. */
  startSlot = 0;

  /** @type {Peg[]} Pegs, bumpers and coin pegs, positioned in pinboard space. */
  pegs = [];

  /**
   * @param {{
   *   level: number,
   *   width: number,
   *   y: number,
   *   bumperChance?: number,
   *   coinChance?: number,
   *   rng?: () => number,
   * }} args
   */
  constructor({
    level,
    width,
    y,
    bumperChance = 0.05,
    coinChance = PLINKO.COIN_CHANCE_BASE,
    rng = Math.random,
  }) {
    super({ type: "layer" });
    this.level = level;
    this.y = y;
    this.startSlot =
      PLINKO.START_SLOT_CHOICES[
        Math.floor(rng() * PLINKO.START_SLOT_CHOICES.length)
      ];

    for (let i = this.startSlot; i < Slot.count; i += 2) {
      const x = Slot.xFor(i, width);
      const roll = rng();
      let Cls;
      if (roll < bumperChance) Cls = Bumper;
      else if (roll < bumperChance + coinChance) Cls = CoinPeg;
      else Cls = Peg;
      this.pegs.push(new Cls({ x, y, slot: i }));
    }
  }
}

/**
 * Compute the bumper probability for a given level. Capped so high levels
 * stay playable. Pure helper, exported for tests.
 * @param {number} level
 * @returns {number}
 */
export function bumperChanceForLevel(level) {
  const v =
    PLINKO.BUMPER_CHANCE_BASE + level * PLINKO.BUMPER_CHANCE_PER_LEVEL;
  return Math.min(PLINKO.BUMPER_CHANCE_MAX, v);
}
