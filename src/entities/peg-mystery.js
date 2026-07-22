import { Peg } from "./peg-classic.js";
import { PARAM_KEYS } from "../configs/bonus-defs.js";
import { bonusManager } from "../managers/bonus-manager.js";
import { rollMysteryReward } from "../utils/reward-roll.js";

/**
 * MysteryPeg — when destroyed, rolls a random reward (70% bonus / 30% malus,
 * weighted by rarity) and queues it for the NEXT pinboard via
 * `bonusManager.queueSessionNext`. A multicolor floating label shows the reward
 * name at the peg position. While the `malus_mystery_common` malus is active,
 * the draw is restricted to common rewards.
 *
 * Rescue is disabled for this peg type (like chest/coin/diamond) — the reward
 * is unambiguous and the player cannot cancel it.
 */
export class MysteryPeg extends Peg {
  constructor(opts = {}) {
    super(opts);
    this.type = "mystery";
    this._resolveHp();
  }

  /** @returns {object | null} */
  onDestroyed(_ball) {
    const forceCommon = bonusManager.resolve(
      PARAM_KEYS.MYSTERY_FORCE_COMMON,
      false,
    );
    const def = rollMysteryReward({ forceCommon });
    if (!def) return null;
    return {
      queueSession: def.id,
      popHtml: `<span class="pk-float-icon pk-float-icon--fire"></span> <span class="pk-float-mystery-name">${def.name ?? def.id}</span>`,
      mystery: true,
    };
  }
}
