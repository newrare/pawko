import { describe, it, expect, beforeEach } from "vitest";
import { SceneRouter } from "../../src/scenes/scene-router.js";

/**
 * Minimal test scenes. `hideHud` keeps the HudBar out of the way so the
 * assertions focus on the router's own bookkeeping.
 */
class TargetScene {
  static hideHud = true;
  static mounted = 0;
  static destroyed = 0;
  mount(root) {
    TargetScene.mounted += 1;
    this.el = document.createElement("div");
    this.el.className = "target-scene";
    root.appendChild(this.el);
  }
  destroy() {
    TargetScene.destroyed += 1;
    this.el?.remove();
  }
}

/** A scene that redirects to TargetScene from inside its own mount(). */
class RedirectScene {
  static hideHud = true;
  static destroyed = 0;
  constructor(router) {
    this.router = router;
  }
  mount(root) {
    this.el = document.createElement("div");
    this.el.className = "redirect-scene";
    root.appendChild(this.el);
    this.router.start(TargetScene);
  }
  destroy() {
    RedirectScene.destroyed += 1;
    this.el?.remove();
  }
}

describe("SceneRouter re-entrant start()", () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = "";
    container = document.createElement("div");
    document.body.appendChild(container);
    TargetScene.mounted = 0;
    TargetScene.destroyed = 0;
    RedirectScene.destroyed = 0;
  });

  it("keeps only the redirected-to scene in the DOM", () => {
    const router = new SceneRouter(container);
    router.start(RedirectScene);

    /* The orphaned RedirectScene must be torn down, TargetScene kept once. */
    expect(RedirectScene.destroyed).toBe(1);
    expect(TargetScene.mounted).toBe(1);
    expect(TargetScene.destroyed).toBe(0);
    expect(container.querySelectorAll(".redirect-scene")).toHaveLength(0);
    expect(container.querySelectorAll(".target-scene")).toHaveLength(1);
    /* Exactly one scene element remains under the container. */
    expect(container.querySelectorAll(".gt-scene")).toHaveLength(1);
  });

  it("destroys the redirected-to scene when navigating away", () => {
    const router = new SceneRouter(container);
    router.start(RedirectScene);
    /* Navigating on (as clicking Home would) must destroy the live
       TargetScene and leave nothing behind — the reported leak. */
    router.start(TargetScene);

    expect(TargetScene.destroyed).toBe(1);
    expect(container.querySelectorAll(".gt-scene")).toHaveLength(1);
    expect(container.querySelectorAll(".target-scene")).toHaveLength(1);
  });
});
