import { ListenerBag } from "../utils/listener-bag.js";
import { buttonHtml } from "./ui/button.js";

/**
 * CentralScore — the single score readout, living at the center of the board.
 *
 * There is no corner HUD anymore. During play the running hit score is shown
 * as a faint background watermark (`setScore`). At the end of the round the
 * controller brings it to the foreground (`enterForeground` — a light overlay
 * dims the board and a slow sunburst turns on), then flies one blue multiplier
 * ball per gained multiplier onto it: each landing calls `applyStep`, which
 * grows the total, pops a blue ×N label and flashes a burst. Once every
 * multiplier has landed `finish` settles the total and fades the action button
 * in (there is no level-end modal).
 *
 * The reveal has two moods, driven by `enterForeground(victory)`: a win keeps
 * the gold sunburst and a Continue button; a loss swaps the sunburst for a
 * dark overlay with rising lava embers, labels the button "New run", and —
 * only once the total has finished incrementing — drops a dramatic Game Over
 * above the score.
 *
 * Owns a `ListenerBag`; `destroy()` is idempotent.
 */
export class CentralScore {
  /** @type {HTMLElement | null} */
  #el = null;
  /** @type {ListenerBag} */
  #bag = new ListenerBag();
  /** @type {(() => void) | null} */
  #onContinue = null;
  /** @type {number} Current displayed numeric value. */
  #value = 0;

  /** @param {HTMLElement} root */
  mount(root) {
    const el = document.createElement("div");
    el.className = "pk-cscore";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = `
      <div class="pk-cscore-sunburst" aria-hidden="true"></div>
      <div class="pk-cscore-dramatic" aria-hidden="true"></div>
      <div class="pk-cscore-lava" data-role="lava" aria-hidden="true"></div>
      <div class="pk-cscore-inner">
        <div class="pk-cscore-burst" data-role="burst" aria-hidden="true"></div>
        <div class="pk-cscore-gameover" data-role="gameover" aria-hidden="true"></div>
        <div class="pk-cscore-value" data-role="total">0</div>
        <div class="pk-cscore-continue" data-role="continue-wrap">
          ${buttonHtml({ action: "continue", label: "", variant: "primary" })}
        </div>
      </div>
    `;
    root.appendChild(el);
    this.#el = el;
    this.#bag.on(el, "click", (event) => {
      if (
        /** @type {HTMLElement} */ (event.target).closest(
          '[data-action="continue"]',
        )
      ) {
        this.#onContinue?.();
      }
    });
  }

  destroy() {
    this.#bag.dispose();
    this.#el?.remove();
    this.#el = null;
  }

  /** The number element — target of the fly-to-score / fly-multiplier VFX. */
  get valueEl() {
    return this.#el?.querySelector('[data-role="total"]') ?? null;
  }

  /**
   * Layer to host the end-of-round multiplier orbs, so they fly ABOVE the dark
   * reveal overlay (which sits over the ball layer). Shares the safe-zone
   * coordinate origin, so VFX coordinates need no adjustment.
   */
  get orbLayer() {
    return this.#el;
  }

  /** Instantly set the displayed score (live during play). @param {number} v */
  setScore(v) {
    this.#value = Math.round(v);
    const el = this.valueEl;
    if (el) el.textContent = this.#format(this.#value);
  }

  /**
   * Bring the number to the foreground (readable — opaque and larger) so the
   * total can be watched incrementing, WITHOUT revealing the win/lose outcome:
   * no overlay, no effect, neutral gold color, board still visible behind.
   */
  enterForeground() {
    const el = this.#el;
    if (!el) return;
    el.classList.remove(
      "pk-cscore--settled",
      "pk-cscore--outcome",
      "pk-cscore--win",
      "pk-cscore--lose",
    );
    el.classList.add("pk-cscore--foreground");
  }

  /**
   * Reveal the outcome — called a beat after the total finishes incrementing so
   * the win/lose is held back for suspense. The overlay and effect bloom in
   * (progressively, via CSS transitions): a gold sunburst on a win, a dark
   * overlay with rising lava embers on a loss (which recolors the number red).
   * @param {boolean} victory
   */
  revealOutcome(victory) {
    const el = this.#el;
    if (!el) return;
    el.classList.toggle("pk-cscore--win", victory);
    el.classList.toggle("pk-cscore--lose", !victory);
    el.classList.add("pk-cscore--outcome");
    /* Defeat gets rising lava embers instead of the celebratory sunburst. */
    if (!victory) this.#spawnLava();
  }

  /**
   * Fill the lava layer with rising ember particles (defeat backdrop). Each
   * ember gets randomized size / horizontal drift / rise height / timing via
   * CSS custom properties, then loops forever through the `pk-cscore-ember`
   * keyframe until the element is torn down.
   */
  #spawnLava() {
    const host = this.#el?.querySelector('[data-role="lava"]');
    if (!host) return;
    host.innerHTML = "";
    const COUNT = 28;
    for (let i = 0; i < COUNT; i++) {
      const ember = document.createElement("span");
      ember.className = "pk-cscore-ember";
      const size = 4 + Math.random() * 9;
      ember.style.setProperty("--s", `${size.toFixed(1)}px`);
      ember.style.left = `${(Math.random() * 100).toFixed(1)}%`;
      ember.style.setProperty(
        "--rise",
        `${(140 + Math.random() * 260).toFixed(0)}px`,
      );
      ember.style.setProperty(
        "--drift",
        `${(Math.random() * 70 - 35).toFixed(0)}px`,
      );
      ember.style.setProperty("--dur", `${(1.8 + Math.random() * 2.4).toFixed(2)}s`);
      ember.style.setProperty("--delay", `${(Math.random() * 3).toFixed(2)}s`);
      host.appendChild(ember);
    }
  }

  /**
   * Apply one multiplier step as its blue ball lands: pop a blue ×`delta`
   * label, flash the burst, then count the total up to `total`.
   * @param {number} total  the new running total
   * @param {number} delta  this gate's multiplier contribution (×1, ×2, …)
   * @param {() => void} [done] fired once the count-up settles
   */
  applyStep(total, delta, done) {
    const el = this.valueEl;
    if (!el) {
      done?.();
      return;
    }
    this.#popMult(delta);
    this.#burst();
    this.#impact(el);
    this.#countUp(el, this.#value, Math.round(total), 300, () => {
      this.#value = Math.round(total);
      el.textContent = this.#format(this.#value);
      done?.();
    });
  }

  /**
   * Settle to the final score and fade the action button in. On defeat a
   * dramatic Game Over label drops in above the score — it appears only now,
   * once the total has finished incrementing. The button label is supplied by
   * the caller (Continue on a win, New run on a loss).
   * @param {number} finalScore
   * @param {{ continueLabel?: string, onContinue?: () => void,
   *   gameOverLabel?: string }} [opts]
   */
  finish(finalScore, { continueLabel, onContinue, gameOverLabel } = {}) {
    this.#onContinue = onContinue ?? null;
    const el = this.#el;
    if (!el) return;
    this.setScore(finalScore);
    const labelEl = el.querySelector(
      '[data-action="continue"] .gt-btn-label',
    );
    if (labelEl && continueLabel != null) labelEl.textContent = continueLabel;
    const gameOverEl = el.querySelector('[data-role="gameover"]');
    if (gameOverEl && gameOverLabel != null) {
      gameOverEl.textContent = gameOverLabel;
    }
    this.#impact(this.valueEl);
    el.classList.add("pk-cscore--settled");
  }

  // ─── internals ───────────────────────────────────────────────────────

  /**
   * Tween the number from `from` to `to` over `duration` ms.
   * @param {Element} el @param {number} from @param {number} to
   * @param {number} duration @param {() => void} done
   */
  #countUp(el, from, to, duration, done) {
    const STEPS = Math.max(1, Math.round(duration / 30));
    let step = 0;
    el.textContent = this.#format(Math.round(from));
    const stop = this.#bag.interval(() => {
      step += 1;
      const t = Math.min(1, step / STEPS);
      el.textContent = this.#format(Math.round(from + (to - from) * t));
      if (step >= STEPS) {
        stop();
        done();
      }
    }, duration / STEPS);
  }

  /** Pop a transient blue ×`delta` label at the center. @param {number} delta */
  #popMult(delta) {
    const inner = this.#el?.querySelector(".pk-cscore-inner");
    if (!inner) return;
    const pop = document.createElement("div");
    pop.className = "pk-cscore-mult-pop";
    pop.textContent = `×${this.#format(delta)}`;
    inner.appendChild(pop);
    this.#bag.timeout(() => pop.remove(), 900);
  }

  /** Replay the blue impact-burst ring. */
  #burst() {
    const el = this.#el?.querySelector('[data-role="burst"]');
    if (!el) return;
    el.classList.remove("pk-cscore-burst--go");
    void (/** @type {HTMLElement} */ (el).offsetWidth);
    el.classList.add("pk-cscore-burst--go");
  }

  /** Replay the strong scale pulse on the total. @param {Element | null} el */
  #impact(el) {
    if (!el) return;
    el.classList.remove("pk-cscore-value--impact");
    void (/** @type {HTMLElement} */ (el).offsetWidth);
    el.classList.add("pk-cscore-value--impact");
  }

  /** @param {number} n */
  #format(n) {
    return new Intl.NumberFormat().format(n);
  }
}
