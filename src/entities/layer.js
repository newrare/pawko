import { Entity } from "./entity.js";
import { Slot } from "./slot.js";
import { PLINKO, PEG_DEFS, PEG_FREQUENCY_WEIGHTS } from "../configs/constants.js";
import { createPeg, PEG_TYPES } from "./peg-factory.js";

/**
 * Layer — one horizontal plank holding up to `SLOTS_PER_LAYER` pegs.
 *
 * Generation rule:
 *   - one slot out of two is filled (alternating pattern);
 *   - the first filled slot (`startSlot`) is randomly picked from
 *     `START_SLOT_CHOICES` so consecutive layers shift the staggered grid;
 *   - each filled slot is rolled against a weighted probability table
 *     built from `PEG_DEFS` frequency tags.
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
  constructor({
    level,
    width,
    y,
    rng = Math.random,
  }) {
    super({ type: "layer" });
    this.level = level;
    this.y = y;
    this.startSlot =
      PLINKO.START_SLOT_CHOICES[
        Math.floor(rng() * PLINKO.START_SLOT_CHOICES.length)
      ];

    const table = buildSpawnTable(level);

    for (let i = this.startSlot; i < Slot.count; i += 2) {
      const x = Slot.xFor(i, width);
      const type = rollPegType(table, rng);
      this.pegs.push(createPeg(type, { x, y, slot: i }));
    }

    /* Guarantee at least one coin peg per layer (random position). */
    const hasCoin = this.pegs.some((p) => p.type === "coin");
    if (!hasCoin && this.pegs.length > 0) {
      const idx = Math.floor(rng() * this.pegs.length);
      const old = this.pegs[idx];
      this.pegs[idx] = createPeg(PEG_TYPES.COIN, { x: old.x, y: old.y, slot: old.slot });
    }
  }
}

/**
 * Build a cumulative probability table from PEG_DEFS frequencies.
 * Classic pegs fill whatever probability remains unassigned.
 * @param {number} _level - reserved for future level-scaling
 * @returns {Array<{ type: string, cumulative: number }>}
 */
function buildSpawnTable(_level) {
  const entries = [];
  let totalWeight = 0;

  for (const [type, def] of Object.entries(PEG_DEFS)) {
    if (type === PEG_TYPES.CLASSIC) continue; // classic is the fallback
    const w = PEG_FREQUENCY_WEIGHTS[def.frequency] || 0;
    entries.push({ type, weight: w });
    totalWeight += w;
  }

  // Normalize: non-classic types share a portion of the probability space;
  // classic takes whatever is left. Non-classic total is capped at 40%.
  const nonClassicCap = 0.40;
  const scale = totalWeight > 0 ? nonClassicCap / totalWeight : 0;

  const table = [];
  let cumulative = 0;
  for (const entry of entries) {
    cumulative += entry.weight * scale;
    table.push({ type: entry.type, cumulative });
  }
  // Classic fills the rest (cumulative to 1.0)
  table.push({ type: PEG_TYPES.CLASSIC, cumulative: 1.0 });
  return table;
}

/**
 * Roll a peg type from the spawn table.
 * @param {Array<{ type: string, cumulative: number }>} table
 * @param {() => number} rng
 * @returns {string}
 */
function rollPegType(table, rng) {
  const r = rng();
  for (const entry of table) {
    if (r < entry.cumulative) return entry.type;
  }
  return PEG_TYPES.CLASSIC;
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
