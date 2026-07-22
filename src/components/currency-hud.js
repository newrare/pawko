import { ListenerBag } from "../utils/listener-bag.js";
import { currencyManager } from "../managers/currency-manager.js";
import { diamondManager } from "../managers/diamond-manager.js";
import { bonusManager } from "../managers/bonus-manager.js";
import { iconSvg } from "../utils/icon.js";

/** Number of active-reward slots shown after the wallet counters. */
const BONUS_SLOTS = 3;

/**
 * CurrencyHud — compact coins + diamonds read-out for the pinboard scene,
 * followed by a row of active-reward slots.
 *
 * Sits at the bottom-left of the safe zone, just right of the ranking HUD
 * button, and adopts the same height / surface styling as the persistent HUD
 * buttons (see `hud.css`). It never intercepts pointer events — it is a pure
 * live display, wired to the currency, diamond and bonus managers.
 */
export class CurrencyHud {
  /** @type {HTMLElement | null} */
  #el = null;
  /** @type {ListenerBag} */
  #bag = new ListenerBag();

  /** @param {HTMLElement} root */
  mount(root) {
    const el = document.createElement("div");
    el.className = "pk-currency-hud";
    el.innerHTML = `
      <span class="pk-currency-hud-item">
        <img src="images/icon-coin.svg" class="pk-svg-icon" alt="" />
        <span class="pk-currency-hud-value" data-role="coins">0</span>
      </span>
      <span class="pk-currency-hud-item pk-currency-hud-item--diamond">
        <img src="images/icon-card-diamond.svg" class="pk-svg-icon" alt="" />
        <span class="pk-currency-hud-value" data-role="diamonds">0</span>
      </span>
      <span class="pk-currency-hud-slots" data-role="slots"></span>
    `;
    root.appendChild(el);
    this.#el = el;

    this.#bag.add(currencyManager.on("change", () => this.#render()));
    this.#bag.add(diamondManager.on("change", () => this.#render()));
    this.#bag.add(bonusManager.on("change", () => this.#renderSlots()));
    this.#render();
  }

  destroy() {
    this.#bag.dispose();
    this.#el?.remove();
    this.#el = null;
  }

  /** Refresh both counters and the bonus slots. */
  #render() {
    this.#setText("coins", currencyManager.get());
    this.#setText("diamonds", diamondManager.get());
    this.#renderSlots();
  }

  /**
   * Fill the fixed row of slots with the run's active-reward icons (first
   * {@link BONUS_SLOTS}); any remaining slots render empty.
   */
  #renderSlots() {
    const slotsEl = this.#el?.querySelector('[data-role="slots"]');
    if (!slotsEl) return;
    const active = bonusManager.getActiveSession();
    let html = "";
    for (let i = 0; i < BONUS_SLOTS; i++) {
      const entry = active[i];
      const icon = entry?.def?.icon ? iconSvg(entry.def.icon) : "";
      const filled = icon ? " pk-currency-hud-slot--filled" : "";
      const title = entry ? ` title="${entry.id}"` : "";
      html += `<span class="pk-currency-hud-slot${filled}"${title}>${icon}</span>`;
    }
    slotsEl.innerHTML = html;
  }

  /** @param {string} role @param {number} value */
  #setText(role, value) {
    const target = this.#el?.querySelector(`[data-role="${role}"]`);
    if (target) target.textContent = String(value);
  }
}
