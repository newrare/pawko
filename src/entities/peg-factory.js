import { Peg } from "./peg-classic.js";
import { Bumper } from "./peg-bumper.js";
import { CoinPeg } from "./peg-coin.js";
import { DiamondPeg } from "./peg-diamond.js";
import { GluePeg } from "./peg-glue.js";
import { TeleportPeg } from "./peg-teleport.js";
import { ChestPeg } from "./peg-chest.js";
import { ShieldPeg } from "./peg-shield.js";
import { MysteryPeg } from "./peg-mystery.js";
import { FirePeg } from "./peg-fire.js";
import { IcePeg } from "./peg-ice.js";
import { ElectricalPeg } from "./peg-electrical.js";
import { BombPeg } from "./peg-bomb.js";
import { bonusManager } from "../managers/bonus-manager.js";
import { PARAM_KEYS } from "../configs/bonus-defs.js";

/**
 * Peg kinds — string ids used to identify a variant in saves, admin
 * spawns, and game logic. The hierarchy lives in the sibling
 * `peg-*.js` files; this file is the registry that ties strings to
 * concrete classes.
 */
export const PEG_TYPES = /** @type {const} */ ({
  CLASSIC: "peg",
  BUMPER: "bumper",
  COIN: "coin",
  DIAMOND: "diamond",
  GLUE: "glue",
  TELEPORT: "teleport",
  CHEST: "chest",
  SHIELD: "shield",
  MYSTERY: "mystery",
  FIRE: "fire",
  ICE: "ice",
  ELECTRICAL: "electrical",
  BOMB: "bomb",
});

/** Map a `PEG_TYPES` value to its concrete class. */
const PEG_REGISTRY = {
  [PEG_TYPES.CLASSIC]: Peg,
  [PEG_TYPES.BUMPER]: Bumper,
  [PEG_TYPES.COIN]: CoinPeg,
  [PEG_TYPES.DIAMOND]: DiamondPeg,
  [PEG_TYPES.GLUE]: GluePeg,
  [PEG_TYPES.TELEPORT]: TeleportPeg,
  [PEG_TYPES.CHEST]: ChestPeg,
  [PEG_TYPES.SHIELD]: ShieldPeg,
  [PEG_TYPES.MYSTERY]: MysteryPeg,
  [PEG_TYPES.FIRE]: FirePeg,
  [PEG_TYPES.ICE]: IcePeg,
  [PEG_TYPES.ELECTRICAL]: ElectricalPeg,
  [PEG_TYPES.BOMB]: BombPeg,
};

/**
 * Create a peg instance by type string.
 * @param {string} type — one of PEG_TYPES values
 * @param {object} [opts] — position and extra options
 * @returns {Peg}
 */
export function createPeg(type, opts = {}) {
  const Ctor = PEG_REGISTRY[type] || Peg;
  if (type === PEG_TYPES.GLUE) {
    const hpBonus = bonusManager.resolve(PARAM_KEYS.GLUE_PEG_HP_BONUS, 0);
    return new Ctor({ ...opts, hpBonus });
  }
  return new Ctor(opts);
}

export { PEG_REGISTRY };
