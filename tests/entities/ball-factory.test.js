import { describe, it, expect } from "vitest";
import { createBall, BALL_KINDS } from "../../src/entities/ball-factory.js";
import { Ball } from "../../src/entities/ball-classic.js";
import { IceBall } from "../../src/entities/ball-ice.js";
import { FireBall } from "../../src/entities/ball-fire.js";
import { GlassBall } from "../../src/entities/ball-glass.js";
import { BlackBall } from "../../src/entities/ball-black.js";
import { ElectricalBall } from "../../src/entities/ball-electrical.js";

describe("createBall", () => {
  it("maps each BALL_KINDS value to its concrete class", () => {
    expect(createBall(BALL_KINDS.CLASSIC)).toBeInstanceOf(Ball);
    expect(createBall(BALL_KINDS.ICE)).toBeInstanceOf(IceBall);
    expect(createBall(BALL_KINDS.FIRE)).toBeInstanceOf(FireBall);
    expect(createBall(BALL_KINDS.GLASS)).toBeInstanceOf(GlassBall);
    expect(createBall(BALL_KINDS.BLACK)).toBeInstanceOf(BlackBall);
    expect(createBall(BALL_KINDS.ELECTRICAL)).toBeInstanceOf(ElectricalBall);
  });

  it("returns a Ball whose kind matches the requested string", () => {
    for (const kind of Object.values(BALL_KINDS)) {
      expect(createBall(kind).kind).toBe(kind);
    }
  });

  it("forwards constructor options", () => {
    const b = createBall(BALL_KINDS.FIRE, { x: 7, y: 8, vx: 9, vy: 10 });
    expect(b.x).toBe(7);
    expect(b.y).toBe(8);
    expect(b.vx).toBe(9);
    expect(b.vy).toBe(10);
  });

  it("falls back to classic Ball for unknown kinds", () => {
    const b = createBall("bogus");
    expect(b).toBeInstanceOf(Ball);
    expect(b.kind).toBe(BALL_KINDS.CLASSIC);
  });
});
