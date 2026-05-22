import { ListenerBag } from "../utils/listener-bag.js";
import { RankingModal } from "./ranking-modal.js";
import { SaveLoadModal } from "./save-load-modal.js";
import { OptionsModal } from "./options-modal.js";

/**
 * HudBar — persistent floating buttons visible on every scene inside the safe zone.
 *
 * Layout:
 *   - top-right: menu-level (go to level selector) — hidden when showHome is false
 *   - bottom-left: menu-ranking (rankings)
 *   - bottom-right: menu-folder (save/load) + menu-setting (options)
 *
 * Usage: instantiate once per scene from `mount()`, call `destroy()` from
 * the scene's `destroy()`. The HUD appends itself to the provided root
 * element and stays within the safe zone via CSS.
 */
export class HudBar {
  /** @type {HTMLElement | null} */
  #el = null;

  /** @type {ListenerBag} */
  #bag = new ListenerBag();

  /** @type {import('./modal-base.js').BaseModal | null} */
  #openModal = null;

  /** @type {(() => void) | null} */
  #onHomeClick = null;

  /**
   * @param {HTMLElement} root
   * @param {{ showHome?: boolean, onHomeClick?: () => void }} [options]
   */
  mount(root, { showHome = true, onHomeClick = null } = {}) {
    this.#onHomeClick = onHomeClick;
    const el = document.createElement("div");
    el.className = "pk-hud-bar";
    el.innerHTML = `
      ${showHome ? `<button class="pk-hud-btn pk-hud-btn--top-right gt-btn gt-clickable" data-action="level-home" aria-label="Level selector">
        <img src="images/menu-level.svg" alt="" class="pk-hud-icon" />
      </button>` : ""}
      <button class="pk-hud-btn pk-hud-btn--bottom-left gt-btn gt-clickable" data-action="ranking" aria-label="Rankings">
        <img src="images/menu-ranking.svg" alt="" class="pk-hud-icon" />
      </button>
      <div class="pk-hud-group pk-hud-group--bottom-right">
        <button class="pk-hud-btn gt-btn gt-clickable" data-action="save-load" aria-label="Save / Load">
          <img src="images/menu-folder.svg" alt="" class="pk-hud-icon" />
        </button>
        <button class="pk-hud-btn gt-btn gt-clickable" data-action="settings" aria-label="Settings">
          <img src="images/menu-setting.svg" alt="" class="pk-hud-icon" />
        </button>
      </div>
    `;
    root.appendChild(el);
    this.#el = el;

    this.#bag.on(el, "pointerdown", this.#onClick);
  }

  destroy() {
    this.#openModal?.destroy();
    this.#openModal = null;
    this.#bag.dispose();
    this.#el?.remove();
    this.#el = null;
  }

  #onClick = (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const btn = target.closest("[data-action]");
    if (!btn) return;

    e.stopPropagation();
    const action = /** @type {HTMLElement} */ (btn).dataset.action;
    switch (action) {
      case "level-home":
        this.#onHomeClick?.();
        break;
      case "ranking":
        this.#openUniqueModal(RankingModal);
        break;
      case "save-load":
        this.#openUniqueModal(SaveLoadModal);
        break;
      case "settings":
        this.#openUniqueModal(OptionsModal);
        break;
    }
  };

  /**
   * Open a modal of the given class, closing any previously opened one.
   * @param {new (opts: object) => import('./modal-base.js').BaseModal} ModalClass
   */
  #openUniqueModal(ModalClass) {
    if (this.#openModal) {
      this.#openModal.destroy();
      this.#openModal = null;
    }
    const modal = new ModalClass({
      onClose: () => {
        this.#openModal = null;
      },
    });
    modal.open();
    this.#openModal = modal;
  }
}
