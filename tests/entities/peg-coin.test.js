import { describe, it, expect } from "vitest";
import { CoinPeg } from "../../src/entities/peg-coin.js";
import { Peg } from "../../src/entities/peg-classic.js";
import { PLINKO } from "../../src/configs/constants.js";

describe("CoinPeg", () => {
  it("has type 'coin'", () => {
    const c = new CoinPeg({ x: 1, y: 2, slot: 3 });
    expect(c.type).toBe("coin");
  });

  it("scores 0 (no points)", () => {
    const c = new CoinPeg();
    expect(c.score).toBe(0);
  });

  it("has COIN_PEG_RADIUS", () => {
    const c = new CoinPeg();
    expect(c.radius).toBe(PLINKO.COIN_PEG_RADIUS);
  });

  it("has RESTITUTION_COIN", () => {
    const c = new CoinPeg();
    expect(c.restitution).toBe(PLINKO.RESTITUTION_COIN);
  });

  it("extends Peg", () => {
    const c = new CoinPeg();
    expect(c).toBeInstanceOf(Peg);
  });

  it("preserves position from constructor", () => {
    const c = new CoinPeg({ x: 42, y: 99, slot: 7 });
    expect(c.x).toBe(42);
    expect(c.y).toBe(99);
    expect(c.slot).toBe(7);
  });
});
