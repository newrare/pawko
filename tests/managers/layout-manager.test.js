import { describe, it, expect, vi } from "vitest";
import { layout } from "../../src/managers/layout-manager.js";
import {
  ORIENTATION,
  ORIENTATIONS,
  SAFE_ZONE,
} from "../../src/configs/constants.js";

const isPortrait = ORIENTATION === ORIENTATIONS.PORTRAIT;
const maxW = isPortrait
  ? SAFE_ZONE.MAX_WIDTH_PORTRAIT
  : SAFE_ZONE.MAX_WIDTH_LANDSCAPE;
const maxH = isPortrait
  ? SAFE_ZONE.MAX_HEIGHT_PORTRAIT
  : SAFE_ZONE.MAX_HEIGHT_LANDSCAPE;

describe("LayoutManager", () => {
  it("publishes safe-zone CSS variables on update", () => {
    layout.update(400, 800);
    const r = document.documentElement.style;
    expect(r.getPropertyValue("--gt-vw")).toBe("400px");
    expect(r.getPropertyValue("--gt-vh")).toBe("800px");
    expect(r.getPropertyValue("--gt-safe-width")).not.toBe("");
    expect(r.getPropertyValue("--gt-safe-cx")).not.toBe("");
    expect(r.getPropertyValue("--gt-safe-cy")).not.toBe("");
  });

  it("emits change events on update", () => {
    const fn = vi.fn();
    const off = layout.onChange(fn);
    layout.update(360, 720);
    expect(fn).toHaveBeenCalledTimes(1);
    off();
  });

  it("caps the safe-zone box on wide viewports", () => {
    layout.update(1600, 1600);
    expect(layout.safe.width).toBeLessThanOrEqual(maxW);
    expect(layout.safe.height).toBeLessThanOrEqual(maxH);
  });

  it("centers the box symmetrically inside the available area", () => {
    layout.update(1200, 900);
    /* Distance from left/right of available area must be equal,
       likewise top/bottom — even when MIN_TOP ≠ MIN_BOTTOM. */
    const cs = getComputedStyle(document.documentElement);
    const vw = parseFloat(cs.getPropertyValue("--gt-vw"));
    const vh = parseFloat(cs.getPropertyValue("--gt-vh"));
    const insetLeft = parseFloat(cs.getPropertyValue("--gt-safe-left"));
    const insetRight = parseFloat(cs.getPropertyValue("--gt-safe-right"));
    const insetTop = parseFloat(cs.getPropertyValue("--gt-safe-top"));
    const insetBottom = parseFloat(cs.getPropertyValue("--gt-safe-bottom"));
    /* The box's outer margins (inset + leftover) must be symmetric. */
    const leftMargin = layout.safe.left;
    const rightMargin = vw - layout.safe.right;
    const topMargin = layout.safe.top;
    const bottomMargin = vh - layout.safe.bottom;
    expect(
      Math.abs(leftMargin - insetLeft - (rightMargin - insetRight)),
    ).toBeLessThan(1);
    expect(
      Math.abs(topMargin - insetTop - (bottomMargin - insetBottom)),
    ).toBeLessThan(1);
  });
});
