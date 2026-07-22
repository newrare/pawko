import { describe, it, expect, beforeEach } from "vitest";
import { HudBar } from "../../src/components/hud-bar.js";

describe("HudBar", () => {
  /** @type {HTMLElement} */
  let root;
  /** @type {HudBar} */
  let hud;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    hud = new HudBar();
  });

  it("mount() appends the HUD element with 4 buttons", () => {
    hud.mount(root);
    const el = root.querySelector(".pk-hud-bar");
    expect(el).not.toBeNull();
    const buttons = el.querySelectorAll(".pk-hud-btn");
    expect(buttons.length).toBe(4);
  });

  it("buttons have correct data-action attributes", () => {
    hud.mount(root);
    const actions = [...root.querySelectorAll("[data-action]")].map(
      (b) => b.dataset.action,
    );
    expect(actions).toContain("level-home");
    expect(actions).toContain("ranking");
    expect(actions).toContain("save-load");
    expect(actions).toContain("settings");
  });

  it("buttons contain the correct SVG icon images", () => {
    hud.mount(root);
    const imgs = [...root.querySelectorAll(".pk-hud-icon")];
    const srcs = imgs.map((img) => img.getAttribute("src"));
    expect(srcs).toContain("images/menu-level.svg");
    expect(srcs).toContain("images/menu-ranking.svg");
    expect(srcs).toContain("images/menu-folder.svg");
    expect(srcs).toContain("images/menu-setting.svg");
  });

  it("destroy() removes the HUD from the DOM", () => {
    hud.mount(root);
    expect(root.querySelector(".pk-hud-bar")).not.toBeNull();
    hud.destroy();
    expect(root.querySelector(".pk-hud-bar")).toBeNull();
  });

  it("destroy() is idempotent", () => {
    hud.mount(root);
    hud.destroy();
    hud.destroy();
    expect(root.querySelector(".pk-hud-bar")).toBeNull();
  });

  it("top-right button has level-home action", () => {
    hud.mount(root);
    const topRight = root.querySelector(".pk-hud-btn--top-right");
    expect(topRight).not.toBeNull();
    expect(topRight.dataset.action).toBe("level-home");
  });

  it("bottom-left button has ranking action", () => {
    hud.mount(root);
    const bottomLeft = root.querySelector(".pk-hud-btn--bottom-left");
    expect(bottomLeft).not.toBeNull();
    expect(bottomLeft.dataset.action).toBe("ranking");
  });

  it("bottom-right group contains folder and settings buttons", () => {
    hud.mount(root);
    const group = root.querySelector(".pk-hud-group--bottom-right");
    expect(group).not.toBeNull();
    const actions = [...group.querySelectorAll("[data-action]")].map(
      (b) => b.dataset.action,
    );
    expect(actions).toEqual(["save-load", "settings"]);
  });

  it("showHome: false hides the top-right level-home button", () => {
    hud.mount(root, { showHome: false });
    expect(root.querySelector(".pk-hud-btn--top-right")).toBeNull();
    const actions = [...root.querySelectorAll("[data-action]")].map(
      (b) => b.dataset.action,
    );
    expect(actions).not.toContain("level-home");
  });

  it("onHomeClick callback fires when level-home button is clicked", () => {
    let clicked = false;
    hud.mount(root, {
      showHome: true,
      onHomeClick: () => {
        clicked = true;
      },
    });
    const btn = root.querySelector("[data-action='level-home']");
    btn.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    expect(clicked).toBe(true);
  });
});
