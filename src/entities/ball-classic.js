import { Entity } from "./entity.js";
import { PLINKO, EFFECT_DEFS, BALL_DEFS } from "../configs/constants.js";
import { bonusManager } from "../managers/bonus-manager.js";
import { PARAM_KEYS } from "../configs/bonus-defs.js";

/** Bonus param keys keyed by effect id. Effects without a bonus map to null. */
const EFFECT_DURATION_BONUS = {
  burning: PARAM_KEYS.FIRE_DURATION_BONUS_MS,
  frozen: PARAM_KEYS.ICE_DURATION_BONUS_MS,
  electrified: PARAM_KEYS.ELECTRICAL_DURATION_BONUS_MS,
};

/**
 * Ball — classic ball, the only ball type for now.
 *
 * Pure data: position, velocity, recycle counter, alive flag, HP and the
 * per-ball score. The controller mutates these fields each physics step
 * and pushes the result to a paired DOM node via `transform: translate(...)`.
 *
 * Future variants will extend this class and override `kind` /
 * `cssModifier` / `maxHp`. Always go through `createBall(kind, opts)`
 * (ball-factory.js) to spawn the right subclass from a kind string.
 */
export class Ball extends Entity {
  /** @type {number} */
  x = 0;
  /** @type {number} */
  y = 0;
  /** @type {number} */
  vx = 0;
  /** @type {number} */
  vy = 0;
  /** @type {number} */
  recycles = 0;
  /** @type {boolean} */
  alive = true;
  /** @type {number} Max HP for this ball. */
  maxHp = BALL_DEFS.classic.hp;
  /** @type {number} Current HP. Each peg contact subtracts 1. */
  hp = BALL_DEFS.classic.hp;
  /** @type {'held' | 'active' | 'captured' | 'glued'} */
  state = "active";
  /** @type {string | null} Gate that captured this ball. */
  gateId = null;
  /** @type {import('./peg-classic.js').Peg | null} Glue peg currently holding this ball. */
  trappedPeg = null;
  /** @type {number} Offset from the trapping peg's center, locked at capture time. */
  trappedOffsetX = 0;
  /** @type {number} */
  trappedOffsetY = 0;
  /** @type {number} Sublaunch index this ball belongs to (for held balls). */
  sublaunchIdx = -1;
  /** @type {Set<number>} ids of pegs hit during the current contact frame. */
  recentPegs = new Set();

  /**
   * Active effects map. Each key is an effect id (e.g. "burning", "frozen"),
   * value is { expiresAt, tickMs, nextTickAt }.
   * @type {Map<string, {expiresAt: number, tickMs: number, nextTickAt: number}>}
   */
  effects = new Map();

  /**
   * DoT events that fired during the last tickEffects call.
   * Cleared at the start of each call. Read by the controller to show damage labels.
   * @type {Array<{id: string, damage: number}>}
   */
  dotEvents = [];

  /**
   * @param {{ x?: number, y?: number, vx?: number, vy?: number }} [opts]
   */
  constructor({ x = 0, y = 0, vx = 0, vy = 0 } = {}) {
    super({ type: "ball" });
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
  }

  /**
   * Inflict damage to this ball. Returns true when it dies (HP ≤ 0).
   * The controller is responsible for removing the DOM and game state.
   * @param {number} amount
   * @returns {boolean} true when the ball is dead.
   */
  takeDamage(amount = 1) {
    if (!this.alive) return false;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  /**
   * Apply a timed effect to this ball. Overwrites if the effect is already active.
   * @param {string} id — one of EFFECT_DEFS keys (burning, frozen, electrified)
   * @param {number} now — current timestamp (ms)
   */
  applyEffect(id, now) {
    const def = EFFECT_DEFS[id];
    if (!def) return;
    const bonusKey = EFFECT_DURATION_BONUS[id];
    const bonusMs = bonusKey ? bonusManager.resolve(bonusKey, 0) : 0;
    this.effects.set(id, {
      expiresAt: now + def.durationMs + bonusMs,
      tickMs: def.tickMs,
      nextTickAt: def.tickMs > 0 ? now + def.tickMs : Infinity,
    });
  }

  /**
   * Tick all active effects. Called once per physics frame by the controller.
   * DoT effects (burning, electrified) call takeDamage. Returns true when the
   * ball died from an effect tick.
   * @param {number} now — current timestamp (ms)
   * @returns {boolean} true if ball died
   */
  tickEffects(now) {
    this.dotEvents.length = 0;
    for (const [id, eff] of this.effects) {
      if (now >= eff.expiresAt) {
        this.effects.delete(id);
        continue;
      }
      if (eff.tickMs > 0 && now >= eff.nextTickAt) {
        eff.nextTickAt = now + eff.tickMs;
        this.dotEvents.push({ id, damage: 1 });
        const dead = this.takeDamage(1);
        if (dead) return true;
      }
    }
    return false;
  }

  /** Speed multiplier from active effects (ice halves speed). */
  getSpeedMultiplier() {
    if (this.effects.has("frozen")) return 0.5;
    return 1;
  }

  /** Gravity multiplier from active effects (ice reduces gravity to 1/3). */
  getGravityMultiplier() {
    if (this.effects.has("frozen")) return 1 / 3;
    return 1;
  }

  /** Active effect ids — used by the controller to update CSS classes. */
  getActiveEffectIds() {
    return [...this.effects.keys()];
  }

  get radius() {
    return PLINKO.BALL_RADIUS;
  }

  /** @returns {string} one of BALL_KINDS (see ball-factory.js). */
  get kind() {
    return "classic";
  }

  /** CSS modifier appended to `pk-ball--`. Empty string means none. */
  get cssModifier() {
    return "";
  }

  /** Returns true when the recycle gate may still send this ball back. */
  canRecycle() {
    return this.recycles < PLINKO.MAX_RECYCLES;
  }

  /**
   * Teleport the ball to a random position inside the pinboard. Used by
   * the TeleportPeg reward path.
   * @param {{ width: number, height: number }} pinboard
   */
  teleportInside({ width, height }) {
    const margin = PLINKO.BALL_RADIUS * 2;
    this.x = margin + Math.random() * (width - margin * 2);
    this.y = PLINKO.LAYER_TOP_PADDING + Math.random() * (height * 0.6);
    this.vx = (Math.random() - 0.5) * 200;
    this.vy = 50 + Math.random() * 100;
    this.recentPegs.clear();
  }

  /**
   * Lock the ball to a glue peg. Position is re-applied every frame by
   * the controller from `trappedPeg` + `trappedOffset*`.
   * @param {import('./peg-classic.js').Peg} peg
   */
  trapOn(peg) {
    this.vx = 0;
    this.vy = 0;
    this.state = "glued";
    this.trappedPeg = peg;
    /* Lock the contact-time offset so the ball visually sits where it
       hit the peg (just outside the peg radius). */
    this.trappedOffsetX = this.x - peg.x;
    this.trappedOffsetY = this.y - peg.y;
    this.recentPegs.clear();
  }

  /** Release a previously trapped ball back into play. */
  release() {
    this.state = "active";
    this.trappedPeg = null;
    this.trappedOffsetX = 0;
    this.trappedOffsetY = 0;
    this.vy = 50 + Math.random() * 100;
    this.vx = (Math.random() - 0.5) * 100;
  }
}
