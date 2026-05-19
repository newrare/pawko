import { Peg } from "./peg-classic.js";
import { KEY_RARITIES } from "../configs/constants.js";

/**
 * ChesterPeg — a coloured chest requiring the matching key.
 *
 * On first ball hit: if the player holds the correct rarity key, consumes
 * it and gives a large bonus. Otherwise, behaves like a normal HP peg.
 * On destruction by HP depletion: gives a smaller bonus (same as ChestPeg).
 */
export class ChesterPeg extends Peg {
  /** @type {'legendary'|'epic'|'rare'|'common'} */
  rarity;
  /** @type {boolean} Whether the big bonus has already been claimed. */
  claimed = false;

  /**
   * @param {object} [opts]
   * @param {'legendary'|'epic'|'rare'|'common'} [opts.rarity]
   */
  constructor(opts = {}) {
    super(opts);
    this.type = "chester";
    this._resolveHp();
    this.rarity = opts.rarity || KEY_RARITIES[Math.floor(Math.random() * KEY_RARITIES.length)];
  }

  get score() {
    return 0;
  }

  scoreForContact() {
    return 0;
  }

  /**
   * On first hit, check if the player has the right key.
   * The controller must check the inventory and call `claimBigBonus()` if
   * a matching key is available.
   * @param {import('./ball-classic.js').Ball} _ball
   * @returns {{ chesterCheck: string } | null}
   */
  consumeReward(_ball) {
    if (this.claimed) return null;
    return { chesterCheck: this.rarity };
  }

  /**
   * Called by the controller when the matching key is used.
   * @returns {object}
   */
  claimBigBonus() {
    this.claimed = true;
    const bigRewards = [
      { coins: 100, popText: "+100 🪙", popClass: "pk-popup pk-popup--chester-big" },
      { diamonds: 10, popText: "+10 💎", popClass: "pk-popup pk-popup--chester-big" },
      { extraBalls: 5, popText: "+5 🔵", popClass: "pk-popup pk-popup--chester-big" },
    ];
    return bigRewards[Math.floor(Math.random() * bigRewards.length)];
  }

  /**
   * On destruction without key claim, give a basic chest reward.
   * @returns {object}
   */
  onDestroyed(_ball) {
    if (this.claimed) return null;
    const rewards = [
      { coins: 10, popText: "+10 🪙", popClass: "pk-popup pk-popup--coin" },
      { diamonds: 2, popText: "+2 💎", popClass: "pk-popup pk-popup--diamond" },
    ];
    return rewards[Math.floor(Math.random() * rewards.length)];
  }
}
