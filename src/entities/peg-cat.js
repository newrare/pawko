import { Peg } from "./peg-classic.js";

/**
 * CatPeg — eats one ball permanently. The ball is removed from play.
 * If the cat is destroyed, the eaten ball is NOT freed (unlike glue).
 * A cat can only eat one ball per game session.
 */
export class CatPeg extends Peg {
  /** @type {boolean} Whether this cat has already eaten a ball. */
  hasEaten = false;

  constructor(opts = {}) {
    super(opts);
    this.type = "cat";
    this._resolveHp();
  }

  get score() {
    return 0;
  }

  scoreForContact() {
    return 0;
  }

  /** Whether this cat can still eat a ball. */
  get canEat() {
    return !this.hasEaten;
  }

  /**
   * Eat the ball. The controller should remove it from play permanently.
   * @param {import('./ball-classic.js').Ball} _ball
   * @returns {{ eaten: true } | null}
   */
  consumeReward(_ball) {
    if (!this.canEat) return null;
    this.hasEaten = true;
    return { eaten: true, popText: "🐱 NOM!", popClass: "pk-popup pk-popup--cat" };
  }
}
