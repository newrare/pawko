import { Layer } from "../entities/layer.js";
import { Slot } from "../entities/slot.js";
import { createPeg, PEG_TYPES } from "../entities/peg-factory.js";
import { PLINKO } from "../configs/constants.js";

/**
 * Build a test pinboard for the dev admin panel. Rows alternate
 * `startSlot` (0/1) to produce the staggered pattern that forces
 * ball/peg collisions.
 *
 * @param {string} filter — "all" produces one row per peg type; any
 *                          specific PEG_TYPES value fills INITIAL_LAYERS
 *                          rows with only that peg.
 * @param {number} width — pinboard width in CSS px (fallback 320)
 * @returns {Layer[]}
 */
export function buildTestLayers(filter, width) {
  const allTypes = Object.values(PEG_TYPES);
  const isSingle = filter !== "all" && allTypes.includes(filter);
  const w = width || 320;
  const rowCount = isSingle ? PLINKO.INITIAL_LAYERS : allTypes.length;

  const layers = [];
  for (let row = 0; row < rowCount; row++) {
    const type = isSingle ? filter : allTypes[row];
    const layer = new Layer({ level: 1, width: w, y: 0 });
    layer.pegs = [];
    const startSlot = row % 2;
    for (let i = startSlot; i < Slot.count; i += 2) {
      if (!Slot.isClear(i, w)) continue;
      const x = Slot.xFor(i, w);
      layer.pegs.push(createPeg(type, { x, y: 0, slot: i }));
    }
    layers.push(layer);
  }
  return layers;
}
