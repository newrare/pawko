import { describe, it, expect, beforeEach } from "vitest";
import { ActiveListModal } from "../../src/components/active-list-modal.js";
import { bonusManager } from "../../src/managers/bonus-manager.js";
import { abilityManager } from "../../src/managers/ability-manager.js";

beforeEach(() => {
  bonusManager._resetForTests();
  abilityManager._resetForTests();
});

describe("ActiveListModal", () => {
  it("opens and renders without errors", () => {
    const modal = new ActiveListModal();
    modal.open();
    expect(document.querySelector(".gt-modal-overlay")).not.toBeNull();
    modal.destroy();
  });

  it("shows empty message when no effects are active", () => {
    const modal = new ActiveListModal();
    modal.open();
    const body = document.querySelector(".gt-modal-body");
    expect(body.querySelector(".pk-al-empty")).not.toBeNull();
    modal.destroy();
  });

  it("lists unlocked permanent bonuses", () => {
    bonusManager.unlockPermanent("perm_extra_ball_1");
    const modal = new ActiveListModal();
    modal.open();
    const rows = document.querySelectorAll(".pk-al-table tr");
    expect(rows.length).toBeGreaterThanOrEqual(1);
    modal.destroy();
  });

  it("lists active session bonuses", () => {
    bonusManager.activateSession("session_coin_drop_x2");
    const modal = new ActiveListModal();
    modal.open();
    const rows = document.querySelectorAll(".pk-al-table tr");
    expect(rows.length).toBeGreaterThanOrEqual(1);
    modal.destroy();
  });

  it("lists unlocked abilities", () => {
    abilityManager.unlock("ball_1");
    const modal = new ActiveListModal();
    modal.open();
    const sectionTitles = [...document.querySelectorAll(".pk-al-section-title")];
    const hasAbilities = sectionTitles.some((t) => t.textContent.length > 0);
    expect(hasAbilities).toBe(true);
    modal.destroy();
  });

  it("destroy() removes the modal from the DOM", () => {
    const modal = new ActiveListModal();
    modal.open();
    modal.destroy();
    expect(document.querySelector(".gt-modal-overlay")).toBeNull();
  });
});
