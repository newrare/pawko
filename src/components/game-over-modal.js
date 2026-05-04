import { BaseModal } from "./modal-base.js";
import { buttonHtml } from "./ui/button.js";
import { i18n } from "../managers/i18n-manager.js";

/**
 * Game over modal — shown when the round ends (no balls left to launch,
 * none in flight, no saved balls). Offers Replay or Back to title.
 */
export class GameOverModal extends BaseModal {
  /**
   * @param {object} options
   * @param {{ level: number, hits: number, saved: number, drained: number }} options.summary
   * @param {boolean} [options.victory] — true when the player hit MAX_LEVEL.
   * @param {() => void} [options.onReplay]
   * @param {() => void} [options.onBack]
   */
  constructor(options) {
    super({
      ...options,
      className: "gt-modal-overlay gt-modal-overlay--gameover",
      closeOnBackdrop: false,
      closeOnEscape: false,
    });
  }

  get title() {
    const k = this.options.victory ? "game.victory.title" : "game.over.title";
    return i18n.t(k, { level: this.options.summary.level });
  }

  renderBody() {
    const { level, hits, saved, drained } = this.options.summary;
    const bodyKey = this.options.victory ? "game.victory.body" : "game.over.body";
    const message = i18n
      .t(bodyKey, { level, hits, saved, drained })
      .split("\n")
      .map((line) => `<p>${line}</p>`)
      .join("");

    return `
      <div class="gt-stack gt-gameover">
        <div class="gt-gameover-art" aria-hidden="true">🐾</div>
        <div class="gt-gameover-message">${message}</div>
        <div class="gt-btn-group">
          ${buttonHtml({ action: "replay", label: i18n.t("game.over.replay") })}
          ${buttonHtml({ action: "back", label: i18n.t("game.over.back"), variant: "secondary" })}
        </div>
      </div>
    `;
  }

  onAction(action) {
    if (action === "replay") {
      this.options.onReplay?.();
      this.destroy();
    } else if (action === "back") {
      this.options.onBack?.();
      this.destroy();
    }
  }
}
