import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CentralScore } from "../../src/components/central-score.js";

describe("CentralScore", () => {
  /** @type {HTMLElement} */
  let root;
  /** @type {CentralScore} */
  let cs;

  const el = () => root.querySelector(".pk-cscore");
  const valueEl = () => root.querySelector('[data-role="total"]');
  const fmt = (n) => new Intl.NumberFormat().format(n);

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    cs = new CentralScore();
    cs.mount(root);
  });

  afterEach(() => {
    cs.destroy();
    root.remove();
    vi.useRealTimers();
  });

  it("mounts centered with a value, a sunburst and a hidden continue button", () => {
    expect(el()).not.toBeNull();
    expect(root.querySelector(".pk-cscore-sunburst")).not.toBeNull();
    expect(valueEl().textContent).toBe("0");
    expect(el().classList.contains("pk-cscore--foreground")).toBe(false);
  });

  it("setScore updates the live value (background watermark during play)", () => {
    cs.setScore(1234);
    expect(valueEl().textContent).toBe(fmt(1234));
    expect(cs.valueEl).toBe(valueEl());
  });

  it("enterForeground brings the number forward without revealing the outcome", () => {
    cs.enterForeground();
    expect(el().classList.contains("pk-cscore--foreground")).toBe(true);
    expect(el().classList.contains("pk-cscore--outcome")).toBe(false);
    expect(el().classList.contains("pk-cscore--win")).toBe(false);
    expect(el().classList.contains("pk-cscore--lose")).toBe(false);
  });

  it("revealOutcome blooms the outcome and tags win/lose", () => {
    cs.revealOutcome(true);
    expect(el().classList.contains("pk-cscore--outcome")).toBe(true);
    expect(el().classList.contains("pk-cscore--win")).toBe(true);
    expect(el().classList.contains("pk-cscore--lose")).toBe(false);
  });

  it("applyStep counts the total up and pops a blue ×N label", async () => {
    vi.useFakeTimers();
    cs.setScore(100);
    let done = false;
    cs.applyStep(200, 2, () => (done = true));
    // The blue label is popped immediately on the step.
    const pop = root.querySelector(".pk-cscore-mult-pop");
    expect(pop).not.toBeNull();
    expect(pop.textContent).toBe("×2");
    await vi.advanceTimersByTimeAsync(400);
    expect(done).toBe(true);
    expect(valueEl().textContent).toBe(fmt(200));
  });

  it("finish settles the total, shows the Continue button, and fires onContinue", () => {
    const onContinue = vi.fn();
    cs.finish(880, { continueLabel: "Continue", onContinue });
    expect(valueEl().textContent).toBe(fmt(880));
    expect(el().classList.contains("pk-cscore--settled")).toBe(true);
    const btn = root.querySelector('[data-action="continue"]');
    expect(btn.querySelector(".gt-btn-label").textContent).toBe("Continue");
    btn.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("spawns rising lava embers on defeat but not on victory", () => {
    cs.revealOutcome(true);
    expect(root.querySelectorAll(".pk-cscore-ember").length).toBe(0);
    cs.revealOutcome(false);
    expect(root.querySelectorAll(".pk-cscore-ember").length).toBeGreaterThan(0);
  });

  it("shows a dramatic Game Over and a New run button only on defeat", () => {
    const onContinue = vi.fn();
    cs.revealOutcome(false);
    expect(el().classList.contains("pk-cscore--lose")).toBe(true);
    // Game Over text is only set/shown at settle (after the total finishes).
    const go = root.querySelector('[data-role="gameover"]');
    expect(go.textContent).toBe("");

    cs.finish(120, {
      continueLabel: "New run",
      gameOverLabel: "Game Over",
      onContinue,
    });
    expect(go.textContent).toBe("Game Over");
    expect(el().classList.contains("pk-cscore--settled")).toBe(true);
    const btn = root.querySelector('[data-action="continue"]');
    expect(btn.querySelector(".gt-btn-label").textContent).toBe("New run");
    btn.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("destroy() removes the element, idempotently", () => {
    cs.destroy();
    expect(root.querySelector(".pk-cscore")).toBeNull();
    cs.destroy();
    expect(root.querySelector(".pk-cscore")).toBeNull();
  });
});
