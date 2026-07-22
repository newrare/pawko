import { describe, it, expect } from "vitest";
import {
  weightedPick,
  weightedSample,
  weightOfReward,
  commonRewards,
  rollMysteryReward,
  REWARD_DRAW_WEIGHTS,
} from "../../src/utils/reward-roll.js";
import {
  REWARD_BONUSES,
  REWARD_MALUSES,
} from "../../src/configs/bonus-defs.js";
import { RARITY } from "../../src/configs/constants.js";

/** Deterministic RNG returning each value in `seq` in turn (then 0). */
const seqRng = (seq) => {
  let i = 0;
  return () => (i < seq.length ? seq[i++] : 0);
};

describe("reward-roll — weightOfReward", () => {
  it("weights each rarity and maluses, 0 for unknown", () => {
    expect(weightOfReward({ rarity: RARITY.COMMON })).toBe(
      REWARD_DRAW_WEIGHTS.common,
    );
    expect(weightOfReward({ rarity: "malus" })).toBe(30);
    expect(weightOfReward({ rarity: "nope" })).toBe(0);
  });
});

describe("reward-roll — weightedPick", () => {
  it("returns null for an empty list", () => {
    expect(weightedPick([], () => 1, seqRng([0]))).toBeNull();
  });

  it("picks proportionally to weight", () => {
    const items = ["a", "b", "c"];
    // equal weights → roll * 3 selects the band
    expect(weightedPick(items, () => 1, seqRng([0]))).toBe("a");
    expect(weightedPick(items, () => 1, seqRng([0.5]))).toBe("b");
    expect(weightedPick(items, () => 1, seqRng([0.99]))).toBe("c");
  });

  it("falls back to a uniform pick when all weights are zero", () => {
    const items = ["a", "b"];
    expect(weightedPick(items, () => 0, seqRng([0.6]))).toBe("b");
  });
});

describe("reward-roll — weightedSample", () => {
  it("draws distinct items without replacement", () => {
    const items = ["a", "b", "c"];
    const out = weightedSample(items, 3, () => 1, seqRng([0, 0, 0]));
    expect(new Set(out).size).toBe(3);
    expect(out).toHaveLength(3);
  });

  it("stops when the pool is exhausted", () => {
    const out = weightedSample(["a"], 3, () => 1, seqRng([0, 0, 0]));
    expect(out).toEqual(["a"]);
  });
});

describe("reward-roll — commonRewards", () => {
  it("keeps only common-rarity rewards", () => {
    const commons = commonRewards(REWARD_BONUSES);
    expect(commons.length).toBeGreaterThan(0);
    expect(commons.every((d) => d.rarity === RARITY.COMMON)).toBe(true);
  });
});

describe("reward-roll — rollMysteryReward", () => {
  it("rolls a malus when the malus roll succeeds", () => {
    const def = rollMysteryReward({ malusChance: 0.3, rng: seqRng([0.1, 0]) });
    expect(REWARD_MALUSES).toContain(def);
  });

  it("rolls a bonus when the malus roll fails", () => {
    const def = rollMysteryReward({ malusChance: 0.3, rng: seqRng([0.9, 0]) });
    expect(REWARD_BONUSES).toContain(def);
  });

  it("restricts to common bonuses when forceCommon is set", () => {
    const def = rollMysteryReward({
      forceCommon: true,
      malusChance: 0.3,
      rng: seqRng([0.9, 0]),
    });
    expect(def.rarity).toBe(RARITY.COMMON);
  });
});
