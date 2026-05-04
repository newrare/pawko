import { describe, it, expect } from "vitest";
import {
  PERMANENT_BONUSES,
  SESSION_BONUSES,
  ALL_BONUSES,
  PARAM_KEYS,
  BONUS_MILESTONE_INTERVAL,
} from "../../src/configs/bonus-defs.js";

describe("bonus-defs", () => {
  it("all bonuses have unique ids", () => {
    const ids = ALL_BONUSES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("permanent bonuses have category permanent", () => {
    for (const b of PERMANENT_BONUSES) {
      expect(b.category).toBe("permanent");
    }
  });

  it("session bonuses have category session", () => {
    for (const b of SESSION_BONUSES) {
      expect(b.category).toBe("session");
    }
  });

  it("permanent bonuses have unlockLevel at milestone intervals", () => {
    for (const b of PERMANENT_BONUSES) {
      expect(b.unlockLevel).toBeDefined();
      expect(b.unlockLevel % BONUS_MILESTONE_INTERVAL).toBe(0);
    }
  });

  it("session bonuses have shopWeight >= 0", () => {
    for (const b of SESSION_BONUSES) {
      expect(b.shopWeight).toBeGreaterThanOrEqual(0);
    }
  });

  it("session bonuses have durationLevels > 0", () => {
    for (const b of SESSION_BONUSES) {
      expect(b.durationLevels).toBeGreaterThan(0);
    }
  });

  it("all bonuses have an icon", () => {
    for (const b of ALL_BONUSES) {
      expect(b.icon).toBeTruthy();
    }
  });

  it("modifier params reference valid PARAM_KEYS", () => {
    const validKeys = new Set(Object.values(PARAM_KEYS));
    for (const b of ALL_BONUSES) {
      if (!b.modifiers) continue;
      for (const mod of b.modifiers) {
        expect(validKeys.has(mod.param)).toBe(true);
      }
    }
  });

  it("modifier ops are valid", () => {
    const validOps = new Set(["add", "multiply", "set"]);
    for (const b of ALL_BONUSES) {
      if (!b.modifiers) continue;
      for (const mod of b.modifiers) {
        expect(validOps.has(mod.op)).toBe(true);
      }
    }
  });

  it("triggers have event and effect", () => {
    for (const b of ALL_BONUSES) {
      if (!b.trigger) continue;
      expect(b.trigger.event).toBeTruthy();
      expect(typeof b.trigger.effect).toBe("function");
    }
  });

  it("permanent bonus extra_start_ball adds +1 starting balls", () => {
    const b = PERMANENT_BONUSES.find((x) => x.id === "extra_start_ball");
    expect(b).toBeDefined();
    expect(b.modifiers[0].param).toBe("startingBallsPerSublaunch");
    expect(b.modifiers[0].op).toBe("add");
    expect(b.modifiers[0].value).toBe(1);
  });

  it("permanent bonus shop_magnet enables magnet force", () => {
    const b = PERMANENT_BONUSES.find((x) => x.id === "shop_magnet");
    expect(b).toBeDefined();
    expect(b.modifiers[0].param).toBe("shopMagnetForce");
  });

  it("bonus_launcher has onExpire", () => {
    const b = SESSION_BONUSES.find((x) => x.id === "bonus_launcher");
    expect(b).toBeDefined();
    expect(typeof b.onExpire).toBe("function");
  });
});
