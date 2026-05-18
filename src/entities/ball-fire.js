import { Ball } from "./ball-classic.js";

/**
 * FireBall — burns any peg it touches. Burned pegs award half their base
 * score. Fire instantly melts any ice already on the peg.
 */
export class FireBall extends Ball {
  get kind() {
    return "fire";
  }

  get cssModifier() {
    return "fire";
  }

  applyEffectTo(peg) {
    let changed = false;
    if (!peg.burned) {
      peg.burned = true;
      changed = true;
    }
    if (peg.iceHits > 0) {
      peg.iceHits = 0;
      changed = true;
    }
    return changed;
  }
}
