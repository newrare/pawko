import { ALL_BONUSES } from "../configs/bonus-defs.js";
import { MYSTERY_CHOICE } from "../configs/constants.js";
import {
  weightedSample,
  weightOfReward,
  commonRewards,
} from "./reward-roll.js";

/**
 * Mystery-cell reward choices — pure logic, zero DOM.
 *
 * Landing on a mystery cell on the map opens a modal offering a small set of
 * reward cards; the player must pick one. This module builds that set:
 *
 *   1. Draw distinct random **rewards** from the catalogue (bonuses AND
 *      maluses — the whole of `bonus-defs`), excluding any already active this
 *      run (`activeIds`). A malus renders as a dedicated dark card, so the
 *      choice carries risk.
 *   2. When fewer than `count` rewards remain, fill the empty slots with a
 *      **common** currency card granting coins or diamonds. Both currencies are
 *      used before repeating, so two fallbacks are never the same currency.
 *
 * See `docs/BONUS.md`.
 */

/** @typedef {import('../configs/bonus-defs.js').BonusDef} BonusDef */

export const MYSTERY_CHOICE_TYPES = /** @type {const} */ ({
  BONUS: "bonus",
  CURRENCY: "currency",
});

/**
 * @typedef {object} MysteryChoice
 * @property {'bonus' | 'currency'} type
 * @property {BonusDef} [def]                    present when type === 'bonus'
 * @property {'coins' | 'diamonds'} [currency]   present when type === 'currency'
 * @property {number} [amount]                   present when type === 'currency'
 * @property {import('../configs/bonus-defs.js').BonusRarity} rarity
 */

/**
 * Fisher–Yates shuffle returning a new array. Uses the injected RNG so callers
 * can make the draw deterministic in tests.
 * @template T
 * @param {T[]} arr
 * @param {() => number} rng
 * @returns {T[]}
 */
function shuffle(arr, rng) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Inclusive integer in `[min, max]` using the injected RNG.
 * @param {number} min
 * @param {number} max
 * @param {() => number} rng
 * @returns {number}
 */
function randInt(min, max, rng) {
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * Build the reward choices presented by the mystery modal.
 *
 * @param {object} [opts]
 * @param {Set<string> | string[]} [opts.activeIds]  reward ids already active
 * @param {BonusDef[]} [opts.pool]  candidate rewards (default `ALL_BONUSES`)
 * @param {() => number} [opts.rng]  RNG in `[0, 1)` (default `Math.random`)
 * @param {number} [opts.count]  number of cards to offer (default `MYSTERY_CHOICE.COUNT`)
 * @param {boolean} [opts.forceCommon]  restrict the draw to common rewards
 *   (set by the `malus_mystery_common` malus)
 * @returns {MysteryChoice[]}
 */
export function buildMysteryChoices({
  activeIds = [],
  pool = ALL_BONUSES,
  rng = Math.random,
  count = MYSTERY_CHOICE.COUNT,
  forceCommon = false,
} = {}) {
  const active = activeIds instanceof Set ? activeIds : new Set(activeIds);
  let candidates = pool.filter((def) => !active.has(def.id));
  if (forceCommon) candidates = commonRewards(candidates);

  /** @type {MysteryChoice[]} */
  const choices = weightedSample(
    candidates,
    count,
    (def) => weightOfReward(def),
    rng,
  ).map((def) => ({
    type: MYSTERY_CHOICE_TYPES.BONUS,
    def,
    rarity: def.rarity,
  }));

  if (choices.length < count) {
    // Cycle through both currencies so two fallbacks never coincide.
    const currencies = shuffle(["coins", "diamonds"], rng);
    let slot = 0;
    while (choices.length < count) {
      const currency = currencies[slot % currencies.length];
      slot++;
      const amount =
        currency === "coins"
          ? randInt(
              MYSTERY_CHOICE.FALLBACK_COINS_MIN,
              MYSTERY_CHOICE.FALLBACK_COINS_MAX,
              rng,
            )
          : randInt(
              MYSTERY_CHOICE.FALLBACK_DIAMONDS_MIN,
              MYSTERY_CHOICE.FALLBACK_DIAMONDS_MAX,
              rng,
            );
      choices.push({
        type: MYSTERY_CHOICE_TYPES.CURRENCY,
        currency,
        amount,
        rarity: "common",
      });
    }
  }

  return choices;
}
