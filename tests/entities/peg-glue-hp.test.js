import { describe, it, expect, beforeEach } from "vitest";
import { createPeg, PEG_TYPES } from "../../src/entities/peg-factory.js";
import { bonusManager } from "../../src/managers/bonus-manager.js";
import { PEG_DEFS } from "../../src/configs/constants.js";

beforeEach(() => bonusManager._resetForTests());

describe("GluePeg HP — permanent bonus", () => {
  it("uses the PEG_DEFS base hp when no bonus is active", () => {
    const peg = createPeg(PEG_TYPES.GLUE, { x: 0, y: 0 });
    expect(peg.maxHp).toBe(PEG_DEFS.glue.hp);
    expect(peg.hp).toBe(PEG_DEFS.glue.hp);
  });

  it("adds +5 with perm_glue_hp_1", () => {
    bonusManager.unlockPermanent("perm_glue_hp_1");
    const peg = createPeg(PEG_TYPES.GLUE, { x: 0, y: 0 });
    expect(peg.maxHp).toBe(PEG_DEFS.glue.hp + 5);
    expect(peg.hp).toBe(PEG_DEFS.glue.hp + 5);
  });

  it("adds +15 with perm_glue_hp_3", () => {
    bonusManager.unlockPermanent("perm_glue_hp_3");
    const peg = createPeg(PEG_TYPES.GLUE, { x: 0, y: 0 });
    expect(peg.maxHp).toBe(PEG_DEFS.glue.hp + 15);
  });

  it("stacks all three tiers (+5+10+15 = +30)", () => {
    bonusManager.unlockPermanent("perm_glue_hp_1");
    bonusManager.unlockPermanent("perm_glue_hp_2");
    bonusManager.unlockPermanent("perm_glue_hp_3");
    const peg = createPeg(PEG_TYPES.GLUE, { x: 0, y: 0 });
    expect(peg.maxHp).toBe(PEG_DEFS.glue.hp + 30);
  });

  it("does not affect non-glue pegs", () => {
    bonusManager.unlockPermanent("perm_glue_hp_3");
    const peg = createPeg(PEG_TYPES.CLASSIC, { x: 0, y: 0 });
    expect(peg.maxHp).toBe(PEG_DEFS.peg.hp);
  });
});
