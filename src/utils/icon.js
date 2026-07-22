import {
  Ban,
  Banknote,
  Bomb,
  Check,
  ChevronsDown,
  CircleDot,
  CircleHelp,
  CirclePlus,
  Club,
  Coins,
  Dices,
  Diamond,
  DoorOpen,
  Droplet,
  EyeOff,
  Flame,
  Gem,
  Heart,
  Hourglass,
  Infinity as InfinityIcon,
  Lock,
  Map as MapIcon,
  Package,
  Recycle,
  RotateCw,
  Save,
  Shield,
  ShoppingCart,
  Snowflake,
  Spade,
  Sparkles,
  Target,
  Tornado,
  TrendingDown,
  Zap,
} from "lucide";

/**
 * Inline SVG icon helper — self-hosted Lucide, no CDN.
 *
 * Lucide ships every icon as an array of `[tag, attrs]` node tuples. This
 * module renders one to a standalone SVG **string** so it can be dropped
 * straight into the `innerHTML` templates the game builds everywhere — no
 * post-render `createIcons()` pass, no DOM placeholders.
 *
 * Icons are pulled in as **named imports** and registered below, so the
 * bundler tree-shakes Lucide down to just the handful the game uses (never
 * the full ~2000-icon set). Adding a new icon = add its import + a
 * `REGISTRY` entry.
 *
 * Icons stroke with `currentColor`, so their colour follows the CSS `color`
 * of the host element. Reach for the design tokens (`var(--gt-color-…)`) on
 * that host to tint an icon — never hardcode a colour here. See the
 * Styleguide scene for the palette in context.
 *
 * @example
 *   el.innerHTML = iconSvg("gem", { size: 20, cls: "pk-icon--gold" });
 */

/**
 * Curated registry: kebab-case name → Lucide node tuples. Keep this the
 * single source of the game's icon vocabulary.
 * @type {Record<string, Array<[string, Record<string, string | number>]>>}
 */
const REGISTRY = {
  ban: Ban,
  banknote: Banknote,
  bomb: Bomb,
  check: Check,
  "chevrons-down": ChevronsDown,
  "circle-dot": CircleDot,
  "circle-help": CircleHelp,
  "circle-plus": CirclePlus,
  club: Club,
  coins: Coins,
  dices: Dices,
  diamond: Diamond,
  "door-open": DoorOpen,
  droplet: Droplet,
  "eye-off": EyeOff,
  flame: Flame,
  gem: Gem,
  heart: Heart,
  hourglass: Hourglass,
  infinity: InfinityIcon,
  lock: Lock,
  map: MapIcon,
  package: Package,
  recycle: Recycle,
  "rotate-cw": RotateCw,
  save: Save,
  shield: Shield,
  "shopping-cart": ShoppingCart,
  snowflake: Snowflake,
  spade: Spade,
  sparkles: Sparkles,
  target: Target,
  tornado: Tornado,
  "trending-down": TrendingDown,
  zap: Zap,
};

/** Fallback rendered when a requested icon name is not in the registry. */
const FALLBACK_ICON = "circle-help";

/** Base wrapper attributes shared by every rendered icon. */
const BASE_SVG_ATTRS = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
};

/** @type {Set<string>} Names already warned about, to avoid console spam. */
const warned = new Set();

/**
 * Resolve a registered icon name to its node tuples, falling back (with a
 * one-time warning) to {@link FALLBACK_ICON} when the name is unknown.
 * @param {string} name  kebab-case Lucide icon name
 * @returns {Array<[string, Record<string, string | number>]>}
 */
function resolveNodes(name) {
  const nodes = REGISTRY[name];
  if (nodes) return nodes;
  if (!warned.has(name)) {
    warned.add(name);
    console.warn(`[icon] unregistered icon "${name}" — using fallback.`);
  }
  return REGISTRY[FALLBACK_ICON];
}

/**
 * Serialise an attribute map to a stable, space-joined string.
 * @param {Record<string, string | number>} attrs
 * @returns {string}
 */
function serializeAttrs(attrs) {
  return Object.entries(attrs)
    .map(([key, value]) => `${key}="${String(value).replace(/"/g, "&quot;")}"`)
    .join(" ");
}

/**
 * Render a Lucide icon to an inline SVG string.
 *
 * @param {string} name  kebab-case Lucide icon name (e.g. `"gem"`,
 *   `"shopping-cart"`). Names outside the registry fall back to a help circle.
 * @param {object} [opts]
 * @param {number} [opts.size=24]  width/height in px.
 * @param {string} [opts.cls=""]  extra class names appended after `pk-icon`.
 * @param {number} [opts.strokeWidth=2]  stroke width.
 * @param {string} [opts.title]  accessible label; when set the icon becomes
 *   `role="img"`, otherwise it is `aria-hidden`.
 * @returns {string} an `<svg>…</svg>` string.
 */
export function iconSvg(name, opts = {}) {
  const { size = 24, cls = "", strokeWidth = 2, title } = opts;

  const svgAttrs = {
    ...BASE_SVG_ATTRS,
    width: size,
    height: size,
    "stroke-width": strokeWidth,
    class: cls ? `pk-icon ${cls}` : "pk-icon",
  };
  if (title) {
    svgAttrs.role = "img";
    svgAttrs["aria-label"] = title;
  } else {
    svgAttrs["aria-hidden"] = "true";
  }

  const body = resolveNodes(name)
    .map(([tag, attrs]) => `<${tag} ${serializeAttrs(attrs)}/>`)
    .join("");

  return `<svg ${serializeAttrs(svgAttrs)}>${body}</svg>`;
}

/**
 * Set an element's content to a rendered icon. Convenience for the (rarer)
 * imperative case where a template string is not being assembled.
 * @param {HTMLElement | null | undefined} el
 * @param {string} name
 * @param {Parameters<typeof iconSvg>[1]} [opts]
 */
export function setIcon(el, name, opts) {
  if (el) el.innerHTML = iconSvg(name, opts);
}

/**
 * True when `name` is a registered icon (no fallback).
 * @param {string} name
 * @returns {boolean}
 */
export function hasIcon(name) {
  return Object.prototype.hasOwnProperty.call(REGISTRY, name);
}
