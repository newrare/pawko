import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/* Mutable wallet + bonus state and captured change handlers, so a test can
   flip a value and fire the subscription to assert the HUD re-renders. */
const { state } = vi.hoisted(() => ({
  state: {
    coins: 100,
    diamonds: 5,
    active: [],
    coinCb: null,
    diamondCb: null,
    bonusCb: null,
  },
}));

vi.mock("../../src/managers/currency-manager.js", () => ({
  currencyManager: {
    get: () => state.coins,
    on: (_evt, cb) => {
      state.coinCb = cb;
      return () => {};
    },
  },
}));

vi.mock("../../src/managers/diamond-manager.js", () => ({
  diamondManager: {
    get: () => state.diamonds,
    on: (_evt, cb) => {
      state.diamondCb = cb;
      return () => {};
    },
  },
}));

vi.mock("../../src/managers/bonus-manager.js", () => ({
  bonusManager: {
    getActiveSession: () =>
      state.active.map((id) => ({
        id,
        remaining: Infinity,
        def: { icon: "circle-plus" },
      })),
    on: (_evt, cb) => {
      state.bonusCb = cb;
      return () => {};
    },
  },
}));

import { CurrencyHud } from "../../src/components/currency-hud.js";

describe("CurrencyHud", () => {
  /** @type {HTMLElement} */
  let root;
  /** @type {CurrencyHud} */
  let hud;

  const coins = () => root.querySelector('[data-role="coins"]')?.textContent;
  const diamonds = () =>
    root.querySelector('[data-role="diamonds"]')?.textContent;
  const slots = () => root.querySelectorAll(".pk-currency-hud-slot");

  beforeEach(() => {
    state.coins = 100;
    state.diamonds = 5;
    state.active = [];
    root = document.createElement("div");
    document.body.appendChild(root);
    hud = new CurrencyHud();
    hud.mount(root);
  });

  afterEach(() => {
    hud.destroy();
    root.remove();
  });

  it("mounts the currency HUD element", () => {
    expect(root.querySelector(".pk-currency-hud")).not.toBeNull();
  });

  it("renders coin and diamond counts from the wallets", () => {
    expect(coins()).toBe("100");
    expect(diamonds()).toBe("5");
  });

  it("re-renders when the coin wallet changes", () => {
    state.coins = 250;
    state.coinCb();
    expect(coins()).toBe("250");
  });

  it("re-renders when the diamond wallet changes", () => {
    state.diamonds = 9;
    state.diamondCb();
    expect(diamonds()).toBe("9");
  });

  it("renders exactly 3 active-reward slots", () => {
    expect(slots().length).toBe(3);
  });

  it("leaves all slots empty when no reward is active", () => {
    for (const slot of slots()) {
      expect(slot.classList.contains("pk-currency-hud-slot--filled")).toBe(
        false,
      );
      expect(slot.textContent).toBe("");
    }
  });

  it("fills the leading slots with active-reward icons", () => {
    state.active = ["a", "b"];
    state.bonusCb();
    const s = slots();
    expect(s[0].classList.contains("pk-currency-hud-slot--filled")).toBe(true);
    expect(s[0].querySelector("svg.pk-icon")).not.toBeNull();
    expect(s[1].classList.contains("pk-currency-hud-slot--filled")).toBe(true);
    expect(s[2].classList.contains("pk-currency-hud-slot--filled")).toBe(false);
  });

  it("caps the filled slots at 3 even with more rewards", () => {
    state.active = ["a", "b", "c", "d", "e"];
    state.bonusCb();
    const filled = [...slots()].filter((s) =>
      s.classList.contains("pk-currency-hud-slot--filled"),
    );
    expect(slots().length).toBe(3);
    expect(filled.length).toBe(3);
  });

  it("destroy() removes the element", () => {
    hud.destroy();
    expect(root.querySelector(".pk-currency-hud")).toBeNull();
  });

  it("destroy() is idempotent", () => {
    hud.destroy();
    hud.destroy();
    expect(root.querySelector(".pk-currency-hud")).toBeNull();
  });
});
