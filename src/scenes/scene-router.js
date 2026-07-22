/**
 * SceneRouter — minimal screen switcher.
 *
 * A "scene" is a plain class implementing:
 *   - `constructor(router, data)`
 *   - `mount(rootElement)`  — build/append DOM
 *   - `destroy()`           — tear it all down (idempotent)
 *
 * The router owns one DOM child of `#game-container` per active scene and
 * disposes the previous one before mounting the next. There is no game loop,
 * no canvas — gameplay code that needs `requestAnimationFrame` or Matter.js
 * runs it directly inside its own scene.
 *
 * A persistent HudBar is mounted alongside every scene so the four HUD
 * buttons (active list, ranking, save/load, settings) remain visible
 * across all screens.
 */
import { HudBar } from "../components/hud-bar.js";
import { LevelSelectorScene } from "./level-selector-scene.js";
import { gameEvents } from "../utils/event-emitter.js";

export class SceneRouter {
  /** @type {HTMLElement} */
  #container;

  /** @type {object | null} */
  #current = null;

  /** @type {HTMLElement | null} */
  #currentEl = null;

  /** @type {HudBar | null} */
  #hud = null;

  /**
   * Monotonic navigation counter. Incremented on every `start()` so a
   * re-entrant `start()` (a scene that redirects from inside its own
   * `mount()`) can be detected and the orphaned outer scene torn down
   * instead of clobbering the newer `#current`.
   * @type {number}
   */
  #generation = 0;

  /** @param {HTMLElement} container */
  constructor(container) {
    this.#container = container;
  }

  /**
   * Mount a new scene, destroying the current one first.
   * @template {new (router: SceneRouter, data?: object) => { mount(root: HTMLElement): void, destroy(): void }} T
   * @param {T} SceneClass
   * @param {object} [data]
   */
  start(SceneClass, data = {}) {
    const generation = ++this.#generation;
    this.#destroyCurrent();
    const el = document.createElement("div");
    el.className = "gt-scene";
    this.#container.appendChild(el);
    const scene = new SceneClass(this, data);
    scene.mount(el);

    /* `mount()` may re-enter `start()` (a scene that immediately redirects,
       e.g. LevelSelectorScene routing to AbilityScene on a fresh run). If it
       did, a newer generation now owns `#current`; this scene is orphaned —
       tear it down here instead of overwriting the live one. Without this the
       redirected-to scene leaks (never destroyed, stays in the DOM). */
    if (this.#generation !== generation) {
      scene.destroy();
      el.remove();
      return;
    }

    this.#current = scene;
    this.#currentEl = el;

    if (!SceneClass.hideHud) {
      this.#hud = new HudBar();
      this.#hud.mount(el, {
        showHome: !SceneClass.hideHudHome,
        onHomeClick: () => this.start(LevelSelectorScene),
      });
    }

    gameEvents.emit("scene:change", { name: SceneClass.name });
  }

  /** Tear down the active scene without mounting another. */
  destroy() {
    this.#destroyCurrent();
  }

  #destroyCurrent() {
    this.#hud?.destroy();
    this.#hud = null;
    this.#current?.destroy();
    this.#currentEl?.remove();
    this.#current = null;
    this.#currentEl = null;
  }
}
