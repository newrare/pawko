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
export const APP_VERSION = "0.1.0";

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

// ─── Scenes ────────────────────────────────────────────────────────────────

export const SCENE_KEYS = /** @type {const} */ ({
  BOOT: "BootScene",
  PRELOAD: "PreloadScene",
  TITLE: "TitleScene",
  GAME: "GameScene",
  /** Dev-only: registered conditionally by game-config.js. */
  STYLEGUIDE: "StyleguideScene",
});

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
  BONUSES: `${NS}.bonuses`,
  ABILITIES: `${NS}.abilities`,
  GRID_STATE: `${NS}.grid_state`,
};

export const MAX_SAVE_SLOTS = 8;

// ─── Shop ──────────────────────────────────────────────────────────────────

/** Total number of slots shown in the shop drum (empty slots padded). */
export const SHOP_SLOT_COUNT = 10;

// ─── Default options ───────────────────────────────────────────────────────

export const DEFAULT_OPTIONS = {
  music: true,
  sound: true,
  animSkip: false,
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
export const AVAILABLE_LOCALES = ["en", "fr"];

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
  /** Probability a filled slot becomes a bumper instead of a peg. */
  BUMPER_CHANCE_BASE: 0.05,
  BUMPER_CHANCE_PER_LEVEL: 0.005,
  BUMPER_CHANCE_MAX: 0.35,

  /** Number of layers loaded at once at the start of a level. */
  INITIAL_LAYERS: 9,

  /* Launch zone */
  SUBLAUNCH_COUNT: 3,
  /** Base ball count per sublaunch at round start. */
  STARTING_BALLS_PER_SUBLAUNCH: 5,
  /** Delay between consecutive ball drops from the same sublaunch. */
  LAUNCH_DELAY_MS: 80,
  /** Anti-loop cap on how many times a ball may go through the recycle gate. */
  MAX_RECYCLES: 8,

  /* Pinboard sizing (CSS px). Pegs/bumpers/balls share the pinboard
     coordinate space (origin = pinboard top-left). */
  PEG_RADIUS: 7,
  BUMPER_RADIUS: 11,
  BALL_RADIUS: 9,
  /** Vertical distance between two layers. */
  LAYER_HEIGHT: 56,
  /** Top padding inside the pinboard before the first layer. */
  LAYER_TOP_PADDING: 30,

  /* Physics */
  GRAVITY: 1400,
  RESTITUTION_PEG: 0.55,
  RESTITUTION_BUMPER: 1.05,
  WALL_RESTITUTION: 0.7,
  /** Horizontal velocity multiplier when a ball contacts a floor surface. */
  FLOOR_FRICTION: 0.4,
  MAX_VELOCITY: 1200,
  /** Max simulation step (s); avoids tunneling on tab refocus. */
  MAX_STEP: 1 / 60,
  /** Sub-steps per frame for collision stability. */
  SUBSTEPS: 3,

  /* Scoring */
  SCORE_PEG: 1,
  SCORE_BUMPER: 10,

  /* Currency */
  /** Coins awarded when a ball touches a coin peg. */
  COIN_VALUE: 5,
  /** Probability a filled slot becomes a coin peg (independent of bumper roll). */
  COIN_CHANCE_BASE: 0.04,
  /** How long (ms) a ball must be stationary before its blocker is removed. */
  STUCK_TIMEOUT_MS: 3000,

  /** Points deducted when a ball lands in the malus gate. */
  MALUS_POINTS: 10,

  /* Collection gates — 5 equal-width zones (sum = 1). */
  GATE_WIDTHS: { recycle: 0.20, x2: 0.20, x10: 0.20, x5: 0.20, malus: 0.20 },
  GATE_ORDER: ["recycle", "x2", "x10", "x5", "malus"],
};

// ─── Level definitions ────────────────────────────────────────────────────

/** @type {Array<{ id: number, target: number }>} */
export const LEVELS = [
  { id: 1, target: 100 },
  { id: 2, target: 300 },
  { id: 3, target: 600 },
  { id: 4, target: 1000 },
  { id: 5, target: 1500 },
  { id: 6, target: 2200 },
  { id: 7, target: 3000 },
  { id: 8, target: 4000 },
  { id: 9, target: 5200 },
  { id: 10, target: 6500 },
  { id: 11, target: 8000 },
  { id: 12, target: 10000 },
  { id: 13, target: 12500 },
  { id: 14, target: 15500 },
  { id: 15, target: 19000 },
  { id: 16, target: 23000 },
  { id: 17, target: 28000 },
  { id: 18, target: 34000 },
  { id: 19, target: 41000 },
  { id: 20, target: 50000 },
];
