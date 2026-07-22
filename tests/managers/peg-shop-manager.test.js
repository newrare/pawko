import { describe, it, expect, vi, beforeEach } from "vitest";
import { pegShopManager } from "../../src/managers/peg-shop-manager.js";
import { PEG_SHOP_DEFS } from "../../src/configs/peg-shop-defs.js";

beforeEach(() => pegShopManager._resetForTests());

describe("pegShopManager", () => {
  const someType = PEG_SHOP_DEFS[0].type;

  it("starts empty", () => {
    expect(pegShopManager.getAcquired()).toEqual([]);
  });

  it("acquire() stores a known type and is idempotent", () => {
    expect(pegShopManager.acquire(someType)).toBe(true);
    expect(pegShopManager.acquire(someType)).toBe(false);
    expect(pegShopManager.isAcquired(someType)).toBe(true);
  });

  it("rejects unknown peg types", () => {
    expect(pegShopManager.acquire("not_a_peg")).toBe(false);
    expect(pegShopManager.getAcquired()).toEqual([]);
  });

  it("emits change on acquire", () => {
    const fn = vi.fn();
    pegShopManager.on("change", fn);
    pegShopManager.acquire(someType);
    expect(fn).toHaveBeenCalled();
  });

  it("reset() wipes run-scoped acquisitions", () => {
    pegShopManager.acquire(someType);
    pegShopManager.reset();
    expect(pegShopManager.getAcquired()).toEqual([]);
    expect(pegShopManager.isAcquired(someType)).toBe(false);
  });

  it("does not persist across a fresh module import (transient)", async () => {
    pegShopManager.acquire(someType);
    const mod = await import("../../src/managers/peg-shop-manager.js?freshpeg");
    expect(mod.pegShopManager.getAcquired()).toEqual([]);
  });
});
