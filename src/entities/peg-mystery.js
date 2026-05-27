import { Peg } from "./peg-classic.js";
import { bonusManager } from "../managers/bonus-manager.js";
import {
  SESSION_BONUSES,
  SESSION_MALUSES,
  BONUS_CATEGORIES,
} from "../configs/bonus-defs.js";

/**
 * MysteryPeg — when destroyed, rolls a random session entry (70% bonus,
 * 30% malus) and immediately activates it via `bonusManager`. The
 * resulting popup tells the player what they got.
 *
 * The activation goes through the controller's destroy-reward channel
 * so the standard peg rescue ring still lets the player cancel the
 * outcome by tapping in time.
 */
export class MysteryPeg extends Peg {
  constructor(opts = {}) {
    super(opts);
    this.type = "mystery";
    this._resolveHp();
  }

  /** @returns {object | null} */
  onDestroyed(_ball) {
    const rollMalus = Math.random() < 0.3;
    const pool = rollMalus ? SESSION_MALUSES : SESSION_BONUSES;
    if (!pool.length) return null;
    const def = pool[Math.floor(Math.random() * pool.length)];
    const isMalus = def.category === BONUS_CATEGORIES.MALUS;
    return {
      activate: def.id,
      popText: `${def.icon} ${isMalus ? "!" : "+"}`,
      popClass: `pk-popup pk-popup--mystery-${isMalus ? "bad" : "good"}`,
    };
  }
}

/* Re-export so the controller can apply activation in #applyDestroyReward. */
export { bonusManager };
