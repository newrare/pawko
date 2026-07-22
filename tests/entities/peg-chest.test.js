import { describe, it, expect } from "vitest";
import { createPeg, PEG_TYPES } from "../../src/entities/peg-factory.js";
import { PEG_DEFS, CHEST_BALL_RELEASE } from "../../src/configs/constants.js";

describe("ChestPeg", () => {
  it("starts with the PEG_DEFS chest HP (3)", () => {
    const chest = createPeg(PEG_TYPES.CHEST, { x: 0, y: 0 });
    expect(chest.maxHp).toBe(PEG_DEFS.chest.hp);
    expect(chest.hp).toBe(3);
  });

  it("releases CHEST_BALL_RELEASE balls when destroyed", () => {
    const chest = createPeg(PEG_TYPES.CHEST, { x: 40, y: 60 });
    const reward = chest.onDestroyed(null);
    expect(reward.spawnBalls).toBe(CHEST_BALL_RELEASE);
    expect(reward.chest).toBe(true);
  });

  it("awards no direct hit-score points on contact", () => {
    const chest = createPeg(PEG_TYPES.CHEST, {});
    expect(chest.points).toBe(0);
  });
});
