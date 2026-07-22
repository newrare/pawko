import { describe, it, expect } from "vitest";
import {
  buildMysteryChoices,
  MYSTERY_CHOICE_TYPES,
} from "../../src/utils/mystery-choice.js";
import { MYSTERY_CHOICE } from "../../src/configs/constants.js";

/**
 * Deterministic RNG stub: replays the supplied sequence, then cycles. Every
 * value is clamped to [0, 1).
 * @param {number[]} seq
 */
function seqRng(seq) {
  let i = 0;
  return () => {
    const v = seq[i % seq.length];
    i++;
    return Math.min(0.999999, Math.max(0, v));
  };
}

/** Minimal bonus-def factory. */
const bonus = (id, rarity = "common") => ({ id, rarity, icon: "sparkles" });

describe("buildMysteryChoices", () => {
  it("returns exactly COUNT choices by default", () => {
    const pool = [bonus("a"), bonus("b"), bonus("c"), bonus("d")];
    const choices = buildMysteryChoices({ pool, rng: seqRng([0.1, 0.4]) });
    expect(choices).toHaveLength(MYSTERY_CHOICE.COUNT);
  });

  it("carries the def rarity through onto each choice", () => {
    const pool = [bonus("a", "legendary"), bonus("b", "malus")];
    const choices = buildMysteryChoices({ pool, rng: seqRng([0, 0]) });
    const rarities = choices.map((c) => c.rarity).sort();
    expect(rarities).toEqual(["legendary", "malus"]);
  });

  it("draws maluses too — the pool is the whole catalogue", () => {
    const pool = [bonus("m1", "malus"), bonus("m2", "malus")];
    const choices = buildMysteryChoices({ pool, rng: seqRng([0, 0]) });
    expect(choices.every((c) => c.rarity === "malus")).toBe(true);
    expect(choices.every((c) => c.type === MYSTERY_CHOICE_TYPES.BONUS)).toBe(
      true,
    );
  });

  it("never offers two identical bonuses", () => {
    const pool = [bonus("a"), bonus("b"), bonus("c")];
    const choices = buildMysteryChoices({ pool, rng: seqRng([0, 0, 0]) });
    const ids = choices.map((c) => c.def?.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("excludes bonuses already active this run", () => {
    const pool = [bonus("a"), bonus("b"), bonus("c")];
    const choices = buildMysteryChoices({
      pool,
      activeIds: ["a", "b"],
      rng: seqRng([0, 0]),
    });
    const bonusIds = choices
      .filter((c) => c.type === MYSTERY_CHOICE_TYPES.BONUS)
      .map((c) => c.def.id);
    expect(bonusIds).not.toContain("a");
    expect(bonusIds).not.toContain("b");
    // Only "c" is available → one bonus + one currency fallback.
    expect(bonusIds).toEqual(["c"]);
  });

  it("accepts a Set of active ids", () => {
    const pool = [bonus("a"), bonus("b")];
    const choices = buildMysteryChoices({
      pool,
      activeIds: new Set(["a"]),
      rng: seqRng([0]),
    });
    const bonusIds = choices
      .filter((c) => c.type === MYSTERY_CHOICE_TYPES.BONUS)
      .map((c) => c.def.id);
    expect(bonusIds).toEqual(["b"]);
  });

  it("fills empty slots with a common currency card when no bonuses remain", () => {
    const choices = buildMysteryChoices({
      pool: [],
      rng: seqRng([0, 0, 0, 0]),
    });
    expect(choices).toHaveLength(MYSTERY_CHOICE.COUNT);
    expect(choices.every((c) => c.type === MYSTERY_CHOICE_TYPES.CURRENCY)).toBe(
      true,
    );
    expect(choices.every((c) => c.rarity === "common")).toBe(true);
  });

  it("currency fallbacks carry a valid currency and a positive amount", () => {
    const choices = buildMysteryChoices({
      pool: [],
      rng: seqRng([0.2, 0.7, 0.5, 0.9]),
    });
    for (const c of choices) {
      expect(["coins", "diamonds"]).toContain(c.currency);
      expect(c.amount).toBeGreaterThan(0);
      expect(Number.isInteger(c.amount)).toBe(true);
    }
  });

  it("coins fallback amount stays within configured range", () => {
    // rng 0 → min bound for every roll
    const min = buildMysteryChoices({ pool: [], rng: seqRng([0]) });
    const max = buildMysteryChoices({ pool: [], rng: seqRng([0.999999]) });
    const coinAmounts = [...min, ...max]
      .filter((c) => c.currency === "coins")
      .map((c) => c.amount);
    for (const a of coinAmounts) {
      expect(a).toBeGreaterThanOrEqual(MYSTERY_CHOICE.FALLBACK_COINS_MIN);
      expect(a).toBeLessThanOrEqual(MYSTERY_CHOICE.FALLBACK_COINS_MAX);
    }
  });

  it("offers both currencies when both slots are fallbacks", () => {
    const choices = buildMysteryChoices({
      pool: [],
      rng: seqRng([0, 0, 0, 0]),
    });
    const currencies = new Set(choices.map((c) => c.currency));
    expect(currencies.size).toBe(2);
  });

  it("restricts the draw to common rewards when forceCommon is set", () => {
    const pool = [
      bonus("a", "legendary"),
      bonus("b", "common"),
      bonus("m", "malus"),
      bonus("c", "common"),
    ];
    const choices = buildMysteryChoices({
      pool,
      forceCommon: true,
      rng: seqRng([0, 0]),
    });
    const bonusCards = choices.filter(
      (c) => c.type === MYSTERY_CHOICE_TYPES.BONUS,
    );
    expect(bonusCards.length).toBeGreaterThan(0);
    expect(bonusCards.every((c) => c.rarity === "common")).toBe(true);
  });

  it("honours a custom count", () => {
    const pool = [bonus("a"), bonus("b"), bonus("c")];
    const choices = buildMysteryChoices({
      pool,
      count: 3,
      rng: seqRng([0, 0, 0]),
    });
    expect(choices).toHaveLength(3);
  });

  it("defaults to the whole catalogue (ALL_BONUSES) when no pool is supplied", () => {
    const choices = buildMysteryChoices({ rng: seqRng([0.1, 0.6]) });
    expect(choices).toHaveLength(MYSTERY_CHOICE.COUNT);
    // With the real (non-empty) catalogue and nothing active, both are reward
    // defs (bonus or malus — both carry type BONUS).
    expect(choices.every((c) => c.type === MYSTERY_CHOICE_TYPES.BONUS)).toBe(
      true,
    );
  });
});
