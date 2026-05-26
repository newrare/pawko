import { describe, it, expect, beforeEach } from "vitest";
import { Ball } from "../../src/entities/ball-classic.js";
import { PLINKO, EFFECT_DEFS, BALL_DEFS } from "../../src/configs/constants.js";
import { BALL_KINDS } from "../../src/entities/ball-factory.js";

const CLASSIC_HP = BALL_DEFS.classic.hp;

describe("Ball (classic)", () => {
  it("starts alive with zero recycle count", () => {
    const b = new Ball();
    expect(b.alive).toBe(true);
    expect(b.recycles).toBe(0);
  });

  it("uses BALL_RADIUS from constants", () => {
    expect(new Ball().radius).toBe(PLINKO.BALL_RADIUS);
  });

  it("canRecycle is true while under MAX_RECYCLES", () => {
    const b = new Ball();
    for (let i = 0; i < PLINKO.MAX_RECYCLES; i++) {
      expect(b.canRecycle()).toBe(true);
      b.recycles += 1;
    }
    expect(b.canRecycle()).toBe(false);
  });

  it("stores explicit position and velocity", () => {
    const b = new Ball({ x: 1, y: 2, vx: 3, vy: 4 });
    expect(b.x).toBe(1);
    expect(b.y).toBe(2);
    expect(b.vx).toBe(3);
    expect(b.vy).toBe(4);
  });

  it("reports its kind as classic with no CSS modifier", () => {
    const b = new Ball();
    expect(b.kind).toBe(BALL_KINDS.CLASSIC);
    expect(b.cssModifier).toBe("");
  });

  describe("HP", () => {
    it("starts with default HP", () => {
      const b = new Ball();
      expect(b.maxHp).toBe(CLASSIC_HP);
      expect(b.hp).toBe(CLASSIC_HP);
    });

    it("takeDamage decrements HP and stays alive while HP > 0", () => {
      const b = new Ball();
      expect(b.takeDamage(1)).toBe(false);
      expect(b.hp).toBe(CLASSIC_HP - 1);
      expect(b.alive).toBe(true);
    });

    it("takeDamage returns true and flips alive=false when HP reaches 0", () => {
      const b = new Ball();
      let dead = false;
      for (let i = 0; i < CLASSIC_HP - 1; i++) dead = b.takeDamage(1);
      expect(dead).toBe(false);
      expect(b.alive).toBe(true);
      dead = b.takeDamage(1);
      expect(dead).toBe(true);
      expect(b.hp).toBe(0);
      expect(b.alive).toBe(false);
    });

    it("takeDamage on a dead ball is a no-op", () => {
      const b = new Ball();
      b.hp = 0;
      b.alive = false;
      expect(b.takeDamage(1)).toBe(false);
      expect(b.hp).toBe(0);
    });
  });

  describe("Peg-driven effects", () => {
    let now;
    beforeEach(() => { now = 1000; });

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
      const b = new Ball();
      b.applyEffect("burning", now);
      expect(b.tickEffects(now + 500)).toBe(false);
      expect(b.hp).toBe(CLASSIC_HP);
      expect(b.tickEffects(now + 1000)).toBe(false);
      expect(b.hp).toBe(CLASSIC_HP - 1);
      expect(b.tickEffects(now + 2000)).toBe(false);
      expect(b.hp).toBe(CLASSIC_HP - 2);
      expect(b.tickEffects(now + 3000)).toBe(false);
      expect(b.hp).toBe(CLASSIC_HP - 2);
      expect(b.effects.has("burning")).toBe(false);
    });

    it("tickEffects returns true when ball dies from DoT", () => {
      const b = new Ball();
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
});
