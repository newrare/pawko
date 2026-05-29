import { Peg } from "./peg-classic.js";
import { SESSION_BONUSES } from "../configs/bonus-defs.js";

/**
 * MysteryPeg — when destroyed, rolls a random session bonus and queues it
 * for the NEXT pinboard via `bonusManager.queueSessionNext`. A multicolor
 * floating label shows the fire icon + bonus name at the peg position.
 *
 * Rescue is disabled for this peg type (like chest/coin/diamond) — the
 * reward is unambiguous and the player cannot cancel it.
 */
export class MysteryPeg extends Peg {
  constructor(opts = {}) {
    super(opts);
    this.type = "mystery";
    this._resolveHp();
  }

  /** @returns {object | null} */
  onDestroyed(_ball) {
    if (!SESSION_BONUSES.length) return null;
    const def = SESSION_BONUSES[Math.floor(Math.random() * SESSION_BONUSES.length)];
    return {
      queueSession: def.id,
      popHtml: `<span class="pk-float-icon pk-float-icon--fire"></span> <span class="pk-float-mystery-name">${def.name ?? def.id}</span>`,
      mystery: true,
    };
  }
}
