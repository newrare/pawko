import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PegSaveSystem } from "../../src/utils/peg-save-system.js";
import { PEG_SAVE } from "../../src/configs/constants.js";

describe("PegSaveSystem", () => {
  /** @type {PegSaveSystem} */
  let system;

  beforeEach(() => {
    vi.useFakeTimers();
    system = new PegSaveSystem();
  });

  afterEach(() => {
    system.dispose();
    vi.useRealTimers();
  });

  describe("startRescue", () => {
    it("registers a peg as rescuable", () => {
      const peg = { id: 1, hp: 0 };
      system.startRescue(peg, { onExpire: vi.fn(), onSave: vi.fn() });
      expect(system.isRescuable(1)).toBe(true);
    });

    it("does not register the same peg twice", () => {
      const peg = { id: 1, hp: 0 };
      const onExpire = vi.fn();
      system.startRescue(peg, { onExpire, onSave: vi.fn() });
      system.startRescue(peg, { onExpire, onSave: vi.fn() });
      // Still only one entry
      expect(system.rescuableCount).toBe(1);
    });

    it("calls onExpire after RESCUE_DURATION_MS if not saved", () => {
      const peg = { id: 1, hp: 0 };
      const onExpire = vi.fn();
      system.startRescue(peg, { onExpire, onSave: vi.fn() });

      vi.advanceTimersByTime(PEG_SAVE.RESCUE_DURATION_MS - 1);
      expect(onExpire).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(onExpire).toHaveBeenCalledOnce();
      expect(system.isRescuable(1)).toBe(false);
    });
  });

  describe("trySave", () => {
    it("returns true and restores HP when peg is rescuable", () => {
      const peg = { id: 1, hp: 0 };
      const onSave = vi.fn();
      system.startRescue(peg, { onExpire: vi.fn(), onSave });

      const result = system.trySave(1);
      expect(result).toBe(true);
      expect(peg.hp).toBe(PEG_SAVE.SAVED_HP);
      expect(onSave).toHaveBeenCalledOnce();
      expect(system.isRescuable(1)).toBe(false);
    });

    it("returns false for a peg that is not rescuable", () => {
      const result = system.trySave(999);
      expect(result).toBe(false);
    });

    it("cancels the expire timer on successful save", () => {
      const peg = { id: 1, hp: 0 };
      const onExpire = vi.fn();
      system.startRescue(peg, { onExpire, onSave: vi.fn() });

      system.trySave(1);
      vi.advanceTimersByTime(PEG_SAVE.RESCUE_DURATION_MS + 1000);
      expect(onExpire).not.toHaveBeenCalled();
    });

    it("does not allow saving the same peg twice", () => {
      const peg = { id: 1, hp: 0 };
      const onSave = vi.fn();
      system.startRescue(peg, { onExpire: vi.fn(), onSave });

      system.trySave(1);
      const secondAttempt = system.trySave(1);
      expect(secondAttempt).toBe(false);
      expect(onSave).toHaveBeenCalledOnce();
    });
  });

  describe("combo multiplier", () => {
    it("starts at 1.0", () => {
      expect(system.comboMultiplier).toBe(1);
    });

    it("increments by COMBO_INCREMENT on each save", () => {
      const peg1 = { id: 1, hp: 0 };
      const peg2 = { id: 2, hp: 0 };
      system.startRescue(peg1, { onExpire: vi.fn(), onSave: vi.fn() });
      system.startRescue(peg2, { onExpire: vi.fn(), onSave: vi.fn() });

      system.trySave(1);
      expect(system.comboMultiplier).toBeCloseTo(1 + PEG_SAVE.COMBO_INCREMENT);

      system.trySave(2);
      expect(system.comboMultiplier).toBeCloseTo(1 + 2 * PEG_SAVE.COMBO_INCREMENT);
    });

    it("decays to 1.0 after COMBO_DECAY_MS without a save", () => {
      const peg = { id: 1, hp: 0 };
      system.startRescue(peg, { onExpire: vi.fn(), onSave: vi.fn() });
      system.trySave(1);

      expect(system.comboMultiplier).toBeCloseTo(1 + PEG_SAVE.COMBO_INCREMENT);

      vi.advanceTimersByTime(PEG_SAVE.COMBO_DECAY_MS);
      expect(system.comboMultiplier).toBe(1);
    });

    it("resets the decay timer on each new save", () => {
      const peg1 = { id: 1, hp: 0 };
      const peg2 = { id: 2, hp: 0 };
      system.startRescue(peg1, { onExpire: vi.fn(), onSave: vi.fn() });
      system.startRescue(peg2, { onExpire: vi.fn(), onSave: vi.fn() });

      system.trySave(1);
      // Advance but stay within peg2's rescue window AND before combo decay
      vi.advanceTimersByTime(1000);
      // Still active — decay hasn't fired
      expect(system.comboMultiplier).toBeCloseTo(1 + PEG_SAVE.COMBO_INCREMENT);

      // Second save resets the decay
      system.trySave(2);
      expect(system.comboMultiplier).toBeCloseTo(1 + 2 * PEG_SAVE.COMBO_INCREMENT);

      // Wait decay from second save
      vi.advanceTimersByTime(PEG_SAVE.COMBO_DECAY_MS - 1);
      expect(system.comboMultiplier).toBeCloseTo(1 + 2 * PEG_SAVE.COMBO_INCREMENT);

      vi.advanceTimersByTime(1);
      expect(system.comboMultiplier).toBe(1);
    });

    it("does not increment combo on expire (only on save)", () => {
      const peg = { id: 1, hp: 0 };
      system.startRescue(peg, { onExpire: vi.fn(), onSave: vi.fn() });

      vi.advanceTimersByTime(PEG_SAVE.RESCUE_DURATION_MS);
      expect(system.comboMultiplier).toBe(1);
    });
  });

  describe("dispose", () => {
    it("clears all pending rescues and fires no callbacks", () => {
      const peg = { id: 1, hp: 0 };
      const onExpire = vi.fn();
      const onSave = vi.fn();
      system.startRescue(peg, { onExpire, onSave });

      system.dispose();
      vi.advanceTimersByTime(PEG_SAVE.RESCUE_DURATION_MS + 1000);
      expect(onExpire).not.toHaveBeenCalled();
      expect(system.isRescuable(1)).toBe(false);
      expect(system.rescuableCount).toBe(0);
    });

    it("resets the combo multiplier", () => {
      const peg = { id: 1, hp: 0 };
      system.startRescue(peg, { onExpire: vi.fn(), onSave: vi.fn() });
      system.trySave(1);
      expect(system.comboMultiplier).toBeGreaterThan(1);

      system.dispose();
      expect(system.comboMultiplier).toBe(1);
    });
  });

  describe("cancelRescue", () => {
    it("removes a peg from rescuable state without calling callbacks", () => {
      const peg = { id: 1, hp: 0 };
      const onExpire = vi.fn();
      const onSave = vi.fn();
      system.startRescue(peg, { onExpire, onSave });

      system.cancelRescue(1);
      expect(system.isRescuable(1)).toBe(false);

      vi.advanceTimersByTime(PEG_SAVE.RESCUE_DURATION_MS + 1000);
      expect(onExpire).not.toHaveBeenCalled();
    });
  });

  describe("multiple pegs simultaneously", () => {
    it("tracks multiple rescue windows independently", () => {
      const peg1 = { id: 1, hp: 0 };
      const peg2 = { id: 2, hp: 0 };
      const onExpire1 = vi.fn();
      const onExpire2 = vi.fn();

      system.startRescue(peg1, { onExpire: onExpire1, onSave: vi.fn() });
      vi.advanceTimersByTime(500);
      system.startRescue(peg2, { onExpire: onExpire2, onSave: vi.fn() });

      // peg1 expires at 2000, peg2 at 2500
      vi.advanceTimersByTime(1500);
      expect(onExpire1).toHaveBeenCalledOnce();
      expect(onExpire2).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);
      expect(onExpire2).toHaveBeenCalledOnce();
    });

    it("saving one peg does not affect another", () => {
      const peg1 = { id: 1, hp: 0 };
      const peg2 = { id: 2, hp: 0 };
      const onExpire2 = vi.fn();

      system.startRescue(peg1, { onExpire: vi.fn(), onSave: vi.fn() });
      system.startRescue(peg2, { onExpire: onExpire2, onSave: vi.fn() });

      system.trySave(1);
      expect(system.isRescuable(2)).toBe(true);

      vi.advanceTimersByTime(PEG_SAVE.RESCUE_DURATION_MS);
      expect(onExpire2).toHaveBeenCalledOnce();
    });
  });

  describe("saveCount", () => {
    it("tracks total number of saves in the session", () => {
      expect(system.saveCount).toBe(0);

      const peg1 = { id: 1, hp: 0 };
      const peg2 = { id: 2, hp: 0 };
      system.startRescue(peg1, { onExpire: vi.fn(), onSave: vi.fn() });
      system.startRescue(peg2, { onExpire: vi.fn(), onSave: vi.fn() });

      system.trySave(1);
      expect(system.saveCount).toBe(1);

      system.trySave(2);
      expect(system.saveCount).toBe(2);
    });
  });
});
