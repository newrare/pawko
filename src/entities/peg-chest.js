import { Peg } from "./peg-classic.js";

/* Possible reward values — equal probability within each category,
   and 50 / 50 chance of diamonds vs. coins. */
const DIAMOND_VALUES = [5, 10, 15, 20, 50];
const COIN_VALUES = [10, 100, 200, 500, 1000];

/**
 * ChestPeg — gives a random bonus when destroyed (HP reaches 0).
 * Does nothing on simple contact; only the destruction event triggers rewards.
 * Possible rewards: diamonds × N (5/10/15/20/50) or coins × N (10/100/200/500/1000).
 */
export class ChestPeg extends Peg {
  constructor(opts = {}) {
    super(opts);
    this.type = "chest";
    this._resolveHp();
  }

  /**
   * On destruction, roll a random reward (diamonds or coins).
   * Returns a descriptor consumed by the game controller.
   * @returns {object}
   */
  onDestroyed(_ball) {
    const isDiamond = Math.random() < 0.5;
    if (isDiamond) {
      const value = DIAMOND_VALUES[Math.floor(Math.random() * DIAMOND_VALUES.length)];
      return {
        diamonds: value,
        popHtml: `+${value} <span class="pk-float-icon pk-float-icon--diamond"></span>`,
        popColor: "var(--pk-peg-chest)",
        chest: true,
      };
    }
    const value = COIN_VALUES[Math.floor(Math.random() * COIN_VALUES.length)];
    return {
      coins: value,
      popHtml: `+${value} <span class="pk-float-icon pk-float-icon--coin"></span>`,
      popColor: "var(--pk-peg-chest)",
      chest: true,
    };
  }
}
