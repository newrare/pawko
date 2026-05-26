import { BaseModal } from "./modal-base.js";
import { i18n } from "../managers/i18n-manager.js";
import { buttonHtml } from "./ui/button.js";

/**
 * LevelEndModal — shown at the end of a level (victory or defeat).
 */
export class LevelEndModal extends BaseModal {
  /**
   * @param {{
   *   victory: boolean,
   *   levelId: number,
   *   onContinue?: () => void,
   *   onRetry?: () => void,
   *   onBack?: () => void,
   * }} options
   */
  constructor(options) {
    super({
      ...options,
      closeOnBackdrop: false,
      closeOnEscape: false,
      className: "gt-modal-overlay--level-end",
    });
  }

  get title() {
    return this.options.victory
      ? i18n.t("game.victory.title")
      : i18n.t("game.defeat.title");
  }

  renderBody() {
    const { victory, levelId } = this.options;

    const body = victory
      ? i18n.t("game.victory.body", { level: levelId })
      : i18n.t("game.defeat.body");

    const buttons = victory
      ? buttonHtml({
          action: "continue",
          label: i18n.t("game.victory.continue"),
          variant: "primary",
        })
      : `${buttonHtml({ action: "retry", label: i18n.t("game.defeat.retry"), variant: "primary" })}
         ${buttonHtml({ action: "back", label: i18n.t("game.defeat.back"), variant: "ghost" })}`;

    return `
      <p class="pk-level-end-body">${body.replace(/\n/g, "<br>")}</p>
      <div class="pk-level-end-actions">${buttons}</div>
    `;
  }

  /** @param {string} action */
  onAction(action) {
    if (action === "continue") {
      this.options.onContinue?.();
      this.destroy();
    } else if (action === "retry") {
      this.options.onRetry?.();
      this.destroy();
    } else if (action === "back") {
      this.options.onBack?.();
      this.destroy();
    }
  }
}
