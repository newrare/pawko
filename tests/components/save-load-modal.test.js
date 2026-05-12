import { describe, it, expect, beforeEach } from "vitest";
import { SaveLoadModal } from "../../src/components/save-load-modal.js";
import { saveManager } from "../../src/managers/save-manager.js";
import { MAX_SAVE_SLOTS } from "../../src/configs/constants.js";

beforeEach(() => {
  saveManager.resetAll();
});

describe("SaveLoadModal", () => {
  it("opens and renders without errors", () => {
    const modal = new SaveLoadModal();
    modal.open();
    expect(document.querySelector(".gt-modal-overlay")).not.toBeNull();
    modal.destroy();
  });

  it("renders auto-save section", () => {
    const modal = new SaveLoadModal();
    modal.open();
    const sections = document.querySelectorAll(".pk-save-section-title");
    expect(sections.length).toBeGreaterThanOrEqual(2);
    modal.destroy();
  });

  it("renders correct number of manual save slots", () => {
    const modal = new SaveLoadModal();
    modal.open();
    const slots = document.querySelectorAll(".pk-save-slot[data-slot]");
    expect(slots.length).toBe(MAX_SAVE_SLOTS);
    modal.destroy();
  });

  it("shows empty label for unused slots", () => {
    const modal = new SaveLoadModal();
    modal.open();
    const infos = [...document.querySelectorAll(".pk-save-slot-info")];
    const emptySlots = infos.filter((el) => el.textContent.trim() === "Empty");
    expect(emptySlots.length).toBeGreaterThanOrEqual(MAX_SAVE_SLOTS);
    modal.destroy();
  });

  it("save action writes to the slot and refreshes", () => {
    saveManager.saveAuto({ test: true });
    const modal = new SaveLoadModal();
    modal.open();

    /* BaseModal delegates via pointerdown, not click. */
    const saveBtn = document.querySelector('[data-action="save-0"]');
    expect(saveBtn).not.toBeNull();
    saveBtn.dispatchEvent(new Event("pointerdown", { bubbles: true }));

    const slot = saveManager.loadSlot(0);
    expect(slot).not.toBeNull();
    expect(slot.test).toBe(true);
    modal.destroy();
  });

  it("destroy() removes the modal", () => {
    const modal = new SaveLoadModal();
    modal.open();
    modal.destroy();
    expect(document.querySelector(".gt-modal-overlay")).toBeNull();
  });
});
