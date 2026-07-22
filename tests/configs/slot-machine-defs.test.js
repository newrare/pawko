import { describe, it, expect } from "vitest";
import {
  DEFAULT_UPGRADE_TYPES,
  UPGRADE_TYPE_CATALOG,
  iconForUpgrade,
  iconNameForUpgrade,
  rarityForUpgrade,
} from "../../src/configs/slot-machine-defs.js";
import { PEG_TYPES } from "../../src/entities/peg-factory.js";
import {
  PEG_SHOP_DEFS,
  rarityForCost,
} from "../../src/configs/peg-shop-defs.js";
import { RARITY } from "../../src/configs/constants.js";

describe("slot-machine-defs", () => {
  const validTypes = new Set(Object.values(PEG_TYPES));

  it("every catalogue type is a valid PEG_TYPES value with an icon", () => {
    for (const entry of UPGRADE_TYPE_CATALOG) {
      expect(validTypes.has(entry.type), `unknown peg type ${entry.type}`).toBe(
        true,
      );
      expect(typeof entry.icon).toBe("string");
      expect(entry.icon.length).toBeGreaterThan(0);
    }
  });

  it("defaults are the fire/coin/bumper trio and appear in the catalogue", () => {
    expect(DEFAULT_UPGRADE_TYPES).toEqual([
      PEG_TYPES.FIRE,
      PEG_TYPES.COIN,
      PEG_TYPES.BUMPER,
    ]);
    for (const type of DEFAULT_UPGRADE_TYPES) {
      expect(UPGRADE_TYPE_CATALOG.find((e) => e.type === type)).toBeTruthy();
    }
  });

  it("every boutique-sold peg type is present in the catalogue", () => {
    for (const def of PEG_SHOP_DEFS) {
      expect(
        UPGRADE_TYPE_CATALOG.find((e) => e.type === def.type),
        `boutique type ${def.type} missing from catalogue`,
      ).toBeTruthy();
    }
  });

  it("no duplicate types in the catalogue", () => {
    const types = UPGRADE_TYPE_CATALOG.map((e) => e.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it("iconNameForUpgrade returns the catalogue name or a fallback", () => {
    expect(iconNameForUpgrade(PEG_TYPES.FIRE)).toBe("flame");
    expect(iconNameForUpgrade("nope")).toBe("dices");
  });

  it("iconForUpgrade renders an inline Lucide SVG", () => {
    const svg = iconForUpgrade(PEG_TYPES.FIRE);
    expect(svg).toContain("<svg");
    expect(svg).toContain('class="pk-icon"');
  });

  it("every catalogue entry carries a valid rarity", () => {
    const valid = new Set(Object.values(RARITY));
    for (const entry of UPGRADE_TYPE_CATALOG) {
      expect(valid.has(entry.rarity), `${entry.type} bad rarity`).toBe(true);
    }
  });

  it("catalogue rarity matches the boutique price tier", () => {
    for (const def of PEG_SHOP_DEFS) {
      expect(rarityForUpgrade(def.type), `${def.type} rarity mismatch`).toBe(
        rarityForCost(def.cost),
      );
    }
  });

  it("the three defaults are common", () => {
    for (const type of DEFAULT_UPGRADE_TYPES) {
      expect(rarityForUpgrade(type)).toBe(RARITY.COMMON);
    }
  });

  it("rarityForUpgrade falls back to common for unknown types", () => {
    expect(rarityForUpgrade("nope")).toBe(RARITY.COMMON);
  });
});
