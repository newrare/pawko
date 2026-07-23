import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PinboardProgress } from "../../src/components/pinboard-progress.js";
import { PLINKO } from "../../src/configs/constants.js";

describe("PinboardProgress", () => {
  /** @type {HTMLElement} */
  let root;
  /** @type {PinboardProgress} */
  let progress;

  const fmt = (n) => new Intl.NumberFormat().format(n);
  const fill = () => root.querySelector('[data-role="fill"]');
  const line = () => root.querySelector('[data-role="line"]');
  const level = () => root.querySelector('[data-role="level"]');
  const value = () => root.querySelector('[data-role="value"]');
  const TOP = PLINKO.PROGRESS_TOP_RESERVE;

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

  it("mounts fill, horizon line and the compact level/value chips as the first pinboard child", () => {
    expect(root.firstChild).toBe(root.querySelector(".pk-pinboard-progress"));
    expect(fill()).not.toBeNull();
    expect(line()).not.toBeNull();
    expect(level()).not.toBeNull();
    expect(value()).not.toBeNull();
  });

  it("renders the objective value in the right-hand chip", () => {
    progress.setObjective(1500);
    expect(value().textContent).toContain(fmt(1500));
  });

  it("renders the level id in the left-hand chip", () => {
    progress.setLevelInfo(3, 20);
    expect(level().textContent).toContain("3");
    // the compact chip drops the total from the label
    expect(level().textContent).not.toContain("20");
  });

  it("places the objective line on the shared scale, near the bottom for a low objective", () => {
    // scale = 10000 (last level), objective = 500 (level 1) → 5% up from bottom
    progress.setScale(10000);
    progress.setGeometry({ height: 100 });
    progress.setObjective(500);
    expect(line().style.top).toBe("95px");
  });

  it("places the objective line near the top for the last-level objective", () => {
    // objective === scale → line pinned at the top reserve, never off-board
    progress.setScale(10000);
    progress.setGeometry({ height: 100 });
    progress.setObjective(10000);
    expect(line().style.top).toBe(`${TOP}px`);
  });

  it("scales the fill on the shared scale so the score meets the line at the objective", () => {
    progress.setScale(1000);
    progress.setGeometry({ height: 100 });
    progress.setObjective(500);
    // fill maps score/scale → 250/1000 = 25% of the board
    progress.setScore(250);
    expect(fill().style.height).toBe("25px");
    // at the objective the fill reaches the line (line sits 50px above bottom)
    progress.setScore(500);
    expect(fill().style.height).toBe("50px");
    expect(line().style.top).toBe("50px");
  });

  it("flags the reached state once the score meets the objective", () => {
    progress.setScale(1000);
    progress.setGeometry({ height: 100 });
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
    progress.setScale(1000);
    progress.setGeometry({ height: 100 });
    progress.setObjective(500);
    progress.setScore(5000); // frac 5 → 500px uncapped
    expect(fill().style.height).toBe("100px");
    expect(
      fill().classList.contains("pk-pinboard-progress-fill--reached"),
    ).toBe(true);
  });

  it("falls back to the objective as the scale when no scale is set", () => {
    // backward-safe: without setScale, the fill maps score/objective
    progress.setGeometry({ height: 100 });
    progress.setObjective(500);
    progress.setScore(250);
    expect(fill().style.height).toBe("50px");
  });

  it("keeps a zero-height fill when both scale and objective are zero", () => {
    progress.setGeometry({ height: 100 });
    progress.setObjective(0);
    progress.setScore(300);
    expect(fill().style.height).toBe("0px");
    expect(
      fill().classList.contains("pk-pinboard-progress-fill--reached"),
    ).toBe(false);
  });

  it("re-renders geometry on resize", () => {
    progress.setScale(10000);
    progress.setObjective(500);
    progress.setGeometry({ height: 100 });
    expect(line().style.top).toBe("95px");
    progress.setGeometry({ height: 200 });
    expect(line().style.top).toBe("190px");
  });
});
