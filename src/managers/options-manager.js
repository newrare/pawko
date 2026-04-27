import { STORAGE_KEYS, DEFAULT_OPTIONS } from '../configs/constants.js';
import { EventEmitter } from '../utils/event-emitter.js';

/**
 * OptionsManager — single source of truth for user preferences persisted in
 * `STORAGE_KEYS.OPTIONS` (music, sound, animSkip, …). Side-effect-free: side-
 * effecting managers (audio, theme) read/write through this singleton but
 * keep their own reactions (pause/resume music, etc.) wired via `onChange`.
 */
class OptionsManager extends EventEmitter {
  #options = { ...DEFAULT_OPTIONS };

  constructor() {
    super();
    this.#load();
  }

  /**
   * @template {keyof typeof DEFAULT_OPTIONS} K
   * @param {K} key
   * @returns {(typeof DEFAULT_OPTIONS)[K]}
   */
  get(key) {
    return this.#options[key];
  }

  /**
   * @template {keyof typeof DEFAULT_OPTIONS} K
   * @param {K} key
   * @param {(typeof DEFAULT_OPTIONS)[K]} value
   */
  set(key, value) {
    if (this.#options[key] === value) return;
    this.#options[key] = value;
    this.#save();
    this.emit('change', key, value);
    this.emit(`change:${key}`, value);
  }

  /** Subscribe to any option change. */
  onChange(callback) {
    return this.on('change', callback);
  }

  // ─── Convenience accessors ───────────────────────────

  get musicEnabled() {
    return this.#options.music;
  }

  get soundEnabled() {
    return this.#options.sound;
  }

  /** True when swipes may interrupt ongoing animations. */
  get animSkipEnabled() {
    return this.#options.animSkip;
  }

  // ─── Persistence ─────────────────────────────────────

  #load() {
    const raw = localStorage.getItem(STORAGE_KEYS.OPTIONS);
    if (!raw) return;
    try {
      Object.assign(this.#options, JSON.parse(raw));
    } catch {
      /* ignore malformed payload */
    }
  }

  #save() {
    localStorage.setItem(STORAGE_KEYS.OPTIONS, JSON.stringify(this.#options));
  }

  /** @internal — for tests */
  _resetForTests() {
    this.#options = { ...DEFAULT_OPTIONS };
    localStorage.removeItem(STORAGE_KEYS.OPTIONS);
    this.clear();
  }
}

export const optionsManager = new OptionsManager();
