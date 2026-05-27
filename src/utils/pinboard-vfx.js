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
    void /** @type {HTMLElement} */ (el).offsetWidth;
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
   * Bomb shockwave ring rendered at (x, y) inside the pinboard.
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   */
  emitBombShockwave(x, y, radius) {
    const { stackEl, bag } = this.deps;
    if (!stackEl) return;
    const wave = document.createElement("div");
    wave.className = "pk-bomb-shockwave";
    wave.style.left = `${x}px`;
    wave.style.top = `${y}px`;
    wave.style.setProperty("--pk-bomb-radius", `${radius}px`);
    stackEl.appendChild(wave);
    bag.timeout(() => wave.remove(), 600);
  }

  /**
   * Big banner shown at a saved peg's position. Tinted via --pk-peg-color
   * which is copied from the peg's resolved CSS value upstream.
   * @param {string} text
   * @param {number} x
   * @param {number} y
   * @param {string} [color]
   */
  showSaveBanner(text, x, y, color) {
    const { stackEl, bag } = this.deps;
    if (!stackEl) return;
    const banner = document.createElement("div");
    banner.className = "pk-save-banner";
    banner.textContent = text;
    banner.style.left = `${x}px`;
    banner.style.top = `${y - 16}px`;
    if (color) banner.style.setProperty("--pk-peg-color", color);
    stackEl.appendChild(banner);
    bag.timeout(() => banner.remove(), 1400);
  }
}
