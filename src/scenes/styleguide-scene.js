import { ListenerBag } from "../utils/listener-bag.js";
import { i18n } from "../managers/i18n-manager.js";
import { layout } from "../managers/layout-manager.js";
import { buttonHtml } from "../components/ui/button.js";
import { toggleRowHtml } from "../components/ui/toggle-row.js";

import { TitleScene } from "./title-scene.js";
import { vfx } from "../utils/vfx.js";

/**
 * StyleguideScene — dev-only visual library for every UI primitive.
 * Matches the "Velvet Rouge × Classic Gold" preview layout.
 */
export class StyleguideScene {
  /** @type {import('./scene-router.js').SceneRouter} */
  #router;

  /** @type {HTMLElement | null} */
  #el = null;

  /** @type {ListenerBag} */
  #bag = new ListenerBag();



  /** @param {import('./scene-router.js').SceneRouter} router */
  constructor(router) {
    this.#router = router;
  }

  /** @param {HTMLElement} root */
  mount(root) {
    this.#el = document.createElement("div");
    this.#el.className = "gt-sg gt-safe-box";
    this.#el.innerHTML = this.#renderInner();
    root.appendChild(this.#el);

    this.#bag.on(this.#el, "pointerdown", this.#onClick);
    this.#bag.add(i18n.onChange(() => this.#refresh()));
    this.#bag.add(layout.onChange(() => this.#refresh()));
  }

  #renderInner() {
    return `
      ${this.#renderHeader()}
      ${this.#renderColors()}
      ${this.#renderTypography()}
      ${this.#renderButtons()}
      ${this.#renderToggles()}
      ${this.#renderPegs()}
      ${this.#renderBalls()}
      ${this.#renderAnimations()}
      ${this.#renderVfx()}
    `;
  }

  #renderHeader() {
    return `
      <div class="gt-sg-header">
        <div class="gt-sg-header-eye">Style Guide · Velvet Rouge × Classic Gold</div>
        <div class="gt-sg-header-title">PAWKO</div>
        <div class="gt-sg-header-tagline">${i18n.t("app.tagline")}</div>
        <div class="gt-sg-header-badge">v0.1.0 · Preview</div>
      </div>
    `;
  }

  #renderColors() {
    const colors = [
      { name: "Background", hex: "#14040a" },
      { name: "Surface", hex: "#1e080e" },
      { name: "Card", hex: "#200a10" },
      { name: "Muted Border", hex: "#3a0e18" },
      { name: "Crimson Deep", hex: "#6a1828" },
      { name: "Crimson", hex: "#cc2840" },
      { name: "Rose", hex: "#f28090" },
      { name: "Text Secondary", hex: "#a05868" },
      { name: "Text Dim", hex: "#6a3040" },
      { name: "Gold", hex: "#d4af37" },
      { name: "Gold Light", hex: "#f5d77a" },
      { name: "Gold Dim", hex: "#8a7040" },
    ];
    const swatches = colors
      .map(
        (c) =>
          `<div class="gt-sg-swatch">
            <div class="gt-sg-swatch-color" style="height:50px;background:${c.hex}"></div>
            <div class="gt-sg-swatch-label">
              <span class="gt-sg-swatch-name">${c.name}</span>
              <span class="gt-sg-swatch-hex">${c.hex}</span>
            </div>
          </div>`,
      )
      .join("");

    return `
      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">${i18n.t("styleguide.colors")}</h2>
        <div class="gt-sg-swatches">${swatches}</div>
      </section>
    `;
  }

  #renderTypography() {
    return `
      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">Typography</h2>
        <div style="display:flex;flex-direction:column;gap:1.1rem;">
          <div>
            <span class="gt-sg-sub-label">Game title · 3rem · 14px tracking</span>
            <div style="font-size:3rem;letter-spacing:14px;text-transform:uppercase;color:var(--pk-gold);text-shadow:0 0 30px rgba(212,175,55,.22);">PAWKO</div>
          </div>
          <div>
            <span class="gt-sg-sub-label">Section heading · 0.6rem · 5px tracking</span>
            <div style="font-size:.6rem;letter-spacing:5px;text-transform:uppercase;color:var(--gt-color-text-sec);">COLLECTION GATES</div>
          </div>
          <div>
            <span class="gt-sg-sub-label">Score readout · 0.85rem · gold light</span>
            <div style="font-size:.85rem;color:var(--pk-gold-light);display:flex;gap:16px;flex-wrap:wrap;">
              <span><span style="color:var(--gt-color-text-sec);margin-right:4px;font-size:.7rem;">Hits</span>1 840</span>
              <span><span style="color:var(--gt-color-text-sec);margin-right:4px;font-size:.7rem;">Saved</span>243</span>
              <span><span style="color:var(--gt-color-text-sec);margin-right:4px;font-size:.7rem;">Level</span>12</span>
            </div>
          </div>
          <div>
            <span class="gt-sg-sub-label">Gate labels · 0.6rem · bold</span>
            <div style="display:flex;gap:12px;align-items:center;">
              <span style="font-size:.6rem;letter-spacing:2px;text-transform:uppercase;font-weight:800;color:#22c55e;">SAVE</span>
              <span style="font-size:.6rem;letter-spacing:2px;text-transform:uppercase;font-weight:800;color:#60a5fa;">RECYCLE</span>
              <span style="font-size:.6rem;letter-spacing:2px;text-transform:uppercase;font-weight:800;color:#ef4444;">DRAIN</span>
            </div>
          </div>
          <div>
            <span class="gt-sg-sub-label">Score popups</span>
            <div style="display:flex;gap:12px;align-items:baseline;">
              <span style="font-weight:800;font-size:.8rem;color:var(--pk-gold);text-shadow:0 1px 0 rgba(0,0,0,.6);">+1</span>
              <span style="font-weight:800;font-size:.8rem;color:var(--pk-gold);text-shadow:0 1px 0 rgba(0,0,0,.6);">+10</span>
              <span style="font-weight:800;font-size:1.1rem;color:var(--pk-crimson);text-shadow:0 1px 0 rgba(0,0,0,.6);">+50</span>
            </div>
          </div>
          <div>
            <span class="gt-sg-sub-label">Rarity tags</span>
            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
              <span class="gt-sg-rarity gt-sg-rarity--perm">Permanent</span>
              <span class="gt-sg-rarity gt-sg-rarity--leg">Legendary</span>
              <span class="gt-sg-rarity gt-sg-rarity--epic">Epic</span>
              <span class="gt-sg-rarity gt-sg-rarity--rare">Rare</span>
              <span class="gt-sg-rarity gt-sg-rarity--com">Common</span>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  #renderButtons() {
    const buttons = [
      buttonHtml({ action: "noop", label: "Drop Ball", variant: "primary" }),
      buttonHtml({ action: "noop", label: "Play Again", variant: "primary" }),
      buttonHtml({ action: "noop", label: "Upgrade", variant: "secondary" }),
      buttonHtml({ action: "noop", label: "Back", variant: "secondary" }),
      buttonHtml({ action: "noop", label: "Drain", variant: "danger" }),
      buttonHtml({ action: "noop", label: "No Thanks", variant: "ghost" }),
      buttonHtml({
        action: "noop",
        label: "Locked",
        variant: "primary",
        disabled: true,
      }),
    ].join("");

    return `
      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">${i18n.t("styleguide.buttons")}</h2>
        <div class="gt-btn-group">${buttons}</div>
      </section>
    `;
  }

  #renderToggles() {
    const toggles =
      toggleRowHtml({ action: "noop", label: i18n.t("options.music"), checked: true }) +
      toggleRowHtml({ action: "noop", label: i18n.t("options.sound"), checked: true });

    return `
      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">${i18n.t("styleguide.toggles")}</h2>
        <div class="gt-stack" style="max-width:320px;">${toggles}</div>
      </section>
    `;
  }

  #renderPegs() {
    const cell = (inner, label) =>
      `<div class="gt-sg-plinko-cell">
        <div class="gt-sg-plinko-stage">${inner}</div>
        <span>${label}</span>
      </div>`;

    return `
      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">Pegs</h2>
        <div class="gt-sg-plinko">
          <div class="gt-sg-plinko-row gt-sg-plinko-row--4" style="grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));">
            ${cell('<div class="pk-peg"></div>', "Classic")}
            ${cell('<div class="pk-peg pk-peg--bumper"></div>', "Bumper<br>×10 pts")}
            ${cell('<div class="pk-peg pk-peg--coin">¢</div>', "Coin Peg")}
          </div>
        </div>

        <h2 class="gt-sg-h2" style="margin-top:1rem;">Pegs — ball-effect states</h2>
        <div class="gt-sg-plinko">
          <div class="gt-sg-plinko-row gt-sg-plinko-row--4" style="grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));">
            ${cell('<div class="pk-peg pk-peg--frozen-3"></div>', "Frozen ③<br>3 hits left")}
            ${cell('<div class="pk-peg pk-peg--frozen-2"></div>', "Frozen ②<br>2 hits left")}
            ${cell('<div class="pk-peg pk-peg--frozen-1"></div>', "Frozen ①<br>1 hit left")}
            ${cell('<div class="pk-peg pk-peg--burned"></div>', "Burned<br>÷2 score")}
            ${cell('<div class="pk-peg pk-peg--electrified"></div>', "Electrified")}
            <div class="gt-sg-plinko-cell" style="grid-column: span 2;">
              <div class="gt-sg-plinko-stage" style="width: 140px;">
                <div style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:space-between;">
                  <div class="pk-peg pk-peg--electrified" style="position:relative;margin:0;"></div>
                  <div class="pk-arc" style="position:absolute;left:7px;top:50%;width:calc(100% - 14px);transform:translateY(-50%);"></div>
                  <div class="pk-peg pk-peg--electrified" style="position:relative;margin:0;"></div>
                </div>
              </div>
              <span>Arc<br>between pegs</span>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  #renderBalls() {
    const cell = (inner, label) =>
      `<div class="gt-sg-plinko-cell">
        <div class="gt-sg-plinko-stage">${inner}</div>
        <span>${label}</span>
      </div>`;

    return `
      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">Balls — kinds</h2>
        <div class="gt-sg-plinko">
          <div class="gt-sg-plinko-row" style="grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));">
            ${cell('<div class="pk-ball"></div>', "Classic")}
            ${cell('<div class="pk-ball pk-ball--ice"></div>', "Ice<br>freezes pegs")}
            ${cell('<div class="pk-ball pk-ball--fire"></div>', "Fire<br>burns pegs")}
            ${cell('<div class="pk-ball pk-ball--glass"></div>', "Glass<br>20-hit life")}
            ${cell('<div class="pk-ball pk-ball--black"></div>', "Black<br>no score")}
            ${cell('<div class="pk-ball pk-ball--electrical"></div>', "Electrical<br>combo arcs")}
          </div>
        </div>

        <h2 class="gt-sg-h2" style="margin-top:1rem;">Glass ball cracking stages</h2>
        <div class="gt-sg-plinko">
          <div class="gt-sg-plinko-row" style="grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));">
            ${cell('<div class="pk-ball pk-ball--glass"></div>', "Intact<br>>4 hits")}
            ${cell('<div class="pk-ball pk-ball--glass pk-ball--glass-crack-1"></div>', "Crack 1<br>4 hits left")}
            ${cell('<div class="pk-ball pk-ball--glass pk-ball--glass-crack-2"></div>', "Crack 2<br>3 hits left")}
            ${cell('<div class="pk-ball pk-ball--glass pk-ball--glass-crack-3"></div>', "Crack 3<br>2 hits left")}
            ${cell('<div class="pk-ball pk-ball--glass pk-ball--glass-crack-4"></div>', "Crack 4<br>1 hit left")}
          </div>
        </div>
      </section>
    `;
  }

  #renderAnimations() {
    const animSamples = ["fade-in", "pop-in", "slide-up", "pulse"]
      .map(
        (n) =>
          `<div class="gt-sg-anim gt-sg-anim--${n}">
             <span>${n}</span>
           </div>`,
      )
      .join("");

    return `
      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">${i18n.t("styleguide.animations")}</h2>
        <div class="gt-sg-anims">${animSamples}</div>
      </section>
    `;
  }

  #renderVfx() {
    const positive = [
      { id: "sunburst", label: "Sunburst" },
      { id: "confetti", label: "Confetti Pop" },
      { id: "sparkle-trail", label: "Sparkle Trail" },
      { id: "god-rays", label: "God Rays" },
      { id: "gold-shower", label: "Gold Shower" },
      { id: "bloom-flash", label: "Bloom Flash" },
      { id: "fireworks", label: "Fireworks" },
      { id: "halo-ring", label: "Halo Ring" },
      { id: "floating-text", label: "Floating Text" },
    ];
    const negative = [
      { id: "blood-vignette", label: "Blood Vignette" },
      { id: "frost", label: "Frost" },
      { id: "cracked-screen", label: "Cracked Screen" },
    ];

    const cell = ({ id, label }) =>
      `<div class="gt-sg-vfx-cell">
        <div class="gt-sg-vfx-stage" data-action="play-vfx" data-vfx-id="${id}"></div>
        <span class="gt-sg-vfx-label">${label}</span>
      </div>`;

    return `
      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">VFX Overlay System</h2>
        <p style="font-size:.7rem;color:var(--gt-color-text-sec);margin-bottom:1rem;line-height:1.5;">
          Click any cell to trigger the effect. Use <code style="background:var(--pk-bg-surface);padding:1px 4px;border-radius:2px;">vfx.play('id', element)</code> in code.
        </p>
        <div class="gt-sg-vfx-category">Positive</div>
        <div class="gt-sg-vfx-grid">${positive.map(cell).join("")}</div>
        <div class="gt-sg-vfx-category" style="margin-top:1.5rem;">Negative</div>
        <div class="gt-sg-vfx-grid">${negative.map(cell).join("")}</div>
      </section>
    `;
  }

  #refresh() {
    if (!this.#el) return;
    this.#el.innerHTML = this.#renderInner();
  }

  /** @param {PointerEvent} event */
  #onClick = (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    const actionEl = target.closest("[data-action]");
    if (!actionEl) return;
    const action = /** @type {HTMLElement} */ (actionEl).dataset.action;
    switch (action) {
      case "back":
        this.#router.start(TitleScene);
        break;

      case "play-vfx": {
        const vfxId = /** @type {HTMLElement} */ (actionEl).dataset.vfxId;
        if (!vfxId) break;
        const stage = /** @type {HTMLElement} */ (actionEl);
        // Stop any existing effect on this stage
        const existing = stage.querySelector("[data-vfx]");
        if (existing) existing.remove();
        const opts = vfxId === "floating-text" ? { text: "+50", duration: 2000 } : { duration: 3000 };
        vfx.play(vfxId, stage, opts);
        break;
      }
    }
  };

  destroy() {
    this.#bag.dispose();
    this.#el?.remove();
    this.#el = null;
  }
}
