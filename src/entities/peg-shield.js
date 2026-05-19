import { Peg } from "./peg-classic.js";
import { PLINKO } from "../configs/constants.js";

/**
 * ShieldPeg — creates a circular barrier around itself. Balls cannot
 * enter the shield zone. The shield absorbs up to 5 hits then goes on
 * cooldown for 5 seconds before reactivating.
 *
 * The peg itself has only 1 HP — it can only be hit when the shield is down.
 */
export class ShieldPeg extends Peg {
  /** @type {number} Remaining shield hits before cooldown. */
  shieldHits;
  /** @type {boolean} Whether the shield is currently active. */
  shieldActive = true;
  /** @type {number} Timestamp (ms) when shield was deactivated. 0 = never. */
  shieldDownAt = 0;

  constructor(opts = {}) {
    super(opts);
    this.type = "shield";
    this._resolveHp();
    this.shieldHits = PLINKO.SHIELD_MAX_HITS;
  }

  get score() {
    return 0;
  }

  scoreForContact() {
    return 0;
  }

  /** Radius of the shield barrier (used for ball deflection). */
  get shieldRadius() {
    return this.radius * PLINKO.SHIELD_RADIUS_MULTIPLIER;
  }

  /**
   * Called when a ball hits the shield (not the peg itself).
   * Decrements shield charges and deactivates if depleted.
   * @returns {boolean} true if shield just went down
   */
  hitShield() {
    if (!this.shieldActive) return false;
    this.shieldHits--;
    if (this.shieldHits <= 0) {
      this.shieldActive = false;
      this.shieldDownAt = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Check if the shield should reactivate (called every frame by controller).
   * @returns {boolean} true if shield just reactivated
   */
  tickShield() {
    if (this.shieldActive) return false;
    if (this.shieldDownAt > 0 && Date.now() - this.shieldDownAt >= PLINKO.SHIELD_COOLDOWN_MS) {
      this.shieldActive = true;
      this.shieldHits = PLINKO.SHIELD_MAX_HITS;
      this.shieldDownAt = 0;
      return true;
    }
    return false;
  }
}
