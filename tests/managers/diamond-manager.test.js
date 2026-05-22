import { describe, it, expect, vi, beforeEach } from "vitest";
import { diamondManager } from "../../src/managers/diamond-manager.js";
import { STORAGE_KEYS } from "../../src/configs/constants.js";

beforeEach(() => diamondManager._resetForTests());

describe("diamondManager", () => {
  it("starts at 0 when storage is empty", () => {
    expect(diamondManager.get()).toBe(0);
  });

  it("credits diamonds via add() and persists", () => {
    diamondManager.add(5);
    expect(diamondManager.get()).toBe(5);
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.DIAMONDS));
    expect(raw.diamonds).toBe(5);
  });

  it("ignores non-positive add()", () => {
    diamondManager.add(3);
    diamondManager.add(0);
    diamondManager.add(-2);
    diamondManager.add(NaN);
    expect(diamondManager.get()).toBe(3);
  });

  it("floors fractional amounts", () => {
    diamondManager.add(2.9);
    expect(diamondManager.get()).toBe(2);
  });

  it("spend() succeeds when balance is enough", () => {
    diamondManager.add(10);
    expect(diamondManager.spend(4)).toBe(true);
    expect(diamondManager.get()).toBe(6);
  });

  it("spend() refuses when balance is too low", () => {
    diamondManager.add(1);
    expect(diamondManager.spend(5)).toBe(false);
    expect(diamondManager.get()).toBe(1);
  });

  it("spend() refuses non-positive amounts", () => {
    diamondManager.add(5);
    expect(diamondManager.spend(0)).toBe(false);
    expect(diamondManager.spend(-1)).toBe(false);
  });

  it("emits change events on add and spend", () => {
    const fn = vi.fn();
    diamondManager.on("change", fn);
    diamondManager.add(2);
    expect(fn).toHaveBeenLastCalledWith(2);
    diamondManager.spend(1);
    expect(fn).toHaveBeenLastCalledWith(1);
  });

  it("reset() zeroes the balance", () => {
    diamondManager.add(7);
    diamondManager.reset();
    expect(diamondManager.get()).toBe(0);
  });
});
