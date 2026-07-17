import { describe, it, expect } from "vitest";
import {
  ABILITY_DEFS,
  ABILITY_CATEGORIES,
  findAbility,
  abilityForBonus,
} from "../../src/configs/ability-defs.js";
import { ALL_BONUSES } from "../../src/configs/bonus-defs.js";

describe("ability-defs", () => {
  it("every ability belongs to a valid category", () => {
    const validCategories = new Set(Object.values(ABILITY_CATEGORIES));
    for (const def of ABILITY_DEFS) {
      expect(validCategories.has(def.category)).toBe(true);
    }
  });

  it("every unlocks[] entry references an existing bonus", () => {
    const bonusIds = new Set(ALL_BONUSES.map((b) => b.id));
    for (const def of ABILITY_DEFS) {
      for (const id of def.unlocks) {
        expect(bonusIds.has(id), `${def.id} unlocks unknown bonus ${id}`).toBe(true);
      }
    }
  });

  it("diamond cost follows 2^(level-1) within each category", () => {
    for (const def of ABILITY_DEFS) {
      expect(def.cost).toBe(Math.pow(2, Math.max(0, def.level - 1)));
    }
  });

  it("no bonus is gated by more than one ability", () => {
    const seen = new Map();
    for (const def of ABILITY_DEFS) {
      for (const id of def.unlocks) {
        if (seen.has(id)) {
          throw new Error(
            `bonus ${id} is gated by both ${seen.get(id)} and ${def.id}`,
          );
        }
        seen.set(id, def.id);
      }
    }
  });

  it("findAbility() returns the def by id", () => {
    expect(findAbility("gate_1")?.id).toBe("gate_1");
    expect(findAbility("does_not_exist")).toBeNull();
  });

  it("abilityForBonus() reverses the unlocks index", () => {
    expect(abilityForBonus("perm_destroy_coins_x2")?.id).toBe("gate_1");
    expect(abilityForBonus("session_extra_recycles")).toBeNull();
  });

  it("contains the six expected categories", () => {
    const cats = new Set(ABILITY_DEFS.map((a) => a.category));
    expect(cats).toEqual(
      new Set([
        ABILITY_CATEGORIES.SHOP,
        ABILITY_CATEGORIES.ECONOMY,
        ABILITY_CATEGORIES.PEG,
        ABILITY_CATEGORIES.GATE,
        ABILITY_CATEGORIES.PLAYER,
        ABILITY_CATEGORIES.MAP,
      ]),
    );
  });
});
