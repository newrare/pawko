import { BaseModal } from "./modal-base.js";
import { buttonHtml } from "./ui/button.js";
import { i18n } from "../managers/i18n-manager.js";
import { bonusManager } from "../managers/bonus-manager.js";
import { abilityManager } from "../managers/ability-manager.js";

/**
 * ActiveListModal — lists all currently active bonuses and unlocked abilities.
 * Opened from the HUD top-right button (menu-list).
 */
export class ActiveListModal extends BaseModal {
  get title() {
    return i18n.t("hud.active_list.title");
  }

  onMount() {
    this.bag.add(bonusManager.on("change", () => this.refresh()));
    this.bag.add(abilityManager.on("change", () => this.refresh()));
  }

  renderBody() {
    const sections = [];

    /* --- Active session bonuses --- */
    const sessionBonuses = bonusManager.getActiveSession();
    const permanentIds = bonusManager.getUnlockedPermanent();

    if (sessionBonuses.length > 0 || permanentIds.length > 0) {
      let rows = "";
      for (const id of permanentIds) {
        const key = `bonus.permanent.${id}`;
        const name = i18n.t(key);
        const desc = i18n.t(`${key}.desc`);
        rows += `<tr><td class="pk-al-icon">∞</td><td class="pk-al-name">${name}</td><td class="pk-al-desc">${desc}</td></tr>`;
      }
      for (const { id, remaining, def } of sessionBonuses) {
        const key = `bonus.session.${id}`;
        const name = i18n.t(key);
        const desc = i18n.t(`${key}.desc`);
        rows += `<tr><td class="pk-al-icon">${def.icon ?? "⏳"}</td><td class="pk-al-name">${name}</td><td class="pk-al-desc">${desc}<br><small>${i18n.t("hud.active_list.remaining", { n: remaining })}</small></td></tr>`;
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
        rows += `<tr><td class="pk-al-icon">⚡</td><td class="pk-al-name">${name}</td><td class="pk-al-desc">${desc}</td></tr>`;
      }
      sections.push(`
        <h3 class="pk-al-section-title">${i18n.t("hud.active_list.abilities")}</h3>
        <table class="pk-al-table"><tbody>${rows}</tbody></table>
      `);
    }

    if (sections.length === 0) {
      sections.push(`<p class="pk-al-empty">${i18n.t("hud.active_list.empty")}</p>`);
    }

    sections.push(
      buttonHtml({ action: "close", label: i18n.t("menu.close"), variant: "ghost" }),
    );

    return `<div class="gt-stack">${sections.join("")}</div>`;
  }
}
