import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { vfx } from "../../src/utils/vfx.js";

describe("VFX Overlay System", () => {
  /** @type {HTMLElement} */
  let target;

  beforeEach(() => {
    target = document.createElement("div");
    document.body.appendChild(target);
  });

  afterEach(() => {
    vfx.stopAll();
    target.remove();
  });

  describe("vfx.play()", () => {
    it("returns an object with a stop method", () => {
      const handle = vfx.play("sunburst", target);
      expect(handle).toBeDefined();
      expect(typeof handle.stop).toBe("function");
    });

    it("adds a vfx overlay element to the target", () => {
      vfx.play("sunburst", target);
      const overlay = target.querySelector("[data-vfx]");
      expect(overlay).not.toBeNull();
      expect(overlay.dataset.vfx).toBe("sunburst");
    });

    it("removes overlay on stop()", () => {
      const handle = vfx.play("sunburst", target);
      handle.stop();
      const overlay = target.querySelector("[data-vfx]");
      expect(overlay).toBeNull();
    });

    it("sets target to position:relative if static", () => {
      target.style.position = "";
      vfx.play("sunburst", target);
      expect(target.style.position).toBe("relative");
    });

    it("does not override existing non-static position", () => {
      target.style.position = "absolute";
      vfx.play("sunburst", target);
      expect(target.style.position).toBe("absolute");
    });

    it("throws for unknown effect id", () => {
      expect(() => vfx.play("unknown_effect_xyz", target)).toThrow();
    });

    it("supports duration option for auto-stop", () => {
      vi.useFakeTimers();
      vfx.play("confetti", target, { duration: 1000 });
      expect(target.querySelector("[data-vfx]")).not.toBeNull();
      vi.advanceTimersByTime(1001);
      expect(target.querySelector("[data-vfx]")).toBeNull();
      vi.useRealTimers();
    });

    it("supports loop option", () => {
      const handle = vfx.play("sunburst", target, { loop: true });
      const overlay = target.querySelector("[data-vfx]");
      expect(overlay.dataset.vfxLoop).toBe("true");
      handle.stop();
    });
  });

  describe("vfx.stopAll()", () => {
    it("removes all active vfx overlays", () => {
      vfx.play("sunburst", target);
      vfx.play("confetti", target);
      expect(target.querySelectorAll("[data-vfx]").length).toBe(2);
      vfx.stopAll();
      expect(target.querySelectorAll("[data-vfx]").length).toBe(0);
    });
  });

  describe("vfx.stop()", () => {
    it("removes a specific vfx by effect id from target", () => {
      vfx.play("sunburst", target);
      vfx.play("confetti", target);
      vfx.stop("sunburst", target);
      expect(target.querySelector('[data-vfx="sunburst"]')).toBeNull();
      expect(target.querySelector('[data-vfx="confetti"]')).not.toBeNull();
    });
  });

  describe("effect registry", () => {
    it("has all positive effects registered", () => {
      const positive = [
        "sunburst",
        "confetti",
        "sparkle-trail",
        "god-rays",
        "gold-shower",
        "bloom-flash",
        "fireworks",
        "halo-ring",
        "floating-text",
      ];
      for (const id of positive) {
        expect(() => vfx.play(id, target)).not.toThrow();
      }
      vfx.stopAll();
    });

    it("has all negative effects registered", () => {
      const negative = [
        "blood-vignette",
        "frost",
        "cracked-screen",
      ];
      for (const id of negative) {
        expect(() => vfx.play(id, target)).not.toThrow();
      }
      vfx.stopAll();
    });
  });

  describe("floating-text effect", () => {
    it("accepts a text option", () => {
      vfx.play("floating-text", target, { text: "+50" });
      const overlay = target.querySelector("[data-vfx='floating-text']");
      expect(overlay.textContent).toContain("+50");
    });
  });

  describe("confetti effect", () => {
    it("creates particle elements", () => {
      vfx.play("confetti", target);
      const overlay = target.querySelector("[data-vfx='confetti']");
      const particles = overlay.querySelectorAll(".vfx-particle");
      expect(particles.length).toBeGreaterThan(0);
    });
  });
});
