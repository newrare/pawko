import { describe, it, expect, beforeEach, vi } from "vitest";

/* Mutable set of run-acquired peg types, flipped per test. */
const { state } = vi.hoisted(() => ({ state: { acquired: new Set() } }));

vi.mock("../../src/managers/peg-shop-manager.js", () => ({
  pegShopManager: {
    getAcquired: () => [...state.acquired],
  },
}));

import { getUnlockedUpgradeTypes } from "../../src/utils/upgrade-pool.js";
import { DEFAULT_UPGRADE_TYPES } from "../../src/configs/slot-machine-defs.js";

describe("getUnlockedUpgradeTypes", () => {
  beforeEach(() => {
    state.acquired = new Set();
  });

  it("returns exactly the defaults when nothing is acquired", () => {
    expect(getUnlockedUpgradeTypes()).toEqual(DEFAULT_UPGRADE_TYPES);
  });

  it("adds a type once it is bought in the boutique this run", () => {
    state.acquired = new Set(["ice"]);
    const pool = getUnlockedUpgradeTypes();
    expect(pool).toContain("ice");
    for (const t of DEFAULT_UPGRADE_TYPES) expect(pool).toContain(t);
  });

  it("adds several acquired types and never duplicates", () => {
    state.acquired = new Set(["ice", "bomb"]);
    const pool = getUnlockedUpgradeTypes();
    expect(pool).toContain("ice");
    expect(pool).toContain("bomb");
    expect(new Set(pool).size).toBe(pool.length);
  });

  it("does not add types that were not acquired", () => {
    state.acquired = new Set(["shield"]);
    const pool = getUnlockedUpgradeTypes();
    expect(pool).toContain("shield");
    expect(pool).not.toContain("ice");
  });
});
