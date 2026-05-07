/**
 * Bonus definitions — pure data.
 *
 * See `docs/BONUS.md` for the full spec. Adding a new bonus is a 5-step
 * checklist that lives in that doc.
 *
 * Modifier shape: { paramKey, op, value }
 *   - paramKey: one of PARAM_KEYS
 *   - op: 'add' | 'multiply' | 'set'
 *   - value: number (or any value for 'set')
 *
 * Resolution order in `bonusManager.resolve()`: add -> multiply -> set.
 */

export const BONUS_TYPES = /** @type {const} */ ({
  PERMANENT: "permanent",
  SESSION: "session",
});

export const PARAM_KEYS = /** @type {const} */ ({
  /** Base balls held per sublauncher at round start. */
  STARTING_BALLS_PER_SUBLAUNCH: "startingBallsPerSublaunch",
  /** Number of sublaunchers shown for the round. */
  SUBLAUNCH_COUNT: "sublaunchCount",
  /** Multiplier applied to score awarded by classic pegs (not bumpers). */
  PEG_SCORE_MULTIPLIER: "pegScoreMultiplier",
  /** Truthy: shop pegs attract nearby balls. */
  SHOP_MAGNET_ENABLED: "shopMagnetEnabled",
});

/**
 * @typedef {object} BonusModifier
 * @property {string} paramKey
 * @property {'add' | 'multiply' | 'set'} op
 * @property {number | boolean} value
 */

/**
 * @typedef {object} BonusDef
 * @property {string} id
 * @property {'permanent' | 'session'} type
 * @property {number} cost
 * @property {string | null} abilityRequired
 * @property {number} [durationLevels] — session only
 * @property {BonusModifier[]} modifiers
 * @property {((ctx: object) => void) | null} [onExpire] — session only
 */

/** @type {BonusDef[]} */
export const PERMANENT_BONUSES = [
  {
    id: "extra_start_ball",
    type: BONUS_TYPES.PERMANENT,
    cost: 60,
    abilityRequired: "start_ball_up",
    modifiers: [
      {
        paramKey: PARAM_KEYS.STARTING_BALLS_PER_SUBLAUNCH,
        op: "add",
        value: 1,
      },
    ],
  },
  {
    id: "shop_magnet",
    type: BONUS_TYPES.PERMANENT,
    cost: 120,
    abilityRequired: "magnet",
    modifiers: [
      { paramKey: PARAM_KEYS.SHOP_MAGNET_ENABLED, op: "set", value: true },
    ],
  },
];

/** @type {BonusDef[]} */
export const SESSION_BONUSES = [
  {
    id: "bonus_launcher",
    type: BONUS_TYPES.SESSION,
    cost: 40,
    abilityRequired: "extra_launch",
    durationLevels: 3,
    modifiers: [
      { paramKey: PARAM_KEYS.SUBLAUNCH_COUNT, op: "add", value: 1 },
    ],
    onExpire: null,
  },
  {
    id: "score_x2",
    type: BONUS_TYPES.SESSION,
    cost: 30,
    abilityRequired: "score_boost",
    durationLevels: 3,
    modifiers: [
      { paramKey: PARAM_KEYS.PEG_SCORE_MULTIPLIER, op: "multiply", value: 2 },
    ],
    onExpire: null,
  },
];

/** All bonuses, indexed by id. */
export const ALL_BONUSES = [...PERMANENT_BONUSES, ...SESSION_BONUSES];

/**
 * @param {string} id
 * @returns {BonusDef | null}
 */
export function findBonus(id) {
  return ALL_BONUSES.find((b) => b.id === id) ?? null;
}
