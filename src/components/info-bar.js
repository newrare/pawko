import { ListenerBag } from "../utils/listener-bag.js";
import { i18n } from "../managers/i18n-manager.js";
import { currencyManager } from "../managers/currency-manager.js";
import { diamondManager } from "../managers/diamond-manager.js";
import { saveManager } from "../managers/save-manager.js";
import { bonusManager } from "../managers/bonus-manager.js";
import { abilityManager } from "../managers/ability-manager.js";
import { BALL_KINDS } from "../entities/ball-factory.js";
import { PEG_TYPES } from "../entities/peg-factory.js";
import { BONUS_CATEGORIES, findBonus } from "../configs/bonus-defs.js";
import { findAbility } from "../configs/ability-defs.js";

export const INFO_BAR_MODES = /** @type {const} */ ({
  EXPLORATION: "exploration",
  PINBOARD: "pinboard",
});

/**
 * @typedef {'exploration' | 'pinboard'} InfoBarMode
 */

/**
 * @typedef {object} PillConfig
 * @property {string} id
 * @property {string} icon
 * @property {() => string | number} getCount
 * @property {(data: any) => string} renderDrawer
 */

/**
 * InfoBar — compact pills showing game stats with expandable drawers.
 * Positioned at the top of the safe zone, above scene content.
 */
export class InfoBar {
  /** @type {HTMLElement | null} */
  #el = null;

  /** @type {ListenerBag} */
  #bag = new ListenerBag();

  /** @type {InfoBarMode} */
  #mode;

  /** @type {string | null} */
  #openPillId = null;

  /** @type {Record<string, any>} */
  #data = {};

  /** @param {{ mode?: InfoBarMode }} options */
  constructor({ mode = INFO_BAR_MODES.EXPLORATION } = {}) {
    this.#mode = mode;
  }

  /** @param {HTMLElement} root */
  mount(root) {
    this.#el = document.createElement("div");
    this.#el.className = "pk-info-bar";
    this.#el.innerHTML = this.#render();
    root.appendChild(this.#el);

    this.#bag.on(this.#el, "click", this.#onClick);
    this.#bag.on(document, "pointerdown", this.#onOutsidePointer, true);
    this.#bag.add(i18n.onChange(() => this.#refresh()));
    this.#bag.add(currencyManager.on("change", () => this.#refresh()));
    this.#bag.add(diamondManager.on("change", () => this.#refresh()));
    this.#bag.add(bonusManager.on("change", () => this.#refresh()));
    this.#bag.add(abilityManager.on("change", () => this.#refresh()));
  }

  destroy() {
    this.#bag.dispose();
    this.#el?.remove();
    this.#el = null;
  }

  /**
   * Update data for a specific pill (used by controllers for live updates).
   * @param {string} pillId
   * @param {any} data
   */
  setData(pillId, data) {
    this.#data[pillId] = data;
    this.#refreshPill(pillId);
    if (this.#openPillId === pillId) {
      this.#refreshDrawer();
    }
  }

  #render() {
    const pills = this.#getPillConfigs();
    const pillsHtml = pills
      .map((p) => {
        const count = this.#getPillCount(p);
        const isActive = this.#openPillId === p.id;
        const zeroClass = count === 0 || count === "0" ? " pk-info-pill-count--zero" : "";
        return `
          <button class="pk-info-pill${isActive ? " pk-info-pill--active" : ""}"
                  data-pill="${p.id}"
                  aria-expanded="${isActive}">
            <span class="pk-info-pill-icon">${p.icon}</span>
            <span class="pk-info-pill-count${zeroClass}">${count}</span>
          </button>
        `;
      })
      .join("");

    const drawerHtml = this.#openPillId ? this.#renderDrawerForPill(this.#openPillId) : "";

    return `
      <div class="pk-info-pills">${pillsHtml}</div>
      ${drawerHtml}
    `;
  }

  /**
   * @param {string} pillId
   * @returns {string}
   */
  #renderDrawerForPill(pillId) {
    const config = this.#getPillConfigs().find((p) => p.id === pillId);
    if (!config) return "";

    const data = this.#data[pillId] ?? {};
    const content = config.renderDrawer(data);

    return `
      <div class="pk-info-drawer pk-info-drawer--open" data-drawer="${pillId}">
        <div class="pk-info-drawer-title">${i18n.t(`info_bar.${pillId}`)}</div>
        ${content}
      </div>
    `;
  }

  /** @param {PillConfig} config */
  #getPillCount(config) {
    if (this.#data[config.id]?.count !== undefined) {
      return this.#data[config.id].count;
    }
    return config.getCount();
  }

  /** @returns {PillConfig[]} */
  #getPillConfigs() {
    if (this.#mode === INFO_BAR_MODES.EXPLORATION) {
      return this.#getExplorationPills();
    }
    return this.#getPinboardPills();
  }

  /** @returns {PillConfig[]} */
  #getExplorationPills() {
    return [
      {
        id: "progress",
        icon: '<img src="/images/icon-flag.svg" class="pk-svg-icon" alt="">',
        getCount: () => {
          const cells = this.#flattenGridCells();
          let levelsDone = 0;
          let shopsDone = 0;
          let abilitiesDone = 0;
          let mysteriesDone = 0;
          for (const c of cells) {
            if (c.state !== "used") continue;
            if (c.type === "level" || c.type === "boss") levelsDone++;
            else if (c.type === "shop") shopsDone++;
            else if (c.type === "ability") abilitiesDone++;
            else if (c.type === "mystery") mysteriesDone++;
          }
          return `${levelsDone} | ${shopsDone} | ${abilitiesDone} | ${mysteriesDone}`;
        },
        renderDrawer: () => this.#renderProgressDrawer(),
      },
      {
        id: "resources",
        icon: '<img src="/images/icon-bag.svg" class="pk-svg-icon" alt="">',
        getCount: () =>
          `${currencyManager.get()} | <span class="pk-info-pill-count--diamond">${diamondManager.get()}</span>`,
        renderDrawer: () => this.#renderResourcesDrawer(),
      },
      {
        id: "arsenal",
        icon: '<img src="/images/icon-ball.svg" class="pk-svg-icon" alt="">',
        getCount: () => {
          const arsenal = this.#data.arsenal ?? {};
          const launchers = arsenal.launchers ?? 0;
          const pegs = arsenal.pegs ?? {};
          const specialPegs = Object.entries(pegs)
            .filter(([type]) => type !== PEG_TYPES.CLASSIC)
            .reduce((a, [, n]) => a + n, 0);
          return `${launchers} | ${specialPegs}`;
        },
        renderDrawer: () => this.#renderArsenalDrawer(),
      },
      {
        id: "session",
        icon: '<img src="/images/icon-fire.svg" class="pk-svg-icon" alt="">',
        getCount: () => {
          const active = bonusManager.getActiveSession();
          let bonuses = 0;
          let maluses = 0;
          for (const e of active) {
            if (e.def.category === BONUS_CATEGORIES.MALUS) maluses++;
            else bonuses++;
          }
          return `${bonuses} | <span class="pk-info-pill-count--malus">${maluses}</span>`;
        },
        renderDrawer: () => this.#renderSessionDrawer(),
      },
      {
        id: "permanent",
        icon: '<img src="/images/icon-lightning.svg" class="pk-svg-icon" alt="">',
        getCount: () => {
          const abilities = abilityManager.getUnlocked().length;
          const bonuses = bonusManager.getUnlockedPermanent().length;
          return `${abilities} | ${bonuses}`;
        },
        renderDrawer: () => this.#renderPermanentDrawer(),
      },
    ];
  }

  /** @returns {PillConfig[]} */
  #getPinboardPills() {
    return [
      {
        id: "hp",
        icon: "❤️",
        getCount: () => {
          const hp = this.#data.hp ?? {};
          const cur = hp.current ?? 0;
          const max = hp.max ?? 0;
          return `${cur}/${max}`;
        },
        renderDrawer: () => this.#renderHpDrawer(),
      },
      {
        id: "balls",
        icon: '<img src="/images/icon-ball.svg" class="pk-svg-icon" alt="">',
        getCount: () => {
          const balls = this.#data.balls ?? {};
          if (typeof balls === "number") return balls;
          return Object.values(balls).reduce((a, b) => a + b, 0);
        },
        renderDrawer: () => this.#renderBallsDrawer(),
      },
      {
        id: "launchers",
        icon: "🚀",
        getCount: () => this.#data.launchers?.total ?? 0,
        renderDrawer: () => this.#renderLaunchersDrawer(),
      },
      {
        id: "coins",
        icon: '<img src="/images/icon-coin.svg" class="pk-svg-icon" alt="">',
        getCount: () => currencyManager.get(),
        renderDrawer: () => this.#renderCoinsDrawer(),
      },
    ];
  }

  /**
   * Flatten the serialized grid cells (stored as a 2D rows × cols array)
   * into a single list of cells. Returns [] if no grid is saved.
   * @returns {Array<{type: string, state: string}>}
   */
  #flattenGridCells() {
    const grid = saveManager.loadGridState();
    if (!grid?.cells) return [];
    const cells = [];
    for (const row of grid.cells) {
      if (Array.isArray(row)) cells.push(...row);
      else cells.push(row);
    }
    return cells;
  }

  #renderProgressDrawer() {
    const cells = this.#flattenGridCells();
    if (cells.length === 0) {
      return `<div class="pk-info-drawer-empty">${i18n.t("info_bar.no_progress")}</div>`;
    }
    const levels = { done: 0, total: 0 };
    const shops = { done: 0, total: 0 };
    const abilities = { done: 0, total: 0 };
    const mysteries = { done: 0, total: 0 };

    for (const c of cells) {
      if (c.type === "level" || c.type === "boss") {
        levels.total++;
        if (c.state === "used") levels.done++;
      } else if (c.type === "shop") {
        shops.total++;
        if (c.state === "used") shops.done++;
      } else if (c.type === "ability") {
        abilities.total++;
        if (c.state === "used") abilities.done++;
      } else if (c.type === "mystery") {
        mysteries.total++;
        if (c.state === "used") mysteries.done++;
      }
    }

    return `
      <div class="pk-info-drawer-progress">
        <div class="pk-info-drawer-progress-item">
          <span>${i18n.t("info_bar.levels")}</span>
          <span>${levels.done}/${levels.total}</span>
        </div>
        <div class="pk-info-drawer-progress-item">
          <span>${i18n.t("info_bar.shops")}</span>
          <span>${shops.done}/${shops.total}</span>
        </div>
        <div class="pk-info-drawer-progress-item">
          <span>${i18n.t("info_bar.abilities")}</span>
          <span>${abilities.done}/${abilities.total}</span>
        </div>
        <div class="pk-info-drawer-progress-item">
          <span>${i18n.t("info_bar.mysteries")}</span>
          <span>${mysteries.done}/${mysteries.total}</span>
        </div>
      </div>
    `;
  }

  #renderResourcesDrawer() {
    const coins = currencyManager.get();
    const diamonds = diamondManager.get();

    return `
      <div class="pk-info-drawer-grid">
        <div class="pk-info-drawer-row">
          <span class="pk-info-drawer-label">
            <img src="/images/icon-coin.svg" class="pk-svg-icon pk-info-inline-icon" alt="">
            ${i18n.t("info_bar.coins")}
          </span>
          <span class="pk-info-drawer-value">${coins}</span>
        </div>
        <div class="pk-info-drawer-row">
          <span class="pk-info-drawer-label">
            <img src="/images/icon-card-diamond.svg" class="pk-svg-icon pk-info-inline-icon" alt="">
            ${i18n.t("info_bar.diamonds")}
          </span>
          <span class="pk-info-drawer-value pk-info-drawer-value--diamond">${diamonds}</span>
        </div>
      </div>
    `;
  }

  #renderArsenalDrawer() {
    const pegs = this.#data.arsenal?.pegs ?? {};
    const launchers = this.#data.arsenal?.launchers ?? 0;

    const types = Object.values(PEG_TYPES);
    const pegRows = types
      .filter((type) => (pegs[type] ?? 0) > 0)
      .map(
        (type) => `
        <div class="pk-info-drawer-row">
          <span class="pk-info-drawer-label" style="color:${this.#pegTypeColor(type)}">
            ${i18n.t(`peg.${type}`)}
          </span>
          <span class="pk-info-drawer-value">${pegs[type]}</span>
        </div>
      `,
      )
      .join("");

    const pegsContent = pegRows
      || `<div class="pk-info-drawer-empty">${i18n.t("info_bar.no_pegs")}</div>`;

    return `
      <div class="pk-info-drawer-grid">
        <div class="pk-info-drawer-row">
          <span class="pk-info-drawer-label">${i18n.t("info_bar.launchers")}</span>
          <span class="pk-info-drawer-value">${launchers}</span>
        </div>
        <div class="pk-info-drawer-subtitle">${i18n.t("info_bar.pegs")}</div>
        ${pegsContent}
      </div>
    `;
  }

  /** @param {string} type — one of PEG_TYPES values */
  #pegTypeColor(type) {
    const map = {
      [PEG_TYPES.CLASSIC]: "var(--pk-peg-ring)",
      [PEG_TYPES.BUMPER]: "var(--pk-bumper-ring)",
      [PEG_TYPES.COIN]: "var(--pk-peg-coin)",
      [PEG_TYPES.DIAMOND]: "var(--pk-peg-diamond)",
      [PEG_TYPES.GLUE]: "var(--pk-peg-glue)",
      [PEG_TYPES.TELEPORT]: "var(--pk-teleport-ring)",
      [PEG_TYPES.CHEST]: "var(--pk-peg-chest)",
      [PEG_TYPES.SHIELD]: "var(--pk-peg-shield)",
      [PEG_TYPES.MYSTERY]: "var(--pk-peg-mystery)",
      [PEG_TYPES.FIRE]: "var(--pk-peg-fire)",
      [PEG_TYPES.ICE]: "var(--pk-peg-ice)",
      [PEG_TYPES.ELECTRICAL]: "var(--pk-peg-electrical)",
      [PEG_TYPES.BOMB]: "var(--pk-peg-bomb)",
    };
    return map[type] ?? "var(--gt-color-text)";
  }

  #renderSessionDrawer() {
    const active = bonusManager.getActiveSession();
    if (active.length === 0) {
      return `<div class="pk-info-drawer-empty">${i18n.t("info_bar.no_session")}</div>`;
    }

    const bonuses = active.filter((e) => e.def.category !== BONUS_CATEGORIES.MALUS);
    const maluses = active.filter((e) => e.def.category === BONUS_CATEGORIES.MALUS);

    const renderEntry = (entry) => {
      const isMalus = entry.def.category === BONUS_CATEGORIES.MALUS;
      const nameKey = isMalus
        ? `bonus.malus.${entry.id}`
        : `bonus.session.${entry.id}`;
      const remainingLabel = Number.isFinite(entry.remaining)
        ? i18n.t("info_bar.remaining_levels", { n: entry.remaining })
        : i18n.t("info_bar.run_scoped");
      const modClass = isMalus ? "pk-info-entry--malus" : "pk-info-entry--bonus";
      return `
        <div class="pk-info-entry ${modClass}">
          <span class="pk-info-entry-icon">${entry.def.icon}</span>
          <span class="pk-info-entry-name">${i18n.t(nameKey)}</span>
          <span class="pk-info-entry-meta">${remainingLabel}</span>
        </div>
      `;
    };

    return `
      <div class="pk-info-drawer-list">
        ${bonuses.map(renderEntry).join("")}
        ${maluses.map(renderEntry).join("")}
      </div>
    `;
  }

  #renderPermanentDrawer() {
    const abilityIds = abilityManager.getUnlocked();
    const bonusIds = bonusManager.getUnlockedPermanent();
    if (abilityIds.length === 0 && bonusIds.length === 0) {
      return `<div class="pk-info-drawer-empty">${i18n.t("info_bar.no_permanent")}</div>`;
    }

    const abilityRows = abilityIds
      .map((id) => {
        const def = findAbility(id);
        if (!def) return "";
        return `
          <div class="pk-info-entry">
            <span class="pk-info-entry-icon"><img src="/images/icon-lightning.svg" class="pk-svg-icon" alt=""></span>
            <span class="pk-info-entry-name">${i18n.t(`ability.${id}`)}</span>
            <span class="pk-info-entry-meta">${i18n.t(`ability.category.${def.category}`)}</span>
          </div>
        `;
      })
      .join("");

    const bonusRows = bonusIds
      .map((id) => {
        const def = findBonus(id);
        if (!def) return "";
        return `
          <div class="pk-info-entry">
            <span class="pk-info-entry-icon">${def.icon}</span>
            <span class="pk-info-entry-name">${i18n.t(`bonus.permanent.${id}`)}</span>
          </div>
        `;
      })
      .join("");

    const abilitiesSection = abilityIds.length
      ? `<div class="pk-info-drawer-subtitle">${i18n.t("info_bar.abilities")}</div>${abilityRows}`
      : "";
    const bonusesSection = bonusIds.length
      ? `<div class="pk-info-drawer-subtitle">${i18n.t("info_bar.permanent_bonuses")}</div>${bonusRows}`
      : "";

    return `
      <div class="pk-info-drawer-list">
        ${abilitiesSection}
        ${bonusesSection}
      </div>
    `;
  }

  #renderHpDrawer() {
    const hp = this.#data.hp ?? {};
    const cur = hp.current ?? 0;
    const max = hp.max ?? 0;
    const pct = max > 0 ? Math.round((cur / max) * 100) : 0;
    return `
      <div class="pk-info-drawer-row">
        <span class="pk-info-drawer-label">${i18n.t("info_bar.hp_current")}</span>
        <span class="pk-info-drawer-value">${cur} / ${max}</span>
      </div>
      <div class="pk-info-drawer-row">
        <span class="pk-info-drawer-label">${i18n.t("info_bar.hp_percent")}</span>
        <span class="pk-info-drawer-value">${pct}%</span>
      </div>
    `;
  }

  #renderBallsDrawer() {
    const balls = this.#data.balls ?? {};
    if (typeof balls === "number") {
      return `
        <div class="pk-info-drawer-row">
          <span class="pk-info-drawer-label">${i18n.t("info_bar.total")}</span>
          <span class="pk-info-drawer-value">${balls}</span>
        </div>
      `;
    }

    const total = Object.values(balls).reduce((a, b) => a + b, 0);
    if (total === 0) {
      return `<div class="pk-info-drawer-empty">${i18n.t("info_bar.no_balls")}</div>`;
    }

    const kinds = Object.values(BALL_KINDS);
    return `
      <div class="pk-info-drawer-grid">
        ${kinds
          .map(
            (kind) => `
          <div class="pk-info-drawer-row">
            <span class="pk-info-drawer-label pk-info-drawer-label--${kind}">
              ${i18n.t(`info_bar.ball.${kind}`)}
            </span>
            <span class="pk-info-drawer-value">${balls[kind] ?? 0}</span>
          </div>
        `,
          )
          .join("")}
      </div>
    `;
  }

  #renderLaunchersDrawer() {
    const data = this.#data.launchers ?? {};
    const total = data.total ?? 0;
    const fired = data.fired ?? 0;
    const remaining = total - fired;

    return `
      <div class="pk-info-drawer-grid">
        <div class="pk-info-drawer-row">
          <span class="pk-info-drawer-label">${i18n.t("info_bar.launchers_total")}</span>
          <span class="pk-info-drawer-value">${total}</span>
        </div>
        <div class="pk-info-drawer-row">
          <span class="pk-info-drawer-label">${i18n.t("info_bar.launchers_remaining")}</span>
          <span class="pk-info-drawer-value">${remaining}</span>
        </div>
      </div>
    `;
  }

  #renderCoinsDrawer() {
    return `
      <div class="pk-info-drawer-grid">
        <div class="pk-info-drawer-row">
          <span class="pk-info-drawer-label">${i18n.t("info_bar.coins")}</span>
          <span class="pk-info-drawer-value">${currencyManager.get()}</span>
        </div>
      </div>
    `;
  }

  #refresh() {
    if (!this.#el) return;
    this.#el.innerHTML = this.#render();
  }

  /** @param {string} pillId */
  #refreshPill(pillId) {
    if (!this.#el) return;
    const pillEl = this.#el.querySelector(`[data-pill="${pillId}"]`);
    if (!pillEl) return;

    const config = this.#getPillConfigs().find((p) => p.id === pillId);
    if (!config) return;

    const count = this.#getPillCount(config);
    const countEl = pillEl.querySelector(".pk-info-pill-count");
    if (countEl) {
      countEl.innerHTML = String(count);
      countEl.classList.toggle("pk-info-pill-count--zero", count === 0 || count === "0");
    }
  }

  #refreshDrawer() {
    if (!this.#el || !this.#openPillId) return;
    const drawerEl = this.#el.querySelector(`[data-drawer="${this.#openPillId}"]`);
    if (!drawerEl) return;

    const config = this.#getPillConfigs().find((p) => p.id === this.#openPillId);
    if (!config) return;

    const content = config.renderDrawer(this.#data[this.#openPillId] ?? {});
    const titleHtml = `<div class="pk-info-drawer-title">${i18n.t(`info_bar.${this.#openPillId}`)}</div>`;
    drawerEl.innerHTML = titleHtml + content;
  }

  /**
   * Close the open drawer when a pointer event hits anything outside the
   * info-bar. Capture phase so we run before the outside target's own
   * handlers can stop propagation.
   * @param {Event} e
   */
  #onOutsidePointer = (e) => {
    if (!this.#openPillId || !this.#el) return;
    const target = /** @type {Node | null} */ (e.target);
    if (target && this.#el.contains(target)) return;
    this.#openPillId = null;
    this.#refresh();
  };

  /** @param {Event} e */
  #onClick = (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const pill = target.closest("[data-pill]");
    if (!pill) return;

    const pillId = /** @type {HTMLElement} */ (pill).dataset.pill;
    if (!pillId) return;

    if (this.#openPillId === pillId) {
      this.#openPillId = null;
    } else {
      this.#openPillId = pillId;
    }
    this.#refresh();
  };
}
