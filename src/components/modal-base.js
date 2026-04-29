import { ListenerBag } from "../utils/listener-bag.js";
import { enableKeyboardNav } from "../utils/keyboard-nav.js";
import { i18n } from "../managers/i18n-manager.js";

/**
 * BaseModal — every DOM modal extends this.
 *
 * What it does for you:
 *  - Builds the `.gt-modal-overlay > .gt-modal` shell.
 *  - Mounts the overlay directly on `document.body` — `position: fixed` then
 *    resolves against the real viewport with no transform interference.
 *  - Owns a `ListenerBag` so subclasses never leak listeners.
 *  - Wires keyboard navigation + Escape-to-close.
 *  - Closes when the backdrop is clicked.
 *  - Re-renders on locale change (subclass implements `renderBody`).
 *
 * What you implement in subclasses:
 *  - `renderBody()` returns the inner HTML string.
 *  - `onAction(name, event)` reacts to `[data-action="…"]` clicks.
 *  - `onMount()` (optional) for custom DOM wiring after first render.
 *
 * Lifecycle:
 *   const modal = new MyModal(opts);
 *   modal.open();
 *   …
 *   modal.close(); // or modal.destroy()
 */
export class BaseModal {
  /** @type {ListenerBag} */
  bag = new ListenerBag();

  /** @type {HTMLElement | null} */
  #overlay = null;

  /** @type {{ destroy: () => void } | null} */
  #keyNav = null;

  /** @type {object} */
  options;

  /**
   * @param {{
   *   onClose?: () => void,
   *   className?: string,
   *   closeOnBackdrop?: boolean,
   *   closeOnEscape?: boolean,
   *   keyboardNav?: boolean,
   *   parent?: HTMLElement,
   * }} [options]
   */
  constructor(options = {}) {
    this.options = {
      closeOnBackdrop: true,
      closeOnEscape: true,
      keyboardNav: true,
      parent: document.body,
      ...options,
    };
  }

  /** Title shown in the header. Override or pass via options. */
  get title() {
    return this.options.title ?? "";
  }

  /** Subclasses return the body HTML string. */
  renderBody() {
    return "";
  }

  /**
   * React to a `data-action` click on a descendant.
   * @param {string} _action
   * @param {Event} _event
   */
  onAction(_action, _event) {}

  /** Hook called once the DOM is mounted. */
  onMount() {}

  /** Mount the modal. */
  open() {
    if (this.#overlay) return;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = this.#buildHtml();
    this.#overlay = /** @type {HTMLElement} */ (wrapper.firstElementChild);
    this.options.parent.appendChild(this.#overlay);

    this.bag.on(this.#overlay, "pointerdown", this.#handleClick);

    if (this.options.keyboardNav) {
      this.#keyNav = enableKeyboardNav(this.#overlay, {
        onEscape: this.options.closeOnEscape ? () => this.close() : undefined,
      });
      this.bag.add(() => this.#keyNav?.destroy());
    }

    this.bag.add(i18n.onChange(() => this.refresh()));

    this.onMount();
  }

  /** Close + destroy. Calls `options.onClose` exactly once. */
  close() {
    const fn = this.options.onClose;
    this.destroy();
    fn?.();
  }

  /** Tear everything down without calling `onClose`. Idempotent. */
  destroy() {
    if (!this.#overlay) return;
    this.bag.dispose();
    this.#overlay.remove();
    this.#overlay = null;
    this.#keyNav = null;
  }

  /** Re-render the body in place (e.g. after locale or state change). */
  refresh() {
    if (!this.#overlay) return;
    const titleEl = this.#overlay.querySelector(".gt-modal-title");
    if (titleEl) titleEl.textContent = this.title;
    const bodyEl = this.#overlay.querySelector(".gt-modal-body");
    if (bodyEl) bodyEl.innerHTML = this.renderBody();
  }

  /** @returns {HTMLElement | null} The overlay node. */
  get root() {
    return this.#overlay;
  }

  // ─── Internals ───────────────────────────────────

  #buildHtml() {
    const cls = ["gt-modal-overlay", this.options.className]
      .filter(Boolean)
      .join(" ");
    const titleHtml = this.title
      ? `<div class="gt-modal-title">${this.title}</div>`
      : "";
    return `<div class="${cls}"><div class="gt-modal" role="dialog" aria-modal="true">${titleHtml}<div class="gt-modal-body">${this.renderBody()}</div></div></div>`;
  }

  /** @param {PointerEvent} event */
  #handleClick = (event) => {
    const target = /** @type {HTMLElement} */ (event.target);

    /* Backdrop click. */
    if (this.options.closeOnBackdrop && !target.closest(".gt-modal")) {
      this.close();
      return;
    }

    /* Action delegation. */
    const actionEl = target.closest("[data-action]");
    if (actionEl) {
      const action = /** @type {HTMLElement} */ (actionEl).dataset.action;
      if (action === "close") {
        event.stopPropagation();
        this.close();
        return;
      }
      event.stopPropagation();
      this.onAction(action, event);
    }
  };
}
