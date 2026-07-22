import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { InfoBar, INFO_BAR_MODES } from "../../src/components/info-bar.js";
import { bonusManager } from "../../src/managers/bonus-manager.js";
import { abilityManager } from "../../src/managers/ability-manager.js";
import { pegShopManager } from "../../src/managers/peg-shop-manager.js";

vi.mock("../../src/managers/currency-manager.js", () => ({
  currencyManager: {
    get: vi.fn(() => 100),
    on: vi.fn(() => () => {}),
  },
}));

vi.mock("../../src/managers/diamond-manager.js", () => ({
  diamondManager: {
    get: vi.fn(() => 5),
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

vi.mock("../../src/managers/bonus-manager.js", () => ({
  bonusManager: {
    getActiveSession: vi.fn(() => []),
    on: vi.fn(() => () => {}),
  },
}));

vi.mock("../../src/managers/ability-manager.js", () => ({
  abilityManager: {
    getUnlocked: vi.fn(() => []),
    on: vi.fn(() => () => {}),
  },
}));

vi.mock("../../src/managers/peg-shop-manager.js", () => ({
  pegShopManager: {
    getAcquired: vi.fn(() => []),
    on: vi.fn(() => () => {}),
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
    it("renders 5 pills: progress, resources, arsenal, session, permanent", () => {
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      const pills = root.querySelectorAll(".pk-info-pill");
      expect(pills.length).toBe(5);
      const ids = [...pills].map((p) => p.dataset.pill);
      expect(ids).toEqual([
        "progress",
        "resources",
        "arsenal",
        "session",
        "permanent",
      ]);
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

  describe("drawer interaction", () => {
    it("clicking a pill opens its drawer", () => {
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      const pill = root.querySelector('[data-pill="resources"]');
      pill.click();
      const updatedPill = root.querySelector('[data-pill="resources"]');
      expect(
        root.querySelector('.pk-info-drawer[data-drawer="resources"]'),
      ).not.toBeNull();
      expect(updatedPill.classList.contains("pk-info-pill--active")).toBe(true);
    });

    it("clicking another pill closes current and opens new", () => {
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      root.querySelector('[data-pill="resources"]').click();
      root.querySelector('[data-pill="progress"]').click();

      expect(
        root
          .querySelector('[data-pill="resources"]')
          .classList.contains("pk-info-pill--active"),
      ).toBe(false);
      expect(
        root
          .querySelector('[data-pill="progress"]')
          .classList.contains("pk-info-pill--active"),
      ).toBe(true);
      expect(root.querySelectorAll(".pk-info-drawer--open").length).toBe(1);
    });

    it("clicking active pill closes its drawer", () => {
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      root.querySelector('[data-pill="resources"]').click();
      root.querySelector('[data-pill="resources"]').click();
      const pill = root.querySelector('[data-pill="resources"]');
      expect(pill.classList.contains("pk-info-pill--active")).toBe(false);
      expect(root.querySelector(".pk-info-drawer--open")).toBeNull();
    });

    it("drawer has a title", () => {
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      root.querySelector('[data-pill="resources"]').click();
      const drawer = root.querySelector(
        '.pk-info-drawer[data-drawer="resources"]',
      );
      expect(drawer.querySelector(".pk-info-drawer-title")).not.toBeNull();
    });
  });

  describe("setData()", () => {
    it("updates pill count via a count override", () => {
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      infoBar.setData("arsenal", { count: 3 });
      const count = root.querySelector(
        '[data-pill="arsenal"] .pk-info-pill-count',
      );
      expect(count.textContent).toBe("3");
    });

    it("updates drawer content when open", () => {
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      root.querySelector('[data-pill="arsenal"]').click();
      infoBar.setData("arsenal", { count: 2, launchers: 2 });
      const drawer = root.querySelector(
        '.pk-info-drawer[data-drawer="arsenal"]',
      );
      expect(drawer.textContent).toContain("2");
    });
  });

  describe("session pill", () => {
    it("renders 0 | 0 when nothing active", () => {
      bonusManager.getActiveSession.mockReturnValueOnce([]);
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      const count = root.querySelector(
        '[data-pill="session"] .pk-info-pill-count',
      );
      expect(count.textContent).toBe("0 | 0");
    });

    it("counts bonuses and maluses separately", () => {
      bonusManager.getActiveSession.mockReturnValue([
        { id: "a", remaining: 1, def: { category: "bonus", icon: "🚀" } },
        {
          id: "b",
          remaining: Infinity,
          def: { category: "bonus", icon: "🚪" },
        },
        { id: "c", remaining: 1, def: { category: "malus", icon: "🧊" } },
      ]);
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      const count = root.querySelector(
        '[data-pill="session"] .pk-info-pill-count',
      );
      expect(count.textContent).toBe("2 | 1");
      bonusManager.getActiveSession.mockReturnValue([]);
    });

    it("drawer shows empty message when no entries", () => {
      bonusManager.getActiveSession.mockReturnValue([]);
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      root.querySelector('[data-pill="session"]').click();
      const drawer = root.querySelector(
        '.pk-info-drawer[data-drawer="session"]',
      );
      expect(drawer.querySelector(".pk-info-drawer-empty")).not.toBeNull();
    });

    it("drawer lists each active entry with icon", () => {
      bonusManager.getActiveSession.mockReturnValue([
        {
          id: "session_destroy_coins_x3",
          remaining: Infinity,
          def: { category: "bonus", icon: "🪙" },
        },
        {
          id: "malus_add_ice_ball",
          remaining: 1,
          def: { category: "malus", icon: "🧊" },
        },
      ]);
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      root.querySelector('[data-pill="session"]').click();
      const entries = root.querySelectorAll(
        '[data-drawer="session"] .pk-info-entry',
      );
      expect(entries.length).toBe(2);
      bonusManager.getActiveSession.mockReturnValue([]);
    });
  });

  describe("permanent pill", () => {
    it("renders 0 | 0 when nothing unlocked", () => {
      abilityManager.getUnlocked.mockReturnValueOnce([]);
      pegShopManager.getAcquired.mockReturnValueOnce([]);
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      const count = root.querySelector(
        '[data-pill="permanent"] .pk-info-pill-count',
      );
      expect(count.textContent).toBe("0 | 0");
    });

    it("counts abilities and boutique pegs separately", () => {
      abilityManager.getUnlocked.mockReturnValue(["shop_1", "gate_1", "map_1"]);
      pegShopManager.getAcquired.mockReturnValue(["ice"]);
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      const count = root.querySelector(
        '[data-pill="permanent"] .pk-info-pill-count',
      );
      expect(count.textContent).toBe("3 | 1");
      abilityManager.getUnlocked.mockReturnValue([]);
      pegShopManager.getAcquired.mockReturnValue([]);
    });

    it("drawer shows empty message when nothing unlocked", () => {
      abilityManager.getUnlocked.mockReturnValue([]);
      pegShopManager.getAcquired.mockReturnValue([]);
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      root.querySelector('[data-pill="permanent"]').click();
      const drawer = root.querySelector(
        '.pk-info-drawer[data-drawer="permanent"]',
      );
      expect(drawer.querySelector(".pk-info-drawer-empty")).not.toBeNull();
    });

    it("drawer renders ability and boutique-peg entries", () => {
      abilityManager.getUnlocked.mockReturnValue(["gate_1"]);
      pegShopManager.getAcquired.mockReturnValue(["ice"]);
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      root.querySelector('[data-pill="permanent"]').click();
      const entries = root.querySelectorAll(
        '[data-drawer="permanent"] .pk-info-entry',
      );
      expect(entries.length).toBe(2);
      abilityManager.getUnlocked.mockReturnValue([]);
      pegShopManager.getAcquired.mockReturnValue([]);
    });
  });

  describe("zero state styling", () => {
    it("applies zero class when count is 0", () => {
      infoBar = new InfoBar({ mode: INFO_BAR_MODES.EXPLORATION });
      infoBar.mount(root);
      infoBar.setData("arsenal", { count: 0 });
      const count = root.querySelector(
        '[data-pill="arsenal"] .pk-info-pill-count',
      );
      expect(count.classList.contains("pk-info-pill-count--zero")).toBe(true);
    });
  });
});
