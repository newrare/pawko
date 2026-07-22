/**
 * Central configuration constants.
 *
 * Rule: no magic number anywhere in the codebase. Add it here and import it
 * where it is used. CSS variables that depend on layout are pushed by
 * `LayoutManager` rather than hardcoded in stylesheets.
 */

// ─── Game identity ─────────────────────────────────────────────────────────

export const APP_ID = "com.pawko.game";
export const APP_NAME = "Pawko";

// ─── Orientation ───────────────────────────────────────────────────────────

/**
 * Supported orientations for the game viewport.
 * The `ORIENTATION` constant below is the single source of truth used by
 * `game-config.js` (Phaser scale mode), `LayoutManager` (safe-zone aspect),
 * `index.css` (root data-orientation attribute), and any feature that needs
 * to behave differently in portrait vs. landscape.
 */
export const ORIENTATIONS = /** @type {const} */ ({
  PORTRAIT: "portrait",
  LANDSCAPE: "landscape",
});

/** Active orientation for the current game. Change this single line to switch. */
export const ORIENTATION = ORIENTATIONS.PORTRAIT;

// ─── Layout ────────────────────────────────────────────────────────────────

/**
 * Minimum safe-area insets as a fraction of the corresponding viewport
 * dimension. Device insets (notch, home bar) are read via CSS env() and the
 * larger of the two is used.
 *
 * The gameplay box is **always centered on both axes** in the available
 * safe area. The MAX_* values cap how big it can get on a desktop / tablet
 * window — gameplay code can still address the box via `layout.safe.*`.
 */
export const SAFE_ZONE = {
  MIN_TOP: 0.05,
  MIN_BOTTOM: 0.04,
  MIN_SIDE: 0.03,
  /** Caps for portrait orientation. */
  MAX_WIDTH_PORTRAIT: 480,
  MAX_HEIGHT_PORTRAIT: 900,
  /** Caps for landscape orientation. */
  MAX_WIDTH_LANDSCAPE: 900,
  MAX_HEIGHT_LANDSCAPE: 480,
};

/**
 * Toggles for dev-only overlays. Only consulted in DEV builds (the imports
 * in `main.js` are already tree-shaken from production).
 */
export const DEV_FLAGS = {
  /** Render the green dashed safe-zone outline + size readout. */
  SHOW_SAFE_ZONE: false,
};

// ─── Animations ────────────────────────────────────────────────────────────

/**
 * Animation durations (ms). Mirrored as CSS custom properties by
 * `LayoutManager` so stylesheets can use `var(--anim-fast)` etc.
 */
export const ANIM = {
  FAST: 120,
  NORMAL: 250,
  SLOW: 400,
  MODAL_OPEN: 200,
  MODAL_CLOSE: 150,
};

// ─── Input ─────────────────────────────────────────────────────────────────

/**
 * Swipe detection — detect-on-move architecture.
 * Direction fires during touchmove as soon as the finger crosses this many
 * CSS px from start; `#fired` flag enforces one direction per gesture (no
 * time-based cooldown). See `utils/swipe-detector.js` for the implementation.
 */
export const SWIPE_THRESHOLD = 30;

// ─── Persistence ───────────────────────────────────────────────────────────

const NS = APP_ID;
export const STORAGE_KEYS = {
  LOCALE: `${NS}.locale`,
  OPTIONS: `${NS}.options`,
  SAVE: `${NS}.save`,
  SAVE_SLOTS: `${NS}.save_slots`,
  AUTOSAVE: `${NS}.autosave`,
  RANKINGS: `${NS}.rankings`,
  LEVEL_PROGRESS: `${NS}.level_progress`,
  CURRENCY: `${NS}.currency`,
  DIAMONDS: `${NS}.diamonds`,
  BONUSES: `${NS}.bonuses`,
  ABILITIES: `${NS}.abilities`,
  GRID_STATE: `${NS}.grid_state`,
  PINBOARD_STATE: `${NS}.pinboard_state`,
};

export const MAX_SAVE_SLOTS = 8;

// ─── Shop ──────────────────────────────────────────────────────────────────

/** Total number of slots shown in the shop drum (empty slots padded). */
export const SHOP_SLOT_COUNT = 10;

// ─── Default options ───────────────────────────────────────────────────────

export const DEFAULT_OPTIONS = {
  music: true,
  sound: true,
};

// ─── Audio ─────────────────────────────────────────────────────────────────

/**
 * Audio asset paths and per-key volume multipliers. Add SFX entries by adding
 * to `SFX` and (optionally) `SFX_VOLUMES`.
 */
export const AUDIO = {
  MUSIC: "sounds/music.mp3",
  MUSIC_VOLUME: 0.4,
  SFX_VOLUME: 0.6,
  /** Per-key volume multipliers (applied on top of SFX_VOLUME). */
  SFX_VOLUMES: {
    click: 0.6,
  },
  /** Map of key → asset path. */
  SFX: {
    click: "sounds/sfx-click.mp3",
  },
};

// ─── Locales ───────────────────────────────────────────────────────────────

export const DEFAULT_LOCALE = "en";

// ─── Plinko gameplay ───────────────────────────────────────────────────────

/**
 * All Plinko gameplay tuning. Magic numbers must come from here. See
 * `docs/LAYER.md`, `docs/BALL.md`, `docs/SLOT.md` for the full mechanics.
 */
export const PLINKO = {
  /* Layers & slots */
  SLOTS_PER_LAYER: 20,
  /** Random start slot offset; staggers the pattern from layer to layer. */
  START_SLOT_CHOICES: [0, 1, 2],

  /** Number of layers loaded at once at the start of a level. */
  INITIAL_LAYERS: 8,

  /* Launch zone */
  /** Delay between consecutive ball drops from the same sublaunch. */
  LAUNCH_DELAY_MS: 80,
  /** Anti-loop cap on how many times a ball may go through the recycle gate. */
  MAX_RECYCLES: 8,
  /** Hard cap on how many balls may exist on the pinboard at once. Balls still
     loaded in the cannon count toward this too, since the player will launch
     them and we can only refuse to CREATE new balls (e.g. chest release), not
     block firing. */
  MAX_PINBOARD_BALLS: 50,

  /* Pinboard sizing (CSS px). Pegs/bumpers/balls share the pinboard
     coordinate space (origin = pinboard top-left). */
  PEG_RADIUS: 10,
  BUMPER_RADIUS: 10,
  BALL_RADIUS: 9,
  /** Minimum clearance (fraction of pinboard width) a peg center must keep
     from either side wall. Edge pegs closer than this are dropped at layer
     generation so no peg hugs the board border. */
  PEG_EDGE_MARGIN_RATIO: 0.1,
  /** Vertical distance between two layers. */
  LAYER_HEIGHT: 56,
  /** Top padding inside the pinboard before the first layer. */
  LAYER_TOP_PADDING: 30,
  /** Gap (px) between the objective horizon line and the top peg row. */
  PROGRESS_LINE_MARGIN: 50,
  /** Distance (px) from the pinboard top to the target dashed line.
     Defines the empty zone reserved for the objective label and caps the
     gauge fill so its top edge meets the target line at 100%. */
  TARGET_LINE_OFFSET: 20,
  /* Physics */
  GRAVITY: 600,
  RESTITUTION_PEG: 0.4,
  RESTITUTION_BUMPER: 1.0,
  WALL_RESTITUTION: 0.7,
  /** Horizontal velocity multiplier when a ball contacts a floor surface. */
  FLOOR_FRICTION: 0,
  MAX_VELOCITY: 1200,
  /** Max simulation step (s); avoids tunneling on tab refocus. */
  MAX_STEP: 1 / 60,
  /** Sub-steps per frame for collision stability. */
  SUBSTEPS: 3,

  /* Currency */
  /** Coins awarded when a ball touches a coin peg. */
  COIN_VALUE: 1,
  /** How long (ms) a ball must be stationary before its blocker is removed. */
  STUCK_TIMEOUT_MS: 3000,

  /** Points deducted when a ball lands in the malus gate (legacy — kept for tests). */
  MALUS_POINTS: 10,

  /** Radius (px) within which an electrified ball attracts nearby active balls. */
  ELEC_ATTRACT_RADIUS: 90,
  /** Acceleration (px/s²) applied to balls being pulled toward an electrified ball. */
  ELEC_ATTRACT_FORCE: 250,

  /* Collection gates — 5 equal-width zones (sum = 1). Score mode:
     x1 | x2 | return | x2 | x1. The x1/x2 gates each raise the blue
     multiplier counter (x1 → +1, x2 → +2); the central return gate
     recycles the ball back to the top of the pinboard. */
  GATE_WIDTHS: {
    x1_left: 0.2,
    x2_left: 0.2,
    return: 0.2,
    x2_right: 0.2,
    x1_right: 0.2,
  },
  GATE_ORDER: ["x1_left", "x2_left", "return", "x2_right", "x1_right"],

  /** Multiplier increment added when a ball is captured by each gate.
      The central `return` gate recycles the ball and adds nothing. */
  GATE_MULT: {
    x1_left: 1,
    x2_left: 2,
    return: 0,
    x2_right: 2,
    x1_right: 1,
  },

  /* Shield peg */
  SHIELD_MAX_HITS: 5,
  SHIELD_COOLDOWN_MS: 5000,
  SHIELD_RADIUS_MULTIPLIER: 3,
};

// ─── Cannon ──────────────────────────────────────────────────────────────

/**
 * Cannon tuning. A single cannon sits at the top-center of the pinboard.
 * The player aims it (bubble-shooter style) and fires one ball per shot,
 * re-aiming between shots. The number of balls loaded scales with the level:
 * level 1 → 1 ball, level 2 → 2, … capped at `BALLS_MAX`.
 * See `docs/CANNON.md`.
 */
export const CANNON = {
  /** Balls loaded for level N = min(N, BALLS_MAX). */
  BALLS_MAX: 20,
  /** Initial speed (px/s) imparted to a launched ball. Gravity then applies. */
  LAUNCH_SPEED: 640,
  /** Half-angle of the aim cone measured from straight-down (radians).
     The barrel can never point flat/upward — the ball always heads down. */
  MAX_ANGLE: (75 * Math.PI) / 180,
  /** Distance (px) from the pivot to the muzzle tip where a ball spawns. */
  MUZZLE_LENGTH: 30,
  /** Vertical offset (px) of the cannon pivot below the pinboard top. */
  PIVOT_OFFSET_TOP: 24,
  /* Trajectory preview */
  /** Number of bounces (wall or peg) shown in the dashed preview. */
  TRAJ_BOUNCES: 2,
  /** Fixed integration step (s) for the preview simulation. */
  TRAJ_DT: 1 / 120,
  /** Hard cap on preview simulation steps (anti-runaway). */
  TRAJ_MAX_STEPS: 420,
  /** Minimum spacing (px) between two dashed-preview dots. */
  TRAJ_DOT_SPACING: 15,
  /** Maximum dots rendered for the preview line. */
  TRAJ_MAX_DOTS: 60,
};

// ─── Scoring ────────────────────────────────────────────────────────────────

/**
 * Score-mode tuning. Each level sets a target score; the player wins when the
 * final score (hit score × multiplier) reaches it.
 *
 * - Hit score accumulates the points of every peg a ball touches (gold).
 * - The multiplier starts at `MULTIPLIER_BASE` and grows as balls fall into
 *   the x1 / x2 gates (blue). See `PLINKO.GATE_MULT`.
 * - The objective grows linearly with the level: `OBJECTIVE_BASE × levelId`.
 */
export const SCORE = {
  /** Target score for level 1; multiplied by the level id. */
  OBJECTIVE_BASE: 500,
  /** Multiplier value at the start of every round. */
  MULTIPLIER_BASE: 1,
};

/** Total number of levels in a run — shown as "Level x/TOTAL_LEVELS". */
export const TOTAL_LEVELS = 20;

/**
 * Mystery cell (map) reward-choice tuning. Landing on a mystery cell now opens
 * a modal offering `COUNT` distinct reward cards; the player must pick one.
 * Bonuses already active this run are excluded from the pool. When fewer than
 * `COUNT` bonuses remain, the empty slots become a **common** currency card
 * granting coins or diamonds (amounts rolled in the ranges below, inclusive).
 * See `docs/BONUS.md`.
 */
export const MYSTERY_CHOICE = {
  COUNT: 2,
  FALLBACK_COINS_MIN: 40,
  FALLBACK_COINS_MAX: 80,
  FALLBACK_DIAMONDS_MIN: 1,
  FALLBACK_DIAMONDS_MAX: 3,
};

/**
 * Rarity vocabulary — shared by mystery rewards (`bonus-defs.js`) and the
 * slot-machine peg pool (peg rarity derived from the boutique price, see
 * `slot-machine-defs.js#rarityForUpgrade`). `malus` is a reward category, not a
 * quality tier, so it is intentionally absent here.
 */
export const RARITY = /** @type {const} */ ({
  LEGENDARY: "legendary",
  EPIC: "epic",
  RARE: "rare",
  COMMON: "common",
});

/**
 * Relative draw weights per rarity, used by any **weighted** rarity roll
 * (mystery reward pool, slot-machine reel). Higher = more frequent. Tuning
 * these is the single knob for how often rare/epic/legendary outcomes appear;
 * the previous behaviour (uniform draw) is recovered by setting them equal.
 * @type {Record<string, number>}
 */
export const RARITY_WEIGHTS = {
  [RARITY.COMMON]: 60,
  [RARITY.RARE]: 25,
  [RARITY.EPIC]: 12,
  [RARITY.LEGENDARY]: 3,
};

// ─── Peg Save System ──────────────────────────────────────────────────────

/**
 * Tuning for the peg rescue mechanic. When a peg reaches 0 HP a rescue
 * ring appears; if the player taps it in time the peg is restored.
 * See `docs/PEG-SAVE.md` for the full design.
 */
export const PEG_SAVE = {
  /** Duration (ms) of the rescue window / shrinking ring animation. */
  RESCUE_DURATION_MS: 2000,
  /** HP restored to a successfully saved peg. */
  SAVED_HP: 1,
  /** Combo multiplier increment per consecutive save. */
  COMBO_INCREMENT: 0.1,
  /** Idle time (ms) after the last save before the combo resets. */
  COMBO_DECAY_MS: 5000,
};

// ─── Peg definitions ──────────────────────────────────────────────────────

/**
 * Configuration for each peg type.
 * Each peg type has a base HP (hits before destruction).
 * Layers spawn classic pegs only.
 * @type {Record<string, { hp: number }>}
 */
export const PEG_DEFS = {
  peg: { hp: 10 },
  bumper: { hp: 10 },
  coin: { hp: 10 },
  diamond: { hp: 10 },
  glue: { hp: 2 },
  teleport: { hp: 10 },
  chest: { hp: 3 },
  shield: { hp: 10 },
  mystery: { hp: 5 },
  fire: { hp: 10 },
  ice: { hp: 10 },
  electrical: { hp: 10 },
  bomb: { hp: 10 },
};

/**
 * Points awarded to the hit-score counter each time a ball touches a peg.
 * Reward pegs (coin, diamond, mystery, chest) grant 0 points but still hand
 * out their coins / diamonds / powers. The bomb still explodes after a single
 * hit — it just credits its points first.
 * @type {Record<string, number>}
 */
export const PEG_POINTS = {
  peg: 10,
  coin: 0,
  diamond: 0,
  mystery: 0,
  chest: 0,
  fire: 20,
  ice: 20,
  glue: 200,
  electrical: 20,
  teleport: 20,
  shield: 20,
  bumper: 30,
  bomb: 1000,
};

/**
 * How a ball's active effect modifies the points credited on each peg hit.
 * `add` is a flat bonus applied to the peg's base points; `mult` scales the
 * total. When several effects are active, all `add` bonuses are summed first,
 * then all `mult` factors are applied — `Math.round((base + Σadd) × Πmult)`.
 * Effects absent from this map (or with no entry) leave the score unchanged.
 * @type {Record<string, { add?: number, mult?: number }>}
 */
export const EFFECT_HIT_SCORE = {
  /** Fire ball: +5 points per peg hit. */
  burning: { add: 5 },
  /** Ice ball: +10 points per peg hit. */
  frozen: { add: 10 },
  /** Electrical ball: ×2 points per peg hit. */
  electrified: { mult: 2 },
};

/** Number of classic balls a chest releases onto the pinboard when destroyed. */
export const CHEST_BALL_RELEASE = 3;

/**
 * Timing (ms) for the `+N` hit-score chip that pops at a hit peg and then
 * flies into the gold total. The chip lingers `HOLD_MS` in place so the
 * player can read the points, then travels to the counter in `FLY_MS`.
 * The gold total only increments when the chip merges in (i.e. after
 * `HOLD_MS + FLY_MS`).
 * @type {{ HOLD_MS: number, FLY_MS: number }}
 */
export const SCORE_FLY = {
  HOLD_MS: 2000,
  FLY_MS: 360,
};

// ─── Ball kinds & peg-to-ball effects ─────────────────────────────────────
/* Ball kinds (the string ids) live next to the factory in
   `src/entities/ball-factory.js` — see `BALL_KINDS` there. */

/**
 * Configuration for each ball kind. Mirrors `PEG_DEFS`: each entry
 * carries the base HP (hits a ball can absorb before being destroyed).
 * Ball variants will be added here as they come.
 * @type {Record<string, { hp: number }>}
 */
export const BALL_DEFS = {
  classic: { hp: 20 },
};

/**
 * Elemental peg → ball effect configuration.
 * Used by ball.applyEffect() and tickEffects().
 */
export const EFFECT_DEFS = {
  /** Fire peg: -1 HP every tickMs for durationMs. */
  burning: { durationMs: 3000, tickMs: 1000 },
  /** Ice peg: speed × 0.5 for durationMs. */
  frozen: { durationMs: 2000, tickMs: 0 },
  /** Electrical peg: -1 HP every tickMs for durationMs. */
  electrified: { durationMs: 3000, tickMs: 500 },
};

/** Radius (px) of the bomb peg explosion area. */
export const BOMB_RADIUS = 80;

// ─── Slot machine (peg-upgrade drum) ────────────────────────────────────────

/**
 * The pinboard slot machine ("bandit manchot"). On level open its reels spin
 * and settle on random peg upgrades; the player drags an upgrade onto a
 * classic peg to evolve it (free). A reel emptied by a drop can be re-filled
 * with a re-spin whose coin cost grows exponentially and resets each level.
 * See `docs/SLOT-MACHINE.md`.
 */
export const SLOT_MACHINE = {
  /** Active (unlocked) reels by default. */
  REEL_COUNT_DEFAULT: 4,
  /** Total reel slots always shown; slots beyond the unlocked count render
      a padlock. The unlocked count can grow toward this cap. */
  REEL_COUNT_MAX: 7,
  /** Re-spin cost = REROLL_BASE_COST × REROLL_GROWTH^(re-spins done this level). */
  REROLL_BASE_COST: 25,
  REROLL_GROWTH: 2,
  /** Reel spin: long, heavy deceleration before it settles (ms). */
  SPIN_DURATION_MS: 2000,
  /** Extra delay per reel so they settle one after another (ms). */
  SPIN_STAGGER_MS: 220,
  /** Number of filler cells rolled through before the target lands. */
  SPIN_ROLL_CELLS: 20,
  /** Heavy ease-out used for the deceleration curve. */
  SPIN_EASING: "cubic-bezier(.12,.7,.08,1)",
  /** Reel tremble as it comes to rest (ms). */
  TREMBLE_MS: 180,
  /** Grace window (ms) after the last score change during which the machine
      stays faded in the background (score still "increasing"). */
  DIM_SCORE_IDLE_MS: 600,
};
