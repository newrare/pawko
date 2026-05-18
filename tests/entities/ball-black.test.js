import { describe, it, expect } from "vitest";
import { BlackBall } from "../../src/entities/ball-black.js";
import { Peg } from "../../src/entities/peg-classic.js";
import { BALL_KINDS } from "../../src/entities/ball-factory.js";

describe("BlackBall", () => {
  it("reports its kind and css modifier", () => {
    const b = new BlackBall();
    expect(b.kind).toBe(BALL_KINDS.BLACK);
    expect(b.cssModifier).toBe("black");
  });

  it("consumes any peg it touches", () => {
    expect(new BlackBall().consumesPeg(new Peg())).toBe(true);
  });

  it("applies no peg side-effect", () => {
    const peg = new Peg();
    expect(new BlackBall().applyEffectTo(peg)).toBe(false);
    expect(peg.iceHits).toBe(0);
    expect(peg.burned).toBe(false);
    expect(peg.electrified).toBe(false);
  });
});
