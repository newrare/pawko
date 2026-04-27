import { ListenerBag } from "../utils/listener-bag.js";
import { enableKeyboardNav } from "../utils/keyboard-nav.js";
import { i18n } from "../managers/i18n-manager.js";

/**
 * BaseModal — every DOM modal extends this.
 *
 * What it does for you:
 *  - Builds the `.gt-modal-overlay > .gt-modal` shell.
 *  - Mounts the modal as a Phaser DOMElement at depth 100 by default.
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
 *   const modal = new MyModal(scene, opts);
 *   modal.open();
 *   …
 *   modal.close(); // or modal.destroy()
 */
export class BaseModal {
  /** @type {Phaser.Scene} */
  scene;

  /** @type {ListenerBag} */
  bag = new ListenerBag();

  /** @type {Phaser.GameObjects.DOMElement | null} */
  #domElement = null;

  /** @type {{ destroy: () => void } | null} */
  #keyNav = null;

  /** @type {object} */
  options;

  /**
   * @param {Phaser.Scene} scene
   * @param {{
   *   onClose?: () => void,
   *   className?: string,
   *   depth?: number,
   *   closeOnBackdrop?: boolean,
   *   closeOnEscape?: boolean,
   *   keyboardNav?: boolean,
   * }} [options]
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = {
      depth: 100,
      closeOnBackdrop: true,
      closeOnEscape: true,
      keyboardNav: true,
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

  /** Mount the modal to the scene. */
  open() {
    if (this.#domElement) return;
    const html = this.#buildHtml();
    this.#domElement = this.scene.add.dom(0, 0).createFromHTML(html);
    this.#domElement.setOrigin(0, 0);
    this.#domElement.setDepth(this.options.depth);

    const overlay = /** @type {HTMLElement} */ (this.#domElement.node);
    this.bag.on(overlay, "pointerdown", this.#handleClick);

    if (this.options.keyboardNav) {
      this.#keyNav = enableKeyboardNav(overlay, {
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
    if (!this.#domElement) return;
    this.bag.dispose();
    this.#domElement.destroy();
    this.#domElement = null;
    this.#keyNav = null;
  }

  /** Re-render the body in place (e.g. after locale or state change). */
  refresh() {
    const overlay = this.#domElement?.node;
    if (!overlay) return;
    const titleEl = overlay.querySelector(".gt-modal-title");
    if (titleEl) titleEl.textContent = this.title;
    const bodyEl = overlay.querySelector(".gt-modal-body");
    if (bodyEl) bodyEl.innerHTML = this.renderBody();
  }

  // ─── Internals ───────────────────────────────────

  #buildHtml() {
    const cls = ["gt-modal-overlay", this.options.className]
      .filter(Boolean)
      .join(" ");
    const titleHtml = this.title
      ? `<div class="gt-modal-title">${this.title}</div>`
      : "";
    return `
      <div class="${cls}">
        <div class="gt-modal" role="dialog" aria-modal="true">
          ${titleHtml}
          <div class="gt-modal-body">${this.renderBody()}</div>
        </div>
      </div>
    `;
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

  /** @returns {HTMLElement | null} The overlay node. */
  get root() {
    return this.#domElement?.node ?? null;
  }
}
