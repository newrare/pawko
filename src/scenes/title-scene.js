import { audioManager } from "../managers/audio-manager.js";
import { i18n } from "../managers/i18n-manager.js";
import { ListenerBag } from "../utils/listener-bag.js";
import { GameScene } from "./game-scene.js";

/**
 * Title scene — renders the game name and a "tap to start" prompt. The
 * first user gesture unlocks audio and transitions to GameScene.
 */
export class TitleScene {
  /** @type {import('./scene-router.js').SceneRouter} */
  #router;

  /** @type {HTMLElement | null} */
  #el = null;

  /** @type {ListenerBag} */
  #bag = new ListenerBag();

  /** @type {boolean} */
  #transitioning = false;

  /** @param {import('./scene-router.js').SceneRouter} router */
  constructor(router) {
    this.#router = router;
  }

  /** @param {HTMLElement} root */
  mount(root) {
    this.#el = document.createElement("div");
    this.#el.className = "gt-scene-center";
    this.#el.innerHTML = this.#renderInner();
    root.appendChild(this.#el);

    const onStart = () => {
      if (this.#transitioning) return;
      this.#transitioning = true;
      audioManager.unlock();
      this.#router.start(GameScene);
    };
    this.#bag.on(window, "keydown", onStart, { once: true });
    this.#bag.on(this.#el, "pointerdown", onStart, { once: true });
    this.#bag.add(i18n.onChange(() => this.#refresh()));
  }

  #renderInner() {
    return `
      <div class="gt-title">
        <h1 class="gt-title-name">${i18n.t("app.name")}</h1>
        <p class="gt-title-hint">${i18n.t("title.tap_to_start")}</p>
      </div>
    `;
  }

  #refresh() {
    if (!this.#el) return;
    const name = this.#el.querySelector(".gt-title-name");
    const hint = this.#el.querySelector(".gt-title-hint");
    if (name) name.textContent = i18n.t("app.name");
    if (hint) hint.textContent = i18n.t("title.tap_to_start");
  }

  destroy() {
    this.#bag.dispose();
    this.#el?.remove();
    this.#el = null;
  }
}
