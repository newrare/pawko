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
 */
export class SceneRouter {
  /** @type {HTMLElement} */
  #container;

  /** @type {object | null} */
  #current = null;

  /** @type {HTMLElement | null} */
  #currentEl = null;

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
    this.#destroyCurrent();
    const el = document.createElement("div");
    el.className = "gt-scene";
    this.#container.appendChild(el);
    const scene = new SceneClass(this, data);
    scene.mount(el);
    this.#current = scene;
    this.#currentEl = el;
  }

  /** Tear down the active scene without mounting another. */
  destroy() {
    this.#destroyCurrent();
  }

  #destroyCurrent() {
    this.#current?.destroy();
    this.#currentEl?.remove();
    this.#current = null;
    this.#currentEl = null;
  }
}
