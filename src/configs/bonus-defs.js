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
  /* Economy / shop */
  SHOP_DISCOUNT: "shopDiscount",

  /* Gameplay flags */
  SHOP_MAGNET_ENABLED: "shopMagnetEnabled",

  /* Grid visibility */
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

  /* Elemental peg effect durations (additive ms) */
  FIRE_DURATION_BONUS_MS: "fireDurationBonusMs",
  ICE_DURATION_BONUS_MS: "iceDurationBonusMs",
  ELECTRICAL_DURATION_BONUS_MS: "electricalDurationBonusMs",

  /* Glue peg durability (additive hp) */
  GLUE_PEG_HP_BONUS: "gluePegHpBonus",

  /* Gate width reductions (fraction 0..1 subtracted from each gate) */
  GATE_BACK_WIDTH_REDUCTION: "gateBackWidthReduction",
  GATE_HP_WIDTH_REDUCTION: "gateHpWidthReduction",
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
 * @property {string} [name]
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

const perm = (id, abilityRequired, cost, icon, modifiers) => ({
  id,
  type: BONUS_TYPES.PERMANENT,
  category: BONUS_CATEGORIES.BONUS,
  cost,
  abilityRequired,
  rarity: "permanent",
  icon,
  modifiers,
});

/** @type {BonusDef[]} */
export const PERMANENT_BONUSES = [
  /* SHOP — shop price discount tiers (additive, applied in shop pricing). */
  perm("perm_shop_discount_1", "shop_1", 1500, "🛒", [
    { paramKey: PARAM_KEYS.SHOP_DISCOUNT, op: "add", value: 0.05 },
  ]),
  perm("perm_shop_discount_2", "shop_2", 3000, "🛒", [
    { paramKey: PARAM_KEYS.SHOP_DISCOUNT, op: "add", value: 0.10 },
  ]),
  perm("perm_shop_discount_3", "shop_3", 5000, "🛒", [
    { paramKey: PARAM_KEYS.SHOP_DISCOUNT, op: "add", value: 0.15 },
  ]),
  perm("perm_shop_discount_4", "shop_4", 8000, "🛒", [
    { paramKey: PARAM_KEYS.SHOP_DISCOUNT, op: "add", value: 0.20 },
  ]),
  perm("perm_shop_discount_5", "shop_5", 12000, "🛒", [
    { paramKey: PARAM_KEYS.SHOP_DISCOUNT, op: "add", value: 0.25 },
  ]),
  perm("perm_shop_discount_6", "shop_6", 18000, "🛒", [
    { paramKey: PARAM_KEYS.SHOP_DISCOUNT, op: "add", value: 0.30 },
  ]),

  /* ECONOMY — peg replacement discount tiers (multiplicative). */
  perm("perm_peg_discount_1", "economy_1", 1500, "💸", [
    { paramKey: PARAM_KEYS.PEG_REPLACE_DISCOUNT, op: "multiply", value: 0.95 },
  ]),
  perm("perm_peg_discount_2", "economy_2", 3000, "💸", [
    { paramKey: PARAM_KEYS.PEG_REPLACE_DISCOUNT, op: "multiply", value: 0.90 },
  ]),
  perm("perm_peg_discount_3", "economy_3", 5000, "💸", [
    { paramKey: PARAM_KEYS.PEG_REPLACE_DISCOUNT, op: "multiply", value: 0.85 },
  ]),
  perm("perm_peg_discount_4", "economy_4", 8000, "💸", [
    { paramKey: PARAM_KEYS.PEG_REPLACE_DISCOUNT, op: "multiply", value: 0.80 },
  ]),
  perm("perm_peg_discount_5", "economy_5", 12000, "💸", [
    { paramKey: PARAM_KEYS.PEG_REPLACE_DISCOUNT, op: "multiply", value: 0.75 },
  ]),
  perm("perm_peg_discount_6", "economy_6", 18000, "💸", [
    { paramKey: PARAM_KEYS.PEG_REPLACE_DISCOUNT, op: "multiply", value: 0.70 },
  ]),

  /* PEG — special peg permanent boosts. */
  perm("perm_bomb_radius_xl", "peg_1", 6000, "💣", [
    { paramKey: PARAM_KEYS.BOMB_RADIUS_BONUS, op: "add", value: 25 },
  ]),
  perm("perm_fire_duration_1", "peg_2", 2000, "🔥", [
    { paramKey: PARAM_KEYS.FIRE_DURATION_BONUS_MS, op: "add", value: 1000 },
  ]),
  perm("perm_fire_duration_2", "peg_2", 5000, "🔥", [
    { paramKey: PARAM_KEYS.FIRE_DURATION_BONUS_MS, op: "add", value: 2000 },
  ]),
  perm("perm_fire_duration_3", "peg_2", 10000, "🔥", [
    { paramKey: PARAM_KEYS.FIRE_DURATION_BONUS_MS, op: "add", value: 3000 },
  ]),
  perm("perm_ice_duration_1", "peg_3", 2000, "❄️", [
    { paramKey: PARAM_KEYS.ICE_DURATION_BONUS_MS, op: "add", value: 1000 },
  ]),
  perm("perm_ice_duration_2", "peg_3", 5000, "❄️", [
    { paramKey: PARAM_KEYS.ICE_DURATION_BONUS_MS, op: "add", value: 2000 },
  ]),
  perm("perm_ice_duration_3", "peg_3", 10000, "❄️", [
    { paramKey: PARAM_KEYS.ICE_DURATION_BONUS_MS, op: "add", value: 3000 },
  ]),
  perm("perm_electrical_duration_1", "peg_4", 2000, "⚡", [
    { paramKey: PARAM_KEYS.ELECTRICAL_DURATION_BONUS_MS, op: "add", value: 1000 },
  ]),
  perm("perm_electrical_duration_2", "peg_4", 5000, "⚡", [
    { paramKey: PARAM_KEYS.ELECTRICAL_DURATION_BONUS_MS, op: "add", value: 2000 },
  ]),
  perm("perm_electrical_duration_3", "peg_4", 10000, "⚡", [
    { paramKey: PARAM_KEYS.ELECTRICAL_DURATION_BONUS_MS, op: "add", value: 3000 },
  ]),
  perm("perm_glue_hp_1", "peg_5", 2000, "🩹", [
    { paramKey: PARAM_KEYS.GLUE_PEG_HP_BONUS, op: "add", value: 5 },
  ]),
  perm("perm_glue_hp_2", "peg_5", 5000, "🩹", [
    { paramKey: PARAM_KEYS.GLUE_PEG_HP_BONUS, op: "add", value: 10 },
  ]),
  perm("perm_glue_hp_3", "peg_5", 10000, "🩹", [
    { paramKey: PARAM_KEYS.GLUE_PEG_HP_BONUS, op: "add", value: 15 },
  ]),

  /* GATE — destroy coin x2 + width reductions for back & hp gates. */
  perm("perm_destroy_coins_x2", "gate_1", 4000, "🪙", [
    { paramKey: PARAM_KEYS.DESTROY_COIN_MULTIPLIER, op: "multiply", value: 2 },
  ]),
  perm("perm_gate_back_width_1", "gate_2", 3000, "🚪", [
    { paramKey: PARAM_KEYS.GATE_BACK_WIDTH_REDUCTION, op: "add", value: 0.05 },
  ]),
  perm("perm_gate_back_width_2", "gate_3", 7000, "🚪", [
    { paramKey: PARAM_KEYS.GATE_BACK_WIDTH_REDUCTION, op: "add", value: 0.05 },
  ]),
  perm("perm_gate_hp_width_1", "gate_4", 5000, "🚪", [
    { paramKey: PARAM_KEYS.GATE_HP_WIDTH_REDUCTION, op: "add", value: 0.05 },
  ]),
  perm("perm_gate_hp_width_2", "gate_5", 10000, "🚪", [
    { paramKey: PARAM_KEYS.GATE_HP_WIDTH_REDUCTION, op: "add", value: 0.05 },
  ]),

  /* PLAYER — tower-defense HP tiers. */
  perm("perm_extra_hp_1", "player_1", 2000, "❤️", [
    { paramKey: PARAM_KEYS.PLAYER_MAX_HP_BONUS, op: "add", value: 5 },
  ]),
  perm("perm_extra_hp_2", "player_2", 5000, "❤️", [
    { paramKey: PARAM_KEYS.PLAYER_MAX_HP_BONUS, op: "add", value: 10 },
  ]),
  perm("perm_extra_hp_3", "player_3", 12000, "❤️", [
    { paramKey: PARAM_KEYS.PLAYER_MAX_HP_BONUS, op: "add", value: 15 },
  ]),
  perm("perm_extra_hp_4", "player_4", 25000, "❤️", [
    { paramKey: PARAM_KEYS.PLAYER_MAX_HP_BONUS, op: "add", value: 20 },
  ]),

  /* MAP — grid reveal tiers. */
  perm("perm_reveal_mystery", "map_1", 5000, "👁️", [
    { paramKey: PARAM_KEYS.REVEAL_MYSTERY, op: "set", value: true },
  ]),
  perm("perm_reveal_shops", "map_2", 8000, "👁️", [
    { paramKey: PARAM_KEYS.REVEAL_SHOPS, op: "set", value: true },
  ]),
  perm("perm_reveal_paths", "map_3", 15000, "👁️", [
    { paramKey: PARAM_KEYS.REVEAL_PATHS, op: "set", value: true },
  ]),
  perm("perm_reveal_boss", "map_4", 25000, "👁️", [
    { paramKey: PARAM_KEYS.REVEAL_BOSS, op: "set", value: true },
  ]),
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
    abilityRequired: null,
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
