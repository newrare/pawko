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
  BONUSES: `${NS}.bonuses`,
  COINS: `${NS}.coins`,
};

export const MAX_SAVE_SLOTS = 8;

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

  /* Round limits */
  MAX_LEVEL: 200,
  /** Layers visible on screen at once; older ones scroll off the bottom. */
  VISIBLE_LAYERS: 10,

  /* Launch zone */
  SUBLAUNCH_COUNT: 3,
  MAX_SUBLAUNCHES: 10,
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
  /** Time before camera rises after a new layer is added. */
  CAMERA_RISE_DELAY_MS: 600,
  /** Visual fall animation for a freshly added layer (also lock-out time). */
  LAYER_FALL_MS: 500,

  /* Physics */
  GRAVITY: 1400,
  RESTITUTION_PEG: 0.55,
  RESTITUTION_BUMPER: 1.05,
  WALL_RESTITUTION: 0.7,
  MAX_VELOCITY: 1200,
  /** Max simulation step (s); avoids tunneling on tab refocus. */
  MAX_STEP: 1 / 60,
  /** Sub-steps per frame for collision stability. */
  SUBSTEPS: 3,

  /* Coin peg */
  COIN_PEG_RADIUS: 9,
  RESTITUTION_COIN: 0.55,
  SCORE_COIN: 0,

  /* Shop peg */
  SHOP_PEG_RADIUS: 12,
  RESTITUTION_SHOP_PEG: 0.65,
  /** Probability that a layer contains a shop peg. */
  SHOP_PEG_CHANCE: 0.40,
  /** Duration of the coin-fly-to-chest animation (ms). */
  COIN_FLY_DURATION_MS: 600,
  /** Shop-peg magnet: attraction force (px/s²) when unlocked. */
  SHOP_MAGNET_FORCE: 800,
  /** Shop-peg magnet: range in CSS px. */
  SHOP_MAGNET_RANGE: 80,

  /* Scoring */
  SCORE_PEG: 1,
  SCORE_BUMPER: 10,
  /** Bonus points when a stuck peg is auto-destroyed to free a ball. */
  SCORE_STUCK_DESTROY: 50,
  /** How long (ms) a ball must be stationary before its blocker is removed. */
  STUCK_TIMEOUT_MS: 3000,

  /* Collection gates — fractions of pinboard width (sum = 1).
     Shop is intentionally narrow (2%) to make it a rare landing spot. */
  GATE_WIDTHS: { save: 0.25, recycle: 0.48, shop: 0.02, drain: 0.25 },

  /** Number of hits needed to thaw a frozen peg. */
  ICE_HITS_TO_THAW: 3,

  /* Glass ball */
  /** Total peg hits before a glass ball shatters. */
  GLASS_BALL_MAX_HITS: 10,
  /** How many hits before the end show visible cracks (last N hits). */
  GLASS_BALL_CRACK_THRESHOLD: 5,
};

export const PLINKO_RANKING_MODE = "plinko";

// ─── Shop peg rarities ─────────────────────────────────────────────────────

/**
 * Each rarity defines how many hits are needed to destroy the peg and its
 * spawn weight (relative probability when a shop peg is generated).
 * Higher rarity = more hits required, rarer spawn, better bonus pool.
 *
 * @type {Record<string, { hitsRequired: number, weight: number }>}
 */
export const SHOP_PEG_RARITIES = {
  common:    { hitsRequired: 2,  weight: 60 },
  rare:      { hitsRequired: 4,  weight: 28 },
  epic:      { hitsRequired: 7,  weight: 10 },
  legendary: { hitsRequired: 12, weight: 2  },
};

// ─── Shop prices (coins) ──────────────────────────────────────────────────

export const SHOP_PRICES = {
  BALL: 10,
  SUBLAUNCH: 20,
  SESSION_BONUS: 12,
};

/** Default duration (in levels) for session bonuses without an explicit value. */
export const SESSION_BONUS_DEFAULT_DURATION = 5;
