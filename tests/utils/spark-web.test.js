import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  mountSparkWeb,
  mountSparkArc,
  __test,
} from "../../src/utils/spark-web.js";

describe("spark-web", () => {
  let host;

  beforeEach(() => {
    vi.useFakeTimers();
    host = document.createElement("div");
    host.style.position = "absolute";
    document.body.appendChild(host);
  });

  afterEach(() => {
    /* Module state is shared across tests — reset before switching back to
       real timers so the next test's fake-timer scheduler can re-arm. */
    __test.resetForTest();
    vi.useRealTimers();
    host.remove();
  });

  describe("mountSparkWeb", () => {
    it("appends an SVG with a bolt path as a child of the host", () => {
      mountSparkWeb(host, { radius: 11 });
      const svg = host.querySelector("svg.pk-spark-web");
      expect(svg).not.toBeNull();
      const path = svg.querySelector("path.pk-spark-web__bolts");
      expect(path).not.toBeNull();
      expect(path.getAttribute("d")).toBeTruthy();
    });

    it("sizes the SVG to (radius + padding) * 2", () => {
      mountSparkWeb(host, { radius: 10, padding: 15 });
      const svg = host.querySelector("svg.pk-spark-web");
      expect(svg.getAttribute("width")).toBe("50");
      expect(svg.getAttribute("height")).toBe("50");
      expect(svg.getAttribute("viewBox")).toBe("0 0 50 50");
    });

    it("returns an idempotent unmount function that removes the SVG", () => {
      const unmount = mountSparkWeb(host, { radius: 9 });
      expect(host.querySelector("svg")).not.toBeNull();
      unmount();
      expect(host.querySelector("svg")).toBeNull();
      /* second call must not throw */
      expect(() => unmount()).not.toThrow();
    });

    it("regenerates the path data on each scheduler tick", () => {
      mountSparkWeb(host, { radius: 11 });
      const path = host.querySelector("path.pk-spark-web__bolts");
      const initial = path.getAttribute("d");
      /* Generator is random; loop until we observe a change to dodge the
         (very rare) accidental match. 5 ticks is overwhelmingly enough. */
      let changed = false;
      for (let i = 0; i < 5 && !changed; i++) {
        vi.advanceTimersByTime(100);
        if (path.getAttribute("d") !== initial) changed = true;
      }
      expect(changed).toBe(true);
    });

    it("auto-evicts entries whose SVG has been detached from the DOM", () => {
      mountSparkWeb(host, { radius: 11 });
      expect(__test.live.size).toBe(1);
      const svg = host.querySelector("svg");
      /* Simulate the SVG being torn down by an ancestor removal without the
         unmount fn being called. The next tick should evict it. */
      svg.remove();
      vi.advanceTimersByTime(100);
      expect(__test.live.size).toBe(0);
    });
  });

  describe("generatePathData", () => {
    it("returns a parseable path even when no edges are produced", () => {
      const opts = __test.resolveOpts({
        radius: 11,
        /* Threshold of zero means no two nodes can be 'near' enough. */
        connectionDistMul: 0,
        connectionChance: 1,
      });
      const d = __test.generatePathData(opts);
      expect(d).toBe("M0 0");
    });

    it("produces path commands when connections are guaranteed", () => {
      const opts = __test.resolveOpts({
        radius: 11,
        connectionDistMul: 100,
        connectionChance: 1,
      });
      const d = __test.generatePathData(opts);
      /* Many M/L commands when 14 nodes are all connected. */
      expect(d.length).toBeGreaterThan(20);
      expect(d).toMatch(/M/);
      expect(d).toMatch(/L/);
    });
  });

  describe("mountSparkArc", () => {
    it("positions the SVG over the bounding box of the two endpoints", () => {
      mountSparkArc(host, 50, 80, 200, 90, { padding: 10 });
      const svg = host.querySelector("svg.pk-spark-arc");
      expect(svg).not.toBeNull();
      /* left = min(50,200) - 10 = 40 ; width = |200-50| + 20 = 170 */
      expect(svg.style.left).toBe("40px");
      expect(svg.style.top).toBe("70px");
      expect(svg.getAttribute("width")).toBe("170");
      expect(svg.getAttribute("height")).toBe("30");
    });

    it("draws a path starting near A and ending near B in local coordinates", () => {
      mountSparkArc(host, 50, 80, 200, 90, {
        padding: 10,
        detail: 0,
        branchChance: 0,
      });
      const path = host.querySelector("path.pk-spark-arc__bolt");
      const d = path.getAttribute("d");
      /* detail:0 yields a straight M (A_local) L (B_local). A_local = (10,10),
         B_local = (160,20). */
      expect(d).toMatch(/^M10\.00 10\.00 L160\.00 20\.00$/);
    });

    it("regenerates the bolt path on each scheduler tick", () => {
      mountSparkArc(host, 50, 80, 200, 90);
      const path = host.querySelector("path.pk-spark-arc__bolt");
      const initial = path.getAttribute("d");
      let changed = false;
      for (let i = 0; i < 5 && !changed; i++) {
        vi.advanceTimersByTime(100);
        if (path.getAttribute("d") !== initial) changed = true;
      }
      expect(changed).toBe(true);
    });

    it("returns an idempotent unmount that removes the SVG", () => {
      const unmount = mountSparkArc(host, 0, 0, 100, 0);
      expect(host.querySelector("svg.pk-spark-arc")).not.toBeNull();
      unmount();
      expect(host.querySelector("svg.pk-spark-arc")).toBeNull();
      expect(() => unmount()).not.toThrow();
    });
  });

  describe("generateBolt", () => {
    it("returns at least one polyline starting at A and ending at B", () => {
      const segments = __test.generateBolt(0, 0, 10, 0, {
        detail: 3,
        branchChance: 0,
      });
      expect(segments.length).toBeGreaterThanOrEqual(1);
      const main = segments[0];
      expect(main[0]).toEqual({ x: 0, y: 0 });
      expect(main[main.length - 1]).toEqual({ x: 10, y: 0 });
    });
  });
});
