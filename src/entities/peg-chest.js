import { Peg } from "./peg-classic.js";

/**
 * ChestPeg — gives a random bonus when destroyed (HP reaches 0).
 * Does nothing on simple contact; only the destruction event triggers rewards.
 * Possible rewards: coins × N, diamonds × N, launcher bonus, extra balls.
 */
export class ChestPeg extends Peg {
  constructor(opts = {}) {
    super(opts);
    this.type = "chest";
    this._resolveHp();
  }

  get score() {
    return 0;
  }

  scoreForContact() {
    return 0;
  }

  /**
   * On destruction, roll a random reward.
   * The controller interprets the returned directive.
   * @returns {object}
   */
  onDestroyed(_ball) {
    const rewards = [
      { coins: 10, popText: "+10 🪙", popClass: "pk-popup pk-popup--coin" },
      { coins: 25, popText: "+25 🪙", popClass: "pk-popup pk-popup--coin" },
      { diamonds: 3, popText: "+3 💎", popClass: "pk-popup pk-popup--diamond" },
      { extraBalls: 1, popText: "+1 🔵", popClass: "pk-popup pk-popup--ball" },
      { extraBalls: 2, popText: "+2 🔵", popClass: "pk-popup pk-popup--ball" },
    ];
    return rewards[Math.floor(Math.random() * rewards.length)];
  }
}
