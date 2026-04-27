/**
 * Central configuration constants.
 *
 * Rule: no magic number anywhere in the codebase. Add it here and import it
 * where it is used. CSS variables that depend on layout are pushed by
 * `LayoutManager` rather than hardcoded in stylesheets.
 */

// ─── Game identity ─────────────────────────────────────────────────────────

export const APP_ID = 'game-template';
export const APP_NAME = 'Game Template';
export const APP_VERSION = '0.1.0';

// ─── Orientation ───────────────────────────────────────────────────────────

/**
 * Supported orientations for the game viewport.
 * The `ORIENTATION` constant below is the single source of truth used by
 * `game-config.js` (Phaser scale mode), `LayoutManager` (safe-zone aspect),
 * `index.css` (root data-orientation attribute), and any feature that needs
 * to behave differently in portrait vs. landscape.
 */
export const ORIENTATIONS = /** @type {const} */ ({
  PORTRAIT: 'portrait',
  LANDSCAPE: 'landscape',
});

/** Active orientation for the current game. Change this single line to switch. */
export const ORIENTATION = ORIENTATIONS.LANDSCAPE;

// ─── Scenes ────────────────────────────────────────────────────────────────

export const SCENE_KEYS = /** @type {const} */ ({
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  TITLE: 'TitleScene',
  GAME: 'GameScene',
  /** Dev-only: registered conditionally by game-config.js. */
  STYLEGUIDE: 'StyleguideScene',
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
  MUSIC: 'sounds/music.mp3',
  MUSIC_VOLUME: 0.4,
  SFX_VOLUME: 0.6,
  /** Per-key volume multipliers (applied on top of SFX_VOLUME). */
  SFX_VOLUMES: {
    click: 0.6,
  },
  /** Map of key → asset path. */
  SFX: {
    click: 'sounds/sfx-click.mp3',
  },
};

// ─── Locales ───────────────────────────────────────────────────────────────

export const DEFAULT_LOCALE = 'en';
export const AVAILABLE_LOCALES = ['en', 'fr'];
