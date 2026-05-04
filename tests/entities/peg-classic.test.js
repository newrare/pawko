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
});

describe("Bumper", () => {
  it("scores SCORE_BUMPER with high restitution", () => {
    const b = new Bumper({ x: 1, y: 2, slot: 8 });
    expect(b.type).toBe("bumper");
    expect(b.score).toBe(PLINKO.SCORE_BUMPER);
    expect(b.radius).toBe(PLINKO.BUMPER_RADIUS);
    expect(b.restitution).toBeGreaterThan(new Peg().restitution);
  });
});
