import { i18n } from "../managers/i18n-manager.js";
import { currencyManager } from "../managers/currency-manager.js";
import { abilityManager } from "../managers/ability-manager.js";
import { ListenerBag } from "../utils/listener-bag.js";
import { LevelSelectorScene } from "./level-selector-scene.js";

/**
 * Ability scene — persistent unlock tree paid in coins.
 *
 * Each ability is bought once. Owned abilities are checked and
 * disabled. Locked abilities the player cannot afford are dimmed.
 *
 * Reachable from the Ability button on the Level Selector scene.
 */
export class AbilityScene {
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
    this.#el.className = "gt-scene-center pk-ability";
    this.#el.innerHTML = this.#render();
    root.appendChild(this.#el);

    this.#bag.on(this.#el, "click", this.#onClick);
    this.#bag.add(i18n.onChange(() => this.#refresh()));
    this.#bag.add(currencyManager.on("change", () => this.#refresh()));
    this.#bag.add(abilityManager.on("change", () => this.#refresh()));
  }

  #onClick = (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const action = target.closest("[data-action]");
    if (!action) return;
    const name = /** @type {HTMLElement} */ (action).dataset.action;
    if (name === "back") {
      this.#router.start(LevelSelectorScene);
      return;
    }
    if (name?.startsWith("unlock:")) {
      this.#tryUnlock(name.slice(7));
    }
  };

  /** @param {string} id */
  #tryUnlock(id) {
    const def = abilityManager.getAll().find((a) => a.id === id);
    if (!def) return;
    if (abilityManager.isUnlocked(id)) return;
    if (!currencyManager.spend(def.cost)) return;
    abilityManager.unlock(id);
  }

  #render() {
    const coins = currencyManager.get();
    const rows = abilityManager
      .getAll()
      .map((a) => this.#renderRow(a))
      .join("");

    return `
      <h1 class="pk-ability-title">${i18n.t("ability.title")}</h1>
      <p class="pk-ability-coins"><img src="images/coin.png" class="pk-coin-icon" alt="" /> <b>${coins}</b></p>
      <div class="pk-ability-list">${rows}</div>
      <button class="gt-btn gt-btn--ghost pk-ability-back" data-action="back">
        <span class="gt-btn-label">${i18n.t("menu.back")}</span>
      </button>
    `;
  }

  /** @param {import('../configs/ability-defs.js').AbilityDef} a */
  #renderRow(a) {
    const owned = abilityManager.isUnlocked(a.id);
    const canAfford = currencyManager.get() >= a.cost;
    const btnLabel = owned ? "✓" : `${a.cost} <img src="images/coin.png" class="pk-coin-icon" alt="" />`;
    const btnAttrs = owned || !canAfford ? "disabled" : "";
    return `
      <div class="pk-ability-row${owned ? " is-owned" : ""}">
        <div class="pk-ability-row-head">
          <span class="pk-ability-row-name">${i18n.t(`ability.${a.id}`)}</span>
        </div>
        <p class="pk-ability-row-desc">${i18n.t(`ability.${a.id}.desc`)}</p>
        <button class="gt-btn gt-btn--primary pk-ability-row-buy"
                data-action="unlock:${a.id}" ${btnAttrs}>
          <span class="gt-btn-label">${btnLabel}</span>
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
