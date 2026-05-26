import { Peg } from "./peg-classic.js";
import { BOMB_RADIUS } from "../configs/constants.js";

/**
 * BombPeg — tappable during play. When tapped (or hit), detonates and
 * destroys all pegs and balls within BOMB_RADIUS. Single-use.
 */
export class BombPeg extends Peg {
  /** @type {boolean} Whether this bomb has already detonated. */
  detonated = false;

  constructor(opts = {}) {
    super(opts);
    this.type = "bomb";
    this._resolveHp();
  }

  get score() {
    return 0;
  }

  scoreForContact() {
    return 0;
  }

  /** Bomb is tappable during play — opt into the global click SFX hook. */
  get extraCssClasses() {
    return ["gt-clickable"];
  }

  /** Radius of the explosion area. */
  get blastRadius() {
    return BOMB_RADIUS;
  }

  /**
   * Explode the bomb. Returns true if this is the first detonation.
   * @returns {boolean}
   */
  explode() {
    if (this.detonated) return false;
    this.detonated = true;
    this.hp = 0;
    return true;
  }

  /**
   * Signal to the controller that this peg explodes on contact.
   * @param {import('./ball-classic.js').Ball} _ball
   * @returns {{ bomb: true, popText: string, popClass: string }}
   */
  consumeReward(_ball) {
    return { bomb: true, popText: "💣", popClass: "pk-popup pk-popup--bomb" };
  }
}
