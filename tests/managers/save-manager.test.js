import { describe, it, expect } from "vitest";
import { saveManager } from "../../src/managers/save-manager.js";
import { MAX_SAVE_SLOTS } from "../../src/configs/constants.js";

describe("saveManager", () => {
  it("round-trips an auto-save", () => {
    saveManager.saveAuto({ score: 42 });
    expect(saveManager.loadAuto().score).toBe(42);
  });

  it("returns a fixed-size slots array", () => {
    expect(saveManager.getSlots()).toHaveLength(MAX_SAVE_SLOTS);
  });

  it("persists slot writes", () => {
    saveManager.saveSlot(0, { score: 1 });
    saveManager.saveSlot(2, { score: 3 });
    const slots = saveManager.getSlots();
    expect(slots[0].score).toBe(1);
    expect(slots[1]).toBeNull();
    expect(slots[2].score).toBe(3);
  });

  it("rankings are sorted descending and capped at limit", () => {
    saveManager.addRanking("classic", { score: 100 }, 3);
    saveManager.addRanking("classic", { score: 50 }, 3);
    saveManager.addRanking("classic", { score: 200 }, 3);
    saveManager.addRanking("classic", { score: 10 }, 3);
    const list = saveManager.getRankings("classic");
    expect(list.map((e) => e.score)).toEqual([200, 100, 50]);
  });

  it("resetAll wipes every persisted key", () => {
    saveManager.saveAuto({ score: 1 });
    saveManager.saveSlot(0, { score: 2 });
    saveManager.addRanking("classic", { score: 3 });
    saveManager.resetAll();
    expect(saveManager.loadAuto()).toBeNull();
    expect(saveManager.getRankings("classic")).toEqual([]);
    expect(saveManager.getSlots().every((s) => s === null)).toBe(true);
  });
});
