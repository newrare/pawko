import { describe, it, expect, beforeEach } from "vitest";
import { Ball } from "../../src/entities/ball-classic.js";
import { bonusManager } from "../../src/managers/bonus-manager.js";
import { EFFECT_DEFS } from "../../src/configs/constants.js";

beforeEach(() => bonusManager._resetForTests());

describe("Ball.applyEffect — bonus duration", () => {
  it("burning lasts EFFECT_DEFS.burning.durationMs without any bonus", () => {
    const b = new Ball({ x: 0, y: 0 });
    b.applyEffect("burning", 1000);
    const eff = b.effects.get("burning");
    expect(eff.expiresAt - 1000).toBe(EFFECT_DEFS.burning.durationMs);
  });

  it("perm_fire_duration_3 adds +3000 ms to burning duration", () => {
    bonusManager.unlockPermanent("perm_fire_duration_3");
    const b = new Ball({ x: 0, y: 0 });
    b.applyEffect("burning", 1000);
    const eff = b.effects.get("burning");
    expect(eff.expiresAt - 1000).toBe(EFFECT_DEFS.burning.durationMs + 3000);
  });

  it("perm_ice_duration_2 adds +2000 ms to frozen duration", () => {
    bonusManager.unlockPermanent("perm_ice_duration_2");
    const b = new Ball({ x: 0, y: 0 });
    b.applyEffect("frozen", 5000);
    const eff = b.effects.get("frozen");
    expect(eff.expiresAt - 5000).toBe(EFFECT_DEFS.frozen.durationMs + 2000);
  });

  it("perm_electrical_duration_1 adds +1000 ms to electrified duration", () => {
    bonusManager.unlockPermanent("perm_electrical_duration_1");
    const b = new Ball({ x: 0, y: 0 });
    b.applyEffect("electrified", 0);
    const eff = b.effects.get("electrified");
    expect(eff.expiresAt).toBe(EFFECT_DEFS.electrified.durationMs + 1000);
  });

  it("stacking two fire duration bonuses sums their values", () => {
    bonusManager.unlockPermanent("perm_fire_duration_1");
    bonusManager.unlockPermanent("perm_fire_duration_2");
    const b = new Ball({ x: 0, y: 0 });
    b.applyEffect("burning", 0);
    const eff = b.effects.get("burning");
    expect(eff.expiresAt).toBe(EFFECT_DEFS.burning.durationMs + 3000);
  });
});
