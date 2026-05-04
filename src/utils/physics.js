/**
 * Pure physics helpers for the Plinko ball simulation. No DOM, no state —
 * the controller owns the world and feeds these functions every step.
 */

/**
 * Detect a circle-vs-circle collision and return the contact normal.
 * @param {number} ax
 * @param {number} ay
 * @param {number} ar
 * @param {number} bx
 * @param {number} by
 * @param {number} br
 * @returns {{ nx: number, ny: number, depth: number, dist: number } | null}
 */
export function collideCircles(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  const dist = Math.sqrt(d2) || 1e-6;
  return {
    nx: dx / dist,
    ny: dy / dist,
    depth: r - dist,
    dist,
  };
}

/**
 * Reflect velocity (vx,vy) across a unit normal (nx,ny) and apply
 * restitution. Returns the new velocity and does nothing when the velocity
 * already points away from the normal (avoids sticking on multi-frame
 * overlap).
 * @param {number} vx
 * @param {number} vy
 * @param {number} nx
 * @param {number} ny
 * @param {number} restitution
 * @returns {{ vx: number, vy: number }}
 */
export function reflect(vx, vy, nx, ny, restitution) {
  const dot = vx * nx + vy * ny;
  if (dot >= 0) return { vx, vy };
  return {
    vx: vx - (1 + restitution) * dot * nx,
    vy: vy - (1 + restitution) * dot * ny,
  };
}

/**
 * Clamp the magnitude of a 2D vector to `max`.
 * @param {number} vx
 * @param {number} vy
 * @param {number} max
 * @returns {{ vx: number, vy: number }}
 */
export function clampVelocity(vx, vy, max) {
  const m2 = vx * vx + vy * vy;
  if (m2 <= max * max) return { vx, vy };
  const m = Math.sqrt(m2);
  return { vx: (vx / m) * max, vy: (vy / m) * max };
}
