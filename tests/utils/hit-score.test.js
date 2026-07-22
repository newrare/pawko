import { describe, it, expect } from "vitest";
import { adjustHitScore } from "../../src/utils/hit-score.js";

describe("adjustHitScore", () => {
  it("returns the base points when no effects are active", () => {
    expect(adjustHitScore(10, [])).toBe(10);
    expect(adjustHitScore(10)).toBe(10);
  });

  it("adds +5 for a burning (fire) ball", () => {
    expect(adjustHitScore(10, ["burning"])).toBe(15);
    expect(adjustHitScore(30, ["burning"])).toBe(35);
  });

  it("adds +10 for a frozen (ice) ball", () => {
    expect(adjustHitScore(10, ["frozen"])).toBe(20);
  });

  it("doubles the points for an electrified (electrical) ball", () => {
    expect(adjustHitScore(10, ["electrified"])).toBe(20);
    expect(adjustHitScore(30, ["electrified"])).toBe(60);
  });

  it("sums additive bonuses before applying multipliers", () => {
    /* burning +5 and electrified ×2 on a classic peg → (10 + 5) × 2 = 30 */
    expect(adjustHitScore(10, ["burning", "electrified"])).toBe(30);
    /* frozen +10 and electrified ×2 → (10 + 10) × 2 = 40 */
    expect(adjustHitScore(10, ["frozen", "electrified"])).toBe(40);
  });

  it("ignores effects with no score modifier", () => {
    expect(adjustHitScore(10, ["glued", "captured"])).toBe(10);
  });

  it("never touches reward pegs (base ≤ 0)", () => {
    expect(adjustHitScore(0, ["burning", "electrified"])).toBe(0);
  });
});
