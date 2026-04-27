/**
 * Dev-only overlays. Mounted **directly on `document.body`** (not inside
 * the Phaser DOM container) so `position: fixed` works against the
 * viewport — Phaser's DOM wrapper sets a `transform`, which creates a new
 * containing block and would break fixed positioning.
 *
 * Two affordances are installed:
 *
 *   1. Safe-zone outline — a dashed rectangle following `--gt-safe-*` vars
 *      with a live `width × height` readout, so layout issues are obvious.
 *   2. Nav bar — small buttons to jump to the title scene or the
 *      Styleguide scene from anywhere.
 *
 * Bundled out of production builds — call `installDevOverlay()` from
 * `main.js` only when `import.meta.env.DEV` is true.
 *
 * @param {{ onTitle?: () => void, onStyleguide?: () => void }} [hooks]
 */
export function installDevOverlay(hooks = {}) {
  if (document.getElementById('gt-dev-safe-zone')) return;

  /* --- Safe-zone outline --- */
  const overlay = document.createElement('div');
  overlay.id = 'gt-dev-safe-zone';
  overlay.className = 'gt-dev-safe-zone';
  overlay.innerHTML = `
    <span class="gt-dev-safe-zone-label">SAFE ZONE</span>
    <span class="gt-dev-safe-zone-dim"></span>
  `;
  document.body.appendChild(overlay);

  /* --- Nav bar --- */
  const bar = document.createElement('div');
  bar.id = 'gt-dev-bar';
  bar.className = 'gt-dev-bar';
  bar.setAttribute('data-no-sfx', '');
  bar.innerHTML = `
    <button class="gt-dev-bar-btn" data-action="title" data-no-sfx>Title</button>
    <button class="gt-dev-bar-btn" data-action="styleguide" data-no-sfx>Style guide</button>
  `;
  bar.addEventListener(
    'pointerdown',
    (e) => {
      const btn = /** @type {HTMLElement | null} */ (e.target).closest('[data-action]');
      if (!btn) return;
      e.stopPropagation();
      e.preventDefault();
      const action = /** @type {HTMLElement} */ (btn).dataset.action;
      if (action === 'styleguide') hooks.onStyleguide?.();
      else if (action === 'title') hooks.onTitle?.();
    },
    true,
  );
  document.body.appendChild(bar);

  /* --- Live safe-zone readout. RAF-driven because there is no native
         "CSS variable changed" event; cost is one text-node update / frame. */
  const dim = overlay.querySelector('.gt-dev-safe-zone-dim');
  const tick = () => {
    const cs = getComputedStyle(document.documentElement);
    const w = cs.getPropertyValue('--gt-safe-width').trim();
    const h = cs.getPropertyValue('--gt-safe-height').trim();
    if (dim && w && h) dim.textContent = `${w} × ${h}`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
