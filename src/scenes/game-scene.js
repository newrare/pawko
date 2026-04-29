import { GameController } from "../controllers/game-controller.js";

/**
 * GameScene — main gameplay scene. Stays thin on purpose: every piece of
 * gameplay logic lives in `GameController`. The scene owns the controller's
 * lifecycle and gives it a DOM root to attach to.
 *
 * If this file grows past ~150 lines, push the new behaviour into the
 * controller or a new manager instead.
 */
export class GameScene {
  /** @type {import('./scene-router.js').SceneRouter} */
  #router;

  /** @type {object} */
  #data;

  /** @type {GameController | null} */
  #controller = null;

  /**
   * @param {import('./scene-router.js').SceneRouter} router
   * @param {object} [data] — payload forwarded by `router.start`
   */
  constructor(router, data = {}) {
    this.#router = router;
    this.#data = data;
  }

  /** @param {HTMLElement} root */
  mount(root) {
    this.#controller = new GameController({
      root,
      router: this.#router,
      data: this.#data,
    });
    this.#controller.start();
  }

  destroy() {
    this.#controller?.destroy();
    this.#controller = null;
  }
}
