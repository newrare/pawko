import { ListenerBag } from '../utils/listener-bag.js';
import { InputManager } from '../managers/input-manager.js';
import { layout } from '../managers/layout-manager.js';
import { i18n } from '../managers/i18n-manager.js';
import { gameEvents } from '../utils/event-emitter.js';
import { MenuModal } from '../components/menu-modal.js';

/**
 * GameController — orchestrates a play session.
 *
 * The controller owns: input, the menu modal, any future managers (grid,
 * HUD, animation, …). It exposes a tiny API to the scene (start / destroy)
 * and a `ListenerBag` so every callback added here is automatically cleaned
 * up.
 *
 * This file is a *placeholder* in the template — fill in `start()` with the
 * actual gameplay loop for your game. Resist the urge to put logic back in
 * `GameScene`: scenes should stay thin and the controller is the one place
 * that wires managers together.
 */
export class GameController {
  /** @type {Phaser.Scene} */
  #scene;

  /** @type {object} */
  #data;

  /** @type {ListenerBag} */
  #bag = new ListenerBag();

  /** @type {InputManager | null} */
  #input = null;

  /** @type {MenuModal | null} */
  #menu = null;

  /** @type {boolean} */
  #blocked = false;

  /**
   * @param {Phaser.Scene} scene
   * @param {object} [data] — payload forwarded by Phaser on scene.start
   */
  constructor(scene, data = {}) {
    this.#scene = scene;
    this.#data = data;
  }

  /** Boot the play session. */
  start() {
    this.#input = new InputManager(this.#scene, {
      onDirection: (dir) => this.#handleDirection(dir),
      onMenu: () => this.toggleMenu(),
      isBlocked: () => this.#blocked,
    });
    this.#bag.add(() => this.#input?.destroy());

    this.#bag.add(layout.onChange(() => this.#onLayoutChange()));
    this.#bag.add(i18n.onChange(() => this.#onLocaleChange()));

    gameEvents.emit('game:start', this.#data);
  }

  /** Toggle the in-game menu modal. */
  toggleMenu() {
    if (this.#menu) {
      this.#menu.close();
      return;
    }
    this.#menu = new MenuModal(this.#scene, {
      showResume: true,
      onResume: () => {
        this.#blocked = false;
      },
      onClose: () => {
        this.#menu = null;
        this.#blocked = false;
      },
    });
    this.#blocked = true;
    this.#menu.open();
    this.#bag.add(() => this.#menu?.destroy());
  }

  /**
   * @param {'up' | 'down' | 'left' | 'right'} _direction
   */
  #handleDirection(_direction) {
    /* TODO: pass to gameplay logic. */
    gameEvents.emit('input:direction', _direction);
  }

  #onLayoutChange() {
    /* React to viewport changes (reposition HUD, etc.). */
  }

  #onLocaleChange() {
    /* React to locale changes (rebuild any imperatively-rendered text). */
  }

  /** Tear everything down. Idempotent. */
  destroy() {
    this.#bag.dispose();
    this.#input = null;
    this.#menu = null;
    gameEvents.emit('game:end');
  }
}
