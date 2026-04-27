import { ListenerBag } from "../utils/listener-bag.js";
import { SwipeDetector } from "../utils/swipe-detector.js";

/**
 * InputManager — keyboard arrows / WASD / Escape + touch swipe.
 *
 * Touch swipe handling lives in `SwipeDetector` (testable in isolation).
 * Touches on interactive UI (buttons, modals, scrollables) are passed through
 * so native behaviour (scroll, tap) keeps working.
 */
export class InputManager {
  /** @type {(direction: 'up'|'down'|'left'|'right') => void} */
  #onDirection;

  /** @type {() => void} */
  #onMenu;

  /** @type {() => boolean} */
  #isBlocked;

  /** @type {ListenerBag} */
  #bag = new ListenerBag();

  /** @type {SwipeDetector | null} */
  #swipe = null;

  /**
   * Selector that marks elements where touches should fall through to the
   * browser instead of triggering a swipe. Override at construction.
   */
  static UI_SELECTOR =
    "button, a, input, textarea, .gt-modal-overlay, .gt-clickable, [data-action]";

  /**
   * @param {Phaser.Scene} scene
   * @param {{
   *   onDirection: (direction: 'up'|'down'|'left'|'right') => void,
   *   onMenu?: () => void,
   *   isBlocked?: () => boolean,
   *   uiSelector?: string,
   * }} callbacks
   */
  constructor(
    scene,
    { onDirection, onMenu = () => {}, isBlocked = () => false, uiSelector },
  ) {
    this.#onDirection = onDirection;
    this.#onMenu = onMenu;
    this.#isBlocked = isBlocked;

    const selector = uiSelector ?? InputManager.UI_SELECTOR;

    // Keyboard
    const onKey = this.#handleKey;
    scene.input.keyboard?.on("keydown", onKey, this);
    this.#bag.add(() => scene.input.keyboard?.off("keydown", onKey, this));

    // Touch — delegated to SwipeDetector
    this.#swipe = new SwipeDetector({
      onDirection: (dir) => {
        if (this.#isBlocked()) return;
        this.#onDirection(dir);
      },
      shouldIgnore: (target) => {
        const node = /** @type {HTMLElement | null} */ (target);
        return !!node?.closest?.(selector);
      },
    });
    this.#bag.add(() => this.#swipe?.destroy());
  }

  /** @param {KeyboardEvent} event */
  #handleKey = (event) => {
    if (event.code === "Escape") {
      this.#onMenu();
      return;
    }
    if (this.#isBlocked()) return;
    /** @type {'up' | 'down' | 'left' | 'right' | null} */
    let direction = null;
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        direction = "up";
        break;
      case "ArrowDown":
      case "KeyS":
        direction = "down";
        break;
      case "ArrowLeft":
      case "KeyA":
        direction = "left";
        break;
      case "ArrowRight":
      case "KeyD":
        direction = "right";
        break;
    }
    if (direction) {
      event.preventDefault?.();
      this.#onDirection(direction);
    }
  };

  /** Tear down all listeners. Idempotent. */
  destroy() {
    this.#bag.dispose();
  }
}
