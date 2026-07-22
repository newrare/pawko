import { describe, it, expect, beforeEach } from "vitest";
import { Ball } from "../../src/entities/ball-classic.js";
import { bonusManager } from "../../src/managers/bonus-manager.js";
import { EFFECT_DEFS } from "../../src/configs/constants.js";

beforeEach(() => bonusManager._resetForTests());

/**
 * The elemental-duration *upgrades* (perm_fire/ice/electrical_duration_*)
 * were retired together with the PEG ability category. The ball still
 * resolves the *_DURATION_BONUS_MS params, so it transparently picks up any
 * future provider — with none active each effect lasts its EFFECT_DEFS base
 * duration, which is what these tests pin down.
 */
describe("Ball.applyEffect — base durations (no upgrade provider)", () => {
  it("burning lasts EFFECT_DEFS.burning.durationMs", () => {
    const b = new Ball({ x: 0, y: 0 });
    b.applyEffect("burning", 1000);
    expect(b.effects.get("burning").expiresAt - 1000).toBe(
      EFFECT_DEFS.burning.durationMs,
    );
  });

  it("frozen lasts EFFECT_DEFS.frozen.durationMs", () => {
    const b = new Ball({ x: 0, y: 0 });
    b.applyEffect("frozen", 5000);
    expect(b.effects.get("frozen").expiresAt - 5000).toBe(
      EFFECT_DEFS.frozen.durationMs,
    );
  });

  it("electrified lasts EFFECT_DEFS.electrified.durationMs", () => {
    const b = new Ball({ x: 0, y: 0 });
    b.applyEffect("electrified", 0);
    expect(b.effects.get("electrified").expiresAt).toBe(
      EFFECT_DEFS.electrified.durationMs,
    );
  });
});
