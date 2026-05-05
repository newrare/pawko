/**
 * Dev-only overlays. Mounted **directly on `document.body`** so
 * `position: fixed` works against the viewport.
 *
 * Installs a safe-zone outline with a live width × height readout.
 * Navigation buttons (Title / Style guide) live in the admin panel instead.
 */
export function installDevOverlay() {
  if (document.getElementById("gt-dev-safe-zone")) return;

  const overlay = document.createElement("div");
  overlay.id = "gt-dev-safe-zone";
  overlay.className = "gt-dev-safe-zone";
  overlay.innerHTML = `
    <span class="gt-dev-safe-zone-label">SAFE ZONE</span>
    <span class="gt-dev-safe-zone-dim"></span>
  `;
  document.body.appendChild(overlay);

  const dim = overlay.querySelector(".gt-dev-safe-zone-dim");
  const tick = () => {
    const cs = getComputedStyle(document.documentElement);
    const w = cs.getPropertyValue("--gt-safe-width").trim();
    const h = cs.getPropertyValue("--gt-safe-height").trim();
    if (dim && w && h) dim.textContent = `${w} × ${h}`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
