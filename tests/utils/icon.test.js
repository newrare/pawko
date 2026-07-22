import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { iconSvg, setIcon, hasIcon } from "../../src/utils/icon.js";

describe("iconSvg", () => {
  it("renders a self-contained <svg> string", () => {
    const svg = iconSvg("gem");
    expect(svg).toMatch(/^<svg /);
    expect(svg.trimEnd()).toMatch(/<\/svg>$/);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox="0 0 24 24"');
  });

  it("strokes with currentColor so it follows the host colour", () => {
    const svg = iconSvg("gem");
    expect(svg).toContain('stroke="currentColor"');
    expect(svg).toContain('fill="none"');
  });

  it("always carries the pk-icon base class", () => {
    expect(iconSvg("gem")).toContain('class="pk-icon"');
  });

  it("appends extra classes after pk-icon", () => {
    expect(iconSvg("gem", { cls: "pk-icon--gold" })).toContain(
      'class="pk-icon pk-icon--gold"',
    );
  });

  it("applies the requested size and stroke width", () => {
    const svg = iconSvg("gem", { size: 40, strokeWidth: 1.5 });
    expect(svg).toContain('width="40"');
    expect(svg).toContain('height="40"');
    expect(svg).toContain('stroke-width="1.5"');
  });

  it("resolves kebab-case names to Lucide icons", () => {
    // shopping-cart is rendered from two <circle> wheels + a <path> body.
    const svg = iconSvg("shopping-cart");
    expect(svg).toContain("<circle");
    expect(svg).toContain("<path");
  });

  it("is aria-hidden by default", () => {
    expect(iconSvg("gem")).toContain('aria-hidden="true"');
  });

  it("becomes an accessible image when a title is given", () => {
    const svg = iconSvg("gem", { title: "Diamonds" });
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="Diamonds"');
    expect(svg).not.toContain("aria-hidden");
  });

  it("falls back to a help circle for unknown names (warns once)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fallback = iconSvg("circle-help");
    const unknown = iconSvg("definitely-not-an-icon");
    // Same node body as the fallback icon.
    expect(unknown).toContain("<circle");
    expect(unknown.replace(/class="[^"]*"/, "")).toBe(
      fallback.replace(/class="[^"]*"/, ""),
    );
    expect(warn).toHaveBeenCalledTimes(1);
    // Second call for the same name does not warn again.
    iconSvg("definitely-not-an-icon");
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe("hasIcon", () => {
  it("is true for known icons and false for unknown", () => {
    expect(hasIcon("gem")).toBe(true);
    expect(hasIcon("shopping-cart")).toBe(true);
    expect(hasIcon("nope-nope-nope")).toBe(false);
  });
});

describe("setIcon", () => {
  let el;
  beforeEach(() => {
    el = document.createElement("div");
  });
  afterEach(() => {
    el.remove();
  });

  it("sets the element innerHTML to the rendered icon", () => {
    setIcon(el, "lock");
    const svg = el.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg.getAttribute("class")).toBe("pk-icon");
    expect(svg.getAttribute("stroke")).toBe("currentColor");
  });

  it("is a no-op for a null element", () => {
    expect(() => setIcon(null, "lock")).not.toThrow();
  });
});
