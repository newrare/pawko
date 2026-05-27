import { PEG_SAVE } from "../configs/constants.js";

/**
 * PegSaveSystem — manages the rescue mechanic for dying pegs.
 *
 * When a peg reaches 0 HP the game controller calls `startRescue(peg, cbs)`.
 * A countdown begins; if the player taps the peg within the window the peg
 * is restored to 1 HP (saved). Otherwise the supplied `onExpire` callback
 * fires and the peg is destroyed normally.
 *
 * Consecutive saves build a **save combo multiplier**. The combo decays after an idle period.
 *
 * This class is intentionally **not** a singleton — one instance per game
 * session, owned and disposed by `GameController`.
 */
export class PegSaveSystem {
  /**
   * Active rescue entries keyed by peg id.
   * @type {Map<number, { peg: object, timerId: number, onExpire: Function, onSave: Function }>}
   */
  #rescues = new Map();

  /** @type {number} */
  #comboMultiplier = 1;

  /** @type {number} */
  #saveCount = 0;

  /** Timer id for combo decay. @type {number | null} */
  #decayTimerId = null;

  /** Total number of successful saves in this session. */
  get saveCount() {
    return this.#saveCount;
  }

  /** Current save combo multiplier (≥ 1). */
  get comboMultiplier() {
    return this.#comboMultiplier;
  }

  /** Number of pegs currently in the rescuable state. */
  get rescuableCount() {
    return this.#rescues.size;
  }

  /** Snapshot of peg ids currently awaiting rescue. */
  get rescuableIds() {
    return [...this.#rescues.keys()];
  }

  /**
   * Whether a given peg is currently rescuable.
   * @param {number} pegId
   * @returns {boolean}
   */
  isRescuable(pegId) {
    return this.#rescues.has(pegId);
  }

  /**
   * Start a rescue window for a dying peg.
   * @param {{ id: number, hp: number }} peg - The peg entity (hp should be 0).
   * @param {{ onExpire: Function, onSave: Function }} callbacks
   */
  startRescue(peg, { onExpire, onSave }) {
    if (this.#rescues.has(peg.id)) return;

    const timerId = setTimeout(() => {
      this.#rescues.delete(peg.id);
      onExpire();
    }, PEG_SAVE.RESCUE_DURATION_MS);

    this.#rescues.set(peg.id, { peg, timerId, onExpire, onSave });
  }

  /**
   * Attempt to save a rescuable peg (player tapped it).
   * @param {number} pegId
   * @returns {boolean} Whether the save succeeded.
   */
  trySave(pegId) {
    const entry = this.#rescues.get(pegId);
    if (!entry) return false;

    clearTimeout(entry.timerId);
    this.#rescues.delete(pegId);

    // Restore peg HP
    entry.peg.hp = PEG_SAVE.SAVED_HP;

    // Increment combo
    this.#comboMultiplier += PEG_SAVE.COMBO_INCREMENT;
    this.#saveCount += 1;

    // Reset combo decay timer
    this.#resetDecayTimer();

    entry.onSave();
    return true;
  }

  /**
   * Cancel a rescue without calling any callbacks (e.g. round ended).
   * @param {number} pegId
   */
  cancelRescue(pegId) {
    const entry = this.#rescues.get(pegId);
    if (!entry) return;
    clearTimeout(entry.timerId);
    this.#rescues.delete(pegId);
  }

  /** Clean up all pending timers and reset state. */
  dispose() {
    for (const { timerId } of this.#rescues.values()) {
      clearTimeout(timerId);
    }
    this.#rescues.clear();
    if (this.#decayTimerId !== null) {
      clearTimeout(this.#decayTimerId);
      this.#decayTimerId = null;
    }
    this.#comboMultiplier = 1;
    this.#saveCount = 0;
  }

  /** Reset (or start) the combo decay countdown. */
  #resetDecayTimer() {
    if (this.#decayTimerId !== null) {
      clearTimeout(this.#decayTimerId);
    }
    this.#decayTimerId = setTimeout(() => {
      this.#comboMultiplier = 1;
      this.#decayTimerId = null;
    }, PEG_SAVE.COMBO_DECAY_MS);
  }
}
