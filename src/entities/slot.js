import { PLINKO } from "../configs/constants.js";

/**
 * Slot — horizontal index inside a layer (0..SLOTS_PER_LAYER-1).
 * Pure helpers — no entity instance is needed. See `docs/SLOT.md`.
 */
export const Slot = {
  /** Total slots in any layer. */
  count: PLINKO.SLOTS_PER_LAYER,

  /**
   * Convert a slot index to its centered x position inside `width` px.
   * @param {number} index
   * @param {number} width
   * @returns {number}
   */
  xFor(index, width) {
    /* index 0 falls at the half-step from the left edge so the row is
       symmetrically inset, matching the reference Plinko layout. */
    const step = width / PLINKO.SLOTS_PER_LAYER;
    return step / 2 + index * step;
  },
};
