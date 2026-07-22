/**
 * Slot-machine upgrade catalogue — pure data.
 *
 * The pinboard slot machine rolls **peg upgrades**: special peg types the
 * player can drag onto a classic peg to evolve it. Three types are unlocked
 * by default (`fire`, `coin`, `bumper`); every other type is added to the
 * live pool **for the current run** by buying it in the boutique (see
 * `peg-shop-defs.js`). The live pool is resolved by
 * `getUnlockedUpgradeTypes()` in `utils/upgrade-pool.js`.
 *
 * This module is the single source of truth for the upgradeable type list
 * and each type's display icon. Coin prices live in `peg-shop-defs.js`.
 *
 * See `docs/SLOT-MACHINE.md`.
 */

import { PEG_TYPES } from "../entities/peg-factory.js";
import { iconSvg } from "../utils/icon.js";
import { RARITY } from "./constants.js";

/** Upgrade types available from the very first level, no purchase needed. */
export const DEFAULT_UPGRADE_TYPES = [
  PEG_TYPES.FIRE,
  PEG_TYPES.COIN,
  PEG_TYPES.BUMPER,
];

/**
 * @typedef {object} UpgradeTypeDef
 * @property {string} type — a PEG_TYPES value
 * @property {string} icon — Lucide icon name shown on the reel
 * @property {string} rarity — a RARITY value; the reel roll is weighted by it
 */

/**
 * Ordered catalogue of every peg type the slot machine can roll: the three
 * defaults first, then every type the boutique can add to the run pool.
 *
 * Each entry's `rarity` mirrors the boutique price tier
 * (`peg-shop-defs.js#rarityForCost`) — the three defaults (never sold) are
 * `common`. A test asserts this stays in sync with the shop prices.
 * @type {UpgradeTypeDef[]}
 */
export const UPGRADE_TYPE_CATALOG = [
  { type: PEG_TYPES.FIRE, icon: "flame", rarity: RARITY.COMMON },
  { type: PEG_TYPES.COIN, icon: "coins", rarity: RARITY.COMMON },
  { type: PEG_TYPES.BUMPER, icon: "circle-dot", rarity: RARITY.COMMON },
  { type: PEG_TYPES.ICE, icon: "snowflake", rarity: RARITY.COMMON },
  { type: PEG_TYPES.GLUE, icon: "droplet", rarity: RARITY.COMMON },
  { type: PEG_TYPES.ELECTRICAL, icon: "zap", rarity: RARITY.RARE },
  { type: PEG_TYPES.TELEPORT, icon: "tornado", rarity: RARITY.RARE },
  { type: PEG_TYPES.CHEST, icon: "package", rarity: RARITY.EPIC },
  { type: PEG_TYPES.MYSTERY, icon: "circle-help", rarity: RARITY.EPIC },
  { type: PEG_TYPES.SHIELD, icon: "shield", rarity: RARITY.EPIC },
  { type: PEG_TYPES.DIAMOND, icon: "gem", rarity: RARITY.LEGENDARY },
  { type: PEG_TYPES.BOMB, icon: "bomb", rarity: RARITY.LEGENDARY },
];

const ICON_BY_TYPE = Object.fromEntries(
  UPGRADE_TYPE_CATALOG.map((e) => [e.type, e.icon]),
);

const RARITY_BY_TYPE = Object.fromEntries(
  UPGRADE_TYPE_CATALOG.map((e) => [e.type, e.rarity]),
);

/**
 * Lucide icon name for an upgrade type, with a slot-machine fallback.
 * @param {string} type
 * @returns {string}
 */
export function iconNameForUpgrade(type) {
  return ICON_BY_TYPE[type] ?? "dices";
}

/**
 * Intrinsic rarity of an upgrade type (defaults to `common`). Drives the
 * weighted reel roll and the per-reel rarity cheat used by rewards.
 * @param {string} type
 * @returns {string} a RARITY value
 */
export function rarityForUpgrade(type) {
  return RARITY_BY_TYPE[type] ?? RARITY.COMMON;
}

/**
 * Rendered inline-SVG icon (Lucide) for an upgrade type. Colour is inherited
 * from the host element — reels tint it via `--pk-slot-accent`.
 * @param {string} type
 * @param {Parameters<typeof iconSvg>[1]} [opts]
 * @returns {string}
 */
export function iconForUpgrade(type, opts) {
  return iconSvg(iconNameForUpgrade(type), opts);
}
