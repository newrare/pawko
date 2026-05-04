import { Entity } from "./entity.js";
import { Peg } from "./peg-classic.js";
import { Bumper } from "./peg-bumper.js";
import { CoinPeg } from "./peg-coin.js";
import { ShopPeg } from "./peg-shop.js";
import { Slot } from "./slot.js";
import { PLINKO, SHOP_PEG_RARITIES } from "../configs/constants.js";

/**
 * Layer — one horizontal plank holding up to `SLOTS_PER_LAYER` pegs.
 *
 * Generation rule:
 *   - one slot out of two is filled (alternating pattern);
 *   - the first filled slot (`startSlot`) is randomly picked from
 *     `START_SLOT_CHOICES` so consecutive layers shift the staggered grid;
 *   - each filled slot becomes a Bumper with `bumperChance` probability,
 *     otherwise a Peg.
 *
 * See `docs/LAYER.md` for the full mechanics.
 */
export class Layer extends Entity {
  /** @type {number} */
  level = 0;

  /** @type {number} 0,1,2 — picks the first filled slot. */
  startSlot = 0;

  /** @type {Peg[]} Pegs and bumpers, positioned in pinboard space. */
  pegs = [];

  /**
   * @param {{
   *   level: number,
   *   width: number,
   *   y: number,
   *   bumperChance?: number,
   *   rng?: () => number,
   * }} args
   */
  constructor({ level, width, y, bumperChance = 0.05, rng = Math.random }) {
    super({ type: "layer" });
    this.level = level;
    this.y = y;
    this.startSlot =
      PLINKO.START_SLOT_CHOICES[
        Math.floor(rng() * PLINKO.START_SLOT_CHOICES.length)
      ];

    for (let i = this.startSlot; i < Slot.count; i += 2) {
      const x = Slot.xFor(i, width);
      const isBumper = rng() < bumperChance;
      const Cls = isBumper ? Bumper : Peg;
      this.pegs.push(new Cls({ x, y, slot: i }));
    }

    /* Guarantee exactly 1 coin peg per layer. */
    let coinIdx = -1;
    if (this.pegs.length > 0) {
      coinIdx = Math.floor(rng() * this.pegs.length);
      const donor = this.pegs[coinIdx];
      this.pegs[coinIdx] = new CoinPeg({ x: donor.x, y: donor.y, slot: donor.slot });
    }

    /* Maybe replace one non-coin peg with a ShopPeg. */
    if (this.pegs.length > 1 && rng() < PLINKO.SHOP_PEG_CHANCE) {
      const candidates = this.pegs.map((_, i) => i).filter((i) => i !== coinIdx);
      if (candidates.length > 0) {
        const idx = candidates[Math.floor(rng() * candidates.length)];
        const donor = this.pegs[idx];
        this.pegs[idx] = new ShopPeg({ x: donor.x, y: donor.y, slot: donor.slot, rarity: pickShopPegRarity(rng) });
      }
    }
  }
}

/**
 * Pick a shop peg rarity using weighted random selection.
 * @param {() => number} rng
 * @returns {'common' | 'rare' | 'epic' | 'legendary'}
 */
function pickShopPegRarity(rng) {
  const entries = Object.entries(SHOP_PEG_RARITIES);
  const total = entries.reduce((s, [, v]) => s + v.weight, 0);
  let r = rng() * total;
  for (const [rarity, { weight }] of entries) {
    r -= weight;
    if (r <= 0) return /** @type {'common' | 'rare' | 'epic' | 'legendary'} */ (rarity);
  }
  return "common";
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
