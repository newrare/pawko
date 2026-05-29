/**
 * Bonus & malus definitions — pure data.
 *
 * Three kinds of entries:
 *   - **permanent bonus**: unlocked forever, bought in the shop with coins.
 *   - **session bonus**: active for `durationLevels` levels (or for the
 *     whole run when `durationLevels === null`). Bought in the shop with
 *     coins.
 *   - **session malus**: same lifecycle as a session bonus but applies a
 *     negative effect. Maluses are NOT sold in the shop — they are rolled
 *     by the MysteryPeg and by mystery cells on the level grid.
 *
 * An entry can carry two kinds of effects:
 *   - **modifiers**: { paramKey, op, value } resolved on every call to
 *     `bonusManager.resolve(paramKey, baseValue)` while the entry is
 *     active. Resolution order: add → multiply → set.
 *   - **directives**: one-shot actions queued at activation time and
 *     drained by the game controller at the start of the next round
 *     (e.g. add a ball into a launcher). See `BonusManager.consumeDirectives`.
 *
 * See `docs/BONUS.md` for the design and the 5-step "add a new bonus"
 * checklist.
 */

export const BONUS_TYPES = /** @type {const} */ ({
  PERMANENT: "permanent",
  SESSION: "session",
});

export const BONUS_CATEGORIES = /** @type {const} */ ({
  BONUS: "bonus",
  MALUS: "malus",
});

/**
 * Every parameter key consumed by `bonusManager.resolve()`. Magic strings
 * outside this map are a bug.
 */
export const PARAM_KEYS = /** @type {const} */ ({
  /* Launcher / ball composition */
  STARTING_BALLS: "startingBalls",

  /* Gates (legacy) */
  GATE_MALUS_REDUCTION: "gateMalusReduction",
  GATE_X_MULTIPLIER: "gateXMultiplier",
  GATE_X_DOUBLE: "gateXDouble",

  /* Economy / shop */
  SHOP_DISCOUNT: "shopDiscount",

  /* Gameplay flags */
  SHOP_MAGNET_ENABLED: "shopMagnetEnabled",

  /* Grid visibility */
  REVEAL_ABILITIES: "revealAbilities",
  REVEAL_MYSTERY: "revealMystery",
  REVEAL_SHOPS: "revealShops",
  REVEAL_PATHS: "revealPaths",
  REVEAL_BOSS: "revealBoss",
  REVEAL_LEVEL_NUMBER: "revealLevelNumber",

  /* Tower-defense specific */
  PLAYER_MAX_HP_BONUS: "playerMaxHpBonus",
  DESTROY_COIN_MULTIPLIER: "destroyCoinMultiplier",
  PEG_REPLACE_DISCOUNT: "pegReplaceDiscount",
  BOMB_RADIUS_BONUS: "bombRadiusBonus",
  TELEPORT_RECYCLE_MAX_BONUS: "teleportRecycleMaxBonus",
});

/**
 * Directive action types. Drained by the game controller at the start of
 * each round through `bonusManager.consumeDirectives()`.
 */
export const DIRECTIVE_ACTIONS = /** @type {const} */ ({
  ADD_BALL: "addBall",
  REMOVE_BALL: "removeBall",
  TRANSFORM_BALL: "transformBall",
});

/**
 * @typedef {object} BonusModifier
 * @property {string} paramKey
 * @property {'add' | 'multiply' | 'set'} op
 * @property {number | boolean} value
 */

/**
 * @typedef {object} BonusDirective
 * @property {string} action  one of DIRECTIVE_ACTIONS
 * @property {object} payload action-specific payload
 */

/**
 * @typedef {'permanent' | 'legendary' | 'epic' | 'rare' | 'common' | 'malus'} BonusRarity
 */

/**
 * @typedef {object} BonusDef
 * @property {string} id
 * @property {string} [name]               — short display name (used by MysteryPeg floating label)
 * @property {'permanent' | 'session'} type
 * @property {'bonus' | 'malus'} category
 * @property {number} cost                 — coins (0 for maluses)
 * @property {string | null} abilityRequired
 * @property {BonusRarity} rarity
 * @property {string} icon
 * @property {number | null} [durationLevels]  — session only; null = whole run
 * @property {BonusModifier[]} [modifiers]
 * @property {BonusDirective[]} [directives]   — queued on activation
 * @property {((ctx: object) => void) | null} [onExpire]
 */

// ────────────────────────────────────────────────────────────────────
// Permanent bonuses (bought in the shop with coins)
// ────────────────────────────────────────────────────────────────────

/** @type {BonusDef[]} */
export const PERMANENT_BONUSES = [
  {
    id: "perm_extra_ball_1",
    type: BONUS_TYPES.PERMANENT,
    category: BONUS_CATEGORIES.BONUS,
    cost: 700,
    abilityRequired: "ball_1",
    rarity: "permanent",
    icon: "🟢",
    modifiers: [
      { paramKey: PARAM_KEYS.STARTING_BALLS, op: "add", value: 1 },
    ],
  },
  {
    id: "perm_extra_ball_2",
    type: BONUS_TYPES.PERMANENT,
    category: BONUS_CATEGORIES.BONUS,
    cost: 4000,
    abilityRequired: "ball_2",
    rarity: "permanent",
    icon: "🟢",
    modifiers: [
      { paramKey: PARAM_KEYS.STARTING_BALLS, op: "add", value: 1 },
    ],
  },
  {
    id: "perm_extra_ball_3",
    type: BONUS_TYPES.PERMANENT,
    category: BONUS_CATEGORIES.BONUS,
    cost: 9000,
    abilityRequired: "ball_3",
    rarity: "permanent",
    icon: "🟢",
    modifiers: [
      { paramKey: PARAM_KEYS.STARTING_BALLS, op: "add", value: 1 },
    ],
  },
  {
    id: "perm_shop_discount",
    type: BONUS_TYPES.PERMANENT,
    category: BONUS_CATEGORIES.BONUS,
    cost: 5000,
    abilityRequired: "pinboard_3",
    rarity: "permanent",
    icon: "💸",
    modifiers: [
      { paramKey: PARAM_KEYS.SHOP_DISCOUNT, op: "add", value: 0.1 },
    ],
  },
  {
    id: "perm_reveal_abilities",
    type: BONUS_TYPES.PERMANENT,
    category: BONUS_CATEGORIES.BONUS,
    cost: 5000,
    abilityRequired: "avantage_1",
    rarity: "permanent",
    icon: "👁️",
    modifiers: [
      { paramKey: PARAM_KEYS.REVEAL_ABILITIES, op: "set", value: true },
    ],
  },
  {
    id: "perm_reveal_mystery",
    type: BONUS_TYPES.PERMANENT,
    category: BONUS_CATEGORIES.BONUS,
    cost: 7000,
    abilityRequired: "avantage_2",
    rarity: "permanent",
    icon: "👁️",
    modifiers: [
      { paramKey: PARAM_KEYS.REVEAL_MYSTERY, op: "set", value: true },
    ],
  },
  {
    id: "perm_reveal_shops",
    type: BONUS_TYPES.PERMANENT,
    category: BONUS_CATEGORIES.BONUS,
    cost: 10000,
    abilityRequired: "avantage_2",
    rarity: "permanent",
    icon: "👁️",
    modifiers: [
      { paramKey: PARAM_KEYS.REVEAL_SHOPS, op: "set", value: true },
    ],
  },
  {
    id: "perm_reveal_paths",
    type: BONUS_TYPES.PERMANENT,
    category: BONUS_CATEGORIES.BONUS,
    cost: 20000,
    abilityRequired: "avantage_3",
    rarity: "permanent",
    icon: "👁️",
    modifiers: [
      { paramKey: PARAM_KEYS.REVEAL_PATHS, op: "set", value: true },
    ],
  },
  {
    id: "perm_reveal_boss",
    type: BONUS_TYPES.PERMANENT,
    category: BONUS_CATEGORIES.BONUS,
    cost: 25000,
    abilityRequired: "avantage_4",
    rarity: "permanent",
    icon: "👁️",
    modifiers: [
      { paramKey: PARAM_KEYS.REVEAL_BOSS, op: "set", value: true },
    ],
  },
  /* Tower-defense permanent bonuses */
  {
    id: "perm_extra_hp_1",
    type: BONUS_TYPES.PERMANENT,
    category: BONUS_CATEGORIES.BONUS,
    cost: 2000,
    abilityRequired: null,
    rarity: "permanent",
    icon: "❤️",
    modifiers: [
      { paramKey: PARAM_KEYS.PLAYER_MAX_HP_BONUS, op: "add", value: 5 },
    ],
  },
  {
    id: "perm_extra_hp_2",
    type: BONUS_TYPES.PERMANENT,
    category: BONUS_CATEGORIES.BONUS,
    cost: 5000,
    abilityRequired: null,
    rarity: "permanent",
    icon: "❤️",
    modifiers: [
      { paramKey: PARAM_KEYS.PLAYER_MAX_HP_BONUS, op: "add", value: 10 },
    ],
  },
  {
    id: "perm_extra_hp_3",
    type: BONUS_TYPES.PERMANENT,
    category: BONUS_CATEGORIES.BONUS,
    cost: 12000,
    abilityRequired: null,
    rarity: "permanent",
    icon: "❤️",
    modifiers: [
      { paramKey: PARAM_KEYS.PLAYER_MAX_HP_BONUS, op: "add", value: 15 },
    ],
  },
  {
    id: "perm_destroy_coins_x2",
    type: BONUS_TYPES.PERMANENT,
    category: BONUS_CATEGORIES.BONUS,
    cost: 8000,
    abilityRequired: null,
    rarity: "permanent",
    icon: "🪙",
    modifiers: [
      { paramKey: PARAM_KEYS.DESTROY_COIN_MULTIPLIER, op: "multiply", value: 2 },
    ],
  },
  {
    id: "perm_bomb_radius_xl",
    type: BONUS_TYPES.PERMANENT,
    category: BONUS_CATEGORIES.BONUS,
    cost: 6000,
    abilityRequired: null,
    rarity: "permanent",
    icon: "💣",
    modifiers: [
      { paramKey: PARAM_KEYS.BOMB_RADIUS_BONUS, op: "add", value: 25 },
    ],
  },
  {
    id: "perm_peg_discount_10",
    type: BONUS_TYPES.PERMANENT,
    category: BONUS_CATEGORIES.BONUS,
    cost: 4000,
    abilityRequired: null,
    rarity: "permanent",
    icon: "💸",
    modifiers: [
      { paramKey: PARAM_KEYS.PEG_REPLACE_DISCOUNT, op: "multiply", value: 0.9 },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────
// Session bonuses (bought in the shop with coins)
// ────────────────────────────────────────────────────────────────────

/** @type {BonusDef[]} */
export const SESSION_BONUSES = [
  {
    id: "session_extra_classic_ball_one",
    name: "+1 Ball",
    type: BONUS_TYPES.SESSION,
    category: BONUS_CATEGORIES.BONUS,
    cost: 100,
    abilityRequired: "ball_1",
    rarity: "common",
    icon: "🔵",
    durationLevels: 1,
    directives: [
      {
        action: DIRECTIVE_ACTIONS.ADD_BALL,
        payload: { kind: "classic", count: 1, target: "one" },
      },
    ],
  },
  {
    id: "session_gate_malus_reduce",
    name: "Gate Shield",
    type: BONUS_TYPES.SESSION,
    category: BONUS_CATEGORIES.BONUS,
    cost: 1000,
    abilityRequired: "gate_1",
    rarity: "epic",
    icon: "🛡️",
    durationLevels: null,
    modifiers: [
      { paramKey: PARAM_KEYS.GATE_MALUS_REDUCTION, op: "multiply", value: 0.5 },
    ],
  },
  {
    id: "session_gate_x_boost",
    name: "Gate Boost",
    type: BONUS_TYPES.SESSION,
    category: BONUS_CATEGORIES.BONUS,
    cost: 1500,
    abilityRequired: "gate_2",
    rarity: "epic",
    icon: "🚪",
    durationLevels: null,
    modifiers: [
      { paramKey: PARAM_KEYS.GATE_X_MULTIPLIER, op: "multiply", value: 1.5 },
    ],
  },
  {
    id: "session_gate_x_double",
    name: "Gate ×2",
    type: BONUS_TYPES.SESSION,
    category: BONUS_CATEGORIES.BONUS,
    cost: 10000,
    abilityRequired: "gate_3",
    rarity: "legendary",
    icon: "🚪",
    durationLevels: null,
    modifiers: [
      { paramKey: PARAM_KEYS.GATE_X_DOUBLE, op: "set", value: true },
    ],
  },
  {
    id: "session_coin_drop_x2",
    name: "Coins ×2",
    type: BONUS_TYPES.SESSION,
    category: BONUS_CATEGORIES.BONUS,
    cost: 1500,
    abilityRequired: null,
    rarity: "rare",
    icon: "🪙",
    durationLevels: 3,
    modifiers: [
      { paramKey: PARAM_KEYS.DESTROY_COIN_MULTIPLIER, op: "multiply", value: 2 },
    ],
  },
  /* Tower-defense session bonuses */
  {
    id: "session_extra_recycles",
    name: "Recycles",
    type: BONUS_TYPES.SESSION,
    category: BONUS_CATEGORIES.BONUS,
    cost: 800,
    abilityRequired: null,
    rarity: "rare",
    icon: "🌀",
    durationLevels: null,
    modifiers: [
      { paramKey: PARAM_KEYS.TELEPORT_RECYCLE_MAX_BONUS, op: "add", value: 2 },
    ],
  },
  {
    id: "session_destroy_coins_x3",
    name: "Coins ×3",
    type: BONUS_TYPES.SESSION,
    category: BONUS_CATEGORIES.BONUS,
    cost: 3000,
    abilityRequired: null,
    rarity: "epic",
    icon: "🪙",
    durationLevels: null,
    modifiers: [
      { paramKey: PARAM_KEYS.DESTROY_COIN_MULTIPLIER, op: "multiply", value: 3 },
    ],
  },
  {
    id: "session_peg_discount_20",
    name: "Peg -20%",
    type: BONUS_TYPES.SESSION,
    category: BONUS_CATEGORIES.BONUS,
    cost: 1500,
    abilityRequired: null,
    rarity: "rare",
    icon: "💸",
    durationLevels: null,
    modifiers: [
      { paramKey: PARAM_KEYS.PEG_REPLACE_DISCOUNT, op: "multiply", value: 0.8 },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────
// Session maluses (never sold in shop; rolled by mystery cell / peg)
// ────────────────────────────────────────────────────────────────────

/** @type {BonusDef[]} */
export const SESSION_MALUSES = [
  {
    id: "malus_obfuscate_level_number",
    type: BONUS_TYPES.SESSION,
    category: BONUS_CATEGORIES.MALUS,
    cost: 0,
    abilityRequired: null,
    rarity: "malus",
    icon: "❓",
    durationLevels: 1,
    modifiers: [
      { paramKey: PARAM_KEYS.REVEAL_LEVEL_NUMBER, op: "set", value: false },
    ],
  },
  /* Tower-defense maluses */
  {
    id: "malus_player_hp_drain",
    type: BONUS_TYPES.SESSION,
    category: BONUS_CATEGORIES.MALUS,
    cost: 0,
    abilityRequired: null,
    rarity: "malus",
    icon: "💔",
    durationLevels: 1,
    modifiers: [
      { paramKey: PARAM_KEYS.PLAYER_MAX_HP_BONUS, op: "add", value: -3 },
    ],
  },
];

/** Every entry, indexed by id. */
export const ALL_BONUSES = [
  ...PERMANENT_BONUSES,
  ...SESSION_BONUSES,
  ...SESSION_MALUSES,
];

/**
 * @param {string} id
 * @returns {BonusDef | null}
 */
export function findBonus(id) {
  return ALL_BONUSES.find((b) => b.id === id) ?? null;
}
