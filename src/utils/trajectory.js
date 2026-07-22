import { collideCircles, reflect } from "./physics.js";

/**
 * @typedef {object} TrajPeg
 * @property {number} x
 * @property {number} y
 * @property {number} radius
 * @property {number} restitution
 */

/**
 * @typedef {object} TrajOptions
 * @property {number} x — start x (pinboard space)
 * @property {number} y — start y
 * @property {number} vx — initial velocity x
 * @property {number} vy — initial velocity y
 * @property {number} width — pinboard width (left/right walls at 0 / width)
 * @property {number} height — ball is considered gone below this y
 * @property {number} gravity — px/s²
 * @property {number} ballRadius
 * @property {number} wallRestitution
 * @property {TrajPeg[]} [pegs] — pegs to bounce off (positions in pinboard space)
 * @property {number} [maxBounces] — stop once this many bounces have happened
 * @property {number} [maxSteps]
 * @property {number} [dt] — integration step (s)
 * @property {number} [sampleSpacing] — min px between two output points
 */

/**
 * @typedef {object} TrajResult
 * @property {Array<{ x: number, y: number }>} points — sampled path points
 * @property {number} bounces — number of bounces registered
 * @property {'bottom' | 'bounces' | 'steps'} stopReason
 */

/**
 * Simulate a launched ball's parabolic flight and return sampled points for a
 * dashed preview line. Mirrors the real substep physics (gravity, wall
 * reflection, peg reflection) closely enough that the preview matches the
 * actual shot. The simulation stops when one more bounce than `maxBounces`
 * would occur, when the ball drops below `height`, or when `maxSteps` is hit.
 *
 * Pure — no DOM, no shared state — so it is fully unit-testable.
 *
 * @param {TrajOptions} opts
 * @returns {TrajResult}
 */
export function simulateTrajectory({
  x,
  y,
  vx,
  vy,
  width,
  height,
  gravity,
  ballRadius,
  wallRestitution,
  pegs = [],
  maxBounces = 2,
  maxSteps = 420,
  dt = 1 / 120,
  sampleSpacing = 15,
}) {
  const r = ballRadius;
  /** @type {Array<{ x: number, y: number }>} */
  const points = [{ x, y }];
  let lastSx = x;
  let lastSy = y;
  let bounces = 0;
  /** @type {'bottom' | 'bounces' | 'steps'} */
  let stopReason = "steps";
  /* Peg ids in contact during the current frame — mirrors the ball's
     recentPegs de-dup so a multi-frame overlap counts as a single bounce. */
  const recent = new Set();
  /* y-window used to skip far-away pegs, matching the controller's check. */
  const pegWindow = 60;

  for (let step = 0; step < maxSteps; step++) {
    vy += gravity * dt;
    x += vx * dt;
    y += vy * dt;

    /* Walls. */
    if (x - r < 0) {
      x = r;
      vx = Math.abs(vx) * wallRestitution;
      bounces += 1;
    } else if (x + r > width) {
      x = width - r;
      vx = -Math.abs(vx) * wallRestitution;
      bounces += 1;
    }

    /* Pegs — first contact only per step, de-duplicated across frames. */
    for (let i = 0; i < pegs.length; i++) {
      const peg = pegs[i];
      if (Math.abs(peg.y - y) > pegWindow) continue;
      const c = collideCircles(x, y, r, peg.x, peg.y, peg.radius);
      if (!c) {
        recent.delete(peg.id ?? i);
        continue;
      }
      x += c.nx * c.depth;
      y += c.ny * c.depth;
      const rv = reflect(vx, vy, c.nx, c.ny, peg.restitution);
      vx = rv.vx;
      vy = rv.vy;
      const key = peg.id ?? i;
      if (!recent.has(key)) {
        recent.add(key);
        bounces += 1;
      }
    }

    /* Sample the path at a fixed spatial cadence. */
    const dsx = x - lastSx;
    const dsy = y - lastSy;
    if (dsx * dsx + dsy * dsy >= sampleSpacing * sampleSpacing) {
      points.push({ x, y });
      lastSx = x;
      lastSy = y;
    }

    /* Stop conditions. */
    if (bounces > maxBounces) {
      points.push({ x, y });
      stopReason = "bounces";
      break;
    }
    if (y - r > height) {
      points.push({ x, y });
      stopReason = "bottom";
      break;
    }
  }

  return { points, bounces, stopReason };
}
