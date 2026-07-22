import { ListenerBag } from "../utils/listener-bag.js";
import { i18n } from "../managers/i18n-manager.js";
import { SLOT_MACHINE } from "../configs/constants.js";
import {
  iconForUpgrade,
  UPGRADE_TYPE_CATALOG,
} from "../configs/slot-machine-defs.js";
import { iconSvg } from "../utils/icon.js";

/** Rendered filler icons rolled through while a reel spins (visual only). */
const FILLER_ICONS = UPGRADE_TYPE_CATALOG.map((e) => iconForUpgrade(e.type));
const rand = (a) => a[Math.floor(Math.random() * a.length)];

/**
 * SlotMachineHud — the pinboard "bandit manchot" UI.
 *
 * Always shows `machine.maxReels` slots: the first `machine.reelCount` are
 * active reels; the rest render a padlock (not yet unlocked). Active reels roll
 * with a long, heavy vertical deceleration and a small tremble as they settle
 * (Web Animations API). The player presses a filled reel and drags the floating
 * token onto a classic peg; a re-spin re-rolls the emptied reels.
 *
 * The DOM-free {@link SlotMachine} entity is the source of truth for reel
 * contents and re-spin cost; the controller supplies the board hit-test
 * (`onDrop`), the paid re-spin (`onReroll`) and an affordability probe
 * (`canAfford`). Owns a `ListenerBag`; `destroy()` is idempotent and leaves no
 * listeners or stray ghost node behind.
 */
export class SlotMachineHud {
  /** @type {HTMLElement | null} */
  #el = null;
  /** @type {ListenerBag} */
  #bag = new ListenerBag();

  /** @type {import('../entities/slot-machine.js').SlotMachine} */
  #machine;
  /** @type {(type: string, clientX: number, clientY: number) => boolean} */
  #onDrop;
  /** @type {() => boolean} */
  #onReroll;
  /** @type {(cost: number) => boolean} */
  #canAfford;
  /** @type {() => boolean} True when a re-spin is currently allowed at all. */
  #canReroll;

  /** @type {{ index: number, type: string, ghost: HTMLElement } | null} */
  #drag = null;
  /** @type {boolean} True while reels are animating. */
  #spinning = false;

  /**
   * @param {{
   *   machine: import('../entities/slot-machine.js').SlotMachine,
   *   onDrop: (type: string, clientX: number, clientY: number) => boolean,
   *   onReroll: () => boolean,
   *   canAfford?: (cost: number) => boolean,
   *   canReroll?: () => boolean,
   * }} opts
   */
  constructor({
    machine,
    onDrop,
    onReroll,
    canAfford = () => true,
    canReroll = () => true,
  }) {
    this.#machine = machine;
    this.#onDrop = onDrop;
    this.#onReroll = onReroll;
    this.#canAfford = canAfford;
    this.#canReroll = canReroll;
  }

  /** @param {HTMLElement} root — the pinboard element */
  mount(root) {
    const el = document.createElement("div");
    el.className = "pk-slot-machine";
    el.setAttribute("aria-label", i18n.t("slotmachine.title"));
    el.innerHTML = `
      <div class="pk-slot-frame">
        <div class="pk-slot-reels" data-role="reels"></div>
      </div>
      <button class="pk-slot-reroll gt-clickable" data-role="reroll"
              type="button" title="${i18n.t("slotmachine.reroll")}">
        <span class="pk-slot-reroll-icon">${iconSvg("rotate-cw")}</span>
        <span class="pk-slot-reroll-cost" data-role="cost"></span>
      </button>
    `;
    root.appendChild(el);
    this.#el = el;

    this.#bag.add(i18n.onChange(() => this.#refreshStatics()));
    this.#bag.on(el, "pointerdown", this.#onReelDown);
    this.#bag.on(
      el.querySelector('[data-role="reroll"]'),
      "click",
      this.#onRerollClick,
    );
    this.#bag.on(window, "pointermove", this.#onPointerMove);
    this.#bag.on(window, "pointerup", this.#onPointerUp);
    this.#bag.on(window, "pointercancel", this.#onPointerCancel);

    this.renderReels();
    this.#renderReroll();
  }

  destroy() {
    this.#cancelDrag();
    this.#bag.dispose();
    this.#el?.remove();
    this.#el = null;
  }

  /**
   * Position the machine band. `top` is px from the pinboard top; the machine
   * is horizontally centered by CSS.
   * @param {{ top: number }} geo
   */
  setGeometry({ top }) {
    if (this.#el) this.#el.style.top = `${Math.round(top)}px`;
  }

  /**
   * Fade the machine into / out of the background — used while the player aims
   * the cannon, mirroring the score HUD.
   * @param {boolean} on
   */
  setDimmed(on) {
    this.#el?.classList.toggle("pk-slot-machine--dimmed", on);
  }

  /** Re-render reels + re-spin cost/enabled state from the entity. */
  refresh() {
    this.renderReels();
    this.#renderReroll();
  }

  /**
   * Paint the reel row: active reels (settled) followed by locked slots.
   */
  renderReels() {
    const host = this.#el?.querySelector('[data-role="reels"]');
    if (!host) return;
    const active = this.#machine.reels
      .map((reel, i) => {
        const empty = reel.type === null;
        const icon = empty ? "" : iconForUpgrade(reel.type);
        const cls = [
          "pk-slot-reel",
          empty ? "pk-slot-reel--empty" : "pk-slot-reel--filled",
        ];
        const typeAttr = empty ? "" : ` data-type="${reel.type}"`;
        return `<div class="${cls.join(" ")}" data-idx="${i}"${typeAttr}><span class="pk-slot-reel-icon">${icon}</span></div>`;
      })
      .join("");
    let locked = "";
    for (let i = 0; i < this.#machine.lockedCount; i++) {
      locked += `<div class="pk-slot-reel pk-slot-reel--locked" aria-label="${i18n.t("slotmachine.locked")}"><span class="pk-slot-reel-icon">${iconSvg("lock")}</span></div>`;
    }
    host.innerHTML = active + locked;
  }

  /**
   * Roll the reels. Without `indices` every active reel spins (opening / full
   * roll); with `indices` only those active reels spin (used on re-spin so
   * kept reels stay put). Each lands on its current entity type.
   * @param {number[]} [indices]
   */
  spin(indices) {
    const reelEls = this.#activeReelEls();
    const idxs = (indices ?? reelEls.map((_, i) => i)).filter(
      (i) => i < reelEls.length,
    );
    if (idxs.length === 0) return;
    this.#spinning = true;
    this.#renderReroll();
    const runs = idxs.map((i, order) =>
      this.#spinReel(reelEls[i], this.#machine.typeAt(i), order),
    );
    Promise.all(runs).then(() => {
      this.#spinning = false;
      this.#renderReroll();
    });
  }

  /** Active (non-locked) reel elements, in order. @returns {HTMLElement[]} */
  #activeReelEls() {
    const host = this.#el?.querySelector('[data-role="reels"]');
    if (!host) return [];
    return [
      ...host.querySelectorAll(".pk-slot-reel:not(.pk-slot-reel--locked)"),
    ];
  }

  /**
   * Animate one reel: heavy vertical roll to `finalType`, then a tremble. Falls
   * back to an instant settle when the Web Animations API is unavailable
   * (headless test env).
   * @param {HTMLElement} reelEl @param {string | null} finalType @param {number} order
   * @returns {Promise<void>}
   */
  #spinReel(reelEl, finalType, order) {
    return new Promise((resolve) => {
      const finalIcon = finalType ? iconForUpgrade(finalType) : "";
      const settle = () => {
        reelEl.className =
          "pk-slot-reel " +
          (finalType ? "pk-slot-reel--filled" : "pk-slot-reel--empty");
        if (finalType) reelEl.dataset.type = finalType;
        else delete reelEl.dataset.type;
        reelEl.innerHTML = `<span class="pk-slot-reel-icon">${finalIcon}</span>`;
      };

      if (!finalType || typeof reelEl.animate !== "function") {
        settle();
        resolve();
        return;
      }

      const HEAD = 1;
      const ROLL = SLOT_MACHINE.SPIN_ROLL_CELLS;
      const finalIdx = HEAD + ROLL;
      const cells = Array.from({ length: finalIdx + 1 }, () =>
        rand(FILLER_ICONS),
      );
      cells[finalIdx] = finalIcon;
      const strip = document.createElement("div");
      strip.className = "pk-slot-strip";
      strip.innerHTML = cells
        .map((c) => `<div class="pk-slot-cell">${c}</div>`)
        .join("");
      reelEl.className = "pk-slot-reel pk-slot-reel--filled";
      reelEl.dataset.type = finalType;
      reelEl.innerHTML = "";
      reelEl.appendChild(strip);

      const cell = strip.querySelector(".pk-slot-cell").offsetHeight || 1;
      const startPx = -HEAD * cell;
      const finalPx = -finalIdx * cell;
      strip.style.transform = `translateY(${startPx}px)`;

      const anim = strip.animate(
        [
          {
            transform: `translateY(${startPx}px)`,
            easing: SLOT_MACHINE.SPIN_EASING,
            offset: 0,
          },
          { transform: `translateY(${finalPx}px)`, offset: 1 },
        ],
        {
          duration: SLOT_MACHINE.SPIN_DURATION_MS,
          delay: order * SLOT_MACHINE.SPIN_STAGGER_MS,
          easing: "linear",
          fill: "forwards",
        },
      );

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        settle();
        reelEl.animate?.(
          [
            { transform: "translateY(0)" },
            { transform: "translateY(-3px)" },
            { transform: "translateY(3px)" },
            { transform: "translateY(-1px)" },
            { transform: "translateY(0)" },
          ],
          { duration: SLOT_MACHINE.TREMBLE_MS, easing: "ease-out" },
        );
        resolve();
      };
      anim.finished?.then?.(finish).catch?.(finish);
      /* Safety net in case the WAAPI promise never settles. */
      this.#bag.timeout(
        finish,
        SLOT_MACHINE.SPIN_DURATION_MS +
          order * SLOT_MACHINE.SPIN_STAGGER_MS +
          80,
      );
    });
  }

  // ─── Re-spin ─────────────────────────────────────────────────────────

  #renderReroll() {
    const btn = this.#el?.querySelector('[data-role="reroll"]');
    const costEl = this.#el?.querySelector('[data-role="cost"]');
    if (!btn || !costEl) return;
    const cost = this.#machine.rerollCost();
    costEl.innerHTML = `${cost}${iconSvg("coins", { size: 14 })}`;
    const enabled =
      !this.#spinning && this.#canReroll() && this.#canAfford(cost);
    btn.toggleAttribute("disabled", !enabled);
  }

  #onRerollClick = () => {
    if (this.#spinning) return;
    if (!this.#canReroll()) return;
    const cost = this.#machine.rerollCost();
    if (!this.#canAfford(cost)) return;
    /* A re-spin re-rolls every reel. */
    if (this.#onReroll()) {
      this.#renderReroll();
      this.spin();
    }
  };

  // ─── Drag & drop ─────────────────────────────────────────────────────

  #onReelDown = (event) => {
    if (this.#spinning) return;
    const reelEl = /** @type {HTMLElement} */ (event.target).closest(
      ".pk-slot-reel--filled",
    );
    if (!reelEl || !this.#el?.contains(reelEl)) return;
    const index = Number(reelEl.dataset.idx);
    const type = this.#machine.typeAt(index);
    if (type === null) return;

    event.preventDefault();
    event.stopPropagation();

    const ghost = document.createElement("div");
    ghost.className = "pk-slot-ghost";
    ghost.innerHTML = iconForUpgrade(type);
    document.body.appendChild(ghost);
    this.#drag = { index, type, ghost };
    this.#moveGhost(event.clientX, event.clientY);
    this.#el.classList.add("pk-slot-machine--dragging");
    reelEl.classList.add("pk-slot-reel--dragging");
  };

  #onPointerMove = (event) => {
    if (!this.#drag) return;
    this.#moveGhost(event.clientX, event.clientY);
  };

  #onPointerUp = (event) => {
    if (!this.#drag) return;
    const { index, type } = this.#drag;
    this.#cancelDrag();
    const applied = this.#onDrop(type, event.clientX, event.clientY);
    if (applied) {
      this.#machine.consume(index);
      this.refresh();
    }
  };

  #onPointerCancel = () => {
    this.#cancelDrag();
  };

  /** @param {number} x @param {number} y */
  #moveGhost(x, y) {
    const g = this.#drag?.ghost;
    if (g) {
      g.style.left = `${x}px`;
      g.style.top = `${y}px`;
    }
  }

  #cancelDrag() {
    if (!this.#drag) return;
    this.#drag.ghost.remove();
    this.#drag = null;
    this.#el?.classList.remove("pk-slot-machine--dragging");
    this.#el
      ?.querySelector(".pk-slot-reel--dragging")
      ?.classList.remove("pk-slot-reel--dragging");
  }

  /** Refresh locale-bound static text (aria/title). */
  #refreshStatics() {
    if (!this.#el) return;
    this.#el.setAttribute("aria-label", i18n.t("slotmachine.title"));
    this.#el
      .querySelector('[data-role="reroll"]')
      ?.setAttribute("title", i18n.t("slotmachine.reroll"));
    this.renderReels();
  }
}
