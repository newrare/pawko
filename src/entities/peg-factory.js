import { Peg } from "./peg-classic.js";
import { Bumper } from "./peg-bumper.js";
import { CoinPeg } from "./peg-coin.js";
import { DiamondPeg } from "./peg-diamond.js";
import { GluePeg } from "./peg-glue.js";
import { CatPeg } from "./peg-cat.js";
import { BossPeg } from "./peg-boss.js";
import { TeleportPeg } from "./peg-teleport.js";
import { ChestPeg } from "./peg-chest.js";
import { KeyPeg } from "./peg-key.js";
import { ChesterPeg } from "./peg-chester.js";
import { ShieldPeg } from "./peg-shield.js";
import { MysteryPeg } from "./peg-mystery.js";

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
  CAT: "cat",
  BOSS: "boss",
  TELEPORT: "teleport",
  CHEST: "chest",
  KEY: "key",
  CHESTER: "chester",
  SHIELD: "shield",
  MYSTERY: "mystery",
});

/** Map a `PEG_TYPES` value to its concrete class. */
const PEG_REGISTRY = {
  [PEG_TYPES.CLASSIC]: Peg,
  [PEG_TYPES.BUMPER]: Bumper,
  [PEG_TYPES.COIN]: CoinPeg,
  [PEG_TYPES.DIAMOND]: DiamondPeg,
  [PEG_TYPES.GLUE]: GluePeg,
  [PEG_TYPES.CAT]: CatPeg,
  [PEG_TYPES.BOSS]: BossPeg,
  [PEG_TYPES.TELEPORT]: TeleportPeg,
  [PEG_TYPES.CHEST]: ChestPeg,
  [PEG_TYPES.KEY]: KeyPeg,
  [PEG_TYPES.CHESTER]: ChesterPeg,
  [PEG_TYPES.SHIELD]: ShieldPeg,
  [PEG_TYPES.MYSTERY]: MysteryPeg,
};

/**
 * Create a peg instance by type string.
 * @param {string} type — one of PEG_TYPES values
 * @param {object} [opts] — position and extra options
 * @returns {Peg}
 */
export function createPeg(type, opts = {}) {
  const Ctor = PEG_REGISTRY[type] || Peg;
  return new Ctor(opts);
}

export { PEG_REGISTRY };
