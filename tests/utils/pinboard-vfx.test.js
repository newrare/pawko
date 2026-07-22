import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PinboardVfx } from "../../src/utils/pinboard-vfx.js";
import { ListenerBag } from "../../src/utils/listener-bag.js";
import { SCORE_FLY } from "../../src/configs/constants.js";

describe("PinboardVfx — flyBallToMultiplier", () => {
  /** @type {HTMLElement} */
  let safeEl;
  /** @type {HTMLElement} */
  let ballLayerEl;
  /** @type {ListenerBag} */
  let bag;
  /** @type {PinboardVfx} */
  let vfx;

  beforeEach(() => {
    safeEl = document.createElement("div");
    ballLayerEl = document.createElement("div");
    safeEl.appendChild(ballLayerEl);
    document.body.appendChild(safeEl);
    bag = new ListenerBag();
    vfx = new PinboardVfx({
      stackEl: document.createElement("div"),
      ballLayerEl,
      safeEl,
      getPinboardOffsetTop: () => 0,
      bag,
    });
  });

  afterEach(() => {
    bag.dispose();
    safeEl.remove();
    vi.useRealTimers();
  });

  it("appends a flying multiplier orb to the ball layer", () => {
    const from = document.createElement("div");
    const to = document.createElement("div");
    safeEl.append(from, to);
    vfx.flyBallToMultiplier(from, to, () => {});
    expect(ballLayerEl.querySelector(".pk-mult-fly")).not.toBeNull();
  });

  it("invokes onArrive and removes the orb after the flight", () => {
    vi.useFakeTimers();
    const from = document.createElement("div");
    const to = document.createElement("div");
    safeEl.append(from, to);
    const onArrive = vi.fn();
    vfx.flyBallToMultiplier(from, to, onArrive);

    expect(onArrive).not.toHaveBeenCalled();
    vi.advanceTimersByTime(600);
    expect(onArrive).toHaveBeenCalledTimes(1);
    expect(ballLayerEl.querySelector(".pk-mult-fly")).toBeNull();
  });

  it("still fires onArrive when there is no source element", () => {
    const onArrive = vi.fn();
    vfx.flyBallToMultiplier(null, document.createElement("div"), onArrive);
    expect(onArrive).toHaveBeenCalledTimes(1);
    expect(ballLayerEl.querySelector(".pk-mult-fly")).toBeNull();
  });
});

describe("PinboardVfx — flyPointsToScore", () => {
  /** @type {HTMLElement} */
  let safeEl;
  /** @type {HTMLElement} */
  let ballLayerEl;
  /** @type {ListenerBag} */
  let bag;
  /** @type {PinboardVfx} */
  let vfx;

  beforeEach(() => {
    safeEl = document.createElement("div");
    ballLayerEl = document.createElement("div");
    safeEl.appendChild(ballLayerEl);
    document.body.appendChild(safeEl);
    bag = new ListenerBag();
    vfx = new PinboardVfx({
      stackEl: document.createElement("div"),
      ballLayerEl,
      safeEl,
      getPinboardOffsetTop: () => 0,
      bag,
    });
  });

  afterEach(() => {
    bag.dispose();
    safeEl.remove();
    vi.useRealTimers();
  });

  it("appends a +N chip carrying the peg-type class and value", () => {
    vfx.flyPointsToScore(20, 100, 200, null, "fire");
    const chip = ballLayerEl.querySelector(".pk-score-fly");
    expect(chip).not.toBeNull();
    expect(chip.classList.contains("pk-score-fly--fire")).toBe(true);
    expect(chip.textContent).toBe("+20");
  });

  it("defaults to the classic 'peg' type class when none is given", () => {
    vfx.flyPointsToScore(10, 0, 0, null);
    const chip = ballLayerEl.querySelector(".pk-score-fly");
    expect(chip.classList.contains("pk-score-fly--peg")).toBe(true);
  });

  it("holds, then adds --go before flying and merges on arrival", () => {
    vi.useFakeTimers();
    const onArrive = vi.fn();
    vfx.flyPointsToScore(30, 50, 50, null, "bumper", onArrive);
    const chip = ballLayerEl.querySelector(".pk-score-fly");

    /* Phase 1: holding — no travel class, no merge yet. */
    expect(chip.classList.contains("pk-score-fly--go")).toBe(false);
    expect(onArrive).not.toHaveBeenCalled();

    /* Phase 2: after the hold, the travel class is applied. */
    vi.advanceTimersByTime(SCORE_FLY.HOLD_MS);
    expect(chip.classList.contains("pk-score-fly--go")).toBe(true);
    expect(onArrive).not.toHaveBeenCalled();

    /* Arrival: merge into the total and dispose the chip. */
    vi.advanceTimersByTime(SCORE_FLY.FLY_MS);
    expect(onArrive).toHaveBeenCalledTimes(1);
    expect(ballLayerEl.querySelector(".pk-score-fly")).toBeNull();
  });

  it("exposes the fly duration to CSS via --pk-fly-dur", () => {
    vfx.flyPointsToScore(10, 0, 0, null, "peg");
    const chip = ballLayerEl.querySelector(".pk-score-fly");
    expect(chip.style.getPropertyValue("--pk-fly-dur")).toBe(
      `${SCORE_FLY.FLY_MS}ms`,
    );
  });

  it("is a no-op for zero or negative points", () => {
    const onArrive = vi.fn();
    vfx.flyPointsToScore(0, 0, 0, null, "peg", onArrive);
    expect(ballLayerEl.querySelector(".pk-score-fly")).toBeNull();
    expect(onArrive).not.toHaveBeenCalled();
  });

  it("still fires onArrive when there is no ball layer", () => {
    const noLayer = new PinboardVfx({
      stackEl: document.createElement("div"),
      ballLayerEl: null,
      safeEl,
      getPinboardOffsetTop: () => 0,
      bag,
    });
    const onArrive = vi.fn();
    noLayer.flyPointsToScore(10, 0, 0, null, "peg", onArrive);
    expect(onArrive).toHaveBeenCalledTimes(1);
  });
});
