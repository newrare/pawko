import { ListenerBag } from "../utils/listener-bag.js";
import { i18n } from "../managers/i18n-manager.js";
import { layout } from "../managers/layout-manager.js";
import { SlowFloatBackground } from "../utils/slow-float-background.js";
import { buttonHtml } from "../components/ui/button.js";
import { toggleRowHtml } from "../components/ui/toggle-row.js";
import { mountSparkWeb } from "../utils/spark-web.js";

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

  /** @type {SlowFloatBackground | null} */
  #bg = null;

  /** @type {Array<() => void>} Spark-web/arc unmount fns, cleared on each refresh. */
  #sparkUnmounts = [];



  /** @param {import('./scene-router.js').SceneRouter} router */
  constructor(router) {
    this.#router = router;
  }

  /** @param {HTMLElement} root */
  mount(root) {
    this.#bg = new SlowFloatBackground(root);
    this.#bag.add(() => this.#bg?.destroy());

    this.#el = document.createElement("div");
    this.#el.className = "gt-sg gt-safe-box";
    this.#el.innerHTML = this.#renderInner();
    root.appendChild(this.#el);

    this.#mountSparks();

    this.#bag.on(this.#el, "pointerdown", this.#onClick);
    this.#bag.add(i18n.onChange(() => this.#refresh()));
    this.#bag.add(layout.onChange(() => this.#refresh()));
  }

  /**
   * Mount spark-web overlays on every electrified peg in the rendered
   * guide. Must be re-run after every `#refresh()` (which rewrites
   * innerHTML and wipes the previously-mounted SVGs).
   */
  #mountSparks() {
    if (!this.#el) return;
    this.#el
      .querySelectorAll('[data-sg-spark="peg"]')
      .forEach((host) =>
        this.#sparkUnmounts.push(mountSparkWeb(host, { radius: 11, padding: 14 })),
      );
  }

  #unmountSparks() {
    for (const fn of this.#sparkUnmounts) fn();
    this.#sparkUnmounts = [];
  }

  #renderInner() {
    return `
      ${this.#renderHeader()}
      ${this.#renderColors()}
      ${this.#renderTypography()}
      ${this.#renderCards()}
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
      { token: "--pk-bg",           label: "Background" },
      { token: "--pk-bg-surface",   label: "Surface" },
      { token: "--pk-bg-card",      label: "Card" },
      { token: "--pk-crimson-muted",label: "Crimson Muted" },
      { token: "--pk-crimson-deep", label: "Crimson Deep" },
      { token: "--pk-crimson",      label: "Crimson" },
      { token: "--pk-rose",         label: "Rose" },
      { token: "--pk-rose-dim",     label: "Rose Dim" },
      { token: "--pk-rose-muted",   label: "Rose Muted" },
      { token: "--pk-gold",         label: "Gold" },
      { token: "--pk-gold-light",   label: "Gold Light" },
      { token: "--pk-gold-dim",     label: "Gold Dim" },
    ];
    const swatches = colors
      .map(
        (c) =>
          `<div class="gt-sg-swatch">
            <div class="gt-sg-swatch-color" style="background:var(${c.token})"></div>
            <div class="gt-sg-swatch-label">
              <span class="gt-sg-swatch-name">${c.label}</span>
              <span class="gt-sg-swatch-hex">${c.token}</span>
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
        <h2 class="gt-sg-h2">Typography — Niveaux de titres</h2>
        <div style="display:flex;flex-direction:column;gap:1.4rem;">

          <div>
            <span class="gt-sg-sub-label">H1 Display — Titre de scène · 3rem · 14px tracking · .gt-sg-typo-h1</span>
            <div class="gt-sg-typo-h1">PAWKO</div>
          </div>

          <div>
            <span class="gt-sg-sub-label">H2 Screen — Titre d'écran · 1.4rem · 6px tracking · .gt-sg-typo-h2</span>
            <div class="gt-sg-typo-h2">Tableau de jeu</div>
          </div>

          <div>
            <span class="gt-sg-sub-label">H3 Section — En-tête de section · 0.85rem · 4px tracking · .gt-sg-typo-h3</span>
            <div class="gt-sg-typo-h3">Mes récompenses</div>
          </div>

          <div>
            <span class="gt-sg-sub-label">H4 Label — Sous-section · 0.6rem · 5px tracking uppercase · .gt-sg-typo-h4</span>
            <div class="gt-sg-typo-h4">Collection Gates</div>
          </div>

          <div>
            <span class="gt-sg-sub-label">Caption — Légende / tag · 0.5rem · 3px tracking · .gt-sg-typo-caption</span>
            <div class="gt-sg-typo-caption">Niveau 12 — Actif</div>
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

  #renderCards() {
    return `
      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">Cards — propositions</h2>
        <div class="gt-sg-cards-grid">

          <div class="gt-sg-card">
            <div class="gt-sg-card-eyebrow">Base card</div>
            <div class="gt-sg-card-title">Peg Glue</div>
            <div class="gt-sg-card-body">Colle la balle sur le peg pendant 2 secondes puis la relâche.</div>
          </div>

          <div class="gt-sg-card gt-sg-card--surface">
            <div class="gt-sg-card-eyebrow">Surface card</div>
            <div class="gt-sg-card-title">Peg Teleport</div>
            <div class="gt-sg-card-body">Téléporte la balle à un endroit aléatoire du tableau.</div>
          </div>

          <div class="gt-sg-card gt-sg-card--gold">
            <div class="gt-sg-card-eyebrow">Gold accent card</div>
            <div class="gt-sg-card-title">Peg Chest</div>
            <div class="gt-sg-card-body">Récompense la balle avec un bonus aléatoire à l'impact.</div>
            <div class="gt-sg-card-tag">Rare</div>
          </div>

          <div class="gt-sg-card gt-sg-card--stat">
            <div class="gt-sg-card-eyebrow">Stat card</div>
            <div class="gt-sg-card-value">42</div>
            <div class="gt-sg-card-title">Pegs sauvés</div>
          </div>

          <div class="gt-sg-card gt-sg-card--danger">
            <div class="gt-sg-card-eyebrow">Danger card</div>
            <div class="gt-sg-card-title">Peg Fire</div>
            <div class="gt-sg-card-body">Inflige des dégâts DoT à la balle sur toute la durée.</div>
          </div>

        </div>
      </section>
    `;
  }

  #renderButtons() {
    const rows = [
      `<div>
        <span class="gt-sg-sub-label">Primary — Action / Validation · variant="primary"</span>
        <div class="gt-btn-group">
          ${buttonHtml({ action: "noop", label: "Drop Ball", variant: "primary" })}
          ${buttonHtml({ action: "noop", label: "Verrouillé", variant: "primary", disabled: true })}
        </div>
      </div>`,
      `<div>
        <span class="gt-sg-sub-label">Secondary — Annulation / Retour · variant="secondary"</span>
        <div class="gt-btn-group">
          ${buttonHtml({ action: "back", label: "Back", variant: "secondary" })}
        </div>
      </div>`,
    ].join("");

    return `
      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">${i18n.t("styleguide.buttons")}</h2>
        <div style="display:flex;flex-direction:column;gap:1rem;">${rows}</div>
      </section>
    `;
  }

  #renderToggles() {
    const toggleOn  = toggleRowHtml({ action: "noop", label: i18n.t("options.sound"), checked: true });
    const toggleOff = toggleRowHtml({ action: "noop", label: i18n.t("options.sound"), checked: false });

    return `
      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">${i18n.t("styleguide.toggles")}</h2>
        <div class="gt-stack" style="max-width:320px;">
          ${toggleOn}${toggleOff}
        </div>
      </section>
    `;
  }

  #renderPegs() {
    const cell = (inner, label) =>
      `<div class="gt-sg-plinko-cell">
        <div class="gt-sg-plinko-stage gt-sg-plinko-stage--overflow">${inner}</div>
        <span>${label}</span>
      </div>`;

    const row = (cells) =>
      `<div class="gt-sg-plinko-row" style="grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));">${cells}</div>`;

    return `
      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">Pegs — regroupés par forme</h2>

        <div class="gt-sg-peg-group">
          <div class="gt-sg-peg-group-label">Cercles</div>
          ${row(`
            ${cell('<div class="pk-peg"></div>', "Classic")}
            ${cell('<div class="pk-peg pk-peg--bumper"></div>', "Bumper")}
            ${cell('<div class="pk-peg pk-peg--glue"></div>', "Glue")}
            ${cell('<div class="pk-peg pk-peg--teleport"></div>', "Teleport")}
            ${cell('<div class="pk-peg pk-peg--shield pk-peg--shield-active"></div>', "Shield<br>Actif")}
            ${cell('<div class="pk-peg pk-peg--shield pk-peg--shield-down"></div>', "Shield<br>Down")}
            ${cell('<div class="pk-peg pk-peg--ice"></div>', "Ice")}
            ${cell('<div class="pk-peg pk-peg--fire"></div>', "Fire")}
            ${cell('<div class="pk-peg pk-peg--electrical" data-sg-spark="peg"></div>', "Electrical")}
            ${cell('<div class="pk-peg pk-peg--bomb"></div>', "Bomb")}
          `)}
        </div>

        <div class="gt-sg-peg-group">
          <div class="gt-sg-peg-group-label">Losanges (carré 45°)</div>
          ${row(`
            ${cell('<div class="pk-peg pk-peg--coin"></div>', "Coin")}
            ${cell('<div class="pk-peg pk-peg--diamond"></div>', "Diamond")}
          `)}
        </div>

        <div class="gt-sg-peg-group">
          <div class="gt-sg-peg-group-label">Carrés arrondis</div>
          ${row(`
            ${cell('<div class="pk-peg pk-peg--chest"></div>', "Chest")}
            ${cell('<div class="pk-peg pk-peg--mystery"></div>', "Mystery")}
          `)}
        </div>

        <div class="gt-sg-peg-group">
          <div class="gt-sg-peg-group-label">Labels HP (teinté par couleur du peg)</div>
          ${row(`
            ${cell('<div class="pk-peg"><span class="pk-peg-hp-label pk-peg-hp-label--persistent">7</span></div>', "Classic")}
            ${cell('<div class="pk-peg pk-peg--bumper"><span class="pk-peg-hp-label pk-peg-hp-label--persistent">4</span></div>', "Bumper")}
            ${cell('<div class="pk-peg pk-peg--coin"><span class="pk-peg-hp-label pk-peg-hp-label--persistent">5</span></div>', "Coin")}
            ${cell('<div class="pk-peg pk-peg--diamond"><span class="pk-peg-hp-label pk-peg-hp-label--persistent">3</span></div>', "Diamond")}
            ${cell('<div class="pk-peg pk-peg--glue"><span class="pk-peg-hp-label pk-peg-hp-label--persistent">4</span></div>', "Glue")}
            ${cell('<div class="pk-peg pk-peg--chest"><span class="pk-peg-hp-label pk-peg-hp-label--persistent">2</span></div>', "Chest")}
            ${cell('<div class="pk-peg pk-peg--mystery"><span class="pk-peg-hp-label pk-peg-hp-label--persistent">2</span></div>', "Mystery")}
          `)}
        </div>

        <div class="gt-sg-peg-group">
          <div class="gt-sg-peg-group-label">Tremble — dernier HP restant</div>
          ${row(`
            ${cell('<div class="pk-peg pk-tremble"></div>', "Classic<br>1 HP")}
          `)}
        </div>
      </section>
    `;
  }

  #renderBalls() {
    const cell = (inner, label) =>
      `<div class="gt-sg-plinko-cell">
        <div class="gt-sg-plinko-stage gt-sg-plinko-stage--overflow">${inner}</div>
        <span>${label}</span>
      </div>`;

    return `
      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">Balls</h2>
        <div class="gt-sg-plinko">
          <div class="gt-sg-plinko-row" style="grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));">
            ${cell('<div class="pk-ball"></div>', "Classic")}
            ${cell('<div class="pk-ball pk-ball--on-fire"></div>', "On fire<br>(burning)")}
            ${cell('<div class="pk-ball pk-ball--frozen"></div>', "Frozen<br>(0.5× speed)")}
            ${cell('<div class="pk-ball pk-ball--electrified"></div>', "Electrified<br>(DoT)")}
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
    this.#unmountSparks();
    this.#el.innerHTML = this.#renderInner();
    this.#mountSparks();
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
    this.#unmountSparks();
    this.#bag.dispose();
    this.#el?.remove();
    this.#el = null;
  }
}
