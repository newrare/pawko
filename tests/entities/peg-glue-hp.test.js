import { describe, it, expect, beforeEach } from "vitest";
import { createPeg, PEG_TYPES } from "../../src/entities/peg-factory.js";
import { bonusManager } from "../../src/managers/bonus-manager.js";
import { PEG_DEFS } from "../../src/configs/constants.js";

beforeEach(() => bonusManager._resetForTests());

/**
 * The glue-HP *upgrade* (perm_glue_hp_*) was retired together with the PEG
 * ability category. The glue peg still resolves GLUE_PEG_HP_BONUS, so it
 * transparently picks up any future provider — with none active it falls
 * back to the PEG_DEFS base HP, which is what these tests pin down.
 */
describe("GluePeg HP — base (no upgrade provider)", () => {
  it("uses the PEG_DEFS base hp when no bonus is active", () => {
    const peg = createPeg(PEG_TYPES.GLUE, { x: 0, y: 0 });
    expect(peg.maxHp).toBe(PEG_DEFS.glue.hp);
    expect(peg.hp).toBe(PEG_DEFS.glue.hp);
  });

  it("classic pegs keep their own base hp", () => {
    const peg = createPeg(PEG_TYPES.CLASSIC, { x: 0, y: 0 });
    expect(peg.maxHp).toBe(PEG_DEFS.peg.hp);
  });
});
