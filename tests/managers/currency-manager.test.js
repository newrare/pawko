import { describe, it, expect, vi, beforeEach } from "vitest";
import { currencyManager } from "../../src/managers/currency-manager.js";
import { STORAGE_KEYS } from "../../src/configs/constants.js";

beforeEach(() => currencyManager._resetForTests());

describe("currencyManager", () => {
  it("starts at 0 when storage is empty", () => {
    expect(currencyManager.get()).toBe(0);
  });

  it("credits coins via add() and persists", () => {
    currencyManager.add(25);
    expect(currencyManager.get()).toBe(25);
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENCY));
    expect(raw.coins).toBe(25);
  });

  it("ignores non-positive add()", () => {
    currencyManager.add(10);
    currencyManager.add(0);
    currencyManager.add(-5);
    currencyManager.add(NaN);
    expect(currencyManager.get()).toBe(10);
  });

  it("floors fractional amounts", () => {
    currencyManager.add(7.9);
    expect(currencyManager.get()).toBe(7);
  });

  it("spend() succeeds when balance is enough", () => {
    currencyManager.add(100);
    expect(currencyManager.spend(40)).toBe(true);
    expect(currencyManager.get()).toBe(60);
  });

  it("spend() refuses when balance is too low", () => {
    currencyManager.add(10);
    expect(currencyManager.spend(50)).toBe(false);
    expect(currencyManager.get()).toBe(10);
  });

  it("spend() refuses non-positive amounts", () => {
    currencyManager.add(50);
    expect(currencyManager.spend(0)).toBe(false);
    expect(currencyManager.spend(-1)).toBe(false);
  });

  it("emits change events on add and spend", () => {
    const fn = vi.fn();
    currencyManager.on("change", fn);
    currencyManager.add(20);
    expect(fn).toHaveBeenLastCalledWith(20);
    currencyManager.spend(5);
    expect(fn).toHaveBeenLastCalledWith(15);
  });

  it("reset() zeroes the balance", () => {
    currencyManager.add(99);
    currencyManager.reset();
    expect(currencyManager.get()).toBe(0);
  });
});
