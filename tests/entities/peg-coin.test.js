import { describe, it, expect } from "vitest";
import { CoinPeg } from "../../src/entities/peg-coin.js";
import { Peg } from "../../src/entities/peg-classic.js";
import { PLINKO } from "../../src/configs/constants.js";

describe("CoinPeg", () => {
  it("inherits Peg geometry", () => {
    const c = new CoinPeg({ x: 1, y: 2, slot: 5 });
    expect(c).toBeInstanceOf(Peg);
    expect(c.radius).toBe(PLINKO.PEG_RADIUS);
    expect(c.slot).toBe(5);
  });

  it("identifies itself with type 'coin'", () => {
    const c = new CoinPeg();
    expect(c.type).toBe("coin");
  });

  it("exposes COIN_VALUE as coinValue", () => {
    expect(new CoinPeg().coinValue).toBe(PLINKO.COIN_VALUE);
  });

  it("consumeReward describes a coin payout that the controller executes", () => {
    const c = new CoinPeg();
    const reward = c.consumeReward(null);
    expect(reward).not.toBeNull();
    expect(reward.coins).toBe(PLINKO.COIN_VALUE);
    expect(reward.popText).toBe(`+${PLINKO.COIN_VALUE}`);
    expect(reward.popClass).toBe("pk-popup pk-popup--coin");
  });
});
