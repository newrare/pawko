/**
 * Bonus definitions — pure data, zero logic.
 *
 * Two categories:
 * - **permanent**: unlocked at level milestones, persist forever
 * - **session**: obtained randomly from shop, active for current game only
 *
 * @typedef {{
 *   id: string,
 *   category: 'permanent' | 'session',
 *   unlockLevel?: number,
 *   shopWeight?: number,
 *   rarity?: 'common' | 'rare' | 'epic' | 'legendary',
 *   icon: string,
 *   modifiers?: Array<{ param: string, op: 'multiply' | 'add' | 'set', value: number }>,
 *   trigger?: { event: string, condition?: (ctx: BonusContext) => boolean, effect: (ctx: BonusContext) => void },
 *   onExpire?: (ctx: BonusContext) => void,
 *   activatable?: boolean,
 *   durationLevels?: number,
 *   cooldownLevels?: number,
 * }} BonusDef
 *
 * @typedef {{
 *   spawnBonusBall: () => void,
 *   getLevel: () => number,
 *   getHits: () => number,
 *   addSaved: (n: number) => void,
 *   addSublaunch: (balls: number) => void,
 *   removeSublaunch: () => void,
 *   queueIceBall: () => void,
 *   cleanupIce: () => void,
 * }} BonusContext
 */

/**
 * Parameter keys that bonuses can modify.
 * Each key maps to a game parameter read in the physics loop or controller.
 */
export const PARAM_KEYS = /** @type {const} */ ({
  GRAVITY: "gravity",
  MAX_VELOCITY: "maxVelocity",
  WALL_RESTITUTION: "wallRestitution",
  RESTITUTION_PEG: "restitutionPeg",
  RESTITUTION_BUMPER: "restitutionBumper",
  BALL_RADIUS: "ballRadius",
  MAX_RECYCLES: "maxRecycles",
  BUMPER_CHANCE: "bumperChance",
  GATE_WIDTH_DRAIN: "gateWidthDrain",
  GATE_WIDTH_SAVE: "gateWidthSave",
  SCORE_MULTIPLIER: "scoreMultiplier",
  LAUNCH_DELAY_MS: "launchDelayMs",
  STUCK_TIMEOUT_MS: "stuckTimeoutMs",
  SCORE_PEG: "scorePeg",
  STARTING_BALLS_PER_SUBLAUNCH: "startingBallsPerSublaunch",
  SHOP_MAGNET_FORCE: "shopMagnetForce",
});

/** Milestone interval — one permanent bonus every N levels. */
export const BONUS_MILESTONE_INTERVAL = 10;

/**
 * Permanent bonuses — unlocked once at level milestones, persist forever.
 * @type {BonusDef[]}
 */
export const PERMANENT_BONUSES = [
  {
    id: "extra_start_ball",
    category: "permanent",
    unlockLevel: 10,
    icon: "\uD83D\uDFE2",
    modifiers: [{ param: "startingBallsPerSublaunch", op: "add", value: 1 }],
  },
  {
    id: "shop_magnet",
    category: "permanent",
    unlockLevel: 20,
    icon: "\uD83E\uDDF2",
    modifiers: [{ param: "shopMagnetForce", op: "set", value: 1 }],
  },
];

/**
 * Session bonuses — obtained randomly from the shop, active this game only.
 * @type {BonusDef[]}
 */
export const SESSION_BONUSES = [
  {
    id: "bonus_launcher",
    category: "session",
    rarity: "epic",
    shopWeight: 0.6,
    icon: "\uD83D\uDE80",
    durationLevels: 3,
    trigger: {
      event: "bonus:applied",
      effect: (ctx) => ctx.addSublaunch(5),
    },
    onExpire: (ctx) => ctx.removeSublaunch(),
  },
  {
    id: "score_x2",
    category: "session",
    rarity: "legendary",
    shopWeight: 0.4,
    icon: "\u2728",
    durationLevels: 3,
    modifiers: [{ param: "scoreMultiplier", op: "multiply", value: 2 }],
  },
  {
    id: "ice_ball",
    category: "session",
    rarity: "rare",
    shopWeight: 0.5,
    icon: "\ud83e\uddca",
    durationLevels: 10,
    trigger: {
      event: "bonus:applied",
      effect: (ctx) => ctx.queueIceBall(),
    },
    onExpire: (ctx) => ctx.cleanupIce(),
  },
];

/** All bonuses combined for lookups. */
export const ALL_BONUSES = [...PERMANENT_BONUSES, ...SESSION_BONUSES];
