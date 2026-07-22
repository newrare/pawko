import { ListenerBag } from "../utils/listener-bag.js";
import { i18n } from "../managers/i18n-manager.js";

/**
 * PinboardProgress — the objective read-out rendered *behind* the pegs and
 * balls, filling the whole pinboard like a live progress bar.
 *
 * Two visual parts, both inside the pinboard box (so they scroll/clip with it):
 *  - a bottom-anchored fill whose height tracks the live score, and
 *  - a dashed horizon line sitting just above the top peg row, labelled
 *    `—— objective: N pts ——`.
 *
 * The fill reaches the horizon line exactly when the live score equals the
 * objective; a higher score keeps rising past the line toward the top of the
 * board (capped at the board height). It never intercepts pointer events and
 * lives at the lowest z-index of the pinboard, so gameplay reads on top of it.
 *
 * Pure geometry — no gameplay knowledge. The controller feeds it the objective,
 * the live score and the board geometry; the component only paints.
 */
export class PinboardProgress {
  /** @type {HTMLElement | null} */
  #el = null;
  /** @type {ListenerBag} */
  #bag = new ListenerBag();

  /** @type {number} Target score that maps to the horizon line. */
  #objective = 0;
  /** @type {number} Current level id, shown in the label. */
  #level = 1;
  /** @type {number} Total number of levels, shown in the label. */
  #total = 1;
  /** @type {number} Live score driving the fill height. */
  #score = 0;
  /** @type {number} Pinboard height in px. */
  #height = 0;
  /** @type {number} Y (px from the pinboard top) of the horizon line. */
  #lineY = 0;

  /** @param {HTMLElement} root — the pinboard element */
  mount(root) {
    const el = document.createElement("div");
    el.className = "pk-pinboard-progress";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = `
      <div class="pk-pinboard-progress-fill" data-role="fill"></div>
      <div class="pk-pinboard-progress-line" data-role="line">
        <span class="pk-pinboard-progress-label" data-role="label"></span>
      </div>
    `;
    /* Insert as the first child so it sits behind the peg stack. */
    root.insertBefore(el, root.firstChild);
    this.#el = el;
    this.#bag.add(i18n.onChange(() => this.#renderLabel()));
    this.#renderLabel();
    this.#renderGeometry();
    this.#renderFill();
  }

  destroy() {
    this.#bag.dispose();
    this.#el?.remove();
    this.#el = null;
  }

  /** @param {number} value */
  setObjective(value) {
    this.#objective = Math.max(0, value);
    this.#renderLabel();
    this.#renderFill();
  }

  /**
   * Set the level info shown in the horizon label ("Level {level}/{total}").
   * @param {number} level — current 1-based level id
   * @param {number} total — total number of levels in the run
   */
  setLevelInfo(level, total) {
    this.#level = Math.max(1, Math.floor(level || 1));
    this.#total = Math.max(1, Math.floor(total || 1));
    this.#renderLabel();
  }

  /** @param {number} value — live score (e.g. hitScore × multiplier). */
  setScore(value) {
    this.#score = Math.max(0, value);
    this.#renderFill();
  }

  /**
   * Feed the board geometry. `lineY` is the y (px from the pinboard top) of the
   * horizon line — the controller places it just above the top peg row.
   * @param {{ height: number, lineY: number }} geo
   */
  setGeometry({ height, lineY }) {
    this.#height = Math.max(0, height);
    this.#lineY = Math.max(0, Math.min(lineY, this.#height));
    this.#renderGeometry();
    this.#renderFill();
  }

  /** Position the dashed horizon line. */
  #renderGeometry() {
    const line = this.#el?.querySelector('[data-role="line"]');
    if (line) line.style.top = `${this.#lineY}px`;
  }

  /**
   * Height of the bottom-anchored fill. The distance from the board bottom up
   * to the horizon line represents exactly `objective` points; the fill scales
   * linearly with the score and is capped at the full board height so an
   * over-shoot still reads as "past the line" without leaving the board.
   */
  #renderFill() {
    const fill = this.#el?.querySelector('[data-role="fill"]');
    if (!fill) return;
    const distToLine = Math.max(0, this.#height - this.#lineY);
    const frac = this.#objective > 0 ? this.#score / this.#objective : 0;
    const px = Math.min(this.#height, frac * distToLine);
    fill.style.height = `${px}px`;
    const reached = this.#objective > 0 && this.#score >= this.#objective;
    fill.classList.toggle("pk-pinboard-progress-fill--reached", reached);
    this.#el?.classList.toggle("pk-pinboard-progress--reached", reached);
  }

  /** Refresh the objective label text (also on locale change). */
  #renderLabel() {
    const label = this.#el?.querySelector('[data-role="label"]');
    if (label) {
      label.textContent = i18n.t("game.progress.objective", {
        level: this.#level,
        total: this.#total,
        value: this.#format(this.#objective),
      });
    }
  }

  /** @param {number} n */
  #format(n) {
    return new Intl.NumberFormat().format(n);
  }
}
