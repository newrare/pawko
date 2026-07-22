/**
 * Shop (coins) — pure data.
 *
 * The shop sells **peg types** that get added to the slot-machine pool
 * **for the current run only**. Buying a peg type is scoped to the active run
 * (tracked by `pegShopManager`, transient) and the item disappears from the
 * offer once acquired. Prices range from 100 to 1000 coins by power.
 *
 * The three default upgrade types (`fire`, `coin`, `bumper`) are always in the
 * pool and are therefore never sold in the shop. Icons come from
 * `slot-machine-defs.js` (single source of truth). Types are kept in sync with
 * `UPGRADE_TYPE_CATALOG` (verified by test).
 *
 * See `docs/SHOP.md`.
 */

import { PEG_TYPES } from "../entities/peg-factory.js";
import { iconNameForUpgrade } from "./slot-machine-defs.js";
import { RARITY } from "./constants.js";

/**
 * @typedef {object} PegShopDef
 * @property {string} type — a PEG_TYPES value (also the def id)
 * @property {number} cost — coins, 100..1000
 * @property {string} icon — Lucide icon name (rendered via utils/icon.js)
 * @property {string} rarity — a RARITY value, derived from the price
 */

/**
 * Rarity tier of a boutique item, derived from its coin price. This is the
 * single source of a peg's intrinsic rarity — reused by the shop card styling
 * and by the slot-machine reel roll (`slot-machine-defs.js#rarityForUpgrade`).
 * @param {number} cost
 * @returns {string} a RARITY value
 */
export function rarityForCost(cost) {
  if (cost >= 800) return RARITY.LEGENDARY;
  if (cost >= 500) return RARITY.EPIC;
  if (cost >= 300) return RARITY.RARE;
  return RARITY.COMMON;
}

/** @param {string} type @param {number} cost @returns {PegShopDef} */
const item = (type, cost) => ({
  type,
  cost,
  icon: iconNameForUpgrade(type),
  rarity: rarityForCost(cost),
});

/**
 * Ordered boutique catalogue. Prices climb with the peg's power.
 * @type {PegShopDef[]}
 */
export const PEG_SHOP_DEFS = [
  item(PEG_TYPES.ICE, 100),
  item(PEG_TYPES.GLUE, 200),
  item(PEG_TYPES.ELECTRICAL, 300),
  item(PEG_TYPES.TELEPORT, 400),
  item(PEG_TYPES.CHEST, 500),
  item(PEG_TYPES.MYSTERY, 600),
  item(PEG_TYPES.SHIELD, 700),
  item(PEG_TYPES.DIAMOND, 800),
  item(PEG_TYPES.BOMB, 1000),
];

/**
 * @param {string} type
 * @returns {PegShopDef | null}
 */
export function findPegShopItem(type) {
  return PEG_SHOP_DEFS.find((d) => d.type === type) ?? null;
}
