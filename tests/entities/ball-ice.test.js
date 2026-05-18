import { describe, it, expect } from "vitest";
import { IceBall } from "../../src/entities/ball-ice.js";
import { Peg } from "../../src/entities/peg-classic.js";
import { BALL_EFFECTS } from "../../src/configs/constants.js";
import { BALL_KINDS } from "../../src/entities/ball-factory.js";

describe("IceBall", () => {
  it("reports its kind and css modifier", () => {
    const b = new IceBall();
    expect(b.kind).toBe(BALL_KINDS.ICE);
    expect(b.cssModifier).toBe("ice");
  });

  it("freezes a clean peg for ICE_FREEZE_HITS", () => {
    const peg = new Peg();
    expect(new IceBall().applyEffectTo(peg)).toBe(true);
    expect(peg.iceHits).toBe(BALL_EFFECTS.ICE_FREEZE_HITS);
  });

  it("resets the freeze timer when peg is already iced", () => {
    const peg = new Peg();
    peg.iceHits = 1;
    new IceBall().applyEffectTo(peg);
    expect(peg.iceHits).toBe(BALL_EFFECTS.ICE_FREEZE_HITS);
  });

  it("leaves cat and boss pegs untouched", () => {
    const cat = new Peg();
    cat.type = "cat";
    const boss = new Peg();
    boss.type = "boss";
    expect(new IceBall().applyEffectTo(cat)).toBe(false);
    expect(new IceBall().applyEffectTo(boss)).toBe(false);
    expect(cat.iceHits).toBe(0);
    expect(boss.iceHits).toBe(0);
  });
});
