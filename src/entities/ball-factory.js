import { Ball } from "./ball-classic.js";
import { IceBall } from "./ball-ice.js";
import { FireBall } from "./ball-fire.js";
import { GlassBall } from "./ball-glass.js";
import { BlackBall } from "./ball-black.js";
import { ElectricalBall } from "./ball-electrical.js";

/**
 * Ball kinds — string ids used to identify a variant in saves, admin
 * spawns, and the CSS layer. The hierarchy lives in the sibling
 * `ball-*.js` files; this file is the registry that ties strings to
 * concrete classes.
 *
 * Subclasses themselves return the literal string from `get kind()` to
 * avoid a circular import (this file imports the subclasses).
 */
export const BALL_KINDS = /** @type {const} */ ({
  CLASSIC: "classic",
  ICE: "ice",
  FIRE: "fire",
  GLASS: "glass",
  BLACK: "black",
  ELECTRICAL: "electrical",
});

/** Map a `BALL_KINDS` value to its concrete class. */
const CTORS = {
  [BALL_KINDS.CLASSIC]: Ball,
  [BALL_KINDS.ICE]: IceBall,
  [BALL_KINDS.FIRE]: FireBall,
  [BALL_KINDS.GLASS]: GlassBall,
  [BALL_KINDS.BLACK]: BlackBall,
  [BALL_KINDS.ELECTRICAL]: ElectricalBall,
};

/**
 * Spawn the right Ball subclass for a given kind string. Unknown kinds
 * fall back to the classic Ball — the controller never crashes on a
 * stray string from a saved game or admin-panel typo.
 * @param {string} kind one of BALL_KINDS
 * @param {object} [opts] forwarded to the constructor
 * @returns {Ball}
 */
export function createBall(kind, opts = {}) {
  const Ctor = CTORS[kind] ?? Ball;
  return new Ctor(opts);
}
