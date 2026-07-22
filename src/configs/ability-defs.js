/**
 * Ability definitions — pure data.
 *
 * Abilities are **permanent** unlocks paid in **diamonds**, persistent across
 * runs. Each ability belongs to a category and a level (1..N), forming a
 * strict prerequisite chain inside its category (a level is buyable only once
 * every lower level in the same category is owned).
 *
 * Every ability is **direct-effect**: buying it immediately applies its
 * `modifiers`, resolved through `abilityManager.resolve(paramKey, baseValue)`
 * exactly like `bonusManager.resolve`. There is no shop indirection anymore.
 *
 * Categories:
 *  - **SHOP** — boutique price discount tiers (`SHOP_DISCOUNT`).
 *  - **GATE** — collection-gate width / multiplier upgrades.
 *  - **MAP**  — grid reveal tiers (`REVEAL_*`).
 *  - **WHEEL**— slot-machine improvements: extra unlocked reels
 *    (`SLOT_REEL_BONUS`) and cheaper re-spins (`SLOT_REROLL_DISCOUNT`).
 *
 * See `docs/ABILITY.md`.
 *
 * Diamond costs scale as 2^(level-1): L1=1, L2=2, L3=4, L4=8, L5=16, L6=32.
 */

import { PARAM_KEYS } from "./bonus-defs.js";

export const ABILITY_CATEGORIES = /** @type {const} */ ({
  SHOP: "shop",
  GATE: "gate",
  MAP: "map",
  WHEEL: "wheel",
});

/**
 * @typedef {object} AbilityDef
 * @property {string} id
 * @property {string} category   — one of ABILITY_CATEGORIES
 * @property {number} level      — 1-based level inside its category
 * @property {number} cost       — diamonds to unlock
 * @property {import('./bonus-defs.js').BonusModifier[]} modifiers — effects
 *           applied directly once the ability is unlocked
 */

const diamondCost = (level) => Math.pow(2, Math.max(0, level - 1));

/**
 * @param {string} id
 * @param {string} category
 * @param {number} level
 * @param {import('./bonus-defs.js').BonusModifier[]} modifiers
 * @returns {AbilityDef}
 */
const ability = (id, category, level, modifiers) => ({
  id,
  category,
  level,
  cost: diamondCost(level),
  modifiers,
});

/** @type {AbilityDef[]} */
export const ABILITY_DEFS = [
  /* SHOP — boutique discount tiers. Increments of 5% stacking to 30% at L6. */
  ability("shop_1", ABILITY_CATEGORIES.SHOP, 1, [
    { paramKey: PARAM_KEYS.SHOP_DISCOUNT, op: "add", value: 0.05 },
  ]),
  ability("shop_2", ABILITY_CATEGORIES.SHOP, 2, [
    { paramKey: PARAM_KEYS.SHOP_DISCOUNT, op: "add", value: 0.05 },
  ]),
  ability("shop_3", ABILITY_CATEGORIES.SHOP, 3, [
    { paramKey: PARAM_KEYS.SHOP_DISCOUNT, op: "add", value: 0.05 },
  ]),
  ability("shop_4", ABILITY_CATEGORIES.SHOP, 4, [
    { paramKey: PARAM_KEYS.SHOP_DISCOUNT, op: "add", value: 0.05 },
  ]),
  ability("shop_5", ABILITY_CATEGORIES.SHOP, 5, [
    { paramKey: PARAM_KEYS.SHOP_DISCOUNT, op: "add", value: 0.05 },
  ]),
  ability("shop_6", ABILITY_CATEGORIES.SHOP, 6, [
    { paramKey: PARAM_KEYS.SHOP_DISCOUNT, op: "add", value: 0.05 },
  ]),

  /* GATE — direct-effect collection-gate upgrades. Each width tier's `value`
     is the *increment* over the previous level so the cumulative reduction
     hits the designed total (levels are a strict prerequisite chain):
       L1: -50% return gate            → total 50%
       L2: -30% more return gate       → total 80%   (hpReduction)
       L3: -25% edge x1 gates          → total 25%
       L4: -25% more edge x1 gates     → total 50%   (backReduction)
       L5: doubles every multiplier gate's contribution. */
  ability("gate_1", ABILITY_CATEGORIES.GATE, 1, [
    { paramKey: PARAM_KEYS.GATE_HP_WIDTH_REDUCTION, op: "add", value: 0.5 },
  ]),
  ability("gate_2", ABILITY_CATEGORIES.GATE, 2, [
    { paramKey: PARAM_KEYS.GATE_HP_WIDTH_REDUCTION, op: "add", value: 0.3 },
  ]),
  ability("gate_3", ABILITY_CATEGORIES.GATE, 3, [
    { paramKey: PARAM_KEYS.GATE_BACK_WIDTH_REDUCTION, op: "add", value: 0.25 },
  ]),
  ability("gate_4", ABILITY_CATEGORIES.GATE, 4, [
    { paramKey: PARAM_KEYS.GATE_BACK_WIDTH_REDUCTION, op: "add", value: 0.25 },
  ]),
  ability("gate_5", ABILITY_CATEGORIES.GATE, 5, [
    { paramKey: PARAM_KEYS.GATE_MULT_FACTOR, op: "multiply", value: 2 },
  ]),

  /* MAP — grid reveal tiers (direct-effect). */
  ability("map_1", ABILITY_CATEGORIES.MAP, 1, [
    { paramKey: PARAM_KEYS.REVEAL_MYSTERY, op: "set", value: true },
  ]),
  ability("map_2", ABILITY_CATEGORIES.MAP, 2, [
    { paramKey: PARAM_KEYS.REVEAL_SHOPS, op: "set", value: true },
  ]),
  ability("map_3", ABILITY_CATEGORIES.MAP, 3, [
    { paramKey: PARAM_KEYS.REVEAL_PATHS, op: "set", value: true },
  ]),
  ability("map_4", ABILITY_CATEGORIES.MAP, 4, [
    { paramKey: PARAM_KEYS.REVEAL_BOSS, op: "set", value: true },
  ]),

  /* WHEEL — slot-machine improvements. L1..L3 each unlock one extra reel
     (4 default + 3 = 7 = REEL_COUNT_MAX). L4 halves the re-spin cost. */
  ability("wheel_1", ABILITY_CATEGORIES.WHEEL, 1, [
    { paramKey: PARAM_KEYS.SLOT_REEL_BONUS, op: "add", value: 1 },
  ]),
  ability("wheel_2", ABILITY_CATEGORIES.WHEEL, 2, [
    { paramKey: PARAM_KEYS.SLOT_REEL_BONUS, op: "add", value: 1 },
  ]),
  ability("wheel_3", ABILITY_CATEGORIES.WHEEL, 3, [
    { paramKey: PARAM_KEYS.SLOT_REEL_BONUS, op: "add", value: 1 },
  ]),
  ability("wheel_4", ABILITY_CATEGORIES.WHEEL, 4, [
    { paramKey: PARAM_KEYS.SLOT_REROLL_DISCOUNT, op: "multiply", value: 0.5 },
  ]),
];

/**
 * @param {string} id
 * @returns {AbilityDef | null}
 */
export function findAbility(id) {
  return ABILITY_DEFS.find((a) => a.id === id) ?? null;
}
