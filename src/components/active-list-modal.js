import { BaseModal } from "./modal-base.js";
import { buttonHtml } from "./ui/button.js";
import { i18n } from "../managers/i18n-manager.js";
import { bonusManager } from "../managers/bonus-manager.js";
import { abilityManager } from "../managers/ability-manager.js";
import { pegShopManager } from "../managers/peg-shop-manager.js";
import { findPegShopItem } from "../configs/peg-shop-defs.js";
import { BONUS_CATEGORIES } from "../configs/bonus-defs.js";
import { iconSvg } from "../utils/icon.js";

/**
 * ActiveListModal — lists the run's active rewards, boutique pegs and the
 * player's unlocked abilities. Opened from the HUD top-right button.
 */
export class ActiveListModal extends BaseModal {
  get title() {
    return i18n.t("hud.active_list.title");
  }

  onMount() {
    this.bag.add(bonusManager.on("change", () => this.refresh()));
    this.bag.add(abilityManager.on("change", () => this.refresh()));
    this.bag.add(pegShopManager.on("change", () => this.refresh()));
  }

  renderBody() {
    const sections = [];

    /* --- Active rewards (bonuses + maluses) --- */
    const rewards = bonusManager.getActiveSession();
    const pegTypes = pegShopManager.getAcquired();

    if (rewards.length > 0 || pegTypes.length > 0) {
      let rows = "";
      for (const type of pegTypes) {
        const def = findPegShopItem(type);
        const name = i18n.t(`peg_shop.${type}`);
        rows += `<tr><td class="pk-al-icon">${iconSvg(def?.icon ?? "infinity")}</td><td class="pk-al-name">${name}</td><td class="pk-al-desc">${i18n.t("hud.active_list.boutique_run")}</td></tr>`;
      }
      const remainingKeyByUnit = {
        level: "hud.active_list.remaining",
        shop: "hud.active_list.remaining_shops",
        mystery: "hud.active_list.remaining_mysteries",
      };
      for (const { id, remaining, unit, def } of rewards) {
        const isMalus = def.category === BONUS_CATEGORIES.MALUS;
        const key = isMalus ? `bonus.malus.${id}` : `bonus.reward.${id}`;
        const name = i18n.t(key);
        const desc = i18n.t(`${key}.desc`);
        const remLabel = Number.isFinite(remaining)
          ? i18n.t(remainingKeyByUnit[unit] ?? "hud.active_list.remaining", {
              n: remaining,
            })
          : i18n.t("hud.active_list.run_scoped");
        rows += `<tr><td class="pk-al-icon">${iconSvg(def.icon ?? "hourglass")}</td><td class="pk-al-name">${name}</td><td class="pk-al-desc">${desc}<br><small>${remLabel}</small></td></tr>`;
      }

      sections.push(`
        <h3 class="pk-al-section-title">${i18n.t("hud.active_list.bonuses")}</h3>
        <table class="pk-al-table"><tbody>${rows}</tbody></table>
      `);
    }

    /* --- Unlocked abilities --- */
    const unlockedAbilities = abilityManager.getUnlocked();
    if (unlockedAbilities.length > 0) {
      let rows = "";
      for (const id of unlockedAbilities) {
        const name = i18n.t(`ability.${id}`);
        const desc = i18n.t(`ability.${id}.desc`);
        rows += `<tr><td class="pk-al-icon">${iconSvg("zap")}</td><td class="pk-al-name">${name}</td><td class="pk-al-desc">${desc}</td></tr>`;
      }
      sections.push(`
        <h3 class="pk-al-section-title">${i18n.t("hud.active_list.abilities")}</h3>
        <table class="pk-al-table"><tbody>${rows}</tbody></table>
      `);
    }

    if (sections.length === 0) {
      sections.push(
        `<p class="pk-al-empty">${i18n.t("hud.active_list.empty")}</p>`,
      );
    }

    sections.push(
      buttonHtml({
        action: "close",
        label: i18n.t("menu.close"),
        variant: "ghost",
      }),
    );

    return `<div class="gt-stack">${sections.join("")}</div>`;
  }
}
