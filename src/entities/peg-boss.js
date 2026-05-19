import { Peg } from "./peg-classic.js";

/**
 * BossPeg — eats multiple balls. Same behaviour as CatPeg but can eat
 * more than one. Eaten balls are NOT freed on destruction.
 */
export class BossPeg extends Peg {
  /** @type {number} Number of balls this boss has eaten. */
  eatenCount = 0;

  constructor(opts = {}) {
    super(opts);
    this.type = "boss";
    this._resolveHp();
  }

  get score() {
    return 0;
  }

  scoreForContact() {
    return 0;
  }

  /** Boss can always eat more balls. */
  get canEat() {
    return true;
  }

  /**
   * Eat the ball on contact.
   * @param {import('./ball-classic.js').Ball} _ball
   * @returns {{ eaten: true }}
   */
  consumeReward(_ball) {
    this.eatenCount++;
    return { eaten: true, popText: "👹 NOM!", popClass: "pk-popup pk-popup--boss" };
  }
}
