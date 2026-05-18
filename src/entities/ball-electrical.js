import { Ball } from "./ball-classic.js";

/**
 * ElectricalBall — electrifies pegs it touches. Two electrified pegs on
 * the same layer form a live arc when their centres lie within
 * `ELECTRIC_ARC_MAX_DIST`. A ball that crosses an arc triggers a combo.
 *
 * The controller must refresh its arc cache after every successful
 * electrification — see `triggersArcRefresh`.
 */
export class ElectricalBall extends Ball {
  get kind() {
    return "electrical";
  }

  get cssModifier() {
    return "electrical";
  }

  get triggersArcRefresh() {
    return true;
  }

  applyEffectTo(peg) {
    if (peg.electrified) return false;
    peg.electrified = true;
    return true;
  }
}
