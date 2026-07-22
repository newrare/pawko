import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PinboardProgress } from "../../src/components/pinboard-progress.js";

describe("PinboardProgress", () => {
  /** @type {HTMLElement} */
  let root;
  /** @type {PinboardProgress} */
  let progress;

  const fmt = (n) => new Intl.NumberFormat().format(n);
  const fill = () => root.querySelector('[data-role="fill"]');
  const line = () => root.querySelector('[data-role="line"]');
  const label = () => root.querySelector('[data-role="label"]');

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    progress = new PinboardProgress();
    progress.mount(root);
  });

  afterEach(() => {
    progress.destroy();
    root.remove();
  });

  it("mounts fill, horizon line and label as the first pinboard child", () => {
    expect(root.firstChild).toBe(root.querySelector(".pk-pinboard-progress"));
    expect(fill()).not.toBeNull();
    expect(line()).not.toBeNull();
    expect(label()).not.toBeNull();
  });

  it("renders the objective value in the label", () => {
    progress.setObjective(1500);
    expect(label().textContent).toContain(fmt(1500));
  });

  it("renders the level info alongside the objective value", () => {
    progress.setLevelInfo(3, 20);
    progress.setObjective(1500);
    const txt = label().textContent;
    expect(txt).toContain("3");
    expect(txt).toContain("20");
    expect(txt).toContain(fmt(1500));
  });

  it("scales the fill linearly up to the horizon line at the objective", () => {
    progress.setGeometry({ height: 100, lineY: 20 });
    progress.setObjective(500);
    // distance to line = 80; half the objective → half of 80
    progress.setScore(250);
    expect(fill().style.height).toBe("40px");
    // full objective → fill reaches the line exactly
    progress.setScore(500);
    expect(fill().style.height).toBe("80px");
  });

  it("flags the reached state once the score meets the objective", () => {
    progress.setGeometry({ height: 100, lineY: 20 });
    progress.setObjective(500);
    progress.setScore(499);
    expect(
      fill().classList.contains("pk-pinboard-progress-fill--reached"),
    ).toBe(false);
    progress.setScore(500);
    expect(
      fill().classList.contains("pk-pinboard-progress-fill--reached"),
    ).toBe(true);
    expect(
      root
        .querySelector(".pk-pinboard-progress")
        .classList.contains("pk-pinboard-progress--reached"),
    ).toBe(true);
  });

  it("lets the fill overshoot past the line but caps it at the board height", () => {
    progress.setGeometry({ height: 100, lineY: 20 });
    progress.setObjective(500);
    progress.setScore(5000); // frac 10 → 800px uncapped
    expect(fill().style.height).toBe("100px");
    expect(
      fill().classList.contains("pk-pinboard-progress-fill--reached"),
    ).toBe(true);
  });

  it("positions the horizon line at the supplied lineY", () => {
    progress.setGeometry({ height: 200, lineY: 48 });
    expect(line().style.top).toBe("48px");
  });

  it("keeps a zero-height fill when the objective is zero", () => {
    progress.setGeometry({ height: 100, lineY: 20 });
    progress.setObjective(0);
    progress.setScore(300);
    expect(fill().style.height).toBe("0px");
    expect(
      fill().classList.contains("pk-pinboard-progress-fill--reached"),
    ).toBe(false);
  });

  it("clamps the line within the board and re-renders geometry on resize", () => {
    progress.setGeometry({ height: 100, lineY: 250 });
    // lineY clamped to height → distance to line 0 → fill stays flat
    expect(line().style.top).toBe("100px");
    progress.setObjective(500);
    progress.setScore(500);
    expect(fill().style.height).toBe("0px");
  });
});
