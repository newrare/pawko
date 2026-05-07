import { i18n } from "../managers/i18n-manager.js";
import { saveManager } from "../managers/save-manager.js";
import { currencyManager } from "../managers/currency-manager.js";
import { LEVELS } from "../configs/constants.js";
import { ListenerBag } from "../utils/listener-bag.js";
import { GameScene } from "./game-scene.js";
import { ShopScene } from "./shop-scene.js";
import { AbilityScene } from "./ability-scene.js";

/**
 * Level selector — displays a grid of 20 levels. Levels unlock sequentially.
 * Clicking an available level starts GameScene with that level's config.
 */
export class LevelSelectorScene {
  /** @type {import('./scene-router.js').SceneRouter} */
  #router;

  /** @type {HTMLElement | null} */
  #el = null;

  /** @type {ListenerBag} */
  #bag = new ListenerBag();

  /** @param {import('./scene-router.js').SceneRouter} router */
  constructor(router) {
    this.#router = router;
  }

  /** @param {HTMLElement} root */
  mount(root) {
    this.#el = document.createElement("div");
    this.#el.className = "gt-scene-center pk-level-selector";
    this.#el.innerHTML = this.#render();
    root.appendChild(this.#el);

    this.#bag.on(this.#el, "click", (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      const action = target.closest("[data-action]");
      if (action) {
        const name = /** @type {HTMLElement} */ (action).dataset.action;
        if (name === "open-shop") this.#router.start(ShopScene);
        else if (name === "open-ability") this.#router.start(AbilityScene);
        return;
      }
      const btn = target.closest(".pk-level-btn:not(.pk-level-btn--locked)");
      if (!btn) return;
      const levelId = Number(btn.dataset.level);
      if (!levelId) return;
      this.#router.start(GameScene, { levelId });
    });

    this.#bag.add(i18n.onChange(() => this.#refresh()));
    this.#bag.add(currencyManager.on("change", () => this.#refresh()));
  }

  #render() {
    const progress = saveManager.loadLevelProgress();
    const completed = progress?.completed ?? [];

    let grid = "";
    for (const level of LEVELS) {
      const done = completed.includes(level.id);
      const unlocked = level.id === 1 || completed.includes(level.id - 1);
      let cls = "pk-level-btn";
      if (done) cls += " pk-level-btn--completed";
      else if (!unlocked) cls += " pk-level-btn--locked";

      grid += `
        <button class="${cls}" data-level="${level.id}">
          <span class="pk-level-btn-num">${level.id}</span>
          <span class="pk-level-btn-target">${level.target}</span>
          ${done ? '<span class="pk-level-btn-check">✓</span>' : ""}
        </button>
      `;
    }

    return `
      <h1 class="pk-level-selector-title">${i18n.t("level_selector.title")}</h1>
      <div class="pk-level-meta">
        <span class="pk-coin-balance" aria-label="${i18n.t("currency.label")}">
          🪙 <b>${currencyManager.get()}</b>
        </span>
      </div>
      <div class="pk-level-grid">${grid}</div>
      <div class="pk-level-actions">
        <button class="gt-btn gt-btn--secondary" data-action="open-shop">
          <span class="gt-btn-label">${i18n.t("shop.title")}</span>
        </button>
        <button class="gt-btn gt-btn--secondary" data-action="open-ability">
          <span class="gt-btn-label">${i18n.t("ability.title")}</span>
        </button>
      </div>
    `;
  }

  #refresh() {
    if (!this.#el) return;
    this.#el.innerHTML = this.#render();
  }

  destroy() {
    this.#bag.dispose();
    this.#el?.remove();
    this.#el = null;
  }
}
