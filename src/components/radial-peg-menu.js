import { ListenerBag } from "../utils/listener-bag.js";
import { PEG_REPLACE_COSTS } from "../configs/constants.js";
import { currencyManager } from "../managers/currency-manager.js";
import { i18n } from "../managers/i18n-manager.js";

/**
 * Radial menu that appears around a peg on tap. Shows all available
 * peg types the player can replace the target peg with.
 *
 * Usage:
 *   const menu = new RadialPegMenu({
 *     anchorEl,
 *     onSelect: (type) => { ... },
 *   });
 *   menu.open();
 *   // later:
 *   menu.close();
 */
export class RadialPegMenu {
  #bag = new ListenerBag();
  #anchorEl;
  #onSelect;
  #el = null;
  #backdropEl = null;

  /**
   * @param {{
   *   anchorEl: HTMLElement,
   *   onSelect: (type: string) => void,
   * }} opts
   */
  constructor({ anchorEl, onSelect }) {
    this.#anchorEl = anchorEl;
    this.#onSelect = onSelect;
  }

  open() {
    if (this.#el) return;

    /* Dark backdrop to make the radial menu pop. Sits behind the menu
       and closes it on tap-outside. */
    const backdrop = document.createElement("div");
    backdrop.className = "pk-radial-backdrop";
    this.#bag.on(backdrop, "pointerdown", (e) => {
      e.stopPropagation();
      this.close();
    });
    document.body.appendChild(backdrop);
    this.#backdropEl = backdrop;

    const el = document.createElement("div");
    el.className = "pk-radial-menu";

    const rect = this.#anchorEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    el.style.left = `${cx}px`;
    el.style.top = `${cy}px`;

    const types = Object.keys(PEG_REPLACE_COSTS);
    const count = types.length;
    const radius = 52;
    const coins = currencyManager.get();

    for (let i = 0; i < count; i++) {
      const type = types[i];
      const cost = PEG_REPLACE_COSTS[type];
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const canAfford = coins >= cost;

      const btn = document.createElement("button");
      btn.className = `pk-radial-btn pk-radial-btn--${type}`;
      btn.disabled = !canAfford;
      btn.style.transform = `translate(${x}px, ${y}px)`;
      btn.innerHTML = `
        <span class="pk-radial-icon">${this.#iconFor(type)}</span>
        <span class="pk-radial-cost">${cost}</span>
      `;
      btn.title = `${i18n.t(`peg.${type}`, type)} — ${cost} 🪙`;

      this.#bag.on(btn, "pointerdown", (e) => {
        e.stopPropagation();
        if (!canAfford) return;
        this.#onSelect(type);
        this.close();
      });

      el.appendChild(btn);
    }

    this.#bag.on(document, "keydown", (e) => {
      if (/** @type {KeyboardEvent} */ (e).key === "Escape") this.close();
    });

    document.body.appendChild(el);
    this.#el = el;
  }

  close() {
    if (this.#el) {
      this.#el.remove();
      this.#el = null;
    }
    if (this.#backdropEl) {
      this.#backdropEl.remove();
      this.#backdropEl = null;
    }
    this.#bag.dispose();
  }

  /** @param {string} type */
  #iconFor(type) {
    switch (type) {
      case "fire": return "🔥";
      case "ice": return "❄️";
      case "electrical": return "⚡";
      case "black": return "💀";
      case "bomb": return "💣";
      case "glue": return "🟢";
      case "teleport": return "🌀";
      case "shield": return "🛡️";
      default: return "?";
    }
  }
}
