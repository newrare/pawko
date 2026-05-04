import { describe, it, expect, beforeEach } from "vitest";
import { bonusManager } from "../../src/managers/bonus-manager.js";
import { SESSION_BONUSES } from "../../src/configs/bonus-defs.js";

/** Minimal bonus context mock. */
function mockCtx() {
  return {
    spawnBonusBall: () => {},
    getLevel: () => 0,
    getHits: () => 0,
    addSaved: () => {},
    addSublaunch: () => {},
    removeSublaunch: () => {},
  };
}

describe("BonusManager", () => {
  beforeEach(() => {
    bonusManager.reset();
  });

  describe("resolve", () => {
    it("returns baseValue when no bonuses active", () => {
      bonusManager.initSession(mockCtx());
      expect(bonusManager.resolve("gravity", 1400)).toBe(1400);
    });

    it("applies add modifier from permanent bonus", () => {
      bonusManager.initSession(mockCtx());
      bonusManager.onLevelUp(10);
      expect(bonusManager.resolve("startingBallsPerSublaunch", 5)).toBe(6);
    });

    it("applies set modifier from permanent bonus (shop_magnet)", () => {
      bonusManager.initSession(mockCtx());
      bonusManager.onLevelUp(10);
      bonusManager.onLevelUp(20);
      expect(bonusManager.resolve("shopMagnetForce", 0)).toBe(1);
    });
  });

  describe("onLevelUp", () => {
    it("unlocks bonus at milestone level", () => {
      bonusManager.initSession(mockCtx());
      const unlocked = bonusManager.onLevelUp(10);
      expect(unlocked.length).toBe(1);
      expect(unlocked[0].id).toBe("extra_start_ball");
    });

    it("does not unlock at non-milestone level", () => {
      bonusManager.initSession(mockCtx());
      const unlocked = bonusManager.onLevelUp(5);
      expect(unlocked.length).toBe(0);
    });

    it("does not double-unlock same bonus", () => {
      bonusManager.initSession(mockCtx());
      bonusManager.onLevelUp(10);
      const second = bonusManager.onLevelUp(10);
      expect(second.length).toBe(0);
    });

    it("tracks highest level reached", () => {
      bonusManager.initSession(mockCtx());
      bonusManager.onLevelUp(5);
      bonusManager.onLevelUp(15);
      expect(bonusManager.highestLevelReached).toBe(15);
    });
  });

  describe("session bonuses", () => {
    it("clears session bonuses on endSession", () => {
      bonusManager.initSession(mockCtx());
      const launcher = SESSION_BONUSES.find((b) => b.id === "bonus_launcher");
      bonusManager.addSessionBonus(launcher);
      expect(bonusManager.getActiveBonuses().session.length).toBe(1);
      bonusManager.endSession();
      expect(bonusManager.getActiveBonuses().session.length).toBe(0);
    });

    it("bonus_launcher triggers addSublaunch on apply", () => {
      let added = false;
      const ctx = { ...mockCtx(), addSublaunch: () => { added = true; } };
      bonusManager.initSession(ctx);
      const launcher = SESSION_BONUSES.find((b) => b.id === "bonus_launcher");
      bonusManager.addSessionBonus(launcher);
      expect(added).toBe(true);
    });

    it("bonus_launcher calls removeSublaunch on expire", () => {
      let removed = false;
      const ctx = { ...mockCtx(), removeSublaunch: () => { removed = true; } };
      bonusManager.initSession(ctx);
      const launcher = SESSION_BONUSES.find((b) => b.id === "bonus_launcher");
      bonusManager.addSessionBonus(launcher);
      for (let i = 1; i <= launcher.durationLevels; i++) {
        bonusManager.onLevelUp(i);
      }
      expect(removed).toBe(true);
    });
  });

  describe("buildShopChoices", () => {
    it("returns exactly 3 choices", () => {
      bonusManager.initSession(mockCtx());
      const choices = bonusManager.buildShopChoices();
      expect(choices.length).toBe(3);
    });

    it("first choice is always ball", () => {
      bonusManager.initSession(mockCtx());
      const choices = bonusManager.buildShopChoices();
      expect(choices[0].action).toBe("ball");
    });
  });

  describe("persistence", () => {
    it("saves and loads unlocked bonuses", () => {
      bonusManager.initSession(mockCtx());
      bonusManager.onLevelUp(10);
      bonusManager.endSession();

      const raw = localStorage.getItem("com.pawko.game.bonuses");
      expect(raw).not.toBeNull();
      const data = JSON.parse(raw);
      expect(data.unlocked).toContain("extra_start_ball");
    });

    it("saves highest level reached", () => {
      bonusManager.initSession(mockCtx());
      bonusManager.onLevelUp(15);
      bonusManager.endSession();

      const raw = localStorage.getItem("com.pawko.game.bonuses");
      const data = JSON.parse(raw);
      expect(data.highestLevel).toBe(15);
    });

    it("load restores state from localStorage", () => {
      localStorage.setItem(
        "com.pawko.game.bonuses",
        JSON.stringify({ unlocked: ["extra_start_ball"], activatable: {}, highestLevel: 42 }),
      );
      bonusManager.load();
      expect(bonusManager.isUnlocked("extra_start_ball")).toBe(true);
      expect(bonusManager.highestLevelReached).toBe(42);
    });

    it("reset clears everything", () => {
      bonusManager.initSession(mockCtx());
      bonusManager.onLevelUp(10);
      bonusManager.reset();
      expect(bonusManager.isUnlocked("extra_start_ball")).toBe(false);
      expect(bonusManager.highestLevelReached).toBe(0);
    });
  });

  describe("session bonus duration", () => {
    it("decrements remainingLevels on levelUp", () => {
      bonusManager.initSession(mockCtx());
      const launcher = SESSION_BONUSES.find((b) => b.id === "bonus_launcher");
      bonusManager.addSessionBonus(launcher);
      bonusManager.onLevelUp(1);
      expect(bonusManager.getSessionBonusRemaining("bonus_launcher")).toBe(launcher.durationLevels - 1);
    });

    it("removes session bonus when remainingLevels reaches 0", () => {
      bonusManager.initSession(mockCtx());
      const launcher = SESSION_BONUSES.find((b) => b.id === "bonus_launcher");
      bonusManager.addSessionBonus(launcher);
      for (let i = 1; i <= launcher.durationLevels; i++) {
        bonusManager.onLevelUp(i);
      }
      expect(bonusManager.getActiveBonuses().session.length).toBe(0);
    });

    it("does not remove bonus before duration expires", () => {
      bonusManager.initSession(mockCtx());
      const launcher = SESSION_BONUSES.find((b) => b.id === "bonus_launcher");
      bonusManager.addSessionBonus(launcher);
      for (let i = 1; i < launcher.durationLevels; i++) {
        bonusManager.onLevelUp(i);
      }
      expect(bonusManager.getActiveBonuses().session.length).toBe(1);
    });

    it("getSessionBonusRemaining returns 0 for inactive bonus", () => {
      bonusManager.initSession(mockCtx());
      expect(bonusManager.getSessionBonusRemaining("bonus_launcher")).toBe(0);
    });
  });
});
