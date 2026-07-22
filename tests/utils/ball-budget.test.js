import { describe, it, expect } from "vitest";
import { spawnableBalls } from "../../src/utils/ball-budget.js";

describe("spawnableBalls", () => {
  it("spawns the full request when there is plenty of headroom", () => {
    expect(spawnableBalls(3, 0, 0, 50)).toBe(3);
    expect(spawnableBalls(3, 10, 5, 50)).toBe(3);
  });

  it("counts cannon reserve toward the cap in advance", () => {
    /* 40 live + 8 in cannon = 48 projected; only 2 slots left for a 3-ball chest. */
    expect(spawnableBalls(3, 40, 8, 50)).toBe(2);
  });

  it("spawns nothing when the cap is exactly reached", () => {
    expect(spawnableBalls(3, 45, 5, 50)).toBe(0);
  });

  it("spawns nothing when the cap is already exceeded", () => {
    expect(spawnableBalls(3, 60, 0, 50)).toBe(0);
  });

  it("never returns a negative or fractional count", () => {
    expect(spawnableBalls(-2, 0, 0, 50)).toBe(0);
    expect(spawnableBalls(2.9, 0, 0, 50)).toBe(2);
  });

  it("fills only the exact remaining headroom", () => {
    expect(spawnableBalls(10, 49, 0, 50)).toBe(1);
  });
});
