import { ListenerBag } from "./listener-bag.js";

/**
 * Enable keyboard navigation on focusable elements within a container.
 * Arrow Up/Down/Left/Right cycle through items, Enter/Space activates,
 * Escape calls `onEscape`. Pointer movement clears keyboard focus so CSS
 * `:hover` works unobstructed; the next arrow key re-enables focus.
 *
 * @param {HTMLElement} container
 * @param {{ onEscape?: () => void, gridColumns?: number, selector?: string }} [options]
 * @returns {{ destroy: () => void }}
 */
export function enableKeyboardNav(container, options = {}) {
  const SELECTOR =
    options.selector ??
    "button:not([disabled]), [data-action]:not([data-disabled])";
  const { gridColumns } = options;

  let usingMouse = false;
  const bag = new ListenerBag();

  /** @returns {HTMLElement[]} */
  const getFocusable = () =>
    [...container.querySelectorAll(SELECTOR)].filter((el) => {
      if (el.disabled) return false;
      const style = el.getAttribute("style") ?? "";
      return (
        !style.includes("display:none") && !style.includes("display: none")
      );
    });

  /**
   * @param {HTMLElement[]} items
   * @param {number} index
   */
  const focusIndex = (items, index) => {
    if (items.length === 0) return;
    const i = ((index % items.length) + items.length) % items.length;
    items[i]?.focus();
  };

  bag.on(container, "pointermove", () => {
    if (usingMouse) return;
    usingMouse = true;
    const active = document.activeElement;
    const items = getFocusable();
    if (active && items.includes(/** @type {HTMLElement} */ (active))) {
      /** @type {HTMLElement} */ (active).blur();
    }
  });

  /** @param {KeyboardEvent} event */
  const handler = (event) => {
    const items = getFocusable();
    if (items.length === 0) return;
    const active = document.activeElement;
    const idx = items.indexOf(/** @type {HTMLElement} */ (active));

    switch (event.code) {
      case "ArrowDown":
      case "ArrowRight": {
        event.preventDefault();
        usingMouse = false;
        const step =
          event.code === "ArrowDown" && gridColumns ? gridColumns : 1;
        focusIndex(items, idx + step);
        break;
      }
      case "ArrowUp":
      case "ArrowLeft": {
        event.preventDefault();
        usingMouse = false;
        const step = event.code === "ArrowUp" && gridColumns ? gridColumns : 1;
        focusIndex(items, idx <= 0 ? items.length - 1 : idx - step);
        break;
      }
      case "Enter":
      case "Space": {
        if (active && items.includes(/** @type {HTMLElement} */ (active))) {
          event.preventDefault();
          active.dispatchEvent(
            new PointerEvent("pointerdown", { bubbles: true }),
          );
        }
        break;
      }
      case "Escape":
        options.onEscape?.();
        break;
    }
  };

  bag.on(window, "keydown", handler);

  // Auto-focus first item once.
  const initial = getFocusable();
  if (initial.length > 0) initial[0].focus();

  return { destroy: () => bag.dispose() };
}
