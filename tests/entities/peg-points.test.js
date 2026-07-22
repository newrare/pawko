import { describe, it, expect } from "vitest";
import { createPeg, PEG_TYPES } from "../../src/entities/peg-factory.js";
import { PEG_POINTS } from "../../src/configs/constants.js";

/**
 * The hit-score value each peg type awards on contact. Mirrors the game
 * spec: classic 10, reward pegs 0, elemental/teleport/shield 20, bumper 30,
 * glue 200, bomb 1000 (banked per explosion).
 */
const EXPECTED = {
  [PEG_TYPES.CLASSIC]: 10,
  [PEG_TYPES.COIN]: 0,
  [PEG_TYPES.DIAMOND]: 0,
  [PEG_TYPES.MYSTERY]: 0,
  [PEG_TYPES.CHEST]: 0,
  [PEG_TYPES.FIRE]: 20,
  [PEG_TYPES.ICE]: 20,
  [PEG_TYPES.GLUE]: 200,
  [PEG_TYPES.ELECTRICAL]: 20,
  [PEG_TYPES.TELEPORT]: 20,
  [PEG_TYPES.SHIELD]: 20,
  [PEG_TYPES.BUMPER]: 30,
  [PEG_TYPES.BOMB]: 1000,
};

describe("peg.points", () => {
  for (const [type, expected] of Object.entries(EXPECTED)) {
    it(`${type} peg awards ${expected} points`, () => {
      const peg = createPeg(type, { x: 0, y: 0, slot: 0 });
      expect(peg.points).toBe(expected);
    });
  }

  it("reads directly from the PEG_POINTS table", () => {
    for (const [type, expected] of Object.entries(EXPECTED)) {
      expect(PEG_POINTS[type]).toBe(expected);
    }
  });

  it("defaults to 0 for an unknown type", () => {
    const peg = createPeg(PEG_TYPES.CLASSIC, {});
    peg.type = "totally-unknown";
    expect(peg.points).toBe(0);
  });
});
