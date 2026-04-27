import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SwipeDetector } from "../../src/utils/swipe-detector.js";
import { SWIPE_THRESHOLD } from "../../src/configs/constants.js";

/**
 * Build a TouchEvent with a single touch at (x, y).
 * happy-dom's TouchEvent isn't fully spec-compliant, so we hand-roll an
 * object that quacks like one.
 */
function touchEvent(type, { x = 0, y = 0, id = 1, target = window } = {}) {
  const touch = { identifier: id, clientX: x, clientY: y };
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "touches", {
    get: () => (type === "touchend" ? [] : [touch]),
  });
  Object.defineProperty(event, "changedTouches", { get: () => [touch] });
  Object.defineProperty(event, "target", { get: () => target });
  return event;
}

describe("SwipeDetector", () => {
  let target;
  let onDirection;
  let detector;

  beforeEach(() => {
    target = document.createElement("div");
    document.body.appendChild(target);
    onDirection = vi.fn();
    detector = new SwipeDetector({ onDirection, target });
  });

  afterEach(() => detector.destroy());

  it("fires once during touchmove when threshold is crossed", () => {
    target.dispatchEvent(touchEvent("touchstart", { x: 0, y: 0 }));
    target.dispatchEvent(
      touchEvent("touchmove", { x: SWIPE_THRESHOLD + 5, y: 0 }),
    );
    expect(onDirection).toHaveBeenCalledTimes(1);
    expect(onDirection).toHaveBeenCalledWith("right");
  });

  it("does not fire below threshold", () => {
    target.dispatchEvent(touchEvent("touchstart", { x: 0, y: 0 }));
    target.dispatchEvent(
      touchEvent("touchmove", { x: SWIPE_THRESHOLD - 1, y: 0 }),
    );
    expect(onDirection).not.toHaveBeenCalled();
  });

  it("emits one direction per gesture", () => {
    target.dispatchEvent(touchEvent("touchstart", { x: 0, y: 0 }));
    target.dispatchEvent(
      touchEvent("touchmove", { x: SWIPE_THRESHOLD + 5, y: 0 }),
    );
    target.dispatchEvent(
      touchEvent("touchmove", { x: SWIPE_THRESHOLD + 50, y: 0 }),
    );
    target.dispatchEvent(
      touchEvent("touchmove", { x: 0, y: SWIPE_THRESHOLD + 5 }),
    );
    expect(onDirection).toHaveBeenCalledTimes(1);
  });

  it("falls back to touchend when move was throttled", () => {
    target.dispatchEvent(touchEvent("touchstart", { x: 0, y: 0 }));
    target.dispatchEvent(
      touchEvent("touchend", { x: 0, y: SWIPE_THRESHOLD + 10 }),
    );
    expect(onDirection).toHaveBeenCalledTimes(1);
    expect(onDirection).toHaveBeenCalledWith("down");
  });

  it("rejects multi-touch gestures", () => {
    const e = new Event("touchstart", { bubbles: true, cancelable: true });
    Object.defineProperty(e, "touches", {
      get: () => [
        { identifier: 1, clientX: 0, clientY: 0 },
        { identifier: 2, clientX: 50, clientY: 0 },
      ],
    });
    Object.defineProperty(e, "changedTouches", { get: () => [] });
    Object.defineProperty(e, "target", { get: () => target });
    target.dispatchEvent(e);
    target.dispatchEvent(touchEvent("touchmove", { x: 100, y: 0 }));
    expect(onDirection).not.toHaveBeenCalled();
  });

  it("shouldIgnore prevents firing on UI elements", () => {
    detector.destroy();
    const button = document.createElement("button");
    target.appendChild(button);
    detector = new SwipeDetector({
      onDirection,
      target,
      shouldIgnore: (t) => t?.tagName === "BUTTON",
    });
    target.dispatchEvent(
      touchEvent("touchstart", { x: 0, y: 0, target: button }),
    );
    target.dispatchEvent(
      touchEvent("touchmove", { x: SWIPE_THRESHOLD + 10, y: 0 }),
    );
    expect(onDirection).not.toHaveBeenCalled();
  });

  it("chooses the dominant axis", () => {
    target.dispatchEvent(touchEvent("touchstart", { x: 0, y: 0 }));
    target.dispatchEvent(
      touchEvent("touchmove", { x: 5, y: -(SWIPE_THRESHOLD + 5) }),
    );
    expect(onDirection).toHaveBeenCalledTimes(1);
    expect(onDirection).toHaveBeenCalledWith("up");
  });
});
