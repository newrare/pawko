import { Ball } from "./ball-classic.js";

/**
 * Ball kinds — string ids used to identify a variant in saves, admin
 * spawns, and the CSS layer. Only `CLASSIC` exists for now; add new
 * entries here together with their concrete class as variants come.
 */
export const BALL_KINDS = /** @type {const} */ ({
  CLASSIC: "classic",
});

/** Map a `BALL_KINDS` value to its concrete class. */
const CTORS = {
  [BALL_KINDS.CLASSIC]: Ball,
};

/**
 * Spawn the right Ball subclass for a given kind string. Unknown kinds
 * fall back to the classic Ball so a stray string from a saved game or
 * admin-panel typo never crashes the controller.
 * @param {string} kind one of BALL_KINDS
 * @param {object} [opts] forwarded to the constructor
 * @returns {Ball}
 */
export function createBall(kind, opts = {}) {
  const Ctor = CTORS[kind] ?? Ball;
  return new Ctor(opts);
}
