import Phaser from 'phaser';
import { SCENE_KEYS } from '../configs/constants.js';
import { audioManager } from '../managers/audio-manager.js';
import { i18n } from '../managers/i18n-manager.js';
import { ListenerBag } from '../utils/listener-bag.js';

/**
 * Title scene — renders the game name and a "tap to start" prompt. The
 * first user gesture unlocks audio and transitions to GameScene. Keep it
 * thin: branding/animation should live in CSS.
 *
 * DOM content is mounted directly on `#game-container` (not via Phaser's
 * DOM element system) so `position: absolute; inset: 0` resolves against
 * the true viewport without transform interference.
 */
export class TitleScene extends Phaser.Scene {
  /** @type {HTMLElement | null} */
  #el = null;

  /** @type {ListenerBag} */
  #bag = new ListenerBag();

  /** @type {boolean} */
  #transitioning = false;

  constructor() {
    super({ key: SCENE_KEYS.TITLE });
  }

  create() {
    this.#el = document.createElement('div');
    this.#el.className = 'gt-scene-center';
    this.#el.innerHTML = `
      <div class="gt-title">
        <h1 class="gt-title-name">${i18n.t('app.name')}</h1>
        <p class="gt-title-hint">${i18n.t('title.tap_to_start')}</p>
      </div>
    `;
    document.getElementById('game-container').appendChild(this.#el);

    const onStart = () => {
      if (this.#transitioning) return;
      this.#transitioning = true;
      audioManager.unlock();
      this.scene.start(SCENE_KEYS.GAME);
    };
    this.input.keyboard?.once('keydown', onStart);
    this.input.once('pointerdown', onStart);
    this.#bag.add(() => this.input.keyboard?.off('keydown', onStart));
    this.#bag.add(() => this.input.off('pointerdown', onStart));
    this.#bag.add(i18n.onChange(() => this.#refresh()));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.#shutdown());
  }

  #refresh() {
    if (!this.#el) return;
    const name = this.#el.querySelector('.gt-title-name');
    const hint = this.#el.querySelector('.gt-title-hint');
    if (name) name.textContent = i18n.t('app.name');
    if (hint) hint.textContent = i18n.t('title.tap_to_start');
  }

  #shutdown() {
    this.#bag.dispose();
    this.#el?.remove();
    this.#el = null;
  }
}
