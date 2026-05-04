import { describe, it, expect } from "vitest";
import { Ball } from "../../src/entities/ball.js";
import { PLINKO } from "../../src/configs/constants.js";

describe("Ball", () => {
  it("starts alive with zero recycle count", () => {
    const b = new Ball();
    expect(b.alive).toBe(true);
    expect(b.recycles).toBe(0);
  });

  it("uses BALL_RADIUS from constants", () => {
    expect(new Ball().radius).toBe(PLINKO.BALL_RADIUS);
  });

  it("canRecycle is true while under MAX_RECYCLES", () => {
    const b = new Ball();
    for (let i = 0; i < PLINKO.MAX_RECYCLES; i++) {
      expect(b.canRecycle()).toBe(true);
      b.recycles += 1;
    }
    expect(b.canRecycle()).toBe(false);
  });

  it("stores explicit position and velocity", () => {
    const b = new Ball({ x: 1, y: 2, vx: 3, vy: 4 });
    expect(b.x).toBe(1);
    expect(b.y).toBe(2);
    expect(b.vx).toBe(3);
    expect(b.vy).toBe(4);
  });
});
