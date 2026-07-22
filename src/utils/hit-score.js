import { EFFECT_HIT_SCORE } from "../configs/constants.js";

/**
 * Adjust a peg's base hit-score points by the effects active on the ball that
 * hit it. Additive bonuses (e.g. fire +5, ice +10) are summed first, then the
 * multiplicative factors (e.g. electrical ×2) are applied:
 *
 *   Math.round((base + Σadd) × Πmult)
 *
 * Effects with no `EFFECT_HIT_SCORE` entry leave the score untouched, and a
 * non-positive base (reward pegs) is returned as-is.
 *
 * @param {number} base — the peg's base points
 * @param {Iterable<string>} [effectIds=[]] — active effect ids on the ball
 * @returns {number} the adjusted points
 */
export function adjustHitScore(base, effectIds = []) {
  if (base <= 0) return base;
  let add = 0;
  let mult = 1;
  for (const id of effectIds) {
    const mod = EFFECT_HIT_SCORE[id];
    if (!mod) continue;
    if (mod.add) add += mod.add;
    if (mod.mult) mult *= mod.mult;
  }
  return Math.round((base + add) * mult);
}
