/**
 * How many new balls may be created without exceeding the pinboard cap.
 *
 * Balls still loaded in the cannon are counted in advance: the player will
 * launch them and we cannot block firing, so the only lever is refusing to
 * CREATE extra balls (chest release, etc.) once the projected population
 * (live on the board + cannon reserve) reaches the cap.
 *
 * @param {number} requested — how many balls we would like to spawn
 * @param {number} live — balls currently on the pinboard
 * @param {number} cannonReserve — balls still loaded in the cannon
 * @param {number} max — the pinboard cap (PLINKO.MAX_PINBOARD_BALLS)
 * @returns {number} how many to actually spawn, in [0, requested]
 */
export function spawnableBalls(requested, live, cannonReserve, max) {
  const headroom = max - (live + cannonReserve);
  return Math.min(Math.max(0, Math.floor(requested)), Math.max(0, headroom));
}
