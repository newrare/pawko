import { BaseModal } from "./modal-base.js";
import { buttonHtml } from "./ui/button.js";
import { i18n } from "../managers/i18n-manager.js";
import { saveManager } from "../managers/save-manager.js";
import { MAX_SAVE_SLOTS } from "../configs/constants.js";

/**
 * SaveLoadModal — save or load game data.
 * Shows the auto-save slot and the manual save slots. The player can load
 * or overwrite each slot.
 * Opened from the HUD bottom-right folder button (menu-folder).
 */
export class SaveLoadModal extends BaseModal {
  get title() {
    return i18n.t("hud.save.title");
  }

  renderBody() {
    const sections = [];

    /* --- Auto-save --- */
    const auto = saveManager.loadAuto();
    const autoDate = auto?.date
      ? new Date(auto.date).toLocaleString()
      : null;

    sections.push(`
      <h3 class="pk-save-section-title">${i18n.t("hud.save.auto_title")}</h3>
      <div class="pk-save-slot">
        <span class="pk-save-slot-info">
          ${autoDate ? i18n.t("hud.save.saved_at", { date: autoDate }) : i18n.t("hud.save.empty_slot")}
        </span>
        <div class="pk-save-slot-actions">
          ${buttonHtml({ action: "load-auto", label: i18n.t("hud.save.load"), variant: "secondary", disabled: !auto })}
        </div>
      </div>
    `);

    /* --- Manual slots --- */
    const slots = saveManager.getSlots();
    sections.push(`<h3 class="pk-save-section-title">${i18n.t("hud.save.slots_title")}</h3>`);
    for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
      const slot = slots[i];
      const slotDate = slot?.date
        ? new Date(slot.date).toLocaleString()
        : null;
      sections.push(`
        <div class="pk-save-slot" data-slot="${i}">
          <span class="pk-save-slot-label">${i18n.t("hud.save.slot_label", { n: i + 1 })}</span>
          <span class="pk-save-slot-info">
            ${slotDate ? i18n.t("hud.save.saved_at", { date: slotDate }) : i18n.t("hud.save.empty_slot")}
          </span>
          <div class="pk-save-slot-actions">
            ${buttonHtml({ action: `save-${i}`, label: i18n.t("hud.save.save"), variant: "primary" })}
            ${buttonHtml({ action: `load-${i}`, label: i18n.t("hud.save.load"), variant: "secondary", disabled: !slot })}
          </div>
        </div>
      `);
    }

    sections.push(
      buttonHtml({ action: "close", label: i18n.t("menu.close"), variant: "ghost" }),
    );

    return `<div class="gt-stack">${sections.join("")}</div>`;
  }

  onAction(action) {
    if (action === "load-auto") {
      const auto = saveManager.loadAuto();
      if (auto) {
        this.options.onLoad?.(auto, "auto");
        this.close();
      }
      return;
    }

    const saveMatch = action.match(/^save-(\d+)$/);
    if (saveMatch) {
      const idx = Number(saveMatch[1]);
      const state = this.#collectState();
      if (state) {
        saveManager.saveSlot(idx, state);
        this.refresh();
      }
      return;
    }

    const loadMatch = action.match(/^load-(\d+)$/);
    if (loadMatch) {
      const idx = Number(loadMatch[1]);
      const data = saveManager.loadSlot(idx);
      if (data) {
        this.options.onLoad?.(data, idx);
        this.close();
      }
    }
  }

  /**
   * Collect current game state for saving. Delegates to auto-save
   * data if available, otherwise returns a minimal snapshot.
   * @returns {object | null}
   */
  #collectState() {
    return saveManager.loadAuto() ?? null;
  }
}
