import { audioManager } from "../managers/audio-manager.js";
import { i18n } from "../managers/i18n-manager.js";
import { ListenerBag } from "../utils/listener-bag.js";
import { SlowFloatBackground } from "../utils/slow-float-background.js";
import { LevelSelectorScene } from "./level-selector-scene.js";

/**
 * Title scene — renders the game name for 3 seconds then auto-transitions
 * to the level selector.
 */
export class TitleScene {
  /** No HUD buttons on the title screen. */
  static hideHud = true;
  /** @type {import('./scene-router.js').SceneRouter} */
  #router;

  /** @type {HTMLElement | null} */
  #el = null;

  /** @type {ListenerBag} */
  #bag = new ListenerBag();

  /** @type {SlowFloatBackground | null} */
  #bg = null;

  /** @type {boolean} */
  #transitioning = false;

  /** @param {import('./scene-router.js').SceneRouter} router */
  constructor(router) {
    this.#router = router;
  }

  /** @param {HTMLElement} root */
  mount(root) {
    this.#bg = new SlowFloatBackground(root);
    this.#bag.add(() => this.#bg?.destroy());

    this.#el = document.createElement("div");
    this.#el.className = "gt-scene-center";
    this.#el.innerHTML = this.#renderInner();
    root.appendChild(this.#el);

    this.#bag.on(this.#el, "pointerdown", () => audioManager.unlock(), {
      once: true,
    });

    this.#bag.timeout(() => {
      if (this.#transitioning) return;
      this.#transitioning = true;
      audioManager.unlock();
      this.#router.start(LevelSelectorScene);
    }, 3000);

    this.#bag.add(i18n.onChange(() => this.#refresh()));
  }

  #renderInner() {
    return `
      <div class="gt-title">
        <h1 class="gt-title-name">${i18n.t("app.name")}</h1>
        <img class="gt-title-image" src="/images/title.png" alt="Pawko" />
      </div>
    `;
  }

  #refresh() {
    if (!this.#el) return;
    const name = this.#el.querySelector(".gt-title-name");
    if (name) name.textContent = i18n.t("app.name");
  }

  destroy() {
    this.#bag.dispose();
    this.#el?.remove();
    this.#el = null;
  }
}
