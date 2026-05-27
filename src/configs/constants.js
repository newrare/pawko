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
  INITIAL_LAYERS: 9,

  /* Launch zone */
  /** Tower-defense ball-count scaling per level: base + step * levelId.
     Level 1 → 20, level 2 → 30, level 3 → 40, etc. */
  BALLS_LEVEL_BASE: 10,
  BALLS_LEVEL_STEP: 10,
  /** Delay between consecutive ball drops from the same sublaunch. */
  LAUNCH_DELAY_MS: 80,
  /** Anti-loop cap on how many times a ball may go through the recycle gate. */
  MAX_RECYCLES: 8,

  /* Player HP — tower-defense mode. Player loses 1 HP per ball reaching
     the central gate; round ends when HP reaches 0. */
  PLAYER_MAX_HP: 20,

  /* Pinboard sizing (CSS px). Pegs/bumpers/balls share the pinboard
     coordinate space (origin = pinboard top-left). */
  PEG_RADIUS: 10,
  BUMPER_RADIUS: 10,
  BALL_RADIUS: 9,
  /** Vertical distance between two layers. */
  LAYER_HEIGHT: 56,
  /** Top padding inside the pinboard before the first layer. */
  LAYER_TOP_PADDING: 30,
  /** Distance (px) from the pinboard top to the target dashed line.
     Defines the empty zone reserved for the objective label and caps the
     gauge fill so its top edge meets the target line at 100%. */
  TARGET_LINE_OFFSET: 20,
  /* Physics */
  GRAVITY: 600,
  RESTITUTION_PEG: 0.40,
  RESTITUTION_BUMPER: 1.00,
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

  /* Collection gates — 5 equal-width zones (sum = 1). Tower-defense mode:
     teleport_left | destroy_left | hp | destroy_right | teleport_right */
  GATE_WIDTHS: {
    teleport_left: 0.20,
    destroy_left: 0.20,
    hp: 0.20,
    destroy_right: 0.20,
    teleport_right: 0.20,
  },
  GATE_ORDER: ["teleport_left", "destroy_left", "hp", "destroy_right", "teleport_right"],

  /** Coins gained per HP point of a ball that lands in a destroy gate. */
  DESTROY_COIN_PER_HP: 1,
  /** Damage dealt to the player when a ball reaches the central HP gate. */
  HP_GATE_DAMAGE: 1,

  /* Shield peg */
  SHIELD_MAX_HITS: 5,
  SHIELD_COOLDOWN_MS: 5000,
  SHIELD_RADIUS_MULTIPLIER: 3,
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
 * Layers spawn classic pegs only; the player replaces them via the radial peg menu.
 * @type {Record<string, { hp: number }>}
 */
export const PEG_DEFS = {
  peg: { hp: 10 },
  bumper: { hp: 10 },
  coin: { hp: 10 },
  diamond: { hp: 10 },
  glue: { hp: 10 },
  teleport: { hp: 10 },
  chest: { hp: 10 },
  shield: { hp: 10 },
  mystery: { hp: 10 },
  fire: { hp: 10 },
  ice: { hp: 10 },
  electrical: { hp: 10 },
  black: { hp: 10 },
  bomb: { hp: 10 },
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

/**
 * Cost (in coins) to replace a classic peg with a special peg type via
 * the radial peg menu. Pegs not listed here are not replaceable.
 * @type {Record<string, number>}
 */
export const PEG_REPLACE_COSTS = {
  fire: 50,
  ice: 50,
  electrical: 75,
  black: 100,
  bomb: 80,
  glue: 30,
  teleport: 60,
  shield: 40,
};

