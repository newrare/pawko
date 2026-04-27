/**
 * Markup for a label / toggle row used in the options modal.
 * Toggling is wired by callers via `data-action`.
 *
 * @param {{ action: string, label: string, checked: boolean, disabled?: boolean }} props
 * @returns {string}
 */
export function toggleRowHtml({ action, label, checked, disabled }) {
  const cls = ['gt-toggle', checked ? 'gt-toggle--on' : 'gt-toggle--off'].join(' ');
  const dis = disabled ? 'data-disabled' : '';
  return `
    <div class="gt-row gt-clickable" data-action="${action}" role="switch" aria-checked="${checked}" ${dis}>
      <span class="gt-row-label">${label}</span>
      <span class="${cls}"><span class="gt-toggle-knob"></span></span>
    </div>
  `;
}
