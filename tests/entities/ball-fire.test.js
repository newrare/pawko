import { describe, it, expect } from "vitest";
import { FireBall } from "../../src/entities/ball-fire.js";
import { Peg } from "../../src/entities/peg-classic.js";
import { BALL_KINDS } from "../../src/entities/ball-factory.js";

describe("FireBall", () => {
  it("reports its kind and css modifier", () => {
    const b = new FireBall();
    expect(b.kind).toBe(BALL_KINDS.FIRE);
    expect(b.cssModifier).toBe("fire");
  });

  it("burns a clean peg", () => {
    const peg = new Peg();
    expect(new FireBall().applyEffectTo(peg)).toBe(true);
    expect(peg.burned).toBe(true);
  });

  it("melts existing ice and burns the peg", () => {
    const peg = new Peg();
    peg.iceHits = 3;
    expect(new FireBall().applyEffectTo(peg)).toBe(true);
    expect(peg.burned).toBe(true);
    expect(peg.iceHits).toBe(0);
  });

  it("returns false when the peg is already burned and not iced", () => {
    const peg = new Peg();
    peg.burned = true;
    expect(new FireBall().applyEffectTo(peg)).toBe(false);
  });
});
