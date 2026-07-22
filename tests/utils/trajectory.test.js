import { describe, it, expect } from "vitest";
import { simulateTrajectory } from "../../src/utils/trajectory.js";

const BASE = {
  width: 300,
  height: 500,
  gravity: 600,
  ballRadius: 9,
  wallRestitution: 0.7,
  dt: 1 / 120,
  maxBounces: 2,
  maxSteps: 420,
  sampleSpacing: 15,
};

describe("simulateTrajectory", () => {
  it("returns a path that starts at the launch point", () => {
    const { points } = simulateTrajectory({
      ...BASE,
      x: 150,
      y: 20,
      vx: 0,
      vy: 200,
    });
    expect(points[0]).toEqual({ x: 150, y: 20 });
    expect(points.length).toBeGreaterThan(1);
  });

  it("falls straight down and exits the bottom with no pegs, no bounces", () => {
    const res = simulateTrajectory({
      ...BASE,
      x: 150,
      y: 20,
      vx: 0,
      vy: 200,
    });
    expect(res.bounces).toBe(0);
    expect(res.stopReason).toBe("bottom");
    const last = res.points[res.points.length - 1];
    expect(last.x).toBeCloseTo(150, 0);
    expect(last.y).toBeGreaterThan(BASE.height);
  });

  it("bounces off a side wall when fired toward it", () => {
    const res = simulateTrajectory({
      ...BASE,
      x: 150,
      y: 20,
      vx: 900, // straight at the right wall
      vy: 50,
    });
    expect(res.bounces).toBeGreaterThanOrEqual(1);
    // No point ever leaves the playfield horizontally.
    for (const p of res.points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(BASE.width);
    }
  });

  it("stops after registering more than maxBounces bounces", () => {
    const res = simulateTrajectory({
      ...BASE,
      x: 150,
      y: 250,
      vx: 1100,
      vy: 0,
      gravity: 0, // pure horizontal ping-pong between the two walls
      maxBounces: 2,
    });
    expect(res.stopReason).toBe("bounces");
    expect(res.bounces).toBe(3); // stops one bounce past the limit
  });

  it("registers a bounce off a peg in the flight path", () => {
    const pegs = [{ id: 1, x: 150, y: 120, radius: 10, restitution: 0.4 }];
    const withPeg = simulateTrajectory({
      ...BASE,
      x: 150,
      y: 20,
      vx: 0,
      vy: 300,
      pegs,
    });
    expect(withPeg.bounces).toBeGreaterThanOrEqual(1);
  });

  it("counts a single sustained peg contact only once", () => {
    // With no gravity the ball deflects off the peg once and leaves, so the
    // multi-frame overlap must resolve to exactly one bounce (recent-peg
    // de-dup), not one per frame.
    const pegs = [{ id: 7, x: 150, y: 120, radius: 10, restitution: 0.4 }];
    const res = simulateTrajectory({
      ...BASE,
      x: 150,
      y: 20,
      vx: 0,
      vy: 150,
      gravity: 0,
      pegs,
      maxBounces: 5,
    });
    expect(res.bounces).toBe(1);
  });
});
