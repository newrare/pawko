import { RARITY, RARITY_WEIGHTS } from "../configs/constants.js";
import {
  BONUS_CATEGORIES,
  REWARD_BONUSES,
  REWARD_MALUSES,
} from "../configs/bonus-defs.js";

/**
 * Reward draw helpers — pure logic, zero DOM, RNG injectable.
 *
 * Both mystery sources (peg on the pinboard, cell on the map) draw rewards
 * **weighted by rarity** (`RARITY_WEIGHTS`): common outcomes are common, and
 * legendary ones are rare. Maluses share one category weight so they still
 * surface in the mixed cell draw. The `forceCommon` flag — set by the
 * `malus_mystery_common` reward — restricts the pool to common rewards.
 *
 * See `docs/BONUS.md`.
 */

/** @typedef {import('../configs/bonus-defs.js').BonusDef} BonusDef */

/** Default chance a mystery **peg** rolls a malus rather than a bonus. */
export const MALUS_CHANCE = 0.3;

/**
 * Draw weights for a mixed reward pool: the four quality tiers plus a single
 * weight for the whole `malus` category (maluses carry no quality tier).
 * @type {Record<string, number>}
 */
export const REWARD_DRAW_WEIGHTS = {
  ...RARITY_WEIGHTS,
  [BONUS_CATEGORIES.MALUS]: 30,
};

/**
 * Weight of a reward def for a rarity-weighted draw.
 * @param {BonusDef} def
 * @param {Record<string, number>} [weights]
 * @returns {number}
 */
export function weightOfReward(def, weights = REWARD_DRAW_WEIGHTS) {
  return Math.max(0, weights[def.rarity] ?? 0);
}

/**
 * Keep only common-rarity rewards (used when a reward forces common draws).
 * @param {BonusDef[]} defs
 * @returns {BonusDef[]}
 */
export function commonRewards(defs) {
  return defs.filter((d) => d.rarity === RARITY.COMMON);
}

/**
 * Pick one item weighted by `weightOf`. Falls back to a uniform pick when every
 * weight is zero, and returns null for an empty list.
 * @template T
 * @param {T[]} items
 * @param {(item: T) => number} weightOf
 * @param {() => number} [rng]
 * @returns {T | null}
 */
export function weightedPick(items, weightOf, rng = Math.random) {
  if (!items || items.length === 0) return null;
  const w = items.map(weightOf);
  const total = w.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
  }
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= w[i];
    if (roll < 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Draw up to `count` distinct items, each pick weighted by `weightOf` (no
 * replacement — a drawn item cannot repeat).
 * @template T
 * @param {T[]} items
 * @param {number} count
 * @param {(item: T) => number} weightOf
 * @param {() => number} [rng]
 * @returns {T[]}
 */
export function weightedSample(items, count, weightOf, rng = Math.random) {
  const pool = [...items];
  const out = [];
  while (out.length < count && pool.length > 0) {
    const pick = weightedPick(pool, weightOf, rng);
    if (pick == null) break;
    out.push(pick);
    pool.splice(pool.indexOf(pick), 1);
  }
  return out;
}

/**
 * Roll a single mystery-**peg** reward: a malus with `malusChance` probability
 * (weighted within the malus pool), otherwise a rarity-weighted bonus. When
 * `forceCommon` is set the bonus pool is restricted to common rewards.
 * @param {object} [opts]
 * @param {BonusDef[]} [opts.bonuses]
 * @param {BonusDef[]} [opts.maluses]
 * @param {boolean} [opts.forceCommon]
 * @param {number} [opts.malusChance]
 * @param {() => number} [opts.rng]
 * @returns {BonusDef | null}
 */
export function rollMysteryReward({
  bonuses = REWARD_BONUSES,
  maluses = REWARD_MALUSES,
  forceCommon = false,
  malusChance = MALUS_CHANCE,
  rng = Math.random,
} = {}) {
  const wantMalus = rng() < malusChance;
  if (wantMalus && maluses.length > 0) {
    return weightedPick(maluses, (d) => weightOfReward(d), rng);
  }
  const common = forceCommon ? commonRewards(bonuses) : bonuses;
  const pool = common.length > 0 ? common : bonuses;
  return weightedPick(pool, (d) => weightOfReward(d), rng);
}
