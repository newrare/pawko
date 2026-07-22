import { describe, it, expect } from "vitest";
import {
  computeGateWidths,
  gateBounds,
  gateAt,
} from "../../src/utils/gate-widths.js";
import { PLINKO } from "../../src/configs/constants.js";

const EPS = 1e-9;

const sum = (obj) => Object.values(obj).reduce((s, v) => s + v, 0);

describe("computeGateWidths", () => {
  it("returns uniform 20% for each gate when no reduction is active", () => {
    const w = computeGateWidths();
    expect(w.x1_left).toBeCloseTo(0.2);
    expect(w.x1_right).toBeCloseTo(0.2);
    expect(w.return).toBeCloseTo(0.2);
    expect(w.x2_left).toBeCloseTo(0.2);
    expect(w.x2_right).toBeCloseTo(0.2);
  });

  it("shrinks the return gate and grows x2 gates when hpReduction is positive", () => {
    const w = computeGateWidths({ hpReduction: 0.1 });
    expect(w.return).toBeCloseTo(0.18);
    expect(w.x1_left).toBeCloseTo(0.2);
    expect(w.x1_right).toBeCloseTo(0.2);
    expect(w.x2_left).toBeCloseTo(0.21);
    expect(w.x2_right).toBeCloseTo(0.21);
  });

  it("shrinks x1 edge gates and grows x2 gates when backReduction is positive", () => {
    const w = computeGateWidths({ backReduction: 0.1 });
    expect(w.x1_left).toBeCloseTo(0.18);
    expect(w.x1_right).toBeCloseTo(0.18);
    expect(w.return).toBeCloseTo(0.2);
    expect(w.x2_left).toBeCloseTo(0.22);
    expect(w.x2_right).toBeCloseTo(0.22);
  });

  it("combines both reductions while keeping the total = 1.0", () => {
    const cases = [
      {},
      { backReduction: 0.05 },
      { backReduction: 0.1 },
      { hpReduction: 0.05 },
      { hpReduction: 0.1 },
      { backReduction: 0.1, hpReduction: 0.1 },
    ];
    for (const c of cases) {
      const w = computeGateWidths(c);
      expect(Math.abs(sum(w) - 1)).toBeLessThan(EPS);
    }
  });

  it("clamps negative or out-of-range reductions safely", () => {
    const negative = computeGateWidths({ hpReduction: -0.5 });
    expect(negative.return).toBeCloseTo(0.2);
    const tooLarge = computeGateWidths({ hpReduction: 5 });
    expect(tooLarge.return).toBeCloseTo(0);
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
  it("maps fx=0.5 to the central return gate by default", () => {
    expect(gateAt(0.5, computeGateWidths())).toBe("return");
  });

  it("returns the leftmost x1 gate at fx=0.05", () => {
    expect(gateAt(0.05, computeGateWidths())).toBe("x1_left");
  });

  it("returns the rightmost x1 gate at fx=0.95", () => {
    expect(gateAt(0.95, computeGateWidths())).toBe("x1_right");
  });

  it("return gate shrinks with hpReduction, x2 gates absorb the freed width", () => {
    /* hpReduction=0.10 → return width = 0.18, x2 gates widen to 0.21 each.
       Cumulative boundaries: 0.20 | 0.41 | 0.59 | 0.80 | 1.00. */
    const widths = computeGateWidths({ hpReduction: 0.1 });
    expect(gateAt(0.4, widths)).toBe("x2_left");
    expect(gateAt(0.42, widths)).toBe("return");
    expect(gateAt(0.58, widths)).toBe("return");
    expect(gateAt(0.6, widths)).toBe("x2_right");
    expect(gateAt(0.5, widths)).toBe("return");
  });
});
