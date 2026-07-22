/**
 * Reward (bonus & malus) definitions — pure data.
 *
 * Rewards are **run-scoped**: they are never bought. A reward is obtained
 * only from a **mystery** source (a mystery cell on the map or a mystery peg
 * on the pinboard). Bonuses help the player; maluses hinder. Rewards are
 * cumulable — several may be active at once.
 *
 * ## Duration
 * A reward stays active for a bounded duration expressed in one of three
 * **units** (`DURATION_UNITS`): completed **levels**, **shops** visited, or
 * **mystery** draws — or for the whole **run**. Two ways to declare it:
 *   - `durationLevels: N | null` — a fixed count of levels (`null` = whole run).
 *     Used by bonuses.
 *   - `durationRandom: true` — the duration is **rolled at activation** from
 *     `RANDOM_DURATIONS` ({1,5}×{level,shop,mystery} or whole run). Used by
 *     every malus.
 *
 * ## Effects
 * A reward can carry three kinds of effects:
 *   - **modifiers**: `{ paramKey, op, value }` (or `values: [...]` for a
 *     magnitude **rolled at activation**) resolved on every call to
 *     `bonusManager.resolve(paramKey, baseValue)` while active. Order:
 *     add → multiply → set.
 *   - **directives**: one-shot actions queued at activation time and drained
 *     by the game controller at the start of the next round (e.g. add a ball).
 *     See `BonusManager.consumeDirectives`.
 *   - **triggers**: event-driven effects fired by the game controller when a
 *     matching gameplay event happens (peg destroyed, peg saved, effect
 *     cancelled, …). See `BonusManager.getActiveTriggers`.
 *
 * Permanent progression (shop discount, gates, map reveal, slot-machine
 * wheels) lives in `ability-defs.js`; peg-type purchases live in
 * `peg-shop-defs.js`. This file is only about run rewards.
 *
 * See `docs/BONUS.md`.
 */

export const BONUS_CATEGORIES = /** @type {const} */ ({
  BONUS: "bonus",
  MALUS: "malus",
});

/**
 * Units a reward's duration can be counted in. `RUN` is decremented by
 * nothing (whole-run, stored as Infinity); the other three are ticked by the
 * matching game-controller event through `bonusManager`:
 *   - `LEVEL`   → `onLevelUp()`      (a level completed on victory)
 *   - `SHOP`    → `onShopVisited()`  (the boutique was entered)
 *   - `MYSTERY` → `onMysteryDraw()`  (a mystery reward was drawn)
 */
export const DURATION_UNITS = /** @type {const} */ ({
  LEVEL: "level",
  SHOP: "shop",
  MYSTERY: "mystery",
  RUN: "run",
});

/**
 * The pool a `durationRandom` reward draws from at activation: a short (1) or
 * medium (5) count in each countable unit, or the whole run. One entry is
 * picked uniformly. `count` is `Infinity` for the run-scoped entry.
 * @type {Array<{ unit: string, count: number }>}
 */
export const RANDOM_DURATIONS = [
  { unit: DURATION_UNITS.LEVEL, count: 1 },
  { unit: DURATION_UNITS.LEVEL, count: 5 },
  { unit: DURATION_UNITS.SHOP, count: 1 },
  { unit: DURATION_UNITS.SHOP, count: 5 },
  { unit: DURATION_UNITS.MYSTERY, count: 1 },
  { unit: DURATION_UNITS.MYSTERY, count: 5 },
  { unit: DURATION_UNITS.RUN, count: Infinity },
];

/**
 * Every parameter key consumed by `bonusManager.resolve()` (run-scoped) or
 * `abilityManager.resolve()` (permanent). Magic strings outside this map are
 * a bug. The comment tags which manager owns each key.
 */
export const PARAM_KEYS = /** @type {const} */ ({
  /* Economy / shop — PERMANENT (abilityManager) */
  SHOP_DISCOUNT: "shopDiscount",

  /* Grid visibility — PERMANENT (abilityManager) */
  REVEAL_MYSTERY: "revealMystery",
  REVEAL_SHOPS: "revealShops",
  REVEAL_PATHS: "revealPaths",
  REVEAL_BOSS: "revealBoss",

  /* Gate width reductions (fraction 0..1) + multiplier factor —
     PERMANENT (abilityManager). BACK → edge x1 gates, HP → central `return`
     gate. Additive; the freed width is redistributed to the x2 gates. */
  GATE_BACK_WIDTH_REDUCTION: "gateBackWidthReduction",
  GATE_HP_WIDTH_REDUCTION: "gateHpWidthReduction",
  GATE_MULT_FACTOR: "gateMultFactor",

  /* Slot machine — PERMANENT (abilityManager) */
  SLOT_REEL_BONUS: "slotReelBonus", // extra unlocked reels (add)
  SLOT_REROLL_DISCOUNT: "slotRerollDiscount", // re-spin cost factor (multiply)

  /* Grid visibility — RUN malus (bonusManager) */
  REVEAL_LEVEL_NUMBER: "revealLevelNumber",

  /* Run-scoped gameplay (bonusManager) */
  SCORE_TOTAL_MULTIPLIER: "scoreTotalMultiplier",
  DESTROY_COIN_MULTIPLIER: "destroyCoinMultiplier",
  BOMB_RADIUS_BONUS: "bombRadiusBonus",
  TELEPORT_RECYCLE_MAX_BONUS: "teleportRecycleMaxBonus",
  SLOT_LUCKY_REEL_CHANCE: "slotLuckyReelChance",

  /* Run malus knobs (bonusManager) */
  SHOP_PRICE_MULT: "shopPriceMult", // boutique price multiplier (multiply)
  CANNON_MISFIRE_CHANCE: "cannonMisfireChance", // ball explodes at muzzle (add)
  OBJECTIVE_MULTIPLIER: "objectiveMultiplier", // level target score (multiply)
  SLOT_REROLL_DISABLED: "slotRerollDisabled", // re-spin locked (set true)
  SLOT_FORCE_COMMON: "slotForceCommon", // reels roll common only (set true)
  MYSTERY_FORCE_COMMON: "mysteryForceCommon", // mystery draws common only (set true)

  /* Elemental peg effect durations (additive ms) — RUN (bonusManager) */
  FIRE_DURATION_BONUS_MS: "fireDurationBonusMs",
  ICE_DURATION_BONUS_MS: "iceDurationBonusMs",
  ELECTRICAL_DURATION_BONUS_MS: "electricalDurationBonusMs",

  /* Glue peg durability (additive hp) — RUN (bonusManager) */
  GLUE_PEG_HP_BONUS: "gluePegHpBonus",
});

/**
 * Directive action types. Drained by the game controller at the start of
 * each round through `bonusManager.consumeDirectives()`.
 */
export const DIRECTIVE_ACTIONS = /** @type {const} */ ({
  ADD_BALL: "addBall",
  REMOVE_BALL: "removeBall",
});

/**
 * Gameplay events a reward trigger can listen to. Emitted by the game
 * controller as they happen.
 */
export const TRIGGER_EVENTS = /** @type {const} */ ({
  PEG_DESTROYED: "pegDestroyed",
  PEG_SAVED: "pegSaved",
  EFFECT_CANCELLED: "effectCancelled",
});

/**
 * Actions a reward trigger can perform when its event fires. Applied by the
 * game controller's `#applyTriggers` dispatcher.
 */
export const TRIGGER_ACTIONS = /** @type {const} */ ({
  ADD_HIT_SCORE: "addHitScore", // payload { points }
  SPAWN_BALL: "spawnBall", // payload { kind, count }
  ADD_COINS: "addCoins", // payload { coins }
  ACTIVATE: "activate", // payload { bonusId } — activate another reward
});

/**
 * A modifier carries either a fixed `value` or a `values` set from which one is
 * **rolled at activation** and then frozen for the reward's lifetime.
 * @typedef {object} BonusModifier
 * @property {string} paramKey
 * @property {'add' | 'multiply' | 'set'} op
 * @property {number | boolean} [value]     fixed magnitude
 * @property {Array<number | boolean>} [values]  candidate magnitudes (rolled once)
 */

/**
 * @typedef {object} BonusDirective
 * @property {string} action  one of DIRECTIVE_ACTIONS
 * @property {object} payload action-specific payload
 */

/**
 * @typedef {object} BonusTrigger
 * @property {string} on       one of TRIGGER_EVENTS
 * @property {string} action   one of TRIGGER_ACTIONS
 * @property {object} [payload] action-specific payload
 * @property {object} [match]  event fields that must match for the trigger to fire
 */

/**
 * @typedef {'legendary' | 'epic' | 'rare' | 'common' | 'malus'} BonusRarity
 */

/**
 * @typedef {object} BonusDef
 * @property {string} id
 * @property {string} [name]
 * @property {'bonus' | 'malus'} category
 * @property {BonusRarity} rarity
 * @property {string} icon  — Lucide icon name (rendered via utils/icon.js)
 * @property {number | null} [durationLevels]  — fixed level count; null = whole run
 * @property {boolean} [durationRandom]  — roll duration from RANDOM_DURATIONS
 * @property {BonusModifier[]} [modifiers]
 * @property {BonusDirective[]} [directives]   — queued on activation
 * @property {BonusTrigger[]} [triggers]       — event-driven
 * @property {((ctx: object) => void) | null} [onExpire]
 */

// ────────────────────────────────────────────────────────────────────
// Reward bonuses (obtained via mystery)
// ────────────────────────────────────────────────────────────────────

/** @type {BonusDef[]} */
export const REWARD_BONUSES = [
  {
    id: "reward_score_total_x2",
    name: "Score ×2",
    category: BONUS_CATEGORIES.BONUS,
    rarity: "epic",
    icon: "sparkles",
    durationLevels: null,
    modifiers: [
      { paramKey: PARAM_KEYS.SCORE_TOTAL_MULTIPLIER, op: "multiply", value: 2 },
    ],
  },
  {
    id: "reward_peg_destroy_50",
    name: "+50 / peg",
    category: BONUS_CATEGORIES.BONUS,
    rarity: "common",
    icon: "zap",
    durationLevels: null,
    triggers: [
      {
        on: TRIGGER_EVENTS.PEG_DESTROYED,
        action: TRIGGER_ACTIONS.ADD_HIT_SCORE,
        payload: { points: 50 },
      },
    ],
  },
  {
    id: "reward_save_spawn_ball",
    name: "Save → Ball",
    category: BONUS_CATEGORIES.BONUS,
    rarity: "rare",
    icon: "save",
    durationLevels: null,
    triggers: [
      {
        on: TRIGGER_EVENTS.PEG_SAVED,
        action: TRIGGER_ACTIONS.SPAWN_BALL,
        payload: { kind: "classic", count: 1 },
      },
    ],
  },
  {
    id: "reward_ice_quench_x2",
    name: "Quench ×2",
    category: BONUS_CATEGORIES.BONUS,
    rarity: "epic",
    icon: "snowflake",
    durationLevels: null,
    triggers: [
      {
        on: TRIGGER_EVENTS.EFFECT_CANCELLED,
        action: TRIGGER_ACTIONS.ACTIVATE,
        match: { cancelled: "burning", by: "frozen" },
        payload: { bonusId: "reward_score_total_x2" },
      },
    ],
  },
  {
    id: "reward_lucky_reel",
    name: "Lucky Reel",
    category: BONUS_CATEGORIES.BONUS,
    rarity: "epic",
    icon: "dices",
    durationLevels: null,
    modifiers: [
      { paramKey: PARAM_KEYS.SLOT_LUCKY_REEL_CHANCE, op: "add", value: 0.1 },
    ],
  },
  {
    id: "reward_coins_x2",
    name: "Coins ×2",
    category: BONUS_CATEGORIES.BONUS,
    rarity: "rare",
    icon: "coins",
    durationLevels: 3,
    modifiers: [
      {
        paramKey: PARAM_KEYS.DESTROY_COIN_MULTIPLIER,
        op: "multiply",
        value: 2,
      },
    ],
  },
  {
    id: "reward_coins_x3",
    name: "Coins ×3",
    category: BONUS_CATEGORIES.BONUS,
    rarity: "legendary",
    icon: "banknote",
    durationLevels: null,
    modifiers: [
      {
        paramKey: PARAM_KEYS.DESTROY_COIN_MULTIPLIER,
        op: "multiply",
        value: 3,
      },
    ],
  },
  {
    id: "reward_extra_recycles",
    name: "Recycles +2",
    category: BONUS_CATEGORIES.BONUS,
    rarity: "common",
    icon: "recycle",
    durationLevels: null,
    modifiers: [
      { paramKey: PARAM_KEYS.TELEPORT_RECYCLE_MAX_BONUS, op: "add", value: 2 },
    ],
  },
  {
    id: "reward_extra_ball",
    name: "+1 Ball",
    category: BONUS_CATEGORIES.BONUS,
    rarity: "common",
    icon: "circle-plus",
    durationLevels: 1,
    directives: [
      {
        action: DIRECTIVE_ACTIONS.ADD_BALL,
        payload: { kind: "classic", count: 1, target: "one" },
      },
    ],
  },
  {
    id: "reward_bomb_radius",
    name: "Big Bombs",
    category: BONUS_CATEGORIES.BONUS,
    rarity: "rare",
    icon: "bomb",
    durationLevels: null,
    modifiers: [
      { paramKey: PARAM_KEYS.BOMB_RADIUS_BONUS, op: "add", value: 40 },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────
// Reward maluses (obtained via mystery)
// ────────────────────────────────────────────────────────────────────

/**
 * Every malus rolls its duration at activation (`durationRandom: true`) from
 * `RANDOM_DURATIONS`. Maluses with a variable magnitude declare `values` on
 * their modifier; one is rolled once and frozen.
 * @type {BonusDef[]}
 */
export const REWARD_MALUSES = [
  {
    id: "malus_obfuscate_level_number",
    name: "Blind",
    category: BONUS_CATEGORIES.MALUS,
    rarity: "malus",
    icon: "eye-off",
    durationRandom: true,
    modifiers: [
      { paramKey: PARAM_KEYS.REVEAL_LEVEL_NUMBER, op: "set", value: false },
    ],
  },
  {
    id: "malus_shop_price",
    name: "Racket",
    category: BONUS_CATEGORIES.MALUS,
    rarity: "malus",
    icon: "shopping-cart",
    durationRandom: true,
    modifiers: [
      {
        paramKey: PARAM_KEYS.SHOP_PRICE_MULT,
        op: "multiply",
        values: [2, 5, 10],
      },
    ],
  },
  {
    id: "malus_cannon_misfire",
    name: "Misfire",
    category: BONUS_CATEGORIES.MALUS,
    rarity: "malus",
    icon: "flame",
    durationRandom: true,
    modifiers: [
      {
        paramKey: PARAM_KEYS.CANNON_MISFIRE_CHANCE,
        op: "add",
        values: [0.1, 0.3, 0.5],
      },
    ],
  },
  {
    id: "malus_mystery_common",
    name: "Jinx",
    category: BONUS_CATEGORIES.MALUS,
    rarity: "malus",
    icon: "circle-help",
    durationRandom: true,
    modifiers: [
      { paramKey: PARAM_KEYS.MYSTERY_FORCE_COMMON, op: "set", value: true },
    ],
  },
  {
    id: "malus_objective_double",
    name: "Double Trouble",
    category: BONUS_CATEGORIES.MALUS,
    rarity: "malus",
    icon: "target",
    durationRandom: true,
    modifiers: [
      { paramKey: PARAM_KEYS.OBJECTIVE_MULTIPLIER, op: "multiply", value: 2 },
    ],
  },
  {
    id: "malus_slot_no_reroll",
    name: "Jammed",
    category: BONUS_CATEGORIES.MALUS,
    rarity: "malus",
    icon: "ban",
    durationRandom: true,
    modifiers: [
      { paramKey: PARAM_KEYS.SLOT_REROLL_DISABLED, op: "set", value: true },
    ],
  },
  {
    id: "malus_slot_common",
    name: "Cheap Reels",
    category: BONUS_CATEGORIES.MALUS,
    rarity: "malus",
    icon: "chevrons-down",
    durationRandom: true,
    modifiers: [
      { paramKey: PARAM_KEYS.SLOT_FORCE_COMMON, op: "set", value: true },
    ],
  },
  {
    id: "malus_score_penalty",
    name: "Handicap",
    category: BONUS_CATEGORIES.MALUS,
    rarity: "malus",
    icon: "trending-down",
    durationRandom: true,
    modifiers: [
      {
        paramKey: PARAM_KEYS.SCORE_TOTAL_MULTIPLIER,
        op: "multiply",
        values: [0.9, 0.85, 0.8, 0.75, 0.7],
      },
    ],
  },
];

/** Every reward entry, indexed by id. */
export const ALL_BONUSES = [...REWARD_BONUSES, ...REWARD_MALUSES];

/**
 * @param {string} id
 * @returns {BonusDef | null}
 */
export function findBonus(id) {
  return ALL_BONUSES.find((b) => b.id === id) ?? null;
}
