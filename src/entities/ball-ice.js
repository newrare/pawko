import { Ball } from "./ball-classic.js";
import { BALL_EFFECTS } from "../configs/constants.js";

/**
 * IceBall — freezes any peg it touches for `ICE_FREEZE_HITS` subsequent
 * hits. While frozen, a peg awards no points (the hit only counts toward
 * thawing). Cat / boss pegs are immune by design.
 */
export class IceBall extends Ball {
  get kind() {
    return "ice";
  }

  get cssModifier() {
    return "ice";
  }

  applyEffectTo(peg) {
    if (peg.type === "cat" || peg.type === "boss") return false;
    peg.iceHits = BALL_EFFECTS.ICE_FREEZE_HITS;
    return true;
  }
}
