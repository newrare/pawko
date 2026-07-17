import { PLINKO } from "../configs/constants.js";

/**
 * Compute the relative width (0..1) of each collection gate.
 *
 * The five gates (teleport_left, destroy_left, hp, destroy_right,
 * teleport_right) start at 20% each. Width reductions on the teleport
 * gates (`backReduction`) and the central HP gate (`hpReduction`) shrink
 * those gates; the freed space is redistributed evenly to the two
 * destroy gates. Sum is always 1.0.
 *
 * @param {{ backReduction?: number, hpReduction?: number }} [opts]
 * @returns {Record<string, number>}
 */
export function computeGateWidths({ backReduction = 0, hpReduction = 0 } = {}) {
  const base = 0.2;
  const backWidth = base * (1 - clamp01(backReduction));
  const hpWidth = base * (1 - clamp01(hpReduction));
  const freed = 2 * (base - backWidth) + (base - hpWidth);
  const destroyWidth = base + freed / 2;
  return {
    teleport_left: backWidth,
    destroy_left: destroyWidth,
    hp: hpWidth,
    destroy_right: destroyWidth,
    teleport_right: backWidth,
  };
}

/**
 * Resolve the cumulative left/right boundary of each gate, in the gate
 * order defined by `PLINKO.GATE_ORDER`. Returns boundaries scaled by the
 * given total width (default 1.0 — fractions).
 *
 * @param {Record<string, number>} widths  output of computeGateWidths()
 * @param {number} [totalWidth=1]
 * @returns {{ left: number, right: number }[]}
 */
export function gateBounds(widths, totalWidth = 1) {
  let cursor = 0;
  return PLINKO.GATE_ORDER.map((g) => {
    const left = cursor;
    cursor += widths[g] * totalWidth;
    return { left, right: cursor };
  });
}

/**
 * Find the gate id under a normalized x coordinate (0..1).
 *
 * @param {number} fx — normalized x in [0, 1]
 * @param {Record<string, number>} widths
 * @returns {string}
 */
export function gateAt(fx, widths) {
  let cumulative = 0;
  for (const g of PLINKO.GATE_ORDER) {
    cumulative += widths[g];
    if (fx < cumulative) return g;
  }
  return PLINKO.GATE_ORDER[PLINKO.GATE_ORDER.length - 1];
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}
