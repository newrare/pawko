import { describe, it, expect } from "vitest";
import { createBall, BALL_KINDS } from "../../src/entities/ball-factory.js";
import { Ball } from "../../src/entities/ball-classic.js";

describe("ball-factory", () => {
  it("maps BALL_KINDS.CLASSIC to Ball", () => {
    expect(createBall(BALL_KINDS.CLASSIC)).toBeInstanceOf(Ball);
  });

  it("returns a Ball whose kind matches its registry key", () => {
    for (const kind of Object.values(BALL_KINDS)) {
      expect(createBall(kind).kind).toBe(kind);
    }
  });

  it("forwards constructor opts to the spawned ball", () => {
    const b = createBall(BALL_KINDS.CLASSIC, { x: 7, y: 8, vx: 9, vy: 10 });
    expect(b.x).toBe(7);
    expect(b.y).toBe(8);
    expect(b.vx).toBe(9);
    expect(b.vy).toBe(10);
  });

  it("falls back to Ball for an unknown kind", () => {
    const b = createBall("nonexistent");
    expect(b).toBeInstanceOf(Ball);
    expect(b.kind).toBe(BALL_KINDS.CLASSIC);
  });
});
