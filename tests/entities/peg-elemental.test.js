import { describe, it, expect, beforeEach } from "vitest";
import { Ball } from "../../src/entities/ball-classic.js";
import { FirePeg } from "../../src/entities/peg-fire.js";
import { IcePeg } from "../../src/entities/peg-ice.js";
import { ElectricalPeg } from "../../src/entities/peg-electrical.js";
import { BombPeg } from "../../src/entities/peg-bomb.js";
import { EFFECT_DEFS, BOMB_RADIUS } from "../../src/configs/constants.js";

describe("FirePeg", () => {
  it("has type 'fire'", () => {
    const peg = new FirePeg();
    expect(peg.type).toBe("fire");
  });

  it("consumeReward returns { effect: 'burning' }", () => {
    const peg = new FirePeg();
    const ball = new Ball();
    const reward = peg.consumeReward(ball);
    expect(reward.effect).toBe("burning");
  });
});

describe("IcePeg", () => {
  it("has type 'ice'", () => {
    const peg = new IcePeg();
    expect(peg.type).toBe("ice");
  });

  it("consumeReward returns { effect: 'frozen' }", () => {
    const peg = new IcePeg();
    const ball = new Ball();
    const reward = peg.consumeReward(ball);
    expect(reward.effect).toBe("frozen");
  });
});

describe("ElectricalPeg", () => {
  it("has type 'electrical'", () => {
    const peg = new ElectricalPeg();
    expect(peg.type).toBe("electrical");
  });

  it("consumeReward returns { effect: 'electrified' }", () => {
    const peg = new ElectricalPeg();
    const ball = new Ball();
    const reward = peg.consumeReward(ball);
    expect(reward.effect).toBe("electrified");
  });
});

describe("BombPeg", () => {
  it("has type 'bomb'", () => {
    const peg = new BombPeg();
    expect(peg.type).toBe("bomb");
  });

  it("blastRadius matches BOMB_RADIUS constant", () => {
    const peg = new BombPeg();
    expect(peg.blastRadius).toBe(BOMB_RADIUS);
  });

  it("explode() returns true the first time and false after", () => {
    const peg = new BombPeg();
    expect(peg.detonated).toBe(false);
    expect(peg.explode()).toBe(true);
    expect(peg.detonated).toBe(true);
    expect(peg.hp).toBe(0);
    expect(peg.explode()).toBe(false);
  });

  it("consumeReward returns { bomb: true }", () => {
    const peg = new BombPeg();
    const ball = new Ball();
    const reward = peg.consumeReward(ball);
    expect(reward.bomb).toBe(true);
  });
});

describe("Ball effect system", () => {
  let now;
  beforeEach(() => {
    now = 1000;
  });

  it("applyEffect adds a named effect with correct expiry", () => {
    const b = new Ball();
    b.applyEffect("burning", now);
    expect(b.effects.has("burning")).toBe(true);
    const eff = b.effects.get("burning");
    expect(eff.expiresAt).toBe(now + EFFECT_DEFS.burning.durationMs);
  });

  it("applyEffect with unknown id is a no-op", () => {
    const b = new Ball();
    b.applyEffect("nonexistent", now);
    expect(b.effects.size).toBe(0);
  });

  it("tickEffects with burning deals -1 HP per tick", () => {
    const b = new Ball(); // default 20 HP
    b.applyEffect("burning", now);
    // Before first tick (tickMs = 1000, so nextTickAt = now + 1000)
    expect(b.tickEffects(now + 500)).toBe(false);
    expect(b.hp).toBe(20);
    // At first tick
    expect(b.tickEffects(now + 1000)).toBe(false);
    expect(b.hp).toBe(19);
    // Second tick
    expect(b.tickEffects(now + 2000)).toBe(false);
    expect(b.hp).toBe(18);
    // At 2999ms — just before expiry, the next tick hasn't arrived yet (next at 3000)
    expect(b.tickEffects(now + 2999)).toBe(false);
    expect(b.hp).toBe(18);
    // At 3000ms — expires (>= expiresAt), so no third tick fires
    expect(b.tickEffects(now + 3000)).toBe(false);
    expect(b.hp).toBe(18);
    expect(b.effects.has("burning")).toBe(false);
  });

  it("tickEffects with electrified deals -1 HP every 500ms for 3s (5 ticks before expiry)", () => {
    const b = new Ball();
    b.maxHp = 8;
    b.hp = 8;
    b.applyEffect("electrified", now);
    // Ticks fire at 500, 1000, 1500, 2000, 2500 (5 ticks).
    // At 3000ms the effect expires before the 6th tick fires.
    for (let i = 1; i <= 6; i++) {
      b.tickEffects(now + i * 500);
    }
    expect(b.hp).toBe(8 - 5);
  });

  it("tickEffects returns true when ball dies from DoT", () => {
    const b = new Ball(); // default 5 HP
    b.hp = 1;
    b.applyEffect("burning", now);
    const dead = b.tickEffects(now + 1000);
    expect(dead).toBe(true);
    expect(b.alive).toBe(false);
  });

  it("frozen effect gives speed multiplier 0.5", () => {
    const b = new Ball();
    expect(b.getSpeedMultiplier()).toBe(1);
    b.applyEffect("frozen", now);
    expect(b.getSpeedMultiplier()).toBe(0.5);
    // After expiry, speed returns to 1
    b.tickEffects(now + 2500);
    expect(b.getSpeedMultiplier()).toBe(1);
  });

  it("getActiveEffectIds returns active effect names", () => {
    const b = new Ball();
    b.applyEffect("burning", now);
    b.applyEffect("frozen", now);
    const ids = b.getActiveEffectIds();
    expect(ids).toContain("burning");
    expect(ids).toContain("frozen");
  });

  it("overwriting an existing effect resets its timer", () => {
    const b = new Ball();
    b.applyEffect("frozen", now);
    const eff1 = b.effects.get("frozen");
    b.applyEffect("frozen", now + 1000);
    const eff2 = b.effects.get("frozen");
    expect(eff2.expiresAt).toBe(now + 1000 + EFFECT_DEFS.frozen.durationMs);
    expect(eff2.expiresAt).toBeGreaterThan(eff1.expiresAt);
  });
});
