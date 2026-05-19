import { Peg } from "./peg-classic.js";
import { KEY_RARITIES } from "../configs/constants.js";

/**
 * KeyPeg — drops a key of a given rarity when destroyed (HP = 1 so it
 * dies on first hit). The key goes into the player's general inventory.
 */
export class KeyPeg extends Peg {
  /** @type {'legendary'|'epic'|'rare'|'common'} */
  rarity;

  /**
   * @param {object} [opts]
   * @param {'legendary'|'epic'|'rare'|'common'} [opts.rarity]
   */
  constructor(opts = {}) {
    super(opts);
    this.type = "key";
    this._resolveHp();
    this.rarity = opts.rarity || KeyPeg.rollRarity();
  }

  get score() {
    return 0;
  }

  scoreForContact() {
    return 0;
  }

  /**
   * On destruction, award the key to the player's inventory.
   * @returns {{ key: string }}
   */
  onDestroyed(_ball) {
    return {
      key: this.rarity,
      popText: `🔑 ${this.rarity}`,
      popClass: `pk-popup pk-popup--key pk-popup--key-${this.rarity}`,
    };
  }

  /**
   * Roll a random rarity weighted toward common.
   * @returns {'legendary'|'epic'|'rare'|'common'}
   */
  static rollRarity() {
    const r = Math.random();
    if (r < 0.02) return KEY_RARITIES[0]; // legendary 2%
    if (r < 0.08) return KEY_RARITIES[1]; // epic 6%
    if (r < 0.25) return KEY_RARITIES[2]; // rare 17%
    return KEY_RARITIES[3]; // common 75%
  }
}
