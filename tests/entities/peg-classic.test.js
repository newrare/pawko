import { describe, it, expect } from "vitest";
import { Peg } from "../../src/entities/peg-classic.js";
import { Bumper } from "../../src/entities/peg-bumper.js";
import { PLINKO } from "../../src/configs/constants.js";

describe("Peg", () => {
  it("has correct type, radius and slot", () => {
    const p = new Peg({ x: 1, y: 2, slot: 5 });
    expect(p.type).toBe("peg");
    expect(p.radius).toBe(PLINKO.PEG_RADIUS);
    expect(p.slot).toBe(5);
  });

  it("consumeReward returns null by default", () => {
    expect(new Peg().consumeReward(null)).toBeNull();
  });

  it("takeDamage decrements hp and reports death", () => {
    const p = new Peg();
    const initial = p.hp;
    for (let i = 0; i < initial - 1; i++) expect(p.takeDamage(1)).toBe(false);
    expect(p.takeDamage(1)).toBe(true);
    expect(p.isDestroyed).toBe(true);
  });
});

describe("Bumper", () => {
  it("has correct type, radius and higher restitution than Peg", () => {
    const b = new Bumper({ x: 1, y: 2, slot: 8 });
    expect(b.type).toBe("bumper");
    expect(b.radius).toBe(PLINKO.BUMPER_RADIUS);
    expect(b.restitution).toBeGreaterThan(new Peg().restitution);
  });
});
