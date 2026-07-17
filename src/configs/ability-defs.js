/**
 * Ability definitions — pure data.
 *
 * Abilities are persistent unlocks paid in **diamonds**. Each ability
 * belongs to a category and a level (1..N). Buying an ability unlocks
 * one or more bonus IDs in the shop. See `docs/ABILITY.md`.
 *
 * Diamond costs scale as 2^(level-1): L1=1, L2=2, L3=4, L4=8, L5=16, L6=32.
 */

export const ABILITY_CATEGORIES = /** @type {const} */ ({
  SHOP: "shop",
  ECONOMY: "economy",
  PEG: "peg",
  GATE: "gate",
  PLAYER: "player",
  MAP: "map",
});

/**
 * @typedef {object} AbilityDef
 * @property {string} id
 * @property {string} category   — one of ABILITY_CATEGORIES
 * @property {number} level      — 1-based level inside its category
 * @property {number} cost       — diamonds to unlock
 * @property {string[]} unlocks  — bonus IDs gated by this ability
 */

const diamondCost = (level) => Math.pow(2, Math.max(0, level - 1));

const ability = (id, category, level, unlocks) => ({
  id,
  category,
  level,
  cost: diamondCost(level),
  unlocks,
});

/** @type {AbilityDef[]} */
export const ABILITY_DEFS = [
  /* SHOP — discount tiers on shop prices. */
  ability("shop_1", ABILITY_CATEGORIES.SHOP, 1, ["perm_shop_discount_1"]),
  ability("shop_2", ABILITY_CATEGORIES.SHOP, 2, ["perm_shop_discount_2"]),
  ability("shop_3", ABILITY_CATEGORIES.SHOP, 3, ["perm_shop_discount_3"]),
  ability("shop_4", ABILITY_CATEGORIES.SHOP, 4, ["perm_shop_discount_4"]),
  ability("shop_5", ABILITY_CATEGORIES.SHOP, 5, ["perm_shop_discount_5"]),
  ability("shop_6", ABILITY_CATEGORIES.SHOP, 6, ["perm_shop_discount_6"]),

  /* ECONOMY — discount tiers on peg replacement. */
  ability("economy_1", ABILITY_CATEGORIES.ECONOMY, 1, ["perm_peg_discount_1"]),
  ability("economy_2", ABILITY_CATEGORIES.ECONOMY, 2, ["perm_peg_discount_2"]),
  ability("economy_3", ABILITY_CATEGORIES.ECONOMY, 3, ["perm_peg_discount_3"]),
  ability("economy_4", ABILITY_CATEGORIES.ECONOMY, 4, ["perm_peg_discount_4"]),
  ability("economy_5", ABILITY_CATEGORIES.ECONOMY, 5, ["perm_peg_discount_5"]),
  ability("economy_6", ABILITY_CATEGORIES.ECONOMY, 6, ["perm_peg_discount_6"]),

  /* PEG — special peg permanent boosts. */
  ability("peg_1", ABILITY_CATEGORIES.PEG, 1, ["perm_bomb_radius_xl"]),
  ability("peg_2", ABILITY_CATEGORIES.PEG, 2, [
    "perm_fire_duration_1",
    "perm_fire_duration_2",
    "perm_fire_duration_3",
  ]),
  ability("peg_3", ABILITY_CATEGORIES.PEG, 3, [
    "perm_ice_duration_1",
    "perm_ice_duration_2",
    "perm_ice_duration_3",
  ]),
  ability("peg_4", ABILITY_CATEGORIES.PEG, 4, [
    "perm_electrical_duration_1",
    "perm_electrical_duration_2",
    "perm_electrical_duration_3",
  ]),
  ability("peg_5", ABILITY_CATEGORIES.PEG, 5, [
    "perm_glue_hp_1",
    "perm_glue_hp_2",
    "perm_glue_hp_3",
  ]),

  /* GATE — coins ×2, then width reductions for back & hp gates. */
  ability("gate_1", ABILITY_CATEGORIES.GATE, 1, ["perm_destroy_coins_x2"]),
  ability("gate_2", ABILITY_CATEGORIES.GATE, 2, ["perm_gate_back_width_1"]),
  ability("gate_3", ABILITY_CATEGORIES.GATE, 3, ["perm_gate_back_width_2"]),
  ability("gate_4", ABILITY_CATEGORIES.GATE, 4, ["perm_gate_hp_width_1"]),
  ability("gate_5", ABILITY_CATEGORIES.GATE, 5, ["perm_gate_hp_width_2"]),

  /* PLAYER — tower-defense HP tiers. */
  ability("player_1", ABILITY_CATEGORIES.PLAYER, 1, ["perm_extra_hp_1"]),
  ability("player_2", ABILITY_CATEGORIES.PLAYER, 2, ["perm_extra_hp_2"]),
  ability("player_3", ABILITY_CATEGORIES.PLAYER, 3, ["perm_extra_hp_3"]),
  ability("player_4", ABILITY_CATEGORIES.PLAYER, 4, ["perm_extra_hp_4"]),

  /* MAP — grid reveal tiers. */
  ability("map_1", ABILITY_CATEGORIES.MAP, 1, ["perm_reveal_mystery"]),
  ability("map_2", ABILITY_CATEGORIES.MAP, 2, ["perm_reveal_shops"]),
  ability("map_3", ABILITY_CATEGORIES.MAP, 3, ["perm_reveal_paths"]),
  ability("map_4", ABILITY_CATEGORIES.MAP, 4, ["perm_reveal_boss"]),
];

/**
 * @param {string} id
 * @returns {AbilityDef | null}
 */
export function findAbility(id) {
  return ABILITY_DEFS.find((a) => a.id === id) ?? null;
}

/**
 * Returns the ability that gates the given bonus ID, or null when the
 * bonus is ungated.
 * @param {string} bonusId
 * @returns {AbilityDef | null}
 */
export function abilityForBonus(bonusId) {
  return ABILITY_DEFS.find((a) => a.unlocks.includes(bonusId)) ?? null;
}
