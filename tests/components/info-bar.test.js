import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { InfoBar, INFO_BAR_MODES } from "../../src/components/info-bar.js";

vi.mock("../../src/managers/currency-manager.js", () => ({
  currencyManager: {
    get: vi.fn(() => 100),
    on: vi.fn(() => () => {}),
  },
}));

vi.mock("../../src/managers/save-manager.js", () => ({
  saveManager: {
    loadGridState: vi.fn(() => ({
      cells: [
        { type: "level", state: "used" },
        { type: "level", state: "revealed" },
        { type: "level", state: "hidden" },
        { type: "shop", state: "used" },
        { type: "shop", state: "revealed" },
        { type: "ability", state: "hidden" },
      ],
    })),
    loadLevelProgress: vi.fn(() => ({ maxLevel: 5 })),
  },
}));

describe("InfoBar", () => {
  /** @type {HTMLElement} */
  let root;
  /** @type {InfoBar | null} */
  let infoBar = null;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
  });

  afterEach(() => {
    infoBar?.destroy();
    infoBar = null;
    root.remove();
  });

  describe("mount/destroy lifecycle", () => {
    it("mount() appends the info-bar element", () => {
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      expect(root.querySelector(".pk-info-bar")).not.toBeNull();
    });

    it("destroy() removes the element", () => {
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      infoBar.destroy();
      expect(root.querySelector(".pk-info-bar")).toBeNull();
    });

    it("destroy() is idempotent", () => {
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      infoBar.destroy();
      infoBar.destroy();
      expect(root.querySelector(".pk-info-bar")).toBeNull();
    });
  });

  describe("exploration mode", () => {
    it("renders 4 pills: progress, keys, resources, arsenal", () => {
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      const pills = root.querySelectorAll(".pk-info-pill");
      expect(pills.length).toBe(4);
      const ids = [...pills].map((p) => p.dataset.pill);
      expect(ids).toEqual(["progress", "keys", "resources", "arsenal"]);
    });

    it("pills have icons and counts", () => {
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      const pills = root.querySelectorAll(".pk-info-pill");
      pills.forEach((pill) => {
        expect(pill.querySelector(".pk-info-pill-icon")).not.toBeNull();
        expect(pill.querySelector(".pk-info-pill-count")).not.toBeNull();
      });
    });
  });

  describe("pinboard mode", () => {
    it("renders 5 pills: balls, launchers, keys, loot, score", () => {
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.PINBOARD });
      infoBar.mount(root);
      const pills = root.querySelectorAll(".pk-info-pill");
      expect(pills.length).toBe(5);
      const ids = [...pills].map((p) => p.dataset.pill);
      expect(ids).toEqual(["balls", "launchers", "keys", "loot", "score"]);
    });
  });

  describe("drawer interaction", () => {
    it("clicking a pill opens its drawer", () => {
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      const pill = root.querySelector('[data-pill="keys"]');
      pill.click();
      const updatedPill = root.querySelector('[data-pill="keys"]');
      expect(root.querySelector('.pk-info-drawer[data-drawer="keys"]')).not.toBeNull();
      expect(updatedPill.classList.contains("pk-info-pill--active")).toBe(true);
    });

    it("clicking another pill closes current and opens new", () => {
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      root.querySelector('[data-pill="keys"]').click();
      root.querySelector('[data-pill="progress"]').click();

      expect(
        root.querySelector('[data-pill="keys"]').classList.contains("pk-info-pill--active"),
      ).toBe(false);
      expect(
        root.querySelector('[data-pill="progress"]').classList.contains("pk-info-pill--active"),
      ).toBe(true);
      expect(root.querySelectorAll(".pk-info-drawer--open").length).toBe(1);
    });

    it("clicking active pill closes its drawer", () => {
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      root.querySelector('[data-pill="keys"]').click();
      root.querySelector('[data-pill="keys"]').click();
      const pill = root.querySelector('[data-pill="keys"]');
      expect(pill.classList.contains("pk-info-pill--active")).toBe(false);
      expect(root.querySelector(".pk-info-drawer--open")).toBeNull();
    });

    it("drawer has a title", () => {
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      root.querySelector('[data-pill="keys"]').click();
      const drawer = root.querySelector('.pk-info-drawer[data-drawer="keys"]');
      expect(drawer.querySelector(".pk-info-drawer-title")).not.toBeNull();
    });
  });

  describe("setData()", () => {
    it("updates pill count", () => {
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.PINBOARD });
      infoBar.mount(root);
      infoBar.setData("score", 1500);
      const count = root.querySelector('[data-pill="score"] .pk-info-pill-count');
      expect(count.textContent).toBe("1500");
    });

    it("updates drawer content when open", () => {
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.PINBOARD });
      infoBar.mount(root);
      root.querySelector('[data-pill="score"]').click();
      infoBar.setData("score", 2500);
      const drawer = root.querySelector('.pk-info-drawer[data-drawer="score"]');
      expect(drawer.textContent).toContain("2500");
    });

    it("formats large scores with k suffix", () => {
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.PINBOARD });
      infoBar.mount(root);
      infoBar.setData("score", 12345);
      const count = root.querySelector('[data-pill="score"] .pk-info-pill-count');
      expect(count.textContent).toBe("12.3k");
    });
  });

  describe("zero state styling", () => {
    it("applies zero class when count is 0", () => {
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.PINBOARD });
      infoBar.mount(root);
      infoBar.setData("balls", 0);
      const count = root.querySelector('[data-pill="balls"] .pk-info-pill-count');
      expect(count.classList.contains("pk-info-pill-count--zero")).toBe(true);
    });
  });
});
