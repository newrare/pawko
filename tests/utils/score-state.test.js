import { describe, it, expect } from "vitest";
import {
  ScoreState,
  levelObjective,
  gateMultiplier,
} from "../../src/utils/score-state.js";
import { SCORE } from "../../src/configs/constants.js";

describe("levelObjective", () => {
  it("scales linearly with the level id", () => {
    expect(levelObjective(1)).toBe(SCORE.OBJECTIVE_BASE);
    expect(levelObjective(2)).toBe(SCORE.OBJECTIVE_BASE * 2);
    expect(levelObjective(5)).toBe(SCORE.OBJECTIVE_BASE * 5);
  });

  it("floors to at least level 1 for bad input", () => {
    expect(levelObjective(0)).toBe(SCORE.OBJECTIVE_BASE);
    expect(levelObjective(undefined)).toBe(SCORE.OBJECTIVE_BASE);
    expect(levelObjective(-3)).toBe(SCORE.OBJECTIVE_BASE);
  });
});

describe("gateMultiplier", () => {
  it("maps x1 gates to +1 and x2 gates to +2", () => {
    expect(gateMultiplier("x1_left")).toBe(1);
    expect(gateMultiplier("x1_right")).toBe(1);
    expect(gateMultiplier("x2_left")).toBe(2);
    expect(gateMultiplier("x2_right")).toBe(2);
  });

  it("the return gate and unknown gates add nothing", () => {
    expect(gateMultiplier("return")).toBe(0);
    expect(gateMultiplier("nope")).toBe(0);
  });
});

describe("ScoreState", () => {
  it("starts with zero hits and the base multiplier", () => {
    const s = new ScoreState();
    expect(s.hitScore).toBe(0);
    expect(s.multiplier).toBe(SCORE.MULTIPLIER_BASE);
    expect(s.finalScore).toBe(0);
  });

  it("accumulates hit points and ignores non-positive values", () => {
    const s = new ScoreState();
    expect(s.addHit(10)).toBe(10);
    s.addHit(30);
    s.addHit(0);
    s.addHit(-5);
    expect(s.hitScore).toBe(40);
  });

  it("raises the multiplier by gate contributions", () => {
    const s = new ScoreState();
    s.addMultiplier(1);
    s.addMultiplier(2);
    expect(s.multiplier).toBe(SCORE.MULTIPLIER_BASE + 3);
    s.addMultiplier(0);
    expect(s.multiplier).toBe(SCORE.MULTIPLIER_BASE + 3);
  });

  it("computes finalScore as hitScore × multiplier", () => {
    const s = new ScoreState();
    s.addHit(100);
    s.addMultiplier(2); // multiplier now base(1) + 2 = 3
    expect(s.finalScore).toBe(100 * (SCORE.MULTIPLIER_BASE + 2));
  });

  it("reaches() compares the final score against the objective", () => {
    const s = new ScoreState();
    s.addHit(250);
    s.addMultiplier(1); // multiplier = 2 → final = 500
    expect(s.reaches(500)).toBe(true);
    expect(s.reaches(501)).toBe(false);
  });

  it("keeps hits countable even with the base multiplier only", () => {
    const s = new ScoreState();
    s.addHit(500);
    expect(s.finalScore).toBe(500 * SCORE.MULTIPLIER_BASE);
  });

  it("records each multiplier increment in order and returns a copy", () => {
    const s = new ScoreState();
    s.addMultiplier(1);
    s.addMultiplier(2);
    s.addMultiplier(0); // ignored
    s.addMultiplier(1);
    expect(s.multiplierSteps).toEqual([1, 2, 1]);
    // mutating the returned array must not affect internal state
    s.multiplierSteps.push(99);
    expect(s.multiplierSteps).toEqual([1, 2, 1]);
  });
});
