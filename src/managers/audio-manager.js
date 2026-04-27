import { AUDIO } from "../configs/constants.js";
import { optionsManager } from "./options-manager.js";

/**
 * AudioManager — background music and SFX via HTML5 Audio.
 *
 * User toggles live in `optionsManager`; this class only reacts (pause /
 * resume music, gate SFX). Not a Phaser dependency — tests can run in
 * happy-dom without a Phaser game instance.
 */
class AudioManager {
  /** @type {HTMLAudioElement | null} */
  #music = null;

  /** @type {Map<string, HTMLAudioElement>} */
  #sfxPool = new Map();

  /** @type {boolean} True once the user has interacted (autoplay gate). */
  #unlocked = false;

  /** @type {boolean} */
  #preloaded = false;

  /** @type {(() => void) | null} */
  #unsubMusic = null;

  /**
   * Preload music + SFX assets. Safe to call multiple times.
   */
  preload() {
    if (this.#preloaded) return;
    this.#preloaded = true;

    if (AUDIO.MUSIC) {
      this.#music = new Audio(AUDIO.MUSIC);
      this.#music.loop = true;
      this.#music.volume = AUDIO.MUSIC_VOLUME;
      this.#music.preload = "auto";
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.#pauseMusic();
      else if (optionsManager.musicEnabled) this.#resumeMusic();
    });

    for (const [key, path] of Object.entries(AUDIO.SFX)) {
      const audio = new Audio(path);
      audio.preload = "auto";
      audio.volume = Math.min(
        1,
        AUDIO.SFX_VOLUME * (AUDIO.SFX_VOLUMES?.[key] ?? 1),
      );
      this.#sfxPool.set(key, audio);
    }

    /* React to music toggle without each caller having to remember to. */
    this.#unsubMusic = optionsManager.on("change:music", (enabled) => {
      if (enabled) this.#resumeMusic();
      else this.#pauseMusic();
    });
  }

  /**
   * Call from the first user gesture. Browsers gate audio playback until a
   * user interaction has occurred. Also installs a global click-SFX
   * delegate on `.gt-btn` / `.gt-clickable` (skip with `data-no-sfx`).
   */
  unlock() {
    if (this.#unlocked) return;
    this.#unlocked = true;
    if (optionsManager.musicEnabled) this.#resumeMusic();

    const INTERACTIVE = ".gt-btn, .gt-clickable";
    document.addEventListener(
      "pointerdown",
      (e) => {
        const btn = /** @type {HTMLElement | null} */ (e.target)?.closest?.(
          INTERACTIVE,
        );
        if (btn && !btn.hasAttribute("data-no-sfx")) this.playSfx("click");
      },
      true,
    );
  }

  /**
   * Play a sound effect by key.
   * @param {string} key
   */
  playSfx(key) {
    if (!optionsManager.soundEnabled || !this.#unlocked) return;
    const audio = this.#sfxPool.get(key);
    if (!audio) return;
    /* Clone so overlapping plays don't restart the same node mid-flight. */
    const clone = /** @type {HTMLAudioElement} */ (audio.cloneNode());
    clone.volume = audio.volume;
    clone.play().catch(() => {
      /* ignored — autoplay block, decode error */
    });
  }

  stopMusic() {
    if (!this.#music) return;
    this.#music.pause();
    this.#music.currentTime = 0;
  }

  destroy() {
    this.#unsubMusic?.();
    this.#unsubMusic = null;
    this.stopMusic();
    this.#sfxPool.clear();
    this.#preloaded = false;
    this.#unlocked = false;
  }

  // ─── Internals ─────────────────────────────────────

  #resumeMusic() {
    if (!this.#music || !this.#unlocked) return;
    this.#music.play().catch(() => {});
  }

  #pauseMusic() {
    this.#music?.pause();
  }
}

export const audioManager = new AudioManager();
