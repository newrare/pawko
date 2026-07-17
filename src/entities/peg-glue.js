import { Peg } from "./peg-classic.js";

/**
 * GluePeg — traps a ball on contact. The ball is stuck and cannot reach
 * a gate. If the glue peg is destroyed, the trapped ball is freed.
 *
 * Only one ball can be trapped at a time.
 *
 * Permanent bonus `GLUE_PEG_HP_BONUS` is added to the base HP. The factory
 * resolves the bonus from `bonusManager` and passes it via `opts.hpBonus`.
 */
export class GluePeg extends Peg {
  /** @type {import('./ball-classic.js').Ball | null} */
  trappedBall = null;
  /** @type {number} */
  #hpBonus;

  constructor(opts = {}) {
    super(opts);
    this.type = "glue";
    this.#hpBonus = opts.hpBonus ?? 0;
    this._resolveHp();
    if (this.#hpBonus > 0) {
      this.maxHp += this.#hpBonus;
      this.hp = this.maxHp;
    }
  }

  /** Whether this peg can still trap a ball. */
  get canTrap() {
    return this.trappedBall === null;
  }

  /**
   * Trap the ball. Returns a directive for the controller to immobilize it.
   * @param {import('./ball-classic.js').Ball} ball
   * @returns {{ trapped: true } | null}
   */
  consumeReward(ball) {
    if (!this.canTrap) return null;
    this.trappedBall = ball;
    return { trapped: true };
  }

  /**
   * On destruction, signal that the trapped ball should be released.
   * @returns {{ releaseBall: import('./ball-classic.js').Ball } | null}
   */
  onDestroyed(_ball) {
    if (this.trappedBall) {
      const freed = this.trappedBall;
      this.trappedBall = null;
      return { releaseBall: freed };
    }
    return null;
  }
}
