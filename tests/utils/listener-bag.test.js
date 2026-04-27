import { describe, it, expect, vi } from "vitest";
import { ListenerBag } from "../../src/utils/listener-bag.js";

describe("ListenerBag", () => {
  it("removes DOM listeners on dispose", () => {
    const bag = new ListenerBag();
    const target = document.createElement("div");
    const fn = vi.fn();
    bag.on(target, "click", fn);

    target.dispatchEvent(new Event("click"));
    expect(fn).toHaveBeenCalledTimes(1);

    bag.dispose();
    target.dispatchEvent(new Event("click"));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("runs add() cleanups on dispose", () => {
    const bag = new ListenerBag();
    const cleanup = vi.fn();
    bag.add(cleanup);
    bag.dispose();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("cancels timeouts on dispose", () => {
    vi.useFakeTimers();
    try {
      const bag = new ListenerBag();
      const fn = vi.fn();
      bag.timeout(fn, 100);
      bag.dispose();
      vi.advanceTimersByTime(200);
      expect(fn).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("is idempotent", () => {
    const bag = new ListenerBag();
    const cleanup = vi.fn();
    bag.add(cleanup);
    bag.dispose();
    bag.dispose();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("immediately runs cleanups added after dispose", () => {
    const bag = new ListenerBag();
    bag.dispose();
    const cleanup = vi.fn();
    bag.add(cleanup);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
