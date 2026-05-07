import { ListenerBag } from "../utils/listener-bag.js";
import { i18n } from "../managers/i18n-manager.js";
import { layout } from "../managers/layout-manager.js";
import { buttonHtml } from "../components/ui/button.js";
import { toggleRowHtml } from "../components/ui/toggle-row.js";
import { OptionsModal } from "../components/options-modal.js";
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

  /** @type {OptionsModal | null} */
  #sampleModal = null;

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
      ${this.#renderPinboard()}
      ${this.#renderLaunchZone()}
      ${this.#renderGates()}
      ${this.#renderStatusBar()}
      ${this.#renderBonusCards()}
      ${this.#renderModals()}
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
        <h2 class="gt-sg-h2">01 · ${i18n.t("styleguide.colors")}</h2>
        <div class="gt-sg-swatches">${swatches}</div>
      </section>
    `;
  }

  #renderTypography() {
    return `
      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">02 · Typography</h2>
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
        <h2 class="gt-sg-h2">03 · ${i18n.t("styleguide.buttons")}</h2>
        <div class="gt-btn-group">${buttons}</div>
      </section>
    `;
  }

  #renderToggles() {
    const toggles =
      toggleRowHtml({ action: "noop", label: i18n.t("options.music"), checked: true }) +
      toggleRowHtml({ action: "noop", label: i18n.t("options.sound"), checked: true }) +
      toggleRowHtml({ action: "noop", label: i18n.t("options.anim_skip"), checked: false });

    return `
      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">04 · ${i18n.t("styleguide.toggles")}</h2>
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
        <h2 class="gt-sg-h2">05 · Pegs</h2>
        <div class="gt-sg-plinko">
          <div class="gt-sg-plinko-row gt-sg-plinko-row--4" style="grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));">
            ${cell('<div class="pk-peg"></div>', "Regular")}
            ${cell('<div class="pk-peg pk-peg--bumper"></div>', "Bumper<br>×10 pts")}
            ${cell('<div class="pk-peg pk-peg--coin">¢</div>', "Coin Peg")}
            ${cell('<div class="pk-peg pk-peg--shop pk-peg--shop--common"><span class="pk-shop-peg-counter">2</span></div>', 'Shop<br><span class="gt-sg-rarity gt-sg-rarity--com" style="font-size:.42rem;">Common</span>')}
            ${cell('<div class="pk-peg pk-peg--shop pk-peg--shop--rare"><span class="pk-shop-peg-counter">4</span></div>', 'Shop<br><span class="gt-sg-rarity gt-sg-rarity--rare" style="font-size:.42rem;">Rare</span>')}
            ${cell('<div class="pk-peg pk-peg--shop pk-peg--shop--epic"><span class="pk-shop-peg-counter">7</span></div>', 'Shop<br><span class="gt-sg-rarity gt-sg-rarity--epic" style="font-size:.42rem;">Epic</span>')}
            ${cell('<div class="pk-peg pk-peg--shop pk-peg--shop--legendary"><span class="pk-shop-peg-counter">12</span></div>', 'Shop<br><span class="gt-sg-rarity gt-sg-rarity--leg" style="font-size:.42rem;">Legendary</span>')}
            ${cell('<div class="pk-peg pk-peg--frozen-3"></div>', "Frozen ③<br>intact")}
            ${cell('<div class="pk-peg pk-peg--frozen-2"></div>', "Frozen ②<br>cracking")}
            ${cell('<div class="pk-peg pk-peg--frozen-1"></div>', "Frozen ①<br>thawing")}
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
        <h2 class="gt-sg-h2">06 · Balls</h2>
        <div class="gt-sg-plinko">
          <div class="gt-sg-plinko-row" style="grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));">
            ${cell('<div class="pk-ball"></div>', "Regular")}
            ${cell('<div class="pk-ball pk-ball--ice"></div>', "Ice Ball<br>freezes pegs")}
            ${cell('<div class="pk-ball pk-ball--glass"></div>', "Glass<br>intact")}
            ${cell('<div class="pk-ball pk-ball--glass pk-ball--glass-crack-1"></div>', "Glass<br>crack 1/4")}
            ${cell('<div class="pk-ball pk-ball--glass pk-ball--glass-crack-2"></div>', "Glass<br>crack 2/4")}
            ${cell('<div class="pk-ball pk-ball--glass pk-ball--glass-crack-3"></div>', "Glass<br>crack 3/4")}
            ${cell('<div class="pk-ball pk-ball--glass pk-ball--glass-crack-4"></div>', "Glass<br>shatter soon")}
          </div>
        </div>
      </section>
    `;
  }

  #renderPinboard() {
    return `
      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">07 · Pinboard Arena</h2>
        <div style="position:relative;background:var(--pk-arena-bg);border-top:var(--pk-arena-border);border-bottom:var(--pk-arena-border);border-radius:4px;overflow:hidden;padding:1rem 1.5rem;display:flex;align-items:center;flex-wrap:wrap;gap:12px;min-height:100px;">
          <span style="position:absolute;top:6px;right:10px;background:rgba(212,175,55,.1);color:var(--pk-gold);border:1px solid rgba(212,175,55,.2);padding:3px 8px;border-radius:2px;font-size:.68rem;font-weight:700;letter-spacing:2px;">LVL 12</span>
          <span style="font-size:.7rem;color:rgba(212,175,55,.35);font-weight:700;">LVL 11</span>
          <div class="pk-peg" style="position:relative;margin:0;"></div>
          <div class="pk-peg" style="position:relative;margin:0;"></div>
          <div class="pk-peg pk-peg--bumper" style="position:relative;margin:0;"></div>
          <div class="pk-peg" style="position:relative;margin:0;"></div>
          <div class="pk-peg pk-peg--shop pk-peg--shop--rare" style="position:relative;margin:0;"><span class="pk-shop-peg-counter">4</span></div>
          <div class="pk-peg" style="position:relative;margin:0;"></div>
          <div class="pk-peg pk-peg--coin" style="position:relative;margin:0;">¢</div>
          <div class="pk-peg pk-peg--frozen-3" style="position:relative;margin:0;"></div>
          <div class="pk-peg" style="position:relative;margin:0;"></div>
          <div class="pk-peg pk-peg--shop pk-peg--shop--legendary" style="position:relative;margin:0;"><span class="pk-shop-peg-counter">12</span></div>
          <div class="pk-peg" style="position:relative;margin:0;"></div>
          <div class="pk-peg pk-peg--bumper" style="position:relative;margin:0;"></div>
          <div class="pk-ball" style="position:relative;margin:0;"></div>
          <div class="pk-ball pk-ball--ice" style="position:relative;margin:0;"></div>
          <span style="color:var(--pk-gold);background:rgba(212,175,55,.1);border:1px solid rgba(212,175,55,.2);padding:1px 6px;border-radius:2px;font-size:.7rem;font-weight:700;">LVL 10 ★</span>
          <div style="position:absolute;right:10px;bottom:8px;display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:rgba(212,175,55,.1);border:1px solid rgba(212,175,55,.22);border-radius:2px;color:var(--pk-gold-light);font-size:.78rem;font-weight:700;">🪙 42</div>
        </div>
        <div style="margin-top:.6rem;">
          <span class="gt-sg-sub-label">Level progress (62%)</span>
          <div class="gt-sg-progress-wrap"><div class="gt-sg-progress-fill"></div></div>
        </div>
      </section>
    `;
  }

  #renderLaunchZone() {
    const dot = `<span class="gt-sg-held-dot"></span>`;
    return `
      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">08 · Launch Zone</h2>
        <div style="background:var(--pk-bg-surface);border:1px solid var(--pk-crimson-muted);border-radius:4px;padding:1rem;display:flex;flex-direction:column;gap:.75rem;">
          <div style="display:flex;gap:.5rem;">
            <div class="pk-sublaunch" data-firing="true" style="width:80px;height:56px;flex-direction:column;justify-content:flex-end;align-items:center;gap:3px;padding-bottom:6px">${dot}${dot}${dot}${dot}${dot}</div>
            <div class="pk-sublaunch" style="width:80px;height:56px;flex-direction:column;justify-content:flex-end;align-items:center;gap:3px;padding-bottom:6px">${dot}${dot}${dot}${dot}${dot}</div>
            <div class="pk-sublaunch" style="width:80px;height:56px;flex-direction:column;justify-content:flex-end;align-items:center;gap:3px;padding-bottom:6px">${dot}${dot}${dot}</div>
            <div class="pk-sublaunch" data-empty="true" style="width:80px;height:56px;"></div>
          </div>
          ${buttonHtml({ action: "noop", label: "Saved 12 ↑", variant: "primary" })}
        </div>
      </section>
    `;
  }

  #renderGates() {
    return `
      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">09 · Collection Gates</h2>
        <div class="gt-sg-plinko-gates">
          <div class="pk-gate pk-gate--save"><span class="pk-gate-label">${i18n.t("game.gate.save")}</span></div>
          <div class="pk-gate pk-gate--recycle"><span class="pk-gate-label">${i18n.t("game.gate.recycle")}</span></div>
          <div class="pk-gate pk-gate--shop"><span class="pk-gate-label">${i18n.t("game.gate.shop")}</span></div>
          <div class="pk-gate pk-gate--drain"><span class="pk-gate-label">${i18n.t("game.gate.drain")}</span></div>
        </div>
        <div style="font-size:.55rem;color:var(--gt-color-text-dim);letter-spacing:1px;">
          Save 25% · Recycle 48% · Shop 2% (rare landing) · Drain 25%
        </div>
      </section>
    `;
  }

  #renderStatusBar() {
    return `
      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">10 · Status Bar</h2>
        <div class="gt-sg-status">
          <div class="gt-sg-status-readouts">
            <span><span class="gt-sg-stat-lbl">Hits</span>1 840</span>
            <span><span class="gt-sg-stat-lbl">Saved</span>243</span>
            <span><span class="gt-sg-stat-lbl">Level</span>12</span>
            <span><span class="gt-sg-stat-lbl">Coins</span>🪙 42</span>
            <span><span class="gt-sg-stat-lbl">Balls</span>5</span>
          </div>
          <div style="display:flex;gap:6px;">
            ${buttonHtml({ action: "noop", label: "≡", variant: "secondary" })}
          </div>
        </div>
      </section>
    `;
  }

  #renderBonusCards() {
    return `
      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">11 · Bonuses — Permanent</h2>
        <div class="gt-sg-bonus-grid">
          <div class="gt-sg-bonus-card gt-sg-bonus-card--perm">
            <span class="gt-sg-bonus-icon">🟢</span>
            <div class="gt-sg-bonus-name">${i18n.t("bonus.permanent.extra_start_ball")}</div>
            <div class="gt-sg-bonus-desc">${i18n.t("bonus.permanent.extra_start_ball.desc")}</div>
            <div class="gt-sg-bonus-footer">
              <span class="gt-sg-rarity gt-sg-rarity--perm">Permanent</span>
              <span class="gt-sg-bonus-dur">Unlocks at Level 10</span>
            </div>
          </div>
          <div class="gt-sg-bonus-card gt-sg-bonus-card--perm">
            <span class="gt-sg-bonus-icon">🧲</span>
            <div class="gt-sg-bonus-name">${i18n.t("bonus.permanent.shop_magnet")}</div>
            <div class="gt-sg-bonus-desc">${i18n.t("bonus.permanent.shop_magnet.desc")}</div>
            <div class="gt-sg-bonus-footer">
              <span class="gt-sg-rarity gt-sg-rarity--perm">Permanent</span>
              <span class="gt-sg-bonus-dur">Unlocks at Level 20</span>
            </div>
          </div>
        </div>

        <h2 class="gt-sg-h2" style="margin-top:1.5rem;">11 · Bonuses — Session</h2>
        <div class="gt-sg-bonus-grid">
          <div class="gt-sg-bonus-card gt-sg-bonus-card--epic">
            <span class="gt-sg-bonus-icon">🚀</span>
            <div class="gt-sg-bonus-name">${i18n.t("bonus.session.bonus_launcher")}</div>
            <div class="gt-sg-bonus-desc">${i18n.t("bonus.session.bonus_launcher.desc")}</div>
            <div class="gt-sg-bonus-footer">
              <span class="gt-sg-rarity gt-sg-rarity--epic">Epic</span>
              <span class="gt-sg-bonus-dur">3 levels</span>
            </div>
          </div>
          <div class="gt-sg-bonus-card gt-sg-bonus-card--leg">
            <span class="gt-sg-bonus-icon">✨</span>
            <div class="gt-sg-bonus-name">${i18n.t("bonus.session.score_x2")}</div>
            <div class="gt-sg-bonus-desc">${i18n.t("bonus.session.score_x2.desc")}</div>
            <div class="gt-sg-bonus-footer">
              <span class="gt-sg-rarity gt-sg-rarity--leg">Legendary</span>
              <span class="gt-sg-bonus-dur">3 levels</span>
            </div>
          </div>
          <div class="gt-sg-bonus-card gt-sg-bonus-card--rare">
            <span class="gt-sg-bonus-icon">🧊</span>
            <div class="gt-sg-bonus-name">${i18n.t("bonus.session.ice_ball")}</div>
            <div class="gt-sg-bonus-desc">${i18n.t("bonus.session.ice_ball.desc")}</div>
            <div class="gt-sg-bonus-footer">
              <span class="gt-sg-rarity gt-sg-rarity--rare">Rare</span>
              <span class="gt-sg-bonus-dur">10 levels</span>
            </div>
          </div>
          <div class="gt-sg-bonus-card gt-sg-bonus-card--rare">
            <span class="gt-sg-bonus-icon">🔮</span>
            <div class="gt-sg-bonus-name">${i18n.t("bonus.session.glass_ball")}</div>
            <div class="gt-sg-bonus-desc">${i18n.t("bonus.session.glass_ball.desc")}</div>
            <div class="gt-sg-bonus-footer">
              <span class="gt-sg-rarity gt-sg-rarity--rare">Rare</span>
              <span class="gt-sg-bonus-dur">15 levels</span>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  #renderModals() {
    return `
      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">12 · ${i18n.t("styleguide.modal")}</h2>
        <div class="gt-btn-group">
          ${buttonHtml({ action: "open-modal", label: i18n.t("styleguide.open_modal") })}
        </div>

        <div style="margin-top:1rem;">
          <span class="gt-sg-sub-label">Shop Modal (static)</span>
          <div style="background:#1a060e;border:1px solid var(--pk-crimson-deep);border-radius:4px;padding:1.5rem;max-width:300px;margin-top:.5rem;">
            <div style="font-size:.9rem;letter-spacing:5px;text-transform:uppercase;color:var(--pk-gold);text-align:center;margin-bottom:1rem;padding-bottom:.75rem;border-bottom:1px solid var(--pk-crimson-deep);">${i18n.t("shop.title")}</div>
            <p style="text-align:center;font-size:.78rem;color:var(--gt-color-text-sec);line-height:1.6;margin-bottom:.75rem;">${i18n.t("shop.peg.intro")}</p>
            <p style="text-align:center;font-size:.8rem;font-weight:700;color:var(--pk-gold);margin-bottom:.75rem;">🪙 42 coins</p>
            <div style="display:flex;flex-direction:column;gap:.5rem;">
              ${buttonHtml({ action: "noop", label: "🧊 Ice Ball", variant: "primary" })}
              ${buttonHtml({ action: "noop", label: "✨ Score ×2", variant: "primary" })}
              ${buttonHtml({ action: "noop", label: "+1 Ball — 10 coins", variant: "secondary" })}
              ${buttonHtml({ action: "noop", label: i18n.t("shop.skip"), variant: "ghost" })}
            </div>
          </div>
        </div>

        <div style="margin-top:1rem;">
          <span class="gt-sg-sub-label">Game Over Modal (static)</span>
          <div style="background:#1a060e;border:1px solid var(--pk-crimson-deep);border-radius:4px;padding:1.5rem;max-width:300px;margin-top:.5rem;">
            <div style="font-size:.9rem;letter-spacing:5px;text-transform:uppercase;color:var(--pk-gold);text-align:center;margin-bottom:1rem;padding-bottom:.75rem;border-bottom:1px solid var(--pk-crimson-deep);">${i18n.t("game.over.title")}</div>
            <div style="text-align:center;font-size:2.2rem;margin-bottom:.75rem;">🎲</div>
            <div style="text-align:center;font-size:.78rem;color:var(--gt-color-text-sec);line-height:1.6;margin-bottom:1rem;">
              <p>You reached level <strong style="color:var(--pk-gold);">12</strong> with <strong style="color:var(--pk-gold);">1 840</strong> hits.</p>
              <p style="margin-top:.4rem;">243 saved · 57 drained</p>
            </div>
            <div style="display:flex;flex-direction:column;gap:.5rem;">
              ${buttonHtml({ action: "noop", label: i18n.t("game.over.replay"), variant: "primary" })}
              ${buttonHtml({ action: "noop", label: i18n.t("game.over.back"), variant: "ghost" })}
            </div>
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
        <h2 class="gt-sg-h2">13 · ${i18n.t("styleguide.animations")}</h2>
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
        <h2 class="gt-sg-h2">14 · VFX Overlay System</h2>
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
      case "open-modal":
        if (this.#sampleModal) return;
        this.#sampleModal = new OptionsModal({
          onClose: () => {
            this.#sampleModal = null;
          },
        });
        this.#sampleModal.open();
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
    this.#sampleModal?.destroy();
    this.#sampleModal = null;
    this.#bag.dispose();
    this.#el?.remove();
    this.#el = null;
  }
}
