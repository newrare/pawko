import { i18n } from "../managers/i18n-manager.js";
import { saveManager } from "../managers/save-manager.js";
import { currencyManager } from "../managers/currency-manager.js";
import { ListenerBag } from "../utils/listener-bag.js";
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

    this.#bag.on(this.#el, "click", (e) => {
      const target = /** @type {HTMLElement} */ (e.target);

      const action = target.closest("[data-action]");
      if (action) {
        const name = /** @type {HTMLElement} */ (action).dataset.action;
        if (name === "new-run") this.#startNewRun();
        return;
      }

      const cellEl = target.closest(".pk-map-cell--revealed");
      if (!cellEl) return;

      const row = Number(/** @type {HTMLElement} */ (cellEl).dataset.row);
      const col = Number(/** @type {HTMLElement} */ (cellEl).dataset.col);
      if (Number.isNaN(row) || Number.isNaN(col)) return;

      this.#onCellClick(row, col);
    });

    this.#bag.add(i18n.onChange(() => this.#refresh()));
    this.#bag.add(currencyManager.on("change", () => this.#refresh()));
  }

  // ─── Cell interaction ───────────────────────────────

  /** @param {number} row @param {number} col */
  #onCellClick(row, col) {
    const cell = this.#grid.selectCell(row, col);
    if (!cell) return;

    saveManager.saveGridState(this.#grid.serialize());

    switch (cell.type) {
      case CELL_TYPES.LEVEL:
        this.#router.start(GameScene, { levelId: cell.levelId });
        break;
      case CELL_TYPES.SHOP:
        this.#router.start(ShopScene);
        break;
      case CELL_TYPES.ABILITY:
        this.#router.start(AbilityScene);
        break;
      case CELL_TYPES.EMPTY:
        this.#onEmptyCell();
        break;
      default:
        break;
    }
  }

  #onEmptyCell() {
    const revealed = this.#grid.revealCurrentAdjacents();
    this.#newlyRevealed = new Set(revealed.map((c) => `${c.row},${c.col}`));
    saveManager.saveGridState(this.#grid.serialize());
    this.#refresh();
  }

  #startNewRun() {
    this.#grid = new LevelGrid();
    this.#grid.init();
    this.#newlyRevealed = new Set();
    saveManager.saveGridState(this.#grid.serialize());
    this.#refresh();
  }

  // ─── Rendering ──────────────────────────────────────

  #render() {
    const hasMovesLeft = this.#grid.hasAvailableMoves();

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

    const noMoves = !hasMovesLeft
      ? `<div class="pk-map-nomoves">
           <p>${i18n.t("level_selector.no_moves")}</p>
           <button class="gt-btn gt-btn--primary" data-action="new-run">
             <span class="gt-btn-label">${i18n.t("level_selector.new_run")}</span>
           </button>
         </div>`
      : "";

    return `
      <div class="pk-map-scroll">
        <div class="pk-map-grid">${gridHtml}</div>
        ${noMoves}
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
        cell.type === CELL_TYPES.SHOP ||
        cell.type === CELL_TYPES.ABILITY)
        ? "pk-map-cell--completed"
        : "";

    let content = "";
    if (cell.state === CELL_STATES.USED) {
      content = '<span class="pk-map-cell-used-mark">✓</span>';
    } else if (cell.state === CELL_STATES.HIDDEN) {
      /* Faint icon hint for shop and ability cells only */
      if (
        cell.type === CELL_TYPES.SHOP ||
        cell.type === CELL_TYPES.ABILITY
      ) {
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
      case CELL_TYPES.LEVEL:
        return `<span class="pk-map-cell-icon">${cell.levelId}</span>`;
      case CELL_TYPES.SHOP:
        return '<span class="pk-map-cell-icon">💰</span>';
      case CELL_TYPES.ABILITY:
        return '<span class="pk-map-cell-icon">⚡</span>';
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
    } else if (aVis || bVis) {
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
    this.#el.innerHTML = this.#render();
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
