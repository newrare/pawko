import { SCORE, PLINKO } from "../configs/constants.js";

/**
 * The target score a given level requires to be cleared. Grows linearly with
 * the level id: `SCORE.OBJECTIVE_BASE × levelId` (level 1 → 500, level 2 →
 * 1000, …).
 * @param {number} levelId — 1-based level id
 * @returns {number}
 */
export function levelObjective(levelId) {
  const id = Math.max(1, Math.floor(levelId || 1));
  return SCORE.OBJECTIVE_BASE * id;
}

/**
 * Multiplier increment contributed by a capture gate. The central `return`
 * gate recycles the ball and adds nothing; unknown gates add 0.
 * @param {string} gateId — one of PLINKO.GATE_ORDER
 * @returns {number}
 */
export function gateMultiplier(gateId) {
  return PLINKO.GATE_MULT[gateId] ?? 0;
}

/**
 * ScoreState — pure accumulator for the score-mode game loop.
 *
 * Two independent counters:
 *  - `hitScore` — sum of the points of every peg a ball has touched (gold).
 *  - `multiplier` — starts at `SCORE.MULTIPLIER_BASE` and grows as balls fall
 *    into the x1 / x2 gates (blue).
 *
 * The final score is `hitScore × multiplier`, compared against the level
 * objective at the end of the round. No DOM dependency — fully unit-testable.
 */
export class ScoreState {
  /** @type {number} */
  #hitScore = 0;
  /** @type {number} */
  #multiplier = SCORE.MULTIPLIER_BASE;
  /** @type {number[]} Ordered multiplier increments, for the end reveal. */
  #multiplierSteps = [];

  /**
   * Credit peg points to the hit-score counter. Non-positive values are
   * ignored so reward pegs (0 points) never touch the counter.
   * @param {number} points
   * @returns {number} the new hit score
   */
  addHit(points) {
    if (points > 0) this.#hitScore += points;
    return this.#hitScore;
  }

  /**
   * Raise the multiplier by a gate's contribution.
   * @param {number} delta
   * @returns {number} the new multiplier
   */
  addMultiplier(delta) {
    if (delta > 0) {
      this.#multiplier += delta;
      this.#multiplierSteps.push(delta);
    }
    return this.#multiplier;
  }

  /** @returns {number} */
  get hitScore() {
    return this.#hitScore;
  }

  /** @returns {number} */
  get multiplier() {
    return this.#multiplier;
  }

  /**
   * Ordered list of the multiplier increments credited this round (each x1/x2
   * gate contributes one entry). Used by the end-of-round reveal to grow the
   * total one multiplier at a time. Returns a copy.
   * @returns {number[]}
   */
  get multiplierSteps() {
    return [...this.#multiplierSteps];
  }

  /** Final score = hit score × multiplier. */
  get finalScore() {
    return this.#hitScore * this.#multiplier;
  }

  /**
   * Whether the final score reaches the given objective.
   * @param {number} objective
   * @returns {boolean}
   */
  reaches(objective) {
    return this.finalScore >= objective;
  }
}
