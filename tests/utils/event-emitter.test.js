import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "../../src/utils/event-emitter.js";

describe("EventEmitter", () => {
  it("invokes registered listeners with emitted args", () => {
    const ee = new EventEmitter();
    const fn = vi.fn();
    ee.on("hit", fn);
    ee.emit("hit", 1, "two");
    expect(fn).toHaveBeenCalledWith(1, "two");
  });

  it("returns an unsubscribe function from on()", () => {
    const ee = new EventEmitter();
    const fn = vi.fn();
    const off = ee.on("hit", fn);
    off();
    ee.emit("hit");
    expect(fn).not.toHaveBeenCalled();
  });

  it("once() fires exactly one time", () => {
    const ee = new EventEmitter();
    const fn = vi.fn();
    ee.once("hit", fn);
    ee.emit("hit");
    ee.emit("hit");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("off() with no callback removes every listener for the event", () => {
    const ee = new EventEmitter();
    const a = vi.fn();
    const b = vi.fn();
    ee.on("hit", a);
    ee.on("hit", b);
    ee.off("hit");
    ee.emit("hit");
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it("emit copies the listener set so unsubscribing during emit is safe", () => {
    const ee = new EventEmitter();
    const a = vi.fn(() => ee.off("hit", a));
    const b = vi.fn();
    ee.on("hit", a);
    ee.on("hit", b);
    ee.emit("hit");
    expect(b).toHaveBeenCalledTimes(1);
  });
});
