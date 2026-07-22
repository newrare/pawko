import { Peg } from "./peg-classic.js";
import { CHEST_BALL_RELEASE } from "../configs/constants.js";

/**
 * ChestPeg — holds balls "inside" that are freed when it is destroyed
 * (HP reaches 0). Does nothing on simple contact; only the destruction
 * event releases the balls. Breaking the chest spawns `CHEST_BALL_RELEASE`
 * fresh classic balls onto the pinboard at the chest's position.
 */
export class ChestPeg extends Peg {
  constructor(opts = {}) {
    super(opts);
    this.type = "chest";
    this._resolveHp();
  }

  /**
   * On destruction, release the balls stored inside the chest.
   * Returns a descriptor consumed by the game controller.
   * @returns {object}
   */
  onDestroyed(_ball) {
    return {
      spawnBalls: CHEST_BALL_RELEASE,
      popHtml: `+${CHEST_BALL_RELEASE} <span class="pk-float-icon pk-float-icon--ball"></span>`,
      popColor: "var(--pk-peg-chest)",
      chest: true,
    };
  }
}
