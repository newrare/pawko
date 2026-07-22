import { BaseModal } from "./modal-base.js";
import { i18n } from "../managers/i18n-manager.js";
import { iconSvg } from "../utils/icon.js";
import { BONUS_CATEGORIES } from "../configs/bonus-defs.js";
import { MYSTERY_CHOICE_TYPES } from "../utils/mystery-choice.js";

/**
 * MysteryChoiceModal — the forced-choice reward picker shown when the player
 * lands on a mystery cell on the map.
 *
 * Presents the choices built by `buildMysteryChoices()` as a row of
 * item-highlight cards (the `.pk-featured` treatment from the style guide,
 * gated per rarity in `mystery-choice.css`):
 *   - legendary — gold, shimmer + ping radar
 *   - epic      — crimson, shimmer
 *   - rare      — rose
 *   - common    — rose-muted
 *   - malus     — background (dark), static — a negative reward
 *
 * The player MUST pick one card: backdrop and Escape closes are disabled.
 * Clicking a card invokes `onChoose(choice)` then tears the modal down.
 */
export class MysteryChoiceModal extends BaseModal {
  /** @type {import('../utils/mystery-choice.js').MysteryChoice[]} */
  #choices;

  /** @type {((choice: object) => void) | undefined} */
  #onChoose;

  /**
   * @param {object} [options]
   * @param {import('../utils/mystery-choice.js').MysteryChoice[]} [options.choices]
   * @param {(choice: object) => void} [options.onChoose]
   */
  constructor(options = {}) {
    super({
      closeOnBackdrop: false,
      closeOnEscape: false,
      className: "pk-mystery-modal",
      ...options,
    });
    this.#choices = options.choices ?? [];
    this.#onChoose = options.onChoose;
  }

  get title() {
    return i18n.t("mystery_choice.title");
  }

  renderBody() {
    const cards = this.#choices
      .map((choice, index) => this.#renderCard(choice, index))
      .join("");
    return `
      <p class="pk-mystery-modal-sub">${i18n.t("mystery_choice.subtitle")}</p>
      <div class="pk-mystery-cards">${cards}</div>
    `;
  }

  /**
   * @param {import('../utils/mystery-choice.js').MysteryChoice} choice
   * @param {number} index
   */
  #renderCard(choice, index) {
    const { rarity } = choice;
    let title;
    let icon;
    let desc;

    if (choice.type === MYSTERY_CHOICE_TYPES.BONUS) {
      const isMalus = choice.def.category === BONUS_CATEGORIES.MALUS;
      const key = isMalus
        ? `bonus.malus.${choice.def.id}`
        : `bonus.reward.${choice.def.id}`;
      title = i18n.t(key);
      icon = choice.def.icon ?? "sparkles";
      desc = i18n.t(`${key}.desc`);
    } else {
      icon = choice.currency === "coins" ? "coins" : "gem";
      title = i18n.t(`mystery_choice.currency.${choice.currency}`, {
        n: choice.amount,
      });
      desc = i18n.t(`mystery_choice.currency.${choice.currency}.desc`, {
        n: choice.amount,
      });
    }

    return `
      <button type="button"
              class="pk-mystery-card pk-mystery-card--${rarity} gt-clickable"
              data-action="choose" data-index="${index}">
        <span class="pk-mystery-card-title">${title}</span>
        <span class="pk-mystery-card-icon pk-featured">
          <span class="pk-featured-surface">${iconSvg(icon)}</span>
        </span>
        <span class="pk-mystery-card-desc">${desc}</span>
      </button>
    `;
  }

  /**
   * @param {string} action
   * @param {Event} event
   */
  onAction(action, event) {
    if (action !== "choose") return;
    const target = /** @type {HTMLElement} */ (event.target);
    const el = target.closest("[data-index]");
    const index = Number(/** @type {HTMLElement} */ (el)?.dataset.index);
    if (Number.isNaN(index)) return;
    const choice = this.#choices[index];
    if (!choice) return;
    this.#onChoose?.(choice);
    this.destroy();
  }
}
