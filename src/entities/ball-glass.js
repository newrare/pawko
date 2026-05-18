import { Ball } from "./ball-classic.js";
import { BALL_EFFECTS } from "../configs/constants.js";

/**
 * GlassBall — fragile ball that shatters after `GLASS_MAX_HITS` peg
 * contacts. As the cap nears, a visual crack overlay escalates through
 * `GLASS_CRACK_STAGES` stages. No side-effect on the peg.
 */
export class GlassBall extends Ball {
  /** @type {number} Peg contacts taken so far. */
  glassHits = 0;

  get kind() {
    return "glass";
  }

  get cssModifier() {
    return "glass";
  }

  /**
   * Crack stage (1..N) currently visible, or 0 while the ball is still
   * intact. Pure derivation from `glassHits`.
   * @returns {number}
   */
  get crackStage() {
    const remaining = BALL_EFFECTS.GLASS_MAX_HITS - this.glassHits;
    if (remaining <= 0) return BALL_EFFECTS.GLASS_CRACK_STAGES;
    if (remaining > BALL_EFFECTS.GLASS_CRACK_STAGES) return 0;
    return BALL_EFFECTS.GLASS_CRACK_STAGES - remaining + 1;
  }

  /** Whether the ball has reached its hit cap. */
  get shouldShatter() {
    return this.glassHits >= BALL_EFFECTS.GLASS_MAX_HITS;
  }

  onBeforeContact(_peg) {
    this.glassHits += 1;
    return this.shouldShatter ? "shatter" : "alive";
  }
}
