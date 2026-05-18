import { Ball } from "./ball-classic.js";

/**
 * BlackBall — destructive ball that consumes any peg it touches without
 * awarding score. Coin pegs are still handled by their own reward hook
 * (the peg's `consumeReward` runs before this consumption).
 */
export class BlackBall extends Ball {
  get kind() {
    return "black";
  }

  get cssModifier() {
    return "black";
  }

  consumesPeg(_peg) {
    return true;
  }
}
