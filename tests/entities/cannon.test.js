import { describe, it, expect } from "vitest";
import { Cannon, ballsForLevel } from "../../src/entities/cannon.js";
import { CANNON } from "../../src/configs/constants.js";

describe("ballsForLevel", () => {
  it("loads one ball per level (level N → N balls)", () => {
    expect(ballsForLevel(1)).toBe(1);
    expect(ballsForLevel(2)).toBe(2);
    expect(ballsForLevel(7)).toBe(7);
    expect(ballsForLevel(20)).toBe(20);
  });

  it("caps at BALLS_MAX", () => {
    expect(ballsForLevel(21)).toBe(CANNON.BALLS_MAX);
    expect(ballsForLevel(999)).toBe(CANNON.BALLS_MAX);
  });

  it("falls back to a single ball for bad ids", () => {
    expect(ballsForLevel(0)).toBe(1);
    expect(ballsForLevel(-4)).toBe(1);
    expect(ballsForLevel(undefined)).toBe(1);
    expect(ballsForLevel(NaN)).toBe(1);
  });
});

describe("Cannon aiming", () => {
  it("points straight down (angle 0) for a target directly below the pivot", () => {
    const c = new Cannon({ balls: 3, pivotX: 100, pivotY: 20 });
    c.aimAt(100, 200);
    expect(c.angle).toBeCloseTo(0);
  });

  it("aims toward the right with a positive angle", () => {
    const c = new Cannon({ balls: 3, pivotX: 100, pivotY: 20 });
    c.aimAt(200, 120); // dx>0, dy>0
    expect(c.angle).toBeGreaterThan(0);
  });

  it("aims toward the left with a negative angle", () => {
    const c = new Cannon({ balls: 3, pivotX: 100, pivotY: 20 });
    c.aimAt(0, 120);
    expect(c.angle).toBeLessThan(0);
  });

  it("clamps the angle to the downward cone", () => {
    const c = new Cannon({ balls: 3, pivotX: 100, pivotY: 20 });
    c.aimAt(9999, 21); // almost horizontal to the right
    expect(c.angle).toBeCloseTo(CANNON.MAX_ANGLE);
    c.aimAt(-9999, 21);
    expect(c.angle).toBeCloseTo(-CANNON.MAX_ANGLE);
  });

  it("never aims upward — a target above the pivot resolves downward", () => {
    const c = new Cannon({ balls: 3, pivotX: 100, pivotY: 200 });
    c.aimAt(100, 0); // directly above
    // dy is clamped to a small positive → essentially straight down
    expect(Math.abs(c.angle)).toBeLessThanOrEqual(CANNON.MAX_ANGLE);
    const v = c.launchVelocity();
    expect(v.vy).toBeGreaterThan(0); // always heads down
  });

  it("setAngle clamps out-of-range values", () => {
    const c = new Cannon({ balls: 1 });
    expect(c.setAngle(Math.PI)).toBeCloseTo(CANNON.MAX_ANGLE);
    expect(c.setAngle(-Math.PI)).toBeCloseTo(-CANNON.MAX_ANGLE);
  });
});

describe("Cannon muzzle & launch velocity", () => {
  it("places the muzzle below the pivot when aiming straight down", () => {
    const c = new Cannon({ balls: 1, pivotX: 50, pivotY: 10 });
    c.setAngle(0);
    expect(c.muzzle.x).toBeCloseTo(50);
    expect(c.muzzle.y).toBeCloseTo(10 + CANNON.MUZZLE_LENGTH);
  });

  it("launch velocity magnitude equals the launch speed", () => {
    const c = new Cannon({ balls: 1 });
    c.setAngle(0.5);
    const { vx, vy } = c.launchVelocity();
    expect(Math.hypot(vx, vy)).toBeCloseTo(CANNON.LAUNCH_SPEED);
  });

  it("launch velocity direction matches the aim", () => {
    const c = new Cannon({ balls: 1 });
    c.setAngle(0);
    expect(c.launchVelocity().vx).toBeCloseTo(0);
    expect(c.launchVelocity().vy).toBeCloseTo(CANNON.LAUNCH_SPEED);
  });
});

describe("Cannon ball count", () => {
  it("pops one ball at a time until empty", () => {
    const c = new Cannon({ balls: 2 });
    expect(c.ballsRemaining).toBe(2);
    expect(c.isEmpty).toBe(false);
    expect(c.pop()).toBe(true);
    expect(c.ballsRemaining).toBe(1);
    expect(c.pop()).toBe(true);
    expect(c.isEmpty).toBe(true);
    expect(c.pop()).toBe(false);
    expect(c.ballsRemaining).toBe(0);
  });

  it("adds and removes balls with a floor at zero", () => {
    const c = new Cannon({ balls: 1 });
    c.addBalls(3);
    expect(c.ballsRemaining).toBe(4);
    c.removeBalls(10);
    expect(c.ballsRemaining).toBe(0);
  });
});
