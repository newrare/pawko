import { describe, it, expect, vi, beforeEach } from "vitest";
import { bonusManager } from "../../src/managers/bonus-manager.js";
import { PARAM_KEYS } from "../../src/configs/bonus-defs.js";
import { PLINKO } from "../../src/configs/constants.js";

beforeEach(() => bonusManager._resetForTests());

describe("bonusManager — permanent", () => {
  it("starts with no permanent bonuses", () => {
    expect(bonusManager.getUnlockedPermanent()).toEqual([]);
  });

  it("unlockPermanent() stores and is idempotent", () => {
    expect(bonusManager.unlockPermanent("extra_start_ball")).toBe(true);
    expect(bonusManager.unlockPermanent("extra_start_ball")).toBe(false);
    expect(bonusManager.isPermanentUnlocked("extra_start_ball")).toBe(true);
  });

  it("rejects session bonus ids on unlockPermanent", () => {
    expect(bonusManager.unlockPermanent("score_x2")).toBe(false);
  });
});

describe("bonusManager — session", () => {
  it("activateSession() registers with full duration", () => {
    bonusManager.activateSession("score_x2");
    const active = bonusManager.getActiveSession();
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe("score_x2");
    expect(active[0].remaining).toBe(3);
  });

  it("rejects permanent ids on activateSession", () => {
    expect(bonusManager.activateSession("shop_magnet")).toBe(false);
  });

  it("onLevelUp() decrements remaining", () => {
    bonusManager.activateSession("score_x2");
    bonusManager.onLevelUp();
    expect(bonusManager.getActiveSession()[0].remaining).toBe(2);
  });

  it("expires when remaining hits zero and fires onExpire", () => {
    const onExpire = vi.fn();
    /* Inject an expiring bonus through activateSession + monkey-patch the
       definition's onExpire — simulates a custom session bonus. */
    bonusManager.activateSession("score_x2");
    const def = bonusManager.getActiveSession()[0].def;
    def.onExpire = onExpire;

    bonusManager.onLevelUp();
    bonusManager.onLevelUp();
    bonusManager.onLevelUp();

    expect(bonusManager.getActiveSession()).toEqual([]);
    expect(onExpire).toHaveBeenCalledTimes(1);
    def.onExpire = null;
  });

  it("clearSession() drops every active bonus", () => {
    bonusManager.activateSession("score_x2");
    bonusManager.activateSession("bonus_launcher");
    bonusManager.clearSession();
    expect(bonusManager.getActiveSession()).toEqual([]);
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
    bonusManager.unlockPermanent("extra_start_ball");
    expect(
      bonusManager.resolve(
        PARAM_KEYS.STARTING_BALLS_PER_SUBLAUNCH,
        PLINKO.STARTING_BALLS_PER_SUBLAUNCH,
      ),
    ).toBe(PLINKO.STARTING_BALLS_PER_SUBLAUNCH + 1);
  });

  it("applies a multiplicative session bonus", () => {
    bonusManager.activateSession("score_x2");
    expect(
      bonusManager.resolve(PARAM_KEYS.PEG_SCORE_MULTIPLIER, 1),
    ).toBe(2);
  });

  it("applies a 'set' bonus over numeric ones (set wins)", () => {
    bonusManager.unlockPermanent("shop_magnet");
    expect(
      bonusManager.resolve(PARAM_KEYS.SHOP_MAGNET_ENABLED, false),
    ).toBe(true);
  });

  it("stacks add then multiply across permanent + session", () => {
    bonusManager.unlockPermanent("extra_start_ball"); // +1 to STARTING_BALLS_PER_SUBLAUNCH
    bonusManager.activateSession("bonus_launcher"); // +1 to SUBLAUNCH_COUNT
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
    bonusManager.unlockPermanent("extra_start_ball");
    /* Re-import to trigger constructor and re-load from localStorage. */
    const mod = await import(
      "../../src/managers/bonus-manager.js?freshpermanent"
    );
    expect(mod.bonusManager.isPermanentUnlocked("extra_start_ball")).toBe(true);
  });

  it("does NOT persist session bonuses", async () => {
    bonusManager.activateSession("score_x2");
    const mod = await import(
      "../../src/managers/bonus-manager.js?freshsession"
    );
    expect(mod.bonusManager.getActiveSession()).toEqual([]);
  });
});

describe("bonusManager — resetAll", () => {
  it("clears unlocked + session", () => {
    bonusManager.unlockPermanent("extra_start_ball");
    bonusManager.activateSession("score_x2");
    bonusManager.resetAll();
    expect(bonusManager.getUnlockedPermanent()).toEqual([]);
    expect(bonusManager.getActiveSession()).toEqual([]);
  });
});
