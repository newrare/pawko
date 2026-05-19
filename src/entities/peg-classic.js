import { Entity } from "./entity.js";
import { PLINKO, BALL_EFFECTS, PEG_DEFS } from "../configs/constants.js";

/**
 * Peg — basic metallic clou. Score +2 per ball contact.
 *
 * Pure data: position is set by the layer that owns this peg, in the
 * pinboard coordinate space. No DOM dependency — the controller renders
 * the corresponding `.gt-peg` element.
 *
 * Subclasses (Bumper, CoinPeg, etc.) override `score`, `restitution` and the
 * scoring / reward hooks. See `docs/SLOT.md` for the family hierarchy.
 */
export class Peg extends Entity {
  /** @type {number} */
  x = 0;
  /** @type {number} */
  y = 0;
  /** @type {number} Max hit points before destruction. */
  maxHp;
  /** @type {number} Current hit points remaining. */
  hp;
  /** @type {number} Remaining hits before the ice melts (0 = not frozen). */
  iceHits = 0;
  /** @type {boolean} Burning pegs score half their base value. */
  burned = false;
  /** @type {boolean} Electrified pegs participate in arcs with same-layer neighbours. */
  electrified = false;

  /**
   * @param {{ x?: number, y?: number, slot?: number }} [opts]
   */
  constructor({ x = 0, y = 0, slot = 0 } = {}) {
    super({ type: "peg" });
    this.x = x;
    this.y = y;
    this.slot = slot;
    // HP is initialized in #initHp() — subclasses call it after setting type.
    this.#initHp();
  }

  /** Resolve HP from PEG_DEFS based on current this.type. */
  #initHp() {
    const def = PEG_DEFS[this.type] || PEG_DEFS.peg;
    this.maxHp = def.hp;
    this.hp = def.hp;
  }

  /** Re-initialize HP after subclass has overridden this.type. */
  _resolveHp() {
    this.#initHp();
  }

  get radius() {
    return PLINKO.PEG_RADIUS;
  }

  /** Unmodified base score awarded for one clean contact. */
  get score() {
    return PLINKO.SCORE_PEG;
  }

  get restitution() {
    return PLINKO.RESTITUTION_PEG;
  }

  /**
   * Whether the PEG_SCORE_MULTIPLIER bonus applies to contacts with this
   * peg. Bumpers opt out (their score is already an explicit boost).
   */
  get appliesPegMultiplier() {
    return true;
  }

  /**
   * Score awarded for a single ball contact, accounting for ice and burn
   * rules. The controller multiplies this by the PEG_SCORE_MULTIPLIER
   * bonus when `appliesPegMultiplier` is true.
   * @returns {number}
   */
  scoreForContact() {
    if (this.iceHits > 0) return 0;
    if (this.burned) return Math.floor(this.score / BALL_EFFECTS.FIRE_SCORE_DIVISOR);
    return this.score;
  }

  /**
   * Reward directive returned when this peg consumes itself on contact
   * (CoinPeg). `null` means scoring proceeds normally.
   * @param {import('./ball-classic.js').Ball} _ball
   * @returns {null | { coins?: number, diamonds?: number, popText?: string, popClass?: string }}
   */
  consumeReward(_ball) {
    return null;
  }

  /**
   * Apply 1 point of damage to this peg. Returns true if the peg just died.
   * @param {number} [amount=1]
   * @returns {boolean}
   */
  takeDamage(amount = 1) {
    if (this.hp <= 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    return this.hp === 0;
  }

  /** Whether this peg has been destroyed (hp depleted). */
  get isDestroyed() {
    return this.hp <= 0;
  }

  /** Whether the next hit will destroy this peg (triggers tremble visual). */
  get isLastHit() {
    return this.hp === 1;
  }

  /**
   * Peg-side bookkeeping after a scored contact: decay ice by one charge
   * so the next hit moves the peg one step closer to thawing.
   * Returns true if the peg's visual state changed.
   * @returns {boolean}
   */
  onAfterScored() {
    if (this.iceHits > 0) {
      this.iceHits -= 1;
      return true;
    }
    return false;
  }

  /**
   * Hook called when this peg is destroyed (hp reaches 0).
   * Subclasses override to return destruction rewards.
   * @param {import('./ball-classic.js').Ball} _ball
   * @returns {null | object}
   */
  onDestroyed(_ball) {
    return null;
  }
}
