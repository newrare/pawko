import { Peg } from "./peg-classic.js";

/**
 * DiamondPeg — drops 1 diamond per ball hit. Diamonds unlock abilities.
 * Low HP (5) so it is destroyed quickly.
 */
export class DiamondPeg extends Peg {
  constructor(opts = {}) {
    super(opts);
    this.type = "diamond";
    this._resolveHp();
  }

  consumeReward(_ball) {
    return {
      diamonds: 1,
      popHtml: `+1 <span class="pk-float-icon pk-float-icon--diamond"></span>`,
      popColor: "var(--pk-peg-diamond)",
    };
  }
}
