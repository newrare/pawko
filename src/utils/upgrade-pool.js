import { pegShopManager } from "../managers/peg-shop-manager.js";
import { DEFAULT_UPGRADE_TYPES } from "../configs/slot-machine-defs.js";

/**
 * Resolve the peg-upgrade types currently available to the slot machine: the
 * three defaults (`fire`, `coin`, `bumper`) plus every peg type the player has
 * bought in the boutique **this run** (tracked by `pegShopManager`).
 *
 * Defaults come first; each type appears once.
 * @returns {string[]}
 */
export function getUnlockedUpgradeTypes() {
  const types = new Set(DEFAULT_UPGRADE_TYPES);
  for (const type of pegShopManager.getAcquired()) types.add(type);
  return [...types];
}
