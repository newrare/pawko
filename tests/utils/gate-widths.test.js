import { describe, it, expect } from "vitest";
import { computeGateWidths, gateBounds, gateAt } from "../../src/utils/gate-widths.js";
import { PLINKO } from "../../src/configs/constants.js";

const EPS = 1e-9;

const sum = (obj) =>
  Object.values(obj).reduce((s, v) => s + v, 0);

describe("computeGateWidths", () => {
  it("returns uniform 20% for each gate when no reduction is active", () => {
    const w = computeGateWidths();
    expect(w.teleport_left).toBeCloseTo(0.2);
    expect(w.teleport_right).toBeCloseTo(0.2);
    expect(w.hp).toBeCloseTo(0.2);
    expect(w.destroy_left).toBeCloseTo(0.2);
    expect(w.destroy_right).toBeCloseTo(0.2);
  });

  it("shrinks the HP gate and grows destroy gates when hpReduction is positive", () => {
    const w = computeGateWidths({ hpReduction: 0.10 });
    expect(w.hp).toBeCloseTo(0.18);
    expect(w.teleport_left).toBeCloseTo(0.2);
    expect(w.teleport_right).toBeCloseTo(0.2);
    expect(w.destroy_left).toBeCloseTo(0.21);
    expect(w.destroy_right).toBeCloseTo(0.21);
  });

  it("shrinks teleport gates and grows destroy gates when backReduction is positive", () => {
    const w = computeGateWidths({ backReduction: 0.10 });
    expect(w.teleport_left).toBeCloseTo(0.18);
    expect(w.teleport_right).toBeCloseTo(0.18);
    expect(w.hp).toBeCloseTo(0.2);
    expect(w.destroy_left).toBeCloseTo(0.22);
    expect(w.destroy_right).toBeCloseTo(0.22);
  });

  it("combines both reductions while keeping the total = 1.0", () => {
    const cases = [
      {},
      { backReduction: 0.05 },
      { backReduction: 0.10 },
      { hpReduction: 0.05 },
      { hpReduction: 0.10 },
      { backReduction: 0.10, hpReduction: 0.10 },
    ];
    for (const c of cases) {
      const w = computeGateWidths(c);
      expect(Math.abs(sum(w) - 1)).toBeLessThan(EPS);
    }
  });

  it("clamps negative or out-of-range reductions safely", () => {
    const negative = computeGateWidths({ hpReduction: -0.5 });
    expect(negative.hp).toBeCloseTo(0.2);
    const tooLarge = computeGateWidths({ hpReduction: 5 });
    expect(tooLarge.hp).toBeCloseTo(0);
    expect(Math.abs(sum(tooLarge) - 1)).toBeLessThan(EPS);
  });
});

describe("gateBounds", () => {
  it("returns cumulative left/right per gate scaled by totalWidth", () => {
    const widths = computeGateWidths();
    const bounds = gateBounds(widths, 1000);
    expect(bounds).toHaveLength(PLINKO.GATE_ORDER.length);
    expect(bounds[0].left).toBe(0);
    expect(bounds[bounds.length - 1].right).toBeCloseTo(1000);
    for (let i = 1; i < bounds.length; i++) {
      expect(bounds[i].left).toBeCloseTo(bounds[i - 1].right);
    }
  });
});

describe("gateAt", () => {
  it("maps fx=0.5 to the central hp gate by default", () => {
    expect(gateAt(0.5, computeGateWidths())).toBe("hp");
  });

  it("returns the leftmost teleport at fx=0.05", () => {
    expect(gateAt(0.05, computeGateWidths())).toBe("teleport_left");
  });

  it("returns the rightmost teleport at fx=0.95", () => {
    expect(gateAt(0.95, computeGateWidths())).toBe("teleport_right");
  });

  it("hp gate shrinks with hpReduction, destroy gates absorb the freed width", () => {
    /* hpReduction=0.10 → hp width = 0.18, destroy gates widen to 0.21 each.
       Cumulative boundaries: 0.20 | 0.41 | 0.59 | 0.80 | 1.00. */
    const widths = computeGateWidths({ hpReduction: 0.10 });
    expect(gateAt(0.40, widths)).toBe("destroy_left");
    expect(gateAt(0.42, widths)).toBe("hp");
    expect(gateAt(0.58, widths)).toBe("hp");
    expect(gateAt(0.60, widths)).toBe("destroy_right");
    expect(gateAt(0.5, widths)).toBe("hp");
  });
});
