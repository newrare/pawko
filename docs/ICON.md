# Icons

Pawko uses **[Lucide](https://lucide.dev) icons, self-hosted** — no CDN. The
`lucide` package is a dependency, and icons are rendered as **inline SVG
strings** by [`src/utils/icon.js`](../src/utils/icon.js). Emojis are not used
for UI iconography (the only exception is the decorative card-suit rain in
`background-animator.js`).

## Why inline SVG (and not `data-lucide` + `createIcons()`)

The whole UI is built by assembling `innerHTML` template strings. `iconSvg()`
returns a ready-to-inject `<svg>` string, so an icon drops straight into any
template with zero post-render step. There is no `lucide.createIcons()` pass to
remember after every re-render, which would be fragile with the game's dynamic
DOM and `ListenerBag` teardown.

## Self-hosting & bundle size

`icon.js` imports icons as **named imports** and registers them in a small
`REGISTRY`. This lets the bundler tree-shake Lucide down to just the ~30 icons
the game actually uses instead of the full ~2000-icon set. Adding a new icon is
two lines: the named import + a `REGISTRY` entry.

## Usage

```js
import { iconSvg } from "../utils/icon.js";

// In a template string:
el.innerHTML = `<span class="pk-chip-icon">${iconSvg("gem")}</span>`;

// Sized + tinted:
iconSvg("coins", { size: 14, cls: "pk-icon--gold" });

// Accessible (labelled) icon:
iconSvg("lock", { title: i18n.t("slotmachine.locked") });

// Imperative set:
import { setIcon } from "../utils/icon.js";
setIcon(document.querySelector("#slot"), "dices");
```

`iconSvg(name, opts)` options:

| Option        | Default | Meaning                                                        |
| ------------- | ------- | -------------------------------------------------------------- |
| `size`        | `24`    | width/height in px                                             |
| `cls`         | `""`    | extra classes appended after the base `pk-icon`                |
| `strokeWidth` | `2`     | stroke width                                                   |
| `title`       | —       | when set → `role="img"` + `aria-label`; otherwise `aria-hidden`|

An unregistered name renders a `circle-help` fallback and warns once.

## Colour — follow the app style

Every icon strokes with `currentColor`, so an icon's colour is simply the CSS
`color` of its host element. **Never hardcode a colour** — reach for the design
tokens, either directly on the host or via a modifier class from
[`icon.css`](../src/styles/components/icon.css):

`.pk-icon--gold`, `--gold-light`, `--crimson`, `--rose`, `--dim`, `--success`,
`--danger`, `--warning`.

The Styleguide scene (dev nav bar) has an **Icons** section showing the full
vocabulary, the colour modifiers, and the highlight card — develop against it.

## Icons in config data

Config files (`bonus-defs.js`, `slot-machine-defs.js`, `peg-shop-defs.js`,
ability `CATEGORY_VIEW`, shop `RARITY_META`) store a **Lucide name string**
(pure data) — never rendered markup. Render sites wrap it: `iconSvg(def.icon)`.
`slot-machine-defs.js` exposes `iconNameForUpgrade(type)` (name) and
`iconForUpgrade(type, opts)` (rendered SVG).

## Item / icon highlight — `.pk-featured`

To feature an item or icon (the `icon-last.html` reference: a rare 12 s shimmer
sweep + a ping-radar pulse), use the `.pk-featured` component from `icon.css`,
adapted to the Velvet Rouge × Classic Gold palette:

```html
<div class="pk-featured pk-featured--legendary">
  <div class="pk-featured-surface">${iconSvg("gem")}</div>
  <span class="pk-featured-tag">Legendary</span>
</div>
```

The accent colour is driven by `--pk-featured-accent` (per-rarity presets:
`--legendary` gold, `--epic` crimson, `--rare` rose, `--common` rose-dim), and
both animations respect `prefers-reduced-motion`.
