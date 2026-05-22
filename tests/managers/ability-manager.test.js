import { describe, it, expect, vi, beforeEach } from "vitest";
import { abilityManager } from "../../src/managers/ability-manager.js";
import { ABILITY_DEFS } from "../../src/configs/ability-defs.js";

beforeEach(() => abilityManager._resetForTests());

describe("abilityManager", () => {
  it("starts with nothing unlocked", () => {
    expect(abilityManager.getUnlocked()).toEqual([]);
  });

  it("unlock() persists and is idempotent", () => {
    expect(abilityManager.unlock("ball_1")).toBe(true);
    expect(abilityManager.unlock("ball_1")).toBe(false);
    expect(abilityManager.isUnlocked("ball_1")).toBe(true);
  });

  it("rejects unknown ability ids", () => {
    expect(abilityManager.unlock("does_not_exist")).toBe(false);
    expect(abilityManager.getUnlocked()).toEqual([]);
  });

  it("canBuyBonus() reflects ability gates", () => {
    expect(abilityManager.canBuyBonus("perm_extra_ball_1")).toBe(false);
    abilityManager.unlock("ball_1");
    expect(abilityManager.canBuyBonus("perm_extra_ball_1")).toBe(true);
  });

  it("canBuyBonus() returns true for ungated bonuses", () => {
    expect(abilityManager.canBuyBonus("session_extra_black_ball_one")).toBe(true);
    expect(abilityManager.canBuyBonus("totally_unrelated")).toBe(true);
  });

  it("emits change on unlock", () => {
    const fn = vi.fn();
    abilityManager.on("change", fn);
    abilityManager.unlock("luky_1");
    expect(fn).toHaveBeenCalledWith("luky_1");
  });

  it("getAll() exposes the static catalogue", () => {
    expect(abilityManager.getAll()).toBe(ABILITY_DEFS);
  });

  it("reset() wipes every unlock", () => {
    abilityManager.unlock("ball_1");
    abilityManager.unlock("luky_1");
    abilityManager.reset();
    expect(abilityManager.getUnlocked()).toEqual([]);
  });
});
