import { shuffle, weightedPick } from "../utils/math.js";

// ─── Grid dimensions ──────────────────────────────────────────────────────

export const GRID_COLS = 7;
export const GRID_ROWS = 12;

// ─── Cell types & states ──────────────────────────────────────────────────

export const CELL_TYPES = /** @type {const} */ ({
  EMPTY: "empty",
  LEVEL: "level",
  SHOP: "shop",
  ABILITY: "ability",
  START: "start",
});

export const CELL_STATES = /** @type {const} */ ({
  HIDDEN: "hidden",
  REVEALED: "revealed",
  CURRENT: "current",
  USED: "used",
});

/**
 * @typedef {object} Cell
 * @property {number} row
 * @property {number} col
 * @property {string} type    One of CELL_TYPES values
 * @property {string} state   One of CELL_STATES values
 * @property {number} [levelId]  Only present when type === 'level'
 */

// ─── Internals ────────────────────────────────────────────────────────────

/** Orthogonal directions: [dRow, dCol]. */
const DIRECTIONS = [
  [-1, 0], // north
  [1, 0], // south
  [0, -1], // west
  [0, 1], // east
];

/** Weighted pool for random cell type assignment — more shop & ability. */
const TYPE_VALUES = [
  CELL_TYPES.LEVEL,
  CELL_TYPES.SHOP,
  CELL_TYPES.ABILITY,
  CELL_TYPES.EMPTY,
];
const TYPE_WEIGHTS = [0.35, 0.22, 0.2, 0.23];

/**
 * Encode a directed edge between two orthogonal cells as a string key.
 * @param {number} r1 @param {number} c1 @param {number} r2 @param {number} c2
 * @returns {string}
 */
function edgeKey(r1, c1, r2, c2) {
  if (r1 < r2 || (r1 === r2 && c1 < c2)) return `${r1},${c1}-${r2},${c2}`;
  return `${r2},${c2}-${r1},${c1}`;
}

// ─── LevelGrid ────────────────────────────────────────────────────────────

/**
 * 7×12 exploration grid for the level-selection mini-game.
 *
 * Instead of connecting every orthogonal pair, each cell has 1–4 explicit
 * links randomly generated at init, creating unique paths and forks.
 *
 * Pure data/logic — zero DOM dependency.
 */
export class LevelGrid {
  /** @type {Cell[][]} */
  #cells = [];

  /** @type {Set<string>} Edge keys connecting adjacent cells. */
  #edges = new Set();

  /** @type {{ row: number, col: number }} */
  #currentPos = { row: 0, col: 0 };

  /** @type {number} */
  #nextLevelId = 1;

  /**
   * Create a fresh grid with a starting cell and revealed linked neighbors.
   * @param {{ startRow?: number, startCol?: number }} [opts]
   */
  init(opts = {}) {
    const startRow = opts.startRow ?? Math.floor(GRID_ROWS / 2);
    const startCol = opts.startCol ?? Math.floor(GRID_COLS / 2);
    this.#nextLevelId = 1;
    this.#cells = [];
    this.#edges = new Set();

    for (let r = 0; r < GRID_ROWS; r++) {
      const row = [];
      for (let c = 0; c < GRID_COLS; c++) {
        row.push({
          row: r,
          col: c,
          type: CELL_TYPES.EMPTY,
          state: CELL_STATES.HIDDEN,
        });
      }
      this.#cells.push(row);
    }

    this.#generateEdges(startRow, startCol);

    /* Pre-assign ALL cell types now (guarantees min counts grid-wide). */
    this.#assignAllTypes(startRow, startCol);

    this.#currentPos = { row: startRow, col: startCol };
    const startCell = this.#cells[startRow][startCol];
    startCell.type = CELL_TYPES.START;
    startCell.state = CELL_STATES.CURRENT;

    this.revealCurrentAdjacents();
  }

  // ─── Queries ──────────────────────────────────────

  /** @returns {Cell[]} Flat array of every cell. */
  getCells() {
    return this.#cells.flat();
  }

  /**
   * @param {number} row
   * @param {number} col
   * @returns {Cell | null}
   */
  getCell(row, col) {
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS)
      return null;
    return this.#cells[row][col];
  }

  /** @returns {{ row: number, col: number }} */
  getCurrentPos() {
    return { ...this.#currentPos };
  }

  /** @returns {number} */
  getNextLevelId() {
    return this.#nextLevelId;
  }

  /** @returns {Set<string>} The edge set (read-only usage). */
  getEdges() {
    return this.#edges;
  }

  /**
   * Check if two orthogonal cells are linked by an edge.
   * @param {number} r1 @param {number} c1
   * @param {number} r2 @param {number} c2
   * @returns {boolean}
   */
  hasEdge(r1, c1, r2, c2) {
    return this.#edges.has(edgeKey(r1, c1, r2, c2));
  }

  /**
   * Linked neighbors — only cells connected via an edge.
   * @param {number} row
   * @param {number} col
   * @returns {Cell[]}
   */
  getNeighbors(row, col) {
    const result = [];
    for (const [dr, dc] of DIRECTIONS) {
      const nr = row + dr;
      const nc = col + dc;
      if (
        nr >= 0 &&
        nr < GRID_ROWS &&
        nc >= 0 &&
        nc < GRID_COLS &&
        this.#edges.has(edgeKey(row, col, nr, nc))
      ) {
        result.push(this.#cells[nr][nc]);
      }
    }
    return result;
  }

  /** Whether any linked neighbor of the current position is REVEALED. */
  hasAvailableMoves() {
    return this.getNeighbors(
      this.#currentPos.row,
      this.#currentPos.col,
    ).some((c) => c.state === CELL_STATES.REVEALED);
  }

  /**
   * Compute grid stats for the header HUD.
   * Totals include ALL cells (hidden + visible) so the counter is stable.
   * @returns {{ total: number, remaining: number, used: number,
   *   levelsAvail: number, levelsCompleted: number, levelsTotal: number,
   *   shopsAvail: number, shopsTotal: number,
   *   abilitiesAvail: number, abilitiesTotal: number }}
   */
  getStats() {
    let remaining = 0;
    let used = 0;
    let levelsAvail = 0, levelsCompleted = 0, levelsTotal = 0;
    let shopsAvail = 0, shopsTotal = 0;
    let abilitiesAvail = 0, abilitiesTotal = 0;

    for (const cell of this.getCells()) {
      const isLevel = cell.type === CELL_TYPES.LEVEL;
      const isShop = cell.type === CELL_TYPES.SHOP;
      const isAbility = cell.type === CELL_TYPES.ABILITY;

      /* Count ALL cells of each type regardless of visibility */
      if (isLevel) levelsTotal++;
      else if (isShop) shopsTotal++;
      else if (isAbility) abilitiesTotal++;

      if (cell.state === CELL_STATES.REVEALED) {
        remaining++;
        if (isLevel) levelsAvail++;
        else if (isShop) shopsAvail++;
        else if (isAbility) abilitiesAvail++;
      } else if (
        cell.state === CELL_STATES.USED ||
        cell.state === CELL_STATES.CURRENT
      ) {
        used++;
        if (isLevel) levelsCompleted++;
      }
    }

    return {
      total: GRID_ROWS * GRID_COLS,
      remaining,
      used,
      levelsAvail,
      levelsCompleted,
      levelsTotal,
      shopsAvail,
      shopsTotal,
      abilitiesAvail,
      abilitiesTotal,
    };
  }

  // ─── Mutations ────────────────────────────────────

  /**
   * Select a revealed cell. Marks old position as USED, moves current.
   * Does **not** reveal adjacents — call `revealCurrentAdjacents()` separately.
   * @param {number} row
   * @param {number} col
   * @returns {Cell | null} The selected cell, or null if invalid.
   */
  selectCell(row, col) {
    const cell = this.getCell(row, col);
    if (!cell || cell.state !== CELL_STATES.REVEALED) return null;

    const old = this.#cells[this.#currentPos.row][this.#currentPos.col];
    old.state = CELL_STATES.USED;

    cell.state = CELL_STATES.CURRENT;
    this.#currentPos = { row, col };

    return cell;
  }

  /**
   * Reveal hidden linked neighbors of current position.
   * Types were pre-assigned at init; this only changes state to REVEALED
   * and assigns sequential level IDs to LEVEL cells.
   * Guarantees at least one LEVEL among the revealed batch (overrides one
   * non-empty cell if needed).
   * @returns {Cell[]} Newly revealed cells (empty if none were hidden).
   */
  revealCurrentAdjacents() {
    const { row, col } = this.#currentPos;
    const toReveal = [];

    for (const [dr, dc] of DIRECTIONS) {
      const nr = row + dr;
      const nc = col + dc;
      if (
        nr >= 0 &&
        nr < GRID_ROWS &&
        nc >= 0 &&
        nc < GRID_COLS &&
        this.#edges.has(edgeKey(row, col, nr, nc))
      ) {
        const cell = this.#cells[nr][nc];
        if (cell.state === CELL_STATES.HIDDEN) {
          toReveal.push(cell);
        }
      }
    }

    if (toReveal.length === 0) return [];

    for (const cell of toReveal) {
      cell.state = CELL_STATES.REVEALED;
      if (cell.type === CELL_TYPES.LEVEL) {
        cell.levelId = this.#nextLevelId++;
      }
    }

    return toReveal;
  }

  // ─── Persistence ──────────────────────────────────

  /** @returns {object} JSON-safe snapshot. */
  serialize() {
    return {
      cells: this.#cells.map((row) =>
        row.map((c) => {
          const o = { row: c.row, col: c.col, type: c.type, state: c.state };
          if (c.levelId !== undefined) o.levelId = c.levelId;
          return o;
        }),
      ),
      edges: [...this.#edges],
      currentPos: { ...this.#currentPos },
      nextLevelId: this.#nextLevelId,
    };
  }

  /**
   * Restore a grid from a serialized snapshot.
   * @param {object} data
   * @returns {LevelGrid}
   */
  static deserialize(data) {
    const grid = new LevelGrid();
    grid.#cells = data.cells.map((row) => row.map((c) => ({ ...c })));
    grid.#edges = new Set(data.edges);
    grid.#currentPos = { ...data.currentPos };
    grid.#nextLevelId = data.nextLevelId;
    return grid;
  }

  // ─── Internals ────────────────────────────────────

  /**
   * Generate the edge graph. Uses a spanning-tree approach starting from the
   * start cell to guarantee connectivity, then sprinkles extra edges so that
   * each cell ends up with 1–4 links, creating unique paths and forks.
   * @param {number} startRow
   * @param {number} startCol
   */
  #generateEdges(startRow, startCol) {
    const visited = Array.from({ length: GRID_ROWS }, () =>
      new Array(GRID_COLS).fill(false),
    );

    /* Phase 1: randomized DFS spanning tree — every cell reachable. */
    const stack = [[startRow, startCol]];
    visited[startRow][startCol] = true;

    while (stack.length > 0) {
      const [r, c] = stack[stack.length - 1];
      const dirs = shuffle([...DIRECTIONS]);
      let pushed = false;
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (
          nr >= 0 &&
          nr < GRID_ROWS &&
          nc >= 0 &&
          nc < GRID_COLS &&
          !visited[nr][nc]
        ) {
          visited[nr][nc] = true;
          this.#edges.add(edgeKey(r, c, nr, nc));
          stack.push([nr, nc]);
          pushed = true;
          break;
        }
      }
      if (!pushed) stack.pop();
    }

    /* Phase 2: add extra edges so cells have variety (target 1–4 links).
       We iterate all possible orthogonal pairs and add some missing edges
       with a probability, capped so no cell exceeds 4 links. */
    const linkCount = Array.from({ length: GRID_ROWS }, () =>
      new Array(GRID_COLS).fill(0),
    );

    for (const ek of this.#edges) {
      const [a, b] = ek.split("-");
      const [r1, c1] = a.split(",").map(Number);
      const [r2, c2] = b.split(",").map(Number);
      linkCount[r1][c1]++;
      linkCount[r2][c2]++;
    }

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        for (const [dr, dc] of DIRECTIONS) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= GRID_ROWS || nc < 0 || nc >= GRID_COLS)
            continue;
          const ek = edgeKey(r, c, nr, nc);
          if (this.#edges.has(ek)) continue;
          if (linkCount[r][c] >= 4 || linkCount[nr][nc] >= 4) continue;
          if (Math.random() < 0.15) {
            this.#edges.add(ek);
            linkCount[r][c]++;
            linkCount[nr][nc]++;
          }
        }
      }
    }
  }

  /**
   * Pre-assign types to every non-start cell in a single pass, ensuring
   * the grid always has enough levels, shops and abilities regardless of
   * the order cells are explored.
   * @param {number} startRow
   * @param {number} startCol
   */
  #assignAllTypes(startRow, startCol) {
    const nonStart = this.getCells().filter(
      (c) => !(c.row === startRow && c.col === startCol),
    );
    const count = nonStart.length;

    /* Guaranteed minimums: 10 levels, 4 shops, 4 abilities. */
    const guaranteed = [
      ...Array(10).fill(CELL_TYPES.LEVEL),
      ...Array(4).fill(CELL_TYPES.SHOP),
      ...Array(4).fill(CELL_TYPES.ABILITY),
    ];
    const types = [...guaranteed];
    for (let i = guaranteed.length; i < count; i++) {
      types.push(weightedPick(TYPE_VALUES, TYPE_WEIGHTS));
    }
    const shuffled = shuffle(types);
    for (let i = 0; i < nonStart.length; i++) {
      nonStart[i].type = shuffled[i];
    }
  }
}
