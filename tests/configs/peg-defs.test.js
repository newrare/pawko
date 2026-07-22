import { describe, it, expect } from "vitest";
import {
  PEG_DEFS,
  PEG_POINTS,
  EFFECT_HIT_SCORE,
} from "../../src/configs/constants.js";

describe("PEG_DEFS HP tuning", () => {
  it("glue is fragile (2 HP)", () => {
    expect(PEG_DEFS.glue.hp).toBe(2);
  });
  it("chest takes 3 hits", () => {
    expect(PEG_DEFS.chest.hp).toBe(3);
  });
  it("mystery takes 5 hits", () => {
    expect(PEG_DEFS.mystery.hp).toBe(5);
  });
});

describe("PEG_POINTS tuning", () => {
  it("glue awards 200 points per hit", () => {
    expect(PEG_POINTS.glue).toBe(200);
  });
  it("bomb awards 1000 points per explosion", () => {
    expect(PEG_POINTS.bomb).toBe(1000);
  });
});

describe("EFFECT_HIT_SCORE mapping", () => {
  it("fire (burning) adds +5", () => {
    expect(EFFECT_HIT_SCORE.burning).toEqual({ add: 5 });
  });
  it("ice (frozen) adds +10", () => {
    expect(EFFECT_HIT_SCORE.frozen).toEqual({ add: 10 });
  });
  it("electrical (electrified) multiplies by 2", () => {
    expect(EFFECT_HIT_SCORE.electrified).toEqual({ mult: 2 });
  });
});
