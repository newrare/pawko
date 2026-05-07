/**
 * Ability definitions — pure data.
 *
 * Abilities are persistent unlocks that gate which bonuses appear in the
 * shop. See `docs/ABILITY.md` for the full design.
 */

/**
 * @typedef {object} AbilityDef
 * @property {string} id
 * @property {number} cost          — coins to unlock
 * @property {string[]} unlocks     — bonus IDs gated by this ability
 */

/** @type {AbilityDef[]} */
export const ABILITY_DEFS = [
  { id: "start_ball_up", cost: 80, unlocks: ["extra_start_ball"] },
  { id: "magnet", cost: 150, unlocks: ["shop_magnet"] },
  { id: "extra_launch", cost: 70, unlocks: ["bonus_launcher"] },
  { id: "score_boost", cost: 60, unlocks: ["score_x2"] },
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
