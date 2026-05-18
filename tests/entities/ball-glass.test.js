import { describe, it, expect } from "vitest";
import { GlassBall } from "../../src/entities/ball-glass.js";
import { Peg } from "../../src/entities/peg-classic.js";
import { BALL_EFFECTS } from "../../src/configs/constants.js";
import { BALL_KINDS } from "../../src/entities/ball-factory.js";

describe("GlassBall", () => {
  it("reports its kind and css modifier", () => {
    const b = new GlassBall();
    expect(b.kind).toBe(BALL_KINDS.GLASS);
    expect(b.cssModifier).toBe("glass");
    expect(b.glassHits).toBe(0);
  });

  it("does not apply any side-effect to the peg", () => {
    const peg = new Peg();
    expect(new GlassBall().applyEffectTo(peg)).toBe(false);
    expect(peg.iceHits).toBe(0);
    expect(peg.burned).toBe(false);
  });

  it("increments glassHits on each contact and stays alive while under cap", () => {
    const b = new GlassBall();
    for (let i = 0; i < BALL_EFFECTS.GLASS_MAX_HITS - 1; i++) {
      expect(b.onBeforeContact(new Peg())).toBe("alive");
    }
    expect(b.glassHits).toBe(BALL_EFFECTS.GLASS_MAX_HITS - 1);
  });

  it("shatters on the contact that reaches GLASS_MAX_HITS", () => {
    const b = new GlassBall();
    b.glassHits = BALL_EFFECTS.GLASS_MAX_HITS - 1;
    expect(b.onBeforeContact(new Peg())).toBe("shatter");
    expect(b.glassHits).toBe(BALL_EFFECTS.GLASS_MAX_HITS);
    expect(b.shouldShatter).toBe(true);
  });

  it("crackStage is 0 while remaining hits exceed CRACK_STAGES", () => {
    const b = new GlassBall();
    expect(b.crackStage).toBe(0);
    b.glassHits = BALL_EFFECTS.GLASS_MAX_HITS - BALL_EFFECTS.GLASS_CRACK_STAGES - 1;
    expect(b.crackStage).toBe(0);
  });

  it("escalates crackStage as hits accumulate", () => {
    const b = new GlassBall();
    b.glassHits = BALL_EFFECTS.GLASS_MAX_HITS - 1;
    expect(b.crackStage).toBe(BALL_EFFECTS.GLASS_CRACK_STAGES);
    b.glassHits = BALL_EFFECTS.GLASS_MAX_HITS - 2;
    expect(b.crackStage).toBe(BALL_EFFECTS.GLASS_CRACK_STAGES - 1);
  });
});
