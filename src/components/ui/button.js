/**
 * Build the HTML markup for a standard button. Centralises class names so
 * the visual vocabulary stays consistent across modals.
 *
 * @param {{
 *   action: string,
 *   label: string,
 *   variant?: 'primary' | 'secondary' | 'danger' | 'ghost',
 *   icon?: string,
 *   disabled?: boolean,
 *   modifier?: string,
 * }} props
 * @returns {string}
 */
export function buttonHtml({
  action,
  label,
  variant = "primary",
  icon,
  disabled,
  modifier,
}) {
  const classes = ["gt-btn", `gt-btn--${variant}`];
  if (modifier) classes.push(modifier);
  const iconHtml = icon ? `<span class="gt-btn-icon">${icon}</span>` : "";
  const disabledAttr = disabled ? "disabled data-disabled" : "";
  return `<button class="${classes.join(" ")}" data-action="${action}" ${disabledAttr}>${iconHtml}<span class="gt-btn-label">${label}</span></button>`;
}

/**
 * @param {Array<Parameters<typeof buttonHtml>[0]>} buttons
 * @returns {string}
 */
export function buttonGroupHtml(buttons) {
  return `<div class="gt-btn-group">${buttons.map(buttonHtml).join("")}</div>`;
}
