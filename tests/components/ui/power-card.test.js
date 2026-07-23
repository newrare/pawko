import { describe, it, expect } from "vitest";
import { powerCardHtml } from "../../../src/components/ui/power-card.js";

/** Parse an HTML string to its single root element (happy-dom). */
function parse(html) {
  const host = document.createElement("div");
  host.innerHTML = html.trim();
  return host.firstElementChild;
}

const base = {
  rarity: "rare",
  rarityLabel: "Rare",
  icon: "bomb",
  title: "Big Bombs",
  desc: "Bombs explode with a larger blast radius.",
  stats: [
    { icon: "hourglass", label: "Duration", value: "Run" },
    { icon: "sparkles", label: "Type", value: "Bonus" },
  ],
};

describe("powerCardHtml", () => {
  it("renders a static <article> by default", () => {
    const el = parse(powerCardHtml(base));
    expect(el.tagName).toBe("ARTICLE");
    expect(el.classList.contains("pk-power-card")).toBe(true);
    expect(el.hasAttribute("data-action")).toBe(false);
  });

  it("applies the rarity modifier class", () => {
    const el = parse(powerCardHtml({ ...base, rarity: "legendary" }));
    expect(el.classList.contains("pk-power-card--legendary")).toBe(true);
  });

  it("renders the badge with the rarity label", () => {
    const el = parse(powerCardHtml(base));
    expect(el.querySelector(".pk-power-card-badge").textContent).toBe("Rare");
  });

  it("renders a hero icon and a background watermark icon", () => {
    const el = parse(powerCardHtml(base));
    expect(el.querySelector(".pk-power-card-hero .pk-icon")).not.toBeNull();
    expect(el.querySelector(".pk-power-card-bg .pk-icon")).not.toBeNull();
  });

  it("renders the title and description", () => {
    const el = parse(powerCardHtml(base));
    expect(el.querySelector(".pk-power-card-title").textContent).toBe(
      "Big Bombs",
    );
    expect(el.querySelector(".pk-power-card-desc").textContent).toContain(
      "blast radius",
    );
  });

  it("renders one list row per stat, with label and value", () => {
    const el = parse(powerCardHtml(base));
    const rows = el.querySelectorAll(".pk-power-card-list li");
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector(".pk-power-card-k").textContent).toContain(
      "Duration",
    );
    expect(rows[0].querySelector(".pk-power-card-v").textContent).toBe("Run");
  });

  it("handles an empty stats list without a row", () => {
    const el = parse(powerCardHtml({ ...base, stats: [] }));
    expect(el.querySelectorAll(".pk-power-card-list li")).toHaveLength(0);
  });

  it("renders a clickable <button> when an action is provided", () => {
    const el = parse(
      powerCardHtml({
        ...base,
        action: "choose",
        index: 2,
        ariaLabel: "Big Bombs",
      }),
    );
    expect(el.tagName).toBe("BUTTON");
    expect(el.getAttribute("type")).toBe("button");
    expect(el.getAttribute("data-action")).toBe("choose");
    expect(el.getAttribute("data-index")).toBe("2");
    expect(el.getAttribute("aria-label")).toBe("Big Bombs");
    expect(el.classList.contains("gt-clickable")).toBe(true);
  });

  it("omits data-index when no index is given", () => {
    const el = parse(powerCardHtml({ ...base, action: "choose" }));
    expect(el.hasAttribute("data-index")).toBe(false);
  });
});
