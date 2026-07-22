import { describe, it, expect } from "vitest";
import { SlotMachine } from "../../src/entities/slot-machine.js";
import { SLOT_MACHINE } from "../../src/configs/constants.js";

/** Deterministic RNG cycling through a fixed [0,1) sequence. */
function seedRng(seq) {
  let i = 0;
  return () => seq[i++ % seq.length];
}

describe("SlotMachine", () => {
  it("defaults to the configured reel count", () => {
    const m = new SlotMachine();
    expect(m.reelCount).toBe(SLOT_MACHINE.REEL_COUNT_DEFAULT);
    expect(m.reels).toHaveLength(SLOT_MACHINE.REEL_COUNT_DEFAULT);
  });

  it("clamps reel count to [1, REEL_COUNT_MAX]", () => {
    expect(new SlotMachine({ reelCount: 0 }).reelCount).toBe(1);
    expect(new SlotMachine({ reelCount: 99 }).reelCount).toBe(
      SLOT_MACHINE.REEL_COUNT_MAX,
    );
  });

  it("exposes max reels and the locked count beyond the active reels", () => {
    const m = new SlotMachine({ reelCount: 4 });
    expect(m.maxReels).toBe(SLOT_MACHINE.REEL_COUNT_MAX);
    expect(m.lockedCount).toBe(SLOT_MACHINE.REEL_COUNT_MAX - 4);
    const full = new SlotMachine({ reelCount: SLOT_MACHINE.REEL_COUNT_MAX });
    expect(full.lockedCount).toBe(0);
  });

  it("starts with every reel empty", () => {
    const m = new SlotMachine({ reelCount: 4 });
    expect(m.reels.every((r) => r.type === null)).toBe(true);
    expect(m.hasEmpty).toBe(true);
    expect(m.filledCount).toBe(0);
  });

  it("spin() fills every reel from the pool", () => {
    const m = new SlotMachine({ reelCount: 4 });
    /* rng maps to indices 0,1,2,0 over a 3-type pool. */
    m.spin(["fire", "coin", "bumper"], seedRng([0, 0.34, 0.67, 0.0]));
    expect(m.reels.map((r) => r.type)).toEqual([
      "fire",
      "coin",
      "bumper",
      "fire",
    ]);
    expect(m.hasEmpty).toBe(false);
    expect(m.filledCount).toBe(4);
  });

  it("spin() with an empty pool leaves reels empty", () => {
    const m = new SlotMachine({ reelCount: 3 });
    m.spin([], seedRng([0.5]));
    expect(m.reels.every((r) => r.type === null)).toBe(true);
  });

  it("consume() empties a reel and returns its type", () => {
    const m = new SlotMachine({ reelCount: 3 });
    m.spin(["fire"], seedRng([0]));
    expect(m.consume(1)).toBe("fire");
    expect(m.typeAt(1)).toBeNull();
    expect(m.filledCount).toBe(2);
  });

  it("consume() returns null for an empty or invalid reel", () => {
    const m = new SlotMachine({ reelCount: 2 });
    expect(m.consume(0)).toBeNull();
    expect(m.consume(5)).toBeNull();
  });

  it("refillEmpty() only touches emptied reels", () => {
    const m = new SlotMachine({ reelCount: 3 });
    m.spin(["fire", "coin", "bumper"], seedRng([0, 0.34, 0.67]));
    m.consume(1);
    m.refillEmpty(["ice"], seedRng([0]));
    expect(m.reels.map((r) => r.type)).toEqual(["fire", "ice", "bumper"]);
  });

  it("rerollCost() grows exponentially and resetRerolls() returns it to base", () => {
    const m = new SlotMachine();
    const base = SLOT_MACHINE.REROLL_BASE_COST;
    expect(m.rerollCost()).toBe(base);
    m.noteReroll();
    expect(m.rerollCost()).toBe(base * SLOT_MACHINE.REROLL_GROWTH);
    m.noteReroll();
    expect(m.rerollCost()).toBe(base * SLOT_MACHINE.REROLL_GROWTH ** 2);
    m.resetRerolls();
    expect(m.rerollsUsed).toBe(0);
    expect(m.rerollCost()).toBe(base);
  });

  it("reels getter returns a defensive copy", () => {
    const m = new SlotMachine({ reelCount: 2 });
    m.spin(["fire"], seedRng([0]));
    const snapshot = m.reels;
    snapshot[0].type = "hacked";
    expect(m.typeAt(0)).toBe("fire");
  });
});

describe("SlotMachine — rarity-aware roll", () => {
  const rarityOf = (t) =>
    ({ c1: "common", c2: "common", r1: "rare" })[t] ?? "common";
  const pool = ["c1", "r1", "c2"];

  it("weights the pick by rarity (rare weight 0 → never rolled)", () => {
    const m = new SlotMachine({ reelCount: 3 });
    m.spin(
      pool,
      seedRng([0, 0.5, 0.99]),
      {},
      {
        rarityOf,
        weights: { common: 1, rare: 0 },
      },
    );
    expect(m.reels.every((r) => rarityOf(r.type) === "common")).toBe(true);
  });

  it("reelRarity pins every reel to the constrained rarity", () => {
    const m = new SlotMachine({ reelCount: 3 });
    m.spin(
      pool,
      seedRng([0, 0.5, 0.99]),
      {},
      {
        rarityOf,
        weights: { common: 1, rare: 1 },
        reelRarity: () => "rare",
      },
    );
    expect(m.reels.every((r) => r.type === "r1")).toBe(true);
  });

  it("falls back to the full pool when a constraint empties the main pool", () => {
    const m = new SlotMachine({ reelCount: 2 });
    // No 'legendary' type exists in the pool → constraint would empty it.
    m.spin(
      pool,
      seedRng([0, 0.5]),
      {},
      {
        rarityOf,
        weights: { common: 1, rare: 1 },
        reelRarity: () => "legendary",
      },
    );
    expect(m.reels.every((r) => r.type !== null)).toBe(true);
  });

  it("disables luck for a reel when the constraint empties the lucky pool", () => {
    const m = new SlotMachine({ reelCount: 1 });
    // Lucky pool is all rare; constraint pins to common → luck is skipped.
    m.spin(
      ["c1"],
      seedRng([0, 0]),
      { pool: ["r1"], chance: 1 },
      { rarityOf, weights: { common: 1 }, reelRarity: () => "common" },
    );
    expect(m.typeAt(0)).toBe("c1");
  });
});
