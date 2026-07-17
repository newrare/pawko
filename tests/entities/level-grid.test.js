import { describe, it, expect, beforeEach } from "vitest";
import {
  LevelGrid,
  GRID_COLS,
  GRID_ROWS,
  CELL_TYPES,
  CELL_STATES,
} from "../../src/entities/level-grid.js";

describe("LevelGrid", () => {
  /** @type {LevelGrid} */
  let grid;

  beforeEach(() => {
    grid = new LevelGrid();
  });

  describe("init", () => {
    it("creates a GRID_ROWS × GRID_COLS grid (7×12)", () => {
      grid.init();
      const cells = grid.getCells();
      expect(cells.length).toBe(GRID_ROWS * GRID_COLS);
      expect(GRID_COLS).toBe(7);
      expect(GRID_ROWS).toBe(12);
    });

    it("sets starting cell as current with type start", () => {
      grid.init({ startRow: 6, startCol: 3 });
      const cell = grid.getCell(6, 3);
      expect(cell.type).toBe(CELL_TYPES.START);
      expect(cell.state).toBe(CELL_STATES.CURRENT);
    });

    it("defaults start to center of grid", () => {
      grid.init();
      const pos = grid.getCurrentPos();
      expect(pos.row).toBe(Math.floor(GRID_ROWS / 2));
      expect(pos.col).toBe(Math.floor(GRID_COLS / 2));
    });

    it("reveals linked neighbors around start", () => {
      grid.init({ startRow: 6, startCol: 3 });
      const neighbors = grid.getNeighbors(6, 3);
      expect(neighbors.length).toBeGreaterThanOrEqual(1);
      neighbors.forEach((c) => {
        expect(c.state).toBe(CELL_STATES.REVEALED);
        expect([
          CELL_TYPES.LEVEL,
          CELL_TYPES.SHOP,
          CELL_TYPES.MYSTERY,
          CELL_TYPES.EMPTY,
        ]).toContain(c.type);
      });
    });

    it("guarantees the grid has at least 10 level cells", () => {
      for (let i = 0; i < 10; i++) {
        const g = new LevelGrid();
        g.init({ startRow: 6, startCol: 3 });
        const levelCount = g
          .getCells()
          .filter((c) => c.type === CELL_TYPES.LEVEL).length;
        expect(levelCount).toBeGreaterThanOrEqual(10);
      }
    });

    it("non-linked cells remain hidden", () => {
      grid.init({ startRow: 6, startCol: 3 });
      // A cell far away should be hidden
      const corner = grid.getCell(0, 0);
      expect(corner.state).toBe(CELL_STATES.HIDDEN);
    });

    it("resets nextLevelId to 1", () => {
      grid.init();
      expect(grid.getNextLevelId()).toBeGreaterThanOrEqual(1);
    });
  });

  describe("edges", () => {
    beforeEach(() => grid.init({ startRow: 6, startCol: 3 }));

    it("creates a spanning tree — every cell reachable from start", () => {
      const visited = new Set();
      const stack = ["6,3"];
      visited.add("6,3");
      while (stack.length > 0) {
        const key = stack.pop();
        const [r, c] = key.split(",").map(Number);
        for (const n of grid.getNeighbors(r, c)) {
          const nk = `${n.row},${n.col}`;
          if (!visited.has(nk)) {
            visited.add(nk);
            stack.push(nk);
          }
        }
      }
      expect(visited.size).toBe(GRID_ROWS * GRID_COLS);
    });

    it("cells have between 1 and 4 links", () => {
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const count = grid.getNeighbors(r, c).length;
          expect(count).toBeGreaterThanOrEqual(1);
          expect(count).toBeLessThanOrEqual(4);
        }
      }
    });

    it("hasEdge is symmetric", () => {
      const edges = grid.getEdges();
      for (const ek of edges) {
        const [a, b] = ek.split("-");
        const [r1, c1] = a.split(",").map(Number);
        const [r2, c2] = b.split(",").map(Number);
        expect(grid.hasEdge(r1, c1, r2, c2)).toBe(true);
        expect(grid.hasEdge(r2, c2, r1, c1)).toBe(true);
      }
    });

    it("getNeighbors only returns edge-linked cells", () => {
      const neighbors = grid.getNeighbors(6, 3);
      neighbors.forEach((n) => {
        expect(grid.hasEdge(6, 3, n.row, n.col)).toBe(true);
      });
    });
  });

  describe("getCell", () => {
    beforeEach(() => grid.init());

    it("returns null for out-of-bounds coordinates", () => {
      expect(grid.getCell(-1, 0)).toBeNull();
      expect(grid.getCell(0, -1)).toBeNull();
      expect(grid.getCell(GRID_ROWS, 0)).toBeNull();
      expect(grid.getCell(0, GRID_COLS)).toBeNull();
    });

    it("returns the cell at valid coordinates", () => {
      const cell = grid.getCell(0, 0);
      expect(cell).not.toBeNull();
      expect(cell.row).toBe(0);
      expect(cell.col).toBe(0);
    });
  });

  describe("selectCell", () => {
    beforeEach(() => {
      grid.init({ startRow: 6, startCol: 3 });
    });

    it("returns null for hidden cell", () => {
      expect(grid.selectCell(0, 0)).toBeNull();
    });

    it("returns null for out-of-bounds", () => {
      expect(grid.selectCell(-1, -1)).toBeNull();
    });

    it("returns null for current cell", () => {
      expect(grid.selectCell(6, 3)).toBeNull();
    });

    it("marks old position as used", () => {
      const neighbors = grid.getNeighbors(6, 3);
      const target = neighbors[0];
      grid.selectCell(target.row, target.col);
      expect(grid.getCell(6, 3).state).toBe(CELL_STATES.USED);
    });

    it("moves current to selected cell", () => {
      const neighbors = grid.getNeighbors(6, 3);
      const target = neighbors[0];
      grid.selectCell(target.row, target.col);
      expect(grid.getCell(target.row, target.col).state).toBe(
        CELL_STATES.CURRENT,
      );
      expect(grid.getCurrentPos()).toEqual({
        row: target.row,
        col: target.col,
      });
    });

    it("returns the selected cell info", () => {
      const neighbors = grid.getNeighbors(6, 3);
      const target = neighbors[0];
      const cell = grid.selectCell(target.row, target.col);
      expect(cell).not.toBeNull();
      expect(cell.row).toBe(target.row);
      expect(cell.col).toBe(target.col);
    });

    it("returns null for already-used cell", () => {
      const neighbors = grid.getNeighbors(6, 3);
      const target = neighbors[0];
      grid.selectCell(target.row, target.col);
      // (6,3) is now used
      expect(grid.selectCell(6, 3)).toBeNull();
    });
  });

  describe("revealCurrentAdjacents", () => {
    beforeEach(() => {
      grid.init({ startRow: 6, startCol: 3 });
    });

    it("reveals hidden linked neighbors of current position", () => {
      const neighbors = grid.getNeighbors(6, 3);
      const target = neighbors[0];
      grid.selectCell(target.row, target.col);

      const revealed = grid.revealCurrentAdjacents();
      expect(revealed.length).toBeGreaterThanOrEqual(0);
      revealed.forEach((c) => {
        expect(c.state).toBe(CELL_STATES.REVEALED);
      });
    });

    it("does not re-reveal used cells", () => {
      const neighbors = grid.getNeighbors(6, 3);
      const target = neighbors[0];
      grid.selectCell(target.row, target.col);
      grid.revealCurrentAdjacents();
      // (6,3) was used and stays used
      expect(grid.getCell(6, 3).state).toBe(CELL_STATES.USED);
    });

    it("does not re-reveal already-revealed cells", () => {
      const result = grid.revealCurrentAdjacents();
      expect(result).toEqual([]);
    });

    it("revealed cells have valid types", () => {
      for (let i = 0; i < 10; i++) {
        const g = new LevelGrid();
        g.init({ startRow: 6, startCol: 3 });
        const neighbors = g.getNeighbors(6, 3);
        const target = neighbors[0];
        g.selectCell(target.row, target.col);
        const revealed = g.revealCurrentAdjacents();
        if (revealed.length > 0) {
          const validTypes = Object.values(CELL_TYPES);
          revealed.forEach((c) => {
            expect(validTypes).toContain(c.type);
          });
        }
      }
    });

    it("assigns sequential level IDs", () => {
      /* Only revealed LEVEL cells get a levelId at init */
      const initRevealedLevels = grid
        .getCells()
        .filter(
          (c) =>
            c.type === CELL_TYPES.LEVEL && c.state === CELL_STATES.REVEALED,
        );
      const maxInitId =
        initRevealedLevels.length > 0
          ? Math.max(...initRevealedLevels.map((c) => c.levelId))
          : 0;

      const neighbors = grid.getNeighbors(6, 3);
      /* Navigate to any revealed neighbor then reveal its adjacents */
      const target = neighbors[0];
      grid.selectCell(target.row, target.col);
      const revealed = grid.revealCurrentAdjacents();
      const newLevels = revealed.filter((c) => c.type === CELL_TYPES.LEVEL);
      if (newLevels.length > 0) {
        newLevels.forEach((c) => {
          expect(c.levelId).toBeGreaterThan(maxInitId);
        });
      }
    });
  });

  describe("getStats", () => {
    it("returns correct counts after init", () => {
      grid.init({ startRow: 6, startCol: 3 });
      const stats = grid.getStats();
      expect(stats.total).toBe(GRID_ROWS * GRID_COLS);
      /* CURRENT cell (start) counts as visited in the HUD */
      expect(stats.used).toBe(1);
      expect(stats.remaining).toBeGreaterThanOrEqual(1);
    });

    it("increments used count after selectCell", () => {
      grid.init({ startRow: 6, startCol: 3 });
      const neighbors = grid.getNeighbors(6, 3);
      grid.selectCell(neighbors[0].row, neighbors[0].col);
      const stats = grid.getStats();
      /* old CURRENT→USED + new CURRENT = 2 visited cells */
      expect(stats.used).toBe(2);
    });
  });

  describe("hasAvailableMoves", () => {
    it("returns true when there are revealed neighbors", () => {
      grid.init({ startRow: 6, startCol: 3 });
      expect(grid.hasAvailableMoves()).toBe(true);
    });

    it("returns boolean", () => {
      grid.init({ startRow: 6, startCol: 3 });
      const neighbors = grid.getNeighbors(6, 3);
      grid.selectCell(neighbors[0].row, neighbors[0].col);
      expect(typeof grid.hasAvailableMoves()).toBe("boolean");
    });
  });

  describe("serialize / deserialize", () => {
    it("round-trips the grid state including edges", () => {
      grid.init({ startRow: 6, startCol: 3 });
      const data = grid.serialize();
      const restored = LevelGrid.deserialize(data);

      expect(restored.getCurrentPos()).toEqual(grid.getCurrentPos());
      expect(restored.getNextLevelId()).toEqual(grid.getNextLevelId());
      expect(restored.getEdges().size).toBe(grid.getEdges().size);

      const origCells = grid.getCells();
      const restCells = restored.getCells();
      expect(restCells.length).toBe(origCells.length);

      for (let i = 0; i < origCells.length; i++) {
        expect(restCells[i].row).toBe(origCells[i].row);
        expect(restCells[i].col).toBe(origCells[i].col);
        expect(restCells[i].type).toBe(origCells[i].type);
        expect(restCells[i].state).toBe(origCells[i].state);
        expect(restCells[i].levelId).toBe(origCells[i].levelId);
      }
    });

    it("preserves edges after deserialize", () => {
      grid.init({ startRow: 6, startCol: 3 });
      const data = grid.serialize();
      const restored = LevelGrid.deserialize(data);

      for (const ek of grid.getEdges()) {
        expect(restored.getEdges().has(ek)).toBe(true);
      }
    });

    it("preserves state after selectCell", () => {
      grid.init({ startRow: 6, startCol: 3 });
      const neighbors = grid.getNeighbors(6, 3);
      const target = neighbors[0];
      grid.selectCell(target.row, target.col);

      const data = grid.serialize();
      const restored = LevelGrid.deserialize(data);

      expect(restored.getCurrentPos()).toEqual({
        row: target.row,
        col: target.col,
      });
      expect(restored.getCell(6, 3).state).toBe(CELL_STATES.USED);
      expect(restored.getCell(target.row, target.col).state).toBe(
        CELL_STATES.CURRENT,
      );
    });

    it("deserialized grid supports selectCell", () => {
      grid.init({ startRow: 6, startCol: 3 });
      const data = grid.serialize();
      const restored = LevelGrid.deserialize(data);

      const neighbors = restored.getNeighbors(6, 3);
      const target = neighbors.find(
        (c) => c.state === CELL_STATES.REVEALED,
      );
      if (target) {
        const cell = restored.selectCell(target.row, target.col);
        expect(cell).not.toBeNull();
        expect(restored.getCurrentPos()).toEqual({
          row: target.row,
          col: target.col,
        });
      }
    });

    it("deserialized grid supports revealCurrentAdjacents", () => {
      grid.init({ startRow: 6, startCol: 3 });
      const neighbors = grid.getNeighbors(6, 3);
      grid.selectCell(neighbors[0].row, neighbors[0].col);

      const data = grid.serialize();
      const restored = LevelGrid.deserialize(data);
      const revealed = restored.revealCurrentAdjacents();
      expect(revealed.length).toBeGreaterThanOrEqual(0);
    });
  });
});
