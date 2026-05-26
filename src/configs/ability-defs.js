/**
 * Ability definitions — pure data.
 *
 * Abilities are persistent unlocks paid in **diamonds**. Each ability
 * belongs to a category and a level (1..N). Buying an ability unlocks
 * one or more bonus IDs in the shop. See `docs/ABILITY.md`.
 *
 * Diamond costs scale as 2^(level-1): L1=1, L2=2, L3=4, L4=8, L5=16, L6=32.
 */

export const ABILITY_CATEGORIES = /** @type {const} */ ({
  BALL: "ball",
  GATE: "gate",
  LAUNCHER: "launcher",
  PINBOARD: "pinboard",
  AVANTAGE: "avantage",
});

/**
 * @typedef {object} AbilityDef
 * @property {string} id
 * @property {string} category   — one of ABILITY_CATEGORIES
 * @property {number} level      — 1-based level inside its category
 * @property {number} cost       — diamonds to unlock
 * @property {string[]} unlocks  — bonus IDs gated by this ability
 */

const diamondCost = (level) => Math.pow(2, Math.max(0, level - 1));

/** @type {AbilityDef[]} */
export const ABILITY_DEFS = [
  {
    id: "ball_1",
    category: ABILITY_CATEGORIES.BALL,
    level: 1,
    cost: diamondCost(1),
    unlocks: ["session_extra_classic_ball_one", "perm_extra_ball_1"],
  },
  {
    id: "ball_2",
    category: ABILITY_CATEGORIES.BALL,
    level: 2,
    cost: diamondCost(2),
    unlocks: ["perm_extra_ball_2"],
  },
  {
    id: "ball_3",
    category: ABILITY_CATEGORIES.BALL,
    level: 3,
    cost: diamondCost(3),
    unlocks: ["perm_extra_ball_3"],
  },

  {
    id: "gate_1",
    category: ABILITY_CATEGORIES.GATE,
    level: 1,
    cost: diamondCost(1),
    unlocks: ["session_gate_malus_reduce"],
  },
  {
    id: "gate_2",
    category: ABILITY_CATEGORIES.GATE,
    level: 2,
    cost: diamondCost(2),
    unlocks: ["session_gate_x_boost"],
  },
  {
    id: "gate_3",
    category: ABILITY_CATEGORIES.GATE,
    level: 3,
    cost: diamondCost(3),
    unlocks: ["session_gate_x_double"],
  },

  {
    id: "launcher_1",
    category: ABILITY_CATEGORIES.LAUNCHER,
    level: 1,
    cost: diamondCost(1),
    unlocks: ["session_launcher_4"],
  },
  {
    id: "launcher_2",
    category: ABILITY_CATEGORIES.LAUNCHER,
    level: 2,
    cost: diamondCost(2),
    unlocks: ["session_launcher_5"],
  },
  {
    id: "launcher_3",
    category: ABILITY_CATEGORIES.LAUNCHER,
    level: 3,
    cost: diamondCost(3),
    unlocks: ["session_launcher_6"],
  },
  {
    id: "launcher_4",
    category: ABILITY_CATEGORIES.LAUNCHER,
    level: 4,
    cost: diamondCost(4),
    unlocks: ["session_launcher_7"],
  },
  {
    id: "launcher_5",
    category: ABILITY_CATEGORIES.LAUNCHER,
    level: 5,
    cost: diamondCost(5),
    unlocks: ["session_launcher_8"],
  },
  {
    id: "launcher_6",
    category: ABILITY_CATEGORIES.LAUNCHER,
    level: 6,
    cost: diamondCost(6),
    unlocks: ["session_launcher_9"],
  },

  {
    id: "pinboard_2",
    category: ABILITY_CATEGORIES.PINBOARD,
    level: 2,
    cost: diamondCost(2),
    unlocks: ["session_peg_score_x"],
  },
  {
    id: "pinboard_3",
    category: ABILITY_CATEGORIES.PINBOARD,
    level: 3,
    cost: diamondCost(3),
    unlocks: ["perm_shop_discount"],
  },

  {
    id: "avantage_1",
    category: ABILITY_CATEGORIES.AVANTAGE,
    level: 1,
    cost: diamondCost(1),
    unlocks: ["perm_reveal_abilities"],
  },
  {
    id: "avantage_2",
    category: ABILITY_CATEGORIES.AVANTAGE,
    level: 2,
    cost: diamondCost(2),
    unlocks: ["perm_reveal_mystery", "perm_reveal_shops"],
  },
  {
    id: "avantage_3",
    category: ABILITY_CATEGORIES.AVANTAGE,
    level: 3,
    cost: diamondCost(3),
    unlocks: ["perm_reveal_paths"],
  },
  {
    id: "avantage_4",
    category: ABILITY_CATEGORIES.AVANTAGE,
    level: 4,
    cost: diamondCost(4),
    unlocks: ["perm_reveal_boss"],
  },
];

/**
 * @param {string} id
 * @returns {AbilityDef | null}
 */
export function findAbility(id) {
  return ABILITY_DEFS.find((a) => a.id === id) ?? null;
}

/**
 * Returns the ability that gates the given bonus ID, or null when the
 * bonus is ungated.
 * @param {string} bonusId
 * @returns {AbilityDef | null}
 */
export function abilityForBonus(bonusId) {
  return ABILITY_DEFS.find((a) => a.unlocks.includes(bonusId)) ?? null;
}
