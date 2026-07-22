import { i18n } from "../managers/i18n-manager.js";
import { currencyManager } from "../managers/currency-manager.js";
import { abilityManager } from "../managers/ability-manager.js";
import { bonusManager } from "../managers/bonus-manager.js";
import { pegShopManager } from "../managers/peg-shop-manager.js";
import { ListenerBag } from "../utils/listener-bag.js";
import { SlowFloatBackground } from "../utils/slow-float-background.js";
import { iconSvg } from "../utils/icon.js";
import { PARAM_KEYS } from "../configs/bonus-defs.js";
import {
  PEG_SHOP_DEFS,
  findPegShopItem,
  rarityForCost,
} from "../configs/peg-shop-defs.js";
import { SHOP_SLOT_COUNT, SWIPE_THRESHOLD } from "../configs/constants.js";
import { LevelSelectorScene } from "./level-selector-scene.js";

/** Display metadata keyed by rarity value. */
const RARITY_META = /** @type {const} */ ({
  legendary: { letter: "L", suit: "diamond", label: "Legendary" },
  epic: { letter: "E", suit: "spade", label: "Epic" },
  rare: { letter: "R", suit: "club", label: "Rare" },
  common: { letter: "C", suit: "heart", label: "Common" },
});

/**
 * Slot height in CSS px for each level — must match shop.css values.
 * Used to compute the translateY that keeps the focused (full) card
 * vertically centred within the drum area.
 */
const SLOT_HEIGHTS = { full: 240, mini: 56, micro: 44, tiny: 38, dot: 26 };

/**
 * Boutique scene — vertical drum of slots.
 *
 * Sells **peg types** (coins) that are added to the slot-machine pool for the
 * current run. Buying a peg removes it from the offer (acquired this run,
 * tracked by `pegShopManager`). `SHOP_SLOT_COUNT` slots are rendered in a
 * column; the focused slot shows as a full playing card centred in the drum.
 * Adjacent slots progressively collapse: mini (±1), micro (±2), tiny (±3),
 * dot (±4+). Empty slots are dashed placeholders, never focused or clickable.
 *
 * The full card exposes two CTAs — "Add/Remove" (multi-select) and "Buy now"
 * (immediate single purchase). A bottom bar shows the selection count, total
 * cost, remaining balance after purchase, and a grouped buy button.
 */
export class ShopScene {
  /** @type {import('./scene-router.js').SceneRouter} */
  #router;

  /** @type {HTMLElement | null} */
  #el = null;

  /** @type {SlowFloatBackground | null} */
  #bg = null;

  /** @type {HTMLElement | null} */
  #drum = null;

  /** @type {HTMLElement | null} */
  #track = null;

  /** @type {ListenerBag} */
  #bag = new ListenerBag();

  /** @type {Set<string>} selected peg types */
  #selectedIds = new Set();

  /** @type {Array<import('../configs/peg-shop-defs.js').PegShopDef | null>} */
  #slots = [];

  /** @type {number} */
  #focusIdx = 0;

  /** @type {HTMLElement[]} */
  #slotEls = [];

  /** @type {string[]} */
  #slotLevels = [];

  /** @param {import('./scene-router.js').SceneRouter} router */
  constructor(router) {
    this.#router = router;
  }

  /** @param {HTMLElement} root */
  mount(root) {
    /* Entering the boutique counts as a shop visit — tick any shop-scoped
       rewards down. */
    bonusManager.onShopVisited();

    this.#bg = new SlowFloatBackground(root);
    this.#bag.add(() => this.#bg?.destroy());

    this.#fillSlots();
    this.#focusIdx = this.#firstFilled();

    this.#el = document.createElement("div");
    this.#el.className = "pk-shop";
    this.#el.innerHTML = this.#renderShell();
    root.appendChild(this.#el);

    this.#drum = this.#el.querySelector(".pk-shop-drum");

    this.#track = document.createElement("div");
    this.#track.className = "pk-shop-drum-track";
    this.#drum.appendChild(this.#track);

    this.#buildSlotShells();
    this.#renderAll();
    this.#renderBottom();
    this.#bindEvents();
  }

  destroy() {
    this.#bag.dispose();
    this.#el?.remove();
    this.#el = null;
    this.#drum = null;
    this.#track = null;
    this.#slotEls = [];
    this.#slotLevels = [];
  }

  // ─── Build / render ──────────────────────────────────────────────────

  #fillSlots() {
    const available = PEG_SHOP_DEFS.filter(
      (d) => !pegShopManager.isAcquired(d.type),
    );
    this.#slots = new Array(SHOP_SLOT_COUNT).fill(null);
    available.slice(0, SHOP_SLOT_COUNT).forEach((d, i) => {
      this.#slots[i] = d;
    });
  }

  #firstFilled() {
    const i = this.#slots.findIndex((b) => b !== null);
    return i < 0 ? 0 : i;
  }

  #renderShell() {
    return `
      <div class="pk-shop-header">
        <h1 class="pk-shop-title">${i18n.t("shop.title")}</h1>
        <p class="pk-shop-coins"><img src="images/coin.png" class="pk-coin-icon" alt="" /> <b class="pk-shop-coin-val">${currencyManager.get()}</b></p>
      </div>
      <div class="pk-shop-drum" aria-label="${i18n.t("shop.title")}"></div>
      <div class="pk-shop-bottom"></div>
      <button class="gt-btn gt-btn--ghost pk-shop-back" data-action="back">
        <span class="gt-btn-label">${i18n.t("menu.back")}</span>
      </button>
    `;
  }

  #buildSlotShells() {
    if (!this.#track) return;
    this.#track.innerHTML = "";
    this.#slotEls = [];
    this.#slotLevels = [];
    for (let i = 0; i < SHOP_SLOT_COUNT; i++) {
      const el = document.createElement("div");
      el.className = "pk-shop-slot";
      el.dataset.idx = String(i);
      this.#track.appendChild(el);
      this.#slotEls.push(el);
      this.#slotLevels.push("");
    }
  }

  #levelFor(i) {
    const d = Math.abs(i - this.#focusIdx);
    if (d === 0) return "full";
    if (d === 1) return "mini";
    if (d === 2) return "micro";
    if (d === 3) return "tiny";
    return "dot";
  }

  #renderAll() {
    for (let i = 0; i < SHOP_SLOT_COUNT; i++) {
      const lvl = this.#levelFor(i);
      const el = this.#slotEls[i];
      const isEmpty = !this.#slots[i];
      el.dataset.level = lvl;
      el.classList.toggle("is-empty", isEmpty);
      el.classList.toggle("is-focus", i === this.#focusIdx);
      if (this.#slotLevels[i] !== lvl || lvl === "full") {
        el.innerHTML = this.#renderSlotContent(i, lvl);
        this.#slotLevels[i] = lvl;
      }
    }
    this.#updateDrumPosition();
  }

  /**
   * Translate the drum track so the focused slot is vertically centred
   * within the drum element — and therefore centred on screen.
   */
  #updateDrumPosition() {
    if (!this.#drum || !this.#track) return;
    const drumH = this.#drum.clientHeight;
    if (drumH === 0) return;
    let cumH = 0;
    for (let i = 0; i < this.#focusIdx; i++) {
      cumH += SLOT_HEIGHTS[this.#levelFor(i)] ?? 26;
    }
    const focusH =
      SLOT_HEIGHTS[this.#levelFor(this.#focusIdx)] ?? SLOT_HEIGHTS.full;
    const translateY = drumH / 2 - cumH - focusH / 2;
    this.#track.style.transform = `translateY(${translateY}px)`;
  }

  #renderSlotContent(i, lvl) {
    const b = this.#slots[i];

    // Empty slot — visible dashed placeholder, never interactive.
    if (!b) {
      if (lvl === "dot")
        return `<div class="pk-shop-card-empty pk-shop-card-empty-dot">·</div>`;
      if (lvl === "full")
        return `<div class="pk-shop-card-empty pk-shop-card-empty-full">·</div>`;
      if (lvl === "mini")
        return `<div class="pk-shop-card-empty pk-shop-card-empty-mini">·</div>`;
      if (lvl === "micro")
        return `<div class="pk-shop-card-empty pk-shop-card-empty-micro">·</div>`;
      return `<div class="pk-shop-card-empty pk-shop-card-empty-tiny">·</div>`;
    }

    const rarity = rarityForCost(b.cost);
    const meta = RARITY_META[rarity] ?? RARITY_META.common;
    const nameKey = `peg_shop.${b.type}`;
    const displayCost = this.#priceFor(b.cost);
    const priceLbl = `<img src="images/coin.png" class="pk-coin-icon" alt="" /> ${displayCost}`;
    const rarityClass = `pk-shop-rarity-${rarity}`;
    const isSelected = this.#selectedIds.has(b.type);

    if (lvl === "dot") {
      return `<span class="pk-shop-dot">${iconSvg(b.icon ?? "dices")}</span>`;
    }

    if (lvl === "tiny") {
      return `
        <div class="pk-shop-card-tiny ${rarityClass}${isSelected ? " is-selected" : ""}">
          <span class="pk-shop-mini-icon">${iconSvg(b.icon ?? "dices")}</span>
        </div>
      `;
    }

    if (lvl === "micro") {
      return `
        <div class="pk-shop-card-micro ${rarityClass}${isSelected ? " is-selected" : ""}">
          <span class="pk-shop-mini-icon">${iconSvg(b.icon ?? "dices")}</span>
          <span class="pk-shop-mini-price">${priceLbl}</span>
        </div>
      `;
    }

    if (lvl === "mini") {
      return `
        <div class="pk-shop-card-mini ${rarityClass}${isSelected ? " is-selected" : ""}">
          <span class="pk-shop-mini-pip"><b>${meta.letter}</b>${iconSvg(meta.suit)}</span>
          <span class="pk-shop-mini-icon">${iconSvg(b.icon ?? "dices")}</span>
          <span class="pk-shop-mini-name">${i18n.t(nameKey)}</span>
          <span class="pk-shop-mini-price">${priceLbl}</span>
        </div>
      `;
    }

    // Full card
    const descKey = `${nameKey}.desc`;
    const canAfford = currencyManager.get() >= displayCost;
    const durText = i18n.t("shop.duration_run");

    const cls = [
      "pk-shop-card-full",
      rarityClass,
      isSelected ? "is-selected" : "",
      !canAfford ? "is-locked" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const ctaBtns = `
      <div class="pk-shop-card-actions">
        <button class="pk-shop-btn-select${isSelected ? " is-selected" : ""}"
                data-action="select" data-id="${b.type}">
          ${isSelected ? i18n.t("shop.deselect") : i18n.t("shop.select")}
        </button>
        <button class="pk-shop-btn-buy-now"
                data-action="buy-now" data-id="${b.type}"${!canAfford ? " disabled" : ""}>
          ${i18n.t("shop.buy_now")}
        </button>
      </div>
    `;

    return `
      <div class="${cls}">
        <div class="pk-shop-card-pip pip-tl">
          <span class="pip-v">${meta.letter}</span>
          <span class="pip-s">${iconSvg(meta.suit)}</span>
        </div>
        <div class="pk-shop-card-pip pip-br">
          <span class="pip-v">${meta.letter}</span>
          <span class="pip-s">${iconSvg(meta.suit)}</span>
        </div>
        <div class="pk-shop-card-body">
          <span class="pk-shop-card-icon">${iconSvg(b.icon ?? "dices")}</span>
          <span class="pk-shop-card-name">${i18n.t(nameKey)}</span>
          <p class="pk-shop-card-desc">${i18n.t(descKey)}</p>
          <div class="pk-shop-card-meta">
            <span class="pk-shop-card-label">${meta.label}</span>
            <span class="pk-shop-card-dur">${durText}</span>
          </div>
          <div class="pk-shop-card-price">${priceLbl}</div>
          ${ctaBtns}
        </div>
      </div>
    `;
  }

  #renderBottom() {
    if (!this.#el) return;
    const bottom = this.#el.querySelector(".pk-shop-bottom");
    if (!bottom) return;

    const count = this.#selectedIds.size;
    const totalCost = this.#selectedCost();
    const balance = currencyManager.get();
    const remaining = balance - totalCost;
    const canPay = balance >= totalCost;
    const coinImg = `<img src="images/coin.png" class="pk-coin-icon" alt="" />`;

    const totalDisplay =
      count > 0
        ? `${coinImg} <strong>${totalCost}</strong>`
        : `<strong>—</strong>`;

    const balanceClass = count > 0 ? (canPay ? " is-ok" : " is-bad") : "";
    const balanceDisplay =
      count > 0
        ? `${i18n.t("shop.after_purchase")} <strong>${coinImg} ${remaining}</strong>`
        : `${coinImg} <strong>${balance}</strong>`;

    let btnLabel, btnDisabled;
    if (count === 0) {
      btnLabel = i18n.t("shop.validate");
      btnDisabled = true;
    } else if (!canPay) {
      btnLabel = i18n.t("shop.cannot_afford");
      btnDisabled = true;
    } else {
      const costHtml = `${coinImg} ${totalCost}`;
      btnLabel = i18n
        .t("shop.validate_n", { n: count, cost: "__COST__" })
        .replace("__COST__", costHtml);
      btnDisabled = false;
    }

    bottom.innerHTML = `
      <div class="pk-shop-bottom-summary">
        <div class="pk-shop-bottom-row1">
          <span class="pk-shop-bottom-count">${i18n.t("shop.cart_label")} <strong>${count}</strong></span>
          <span class="pk-shop-bottom-sep">·</span>
          <span class="pk-shop-bottom-total">${totalDisplay}</span>
        </div>
        <div class="pk-shop-bottom-balance${balanceClass}">${balanceDisplay}</div>
      </div>
      <button class="gt-btn gt-btn--primary pk-shop-validate-btn"
              data-action="validate"${btnDisabled ? " disabled" : ""}>
        <span class="gt-btn-label">${btnLabel}</span>
      </button>
    `;

    const coinEl = this.#el.querySelector(".pk-shop-coin-val");
    if (coinEl) coinEl.textContent = String(balance);
  }

  /**
   * Resolve the boutique discount (permanent SHOP ability, clamped to 0–0.9)
   * and apply it to a cost.
   * @param {number} baseCost
   * @returns {number}
   */
  #priceFor(baseCost) {
    const discount = Math.min(
      0.9,
      Math.max(0, abilityManager.resolve(PARAM_KEYS.SHOP_DISCOUNT, 0)),
    );
    /* A malus can inflate every price (SHOP_PRICE_MULT); applied after the
       permanent discount. */
    const mult = Math.max(
      1,
      bonusManager.resolve(PARAM_KEYS.SHOP_PRICE_MULT, 1),
    );
    return Math.ceil(baseCost * (1 - discount) * mult);
  }

  #selectedCost() {
    let total = 0;
    for (const type of this.#selectedIds) {
      const def = findPegShopItem(type);
      if (def) total += this.#priceFor(def.cost);
    }
    return total;
  }

  // ─── Navigation ──────────────────────────────────────────────────────

  /** @param {1 | -1} dir */
  #navigate(dir) {
    let n = this.#focusIdx + dir;
    while (n >= 0 && n < SHOP_SLOT_COUNT && !this.#slots[n]) n += dir;
    if (n < 0 || n >= SHOP_SLOT_COUNT) return;
    if (n === this.#focusIdx) return;
    this.#focusIdx = n;
    this.#renderAll();
  }

  /** @param {number} idx */
  #focusTo(idx) {
    if (idx < 0 || idx >= SHOP_SLOT_COUNT) return;
    if (!this.#slots[idx]) return;
    if (idx === this.#focusIdx) return;
    this.#focusIdx = idx;
    this.#renderAll();
  }

  // ─── Interaction ─────────────────────────────────────────────────────

  #toggleSelection(type) {
    if (this.#selectedIds.has(type)) this.#selectedIds.delete(type);
    else this.#selectedIds.add(type);
    this.#renderAll();
    this.#renderBottom();
  }

  #tryBuyNow(type) {
    const def = findPegShopItem(type);
    if (!def || pegShopManager.isAcquired(type)) return;
    const cost = this.#priceFor(def.cost);
    if (currencyManager.get() < cost) return;
    if (!currencyManager.spend(cost)) return;
    pegShopManager.acquire(type);
    this.#selectedIds.delete(type);
    // currency/peg-shop change events cascade into #refresh automatically.
  }

  #tryValidate() {
    const defs = Array.from(this.#selectedIds)
      .map((type) => findPegShopItem(type))
      .filter((d) => d && !pegShopManager.isAcquired(d.type));
    const totalCost = defs.reduce(
      (sum, def) => sum + this.#priceFor(def.cost),
      0,
    );
    if (currencyManager.get() < totalCost) return;
    if (!currencyManager.spend(totalCost)) return;
    for (const def of defs) pegShopManager.acquire(def.type);
    this.#selectedIds.clear();
  }

  #refresh() {
    if (!this.#el) return;
    this.#fillSlots();
    if (this.#focusIdx >= SHOP_SLOT_COUNT || !this.#slots[this.#focusIdx]) {
      this.#focusIdx = this.#firstFilled();
    }
    const validIds = new Set(this.#slots.filter(Boolean).map((b) => b.type));
    for (const id of [...this.#selectedIds]) {
      if (!validIds.has(id)) this.#selectedIds.delete(id);
    }
    this.#slotLevels.fill("");
    this.#renderAll();
    this.#renderBottom();
  }

  // ─── Events ──────────────────────────────────────────────────────────

  #bindEvents() {
    this.#bag.on(this.#el, "click", this.#onClick);

    this.#bag.on(
      this.#drum,
      "wheel",
      (e) => {
        e.preventDefault();
        this.#navigate(e.deltaY > 0 ? 1 : -1);
      },
      { passive: false },
    );

    let lastY = 0;
    let armed = false;
    this.#bag.on(
      this.#drum,
      "touchstart",
      (e) => {
        if (e.touches.length !== 1) return;
        lastY = e.touches[0].clientY;
        armed = true;
      },
      { passive: true },
    );
    this.#bag.on(
      this.#drum,
      "touchmove",
      (e) => {
        if (!armed || e.touches.length !== 1) return;
        const y = e.touches[0].clientY;
        const dy = lastY - y;
        if (Math.abs(dy) > SWIPE_THRESHOLD) {
          this.#navigate(dy > 0 ? 1 : -1);
          lastY = y;
        }
      },
      { passive: true },
    );
    this.#bag.on(
      this.#drum,
      "touchend",
      () => {
        armed = false;
      },
      { passive: true },
    );
    this.#bag.on(
      this.#drum,
      "touchcancel",
      () => {
        armed = false;
      },
      { passive: true },
    );

    this.#bag.on(window, "resize", () => this.#updateDrumPosition());

    this.#bag.add(i18n.onChange(() => this.#refresh()));
    this.#bag.add(currencyManager.on("change", () => this.#refresh()));
    this.#bag.add(pegShopManager.on("change", () => this.#refresh()));
    this.#bag.add(abilityManager.on("change", () => this.#refresh()));
  }

  #onClick = (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const action = target.closest("[data-action]");
    if (action) {
      const name = /** @type {HTMLElement} */ (action).dataset.action;
      if (name === "back") {
        this.#router.start(LevelSelectorScene);
        return;
      }
      if (name === "validate") {
        this.#tryValidate();
        return;
      }
      if (name === "select") {
        const id = /** @type {HTMLElement} */ (action).dataset.id;
        if (id) this.#toggleSelection(id);
        return;
      }
      if (name === "buy-now") {
        const id = /** @type {HTMLElement} */ (action).dataset.id;
        if (id) this.#tryBuyNow(id);
        return;
      }
    }

    const slotEl = target.closest(".pk-shop-slot");
    if (!slotEl || !this.#drum?.contains(slotEl)) return;
    const idx = parseInt(
      /** @type {HTMLElement} */ (slotEl).dataset.idx ?? "-1",
      10,
    );
    if (idx < 0 || !this.#slots[idx]) return;
    if (idx !== this.#focusIdx) {
      this.#focusTo(idx);
    }
  };
}
