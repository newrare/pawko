import { describe, it, expect } from "vitest";
import {
  ALL_BONUSES,
  REWARD_BONUSES,
  REWARD_MALUSES,
  PARAM_KEYS,
  TRIGGER_EVENTS,
  TRIGGER_ACTIONS,
  BONUS_CATEGORIES,
  findBonus,
} from "../../src/configs/bonus-defs.js";

describe("bonus-defs", () => {
  const validKeys = new Set(Object.values(PARAM_KEYS));
  const validEvents = new Set(Object.values(TRIGGER_EVENTS));
  const validActions = new Set(Object.values(TRIGGER_ACTIONS));

  it("every modifier paramKey is registered in PARAM_KEYS", () => {
    for (const def of ALL_BONUSES) {
      for (const m of def.modifiers ?? []) {
        expect(
          validKeys.has(m.paramKey),
          `${def.id} uses unknown paramKey ${m.paramKey}`,
        ).toBe(true);
      }
    }
  });

  it("every trigger references a valid event and action", () => {
    for (const def of ALL_BONUSES) {
      for (const t of def.triggers ?? []) {
        expect(validEvents.has(t.on), `${def.id} unknown event ${t.on}`).toBe(
          true,
        );
        expect(
          validActions.has(t.action),
          `${def.id} unknown action ${t.action}`,
        ).toBe(true);
      }
    }
  });

  it("every ACTIVATE trigger references an existing reward", () => {
    for (const def of ALL_BONUSES) {
      for (const t of def.triggers ?? []) {
        if (t.action !== TRIGGER_ACTIONS.ACTIVATE) continue;
        expect(
          findBonus(t.payload?.bonusId),
          `${def.id} activates unknown reward`,
        ).toBeTruthy();
      }
    }
  });

  it("no reward carries legacy shop fields (cost / type / abilityRequired)", () => {
    for (const def of ALL_BONUSES) {
      expect(def.cost).toBeUndefined();
      expect(def.type).toBeUndefined();
      expect(def.abilityRequired).toBeUndefined();
    }
  });

  it("bonuses are category=bonus and maluses category=malus", () => {
    for (const b of REWARD_BONUSES)
      expect(b.category).toBe(BONUS_CATEGORIES.BONUS);
    for (const m of REWARD_MALUSES)
      expect(m.category).toBe(BONUS_CATEGORIES.MALUS);
  });

  it("every reward declares a valid duration (fixed levels or random)", () => {
    for (const def of ALL_BONUSES) {
      if (def.durationRandom) {
        expect(def.durationLevels).toBeUndefined();
        continue;
      }
      const d = def.durationLevels;
      expect(
        d === null || (Number.isFinite(d) && d > 0),
        `${def.id} has an invalid durationLevels`,
      ).toBe(true);
    }
  });

  it("every malus rolls its duration (durationRandom)", () => {
    for (const m of REWARD_MALUSES) {
      expect(m.durationRandom, `${m.id} should roll its duration`).toBe(true);
    }
  });

  it("every reward icon is unique across the catalogue", () => {
    const icons = ALL_BONUSES.map((b) => b.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it("variable-magnitude modifiers use a non-empty values array", () => {
    for (const def of ALL_BONUSES) {
      for (const m of def.modifiers ?? []) {
        if (m.values === undefined) continue;
        expect(Array.isArray(m.values) && m.values.length > 0).toBe(true);
        expect(m.value).toBeUndefined();
      }
    }
  });

  it("the removed maluses are gone; the new ones are present", () => {
    expect(findBonus("malus_half_coins")).toBeNull();
    for (const id of [
      "malus_shop_price",
      "malus_cannon_misfire",
      "malus_mystery_common",
      "malus_objective_double",
      "malus_slot_no_reroll",
      "malus_slot_common",
    ]) {
      expect(findBonus(id), `${id} should exist`).toBeTruthy();
    }
  });

  it("no duplicate reward ids", () => {
    const ids = ALL_BONUSES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("findBonus() returns the def by id", () => {
    expect(findBonus("reward_score_total_x2")?.id).toBe(
      "reward_score_total_x2",
    );
    expect(findBonus("does_not_exist")).toBeNull();
  });

  it("covers each gameplay trigger event at least once", () => {
    const covered = new Set(
      ALL_BONUSES.flatMap((b) => (b.triggers ?? []).map((t) => t.on)),
    );
    expect(covered.has(TRIGGER_EVENTS.PEG_DESTROYED)).toBe(true);
    expect(covered.has(TRIGGER_EVENTS.PEG_SAVED)).toBe(true);
    expect(covered.has(TRIGGER_EVENTS.EFFECT_CANCELLED)).toBe(true);
  });

  it("dropped the removed permanent / peg-unlock / player-hp entries", () => {
    for (const id of [
      "perm_shop_discount_1",
      "perm_reveal_boss",
      "perm_unlock_ice_peg",
      "malus_player_hp_drain",
      "session_coin_drop_x2",
    ]) {
      expect(findBonus(id), `${id} should be deleted`).toBeNull();
    }
  });
});
