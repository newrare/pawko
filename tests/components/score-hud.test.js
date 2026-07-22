import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ScoreHud } from "../../src/components/score-hud.js";

describe("ScoreHud", () => {
  /** @type {HTMLElement} */
  let root;
  /** @type {ScoreHud} */
  let hud;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    hud = new ScoreHud();
    hud.mount(root);
  });

  afterEach(() => {
    hud.destroy();
    root.remove();
    vi.useRealTimers();
  });

  const text = (role) =>
    root.querySelector(`[data-role="${role}"]`)?.textContent;

  it("renders hits and multiplier slots (no objective)", () => {
    expect(root.querySelector(".pk-score-hud")).not.toBeNull();
    expect(root.querySelector(".pk-score-objective")).toBeNull();
    expect(text("hits")).toBe("0");
    expect(text("mult")).toBe("×1");
  });

  it("updates each counter through its setter", () => {
    hud.setHitScore(250);
    hud.setMultiplier(4);
    expect(text("hits")).toBe(new Intl.NumberFormat().format(250));
    expect(text("mult")).toBe("×4");
  });

  it("exposes the hits element as the fly-to-score target", () => {
    expect(hud.hitsEl).toBe(root.querySelector('[data-role="hits"]'));
  });

  it("exposes the multiplier element as the ball→mult fly target", () => {
    expect(hud.multEl).toBe(root.querySelector('[data-role="mult"]'));
  });

  it("bumps the hits counter on update", () => {
    hud.setHitScore(10);
    expect(
      root
        .querySelector('[data-role="hits"]')
        .classList.contains("pk-score-bump"),
    ).toBe(true);
  });

  const hudEl = () => root.querySelector(".pk-score-hud");

  it("is dim (not active) at rest", () => {
    expect(hudEl().classList.contains("pk-score-hud--active")).toBe(false);
  });

  it("fades in when the score moves, then fades out after the idle window", () => {
    vi.useFakeTimers();
    hud.setHitScore(10);
    expect(hudEl().classList.contains("pk-score-hud--active")).toBe(true);
    vi.advanceTimersByTime(ScoreHud.IDLE_FADE_MS + 50);
    expect(hudEl().classList.contains("pk-score-hud--active")).toBe(false);
  });

  it("dim() forces it back to the resting state immediately", () => {
    hud.setMultiplier(3);
    expect(hudEl().classList.contains("pk-score-hud--active")).toBe(true);
    hud.dim();
    expect(hudEl().classList.contains("pk-score-hud--active")).toBe(false);
  });

  it("stays visible during the reveal and ignores dim()", async () => {
    vi.useFakeTimers();
    const done = hud.reveal({ finalScore: 400, victory: true });
    expect(hudEl().classList.contains("pk-score-hud--active")).toBe(true);
    hud.dim();
    expect(hudEl().classList.contains("pk-score-hud--active")).toBe(true);
    await vi.advanceTimersByTimeAsync(2000);
    await done;
    expect(hudEl().classList.contains("pk-score-hud--active")).toBe(true);
  });

  it("reveal() counts up to the final score and tags the win outcome", async () => {
    vi.useFakeTimers();
    const done = hud.reveal({ finalScore: 900, victory: true });
    await vi.advanceTimersByTimeAsync(2000);
    await done;
    const finalEl = root.querySelector('[data-role="final"]');
    expect(finalEl.textContent).toBe(new Intl.NumberFormat().format(900));
    expect(finalEl.classList.contains("pk-score-final--show")).toBe(true);
    expect(finalEl.classList.contains("pk-score-final--win")).toBe(true);
    expect(finalEl.classList.contains("pk-score-final--lose")).toBe(false);
    expect(finalEl.classList.contains("pk-score-final--settled")).toBe(true);
  });

  it("reveal() tags the lose outcome", async () => {
    vi.useFakeTimers();
    const done = hud.reveal({ finalScore: 120, victory: false });
    await vi.advanceTimersByTimeAsync(2000);
    await done;
    const finalEl = root.querySelector('[data-role="final"]');
    expect(finalEl.classList.contains("pk-score-final--lose")).toBe(true);
    expect(finalEl.classList.contains("pk-score-final--win")).toBe(false);
  });

  it("setVerticalCenter positions the HUD via top", () => {
    hud.setVerticalCenter(123.6);
    expect(root.querySelector(".pk-score-hud").style.top).toBe("124px");
  });

  it("reveal() with steps grows the total one multiplier at a time", async () => {
    vi.useFakeTimers();
    const totals = [];
    // base 100, steps [1, 2] → multiplier 1 → 2 → 4, final 400
    const done = hud.reveal({
      finalScore: 400,
      victory: true,
      hitScore: 100,
      steps: [1, 2],
      onStep: (t) => totals.push(t),
    });
    await vi.advanceTimersByTimeAsync(6000);
    await done;
    const finalEl = root.querySelector('[data-role="final"]');
    expect(finalEl.textContent).toBe(new Intl.NumberFormat().format(400));
    expect(finalEl.classList.contains("pk-score-final--win")).toBe(true);
    expect(finalEl.classList.contains("pk-score-final--settled")).toBe(true);
    // onStep fires with base then each multiplied total
    expect(totals).toEqual([100, 200, 400]);
    // the multiplier badge ends at the final multiplier
    expect(text("mult")).toBe("×4");
  });
});
