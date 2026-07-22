import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GameController } from "../../src/controllers/game-controller.js";

/**
 * Integration smoke test for the cannon firing flow. happy-dom has no real
 * layout engine (getBoundingClientRect returns zeroes), so this exercises the
 * DOM wiring and state transitions rather than pixel-accurate physics.
 */
describe("GameController — cannon", () => {
  let root;

  beforeEach(() => {
    // rAF/cAF are used by the aim throttle and the physics loop.
    vi.stubGlobal("requestAnimationFrame", (cb) =>
      setTimeout(() => cb(performance.now()), 0),
    );
    vi.stubGlobal("cancelAnimationFrame", (id) => clearTimeout(id));
    root = document.createElement("div");
    document.body.appendChild(root);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Dispatch an aim gesture: pointerdown on the pinboard, pointerup on window. */
  function aimAndFire() {
    const pinboard = root.querySelector('[data-role="pinboard"]');
    pinboard.dispatchEvent(
      new MouseEvent("pointerdown", {
        bubbles: true,
        clientX: 40,
        clientY: 120,
      }),
    );
    window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
  }

  it("loads one ball per level into the cannon", () => {
    const c = new GameController({ root, data: { levelId: 4 } });
    c.start();
    const count = root.querySelector('[data-role="cannon-count"]');
    expect(count.textContent).toBe("4");
    c.destroy();
  });

  it("caps the loaded balls at level 20", () => {
    const c = new GameController({ root, data: { levelId: 99 } });
    c.start();
    expect(root.querySelector('[data-role="cannon-count"]').textContent).toBe(
      "20",
    );
    c.destroy();
  });

  it("fires one ball per shot and decrements the counter", () => {
    const c = new GameController({ root, data: { levelId: 3 } });
    c.start();

    aimAndFire();

    // A ball entered play and the cannon lost one.
    expect(root.querySelectorAll(".pk-ball").length).toBe(1);
    expect(root.querySelector('[data-role="cannon-count"]').textContent).toBe(
      "2",
    );
    c.destroy();
  });

  it("marks the cannon empty after the last shot", () => {
    const c = new GameController({ root, data: { levelId: 1 } });
    c.start();
    const cannonEl = root.querySelector('[data-role="cannon"]');
    expect(cannonEl.hasAttribute("data-empty")).toBe(false);

    aimAndFire();

    expect(root.querySelector('[data-role="cannon-count"]').textContent).toBe(
      "0",
    );
    expect(cannonEl.hasAttribute("data-empty")).toBe(true);
    c.destroy();
  });

  it("does not fire once the cannon is empty", () => {
    const c = new GameController({ root, data: { levelId: 1 } });
    c.start();
    aimAndFire(); // uses the only ball
    aimAndFire(); // should be a no-op
    expect(root.querySelectorAll(".pk-ball").length).toBe(1);
    c.destroy();
  });
});
