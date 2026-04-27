import Phaser from 'phaser';
import { SCENE_KEYS } from '../configs/constants.js';
import { GameController } from '../controllers/game-controller.js';

/**
 * GameScene — the main gameplay scene. Stays thin on purpose: every piece of
 * gameplay logic lives in `GameController` (managers + entities). The scene
 * itself only owns the controller's lifecycle.
 *
 * If you find this file growing past ~150 lines, push the new behaviour
 * into a manager or a method on `GameController` instead.
 */
export class GameScene extends Phaser.Scene {
  /** @type {GameController | null} */
  #controller = null;

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  /**
   * @param {{ mode?: string, slotData?: object }} [data]
   */
  create(data = {}) {
    this.#controller = new GameController(this, data);
    this.#controller.start();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.#controller?.destroy());
  }
}
