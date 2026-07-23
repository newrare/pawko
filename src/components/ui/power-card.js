import { iconSvg } from "../../utils/icon.js";

/**
 * Power card — the item / reward card used by the mystery-choice picker and
 * previewed in the style guide. Design ported from the "forge" concept
 * (card-final) onto the Velvet Rouge palette: an emphasised hero icon, the
 * same icon echoed as a faint background watermark, a footer stat list, and a
 * rarity badge that pokes out of the card border. Per-rarity accent + shimmer /
 * ping animation are driven entirely by CSS (`power-card.css`).
 *
 * Pure HTML-string builder — no DOM, no state. Icons render through
 * `iconSvg()` (self-hosted Lucide), so no `createIcons()` pass is needed.
 *
 * @typedef {object} PowerCardStat
 * @property {string} icon   Lucide icon name for the row bullet
 * @property {string} label  left-hand label
 * @property {string} value  right-hand value
 *
 * @param {object} props
 * @param {'legendary'|'epic'|'rare'|'common'|'malus'} props.rarity  drives the accent + animation preset
 * @param {string} props.rarityLabel  text shown on the pop-out badge
 * @param {string} props.icon  Lucide icon used for both hero and watermark
 * @param {string} props.title
 * @param {string} props.desc
 * @param {PowerCardStat[]} [props.stats]  footer list rows
 * @param {string} [props.action]  when set, the card renders as a clickable
 *   `<button data-action=…>` (otherwise a static `<article>`)
 * @param {string|number} [props.index]  `data-index` on the clickable card
 * @param {string} [props.ariaLabel]  accessible label for the clickable card
 * @returns {string} an HTML string
 */
export function powerCardHtml({
  rarity,
  rarityLabel,
  icon,
  title,
  desc,
  stats = [],
  action,
  index,
  ariaLabel,
}) {
  const clickable = Boolean(action);
  const tag = clickable ? "button" : "article";

  const attrs = [
    `class="pk-power-card pk-power-card--${rarity}${clickable ? " gt-clickable" : ""}"`,
  ];
  if (clickable) {
    attrs.push('type="button"', `data-action="${action}"`);
    if (index != null) attrs.push(`data-index="${index}"`);
  }
  if (ariaLabel) attrs.push(`aria-label="${ariaLabel}"`);

  const statsHtml = stats
    .map(
      (s) => `
        <li>
          <span class="pk-power-card-k">${iconSvg(s.icon, { size: 13 })}${s.label}</span>
          <span class="pk-power-card-dots"></span>
          <span class="pk-power-card-v">${s.value}</span>
        </li>`,
    )
    .join("");

  return `
    <${tag} ${attrs.join(" ")}>
      <span class="pk-power-card-badge">${rarityLabel}</span>
      <div class="pk-power-card-inner">
        <span class="pk-power-card-bg">${iconSvg(icon, { size: 200 })}</span>
        <span class="pk-power-card-hero">
          <span class="pk-power-card-hero-frame"></span>
          ${iconSvg(icon, { size: 52 })}
        </span>
        <div class="pk-power-card-content">
          <span class="pk-power-card-title">${title}</span>
          <p class="pk-power-card-desc">${desc}</p>
          <ul class="pk-power-card-list">${statsHtml}</ul>
        </div>
      </div>
    </${tag}>`;
}
