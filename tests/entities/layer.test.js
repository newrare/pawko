import { describe, it, expect } from "vitest";
import { Layer, bumperChanceForLevel } from "../../src/entities/layer.js";
import { Slot } from "../../src/entities/slot.js";
import { PLINKO } from "../../src/configs/constants.js";
import { PEG_TYPES } from "../../src/entities/peg-factory.js";

/** Deterministic RNG returning a fixed sequence. */
function seedRng(seq) {
  let i = 0;
  return () => seq[i++ % seq.length];
}

/** All valid peg type values. */
const ALL_PEG_TYPES = Object.values(PEG_TYPES);

describe("Layer", () => {
  it("fills slots in alternating pattern from startSlot", () => {
    /* rng[0] picks startSlot index inside START_SLOT_CHOICES (0 → first). */
    const layer = new Layer({
      level: 0,
      width: 200,
      y: 50,
      rng: seedRng([0, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99]),
    });
    expect(layer.startSlot).toBe(PLINKO.START_SLOT_CHOICES[0]);
    /* Every other slot starting at startSlot. */
    const indices = layer.pegs.map((p) => p.slot);
    const expected = [];
    for (let s = layer.startSlot; s < Slot.count; s += 2) expected.push(s);
    expect(indices).toEqual(expected);
  });

  it("guarantees at least one coin peg per layer", () => {
    const layer = new Layer({
      level: 0,
      width: 200,
      y: 0,
    });
    const types = layer.pegs.map((p) => p.type);
    expect(types).toContain("coin");
  });

  it("produces a variety of peg types from the spawn table", () => {
    /* With enough pegs generated over many layers, we expect variety. */
    const allTypes = new Set();
    for (let i = 0; i < 20; i++) {
      const layer = new Layer({ level: i, width: 300, y: i * 56 });
      layer.pegs.forEach((p) => allTypes.add(p.type));
    }
    /* At minimum classic and coin should appear. */
    expect(allTypes.has("peg")).toBe(true);
    expect(allTypes.has("coin")).toBe(true);
    /* Some non-classic types should also appear. */
    expect(allTypes.size).toBeGreaterThan(2);
  });

  it("all peg types produced are valid", () => {
    const layer = new Layer({ level: 5, width: 300, y: 80 });
    for (const peg of layer.pegs) {
      expect(ALL_PEG_TYPES).toContain(peg.type);
    }
  });

  it("startSlot offset shifts the pattern between layers", () => {
    /* Two layers with different start choices yield different first peg slots. */
    const a = new Layer({ level: 0, width: 200, y: 0, rng: seedRng([0, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99]) });
    const b = new Layer({ level: 0, width: 200, y: 0, rng: seedRng([0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99]) });
    /* rng[0]=0   -> floor(0 * 3) = 0 */
    /* rng[0]=.99 -> floor(.99 * 3) = 2 */
    expect(a.startSlot).not.toBe(b.startSlot);
  });

  it("positions pegs evenly across width", () => {
    const layer = new Layer({ level: 0, width: 200, y: 100 });
    for (const peg of layer.pegs) {
      expect(peg.x).toBeCloseTo(Slot.xFor(peg.slot, 200));
      expect(peg.y).toBe(100);
    }
  });
});

describe("bumperChanceForLevel", () => {
  it("starts at BUMPER_CHANCE_BASE", () => {
    expect(bumperChanceForLevel(0)).toBeCloseTo(PLINKO.BUMPER_CHANCE_BASE);
  });

  it("grows linearly with level", () => {
    const v = bumperChanceForLevel(10);
    expect(v).toBeCloseTo(
      PLINKO.BUMPER_CHANCE_BASE + 10 * PLINKO.BUMPER_CHANCE_PER_LEVEL,
    );
  });

  it("caps at BUMPER_CHANCE_MAX", () => {
    expect(bumperChanceForLevel(10000)).toBe(PLINKO.BUMPER_CHANCE_MAX);
  });
});

describe("Slot.xFor", () => {
  it("returns step/2 for slot 0", () => {
    expect(Slot.xFor(0, 200)).toBeCloseTo(200 / Slot.count / 2);
  });

  it("spaces slots evenly", () => {
    const a = Slot.xFor(0, 200);
    const b = Slot.xFor(1, 200);
    const c = Slot.xFor(2, 200);
    expect(b - a).toBeCloseTo(c - b);
  });
});
