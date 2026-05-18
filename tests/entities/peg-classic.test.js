import { describe, it, expect } from "vitest";
import { Peg } from "../../src/entities/peg-classic.js";
import { Bumper } from "../../src/entities/peg-bumper.js";
import { PLINKO, BALL_EFFECTS } from "../../src/configs/constants.js";

describe("Peg", () => {
  it("scores SCORE_PEG with low restitution", () => {
    const p = new Peg({ x: 1, y: 2, slot: 5 });
    expect(p.type).toBe("peg");
    expect(p.score).toBe(PLINKO.SCORE_PEG);
    expect(p.radius).toBe(PLINKO.PEG_RADIUS);
    expect(p.slot).toBe(5);
  });

  it("starts with no ball-effect status flags", () => {
    const p = new Peg({ x: 0, y: 0, slot: 0 });
    expect(p.iceHits).toBe(0);
    expect(p.burned).toBe(false);
    expect(p.electrified).toBe(false);
  });

  it("scoreForContact returns the base score on a clean peg", () => {
    expect(new Peg().scoreForContact()).toBe(PLINKO.SCORE_PEG);
  });

  it("scoreForContact returns 0 while the peg is iced", () => {
    const p = new Peg();
    p.iceHits = 2;
    expect(p.scoreForContact()).toBe(0);
  });

  it("scoreForContact halves the base score while the peg is burned", () => {
    const p = new Peg();
    p.burned = true;
    expect(p.scoreForContact()).toBe(
      Math.floor(PLINKO.SCORE_PEG / BALL_EFFECTS.FIRE_SCORE_DIVISOR),
    );
  });

  it("ice takes precedence over burn for scoring", () => {
    const p = new Peg();
    p.burned = true;
    p.iceHits = 1;
    expect(p.scoreForContact()).toBe(0);
  });

  it("onAfterScored decays one ice charge and returns true", () => {
    const p = new Peg();
    p.iceHits = 2;
    expect(p.onAfterScored()).toBe(true);
    expect(p.iceHits).toBe(1);
    expect(p.onAfterScored()).toBe(true);
    expect(p.iceHits).toBe(0);
  });

  it("onAfterScored is a no-op on a clean peg", () => {
    const p = new Peg();
    expect(p.onAfterScored()).toBe(false);
    expect(p.iceHits).toBe(0);
  });

  it("consumeReward returns null by default", () => {
    expect(new Peg().consumeReward(null)).toBeNull();
  });

  it("appliesPegMultiplier is true on classic peg", () => {
    expect(new Peg().appliesPegMultiplier).toBe(true);
  });
});

describe("Bumper", () => {
  it("scores SCORE_BUMPER with high restitution", () => {
    const b = new Bumper({ x: 1, y: 2, slot: 8 });
    expect(b.type).toBe("bumper");
    expect(b.score).toBe(PLINKO.SCORE_BUMPER);
    expect(b.radius).toBe(PLINKO.BUMPER_RADIUS);
    expect(b.restitution).toBeGreaterThan(new Peg().restitution);
  });

  it("scoreForContact returns SCORE_BUMPER on a clean bumper", () => {
    expect(new Bumper().scoreForContact()).toBe(PLINKO.SCORE_BUMPER);
  });

  it("bumper opts out of the peg score multiplier", () => {
    expect(new Bumper().appliesPegMultiplier).toBe(false);
  });

  it("burned bumper awards half score (rule inherited from Peg)", () => {
    const b = new Bumper();
    b.burned = true;
    expect(b.scoreForContact()).toBe(
      Math.floor(PLINKO.SCORE_BUMPER / BALL_EFFECTS.FIRE_SCORE_DIVISOR),
    );
  });
});
