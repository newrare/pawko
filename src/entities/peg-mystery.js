import { Peg } from "./peg-classic.js";

/**
 * MysteryPeg — gives a random bonus or malus when destroyed.
 * The outcome is unknown until the peg breaks.
 */
export class MysteryPeg extends Peg {
  constructor(opts = {}) {
    super(opts);
    this.type = "mystery";
    this._resolveHp();
  }

  get score() {
    return 0;
  }

  scoreForContact() {
    return 0;
  }

  /**
   * On destruction, roll a random effect — can be positive or negative.
   * The controller interprets the directive.
   * @returns {object}
   */
  onDestroyed(_ball) {
    const effects = [
      // Bonuses
      { coins: 15, popText: "+15 🪙", popClass: "pk-popup pk-popup--mystery-good" },
      { diamonds: 2, popText: "+2 💎", popClass: "pk-popup pk-popup--mystery-good" },
      { extraBalls: 1, popText: "+1 🔵", popClass: "pk-popup pk-popup--mystery-good" },
      { scoreMultiplier: 2, popText: "SCORE ×2!", popClass: "pk-popup pk-popup--mystery-good" },
      // Maluses
      { scorePenalty: 0.5, popText: "SCORE ÷2!", popClass: "pk-popup pk-popup--mystery-bad" },
      { freezeAll: true, popText: "❄️ FREEZE!", popClass: "pk-popup pk-popup--mystery-bad" },
      { speedUp: true, popText: "⚡ SPEED!", popClass: "pk-popup pk-popup--mystery-bad" },
    ];
    return effects[Math.floor(Math.random() * effects.length)];
  }
}
