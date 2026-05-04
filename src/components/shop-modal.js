import { BaseModal } from "./modal-base.js";
import { buttonHtml } from "./ui/button.js";
import { i18n } from "../managers/i18n-manager.js";

/**
 * Shop modal — presented when a ball lands in the shop gate (once per level).
 * Offers 3 dynamic choices with coin prices.
 */
export class ShopModal extends BaseModal {
  /**
   * @param {object} options
   * @param {Array<{ id: string, action: string, label: string, icon: string, price?: number, bonusDef?: object }>} options.choices
   * @param {number} [options.coins]
   * @param {(choice: { id: string, action: string, price?: number, bonusDef?: object }) => void} options.onChoice
   */
  constructor(options) {
    super({
      ...options,
      className: "gt-modal-overlay gt-modal-overlay--shop",
      closeOnBackdrop: false,
      closeOnEscape: false,
    });
  }

  get title() {
    return i18n.t("shop.title");
  }

  renderBody() {
    const choices = this.options.choices || [];
    const coins = this.options.coins ?? 0;
    const btns = choices
      .map((c) => {
        const affordable = coins >= (c.price ?? 0);
        const priceTag = c.price != null ? ` (${c.price} $)` : "";
        const label = `${c.icon} ${i18n.t(c.label)}${priceTag}`;
        return buttonHtml({ action: c.id, label, variant: "primary", disabled: !affordable });
      })
      .join("");
    return `
      <div class="gt-stack gt-shop">
        <p class="gt-shop-intro">${i18n.t("shop.intro")}</p>
        <p class="gt-shop-coins">$ ${coins}</p>
        <div class="gt-shop-choices">${btns}</div>
        <div class="gt-shop-skip">${buttonHtml({ action: "skip", label: i18n.t("shop.skip"), variant: "ghost" })}</div>
      </div>
    `;
  }

  onAction(action) {
    if (action === "skip") {
      this.destroy();
      return;
    }
    const choices = this.options.choices || [];
    const choice = choices.find((c) => c.id === action);
    if (choice) {
      this.options.onChoice?.(choice);
      this.destroy();
    }
  }
}
