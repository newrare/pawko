import { describe, it, expect } from "vitest";
import { GluePeg } from "../../src/entities/peg-glue.js";
import { Peg } from "../../src/entities/peg-classic.js";
import { PEG_DEFS } from "../../src/configs/constants.js";

describe("GluePeg", () => {
  it("inherits Peg geometry and identifies itself as 'glue'", () => {
    const g = new GluePeg({ x: 3, y: 4, slot: 7 });
    expect(g).toBeInstanceOf(Peg);
    expect(g.type).toBe("glue");
    expect(g.slot).toBe(7);
  });

  it("starts with HP from PEG_DEFS and no trapped ball", () => {
    const g = new GluePeg();
    expect(g.maxHp).toBe(PEG_DEFS.glue.hp);
    expect(g.hp).toBe(PEG_DEFS.glue.hp);
    expect(g.trappedBall).toBeNull();
    expect(g.canTrap).toBe(true);
  });

  it("awards no score on contact (glue trap is the reward)", () => {
    const g = new GluePeg();
    expect(g.score).toBe(0);
    expect(g.scoreForContact()).toBe(0);
  });

  it("consumeReward traps the first ball and returns a trap directive", () => {
    const g = new GluePeg();
    const ball = { id: 42 };
    const reward = g.consumeReward(ball);
    expect(reward).not.toBeNull();
    expect(reward.trapped).toBe(true);
    expect(reward.popText).toBe("GLUE!");
    expect(reward.popClass).toBe("pk-popup pk-popup--glue");
    expect(g.trappedBall).toBe(ball);
    expect(g.canTrap).toBe(false);
  });

  it("consumeReward returns null when a ball is already trapped", () => {
    const g = new GluePeg();
    const ball1 = { id: 1 };
    const ball2 = { id: 2 };
    g.consumeReward(ball1);
    expect(g.consumeReward(ball2)).toBeNull();
    expect(g.trappedBall).toBe(ball1);
  });

  it("takes damage on contact just like any other peg", () => {
    const g = new GluePeg();
    const start = g.hp;
    const died = g.takeDamage(1);
    expect(g.hp).toBe(start - 1);
    expect(died).toBe(false);
  });

  it("isLastHit flips on at 1 HP (drives the tremble visual)", () => {
    const g = new GluePeg();
    g.hp = 2;
    expect(g.isLastHit).toBe(false);
    g.takeDamage(1);
    expect(g.hp).toBe(1);
    expect(g.isLastHit).toBe(true);
  });

  it("onDestroyed releases the trapped ball and pops a FREE label", () => {
    const g = new GluePeg();
    const ball = { id: 7 };
    g.consumeReward(ball);
    const death = g.onDestroyed(ball);
    expect(death).not.toBeNull();
    expect(death.releaseBall).toBe(ball);
    expect(death.popText).toBe("FREE!");
    expect(g.trappedBall).toBeNull();
  });

  it("onDestroyed returns null when no ball was trapped", () => {
    const g = new GluePeg();
    expect(g.onDestroyed(null)).toBeNull();
  });
});
