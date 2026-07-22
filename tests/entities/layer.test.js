import { describe, it, expect } from "vitest";
import { Layer } from "../../src/entities/layer.js";
import { Slot } from "../../src/entities/slot.js";
import { PLINKO } from "../../src/configs/constants.js";
import { PEG_TYPES } from "../../src/entities/peg-factory.js";

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
      rng: seedRng([
        0, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99,
      ]),
    });
    expect(layer.startSlot).toBe(PLINKO.START_SLOT_CHOICES[0]);
    /* Every other slot starting at startSlot, minus edge pegs closer to a
       wall than the required clearance. */
    const width = 200;
    const edgeMargin = Math.max(
      PLINKO.PEG_RADIUS,
      width * PLINKO.PEG_EDGE_MARGIN_RATIO,
    );
    const indices = layer.pegs.map((p) => p.slot);
    const expected = [];
    for (let s = layer.startSlot; s < Slot.count; s += 2) {
      const x = Slot.xFor(s, width);
      if (x < edgeMargin || x > width - edgeMargin) continue;
      expected.push(s);
    }
    expect(indices).toEqual(expected);
  });

  it("drops pegs that sit too close to the board walls", () => {
    /* Slot 0 (2.5% from the left) and slot 19 (2.5% from the right) fall
       inside the 5% clearance and are removed on any width. */
    for (const width of [200, 400, 940]) {
      const layer = new Layer({ level: 0, width, y: 0, rng: seedRng([0]) });
      const edgeMargin = Math.max(
        PLINKO.PEG_RADIUS,
        width * PLINKO.PEG_EDGE_MARGIN_RATIO,
      );
      for (const peg of layer.pegs) {
        expect(peg.x).toBeGreaterThanOrEqual(edgeMargin);
        expect(peg.x).toBeLessThanOrEqual(width - edgeMargin);
      }
      const slots = layer.pegs.map((p) => p.slot);
      expect(slots).not.toContain(0);
      expect(slots).not.toContain(Slot.count - 1);
    }
  });

  it("all pegs are classic (player defines special types via radial menu)", () => {
    for (let level = 0; level < 5; level++) {
      const layer = new Layer({ level, width: 300, y: level * 56 });
      for (const peg of layer.pegs) {
        expect(peg.type).toBe(PEG_TYPES.CLASSIC);
      }
    }
  });

  it("startSlot offset shifts the pattern between layers", () => {
    /* Two layers with different start choices yield different first peg slots. */
    const a = new Layer({
      level: 0,
      width: 200,
      y: 0,
      rng: seedRng([
        0, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99,
      ]),
    });
    const b = new Layer({
      level: 0,
      width: 200,
      y: 0,
      rng: seedRng([
        0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99,
      ]),
    });
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

describe("Slot.isClear", () => {
  it("rejects slots within the edge margin, accepts inner slots", () => {
    const width = 940;
    /* 10% margin → slots 0,1 (left) and 18,19 (right) are too close. */
    expect(Slot.isClear(0, width)).toBe(false);
    expect(Slot.isClear(1, width)).toBe(false);
    expect(Slot.isClear(2, width)).toBe(true);
    expect(Slot.isClear(Slot.count - 1, width)).toBe(false);
    expect(Slot.isClear(Slot.count - 2, width)).toBe(false);
    expect(Slot.isClear(Slot.count - 3, width)).toBe(true);
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
