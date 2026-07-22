/**
 * Spark Web — dense network of micro-lightning bolts forming a purple
 * mesh around a peg or ball.
 *
 * Adapted from the "Spark Web" canvas demo in drafts/preview-electric-v2.html.
 * Re-implemented as a single SVG path so it fits the project's DOM-only
 * rendering rule: no canvas, no per-frame loops you don't own.
 *
 * Each mounted web registers with a shared scheduler so all live webs
 * regenerate on the same beat (cheaper than N independent intervals and
 * keeps the visual flicker synchronised across pegs).
 */

const SVG_NS = "http://www.w3.org/2000/svg";

/* --- Shared scheduler --------------------------------------------------- */

/**
 * Entries are minimal: each owns its own `regen()` closure so the scheduler
 * doesn't need to know whether it's a web, an arc, or anything else.
 *
 * @type {Set<{ svg: SVGSVGElement, regen: () => void }>}
 */
const live = new Set();
/** @type {number|null} */
let intervalId = null;
const REGEN_INTERVAL_MS = 90;

function startScheduler() {
  if (intervalId !== null) return;
  intervalId = setInterval(tick, REGEN_INTERVAL_MS);
}

function stopScheduler() {
  if (intervalId === null) return;
  clearInterval(intervalId);
  intervalId = null;
}

function tick() {
  for (const entry of [...live]) {
    /* Use document.contains rather than `isConnected` because some test
       environments (older jsdom) leave `isConnected` stuck at true. */
    const doc = entry.svg.ownerDocument;
    if (!doc || !doc.contains(entry.svg)) {
      live.delete(entry);
      continue;
    }
    entry.regen();
  }
  if (live.size === 0) stopScheduler();
}

/* --- Geometry helpers --------------------------------------------------- */

/**
 * Generate a lightning bolt polyline from (x1,y1) to (x2,y2) via midpoint
 * displacement. Returns an array of polylines (the first is the main path,
 * the rest are branches).
 *
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {{ detail?: number, jitter?: number, branchChance?: number, branchScale?: number, branchAngle?: number }} [opts]
 * @returns {{x:number,y:number}[][]}
 */
function generateBolt(x1, y1, x2, y2, opts = {}) {
  const {
    detail = 3,
    jitter = 0.35,
    branchChance = 0.15,
    branchScale = 0.3,
    branchAngle = 0.5,
  } = opts;

  const segments = [];

  function subdivide(ax, ay, bx, by, depth, scale) {
    if (depth <= 0)
      return [
        { x: ax, y: ay },
        { x: bx, y: by },
      ];
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const offset = (Math.random() - 0.5) * len * jitter * scale;
    const px = mx + nx * offset;
    const py = my + ny * offset;

    const left = subdivide(ax, ay, px, py, depth - 1, scale);
    const right = subdivide(px, py, bx, by, depth - 1, scale);
    const path = left.concat(right.slice(1));

    if (Math.random() < branchChance * scale && depth > 1) {
      const angle =
        Math.atan2(by - ay, bx - ax) + (Math.random() - 0.5) * branchAngle * 2;
      const branchLen = len * branchScale * (0.3 + Math.random() * 0.4);
      const bex = px + Math.cos(angle) * branchLen;
      const bey = py + Math.sin(angle) * branchLen;
      const branch = subdivide(px, py, bex, bey, depth - 2, scale * 0.6);
      segments.push(branch);
    }
    return path;
  }

  const main = subdivide(x1, y1, x2, y2, detail, 1.0);
  segments.unshift(main);
  return segments;
}

/**
 * Build the spark-web path string for the given config. Coordinates are
 * in SVG user units (== px since the viewBox matches the rendered size).
 *
 * @param {ResolvedOpts} opts
 * @returns {string} SVG path `d` attribute value
 */
function generatePathData(opts) {
  const {
    cx,
    cy,
    radius,
    nodeCount,
    connectionDist,
    connectionChance,
    detail,
  } = opts;
  const nodes = [];
  for (let i = 0; i < nodeCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = radius + (Math.random() - 0.3) * (radius * 0.31);
    nodes.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
    });
  }

  const parts = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[j].x - nodes[i].x;
      const dy = nodes[j].y - nodes[i].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= connectionDist || Math.random() >= connectionChance) continue;
      const bolt = generateBolt(
        nodes[i].x,
        nodes[i].y,
        nodes[j].x,
        nodes[j].y,
        {
          detail,
          jitter: 0.35,
          branchChance: 0.15,
          branchScale: 0.3,
        },
      );
      for (const polyline of bolt) {
        for (let k = 0; k < polyline.length; k++) {
          const p = polyline[k];
          parts.push(
            `${k === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`,
          );
        }
      }
    }
  }
  /* Always return something parseable — an empty `d` would throw a warning
     in some browsers when the SVG is re-rendered. */
  return parts.join(" ") || "M0 0";
}

/* --- Public API --------------------------------------------------------- */

/**
 * @typedef {Object} SparkWebOpts
 * @property {number} [radius]            Visual radius of the host element (px).
 * @property {number} [padding]           Extra space around the host for the web (px).
 * @property {number} [nodeCount]         How many surface nodes to sample per regen.
 * @property {number} [connectionDistMul] Multiplier on `radius` for max edge length.
 * @property {number} [connectionChance]  Probability of connecting two near nodes (0..1).
 * @property {number} [detail]            Recursion depth for each bolt (subdivision count).
 *
 * @typedef {Required<SparkWebOpts> & { cx: number, cy: number }} ResolvedOpts
 */

/**
 * Mount a spark-web SVG inside `host`. The SVG is appended as the last
 * child and the host's positioning is not changed — the caller is
 * expected to give `host` `position: relative` (or absolute).
 *
 * @param {HTMLElement} host
 * @param {SparkWebOpts} [opts]
 * @returns {() => void} Unmount function (idempotent).
 */
export function mountSparkWeb(host, opts = {}) {
  const resolved = resolveOpts(opts);
  const size = (resolved.radius + resolved.padding) * 2;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "pk-spark-web");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("class", "pk-spark-web__bolts");
  path.setAttribute("d", generatePathData(resolved));
  svg.appendChild(path);

  host.appendChild(svg);
  const entry = {
    svg,
    regen: () => path.setAttribute("d", generatePathData(resolved)),
  };
  live.add(entry);
  startScheduler();

  let unmounted = false;
  return () => {
    if (unmounted) return;
    unmounted = true;
    live.delete(entry);
    svg.remove();
    if (live.size === 0) stopScheduler();
  };
}

/* --- Spark Arc — animated lightning bolt between two points ------------ */

/**
 * @typedef {Object} SparkArcOpts
 * @property {number} [padding]      Extra space around the bolt in SVG units (px).
 * @property {number} [detail]       Subdivision depth — higher = more jagged.
 * @property {number} [jitter]       Displacement factor of midpoints (0..1).
 * @property {number} [branchChance] Probability of spawning a side branch.
 * @property {number} [branchScale]  Length of branches relative to segment.
 */

/**
 * Mount a single animated lightning bolt between two points in `host`'s
 * coordinate space. The SVG is sized to the segment's bounding box plus
 * `padding` so branches that overshoot the axis stay visible.
 *
 * `host` must establish a positioning context — the SVG is `position:
 * absolute`. Coordinates `ax, ay, bx, by` are in host's pixel space.
 *
 * @param {HTMLElement} host
 * @param {number} ax
 * @param {number} ay
 * @param {number} bx
 * @param {number} by
 * @param {SparkArcOpts} [opts]
 * @returns {() => void} Unmount function (idempotent).
 */
export function mountSparkArc(host, ax, ay, bx, by, opts = {}) {
  const {
    padding = 10,
    detail = 5,
    jitter = 0.45,
    branchChance = 0.45,
    branchScale = 0.45,
  } = opts;

  const left = Math.min(ax, bx) - padding;
  const top = Math.min(ay, by) - padding;
  const width = Math.abs(bx - ax) + padding * 2;
  const height = Math.abs(by - ay) + padding * 2;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "pk-spark-arc");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("aria-hidden", "true");
  svg.style.left = `${left}px`;
  svg.style.top = `${top}px`;

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("class", "pk-spark-arc__bolt");
  svg.appendChild(path);
  host.appendChild(svg);

  /* Endpoints in the SVG's local coordinate system. */
  const localAx = ax - left;
  const localAy = ay - top;
  const localBx = bx - left;
  const localBy = by - top;

  const regen = () => {
    const bolt = generateBolt(localAx, localAy, localBx, localBy, {
      detail,
      jitter,
      branchChance,
      branchScale,
    });
    const parts = [];
    for (const polyline of bolt) {
      for (let k = 0; k < polyline.length; k++) {
        const p = polyline[k];
        parts.push(`${k === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
      }
    }
    path.setAttribute("d", parts.join(" ") || "M0 0");
  };

  regen();
  const entry = { svg, regen };
  live.add(entry);
  startScheduler();

  let unmounted = false;
  return () => {
    if (unmounted) return;
    unmounted = true;
    live.delete(entry);
    svg.remove();
    if (live.size === 0) stopScheduler();
  };
}

/**
 * @param {SparkWebOpts} opts
 * @returns {ResolvedOpts}
 */
function resolveOpts(opts) {
  const radius = opts.radius ?? 11;
  const padding = opts.padding ?? Math.round(radius * 1.6);
  const size = (radius + padding) * 2;
  return {
    radius,
    padding,
    nodeCount: opts.nodeCount ?? 14,
    connectionDistMul: opts.connectionDistMul ?? 1.4,
    connectionChance: opts.connectionChance ?? 0.6,
    detail: opts.detail ?? 3,
    cx: size / 2,
    cy: size / 2,
    /* Derived once so the inner loop doesn't repeat the multiplication. */
    get connectionDist() {
      return this.radius * this.connectionDistMul;
    },
  };
}

/* --- Test hooks --------------------------------------------------------- */

/** @internal — exposed for tests; do not depend on this in app code. */
export const __test = {
  generateBolt,
  generatePathData,
  live,
  resolveOpts,
  /* Vitest swaps the timer system between tests; the cached intervalId
     becomes stale and `startScheduler` then refuses to re-arm. Reset
     forces a clean state between fake-timer test runs. */
  resetForTest() {
    for (const entry of [...live]) {
      entry.svg.remove();
      live.delete(entry);
    }
    stopScheduler();
  },
};
