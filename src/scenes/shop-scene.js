import { i18n } from "../managers/i18n-manager.js";
import { currencyManager } from "../managers/currency-manager.js";
import { abilityManager } from "../managers/ability-manager.js";
import { bonusManager } from "../managers/bonus-manager.js";
import { ListenerBag } from "../utils/listener-bag.js";
import { BONUS_TYPES } from "../configs/bonus-defs.js";
import { LevelSelectorScene } from "./level-selector-scene.js";

/**
 * Shop scene — buy bonuses (permanent or session) with coins.
 *
 * A bonus appears in the list only if `abilityManager.canBuyBonus(id)`
 * returns true. Permanent bonuses already owned are shown as "Owned"
 * and disabled. Session bonuses can always be (re-)bought when
 * affordable.
 *
 * Reachable from the Shop button on the Level Selector scene.
 */
export class ShopScene {
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
    this.#el.className = "gt-scene-center pk-shop";
    this.#el.innerHTML = this.#render();
    root.appendChild(this.#el);

    this.#bag.on(this.#el, "click", this.#onClick);
    this.#bag.add(i18n.onChange(() => this.#refresh()));
    this.#bag.add(currencyManager.on("change", () => this.#refresh()));
    this.#bag.add(bonusManager.on("change", () => this.#refresh()));
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
    if (name?.startsWith("buy:")) {
      this.#tryBuy(name.slice(4));
    }
  };

  /** @param {string} bonusId */
  #tryBuy(bonusId) {
    const def = bonusManager.getAll().find((b) => b.id === bonusId);
    if (!def) return;
    if (def.type === BONUS_TYPES.PERMANENT && bonusManager.isPermanentUnlocked(def.id)) return;
    if (!abilityManager.canBuyBonus(def.id)) return;
    if (!currencyManager.spend(def.cost)) return;
    if (def.type === BONUS_TYPES.PERMANENT) {
      bonusManager.unlockPermanent(def.id);
    } else {
      bonusManager.activateSession(def.id);
    }
  }

  #render() {
    const coins = currencyManager.get();
    const all = bonusManager.getAll().filter((b) => abilityManager.canBuyBonus(b.id));
    const rows = all.length
      ? all.map((b) => this.#renderRow(b)).join("")
      : `<p class="pk-shop-empty">${i18n.t("shop.empty")}</p>`;

    return `
      <h1 class="pk-shop-title">${i18n.t("shop.title")}</h1>
      <p class="pk-shop-coins">🪙 <b>${coins}</b></p>
      <div class="pk-shop-list">${rows}</div>
      <button class="gt-btn gt-btn--ghost pk-shop-back" data-action="back">
        <span class="gt-btn-label">${i18n.t("menu.back")}</span>
      </button>
    `;
  }

  /** @param {import('../configs/bonus-defs.js').BonusDef} b */
  #renderRow(b) {
    const isPermanent = b.type === BONUS_TYPES.PERMANENT;
    const owned = isPermanent && bonusManager.isPermanentUnlocked(b.id);
    const canAfford = currencyManager.get() >= b.cost;
    const nameKey = isPermanent
      ? `bonus.permanent.${b.id}`
      : `bonus.session.${b.id}`;
    const descKey = `${nameKey}.desc`;
    const tagKey = isPermanent ? "shop.tag.permanent" : "shop.tag.session";
    const btnLabel = owned
      ? i18n.t("shop.owned")
      : `${b.cost} 🪙`;
    const btnAttrs = owned || !canAfford ? "disabled" : "";
    return `
      <div class="pk-shop-row${owned ? " is-owned" : ""}">
        <div class="pk-shop-row-head">
          <span class="pk-shop-row-name">${i18n.t(nameKey)}</span>
          <span class="pk-shop-row-tag">${i18n.t(tagKey)}</span>
        </div>
        <p class="pk-shop-row-desc">${i18n.t(descKey)}</p>
        <button class="gt-btn gt-btn--primary pk-shop-row-buy"
                data-action="buy:${b.id}" ${btnAttrs}>
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
