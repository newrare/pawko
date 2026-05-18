import { describe, it, expect } from "vitest";
import { ElectricalBall } from "../../src/entities/ball-electrical.js";
import { Peg } from "../../src/entities/peg-classic.js";
import { BALL_KINDS } from "../../src/entities/ball-factory.js";

describe("ElectricalBall", () => {
  it("reports its kind and css modifier", () => {
    const b = new ElectricalBall();
    expect(b.kind).toBe(BALL_KINDS.ELECTRICAL);
    expect(b.cssModifier).toBe("electrical");
    expect(b.triggersArcRefresh).toBe(true);
  });

  it("electrifies a clean peg, idempotent on a second contact", () => {
    const peg = new Peg();
    expect(new ElectricalBall().applyEffectTo(peg)).toBe(true);
    expect(peg.electrified).toBe(true);
    expect(new ElectricalBall().applyEffectTo(peg)).toBe(false);
  });
});
