import { describe, it, expect, vi, beforeEach } from "vitest";
import { abilityManager } from "../../src/managers/ability-manager.js";
import { ABILITY_DEFS } from "../../src/configs/ability-defs.js";
import { PARAM_KEYS } from "../../src/configs/bonus-defs.js";

beforeEach(() => abilityManager._resetForTests());

describe("abilityManager", () => {
  it("starts with nothing unlocked", () => {
    expect(abilityManager.getUnlocked()).toEqual([]);
  });

  it("unlock() persists and is idempotent", () => {
    expect(abilityManager.unlock("gate_1")).toBe(true);
    expect(abilityManager.unlock("gate_1")).toBe(false);
    expect(abilityManager.isUnlocked("gate_1")).toBe(true);
  });

  it("rejects unknown ability ids", () => {
    expect(abilityManager.unlock("does_not_exist")).toBe(false);
    expect(abilityManager.getUnlocked()).toEqual([]);
  });

  it("emits change on unlock", () => {
    const fn = vi.fn();
    abilityManager.on("change", fn);
    abilityManager.unlock("gate_1");
    expect(fn).toHaveBeenCalledWith("gate_1");
  });

  it("getAll() exposes the static catalogue", () => {
    expect(abilityManager.getAll()).toBe(ABILITY_DEFS);
  });

  it("reset() wipes every unlock", () => {
    abilityManager.unlock("gate_1");
    abilityManager.unlock("shop_1");
    abilityManager.reset();
    expect(abilityManager.getUnlocked()).toEqual([]);
  });

  describe("resolve() — direct-effect abilities", () => {
    it("returns the base value when nothing is unlocked", () => {
      expect(
        abilityManager.resolve(PARAM_KEYS.GATE_HP_WIDTH_REDUCTION, 0),
      ).toBe(0);
      expect(abilityManager.resolve(PARAM_KEYS.GATE_MULT_FACTOR, 1)).toBe(1);
    });

    it("adds a single GATE width reduction once unlocked", () => {
      abilityManager.unlock("gate_1");
      expect(
        abilityManager.resolve(PARAM_KEYS.GATE_HP_WIDTH_REDUCTION, 0),
      ).toBeCloseTo(0.5);
    });

    it("stacks GATE width tiers to their designed totals", () => {
      abilityManager.unlock("gate_1");
      expect(
        abilityManager.resolve(PARAM_KEYS.GATE_HP_WIDTH_REDUCTION, 0),
      ).toBeCloseTo(0.5);
      abilityManager.unlock("gate_2");
      expect(
        abilityManager.resolve(PARAM_KEYS.GATE_HP_WIDTH_REDUCTION, 0),
      ).toBeCloseTo(0.8);
      abilityManager.unlock("gate_3");
      expect(
        abilityManager.resolve(PARAM_KEYS.GATE_BACK_WIDTH_REDUCTION, 0),
      ).toBeCloseTo(0.25);
      abilityManager.unlock("gate_4");
      expect(
        abilityManager.resolve(PARAM_KEYS.GATE_BACK_WIDTH_REDUCTION, 0),
      ).toBeCloseTo(0.5);
    });

    it("doubles the multiplier factor when gate_5 is unlocked", () => {
      expect(abilityManager.resolve(PARAM_KEYS.GATE_MULT_FACTOR, 1)).toBe(1);
      abilityManager.unlock("gate_5");
      expect(abilityManager.resolve(PARAM_KEYS.GATE_MULT_FACTOR, 1)).toBe(2);
    });

    it("SHOP abilities apply their discount directly", () => {
      expect(abilityManager.resolve(PARAM_KEYS.SHOP_DISCOUNT, 0)).toBe(0);
      abilityManager.unlock("shop_1");
      expect(abilityManager.resolve(PARAM_KEYS.SHOP_DISCOUNT, 0)).toBeCloseTo(
        0.05,
      );
      abilityManager.unlock("shop_2");
      expect(abilityManager.resolve(PARAM_KEYS.SHOP_DISCOUNT, 0)).toBeCloseTo(
        0.1,
      );
    });

    it("WHEEL abilities add reel bonus and reroll discount", () => {
      abilityManager.unlock("wheel_1");
      abilityManager.unlock("wheel_2");
      expect(abilityManager.resolve(PARAM_KEYS.SLOT_REEL_BONUS, 0)).toBe(2);
      abilityManager.unlock("wheel_3");
      abilityManager.unlock("wheel_4");
      expect(abilityManager.resolve(PARAM_KEYS.SLOT_REEL_BONUS, 0)).toBe(3);
      expect(abilityManager.resolve(PARAM_KEYS.SLOT_REROLL_DISCOUNT, 1)).toBe(
        0.5,
      );
    });
  });
});
