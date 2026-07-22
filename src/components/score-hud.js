import { ListenerBag } from "../utils/listener-bag.js";
import { audioManager } from "../managers/audio-manager.js";

/**
 * ScoreHud — the top-center live readout for a score-mode level.
 *
 * Shows two running values:
 *  - the hit score (gold) — points fly into it as pegs are hit,
 *  - the multiplier (blue) — raised by balls falling into x1/x2 gates.
 *
 * The level objective is *not* shown here — it lives on the pinboard
 * background progress bar (see {@link PinboardProgress}). At the end of the
 * round `reveal()` plays the hit × multiplier = final animation and resolves
 * once it settles, so the controller can then open the level-end modal.
 */
export class ScoreHud {
  /** @type {HTMLElement | null} */
  #el = null;
  /** @type {ListenerBag} */
  #bag = new ListenerBag();

  /** @type {number} */
  #hitScore = 0;
  /** @type {number} */
  #multiplier = 1;
  /** @type {(() => void) | null} Cancels the pending fade-out timer. */
  #idleCancel = null;
  /** @type {boolean} True during the end reveal — the HUD then stays visible. */
  #revealing = false;

  /** ms of score inactivity before the HUD fades back out. */
  static IDLE_FADE_MS = 1100;

  /** @param {HTMLElement} root */
  mount(root) {
    const el = document.createElement("div");
    el.className = "pk-score-hud";
    el.innerHTML = `
      <div class="pk-score-main">
        <span class="pk-score-hits" data-role="hits">0</span>
        <span class="pk-score-mult" data-role="mult">×1</span>
      </div>
      <div class="pk-score-final" data-role="final" aria-hidden="true"></div>
    `;
    root.appendChild(el);
    this.#el = el;
    this.#renderAll();
  }

  destroy() {
    this.#bag.dispose();
    this.#el?.remove();
    this.#el = null;
  }

  /** The gold hit-score element — used as the target of the fly-to-score VFX. */
  get hitsEl() {
    return this.#el?.querySelector('[data-role="hits"]') ?? null;
  }

  /** The blue multiplier element — target of the ball→multiplier fly VFX. */
  get multEl() {
    return this.#el?.querySelector('[data-role="mult"]') ?? null;
  }

  /**
   * Center the HUD vertically on a given y (px from the top of its parent).
   * The controller places it midway between the cannon and the objective line.
   * @param {number} y
   */
  setVerticalCenter(y) {
    if (this.#el) this.#el.style.top = `${Math.round(y)}px`;
  }

  /** @param {number} value */
  setHitScore(value) {
    this.#hitScore = value;
    this.#setText("hits", this.#format(value));
    this.#bump("hits");
    this.#markActive();
  }

  /** @param {number} value */
  setMultiplier(value) {
    this.#multiplier = value;
    this.#setText("mult", `×${this.#format(value)}`);
    this.#bump("mult");
    this.#markActive();
  }

  /**
   * Fade the HUD in because the score just moved, then schedule a fade-out
   * after a short idle window. No-op once the end reveal has taken over (the
   * HUD then stays fully visible).
   */
  #markActive() {
    if (this.#revealing || !this.#el) return;
    this.#el.classList.add("pk-score-hud--active");
    this.#idleCancel?.();
    this.#idleCancel = this.#bag.timeout(() => {
      this.#el?.classList.remove("pk-score-hud--active");
      this.#idleCancel = null;
    }, ScoreHud.IDLE_FADE_MS);
  }

  /**
   * Force the HUD back to its dim resting state immediately — used while the
   * player is aiming the cannon. Ignored during the end reveal.
   */
  dim() {
    if (this.#revealing) return;
    this.#idleCancel?.();
    this.#idleCancel = null;
    this.#el?.classList.remove("pk-score-hud--active");
  }

  /**
   * Play the end-of-round reveal. When `steps` is supplied, the total starts at
   * the raw hit score (×1) and then grows one multiplier at a time — each
   * increment lands a strong impact (multiplier badge pop + total flash) — up
   * to hitScore × multiplier. Without steps it simply counts 0 → finalScore.
   *
   * `onStep(total)` is called with the target total at the base and after each
   * multiplier increment, so the caller can grow the background progress bar in
   * lock-step with the reveal.
   *
   * @param {{ finalScore: number, victory: boolean, hitScore?: number,
   *   steps?: number[], onStep?: (total: number) => void }} args
   * @returns {Promise<void>} resolves once the animation settles
   */
  reveal({ finalScore, victory, hitScore, steps, onStep }) {
    /* The reveal owns visibility from here on: pin the HUD fully visible and
       stop any pending idle fade-out. */
    this.#revealing = true;
    this.#idleCancel?.();
    this.#idleCancel = null;
    this.#el?.classList.add("pk-score-hud--active");
    return new Promise((resolve) => {
      const finalEl = this.#el?.querySelector('[data-role="final"]');
      if (!finalEl) {
        resolve();
        return;
      }
      finalEl.classList.toggle("pk-score-final--win", victory);
      finalEl.classList.toggle("pk-score-final--lose", !victory);
      finalEl.classList.add("pk-score-final--show");

      const stepList = Array.isArray(steps) ? steps.filter((d) => d > 0) : [];
      const base = Number.isFinite(hitScore) ? hitScore : finalScore;

      const settle = () => {
        finalEl.textContent = this.#format(finalScore);
        finalEl.classList.add("pk-score-final--settled");
        this.#impact();
        this.#bag.timeout(resolve, 400);
      };

      /* Simple path: no multiplier steps → plain count-up to the final. */
      if (stepList.length === 0) {
        this.#bump("hits");
        this.#bump("mult");
        onStep?.(finalScore);
        this.#countUp(finalEl, 0, finalScore, 900, settle);
        return;
      }

      /* Stepped path: reset the multiplier badge to ×1, count up to the base
         hit score, then apply each multiplier increment with an impact. */
      this.#setText("mult", "×1");
      this.#bump("hits");
      onStep?.(base);
      this.#countUp(finalEl, 0, base, 600, () => {
        let mult = 1;
        let idx = 0;
        const nextStep = () => {
          if (idx >= stepList.length) {
            settle();
            return;
          }
          const delta = stepList[idx++];
          const prevTotal = base * mult;
          mult += delta;
          const newTotal = base * mult;
          this.#setText("mult", `×${this.#format(mult)}`);
          this.#bump("mult");
          this.#impact();
          audioManager.playSfx("click");
          onStep?.(newTotal);
          this.#countUp(finalEl, prevTotal, newTotal, 320, () => {
            this.#bag.timeout(nextStep, 260);
          });
        };
        nextStep();
      });
    });
  }

  /**
   * Tween a counter element's number from `from` to `to` over `duration` ms.
   * @param {Element} el @param {number} from @param {number} to
   * @param {number} duration @param {() => void} done
   */
  #countUp(el, from, to, duration, done) {
    const STEPS = Math.max(1, Math.round(duration / 30));
    let step = 0;
    el.textContent = this.#format(Math.round(from));
    const stop = this.#bag.interval(() => {
      step += 1;
      const t = step / STEPS;
      el.textContent = this.#format(
        Math.round(from + (to - from) * Math.min(1, t)),
      );
      if (step >= STEPS) {
        stop();
        el.textContent = this.#format(Math.round(to));
        done();
      }
    }, duration / STEPS);
  }

  /** Replay the strong impact pulse on the final total line. */
  #impact() {
    const el = this.#el?.querySelector('[data-role="final"]');
    if (!el) return;
    el.classList.remove("pk-score-final--impact");
    void (/** @type {HTMLElement} */ (el).offsetWidth);
    el.classList.add("pk-score-final--impact");
  }

  #renderAll() {
    this.#setText("hits", this.#format(this.#hitScore));
    this.#setText("mult", `×${this.#format(this.#multiplier)}`);
  }

  /** @param {string} role @param {string} text */
  #setText(role, text) {
    const target = this.#el?.querySelector(`[data-role="${role}"]`);
    if (target) target.textContent = text;
  }

  /** Replay the small bump animation on a counter. @param {string} role */
  #bump(role) {
    const target = this.#el?.querySelector(`[data-role="${role}"]`);
    if (!target) return;
    target.classList.remove("pk-score-bump");
    void (/** @type {HTMLElement} */ (target).offsetWidth);
    target.classList.add("pk-score-bump");
  }

  /** @param {number} n */
  #format(n) {
    return new Intl.NumberFormat().format(n);
  }
}
