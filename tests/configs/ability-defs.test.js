import { describe, it, expect } from "vitest";
import {
  ABILITY_DEFS,
  ABILITY_CATEGORIES,
  findAbility,
} from "../../src/configs/ability-defs.js";
import { PARAM_KEYS } from "../../src/configs/bonus-defs.js";

describe("ability-defs", () => {
  const validKeys = new Set(Object.values(PARAM_KEYS));

  it("every ability belongs to a valid category", () => {
    const validCategories = new Set(Object.values(ABILITY_CATEGORIES));
    for (const def of ABILITY_DEFS) {
      expect(validCategories.has(def.category)).toBe(true);
    }
  });

  it("every ability is direct-effect: modifiers only, no `unlocks`", () => {
    for (const def of ABILITY_DEFS) {
      expect(def.unlocks, `${def.id} should not carry unlocks`).toBeUndefined();
      expect(Array.isArray(def.modifiers)).toBe(true);
      expect(def.modifiers.length).toBeGreaterThan(0);
      for (const m of def.modifiers) {
        expect(
          validKeys.has(m.paramKey),
          `${def.id} uses unknown paramKey ${m.paramKey}`,
        ).toBe(true);
      }
    }
  });

  it("diamond cost follows 2^(level-1) within each category", () => {
    for (const def of ABILITY_DEFS) {
      expect(def.cost).toBe(Math.pow(2, Math.max(0, def.level - 1)));
    }
  });

  it("no duplicate ability ids", () => {
    const ids = ABILITY_DEFS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("findAbility() returns the def by id", () => {
    expect(findAbility("gate_1")?.id).toBe("gate_1");
    expect(findAbility("does_not_exist")).toBeNull();
  });

  it("contains the four expected categories", () => {
    const cats = new Set(ABILITY_DEFS.map((a) => a.category));
    expect(cats).toEqual(
      new Set([
        ABILITY_CATEGORIES.SHOP,
        ABILITY_CATEGORIES.GATE,
        ABILITY_CATEGORIES.MAP,
        ABILITY_CATEGORIES.WHEEL,
      ]),
    );
  });

  it("dropped the ECONOMY, PEG and PLAYER categories", () => {
    for (const dead of ["economy", "peg", "player"]) {
      expect(ABILITY_DEFS.some((a) => a.category === dead)).toBe(false);
    }
  });

  it("SHOP tiers each add 5% discount", () => {
    const shops = ABILITY_DEFS.filter(
      (a) => a.category === ABILITY_CATEGORIES.SHOP,
    );
    expect(shops).toHaveLength(6);
    for (const s of shops) {
      const m = s.modifiers.find(
        (m) => m.paramKey === PARAM_KEYS.SHOP_DISCOUNT,
      );
      expect(m?.op).toBe("add");
      expect(m?.value).toBeCloseTo(0.05);
    }
  });

  it("GATE width tiers are increments that stack to their designed totals", () => {
    const reductionFor = (id, key) =>
      findAbility(id).modifiers.find((m) => m.paramKey === key)?.value ?? 0;
    expect(
      reductionFor("gate_1", PARAM_KEYS.GATE_HP_WIDTH_REDUCTION),
    ).toBeCloseTo(0.5);
    expect(
      reductionFor("gate_1", PARAM_KEYS.GATE_HP_WIDTH_REDUCTION) +
        reductionFor("gate_2", PARAM_KEYS.GATE_HP_WIDTH_REDUCTION),
    ).toBeCloseTo(0.8);
    expect(
      reductionFor("gate_3", PARAM_KEYS.GATE_BACK_WIDTH_REDUCTION),
    ).toBeCloseTo(0.25);
    expect(
      reductionFor("gate_3", PARAM_KEYS.GATE_BACK_WIDTH_REDUCTION) +
        reductionFor("gate_4", PARAM_KEYS.GATE_BACK_WIDTH_REDUCTION),
    ).toBeCloseTo(0.5);
    const m5 = findAbility("gate_5").modifiers[0];
    expect(m5.paramKey).toBe(PARAM_KEYS.GATE_MULT_FACTOR);
    expect(m5.op).toBe("multiply");
    expect(m5.value).toBe(2);
  });

  it("WHEEL tiers add reels (total +3) and a reroll discount", () => {
    const wheels = ABILITY_DEFS.filter(
      (a) => a.category === ABILITY_CATEGORIES.WHEEL,
    );
    const reelBonus = wheels
      .flatMap((w) => w.modifiers)
      .filter((m) => m.paramKey === PARAM_KEYS.SLOT_REEL_BONUS)
      .reduce((sum, m) => sum + m.value, 0);
    expect(reelBonus).toBe(3);
    const discount = wheels
      .flatMap((w) => w.modifiers)
      .find((m) => m.paramKey === PARAM_KEYS.SLOT_REROLL_DISCOUNT);
    expect(discount?.op).toBe("multiply");
    expect(discount?.value).toBe(0.5);
  });
});
