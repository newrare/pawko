import { describe, it, expect } from "vitest";
import { pointSegmentDistance } from "../../src/utils/math.js";

describe("pointSegmentDistance", () => {
  it("returns the perpendicular distance for points beside the segment", () => {
    expect(pointSegmentDistance(5, 5, 0, 0, 10, 0)).toBeCloseTo(5);
  });

  it("clamps to endpoints for points beyond the segment", () => {
    expect(pointSegmentDistance(-3, 0, 0, 0, 10, 0)).toBeCloseTo(3);
    expect(pointSegmentDistance(15, 0, 0, 0, 10, 0)).toBeCloseTo(5);
  });

  it("handles degenerate (zero-length) segments", () => {
    expect(pointSegmentDistance(3, 4, 0, 0, 0, 0)).toBeCloseTo(5);
  });
});
