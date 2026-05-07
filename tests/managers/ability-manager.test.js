import { describe, it, expect, vi, beforeEach } from "vitest";
import { abilityManager } from "../../src/managers/ability-manager.js";
import { ABILITY_DEFS } from "../../src/configs/ability-defs.js";

beforeEach(() => abilityManager._resetForTests());

describe("abilityManager", () => {
  it("starts with nothing unlocked", () => {
    expect(abilityManager.getUnlocked()).toEqual([]);
  });

  it("unlock() persists and is idempotent", () => {
    expect(abilityManager.unlock("start_ball_up")).toBe(true);
    expect(abilityManager.unlock("start_ball_up")).toBe(false);
    expect(abilityManager.isUnlocked("start_ball_up")).toBe(true);
  });

  it("rejects unknown ability ids", () => {
    expect(abilityManager.unlock("does_not_exist")).toBe(false);
    expect(abilityManager.getUnlocked()).toEqual([]);
  });

  it("canBuyBonus() reflects ability gates", () => {
    expect(abilityManager.canBuyBonus("extra_start_ball")).toBe(false);
    abilityManager.unlock("start_ball_up");
    expect(abilityManager.canBuyBonus("extra_start_ball")).toBe(true);
  });

  it("canBuyBonus() returns true for ungated bonuses", () => {
    expect(abilityManager.canBuyBonus("totally_unrelated")).toBe(true);
  });

  it("emits change on unlock", () => {
    const fn = vi.fn();
    abilityManager.on("change", fn);
    abilityManager.unlock("magnet");
    expect(fn).toHaveBeenCalledWith("magnet");
  });

  it("getAll() exposes the static catalogue", () => {
    expect(abilityManager.getAll()).toBe(ABILITY_DEFS);
  });

  it("reset() wipes every unlock", () => {
    abilityManager.unlock("start_ball_up");
    abilityManager.unlock("magnet");
    abilityManager.reset();
    expect(abilityManager.getUnlocked()).toEqual([]);
  });
});
