/**
 * PinboardVfx — visual-effect helpers shared by the game controller.
 *
 * The controller owns the DOM structure of the pinboard (`stackEl` for
 * pinboard-space effects, `ballLayerEl` for safe-zone-space effects)
 * and a `ListenerBag` for cleanup. This module bundles the transient
 * effects that pollute the controller with DOM construction: floating
 * text, gate score, peg flash, HP label, particle bursts, recycle beam.
 *
 * Every effect schedules its own cleanup via the bag, so the controller
 * does not have to remember the per-effect lifetimes.
 */

import { SCORE_FLY } from "../configs/constants.js";

/**
 * @typedef {object} PinboardVfxDeps
 * @property {HTMLElement | null} stackEl — pinboard-space layer
 * @property {HTMLElement | null} ballLayerEl — safe-zone-space layer
 * @property {HTMLElement | null} safeEl — used to project absolute coords
 * @property {() => number} getPinboardOffsetTop — current pinboard offset
 * @property {import('./listener-bag.js').ListenerBag} bag
 */

export class PinboardVfx {
  /** @param {PinboardVfxDeps} deps */
  constructor(deps) {
    this.deps = deps;
  }

  /**
   * Pop a floating text label inside the pinboard at (x, y).
   * @param {string} text
   * @param {number} x
   * @param {number} y
   * @param {string} [cls]
   */
  popText(text, x, y, cls = "pk-popup") {
    const { stackEl, bag } = this.deps;
    if (!stackEl) return;
    const pop = document.createElement("div");
    pop.className = cls;
    pop.textContent = text;
    pop.style.left = `${x}px`;
    pop.style.top = `${y - 12}px`;
    stackEl.appendChild(pop);
    bag.timeout(() => pop.remove(), 600);
  }

  /**
   * Same short-lived pop as {@link popText}, but the content is trusted HTML
   * (e.g. an inline `iconSvg(...)` string) rather than plain text.
   * @param {string} html — safe inner HTML (no user input)
   * @param {number} x @param {number} y @param {string} [cls]
   */
  popHtml(html, x, y, cls = "pk-popup") {
    const { stackEl, bag } = this.deps;
    if (!stackEl) return;
    const pop = document.createElement("div");
    pop.className = cls;
    pop.innerHTML = html;
    pop.style.left = `${x}px`;
    pop.style.top = `${y - 12}px`;
    stackEl.appendChild(pop);
    bag.timeout(() => pop.remove(), 600);
  }

  /**
   * Pop a rich floating label (HTML content — text + SVG icon) inside the
   * pinboard at (x, y). Uses the bouncy vfx-float-up style animation.
   * @param {string} html  — safe inner HTML (no user input)
   * @param {number} x
   * @param {number} y
   * @param {string} [color]  — CSS color applied to both text and icon
   */
  popFloatingText(html, x, y, color) {
    const { stackEl, bag } = this.deps;
    if (!stackEl) return;
    const pop = document.createElement("div");
    pop.className = "pk-float-text";
    pop.innerHTML = html;
    if (color) pop.style.color = color;
    pop.style.left = `${x}px`;
    pop.style.top = `${y - 12}px`;
    stackEl.appendChild(pop);
    bag.timeout(() => pop.remove(), 1200);
  }

  /**
   * Pop a floating label at the pinboard bottom when a ball enters a gate
   * (coins gained or HP damage).
   * @param {number} value  positive = coins gained, negative = HP damage
   * @param {number} x
   * @param {number} y
   */
  popGateEvent(value, x, y) {
    const { stackEl, bag } = this.deps;
    if (!stackEl || value === 0) return;
    const pop = document.createElement("div");
    pop.className = `pk-popup pk-popup--gate ${value > 0 ? "pk-popup--bonus" : "pk-popup--malus"}`;
    pop.textContent = value > 0 ? `+${value}` : `${value}`;
    pop.style.left = `${x}px`;
    pop.style.top = `${y - 8}px`;
    stackEl.appendChild(pop);
    bag.timeout(() => pop.remove(), 900);
  }

  /**
   * Pop a `+N` points chip at a hit peg, hold it in place so the player can
   * read it, then fly it into the hit-score counter. Coordinates are
   * pinboard-space (peg x/y); the target is the DOM element of the gold
   * counter. The chip is placed in the safe-zone ball layer.
   *
   * Two visual phases:
   *  1. Pop-in + hold for `SCORE_FLY.HOLD_MS` (peg-type coloured & styled).
   *  2. Fast travel to the counter over `SCORE_FLY.FLY_MS` (CSS transition
   *     toward --pk-fly-dx/dy), then `onArrive` fires as it merges in.
   *
   * The per-type CSS class `pk-score-fly--<type>` gives each peg nature its
   * own colour and typography so the player reads scores as type-specific.
   *
   * @param {number} points
   * @param {number} x — pinboard-space x
   * @param {number} y — pinboard-space y
   * @param {HTMLElement | null} targetEl — the hit-score counter element
   * @param {string} [type="peg"] — peg type driving colour/typography
   * @param {() => void} [onArrive] — called when the chip merges into the total
   */
  flyPointsToScore(points, x, y, targetEl, type = "peg", onArrive) {
    const { ballLayerEl, safeEl, bag, getPinboardOffsetTop } = this.deps;
    if (points <= 0) return;
    if (!ballLayerEl) {
      onArrive?.();
      return;
    }
    const oy = getPinboardOffsetTop();
    const startX = x;
    const startY = y + oy;

    let dx = 0;
    let dy = -60;
    const safeRect = safeEl?.getBoundingClientRect();
    const targetRect = targetEl?.getBoundingClientRect();
    if (safeRect && targetRect) {
      const tx = targetRect.left - safeRect.left + targetRect.width / 2;
      const ty = targetRect.top - safeRect.top + targetRect.height / 2;
      dx = tx - startX;
      dy = ty - startY;
    }

    const chip = document.createElement("div");
    chip.className = `pk-score-fly pk-score-fly--${type}`;
    chip.textContent = `+${points}`;
    chip.style.left = `${startX}px`;
    chip.style.top = `${startY}px`;
    chip.style.setProperty("--pk-fly-dx", `${dx.toFixed(1)}px`);
    chip.style.setProperty("--pk-fly-dy", `${dy.toFixed(1)}px`);
    chip.style.setProperty("--pk-fly-dur", `${SCORE_FLY.FLY_MS}ms`);
    ballLayerEl.appendChild(chip);

    /* Phase 2: after the hold, add --go to trigger the CSS travel transition. */
    bag.timeout(
      () => chip.classList.add("pk-score-fly--go"),
      SCORE_FLY.HOLD_MS,
    );
    /* Merge into the total, then dispose the chip. */
    bag.timeout(() => {
      onArrive?.();
      chip.remove();
    }, SCORE_FLY.HOLD_MS + SCORE_FLY.FLY_MS);
  }

  /**
   * Fly a blue multiplier orb from `fromEl` toward `toEl`, then invoke
   * `onArrive` when it lands (so the caller applies the multiplier exactly as
   * the orb merges in). Used both when leftover cannon balls are converted to
   * multipliers (cannon counter → central score) and for the end-of-round
   * reveal (an x1/x2 gate → central score). Coordinates resolve against the
   * safe-zone box.
   * @param {HTMLElement | null} fromEl — source element
   * @param {HTMLElement | null} toEl — target element (central score)
   * @param {() => void} [onArrive]
   * @param {HTMLElement | null} [layerEl] — host layer (defaults to the ball
   *   layer); pass a layer above the reveal overlay so the orb stays visible.
   */
  flyBallToMultiplier(fromEl, toEl, onArrive, layerEl) {
    const { ballLayerEl, safeEl, bag } = this.deps;
    const host = layerEl ?? ballLayerEl;
    const safeRect = safeEl?.getBoundingClientRect();
    if (!host || !fromEl || !safeRect) {
      onArrive?.();
      return;
    }
    const fromRect = fromEl.getBoundingClientRect();
    const startX = fromRect.left - safeRect.left + fromRect.width / 2;
    const startY = fromRect.top - safeRect.top + fromRect.height / 2;

    let dx = 0;
    let dy = -60;
    const toRect = toEl?.getBoundingClientRect();
    if (toRect) {
      const tx = toRect.left - safeRect.left + toRect.width / 2;
      const ty = toRect.top - safeRect.top + toRect.height / 2;
      dx = tx - startX;
      dy = ty - startY;
    }

    const orb = document.createElement("div");
    orb.className = "pk-mult-fly";
    orb.style.left = `${startX}px`;
    orb.style.top = `${startY}px`;
    orb.style.setProperty("--pk-fly-dx", `${dx.toFixed(1)}px`);
    orb.style.setProperty("--pk-fly-dy", `${dy.toFixed(1)}px`);
    host.appendChild(orb);
    bag.timeout(() => {
      onArrive?.();
      orb.remove();
    }, 520);
  }

  /**
   * Pop a blue `+N` multiplier label at the pinboard bottom when a ball is
   * captured by an x1 / x2 gate.
   * @param {number} delta
   * @param {number} x
   * @param {number} y
   */
  popMultiplier(delta, x, y) {
    const { stackEl, bag } = this.deps;
    if (!stackEl || delta <= 0) return;
    const pop = document.createElement("div");
    pop.className = "pk-popup pk-popup--gate pk-popup--mult";
    pop.textContent = `+${delta}×`;
    pop.style.left = `${x}px`;
    pop.style.top = `${y - 8}px`;
    stackEl.appendChild(pop);
    bag.timeout(() => pop.remove(), 900);
  }

  /**
   * Implode a peg element: the ring contracts toward its own centre and
   * fades out, then the element is removed from the DOM.
   * Call this instead of el.remove() so destruction always plays the animation.
   * @param {HTMLElement | null | undefined} el
   */
  implodePeg(el) {
    if (!el) return;
    const { bag } = this.deps;
    /* Stop pointer events so the dying peg can't be clicked. */
    el.style.pointerEvents = "none";
    /* Strip classes whose animations would fight the implode. */
    el.classList.remove("pk-tremble", "pk-flash", "pk-peg--rescuable");
    /* Reflow so the browser registers the above removals before we override. */
    void el.offsetWidth;
    /* Override every existing animation with the implode keyframe. */
    el.style.animation = "pk-peg-implode 260ms ease-in forwards";
    bag.timeout(() => el.remove(), 280);
  }

  /** Replay the .pk-flash animation on a peg element. */
  flashPegEl(el) {
    el.classList.remove("pk-flash");
    void el.offsetWidth;
    el.classList.add("pk-flash");
    this.deps.bag.timeout(() => el.classList.remove("pk-flash"), 250);
  }

  /**
   * Show a transient HP label at the peg center for 2 s. Any existing
   * transient label on the peg is replaced.
   * @param {HTMLElement} el
   * @param {number} value
   */
  showHpLabelOn(el, value) {
    const old = el.querySelector(".pk-peg-hp-label");
    if (old) old.remove();
    const label = document.createElement("span");
    label.className = "pk-peg-hp-label";
    label.textContent = String(value);
    el.appendChild(label);
    this.deps.bag.timeout(() => label.remove(), 2000);
  }

  /**
   * Replay the gate flash animation on the gate element matching `name`.
   * @param {string} name
   */
  flashGate(name) {
    const { safeEl } = this.deps;
    const el = safeEl?.querySelector(`[data-gate="${name}"]`);
    if (!el) return;
    el.classList.remove("pk-flash");
    void (/** @type {HTMLElement} */ (el).offsetWidth);
    el.classList.add("pk-flash");
  }

  /**
   * Emit a particle burst at the centre of a receptacle element.
   * @param {HTMLElement | null} el
   */
  emitReceptacleParticles(el) {
    const { safeEl, ballLayerEl, bag } = this.deps;
    if (!el || !ballLayerEl) return;
    const rect = el.getBoundingClientRect();
    const safeRect = safeEl?.getBoundingClientRect();
    if (!safeRect) return;
    const cx = rect.left - safeRect.left + rect.width / 2;
    const cy = rect.top - safeRect.top + rect.height / 2;
    for (let i = 0; i < 10; i++) {
      const particle = document.createElement("span");
      particle.className = "pk-particle";
      const angle = (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.5;
      const dist = 20 + Math.random() * 30;
      particle.style.left = `${cx}px`;
      particle.style.top = `${cy}px`;
      particle.style.setProperty("--px", `${Math.cos(angle) * dist}px`);
      particle.style.setProperty("--py", `${Math.sin(angle) * dist}px`);
      ballLayerEl.appendChild(particle);
      bag.timeout(() => particle.remove(), 450);
    }
  }

  /**
   * Recycle teleport effect: ring of particles, vertical beam, and a
   * brief materialize flash on the ball element.
   * @param {number} bx
   * @param {number} by
   * @param {HTMLElement | null} ballEl
   */
  emitRecycleTeleport(bx, by, ballEl) {
    const { ballLayerEl, bag, getPinboardOffsetTop } = this.deps;
    if (!ballLayerEl) return;
    const oy = getPinboardOffsetTop();
    const sx = bx;
    const sy = by + oy;

    for (let i = 0; i < 10; i++) {
      const p = document.createElement("div");
      p.className = "pk-particle pk-particle--recycle";
      const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      const dist = 14 + Math.random() * 16;
      p.style.cssText = `left:${sx}px;top:${sy}px;--px:${(Math.cos(angle) * dist).toFixed(1)}px;--py:${(Math.sin(angle) * dist).toFixed(1)}px`;
      ballLayerEl.appendChild(p);
      bag.timeout(() => p.remove(), 450);
    }

    const beam = document.createElement("div");
    beam.className = "pk-recycle-beam";
    beam.style.cssText = `left:${sx}px;top:0;height:${sy}px`;
    ballLayerEl.appendChild(beam);
    bag.timeout(() => beam.remove(), 550);

    if (ballEl) {
      ballEl.classList.remove("pk-recycle-materialize");
      void ballEl.offsetWidth;
      ballEl.classList.add("pk-recycle-materialize");
      bag.timeout(() => ballEl.classList.remove("pk-recycle-materialize"), 400);
    }
  }

  /**
   * Peg teleport effect: a short vertical beam in teleport-indigo colour.
   * Subtle variant of emitRecycleTeleport — no particles, no materialize
   * flash, half the beam length and thickness.
   * @param {number} bx
   * @param {number} by
   * @param {HTMLElement | null} _ballEl  — unused, kept for API symmetry
   */
  emitPegTeleport(bx, by, _ballEl) {
    const { ballLayerEl, bag, getPinboardOffsetTop } = this.deps;
    if (!ballLayerEl) return;
    const oy = getPinboardOffsetTop();
    const sx = bx;
    const sy = by + oy;
    const halfSy = sy / 2;

    const beam = document.createElement("div");
    beam.className = "pk-teleport-beam";
    beam.style.cssText = `left:${sx}px;top:${halfSy.toFixed(1)}px;height:${halfSy.toFixed(1)}px`;
    ballLayerEl.appendChild(beam);
    bag.timeout(() => beam.remove(), 550);
  }

  /**
   * Pop a large chest-reward floating label that stays visible for ~2 s.
   * Uses the .pk-float-text--chest modifier for a bigger, slower animation.
   * @param {string} html  — safe inner HTML (no user input)
   * @param {number} x
   * @param {number} y
   * @param {string} [color]  — CSS color applied to text and icon
   */
  popChestFloatingText(html, x, y, color) {
    const { stackEl, bag } = this.deps;
    if (!stackEl) return;
    const pop = document.createElement("div");
    pop.className = "pk-float-text pk-float-text--chest";
    pop.innerHTML = html;
    if (color) pop.style.color = color;
    pop.style.left = `${x}px`;
    pop.style.top = `${y - 16}px`;
    stackEl.appendChild(pop);
    bag.timeout(() => pop.remove(), 2400);
  }

  /**
   * Pop a multicolor mystery-bonus floating label that stays visible for ~2 s.
   * Uses the same large animation as the chest variant but with a rainbow
   * gradient text instead of a solid color.
   * @param {string} html  — safe inner HTML (no user input)
   * @param {number} x
   * @param {number} y
   */
  popMysteryFloatingText(html, x, y) {
    const { stackEl, bag } = this.deps;
    if (!stackEl) return;
    const pop = document.createElement("div");
    pop.className = "pk-float-text pk-float-text--chest pk-float-text--mystery";
    pop.innerHTML = html;
    pop.style.left = `${x}px`;
    pop.style.top = `${y - 16}px`;
    stackEl.appendChild(pop);
    bag.timeout(() => pop.remove(), 2400);
  }

  /**
   * Full bomb explosion effect at (x, y) inside the pinboard:
   * central flash, inner ring, outer ring, and debris particles.
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   */
  emitBombExplosion(x, y, radius) {
    const { stackEl, bag } = this.deps;
    if (!stackEl) return;
    const r = `${radius}px`;
    const pos = `left:${x}px;top:${y}px`;

    /* Blast zone disc — filled, expands to exact damage radius, shows player where blast hit. */
    const zone = document.createElement("div");
    zone.className = "pk-bomb-blast-zone";
    zone.style.cssText = pos;
    zone.style.setProperty("--pk-bomb-radius", r);
    stackEl.appendChild(zone);
    bag.timeout(() => zone.remove(), 750);

    /* Central bright flash — inside the blast zone. */
    const flash = document.createElement("div");
    flash.className = "pk-bomb-flash";
    flash.style.cssText = pos;
    flash.style.setProperty("--pk-bomb-radius", r);
    stackEl.appendChild(flash);
    bag.timeout(() => flash.remove(), 350);

    /* Boundary ring — expands to exact damage radius edge. */
    const wave = document.createElement("div");
    wave.className = "pk-bomb-shockwave";
    wave.style.cssText = pos;
    wave.style.setProperty("--pk-bomb-radius", r);
    stackEl.appendChild(wave);
    bag.timeout(() => wave.remove(), 650);

    /* Debris particles — stay within the blast zone. */
    const SHARDS = 10;
    for (let i = 0; i < SHARDS; i++) {
      const angle = (Math.PI * 2 * i) / SHARDS + (Math.random() - 0.5) * 0.5;
      const dist = radius * 0.3 + Math.random() * radius * 0.6;
      const p = document.createElement("div");
      p.className = "pk-bomb-debris";
      p.style.cssText = pos;
      p.style.setProperty("--dx", `${(Math.cos(angle) * dist).toFixed(1)}px`);
      p.style.setProperty("--dy", `${(Math.sin(angle) * dist).toFixed(1)}px`);
      stackEl.appendChild(p);
      bag.timeout(() => p.remove(), 620);
    }
  }

  /**
   * Big banner shown at a saved peg's position. Tinted via --pk-peg-color
   * which is copied from the peg's resolved CSS value upstream.
   * @param {string} text — trusted HTML (may embed an inline icon; no user input)
   * @param {number} x
   * @param {number} y
   * @param {string} [color]
   */
  showSaveBanner(text, x, y, color) {
    const { stackEl, bag } = this.deps;
    if (!stackEl) return;
    const banner = document.createElement("div");
    banner.className = "pk-save-banner";
    banner.innerHTML = text;
    banner.style.left = `${x}px`;
    banner.style.top = `${y - 16}px`;
    if (color) banner.style.setProperty("--pk-peg-color", color);
    stackEl.appendChild(banner);
    bag.timeout(() => banner.remove(), 1400);
  }
}
