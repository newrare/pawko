import { describe, it, expect } from "vitest";
import { Peg } from "../../src/entities/peg-classic.js";
import { Bumper } from "../../src/entities/peg-bumper.js";
import { PLINKO } from "../../src/configs/constants.js";

describe("Peg", () => {
  it("scores SCORE_PEG with low restitution", () => {
    const p = new Peg({ x: 1, y: 2, slot: 5 });
    expect(p.type).toBe("peg");
    expect(p.score).toBe(PLINKO.SCORE_PEG);
    expect(p.radius).toBe(PLINKO.PEG_RADIUS);
    expect(p.slot).toBe(5);
  });

  it("scoreForContact returns the base score on a clean peg", () => {
    expect(new Peg().scoreForContact()).toBe(PLINKO.SCORE_PEG);
  });

  it("consumeReward returns null by default", () => {
    expect(new Peg().consumeReward(null)).toBeNull();
  });

  it("appliesPegMultiplier is true on classic peg", () => {
    expect(new Peg().appliesPegMultiplier).toBe(true);
  });

  it("takeDamage decrements hp and reports death", () => {
    const p = new Peg();
    const initial = p.hp;
    for (let i = 0; i < initial - 1; i++) expect(p.takeDamage(1)).toBe(false);
    expect(p.takeDamage(1)).toBe(true);
    expect(p.isDestroyed).toBe(true);
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
});
