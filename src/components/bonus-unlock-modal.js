import { BaseModal } from "./modal-base.js";
import { buttonHtml } from "./ui/button.js";
import { i18n } from "../managers/i18n-manager.js";

/**
 * Modal shown when a permanent bonus is unlocked at a level milestone.
 * Displays the bonus icon, name, and description.
 */
export class BonusUnlockModal extends BaseModal {
  /**
   * @param {object} options
   * @param {import('../configs/bonus-defs.js').BonusDef[]} options.bonuses
   */
  constructor(options) {
    super({
      ...options,
      className: "gt-modal-overlay gt-modal-overlay--bonus-unlock",
      closeOnBackdrop: false,
      closeOnEscape: false,
    });
  }

  get title() {
    return i18n.t("bonus.unlock.title");
  }

  renderBody() {
    const bonuses = this.options.bonuses || [];
    const cards = bonuses
      .map(
        (b) => `
        <div class="pk-bonus-card">
          <span class="pk-bonus-card-icon">${b.icon}</span>
          <div class="pk-bonus-card-info">
            <strong class="pk-bonus-card-name">${i18n.t(`bonus.permanent.${b.id}`)}</strong>
            <p class="pk-bonus-card-desc">${i18n.t(`bonus.permanent.${b.id}.desc`)}</p>
          </div>
        </div>`,
      )
      .join("");
    return `
      <div class="gt-stack pk-bonus-unlock">
        ${cards}
        <div class="gt-modal-footer">
          ${buttonHtml({ action: "close", label: i18n.t("common.ok"), variant: "primary" })}
        </div>
      </div>
    `;
  }

  onAction(action) {
    if (action === "close") {
      this.destroy();
    }
  }
}
