import { describe, it, expect, vi, beforeEach } from "vitest";
import { bonusManager } from "../../src/managers/bonus-manager.js";
import { PARAM_KEYS, DIRECTIVE_ACTIONS } from "../../src/configs/bonus-defs.js";
import { PLINKO } from "../../src/configs/constants.js";

beforeEach(() => bonusManager._resetForTests());

describe("bonusManager — permanent", () => {
  it("starts with no permanent bonuses", () => {
    expect(bonusManager.getUnlockedPermanent()).toEqual([]);
  });

  it("unlockPermanent() stores and is idempotent", () => {
    expect(bonusManager.unlockPermanent("perm_extra_ball_1")).toBe(true);
    expect(bonusManager.unlockPermanent("perm_extra_ball_1")).toBe(false);
    expect(bonusManager.isPermanentUnlocked("perm_extra_ball_1")).toBe(true);
  });

  it("rejects session bonus ids on unlockPermanent", () => {
    expect(bonusManager.unlockPermanent("session_coin_drop_x2")).toBe(false);
  });

  it("rejects malus ids on unlockPermanent", () => {
    expect(bonusManager.unlockPermanent("malus_player_hp_drain")).toBe(false);
  });
});

describe("bonusManager — session", () => {
  it("activateSession() registers with full duration", () => {
    bonusManager.activateSession("session_coin_drop_x2");
    const active = bonusManager.getActiveSession();
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe("session_coin_drop_x2");
    expect(active[0].remaining).toBe(3);
  });

  it("rejects permanent ids on activateSession", () => {
    expect(bonusManager.activateSession("perm_extra_ball_1")).toBe(false);
  });

  it("stores Infinity for run-scoped bonuses (durationLevels: null)", () => {
    bonusManager.activateSession("session_launcher_4");
    expect(bonusManager.getActiveSession()[0].remaining).toBe(Infinity);
  });

  it("onLevelUp() decrements remaining", () => {
    bonusManager.activateSession("session_coin_drop_x2");
    bonusManager.onLevelUp();
    expect(bonusManager.getActiveSession()[0].remaining).toBe(2);
  });

  it("onLevelUp() does not decrement run-scoped bonuses", () => {
    bonusManager.activateSession("session_launcher_4");
    bonusManager.onLevelUp();
    bonusManager.onLevelUp();
    expect(bonusManager.getActiveSession()[0].remaining).toBe(Infinity);
  });

  it("expires when remaining hits zero and fires onExpire", () => {
    const onExpire = vi.fn();
    bonusManager.activateSession("session_coin_drop_x2");
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
    bonusManager.activateSession("session_coin_drop_x2");
    bonusManager.activateSession("session_extra_classic_ball_one");
    bonusManager.clearSession();
    expect(bonusManager.getActiveSession()).toEqual([]);
    expect(bonusManager.consumeDirectives()).toEqual([]);
  });
});

describe("bonusManager — maluses", () => {
  it("activateMalus() registers a MALUS-category def", () => {
    expect(bonusManager.activateMalus("malus_player_hp_drain")).toBe(true);
    expect(bonusManager.isSessionActive("malus_player_hp_drain")).toBe(true);
  });

  it("activateMalus() rejects bonus ids", () => {
    expect(bonusManager.activateMalus("session_coin_drop_x2")).toBe(false);
  });

  it("getAll() excludes maluses (shop catalogue)", () => {
    const ids = bonusManager.getAll().map((b) => b.id);
    expect(ids).not.toContain("malus_player_hp_drain");
  });

  it("getAllMaluses() exposes the malus catalogue", () => {
    const ids = bonusManager.getAllMaluses().map((b) => b.id);
    expect(ids).toContain("malus_player_hp_drain");
  });

  it("malus modifiers participate in resolve()", () => {
    bonusManager.activateMalus("malus_player_hp_drain");
    expect(
      bonusManager.resolve(PARAM_KEYS.PLAYER_MAX_HP_BONUS, 0),
    ).toBe(-3);
  });
});

describe("bonusManager — directives", () => {
  it("activateSession() queues directives", () => {
    bonusManager.activateSession("session_extra_classic_ball_one");
    const d = bonusManager.consumeDirectives();
    expect(d).toHaveLength(1);
    expect(d[0].action).toBe(DIRECTIVE_ACTIONS.ADD_BALL);
    expect(d[0].payload.kind).toBe("classic");
  });

  it("consumeDirectives() drains and clears the queue", () => {
    bonusManager.activateSession("session_extra_classic_ball_one");
    bonusManager.consumeDirectives();
    expect(bonusManager.consumeDirectives()).toEqual([]);
  });
});

describe("bonusManager — resolve()", () => {
  it("returns the base value when no bonus is active", () => {
    const v = bonusManager.resolve(
      PARAM_KEYS.STARTING_BALLS_PER_SUBLAUNCH,
      PLINKO.STARTING_BALLS_PER_SUBLAUNCH,
    );
    expect(v).toBe(PLINKO.STARTING_BALLS_PER_SUBLAUNCH);
  });

  it("applies an additive permanent bonus", () => {
    bonusManager.unlockPermanent("perm_extra_ball_1");
    expect(
      bonusManager.resolve(
        PARAM_KEYS.STARTING_BALLS_PER_SUBLAUNCH,
        PLINKO.STARTING_BALLS_PER_SUBLAUNCH,
      ),
    ).toBe(PLINKO.STARTING_BALLS_PER_SUBLAUNCH + 1);
  });

  it("applies a multiplicative session bonus", () => {
    bonusManager.activateSession("session_coin_drop_x2");
    expect(bonusManager.resolve(PARAM_KEYS.DESTROY_COIN_MULTIPLIER, 1)).toBe(2);
  });

  it("applies a 'set' bonus (set wins over numeric ops)", () => {
    bonusManager.activateSession("session_gate_x_double");
    expect(bonusManager.resolve(PARAM_KEYS.GATE_X_DOUBLE, false)).toBe(true);
  });

  it("stacks add then multiply across permanent + session", () => {
    bonusManager.unlockPermanent("perm_extra_ball_1");
    bonusManager.activateSession("session_launcher_4");
    expect(
      bonusManager.resolve(
        PARAM_KEYS.STARTING_BALLS_PER_SUBLAUNCH,
        PLINKO.STARTING_BALLS_PER_SUBLAUNCH,
      ),
    ).toBe(PLINKO.STARTING_BALLS_PER_SUBLAUNCH + 1);
    expect(
      bonusManager.resolve(
        PARAM_KEYS.SUBLAUNCH_COUNT,
        PLINKO.SUBLAUNCH_COUNT,
      ),
    ).toBe(PLINKO.SUBLAUNCH_COUNT + 1);
  });
});

describe("bonusManager — persistence", () => {
  it("persists permanent unlocks across reloads", async () => {
    bonusManager.unlockPermanent("perm_extra_ball_1");
    const mod = await import(
      "../../src/managers/bonus-manager.js?freshpermanent"
    );
    expect(mod.bonusManager.isPermanentUnlocked("perm_extra_ball_1")).toBe(true);
  });

  it("does NOT persist session bonuses", async () => {
    bonusManager.activateSession("session_coin_drop_x2");
    const mod = await import(
      "../../src/managers/bonus-manager.js?freshsession"
    );
    expect(mod.bonusManager.getActiveSession()).toEqual([]);
  });
});

describe("bonusManager — resetAll", () => {
  it("clears unlocked + session + directives", () => {
    bonusManager.unlockPermanent("perm_extra_ball_1");
    bonusManager.activateSession("session_extra_classic_ball_one");
    bonusManager.resetAll();
    expect(bonusManager.getUnlockedPermanent()).toEqual([]);
    expect(bonusManager.getActiveSession()).toEqual([]);
    expect(bonusManager.consumeDirectives()).toEqual([]);
  });
});

describe("bonusManager — granular clear helpers", () => {
  it("clearPermanent() removes every owned permanent and leaves session alone", () => {
    bonusManager.unlockPermanent("perm_extra_ball_1");
    bonusManager.activateSession("session_coin_drop_x2");
    expect(bonusManager.clearPermanent()).toBe(true);
    expect(bonusManager.getUnlockedPermanent()).toEqual([]);
    expect(bonusManager.getActiveSession()).toHaveLength(1);
  });

  it("clearPermanent() returns false when nothing was owned", () => {
    expect(bonusManager.clearPermanent()).toBe(false);
  });

  it("clearSessionBonuses() drops only category=bonus session entries", () => {
    bonusManager.activateSession("session_coin_drop_x2");
    bonusManager.activateMalus("malus_player_hp_drain");
    expect(bonusManager.clearSessionBonuses()).toBe(true);
    const remaining = bonusManager.getActiveSession();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe("malus_player_hp_drain");
  });

  it("clearSessionBonuses() returns false when no session bonus is active", () => {
    bonusManager.activateMalus("malus_player_hp_drain");
    expect(bonusManager.clearSessionBonuses()).toBe(false);
    expect(bonusManager.getActiveSession()).toHaveLength(1);
  });

  it("clearSessionMaluses() drops only category=malus session entries", () => {
    bonusManager.activateSession("session_coin_drop_x2");
    bonusManager.activateMalus("malus_player_hp_drain");
    expect(bonusManager.clearSessionMaluses()).toBe(true);
    const remaining = bonusManager.getActiveSession();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe("session_coin_drop_x2");
  });

  it("clearSessionMaluses() returns false when no malus is active", () => {
    bonusManager.activateSession("session_coin_drop_x2");
    expect(bonusManager.clearSessionMaluses()).toBe(false);
  });
});
