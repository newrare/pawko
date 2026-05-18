/**
 * Clamp a value between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between a and b.
 * @param {number} a
 * @param {number} b
 * @param {number} t  in [0, 1]
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Random integer in [min, max] (inclusive).
 * @param {number} min
 * @param {number} max
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Fisher-Yates shuffle (in place).
 * @template T
 * @param {T[]} array
 * @returns {T[]}
 */
export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Pick a value from a weighted list. Weights must sum to ~1.
 * @template T
 * @param {T[]} values
 * @param {number[]} weights
 * @returns {T}
 */
export function weightedPick(values, weights) {
  const roll = Math.random();
  let cumulative = 0;
  for (let i = 0; i < values.length; i++) {
    cumulative += weights[i];
    if (roll < cumulative) return values[i];
  }
  return values[values.length - 1];
}

/**
 * Shortest distance between point (px, py) and segment a–b.
 * Used by the electric-arc combo detection.
 * @param {number} px @param {number} py
 * @param {number} ax @param {number} ay
 * @param {number} bx @param {number} by
 * @returns {number}
 */
export function pointSegmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    const ex = px - ax;
    const ey = py - ay;
    return Math.sqrt(ex * ex + ey * ey);
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  const ex = px - cx;
  const ey = py - cy;
  return Math.sqrt(ex * ex + ey * ey);
}
