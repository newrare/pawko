import { BaseModal } from "./modal-base.js";
import { i18n } from "../managers/i18n-manager.js";
import { powerCardHtml } from "./ui/power-card.js";
import { BONUS_CATEGORIES } from "../configs/bonus-defs.js";
import { MYSTERY_CHOICE_TYPES } from "../utils/mystery-choice.js";

/**
 * Human-readable duration label for a reward definition, reusing the shop
 * duration locale keys where they fit.
 * @param {import('../configs/bonus-defs.js').BonusDef} def
 * @returns {string}
 */
function durationLabelFor(def) {
  if (def.durationRandom) return i18n.t("power_card.duration.random");
  if (def.durationLevels == null) return i18n.t("shop.duration_run");
  return i18n.t("shop.duration_levels", { n: def.durationLevels });
}

/**
 * Map a {@link import('../utils/mystery-choice.js').MysteryChoice} to the
 * localized props consumed by {@link powerCardHtml}. Shared by the modal and
 * the style guide so both render identical cards.
 *
 * @param {import('../utils/mystery-choice.js').MysteryChoice} choice
 * @returns {{ rarity: string, rarityLabel: string, icon: string, title: string, desc: string, stats: Array<{icon: string, label: string, value: string}> }}
 */
export function mysteryChoiceCardProps(choice) {
  const { rarity } = choice;
  let icon;
  let title;
  let desc;
  let typeLabel;
  let durationLabel;

  if (choice.type === MYSTERY_CHOICE_TYPES.BONUS) {
    const isMalus = choice.def.category === BONUS_CATEGORIES.MALUS;
    const key = isMalus
      ? `bonus.malus.${choice.def.id}`
      : `bonus.reward.${choice.def.id}`;
    title = i18n.t(key);
    icon = choice.def.icon ?? "sparkles";
    desc = i18n.t(`${key}.desc`);
    typeLabel = i18n.t(
      isMalus ? "power_card.type.malus" : "power_card.type.bonus",
    );
    durationLabel = durationLabelFor(choice.def);
  } else {
    icon = choice.currency === "coins" ? "coins" : "gem";
    title = i18n.t(`mystery_choice.currency.${choice.currency}`, {
      n: choice.amount,
    });
    desc = i18n.t(`mystery_choice.currency.${choice.currency}.desc`, {
      n: choice.amount,
    });
    typeLabel = i18n.t("power_card.type.loot");
    durationLabel = i18n.t("power_card.duration.instant");
  }

  return {
    rarity,
    rarityLabel: i18n.t(`rarity.${rarity}`),
    icon,
    title,
    desc,
    stats: [
      {
        icon: "hourglass",
        label: i18n.t("power_card.duration"),
        value: durationLabel,
      },
      { icon: "sparkles", label: i18n.t("power_card.type"), value: typeLabel },
    ],
  };
}

/**
 * MysteryChoiceModal — the forced-choice reward picker shown when the player
 * lands on a mystery cell on the map.
 *
 * Presents the choices built by `buildMysteryChoices()` as a row of shared
 * power cards (`powerCardHtml` / `power-card.css`), whose accent and animation
 * are gated per rarity:
 *   - legendary — gold, shimmer + ping radar
 *   - epic      — crimson, shimmer
 *   - rare      — rose
 *   - common    — rose-dim
 *   - malus     — inverted (dark surface), dashed badge — a negative reward
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
    const props = mysteryChoiceCardProps(choice);
    return powerCardHtml({
      ...props,
      action: "choose",
      index,
      ariaLabel: props.title,
    });
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
