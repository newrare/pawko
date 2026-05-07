import { describe, it, expect } from "vitest";
import { Layer, bumperChanceForLevel } from "../../src/entities/layer.js";
import { Slot } from "../../src/entities/slot.js";
import { PLINKO } from "../../src/configs/constants.js";

/** Deterministic RNG returning a fixed sequence. */
function seedRng(seq) {
  let i = 0;
  return () => seq[i++ % seq.length];
}

describe("Layer", () => {
  it("fills slots in alternating pattern from startSlot", () => {
    /* rng[0] picks startSlot index inside START_SLOT_CHOICES (0 → first). */
    const layer = new Layer({
      level: 0,
      width: 200,
      y: 50,
      bumperChance: 0,
      coinChance: 0,
      rng: seedRng([0, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99]),
    });
    expect(layer.startSlot).toBe(PLINKO.START_SLOT_CHOICES[0]);
    /* Every other slot starting at startSlot. */
    const indices = layer.pegs.map((p) => p.slot);
    const expected = [];
    for (let s = layer.startSlot; s < Slot.count; s += 2) expected.push(s);
    expect(indices).toEqual(expected);
  });

  it("produces only pegs when bumperChance=0 and coinChance=0", () => {
    const layer = new Layer({
      level: 0,
      width: 200,
      y: 0,
      bumperChance: 0,
      coinChance: 0,
    });
    const types = new Set(layer.pegs.map((p) => p.type));
    expect(types).toEqual(new Set(["peg"]));
  });

  it("produces only bumpers when bumperChance=1", () => {
    const layer = new Layer({ level: 0, width: 200, y: 0, bumperChance: 1 });
    const types = new Set(layer.pegs.map((p) => p.type));
    expect(types).toEqual(new Set(["bumper"]));
  });

  it("produces only coin pegs when bumperChance=0 and coinChance=1", () => {
    const layer = new Layer({
      level: 0,
      width: 200,
      y: 0,
      bumperChance: 0,
      coinChance: 1,
    });
    const types = new Set(layer.pegs.map((p) => p.type));
    expect(types).toEqual(new Set(["coin"]));
  });

  it("produces a mix of pegs/bumpers/coins with intermediate chances", () => {
    const layer = new Layer({
      level: 5,
      width: 300,
      y: 80,
      bumperChance: 0.3,
      coinChance: 0.3,
    });
    const types = new Set(layer.pegs.map((p) => p.type));
    for (const t of types) {
      expect(["peg", "bumper", "coin"]).toContain(t);
    }
  });

  it("startSlot offset shifts the pattern between layers", () => {
    /* Two layers with different start choices yield different first peg slots. */
    const a = new Layer({ level: 0, width: 200, y: 0, bumperChance: 0, coinChance: 0, rng: seedRng([0, 0.99]) });
    const b = new Layer({ level: 0, width: 200, y: 0, bumperChance: 0, coinChance: 0, rng: seedRng([0.99, 0.99]) });
    /* rng[0]=0   -> floor(0 * 3) = 0 */
    /* rng[0]=.99 -> floor(.99 * 3) = 2 */
    expect(a.startSlot).not.toBe(b.startSlot);
  });

  it("positions pegs evenly across width", () => {
    const layer = new Layer({ level: 0, width: 200, y: 100, bumperChance: 0, coinChance: 0 });
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
