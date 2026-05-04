import { ListenerBag } from "../utils/listener-bag.js";
import { i18n } from "../managers/i18n-manager.js";
import { layout } from "../managers/layout-manager.js";
import { buttonHtml } from "../components/ui/button.js";
import { toggleRowHtml } from "../components/ui/toggle-row.js";
import { OptionsModal } from "../components/options-modal.js";
import { TitleScene } from "./title-scene.js";

/**
 * StyleguideScene — dev-only visual library for every UI primitive.
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
    const colorTokens = [
      "bg",
      "surface",
      "surface-2",
      "text",
      "text-dim",
      "primary",
      "primary-2",
      "success",
      "warning",
      "danger",
      "focus",
    ];
    const swatches = colorTokens
      .map(
        (k) =>
          `<div class="gt-sg-swatch" style="background:var(--gt-color-${k})">
             <span class="gt-sg-swatch-name">${k}</span>
           </div>`,
      )
      .join("");

    const buttons = [
      buttonHtml({ action: "noop", label: "Primary", variant: "primary" }),
      buttonHtml({ action: "noop", label: "Secondary", variant: "secondary" }),
      buttonHtml({ action: "noop", label: "Danger", variant: "danger" }),
      buttonHtml({ action: "noop", label: "Ghost", variant: "ghost" }),
      buttonHtml({
        action: "noop",
        label: "Disabled",
        variant: "primary",
        disabled: true,
      }),
    ].join("");

    const toggles =
      toggleRowHtml({ action: "noop", label: "Toggle on", checked: true }) +
      toggleRowHtml({ action: "noop", label: "Toggle off", checked: false }) +
      toggleRowHtml({
        action: "noop",
        label: "Toggle disabled",
        checked: true,
        disabled: true,
      });

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
        <h2 class="gt-sg-h2">${i18n.t("styleguide.colors")}</h2>
        <div class="gt-sg-swatches">${swatches}</div>
      </section>

      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">${i18n.t("styleguide.buttons")}</h2>
        <div class="gt-btn-group">${buttons}</div>
      </section>

      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">${i18n.t("styleguide.toggles")}</h2>
        <div class="gt-stack">${toggles}</div>
      </section>

      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">${i18n.t("styleguide.modal")}</h2>
        <div class="gt-btn-group">
          ${buttonHtml({ action: "open-modal", label: i18n.t("styleguide.open_modal") })}
        </div>
      </section>

      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">${i18n.t("styleguide.animations")}</h2>
        <div class="gt-sg-anims">${animSamples}</div>
      </section>

      <section class="gt-sg-section">
        <h2 class="gt-sg-h2">${i18n.t("styleguide.plinko")}</h2>
        <div class="gt-sg-plinko">
          <div class="gt-sg-plinko-row">
            <div class="gt-sg-plinko-cell">
              <div class="gt-sg-plinko-stage">
                <div class="pk-peg"></div>
              </div>
              <span>peg</span>
            </div>
            <div class="gt-sg-plinko-cell">
              <div class="gt-sg-plinko-stage">
                <div class="pk-peg pk-peg--bumper"></div>
              </div>
              <span>bumper</span>
            </div>
            <div class="gt-sg-plinko-cell">
              <div class="gt-sg-plinko-stage">
                <div class="pk-ball" style="transform: translate(20px, 20px)"></div>
              </div>
              <span>ball</span>
            </div>
          </div>
          <div class="gt-sg-plinko-gates">
            <div class="pk-gate pk-gate--save">${i18n.t("game.gate.save")}</div>
            <div class="pk-gate pk-gate--recycle">${i18n.t("game.gate.recycle")}</div>
            <div class="pk-gate pk-gate--drain">${i18n.t("game.gate.drain")}</div>
          </div>
        </div>
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
