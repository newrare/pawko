import { i18n } from "../managers/i18n-manager.js";
import { diamondManager } from "../managers/diamond-manager.js";
import { abilityManager } from "../managers/ability-manager.js";
import { ListenerBag } from "../utils/listener-bag.js";
import { SlowFloatBackground } from "../utils/slow-float-background.js";
import { ABILITY_CATEGORIES } from "../configs/ability-defs.js";

/* Visual mapping per category — display order, chip color, and icon. */
const CATEGORY_VIEW = [
  { id: ABILITY_CATEGORIES.SHOP, color: "crimson", icon: "🛒" },
  { id: ABILITY_CATEGORIES.ECONOMY, color: "green", icon: "💸" },
  { id: ABILITY_CATEGORIES.PEG, color: "epic", icon: "🎯" },
  { id: ABILITY_CATEGORIES.GATE, color: "blue", icon: "🚪" },
  { id: ABILITY_CATEGORIES.PLAYER, color: "ice", icon: "❤️" },
  { id: ABILITY_CATEGORIES.MAP, color: "crimson", icon: "🗺️" },
];

/**
 * Ability scene — chip-stack tree paid in **diamonds**.
 *
 * Each category renders as a stack of overlapping casino chips, one per
 * ability sorted by level. Clicking a chip opens a detail panel with the
 * description, cost, prerequisite, and a buy button. An ability becomes
 * "available" when every lower-level chip in the same category is owned.
 *
 * Reachable from the Ability button on the Level Selector scene.
 */
export class AbilityScene {
  /** @type {HTMLElement | null} */
  #el = null;
  /** @type {ListenerBag} */
  #bag = new ListenerBag();
  /** @type {SlowFloatBackground | null} */
  #bg = null;
  /** @type {string | null} */
  #selectedId = null;

  constructor() {}

  /** @param {HTMLElement} root */
  mount(root) {
    this.#bg = new SlowFloatBackground(root);
    this.#bag.add(() => this.#bg?.destroy());

    this.#el = document.createElement("div");
    this.#el.className = "pk-ability";
    this.#el.innerHTML = this.#renderShell();
    root.appendChild(this.#el);

    this.#bag.on(this.#el, "click", this.#onClick);
    this.#bag.add(i18n.onChange(() => this.#refresh()));
    this.#bag.add(diamondManager.on("change", () => this.#refresh()));
    this.#bag.add(abilityManager.on("change", () => this.#refresh()));

    this.#refresh();
  }

  #onClick = (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const action = target.closest("[data-action]");
    if (!action) return;
    const name = /** @type {HTMLElement} */ (action).dataset.action;
    if (name?.startsWith("select:")) {
      this.#selectedId = name.slice(7);
      this.#refresh();
      return;
    }
    if (name?.startsWith("unlock:")) this.#tryUnlock(name.slice(7));
  };

  /** @param {string} id */
  #tryUnlock(id) {
    const def = abilityManager.getAll().find((a) => a.id === id);
    if (!def) return;
    if (abilityManager.isUnlocked(id)) return;
    if (this.#stateFor(def) !== "available") return;
    if (!diamondManager.spend(def.cost)) return;
    abilityManager.unlock(id);
    /* Keep the selection on the just-bought chip so the panel reflects the
       new "owned" state without an extra click. */
    this.#selectedId = id;
  }

  /**
   * Compute the visual state of a chip: owned, available (prereq met,
   * not owned yet), or locked.
   * @param {import('../configs/ability-defs.js').AbilityDef} def
   * @returns {"owned" | "available" | "locked"}
   */
  #stateFor(def) {
    if (abilityManager.isUnlocked(def.id)) return "owned";
    const chips = this.#chipsFor(def.category);
    for (const lower of chips) {
      if (lower.level >= def.level) break;
      if (!abilityManager.isUnlocked(lower.id)) return "locked";
    }
    return "available";
  }

  /** @param {string} category */
  #chipsFor(category) {
    return abilityManager
      .getAll()
      .filter((a) => a.category === category)
      .sort((a, b) => a.level - b.level);
  }

  /** @param {string} id */
  #findDef(id) {
    return abilityManager.getAll().find((a) => a.id === id) ?? null;
  }

  /* ──────────────────────────────────────────────── render */

  #renderShell() {
    return `
      <div class="pk-ability-wallet">
        <span class="pk-ability-wallet-label">${i18n.t("ability.wallet")}</span>
        <div class="pk-ability-wallet-values">
          <span class="pk-ability-wallet-value" data-role="wallet">💎 ${diamondManager.get()}</span>
          <span class="pk-ability-wallet-delta" data-role="delta" hidden></span>
        </div>
      </div>

      <div class="pk-ability-stacks" data-role="stacks"></div>

      <aside class="pk-ability-detail" data-role="detail"></aside>
    `;
  }

  #refresh() {
    if (!this.#el) return;
    const wallet = this.#el.querySelector('[data-role="wallet"]');
    if (wallet) wallet.textContent = `💎 ${diamondManager.get()}`;

    const delta = /** @type {HTMLElement | null} */ (
      this.#el.querySelector('[data-role="delta"]')
    );
    if (delta) {
      const def = this.#selectedId ? this.#findDef(this.#selectedId) : null;
      if (def && this.#stateFor(def) === "available") {
        delta.textContent = `-${def.cost}`;
        delta.hidden = false;
      } else {
        delta.textContent = "";
        delta.hidden = true;
      }
    }

    const stacks = this.#el.querySelector('[data-role="stacks"]');
    if (stacks) stacks.innerHTML = this.#renderStacks();

    const detail = this.#el.querySelector('[data-role="detail"]');
    if (detail) detail.innerHTML = this.#renderDetail();
  }

  #renderStacks() {
    return CATEGORY_VIEW.map((view) => {
      const chips = this.#chipsFor(view.id);
      if (!chips.length) return "";
      /* Reverse so the lowest level chip sits visually on top of the
         stack — matches the preview where deeper chips peek out from
         below. */
      const rendered = chips
        .map((def, i) => this.#renderChip(def, view, chips.length - i))
        .join("");
      return `
        <div class="pk-chip-stack-wrap">
          <div class="pk-chip-stack">${rendered}</div>
          <div class="pk-chip-stack-label">${i18n.t(`ability.category.${view.id}`)}</div>
        </div>
      `;
    }).join("");
  }

  /**
   * @param {import('../configs/ability-defs.js').AbilityDef} def
   * @param {{ id: string, color: string, icon: string }} view
   * @param {number} zIndex
   */
  #renderChip(def, view, zIndex) {
    const state = this.#stateFor(def);
    const active = def.id === this.#selectedId ? " is-active" : "";
    return `
      <div class="pk-chip-wrap pk-chip-wrap--${state}${active}"
           style="--pk-chip-z:${zIndex}"
           data-action="select:${def.id}">
        <div class="pk-chip pk-chip--${view.color}">
          <div class="pk-chip-inner">
            <span class="pk-chip-icon">${view.icon}</span>
            <span class="pk-chip-level">L${def.level}</span>
          </div>
        </div>
      </div>
    `;
  }

  #renderDetail() {
    if (!this.#selectedId) {
      return `
        <div class="pk-ability-detail-empty">
          <div class="pk-ability-detail-empty-icon">🎰</div>
          <div class="pk-ability-detail-empty-text">${i18n.t("ability.detail.empty")}</div>
        </div>
      `;
    }
    const def = this.#findDef(this.#selectedId);
    if (!def) return "";
    const view = CATEGORY_VIEW.find((v) => v.id === def.category);
    const state = this.#stateFor(def);
    const have = diamondManager.get();

    const desc = i18n.t(`ability.${def.id}.desc`);
    const name = i18n.t(`ability.${def.id}`);
    const pathLabel = i18n.t("ability.detail.path", {
      name: i18n.t(`ability.category.${def.category}`),
    });

    const costHTML =
      state === "owned"
        ? `<span class="pk-ability-detail-cost-value pk-ability-detail-cost-value--free">${i18n.t("ability.detail.unlocked")}</span>`
        : `<span class="pk-ability-detail-cost-value">💎 ${def.cost}</span>`;

    let btnHTML = "";
    if (state === "owned") {
      btnHTML = `<button class="gt-btn gt-btn--ghost pk-ability-detail-btn pk-ability-detail-btn--owned" disabled>
        <span class="gt-btn-label">${i18n.t("ability.detail.owned_btn")}</span>
      </button>`;
    } else if (state === "locked") {
      const chips = this.#chipsFor(def.category);
      const idx = chips.findIndex((c) => c.id === def.id);
      const prereq = idx > 0 ? chips[idx - 1] : null;
      const label = prereq
        ? i18n.t("ability.detail.locked_btn", {
            prereq: i18n.t(`ability.${prereq.id}`),
          })
        : i18n.t("ability.detail.locked_btn_generic");
      btnHTML = `<button class="gt-btn gt-btn--ghost pk-ability-detail-btn pk-ability-detail-btn--locked" disabled>
        <span class="gt-btn-label">${label}</span>
      </button>`;
    } else if (have >= def.cost) {
      btnHTML = `<button class="gt-btn gt-btn--primary pk-ability-detail-btn" data-action="unlock:${def.id}">
        <span class="gt-btn-label">${i18n.t("ability.detail.buy_btn")}</span>
      </button>`;
    } else {
      btnHTML = `<button class="gt-btn gt-btn--ghost pk-ability-detail-btn pk-ability-detail-btn--broke" disabled>
        <span class="gt-btn-label">${i18n.t("ability.detail.broke_btn", { have, need: def.cost })}</span>
      </button>`;
    }

    const color = view?.color ?? "crimson";
    const icon = view?.icon ?? "❓";

    return `
      <div class="pk-ability-detail-content">
        <div class="pk-ability-detail-top">
          <div class="pk-chip pk-chip--${color} pk-chip--preview">
            <div class="pk-chip-inner">
              <span class="pk-chip-icon">${icon}</span>
              <span class="pk-chip-level">L${def.level}</span>
            </div>
          </div>
          <div class="pk-ability-detail-meta">
            <div class="pk-ability-detail-name">${name}</div>
            <div class="pk-ability-detail-category">${pathLabel}</div>
          </div>
        </div>
        <div class="pk-ability-detail-desc">${desc}</div>
        <div class="pk-ability-detail-cost">
          <span class="pk-ability-detail-cost-label">${i18n.t("ability.detail.cost")}</span>
          ${costHTML}
        </div>
        ${btnHTML}
      </div>
    `;
  }

  destroy() {
    this.#bag.dispose();
    this.#el?.remove();
    this.#el = null;
  }
}
