import { describe, it, expect } from "vitest";
import {
  ALL_BONUSES,
  PARAM_KEYS,
  findBonus,
} from "../../src/configs/bonus-defs.js";
import { ABILITY_DEFS } from "../../src/configs/ability-defs.js";

describe("bonus-defs", () => {
  it("every modifier paramKey is registered in PARAM_KEYS", () => {
    const validKeys = new Set(Object.values(PARAM_KEYS));
    for (const def of ALL_BONUSES) {
      for (const m of def.modifiers ?? []) {
        expect(
          validKeys.has(m.paramKey),
          `${def.id} uses unknown paramKey ${m.paramKey}`,
        ).toBe(true);
      }
    }
  });

  it("every abilityRequired references a real ability", () => {
    const abilityIds = new Set(ABILITY_DEFS.map((a) => a.id));
    for (const def of ALL_BONUSES) {
      if (def.abilityRequired == null) continue;
      expect(
        abilityIds.has(def.abilityRequired),
        `${def.id} requires unknown ability ${def.abilityRequired}`,
      ).toBe(true);
    }
  });

  it("no duplicate bonus ids", () => {
    const ids = ALL_BONUSES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("findBonus() returns the def by id", () => {
    expect(findBonus("perm_extra_hp_1")?.id).toBe("perm_extra_hp_1");
    expect(findBonus("does_not_exist")).toBeNull();
  });

  it("shop discount tiers have strictly increasing cost", () => {
    const tiers = [
      "perm_shop_discount_1",
      "perm_shop_discount_2",
      "perm_shop_discount_3",
      "perm_shop_discount_4",
      "perm_shop_discount_5",
      "perm_shop_discount_6",
    ];
    let prev = -Infinity;
    for (const id of tiers) {
      const def = findBonus(id);
      expect(def).not.toBeNull();
      expect(def.cost).toBeGreaterThan(prev);
      prev = def.cost;
    }
  });

  it("peg discount tiers have strictly increasing cost", () => {
    const tiers = [
      "perm_peg_discount_1",
      "perm_peg_discount_2",
      "perm_peg_discount_3",
      "perm_peg_discount_4",
      "perm_peg_discount_5",
      "perm_peg_discount_6",
    ];
    let prev = -Infinity;
    for (const id of tiers) {
      const def = findBonus(id);
      expect(def).not.toBeNull();
      expect(def.cost).toBeGreaterThan(prev);
      prev = def.cost;
    }
  });

  it("HP tiers go from +5 to +20 across four levels", () => {
    expect(findBonus("perm_extra_hp_1")?.modifiers[0].value).toBe(5);
    expect(findBonus("perm_extra_hp_2")?.modifiers[0].value).toBe(10);
    expect(findBonus("perm_extra_hp_3")?.modifiers[0].value).toBe(15);
    expect(findBonus("perm_extra_hp_4")?.modifiers[0].value).toBe(20);
  });

  it("gate width reductions stack to -10% on each side", () => {
    const back1 = findBonus("perm_gate_back_width_1");
    const back2 = findBonus("perm_gate_back_width_2");
    const hp1 = findBonus("perm_gate_hp_width_1");
    const hp2 = findBonus("perm_gate_hp_width_2");
    expect(back1.modifiers[0].value).toBeCloseTo(0.05);
    expect(back2.modifiers[0].value).toBeCloseTo(0.05);
    expect(hp1.modifiers[0].value).toBeCloseTo(0.05);
    expect(hp2.modifiers[0].value).toBeCloseTo(0.05);
  });

  it("does not contain removed bonuses", () => {
    const removed = [
      "perm_extra_ball_1",
      "perm_extra_ball_2",
      "perm_extra_ball_3",
      "perm_shop_discount",
      "perm_peg_discount_10",
      "perm_reveal_abilities",
      "session_launcher_4",
      "session_launcher_5",
      "session_gate_malus_reduce",
      "session_gate_x_boost",
      "session_gate_x_double",
    ];
    for (const id of removed) {
      expect(findBonus(id), `${id} should be deleted`).toBeNull();
    }
  });
});
