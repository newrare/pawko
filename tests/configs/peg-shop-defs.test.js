import { describe, it, expect } from "vitest";
import {
  PEG_SHOP_DEFS,
  findPegShopItem,
} from "../../src/configs/peg-shop-defs.js";
import { PEG_TYPES } from "../../src/entities/peg-factory.js";
import {
  DEFAULT_UPGRADE_TYPES,
  UPGRADE_TYPE_CATALOG,
  iconNameForUpgrade,
} from "../../src/configs/slot-machine-defs.js";

describe("peg-shop-defs", () => {
  const validTypes = new Set(Object.values(PEG_TYPES));

  it("every item is a valid PEG_TYPES value", () => {
    for (const d of PEG_SHOP_DEFS) {
      expect(validTypes.has(d.type), `unknown peg type ${d.type}`).toBe(true);
    }
  });

  it("prices are within the 100..1000 band", () => {
    for (const d of PEG_SHOP_DEFS) {
      expect(d.cost).toBeGreaterThanOrEqual(100);
      expect(d.cost).toBeLessThanOrEqual(1000);
    }
  });

  it("never sells a default upgrade type (fire/coin/bumper)", () => {
    for (const d of PEG_SHOP_DEFS) {
      expect(DEFAULT_UPGRADE_TYPES).not.toContain(d.type);
    }
  });

  it("icons come from the slot-machine catalogue", () => {
    for (const d of PEG_SHOP_DEFS) {
      expect(d.icon).toBe(iconNameForUpgrade(d.type));
      expect(UPGRADE_TYPE_CATALOG.find((e) => e.type === d.type)).toBeTruthy();
    }
  });

  it("no duplicate types", () => {
    const types = PEG_SHOP_DEFS.map((d) => d.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it("findPegShopItem() returns the def by type", () => {
    expect(findPegShopItem(PEG_SHOP_DEFS[0].type)?.type).toBe(
      PEG_SHOP_DEFS[0].type,
    );
    expect(findPegShopItem("nope")).toBeNull();
  });
});
