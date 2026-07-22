import { SLOT_MACHINE } from "../configs/constants.js";

/**
 * SlotMachine — pure logic for the pinboard peg-upgrade drum. Zero DOM.
 *
 * Holds one entry per reel (`{ type }`, `type === null` means the reel is
 * empty because its upgrade was dragged onto a peg). The controller drives it:
 * `spin()` on level open, `consume()` when an upgrade is dropped, and a paid
 * `refillEmpty()` on re-spin. Re-spin cost grows exponentially with the number
 * of re-spins used this level and is reset with `resetRerolls()`.
 *
 * RNG is injectable so tests are deterministic; it defaults to `Math.random`.
 */
export class SlotMachine {
  /** @type {number} */
  #reelCount;
  /** @type {Array<{ type: string | null }>} */
  #reels;
  /** @type {number} Re-spins already paid for this level. */
  #rerollsUsed = 0;
  /** @type {number} Multiplier applied to the re-spin cost (permanent WHEEL ability). */
  #rerollDiscount = 1;

  /** @param {{ reelCount?: number, rerollDiscount?: number }} [opts] */
  constructor({
    reelCount = SLOT_MACHINE.REEL_COUNT_DEFAULT,
    rerollDiscount = 1,
  } = {}) {
    this.#reelCount = Math.max(
      1,
      Math.min(SLOT_MACHINE.REEL_COUNT_MAX, Math.floor(reelCount)),
    );
    this.#rerollDiscount = Math.max(0, rerollDiscount);
    this.#reels = Array.from({ length: this.#reelCount }, () => ({
      type: null,
    }));
  }

  /** Active (unlocked) reel count. @returns {number} */
  get reelCount() {
    return this.#reelCount;
  }

  /** Total reel slots shown (active + locked). @returns {number} */
  get maxReels() {
    return SLOT_MACHINE.REEL_COUNT_MAX;
  }

  /** Locked slots displayed after the active reels. @returns {number} */
  get lockedCount() {
    return Math.max(0, SLOT_MACHINE.REEL_COUNT_MAX - this.#reelCount);
  }

  /** Defensive copy of the reels. @returns {Array<{ type: string | null }>} */
  get reels() {
    return this.#reels.map((r) => ({ type: r.type }));
  }

  /** @returns {number} */
  get rerollsUsed() {
    return this.#rerollsUsed;
  }

  /** True when at least one reel is empty (a re-spin can refill it). */
  get hasEmpty() {
    return this.#reels.some((r) => r.type === null);
  }

  /** Number of reels currently holding an upgrade. @returns {number} */
  get filledCount() {
    return this.#reels.reduce((n, r) => n + (r.type !== null ? 1 : 0), 0);
  }

  /** The upgrade type on a reel, or null. @param {number} index */
  typeAt(index) {
    return this.#reels[index]?.type ?? null;
  }

  /**
   * Fill every reel with a random type from `pool`. An empty pool leaves the
   * reels empty. When `luck.chance > 0`, each reel has that probability of
   * rolling from `luck.pool` instead (the "lucky reel" reward — e.g. peg types
   * not yet bought in the boutique).
   *
   * `roll` makes the draw **rarity-aware**: `rarityOf(type)` + `weights` weight
   * the pick by rarity, and `reelRarity(index)` pins a reel to one rarity (the
   * per-reel "cheat" a reward can apply — e.g. the common-only malus).
   * @param {string[]} pool @param {() => number} [rng]
   * @param {{ pool?: string[], chance?: number }} [luck]
   * @param {SlotRoll} [roll]
   * @returns {Array<{ type: string | null }>}
   */
  spin(pool, rng = Math.random, luck = {}, roll = {}) {
    this.#reels.forEach((reel, i) => {
      reel.type = rollReel(pool, rng, luck, roll, i);
    });
    return this.reels;
  }

  /**
   * Re-fill only the reels emptied by a drop; reels still holding an upgrade
   * are left untouched. @param {string[]} pool @param {() => number} [rng]
   * @param {{ pool?: string[], chance?: number }} [luck]
   * @param {SlotRoll} [roll]
   * @returns {Array<{ type: string | null }>}
   */
  refillEmpty(pool, rng = Math.random, luck = {}, roll = {}) {
    this.#reels.forEach((reel, i) => {
      if (reel.type === null) reel.type = rollReel(pool, rng, luck, roll, i);
    });
    return this.reels;
  }

  /**
   * Empty a reel because its upgrade was taken. Returns the type consumed, or
   * null if the reel index is invalid or already empty. @param {number} index
   * @returns {string | null}
   */
  consume(index) {
    const reel = this.#reels[index];
    if (!reel || reel.type === null) return null;
    const type = reel.type;
    reel.type = null;
    return type;
  }

  /** Coins the next re-spin will cost (exponential in re-spins used, scaled by
      the permanent WHEEL discount). */
  rerollCost() {
    return Math.round(
      SLOT_MACHINE.REROLL_BASE_COST *
        Math.pow(SLOT_MACHINE.REROLL_GROWTH, this.#rerollsUsed) *
        this.#rerollDiscount,
    );
  }

  /** Record that a re-spin was paid for, raising the next cost. */
  noteReroll() {
    this.#rerollsUsed += 1;
  }

  /** Reset the re-spin counter (call at the start of a level). */
  resetRerolls() {
    this.#rerollsUsed = 0;
  }
}

/**
 * @typedef {object} SlotRoll
 * @property {(type: string) => string} [rarityOf]  a type's rarity
 * @property {Record<string, number>} [weights]     draw weight per rarity
 * @property {(index: number) => (string | null | undefined)} [reelRarity]
 *   per-reel rarity constraint ("cheat"); null/undefined = unconstrained
 */

/**
 * Pick a random element of `pool`, or null when it is empty. When
 * `roll.rarityOf` + `roll.weights` are given, the pick is weighted by rarity;
 * otherwise it is uniform.
 * @param {string[]} pool @param {() => number} rng @param {SlotRoll} [roll]
 * @returns {string | null}
 */
function pick(pool, rng, roll = {}) {
  if (!pool || pool.length === 0) return null;
  const { rarityOf, weights } = roll;
  if (rarityOf && weights) {
    const w = pool.map((t) => Math.max(0, weights[rarityOf(t)] ?? 0));
    const total = w.reduce((a, b) => a + b, 0);
    if (total > 0) {
      let r = rng() * total;
      for (let i = 0; i < pool.length; i++) {
        r -= w[i];
        if (r < 0) return pool[i];
      }
      return pool[pool.length - 1];
    }
  }
  const i = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[i];
}

/**
 * Restrict a pool to the reel's pinned rarity, if any. Returns null when the
 * constraint empties the pool so the caller can decide the fallback.
 * @param {string[]} pool @param {SlotRoll} roll @param {number} index
 * @returns {string[] | null} constrained pool, or null if empty after filter
 */
function constrain(pool, roll, index) {
  const rarity = roll?.reelRarity?.(index);
  const rarityOf = roll?.rarityOf;
  if (!rarity || !rarityOf) return pool;
  const filtered = pool.filter((t) => rarityOf(t) === rarity);
  return filtered.length > 0 ? filtered : null;
}

/**
 * Roll a single reel: apply the per-reel rarity constraint to both the main
 * and lucky pools, then pick (with luck). A constraint that empties the main
 * pool falls back to the full pool (a reel must show something); one that
 * empties the lucky pool simply disables luck for that reel.
 * @param {string[]} pool @param {() => number} rng
 * @param {{ pool?: string[], chance?: number }} luck
 * @param {SlotRoll} roll @param {number} index
 * @returns {string | null}
 */
function rollReel(pool, rng, luck, roll, index) {
  const mainPool = constrain(pool, roll, index) ?? pool;
  const luckyPool = constrain(luck?.pool ?? [], roll, index) ?? [];
  return pickWithLuck(
    mainPool,
    rng,
    { chance: luck?.chance ?? 0, pool: luckyPool },
    roll,
  );
}

/**
 * Pick from `pool`, or — with probability `luck.chance` and a non-empty
 * `luck.pool` — from the lucky pool instead. Falls back to `pool` if the lucky
 * roll produced nothing.
 * @param {string[]} pool @param {() => number} rng
 * @param {{ pool?: string[], chance?: number }} luck @param {SlotRoll} [roll]
 * @returns {string | null}
 */
function pickWithLuck(pool, rng, luck, roll = {}) {
  const chance = luck?.chance ?? 0;
  const luckyPool = luck?.pool ?? [];
  if (chance > 0 && luckyPool.length > 0 && rng() < chance) {
    return pick(luckyPool, rng, roll) ?? pick(pool, rng, roll);
  }
  return pick(pool, rng, roll);
}
