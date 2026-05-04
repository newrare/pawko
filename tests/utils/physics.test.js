import { describe, it, expect } from "vitest";
import { collideCircles, reflect, clampVelocity } from "../../src/utils/physics.js";

describe("collideCircles", () => {
  it("returns null when circles are apart", () => {
    expect(collideCircles(0, 0, 5, 100, 0, 5)).toBeNull();
  });

  it("returns a normal pointing from B to A on overlap", () => {
    const c = collideCircles(9, 0, 5, 0, 0, 5);
    expect(c).not.toBeNull();
    expect(c.nx).toBeCloseTo(1);
    expect(c.ny).toBeCloseTo(0);
    expect(c.depth).toBeCloseTo(1);
  });

  it("computes positive penetration depth on overlap", () => {
    const c = collideCircles(0, 0, 5, 6, 0, 5);
    expect(c.depth).toBeCloseTo(4);
  });
});

describe("reflect", () => {
  it("reverses the velocity component along the normal", () => {
    const r = reflect(0, 10, 0, -1, 1);
    expect(r.vx).toBe(0);
    expect(r.vy).toBeCloseTo(-10);
  });

  it("does nothing when velocity already points away from the surface", () => {
    const r = reflect(0, -5, 0, -1, 1);
    expect(r.vy).toBe(-5);
  });

  it("dampens with restitution < 1", () => {
    const r = reflect(0, 10, 0, -1, 0.5);
    expect(r.vy).toBeCloseTo(-5);
  });
});

describe("clampVelocity", () => {
  it("leaves a small vector unchanged", () => {
    const v = clampVelocity(3, 4, 100);
    expect(v.vx).toBe(3);
    expect(v.vy).toBe(4);
  });

  it("clamps the magnitude", () => {
    const v = clampVelocity(30, 40, 5);
    const m = Math.hypot(v.vx, v.vy);
    expect(m).toBeCloseTo(5);
  });
});
