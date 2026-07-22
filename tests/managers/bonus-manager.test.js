import { describe, it, expect, vi, beforeEach } from "vitest";
import { bonusManager } from "../../src/managers/bonus-manager.js";
import {
  PARAM_KEYS,
  DIRECTIVE_ACTIONS,
  TRIGGER_EVENTS,
  TRIGGER_ACTIONS,
  DURATION_UNITS,
  RANDOM_DURATIONS,
} from "../../src/configs/bonus-defs.js";

beforeEach(() => bonusManager._resetForTests());

/**
 * Deterministic RNG returning each value in `seq` in turn (then 0). Used to
 * pin the duration roll (first draw) and each `values` magnitude roll.
 * @param {number[]} seq
 */
const seqRng = (seq) => {
  let i = 0;
  return () => (i < seq.length ? seq[i++] : 0);
};

describe("bonusManager — session (rewards)", () => {
  it("activateSession() registers with full duration", () => {
    bonusManager.activateSession("reward_coins_x2");
    const active = bonusManager.getActiveSession();
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe("reward_coins_x2");
    expect(active[0].remaining).toBe(3);
  });

  it("rejects unknown ids on activateSession", () => {
    expect(bonusManager.activateSession("does_not_exist")).toBe(false);
  });

  it("stores Infinity for run-scoped rewards (durationLevels: null)", () => {
    bonusManager.activateSession("reward_coins_x3");
    expect(bonusManager.getActiveSession()[0].remaining).toBe(Infinity);
  });

  it("onLevelUp() decrements remaining", () => {
    bonusManager.activateSession("reward_coins_x2");
    bonusManager.onLevelUp();
    expect(bonusManager.getActiveSession()[0].remaining).toBe(2);
  });

  it("onLevelUp() does not decrement run-scoped rewards", () => {
    bonusManager.activateSession("reward_coins_x3");
    bonusManager.onLevelUp();
    bonusManager.onLevelUp();
    expect(bonusManager.getActiveSession()[0].remaining).toBe(Infinity);
  });

  it("expires when remaining hits zero and fires onExpire", () => {
    const onExpire = vi.fn();
    bonusManager.activateSession("reward_coins_x2");
    const def = bonusManager.getActiveSession()[0].def;
    def.onExpire = onExpire;

    bonusManager.onLevelUp();
    bonusManager.onLevelUp();
    bonusManager.onLevelUp();

    expect(bonusManager.getActiveSession()).toEqual([]);
    expect(onExpire).toHaveBeenCalledTimes(1);
    def.onExpire = null;
  });

  it("clearSession() drops every active entry and pending directives", () => {
    bonusManager.activateSession("reward_coins_x2");
    bonusManager.activateSession("reward_extra_ball");
    bonusManager.clearSession();
    expect(bonusManager.getActiveSession()).toEqual([]);
    expect(bonusManager.consumeDirectives()).toEqual([]);
  });
});

describe("bonusManager — queued rewards", () => {
  it("queueSessionNext() activates on consumeQueuedSessions()", () => {
    bonusManager.queueSessionNext("reward_coins_x2");
    expect(bonusManager.getActiveSession()).toEqual([]);
    bonusManager.consumeQueuedSessions();
    expect(bonusManager.isSessionActive("reward_coins_x2")).toBe(true);
  });
});

describe("bonusManager — maluses", () => {
  it("activateMalus() registers a MALUS-category def", () => {
    expect(bonusManager.activateMalus("malus_slot_common")).toBe(true);
    expect(bonusManager.isSessionActive("malus_slot_common")).toBe(true);
  });

  it("activateMalus() rejects bonus ids", () => {
    expect(bonusManager.activateMalus("reward_coins_x2")).toBe(false);
  });

  it("getAllBonuses() / getAllMaluses() expose their catalogues", () => {
    expect(bonusManager.getAllBonuses().map((b) => b.id)).toContain(
      "reward_coins_x2",
    );
    expect(bonusManager.getAllMaluses().map((b) => b.id)).toContain(
      "malus_slot_common",
    );
  });

  it("malus modifiers participate in resolve()", () => {
    bonusManager.activateMalus("malus_slot_common");
    expect(bonusManager.resolve(PARAM_KEYS.SLOT_FORCE_COMMON, false)).toBe(
      true,
    );
  });
});

describe("bonusManager — directives", () => {
  it("activateSession() queues directives", () => {
    bonusManager.activateSession("reward_extra_ball");
    const d = bonusManager.consumeDirectives();
    expect(d).toHaveLength(1);
    expect(d[0].action).toBe(DIRECTIVE_ACTIONS.ADD_BALL);
    expect(d[0].payload.kind).toBe("classic");
  });

  it("consumeDirectives() drains and clears the queue", () => {
    bonusManager.activateSession("reward_extra_ball");
    bonusManager.consumeDirectives();
    expect(bonusManager.consumeDirectives()).toEqual([]);
  });
});

describe("bonusManager — triggers", () => {
  it("returns active triggers matching an event", () => {
    bonusManager.activateSession("reward_peg_destroy_50");
    const triggers = bonusManager.getActiveTriggers(
      TRIGGER_EVENTS.PEG_DESTROYED,
    );
    expect(triggers).toHaveLength(1);
    expect(triggers[0].trigger.action).toBe(TRIGGER_ACTIONS.ADD_HIT_SCORE);
    expect(triggers[0].trigger.payload.points).toBe(50);
  });

  it("returns nothing for an event no active reward listens to", () => {
    bonusManager.activateSession("reward_peg_destroy_50");
    expect(bonusManager.getActiveTriggers(TRIGGER_EVENTS.PEG_SAVED)).toEqual(
      [],
    );
  });

  it("returns nothing when the reward is not active", () => {
    expect(
      bonusManager.getActiveTriggers(TRIGGER_EVENTS.PEG_DESTROYED),
    ).toEqual([]);
  });
});

describe("bonusManager — resolve()", () => {
  it("returns the base value when no reward is active", () => {
    expect(bonusManager.resolve(PARAM_KEYS.SCORE_TOTAL_MULTIPLIER, 1)).toBe(1);
  });

  it("applies a multiplicative reward", () => {
    bonusManager.activateSession("reward_coins_x2");
    expect(bonusManager.resolve(PARAM_KEYS.DESTROY_COIN_MULTIPLIER, 1)).toBe(2);
  });

  it("applies a 'set' malus (set wins over numeric ops)", () => {
    bonusManager.activateMalus("malus_obfuscate_level_number");
    expect(bonusManager.resolve(PARAM_KEYS.REVEAL_LEVEL_NUMBER, true)).toBe(
      false,
    );
  });

  it("stacks a bonus and a malus on the same key multiplicatively", () => {
    /* Score ×2 bonus + score penalty malus (rng pins the ×0.9 magnitude). */
    bonusManager.activateSession("reward_score_total_x2");
    bonusManager.activateSession("malus_score_penalty", {
      rng: seqRng([0, 0]),
    });
    expect(
      bonusManager.resolve(PARAM_KEYS.SCORE_TOTAL_MULTIPLIER, 1),
    ).toBeCloseTo(1.8);
  });

  it("score-total multiplier resolves for the reward", () => {
    bonusManager.activateSession("reward_score_total_x2");
    expect(bonusManager.resolve(PARAM_KEYS.SCORE_TOTAL_MULTIPLIER, 1)).toBe(2);
  });
});

describe("bonusManager — random duration units", () => {
  it("has a 7-entry RANDOM_DURATIONS table (1/5 × 3 units + run)", () => {
    expect(RANDOM_DURATIONS).toHaveLength(7);
    expect(RANDOM_DURATIONS.at(-1)).toEqual({
      unit: DURATION_UNITS.RUN,
      count: Infinity,
    });
  });

  it("rolls a level-scoped duration (rng → first entry)", () => {
    bonusManager.activateSession("malus_slot_common", { rng: seqRng([0]) });
    const e = bonusManager.getActiveSession()[0];
    expect(e.unit).toBe(DURATION_UNITS.LEVEL);
    expect(e.remaining).toBe(1);
  });

  it("rolls a run-scoped (Infinity) duration (rng → last entry)", () => {
    bonusManager.activateSession("malus_slot_common", { rng: seqRng([0.9]) });
    const e = bonusManager.getActiveSession()[0];
    expect(e.unit).toBe(DURATION_UNITS.RUN);
    expect(e.remaining).toBe(Infinity);
  });

  it("shop-scoped malus ticks on onShopVisited, not onLevelUp", () => {
    // rng 0.5 → index 3 → { shop, 5 }
    bonusManager.activateSession("malus_slot_common", { rng: seqRng([0.5]) });
    expect(bonusManager.getActiveSession()[0].unit).toBe(DURATION_UNITS.SHOP);
    bonusManager.onLevelUp();
    expect(bonusManager.getActiveSession()[0].remaining).toBe(5);
    bonusManager.onShopVisited();
    expect(bonusManager.getActiveSession()[0].remaining).toBe(4);
  });

  it("mystery-scoped malus expires after its mystery draws", () => {
    // rng 0.6 → index 4 → { mystery, 1 }
    bonusManager.activateSession("malus_slot_common", { rng: seqRng([0.6]) });
    expect(bonusManager.getActiveSession()[0].unit).toBe(
      DURATION_UNITS.MYSTERY,
    );
    bonusManager.onShopVisited();
    bonusManager.onLevelUp();
    expect(bonusManager.getActiveSession()).toHaveLength(1);
    bonusManager.onMysteryDraw();
    expect(bonusManager.getActiveSession()).toEqual([]);
  });

  it("rolls and freezes a variable modifier magnitude", () => {
    // duration → first entry (level,1); magnitude rng 0.85 → index 4 → 0.7
    bonusManager.activateSession("malus_score_penalty", {
      rng: seqRng([0, 0.85]),
    });
    expect(
      bonusManager.resolve(PARAM_KEYS.SCORE_TOTAL_MULTIPLIER, 1),
    ).toBeCloseTo(0.7);
    // The frozen magnitude does not re-roll on later resolves.
    expect(
      bonusManager.resolve(PARAM_KEYS.SCORE_TOTAL_MULTIPLIER, 1),
    ).toBeCloseTo(0.7);
  });
});

describe("bonusManager — resetAll", () => {
  it("clears session + directives", () => {
    bonusManager.activateSession("reward_extra_ball");
    bonusManager.resetAll();
    expect(bonusManager.getActiveSession()).toEqual([]);
    expect(bonusManager.consumeDirectives()).toEqual([]);
  });
});

describe("bonusManager — granular clear helpers", () => {
  it("clearSessionBonuses() drops only category=bonus entries", () => {
    bonusManager.activateSession("reward_coins_x2");
    bonusManager.activateMalus("malus_slot_common");
    expect(bonusManager.clearSessionBonuses()).toBe(true);
    const remaining = bonusManager.getActiveSession();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe("malus_slot_common");
  });

  it("clearSessionBonuses() returns false when no bonus is active", () => {
    bonusManager.activateMalus("malus_slot_common");
    expect(bonusManager.clearSessionBonuses()).toBe(false);
    expect(bonusManager.getActiveSession()).toHaveLength(1);
  });

  it("clearSessionMaluses() drops only category=malus entries", () => {
    bonusManager.activateSession("reward_coins_x2");
    bonusManager.activateMalus("malus_slot_common");
    expect(bonusManager.clearSessionMaluses()).toBe(true);
    const remaining = bonusManager.getActiveSession();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe("reward_coins_x2");
  });

  it("clearSessionMaluses() returns false when no malus is active", () => {
    bonusManager.activateSession("reward_coins_x2");
    expect(bonusManager.clearSessionMaluses()).toBe(false);
  });
});
