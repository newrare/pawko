import { i18n } from "../managers/i18n-manager.js";
import { saveManager } from "../managers/save-manager.js";
import { currencyManager } from "../managers/currency-manager.js";
import { bonusManager } from "../managers/bonus-manager.js";
import { layout } from "../managers/layout-manager.js";
import {
  PARAM_KEYS,
  SESSION_BONUSES,
  SESSION_MALUSES,
  BONUS_CATEGORIES,
} from "../configs/bonus-defs.js";
import { ListenerBag } from "../utils/listener-bag.js";
import { notify } from "../managers/notification-manager.js";
import { BackgroundAnimator } from "../utils/background-animator.js";
import { InfoBar, INFO_BAR_MODES } from "../components/info-bar.js";
import {
  LevelGrid,
  GRID_ROWS,
  GRID_COLS,
  CELL_TYPES,
  CELL_STATES,
} from "../entities/level-grid.js";
import { GameScene } from "./game-scene.js";
import { ShopScene } from "./shop-scene.js";
import { AbilityScene } from "./ability-scene.js";

/**
 * Level selector — a 7×12 exploration map where cells reveal levels, shops,
 * abilities, or empty tiles. Cells are connected by a random edge graph
 * (1–4 links per cell) creating unique paths and forks.
 */
export class LevelSelectorScene {
  /** Hide the level-home HUD button when already on this scene. */
  static hideHudHome = true;

  /** @type {import('./scene-router.js').SceneRouter} */
  #router;

  /** @type {HTMLElement | null} */
  #el = null;

  /** @type {ListenerBag} */
  #bag = new ListenerBag();

  /** @type {BackgroundAnimator | null} */
  #bg = null;

  /** @type {LevelGrid} */
  #grid;

  /** @type {Set<string>} Keys "row,col" of cells just revealed (for animation) */
  #newlyRevealed = new Set();

  /** @type {InfoBar | null} */
  #infoBar = null;

  /** @param {import('./scene-router.js').SceneRouter} router */
  constructor(router) {
    this.#router = router;
    this.#grid = new LevelGrid();
  }

  /** @param {HTMLElement} root */
  mount(root) {
    this.#bg = new BackgroundAnimator(root, 'calm');
    this.#bag.add(() => this.#bg?.destroy());

    this.#el = document.createElement("div");
    this.#el.className = "pk-level-selector";

    const saved = saveManager.loadGridState();
    if (saved && this.#isValidGridState(saved)) {
      this.#grid = LevelGrid.deserialize(saved);
      const revealed = this.#grid.revealCurrentAdjacents();
      this.#newlyRevealed = new Set(
        revealed.map((c) => `${c.row},${c.col}`),
      );
      saveManager.saveGridState(this.#grid.serialize());
    } else {
      this.#grid.init();
      saveManager.saveGridState(this.#grid.serialize());
    }

    this.#el.innerHTML = this.#render();
    root.appendChild(this.#el);

    this.#infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
    this.#infoBar.mount(this.#el);
    this.#refreshArsenal();

    this.#bag.on(this.#el, "click", (e) => {
      const target = /** @type {HTMLElement} */ (e.target);

      const cellEl = target.closest(".pk-map-cell--revealed");
      if (!cellEl) return;

      const row = Number(/** @type {HTMLElement} */ (cellEl).dataset.row);
      const col = Number(/** @type {HTMLElement} */ (cellEl).dataset.col);
      if (Number.isNaN(row) || Number.isNaN(col)) return;

      this.#onCellClick(row, col);
    });

    this.#bag.add(i18n.onChange(() => this.#refresh()));
    this.#bag.add(currencyManager.on("change", () => this.#refresh()));
    this.#bag.raf(() => this.#updateCellSize());
    this.#bag.add(layout.onChange(() => this.#updateCellSize()));
  }

  /**
   * Compute the largest cell size that fits the visible area:
   * width  → safe-zone minus grid horizontal padding
   * height → safe-zone minus info bar (absolute overlay on top) minus HUD
   *          buttons (bottom) minus grid padding.
   * Applies the result as --pk-cell-size on the map grid element.
   */
  #updateCellSize() {
    const scrollEl = this.#el?.querySelector(".pk-map-scroll");
    const gridEl = this.#el?.querySelector(".pk-map-grid");
    if (!scrollEl || !gridEl) return;

    const GAP = 8;
    const GRID_PAD_H = 16;  // --gt-space-2 (8px) × 2
    const GRID_PAD_V = 40;  // grid top(12) + bottom(12) + scroll bottom-pad(16)
    // HUD buttons at bottom: 40px height + 8px offset + 8px extra clearance
    const HUD_BOTTOM = 56;

    // Info bar is position:absolute over the scene — measure its actual height
    const infoBarEl = this.#el.querySelector(".pk-info-bar");
    const infoBarH = infoBarEl ? infoBarEl.offsetHeight : 44;

    const availW = scrollEl.clientWidth - GRID_PAD_H;
    // Use layout.safe.height (total safe zone) since scrollEl fills it all
    const availH = layout.safe.height - infoBarH - HUD_BOTTOM - GRID_PAD_V;

    const cellFromW = (availW - 6 * GAP) / 7;
    const cellFromH = (availH - 11 * GAP) / 12;
    const cellSize = Math.max(20, Math.min(cellFromW, cellFromH, 52));

    gridEl.style.setProperty("--pk-cell-size", `${Math.floor(cellSize)}px`);
  }

  // ─── Cell interaction ───────────────────────────────

  /** @param {number} row @param {number} col */
  #onCellClick(row, col) {
    const cell = this.#grid.selectCell(row, col);
    if (!cell) return;

    saveManager.saveGridState(this.#grid.serialize());

    switch (cell.type) {
      case CELL_TYPES.LEVEL:
      case CELL_TYPES.BOSS:
        this.#router.start(GameScene, { levelId: cell.levelId });
        break;
      case CELL_TYPES.SHOP:
        this.#router.start(ShopScene);
        break;
      case CELL_TYPES.ABILITY:
        this.#router.start(AbilityScene);
        break;
      case CELL_TYPES.MYSTERY:
        this.#rollMystery();
        break;
      case CELL_TYPES.EMPTY:
        this.#onEmptyCell();
        break;
      default:
        break;
    }
  }

  /**
   * 70% bonus, 30% malus. The picked entry is activated immediately and a
   * transient banner shows the outcome. Cell is already marked USED by
   * `selectCell`.
   */
  #rollMystery() {
    const rollMalus = Math.random() < 0.3;
    const pool = rollMalus ? SESSION_MALUSES : SESSION_BONUSES;
    if (!pool.length) {
      this.#refresh();
      return;
    }
    const def = pool[Math.floor(Math.random() * pool.length)];
    bonusManager.activateSession(def.id);
    const nameKey =
      def.category === BONUS_CATEGORIES.MALUS
        ? `bonus.malus.${def.id}`
        : `bonus.session.${def.id}`;
    const titleKey =
      def.category === BONUS_CATEGORIES.MALUS
        ? "level_selector.mystery_malus"
        : "level_selector.mystery_bonus";
    const isMalus = def.category === BONUS_CATEGORIES.MALUS;
    const message = i18n.t(titleKey, { name: `${def.icon} ${i18n.t(nameKey)}` });
    notify.show(message, { type: isMalus ? "warning" : "success" });

    /* Mystery is non-blocking: reveal adjacents so the player can keep
       exploring paths leading away from this cell. */
    const revealed = this.#grid.revealCurrentAdjacents();
    this.#newlyRevealed = new Set(revealed.map((c) => `${c.row},${c.col}`));
    saveManager.saveGridState(this.#grid.serialize());

    this.#refresh();
    this.#refreshArsenal();
  }

  #onEmptyCell() {
    const revealed = this.#grid.revealCurrentAdjacents();
    this.#newlyRevealed = new Set(revealed.map((c) => `${c.row},${c.col}`));
    saveManager.saveGridState(this.#grid.serialize());
    this.#refresh();
  }

  /**
   * Compute the predicted loadout for the next round (launchers + balls per
   * kind, resolved via bonusManager) and push it into the InfoBar arsenal
   * pill. Mirrors what GameController does at round start so the count is
   * consistent between scenes.
   */
  #refreshArsenal() {
    if (!this.#infoBar) return;

    const pegs = {};
    const pinboard = saveManager.loadPinboardState();
    if (pinboard?.layers) {
      for (const layer of pinboard.layers) {
        for (const p of layer.pegs ?? []) {
          pegs[p.type] = (pegs[p.type] ?? 0) + 1;
        }
      }
    }

    this.#infoBar.setData("arsenal", { pegs, launchers: 1 });
  }

  // ─── Rendering ──────────────────────────────────────

  #render() {
    let gridHtml = "";
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const cell = this.#grid.getCell(r, c);
        const gr = 2 * r + 1;
        const gc = 2 * c + 1;

        gridHtml += this.#renderCell(cell, gr, gc);

        if (c < GRID_COLS - 1) {
          gridHtml += this.#renderConnector("h", r, c, r, c + 1, gr, gc + 1);
        }
        if (r < GRID_ROWS - 1) {
          gridHtml += this.#renderConnector("v", r, c, r + 1, c, gr + 1, gc);
        }
      }
    }

    return `
      <div class="pk-map-scroll">
        <div class="pk-map-grid">${gridHtml}</div>
      </div>
    `;
  }

  /**
   * @param {object} cell
   * @param {number} gr  CSS grid-row (1-based)
   * @param {number} gc  CSS grid-column (1-based)
   */
  #renderCell(cell, gr, gc) {
    const stateClass = `pk-map-cell--${cell.state}`;
    /* Always add type class so hidden cells can show faint icons via CSS */
    const typeClass = `pk-map-cell--type-${cell.type}`;
    const newlyClass = this.#newlyRevealed.has(`${cell.row},${cell.col}`)
      ? "pk-map-cell--newly-revealed"
      : "";
    /* Green border for the last-visited cell (any interactive type) */
    const completedClass =
      cell.state === CELL_STATES.CURRENT &&
      (cell.type === CELL_TYPES.LEVEL ||
        cell.type === CELL_TYPES.BOSS ||
        cell.type === CELL_TYPES.SHOP ||
        cell.type === CELL_TYPES.ABILITY)
        ? "pk-map-cell--completed"
        : "";

    let content = "";
    if (cell.state === CELL_STATES.HIDDEN) {
      /* Hidden cells only show their icon when the matching reveal bonus
         is active. Levels and empty tiles stay blank until discovered. */
      const reveal =
        (cell.type === CELL_TYPES.SHOP &&
          bonusManager.resolve(PARAM_KEYS.REVEAL_SHOPS, false)) ||
        (cell.type === CELL_TYPES.ABILITY &&
          bonusManager.resolve(PARAM_KEYS.REVEAL_ABILITIES, false)) ||
        (cell.type === CELL_TYPES.MYSTERY &&
          bonusManager.resolve(PARAM_KEYS.REVEAL_MYSTERY, false)) ||
        (cell.type === CELL_TYPES.BOSS &&
          bonusManager.resolve(PARAM_KEYS.REVEAL_BOSS, false));
      if (reveal) {
        content = this.#renderCellContent(cell);
      }
    } else {
      content = this.#renderCellContent(cell);
    }

    const interactive =
      cell.state === CELL_STATES.REVEALED
        ? 'role="button" tabindex="0"'
        : "";

    return `<div class="pk-map-cell ${stateClass} ${typeClass} ${newlyClass} ${completedClass}"
                style="grid-row:${gr};grid-column:${gc}"
                data-row="${cell.row}" data-col="${cell.col}"
                ${interactive}>${content}</div>`;
  }

  /** @param {object} cell */
  #renderCellContent(cell) {
    switch (cell.type) {
      case CELL_TYPES.LEVEL: {
        const obfuscate = !bonusManager.resolve(
          PARAM_KEYS.REVEAL_LEVEL_NUMBER,
          true,
        );
        const label = obfuscate ? "?" : cell.levelId;
        return `<span class="pk-map-cell-icon">${label}</span>`;
      }
      case CELL_TYPES.SHOP:
        return '<span class="pk-map-cell-icon"><img src="/images/icon-coin.svg" class="pk-svg-icon" alt=""></span>';
      case CELL_TYPES.ABILITY:
        return '<span class="pk-map-cell-icon"><img src="/images/icon-chip.svg" class="pk-svg-icon" alt=""></span>';
      case CELL_TYPES.MYSTERY:
        return '<span class="pk-map-cell-icon">?</span>';
      case CELL_TYPES.BOSS:
        return '<span class="pk-map-cell-icon"><img src="/images/icon-cat.svg" class="pk-svg-icon" alt=""></span>';
      case CELL_TYPES.EMPTY:
        return '<span class="pk-map-cell-icon">·</span>';
      case CELL_TYPES.START:
        return '<span class="pk-map-cell-icon">◆</span>';
      default:
        return "";
    }
  }

  /**
   * @param {'h'|'v'} dir
   * @param {number} r1 @param {number} c1  Cell A coords
   * @param {number} r2 @param {number} c2  Cell B coords
   * @param {number} gr  CSS grid-row
   * @param {number} gc  CSS grid-column
   */
  #renderConnector(dir, r1, c1, r2, c2, gr, gc) {
    if (!this.#grid.hasEdge(r1, c1, r2, c2)) {
      return `<div style="grid-row:${gr};grid-column:${gc}"></div>`;
    }

    const cellA = this.#grid.getCell(r1, c1);
    const cellB = this.#grid.getCell(r2, c2);
    const aVis = cellA.state !== CELL_STATES.HIDDEN;
    const bVis = cellB.state !== CELL_STATES.HIDDEN;
    const revealPaths = bonusManager.resolve(PARAM_KEYS.REVEAL_PATHS, false);

    let vis = "";
    if (aVis && bVis) {
      const aActive =
        cellA.state === CELL_STATES.CURRENT ||
        cellA.state === CELL_STATES.REVEALED;
      const bActive =
        cellB.state === CELL_STATES.CURRENT ||
        cellB.state === CELL_STATES.REVEALED;
      vis =
        aActive && bActive
          ? "pk-map-connector--active"
          : "pk-map-connector--visible";
    } else if (aVis || bVis || revealPaths) {
      vis = "pk-map-connector--visible";
    }

    return `<div class="pk-map-connector pk-map-connector--${dir} ${vis}"
                style="grid-row:${gr};grid-column:${gc}">
              <span class="pk-map-connector-line"></span>
            </div>`;
  }

  #refresh() {
    if (!this.#el) return;
    this.#newlyRevealed.clear();
    const mapEl = this.#el.querySelector(".pk-map-scroll");
    if (mapEl) {
      const tmp = document.createElement("div");
      tmp.innerHTML = this.#render();
      mapEl.replaceWith(tmp.firstElementChild);
    } else {
      this.#el.innerHTML = this.#render();
    }
    this.#updateCellSize();
  }

  /**
   * Validate that a saved grid snapshot matches the current dimensions.
   * @param {object} data
   * @returns {boolean}
   */
  #isValidGridState(data) {
    return (
      Array.isArray(data.cells) &&
      data.cells.length === GRID_ROWS &&
      Array.isArray(data.cells[0]) &&
      data.cells[0].length === GRID_COLS
    );
  }

  destroy() {
    this.#infoBar?.destroy();
    this.#infoBar = null;
    this.#bag.dispose();
    this.#el?.remove();
    this.#el = null;
  }
}
