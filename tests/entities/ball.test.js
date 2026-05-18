import { describe, it, expect } from "vitest";
import { Ball } from "../../src/entities/ball-classic.js";
import { Peg } from "../../src/entities/peg-classic.js";
import { PLINKO } from "../../src/configs/constants.js";
import { BALL_KINDS } from "../../src/entities/ball-factory.js";

describe("Ball (classic base)", () => {
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

  it("reports its kind as classic", () => {
    expect(new Ball().kind).toBe(BALL_KINDS.CLASSIC);
    expect(new Ball().cssModifier).toBe("");
  });

  it("tracks recent arcs per ball (for combo debouncing)", () => {
    const b = new Ball();
    expect(b.recentArcs).toBeInstanceOf(Set);
    expect(b.recentArcs.size).toBe(0);
  });

  it("has no peg side-effect, never consumes a peg, never refreshes arcs", () => {
    const b = new Ball();
    const peg = new Peg();
    expect(b.applyEffectTo(peg)).toBe(false);
    expect(b.consumesPeg(peg)).toBe(false);
    expect(b.triggersArcRefresh).toBe(false);
    expect(b.onBeforeContact(peg)).toBe("alive");
    expect(peg.iceHits).toBe(0);
    expect(peg.burned).toBe(false);
    expect(peg.electrified).toBe(false);
  });
});
