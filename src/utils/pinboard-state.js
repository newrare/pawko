import { Layer } from "../entities/layer.js";
import { Slot } from "../entities/slot.js";
import { createPeg, PEG_TYPES } from "../entities/peg-factory.js";
import { PLINKO } from "../configs/constants.js";
import { saveManager } from "../managers/save-manager.js";

/**
 * Build the default pinboard — all classic pegs, alternating stagger.
 * Used the first time the player enters the game (no saved state yet).
 * @param {{ levelId: number, width: number }} opts
 * @returns {Layer[]}
 */
export function buildDefaultPinboard({ levelId, width }) {
  const w = width || 320;
  const layers = [];
  for (let i = 0; i < PLINKO.INITIAL_LAYERS; i++) {
    const layer = new Layer({ level: levelId, width: w, y: 0 });
    /* Override the generated pegs with a deterministic classic-only
       layout. Alternating stagger between layers preserves the weaving
       pattern that makes balls bounce through the grid. */
    layer.startSlot = i % 2;
    layer.pegs = [];
    for (let s = layer.startSlot; s < Slot.count; s += 2) {
      const x = Slot.xFor(s, w);
      layer.pegs.push(createPeg(PEG_TYPES.CLASSIC, { x, y: 0, slot: s }));
    }
    layers.push(layer);
  }
  return layers;
}

/**
 * Rebuild Layer instances from a serialized pinboard state.
 * @param {{ layers: Array<{ startSlot?: number, pegs: Array<{ slot: number, type: string }> }> }} saved
 * @param {{ levelId: number, width: number }} opts
 * @returns {Layer[]}
 */
export function hydratePinboard(saved, { levelId, width }) {
  const w = width || 320;
  const layers = [];
  for (let i = 0; i < saved.layers.length; i++) {
    const data = saved.layers[i];
    const layer = new Layer({ level: levelId, width: w, y: 0 });
    layer.startSlot = data.startSlot ?? i % 2;
    layer.pegs = [];
    for (const entry of data.pegs ?? []) {
      const x = Slot.xFor(entry.slot, w);
      layer.pegs.push(createPeg(entry.type, { x, y: 0, slot: entry.slot }));
    }
    layers.push(layer);
  }
  return layers;
}

/**
 * Load the current pinboard from save storage or build the default one.
 * Returns `{ layers, fromSave }` so the caller can decide whether to
 * persist back (only the default needs an initial save).
 * @param {{ levelId: number, width: number }} opts
 * @returns {{ layers: Layer[], fromSave: boolean }}
 */
export function loadPinboard(opts) {
  const saved = saveManager.loadPinboardState();
  if (saved?.layers?.length) {
    return { layers: hydratePinboard(saved, opts), fromSave: true };
  }
  return { layers: buildDefaultPinboard(opts), fromSave: false };
}

/**
 * Persist the current pinboard layout so it survives between levels.
 * @param {Layer[]} layers
 */
export function persistPinboard(layers) {
  const state = {
    layers: layers.map((layer) => ({
      startSlot: layer.startSlot,
      pegs: layer.pegs.map((p) => ({ slot: p.slot, type: p.type })),
    })),
  };
  saveManager.savePinboardState(state);
}
