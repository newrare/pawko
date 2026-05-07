/**
 * VFX Overlay System — a standalone, library-style visual effects layer.
 *
 * Applies animated overlays to any HTML element (scene, div, button, icon…).
 * Each effect is identified by a string ID and rendered as an absolutely
 * positioned child within the target element.
 *
 * @example
 * import { vfx } from './utils/vfx.js';
 *
 * // Play an effect on an element
 * const handle = vfx.play('sunburst', myElement);
 *
 * // Stop it manually
 * handle.stop();
 *
 * // Play with options
 * vfx.play('confetti', myElement, { duration: 2000 });
 * vfx.play('floating-text', myElement, { text: '+50', duration: 1500 });
 *
 * // Stop a specific effect on a target
 * vfx.stop('sunburst', myElement);
 *
 * // Stop all active effects
 * vfx.stopAll();
 */

/* --- Effect registry --------------------------------------------------- */

/** @typedef {{ stop: () => void }} VfxHandle */
/** @typedef {{ duration?: number, loop?: boolean, text?: string, color?: string, intensity?: number, image?: string }} VfxOptions */
/** @typedef {(overlay: HTMLElement, options: VfxOptions) => void} VfxBuilder */

/** @type {Map<string, VfxBuilder>} */
const registry = new Map();

/* --- Helpers ----------------------------------------------------------- */

function createOverlay(id, options) {
  const el = document.createElement("div");
  el.className = "vfx-overlay";
  el.dataset.vfx = id;
  if (options.loop) el.dataset.vfxLoop = "true";
  el.setAttribute("aria-hidden", "true");
  return el;
}

function ensurePositioned(target) {
  const pos = getComputedStyle(target).position;
  if (!pos || pos === "static" || pos === "") {
    target.style.position = "relative";
  }
}

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1));
}

function randomColor() {
  const colors = ["#ff4757", "#ffa502", "#2ed573", "#1e90ff", "#ff6b81", "#7bed9f", "#70a1ff", "#eccc68", "#a55eea", "#ff9ff3"];
  return colors[randomInt(0, colors.length - 1)];
}

/* --- Active effect tracking -------------------------------------------- */

/** @type {Set<{el: HTMLElement, target: HTMLElement, timer: number|null}>} */
const activeEffects = new Set();

/* --- Effect builders --------------------------------------------------- */

/* ----- POSITIVE EFFECTS ----- */

registry.set("sunburst", (overlay, _options) => {
  overlay.classList.add("vfx-sunburst");
  const rays = 12;
  for (let i = 0; i < rays; i++) {
    const ray = document.createElement("div");
    ray.className = "vfx-sunburst-ray";
    ray.style.setProperty("--ray-angle", `${(360 / rays) * i}deg`);
    overlay.appendChild(ray);
  }
});

registry.set("confetti", (overlay, _options) => {
  overlay.classList.add("vfx-confetti");
  const count = 40;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "vfx-particle vfx-confetti-piece";
    p.style.setProperty("--x", `${randomRange(5, 95)}%`);
    p.style.setProperty("--delay", `${randomRange(0, 0.6)}s`);
    p.style.setProperty("--drift", `${randomRange(-40, 40)}px`);
    p.style.setProperty("--fall-duration", `${randomRange(1.2, 2.5)}s`);
    p.style.setProperty("--rotate", `${randomRange(0, 720)}deg`);
    p.style.backgroundColor = randomColor();
    overlay.appendChild(p);
  }
});

registry.set("sparkle-trail", (overlay, _options) => {
  overlay.classList.add("vfx-sparkle-trail");
  const count = 20;
  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.className = "vfx-particle vfx-sparkle";
    s.style.setProperty("--x", `${randomRange(10, 90)}%`);
    s.style.setProperty("--y", `${randomRange(10, 90)}%`);
    s.style.setProperty("--delay", `${randomRange(0, 1.5)}s`);
    s.style.setProperty("--scale", `${randomRange(0.5, 1.5)}`);
    overlay.appendChild(s);
  }
});

registry.set("god-rays", (overlay, _options) => {
  overlay.classList.add("vfx-god-rays");
  const rays = 5;
  for (let i = 0; i < rays; i++) {
    const r = document.createElement("div");
    r.className = "vfx-god-ray";
    r.style.setProperty("--ray-x", `${randomRange(10, 90)}%`);
    r.style.setProperty("--ray-width", `${randomRange(40, 120)}px`);
    r.style.setProperty("--ray-delay", `${randomRange(0, 1)}s`);
    r.style.setProperty("--ray-opacity", `${randomRange(0.15, 0.4)}`);
    overlay.appendChild(r);
  }
});

registry.set("gold-shower", (overlay, options) => {
  overlay.classList.add("vfx-gold-shower");
  const src = options.image || "/images/coin.png";
  const count = 25;
  for (let i = 0; i < count; i++) {
    const coin = document.createElement("img");
    coin.className = "vfx-particle vfx-gold-coin";
    coin.src = src;
    coin.alt = "";
    coin.style.setProperty("--x", `${randomRange(5, 95)}%`);
    coin.style.setProperty("--delay", `${randomRange(0, 1.5)}s`);
    coin.style.setProperty("--fall-duration", `${randomRange(1.5, 3)}s`);
    coin.style.setProperty("--drift", `${randomRange(-20, 20)}px`);
    overlay.appendChild(coin);
  }
});

registry.set("bloom-flash", (overlay, _options) => {
  overlay.classList.add("vfx-bloom-flash");
});

registry.set("fireworks", (overlay, _options) => {
  overlay.classList.add("vfx-fireworks");
  const bursts = 5;
  for (let b = 0; b < bursts; b++) {
    const burst = document.createElement("div");
    burst.className = "vfx-firework-burst";
    burst.style.setProperty("--burst-x", `${randomRange(15, 85)}%`);
    burst.style.setProperty("--burst-y", `${randomRange(15, 70)}%`);
    burst.style.setProperty("--burst-delay", `${randomRange(0, 1.2)}s`);
    const color = randomColor();
    const sparks = 12;
    for (let s = 0; s < sparks; s++) {
      const spark = document.createElement("div");
      spark.className = "vfx-particle vfx-firework-spark";
      spark.style.setProperty("--angle", `${(360 / sparks) * s}deg`);
      spark.style.setProperty("--dist", `${randomRange(25, 55)}px`);
      spark.style.backgroundColor = color;
      burst.appendChild(spark);
    }
    overlay.appendChild(burst);
  }
});

registry.set("halo-ring", (overlay, _options) => {
  overlay.classList.add("vfx-halo-ring");
  const ring = document.createElement("div");
  ring.className = "vfx-halo";
  overlay.appendChild(ring);
});

registry.set("floating-text", (overlay, options) => {
  overlay.classList.add("vfx-floating-text");
  const text = options.text || "+1";
  const el = document.createElement("div");
  el.className = "vfx-float-number";
  el.textContent = text;
  if (options.color) el.style.color = options.color;
  overlay.appendChild(el);
});

/* ----- NEGATIVE EFFECTS ----- */

registry.set("blood-vignette", (overlay, _options) => {
  overlay.classList.add("vfx-blood-vignette");
});

registry.set("frost", (overlay, _options) => {
  overlay.classList.add("vfx-frost");
});

registry.set("cracked-screen", (overlay, _options) => {
  overlay.classList.add("vfx-cracked-screen");
  const cracks = 5;
  for (let i = 0; i < cracks; i++) {
    const crack = document.createElement("div");
    crack.className = "vfx-crack";
    crack.style.setProperty("--crack-x", `${randomRange(20, 80)}%`);
    crack.style.setProperty("--crack-y", `${randomRange(20, 80)}%`);
    crack.style.setProperty("--crack-angle", `${randomRange(-45, 45)}deg`);
    crack.style.setProperty("--crack-len", `${randomRange(40, 120)}px`);
    overlay.appendChild(crack);
  }
});

/* --- Public API -------------------------------------------------------- */

export const vfx = {
  /**
   * Play a VFX effect on the given target element.
   * @param {string} id — Effect identifier (e.g. "sunburst", "confetti").
   * @param {HTMLElement} target — The DOM element to apply the effect to.
   * @param {VfxOptions} [options={}] — Optional config (duration, loop, text…).
   * @returns {VfxHandle} A handle with a `stop()` method to remove the effect.
   */
  play(id, target, options = {}) {
    const builder = registry.get(id);
    if (!builder) {
      throw new Error(`[vfx] Unknown effect: "${id}". Available: ${[...registry.keys()].join(", ")}`);
    }

    ensurePositioned(target);
    const overlay = createOverlay(id, options);
    builder(overlay, options);
    target.appendChild(overlay);

    let timer = null;
    const entry = { el: overlay, target, timer };
    activeEffects.add(entry);

    const stop = () => {
      if (timer) clearTimeout(timer);
      overlay.remove();
      activeEffects.delete(entry);
    };

    if (options.duration) {
      timer = setTimeout(stop, options.duration);
      entry.timer = timer;
    }

    return { stop };
  },

  /**
   * Stop a specific effect on a target element.
   * @param {string} id
   * @param {HTMLElement} target
   */
  stop(id, target) {
    for (const entry of activeEffects) {
      if (entry.target === target && entry.el.dataset.vfx === id) {
        if (entry.timer) clearTimeout(entry.timer);
        entry.el.remove();
        activeEffects.delete(entry);
        return;
      }
    }
  },

  /**
   * Stop all active VFX effects across all targets.
   */
  stopAll() {
    for (const entry of activeEffects) {
      if (entry.timer) clearTimeout(entry.timer);
      entry.el.remove();
    }
    activeEffects.clear();
  },

  /**
   * Get the list of available effect IDs.
   * @returns {string[]}
   */
  list() {
    return [...registry.keys()];
  },
};
