import { describe, it, expect, beforeEach } from "vitest";
import { RankingModal } from "../../src/components/ranking-modal.js";
import { saveManager } from "../../src/managers/save-manager.js";

beforeEach(() => {
  saveManager.resetAll();
});

describe("RankingModal", () => {
  it("opens and renders without errors", () => {
    const modal = new RankingModal();
    modal.open();
    expect(document.querySelector(".gt-modal-overlay")).not.toBeNull();
    modal.destroy();
  });

  it("shows empty message when no rankings exist", () => {
    const modal = new RankingModal();
    modal.open();
    expect(document.querySelector(".pk-rank-empty")).not.toBeNull();
    modal.destroy();
  });

  it("displays rankings when they exist", () => {
    saveManager.addRanking("default", { score: 500, level: 3 });
    saveManager.addRanking("default", { score: 300, level: 2 });
    const modal = new RankingModal();
    modal.open();
    const rows = document.querySelectorAll(".pk-rank-table tbody tr");
    expect(rows.length).toBe(2);
    modal.destroy();
  });

  it("rankings are sorted by score descending", () => {
    saveManager.addRanking("default", { score: 100, level: 1 });
    saveManager.addRanking("default", { score: 500, level: 3 });
    saveManager.addRanking("default", { score: 300, level: 2 });
    const modal = new RankingModal();
    modal.open();
    const scores = [...document.querySelectorAll(".pk-rank-score")].map(
      (el) => Number(el.textContent),
    );
    expect(scores).toEqual([500, 300, 100]);
    modal.destroy();
  });

  it("destroy() removes the modal", () => {
    const modal = new RankingModal();
    modal.open();
    modal.destroy();
    expect(document.querySelector(".gt-modal-overlay")).toBeNull();
  });
});
