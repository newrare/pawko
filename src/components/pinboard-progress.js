import { ListenerBag } from "../utils/listener-bag.js";
import { i18n } from "../managers/i18n-manager.js";
import { PLINKO } from "../configs/constants.js";

/**
 * PinboardProgress — the objective read-out rendered *behind* the pegs and
 * balls, filling the whole pinboard like a live progress bar.
 *
 * The board maps a single, run-wide score scale: the bottom is 0 and the top
 * is `scale` — the objective of the *last* level. Every level shares this
 * scale, so only the dashed objective line moves: it sits low on the board for
 * level 1 (a small objective) and climbs toward the top as the level objective
 * approaches the last level's. The bottom-anchored fill rises with the live
 * score on that same scale, meeting the line exactly when score === objective.
 *
 * The label is compact and hugs the two ends of the dashed rule:
 *
 *     ─Lv1───────────────────────────500─
 *
 * with the level id on the left and the target value on the right. The whole
 * thing never intercepts pointer events and lives at the lowest z-index of the
 * pinboard, so gameplay reads on top of it.
 *
 * Pure geometry — no gameplay knowledge. The controller feeds it the scale, the
 * objective, the live score and the board height; the component only paints.
 */
export class PinboardProgress {
  /** @type {HTMLElement | null} */
  #el = null;
  /** @type {ListenerBag} */
  #bag = new ListenerBag();

  /** @type {number} Score that maps to the top of the board (last-level objective). */
  #scale = 0;
  /** @type {number} Target score that maps to the dashed line for this level. */
  #objective = 0;
  /** @type {number} Current level id, shown in the left chip. */
  #level = 1;
  /** @type {number} Live score driving the fill height. */
  #score = 0;
  /** @type {number} Pinboard height in px. */
  #height = 0;
  /** @type {number} Y (px from the pinboard top) of the dashed objective line. */
  #lineY = 0;

  /** @param {HTMLElement} root — the pinboard element */
  mount(root) {
    const el = document.createElement("div");
    el.className = "pk-pinboard-progress";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = `
      <div class="pk-pinboard-progress-fill" data-role="fill"></div>
      <div class="pk-pinboard-progress-line" data-role="line">
        <span class="pk-pinboard-progress-level" data-role="level"></span>
        <span class="pk-pinboard-progress-rule"></span>
        <span class="pk-pinboard-progress-value" data-role="value"></span>
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

  /**
   * Set the run-wide score scale: the score that maps to the very top of the
   * board (the objective of the last level). Shared by every level so the bar
   * reads consistently across the run.
   * @param {number} value
   */
  setScale(value) {
    this.#scale = Math.max(0, value);
    this.#renderGeometry();
    this.#renderFill();
  }

  /** @param {number} value */
  setObjective(value) {
    this.#objective = Math.max(0, value);
    this.#renderLabel();
    this.#renderGeometry();
    this.#renderFill();
  }

  /**
   * Set the level info shown in the compact label. Only the level id is shown
   * (the left chip); `total` is accepted for call-site symmetry but unused now
   * that the compact label drops the "/total" suffix.
   * @param {number} level — current 1-based level id
   * @param {number} [_total] — total number of levels (no longer displayed)
   */
  setLevelInfo(level, _total) {
    this.#level = Math.max(1, Math.floor(level || 1));
    this.#renderLabel();
  }

  /** @param {number} value — live score (e.g. hitScore × multiplier). */
  setScore(value) {
    this.#score = Math.max(0, value);
    this.#renderFill();
  }

  /**
   * Feed the board geometry. Only the height is needed — the objective line is
   * derived from the shared score scale, not from the peg layout.
   * @param {{ height: number }} geo
   */
  setGeometry({ height }) {
    this.#height = Math.max(0, height);
    this.#renderGeometry();
    this.#renderFill();
  }

  /** @returns {number} Y (px from the pinboard top) of the objective line. */
  get lineY() {
    return this.#lineY;
  }

  /**
   * Effective scale ceiling: the run-wide scale when set, otherwise the level
   * objective (backward-safe fallback so the bar still reads without a scale).
   */
  #ceiling() {
    return this.#scale > 0 ? this.#scale : this.#objective;
  }

  /**
   * Position the dashed objective line on the shared scale: the line sits
   * `objective / scale` of the way up the board. It is clamped so the line —
   * and its label — stay on-board, reserving `PROGRESS_TOP_RESERVE` px at the
   * top for the last level's near-ceiling objective.
   */
  #renderGeometry() {
    const line = this.#el?.querySelector('[data-role="line"]');
    if (!line) return;
    const ceiling = this.#ceiling();
    const frac = ceiling > 0 ? Math.min(1, this.#objective / ceiling) : 0;
    const raw = (1 - frac) * this.#height;
    this.#lineY = Math.max(
      PLINKO.PROGRESS_TOP_RESERVE,
      Math.min(raw, this.#height),
    );
    line.style.top = `${this.#lineY}px`;
  }

  /**
   * Height of the bottom-anchored fill. The fill scales linearly with the live
   * score on the shared scale (`score / scale`), capped at the full board
   * height. Because the line sits at `objective / scale`, the fill meets the
   * line exactly when the score reaches the objective.
   */
  #renderFill() {
    const fill = this.#el?.querySelector('[data-role="fill"]');
    if (!fill) return;
    const ceiling = this.#ceiling();
    const frac = ceiling > 0 ? this.#score / ceiling : 0;
    const px = Math.max(0, Math.min(this.#height, frac * this.#height));
    fill.style.height = `${px}px`;
    const reached = this.#objective > 0 && this.#score >= this.#objective;
    fill.classList.toggle("pk-pinboard-progress-fill--reached", reached);
    this.#el?.classList.toggle("pk-pinboard-progress--reached", reached);
  }

  /** Refresh the compact label chips (also on locale change). */
  #renderLabel() {
    const levelEl = this.#el?.querySelector('[data-role="level"]');
    if (levelEl) {
      levelEl.textContent = i18n.t("game.progress.level", {
        level: this.#level,
      });
    }
    const valueEl = this.#el?.querySelector('[data-role="value"]');
    if (valueEl) valueEl.textContent = this.#format(this.#objective);
  }

  /** @param {number} n */
  #format(n) {
    return new Intl.NumberFormat().format(n);
  }
}
