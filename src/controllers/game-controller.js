import { ListenerBag } from "../utils/listener-bag.js";
import { layout } from "../managers/layout-manager.js";
import { i18n } from "../managers/i18n-manager.js";
import { saveManager } from "../managers/save-manager.js";
import { audioManager } from "../managers/audio-manager.js";
import { bonusManager } from "../managers/bonus-manager.js";
import { gameEvents } from "../utils/event-emitter.js";
import { collideCircles, reflect, clampVelocity, collideBalls } from "../utils/physics.js";
import { Ball } from "../entities/ball.js";
import { Layer, bumperChanceForLevel } from "../entities/layer.js";
import { Slot } from "../entities/slot.js";
import { PLINKO, PLINKO_RANKING_MODE, STORAGE_KEYS } from "../configs/constants.js";
import { SESSION_BONUSES, PERMANENT_BONUSES } from "../configs/bonus-defs.js";
import { buttonHtml } from "../components/ui/button.js";
import { GameOverModal } from "../components/game-over-modal.js";
import { TitleScene } from "../scenes/title-scene.js";

/**
 * GameController — wires the whole Plinko round.
 *
 * Owns DOM, game state (hits/drained/saved/level), the layer stack, the
 * physics RAF loop and end-of-round detection. All peg/ball positions live
 * in pinboard-local CSS pixels (origin = pinboard top-left). The
 * `.pk-stack` wrapper translates vertically as the level rises.
 */
export class GameController {
  /** @type {HTMLElement} */ #root;
  /** @type {import('../scenes/scene-router.js').SceneRouter | null} */ #router;
  /** @type {ListenerBag} */ #bag = new ListenerBag();

  /** @type {HTMLElement | null} */ #safeEl = null;
  /** @type {HTMLElement | null} */ #pinboardEl = null;
  /** @type {HTMLElement | null} */ #stackEl = null;
  /** @type {HTMLElement | null} */ #levelBarEl = null;
  /** @type {HTMLElement | null} */ #levelLabelEl = null;
  /** @type {HTMLElement[]} */ #sublaunchEls = [];
  /** @type {HTMLElement | null} */ #savedBtn = null;
  /** @type {HTMLElement | null} */ #readoutHits = null;
  /** @type {HTMLElement | null} */ #readoutDrained = null;
  /** @type {HTMLElement | null} */ #readoutLevel = null;
  /** @type {HTMLElement | null} */ #readoutBalls = null;
  /** @type {HTMLElement | null} */ #readoutBallsIce = null;
  /** @type {HTMLElement | null} */ #readoutBallsGlass = null;
  /** @type {GameOverModal | null} */ #overModal = null;
  /** @type {HTMLElement | null} */ #bonusBarEl = null;

  /* --- Game state --- */
  /** @type {number[]} */ #sublaunchBalls = [];
  /** @type {number} */ #saved = 0;
  /** @type {number} */ #hits = 0;
  /** @type {number} */ #drained = 0;
  /** @type {number} */ #level = 0;
  /** @type {Layer[]} */ #layers = [];
  /** @type {Map<number, HTMLElement>} */ #layerEls = new Map();
  /** @type {Map<number, HTMLElement>} */ #pegEls = new Map();
  /** @type {Map<number, { ball: Ball, el: HTMLElement }>} */ #balls = new Map();
  /**
   * Stuck-ball tracking. Maps ball id to the last time its position
   * changed significantly (ms from performance.now).
   */
  /** @type {Map<number, { x: number, y: number, since: number }>} */ #ballIdleTracker = new Map();
  /** @type {number} */ #pinboardWidth = 0;
  /** @type {number} */ #pinboardHeight = 0;
  /** @type {boolean} */ #lockedLaunch = true;
  /** @type {boolean} */ #ended = false;
  /** @type {boolean} */ #shopUsedThisLevel = false;
  /** @type {number} */ #scoreMultiplier = 1;
  /** @type {number} */ #coins = 0;
  /** @type {HTMLElement | null} */ #chestEl = null;
  /** @type {HTMLElement | null} */ #coinCountEl = null;
  /** @type {number | null} */ #rafId = null;
  /** @type {number} */ #lastTs = 0;

  /* --- Ice-ball bonus state --- */
  /** Sublaunch index whose next spawn should be an ice ball (-1 = none queued). */
  /** @type {number} */ #iceBallSublaunchQueued = -1;
  /** Live ice-ball ids (while the ball is in the physics world). */
  /** @type {Set<number>} */ #iceBallIds = new Set();
  /** True when an ice ball entered the save/shop gate and is waiting to be re-queued. */
  /** @type {boolean} */ #iceBallSaved = false;

  /* --- Glass-ball bonus state --- */
  /** Sublaunch index whose next spawn should be a glass ball (-1 = none queued). */
  /** @type {number} */ #glassBallSublaunchQueued = -1;
  /** Live glass-ball ids (while the ball is in the physics world). */
  /** @type {Set<number>} */ #glassBallIds = new Set();
  /** True when a glass ball entered the save/shop gate and is waiting to be re-queued. */
  /** @type {boolean} */ #glassBallSaved = false;

  /* --- Extended physics (ball layer, gate zones) --- */
  /** @type {HTMLElement | null} */ #ballLayerEl = null;
  /** @type {number} */ #pinboardOffsetTop = 0;
  /** @type {number} */ #gateZoneHeight = 0;
  /** @type {{ left: number, right: number }[]} */ #gateWalls = [];
  /** @type {{ left: number, right: number, top: number, bottom: number }[]} */ #launchWalls = [];

  /**
   * @param {{ root: HTMLElement,
   *   router?: import('../scenes/scene-router.js').SceneRouter,
   *   data?: object }} args
   */
  constructor({ root, router = null }) {
    this.#root = root;
    this.#router = router;
  }

  /** Build the DOM and start a fresh round. */
  start() {
    const ballsPerSub = bonusManager.resolve("startingBallsPerSublaunch", PLINKO.STARTING_BALLS_PER_SUBLAUNCH);
    this.#sublaunchBalls = Array(PLINKO.SUBLAUNCH_COUNT).fill(ballsPerSub);
    this.#loadCoins();
    this.#buildDom();
    this.#measure();
    this.#bag.add(layout.onChange(() => this.#onResize()));
    this.#bag.add(i18n.onChange(() => this.#refreshLabels()));
    this.#refreshLabels();
    this.#refreshSublaunches();
    this.#refreshSavedBtn();
    this.#spawnHeldBalls();

    bonusManager.initSession(this.#makeBonusContext());
    this.#refreshBonusBar();

    /* Drop the first layer (level 0). Launch is locked while it falls. */
    this.#addLayer({ initial: true });
    this.#bag.timeout(() => {
      this.#lockedLaunch = false;
    }, PLINKO.LAYER_FALL_MS);

    gameEvents.emit("game:start");

    if (import.meta.env.DEV) {
      this.#bag.add(gameEvents.on("dev:spawnBall", () => this.#devSpawnBall(false)));
      this.#bag.add(gameEvents.on("dev:spawnIceBall", () => this.#devSpawnBall(true)));
      this.#bag.add(gameEvents.on("dev:spawnGlassBall", () => this.#devSpawnBall(false, true)));
      this.#bag.add(gameEvents.on("dev:activateBonus", ({ id }) => this.#devActivateBonus(id)));
    }
  }

  destroy() {
    this.#stopLoop();
    bonusManager.endSession();
    this.#overModal?.destroy();
    this.#overModal = null;
    this.#bag.dispose();
    this.#balls.clear();
    this.#ballIdleTracker.clear();
    this.#pegEls.clear();
    this.#layerEls.clear();
    this.#layers = [];
    this.#iceBallIds.clear();
    this.#iceBallSaved = false;
    this.#iceBallSublaunchQueued = -1;
    this.#glassBallIds.clear();
    this.#glassBallSublaunchQueued = -1;
    this.#glassBallSaved = false;
    gameEvents.emit("game:end");
  }

  /* ──────────────────────────────────────────────────────────────────────
     DOM
     ────────────────────────────────────────────────────────────────────── */

  #buildDom() {
    this.#root.classList.add("gt-game");
    const safe = document.createElement("div");
    safe.className = "gt-game-safe";
    safe.innerHTML = `
      <div class="pk-launch" data-role="launch">
        ${[0, 1, 2]
          .map(
            (i) => `
          <div class="pk-sublaunch" data-sublaunch="${i}"></div>`,
          )
          .join("")}
        <div class="pk-launch-savedrow">
          ${buttonHtml({ action: "saved-up", label: i18n.t("game.send_up", { n: 0 }), variant: "primary", modifier: "pk-saved-up", disabled: true })}
        </div>
      </div>
      <div class="pk-bonus-bar" data-role="bonus-bar"></div>
      <div class="pk-freezone"></div>
      <div class="pk-pinboard" data-role="pinboard">
        <div class="pk-level-bar" data-role="level-bar"></div>
        <div class="pk-level-label" data-role="level-label"></div>
        <div class="pk-stack" data-role="stack"></div>
      </div>
      <div class="pk-collection">
        <div class="pk-gate pk-gate--save"    data-gate="save"><span class="pk-gate-label">${i18n.t("game.gate.save")}</span></div>
        <div class="pk-gate pk-gate--recycle" data-gate="recycle"><span class="pk-gate-label">${i18n.t("game.gate.recycle")}</span></div>
        <div class="pk-gate pk-gate--shop"    data-gate="shop"></div>
        <div class="pk-gate pk-gate--drain"   data-gate="drain"><span class="pk-gate-label">${i18n.t("game.gate.drain")}</span></div>
        <div class="pk-chest" data-role="chest">
          <span class="pk-chest-icon">\uD83E\uDDF0</span>
          <span class="pk-chest-count" data-role="coin-count">0</span>
        </div>
      </div>
      <div class="pk-status">
        <div class="pk-status-readouts">
          <span class="pk-status-readout"><span>${i18n.t("game.hits")}:</span><b data-role="r-hits">0</b></span>
          <span class="pk-status-readout"><span>${i18n.t("game.drained")}:</span><b data-role="r-drained">0</b></span>
          <span class="pk-status-readout"><span>${i18n.t("game.level")}:</span><b data-role="r-level">0</b></span>
          <span class="pk-status-readout"><span>${i18n.t("game.balls")}:</span><b data-role="r-balls">0</b></span>
          <span class="pk-status-readout"><span>${i18n.t("game.balls_ice")}:</span><b data-role="r-balls-ice">0</b></span>
          <span class="pk-status-readout"><span>${i18n.t("game.balls_glass")}:</span><b data-role="r-balls-glass">0</b></span>
        </div>
        <div class="pk-status-actions">
          ${buttonHtml({ action: "back", label: i18n.t("game.back"), variant: "ghost" })}
        </div>
      </div>
    `;
    this.#root.appendChild(safe);
    this.#safeEl = safe;
    /* Ball layer — above all zones, overflow visible so balls render everywhere */
    const ballLayer = document.createElement("div");
    ballLayer.className = "pk-ball-layer";
    safe.appendChild(ballLayer);
    this.#ballLayerEl = ballLayer;
    this.#pinboardEl = safe.querySelector('[data-role="pinboard"]');
    this.#stackEl = safe.querySelector('[data-role="stack"]');
    this.#levelBarEl = safe.querySelector('[data-role="level-bar"]');
    this.#levelLabelEl = safe.querySelector('[data-role="level-label"]');
    this.#sublaunchEls = Array.from(safe.querySelectorAll(".pk-sublaunch"));
    this.#savedBtn = safe.querySelector(".pk-saved-up");
    this.#readoutHits = safe.querySelector('[data-role="r-hits"]');
    this.#readoutDrained = safe.querySelector('[data-role="r-drained"]');
    this.#readoutLevel = safe.querySelector('[data-role="r-level"]');
    this.#readoutBalls = safe.querySelector('[data-role="r-balls"]');
    this.#readoutBallsIce = safe.querySelector('[data-role="r-balls-ice"]');
    this.#readoutBallsGlass = safe.querySelector('[data-role="r-balls-glass"]');
    this.#bonusBarEl = safe.querySelector('[data-role="bonus-bar"]');
    this.#chestEl = safe.querySelector('[data-role="chest"]');
    this.#coinCountEl = safe.querySelector('[data-role="coin-count"]');
    this.#refreshCoinDisplay();

    this.#bag.on(safe, "pointerdown", this.#onPointer);
  }

  #onPointer = (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    const sub = target.closest("[data-sublaunch]");
    if (sub) {
      const i = Number(/** @type {HTMLElement} */ (sub).dataset.sublaunch);
      this.#fireSublaunch(i);
      return;
    }
    const badge = target.closest("[data-bonus-id]");
    if (badge) {
      const id = /** @type {HTMLElement} */ (badge).dataset.bonusId;
      if (bonusManager.canActivate(id)) {
        bonusManager.activateBonus(id);
        this.#refreshBonusBar();
      }
      return;
    }
    const action = target.closest("[data-action]");
    if (!action) return;
    const name = /** @type {HTMLElement} */ (action).dataset.action;
    if (name === "saved-up") this.#savedUp();
    else if (name === "back") this.#endRoundEarly();
  };

  /* ──────────────────────────────────────────────────────────────────────
     Layout
     ────────────────────────────────────────────────────────────────────── */

  #onResize() {
    if (!this.#pinboardEl) return;
    this.#measure();
    for (const layer of this.#layers) {
      for (const peg of layer.pegs) {
        peg.x = Slot.xFor(peg.slot, this.#pinboardWidth);
        const el = this.#pegEls.get(peg.id);
        if (el) el.style.left = `${peg.x}px`;
      }
    }
    /* Snap to new positions instantly on resize (no transition). */
    this.#recalcLayerPositions({ animate: false });
  }

  #measure() {
    if (!this.#pinboardEl || !this.#safeEl) return;
    const r = this.#pinboardEl.getBoundingClientRect();
    const sr = this.#safeEl.getBoundingClientRect();
    this.#pinboardWidth = r.width;
    this.#pinboardHeight = r.height;
    this.#pinboardOffsetTop = r.top - sr.top;
    const collectionEl = this.#safeEl.querySelector(".pk-collection");
    this.#gateZoneHeight = collectionEl ? collectionEl.offsetHeight : 0;
    this.#computeGateWalls();
    this.#computeLaunchWalls();
  }

  #computeGateWalls() {
    const w = this.#pinboardWidth;
    const { save, recycle, shop } = bonusManager.resolveGateWidths(PLINKO.GATE_WIDTHS);
    let x = 0;
    this.#gateWalls = [
      { left: x, right: (x += save * w) },
      { left: x, right: (x += recycle * w) },
      { left: x, right: (x += shop * w) },
      { left: x, right: w },
    ];
  }

  #computeLaunchWalls() {
    if (!this.#pinboardEl) return;
    const pr = this.#pinboardEl.getBoundingClientRect();
    this.#launchWalls = [];
    for (const el of this.#sublaunchEls) {
      const r = el.getBoundingClientRect();
      this.#launchWalls.push({
        left: r.left - pr.left,
        right: r.right - pr.left,
        top: r.top - pr.top,
        bottom: r.bottom - pr.top,
      });
    }
  }

  /* ──────────────────────────────────────────────────────────────────────
     Layers
     ────────────────────────────────────────────────────────────────────── */

  /**
   * All coordinates are pinboard-absolute (origin = pinboard top-left).
   * Layer 0 (oldest) sits at the bottom; each new layer stacks on top.
   * The .pk-stack element fills the entire pinboard (CSS inset:0).
   *
   * layer.y = h - (arrayIndex + 1) * LAYER_HEIGHT
   *   arrayIndex 0 = oldest = bottom → y = h - LAYER_H  (large y)
   *   arrayIndex n = newest = top  → y = h - (n+1)*LAYER_H (small/neg y)
   */

  /** @param {{ initial?: boolean }} [opts] */
  #addLayer({ initial = false } = {}) {
    if (!this.#stackEl) return;
    const layer = new Layer({
      level: this.#level,
      width: this.#pinboardWidth || 320,
      y: 0,
      bumperChance: bonusManager.resolve("bumperChance", bumperChanceForLevel(this.#level)),
    });
    this.#layers.push(layer);
    /* Newest layer = topmost = smallest y (may be negative = above pinboard). */
    layer.y = this.#pinboardHeight - this.#layers.length * PLINKO.LAYER_HEIGHT;
    for (const peg of layer.pegs) peg.y = layer.y;
    this.#renderLayer(layer, { animate: !initial });
    this.#refreshLevelLabel();
    this.#refreshLevelBar();

    if (!initial) {
      this.#bag.timeout(
        () => this.#pruneBottomLayers(),
        PLINKO.CAMERA_RISE_DELAY_MS,
      );
    }
  }

  /**
   * Recompute every layer's absolute pinboard y and update DOM.
   * @param {{ animate?: boolean }} [opts]  animate=false snaps instantly
   */
  #recalcLayerPositions({ animate = true } = {}) {
    const total = this.#layers.length;
    const h = this.#pinboardHeight;
    if (!animate) {
      for (const layer of this.#layers) {
        const el = this.#layerEls.get(layer.id);
        if (el) el.style.transition = "none";
      }
    }
    for (let i = 0; i < total; i++) {
      const layer = this.#layers[i];
      /* i=0 = oldest/bottom → y = h - LAYER_H (large)
         i=total-1 = newest/top → y = h - total*LAYER_H (small/neg) */
      layer.y = h - (i + 1) * PLINKO.LAYER_HEIGHT;
      const el = this.#layerEls.get(layer.id);
      if (el) el.style.top = `${layer.y}px`;
      for (const peg of layer.pegs) {
        peg.y = layer.y;
        const pegEl = this.#pegEls.get(peg.id);
        if (pegEl) pegEl.style.top = "0px";
      }
    }
    if (!animate) {
      requestAnimationFrame(() => {
        for (const layer of this.#layers) {
          const el = this.#layerEls.get(layer.id);
          if (el) el.style.transition = "";
        }
      });
    }
  }

  /** Remove excess bottom layers and slide remaining ones down smoothly. */
  #pruneBottomLayers() {
    const overflow = Math.max(0, this.#layers.length - PLINKO.VISIBLE_LAYERS);
    for (let i = 0; i < overflow; i++) {
      const removed = this.#layers.shift();
      if (!removed) break;
      this.#layerEls.get(removed.id)?.remove();
      this.#layerEls.delete(removed.id);
      for (const peg of removed.pegs) this.#pegEls.delete(peg.id);
    }
    if (overflow > 0) {
      /* Remaining layers slide down (animated) — oldest fills the bottom gap. */
      this.#recalcLayerPositions({ animate: true });
    }
  }

  /** @param {Layer} layer
   *  @param {{ animate?: boolean }} [opts] */
  #renderLayer(layer, { animate = false } = {}) {
    if (!this.#stackEl) return;
    const el = document.createElement("div");
    el.className = "pk-layer";
    if (animate) {
      /* Start just above the pinboard (launch zone), then fall to final y. */
      el.style.transition = "none";
      el.style.top = `${-PLINKO.LAYER_HEIGHT}px`;
    } else {
      el.style.top = `${layer.y}px`;
    }

    const milestone = layer.level > 0 && layer.level % 10 === 0;
    const tag = document.createElement("div");
    tag.className = `pk-layer-tag${milestone ? " pk-layer-tag--milestone" : ""}`;
    tag.textContent = `L${layer.level}`;
    el.appendChild(tag);

    for (const peg of layer.pegs) {
      peg.y = layer.y;
      const p = document.createElement("div");
      const isBumper = peg.type === "bumper";
      const isCoin = peg.type === "coin";
      const isShop = peg.type === "shop";
      const shopRarity = isShop ? /** @type {import('../entities/peg-shop.js').ShopPeg} */ (peg).rarity : "";
      p.className = `pk-peg${isBumper ? " pk-peg--bumper" : ""}${isCoin ? " pk-peg--coin" : ""}${isShop ? ` pk-peg--shop pk-peg--shop--${shopRarity}` : ""}`;
      if (isCoin) p.textContent = "$";
      if (isShop) {
        const counter = document.createElement("span");
        counter.className = "pk-shop-peg-counter";
        counter.textContent = String(/** @type {import('../entities/peg-shop.js').ShopPeg} */ (peg).hitsRemaining);
        p.appendChild(counter);
      }
      p.style.left = `${peg.x}px`;
      p.style.top = "0px";
      p.dataset.pegId = String(peg.id);
      el.appendChild(p);
      this.#pegEls.set(peg.id, p);
    }

    this.#stackEl.appendChild(el);
    this.#layerEls.set(layer.id, el);

    if (animate) {
      requestAnimationFrame(() => {
        el.style.transition = "";
        el.style.top = `${layer.y}px`;
      });
    }
  }

  #refreshLevelLabel() {
    if (this.#levelLabelEl) {
      this.#levelLabelEl.textContent = `${i18n.t("game.level")} ${this.#level}`;
    }
    if (this.#readoutLevel) this.#readoutLevel.textContent = String(this.#level);
  }

  #refreshLevelBar() {
    if (!this.#levelBarEl) return;
    const pct = Math.min(1, this.#level / PLINKO.MAX_LEVEL) * 100;
    this.#levelBarEl.style.height = `${pct}%`;
  }

  /* ──────────────────────────────────────────────────────────────────────
     Launch
     ────────────────────────────────────────────────────────────────────── */

  #fireSublaunch(index) {
    if (this.#lockedLaunch || this.#ended) return;
    const held = this.#getHeldBalls(index);
    if (held.length === 0) return;
    const subEl = this.#sublaunchEls[index];
    subEl?.setAttribute("data-firing", "true");
    this.#bag.timeout(() => subEl?.removeAttribute("data-firing"), 400);
    this.#emitReceptacleParticles(subEl);
    for (const { ball } of held) {
      ball.state = "active";
    }
    this.#sublaunchBalls[index] = 0;
    this.#refreshSublaunches();
  }

  /** @param {number} subIndex */
  #getHeldBalls(subIndex) {
    const result = [];
    for (const entry of this.#balls.values()) {
      if (entry.ball.state === "held" && entry.ball.sublaunchIdx === subIndex) result.push(entry);
    }
    return result;
  }

  /** Pre-spawn all balls as "held" entities in the launch zone. */
  #spawnHeldBalls() {
    if (!this.#ballLayerEl) return;
    this.#computeLaunchWalls();
    const count = this.#sublaunchEls.length;
    for (let i = 0; i < count; i++) {
      const n = this.#sublaunchBalls[i] ?? 0;
      const box = this.#launchWalls[i];
      if (!box) continue;
      const cx = (box.left + box.right) / 2;
      const boxW = box.right - box.left;
      for (let b = 0; b < n; b++) {
        const jx = (Math.random() - 0.5) * (boxW * 0.5);
        const ball = new Ball({ x: cx + jx, y: box.top + 4 + b * 4 });
        ball.state = "held";
        ball.sublaunchIdx = i;
        const el = document.createElement("div");
        el.className = "pk-ball";
        if (this.#iceBallSublaunchQueued === i && b === n - 1) {
          this.#iceBallSublaunchQueued = -1;
          ball.isIce = true;
          this.#iceBallIds.add(ball.id);
          el.classList.add("pk-ball--ice");
        } else if (this.#glassBallSublaunchQueued === i && b === n - 1) {
          this.#glassBallSublaunchQueued = -1;
          ball.isGlass = true;
          ball.glassHits = PLINKO.GLASS_BALL_MAX_HITS;
          this.#glassBallIds.add(ball.id);
          el.classList.add("pk-ball--glass");
        }
        const oy = this.#pinboardOffsetTop;
        el.style.transform = `translate(${ball.x}px, ${ball.y + oy}px)`;
        this.#ballLayerEl.appendChild(el);
        this.#balls.set(ball.id, { ball, el });
      }
    }
    this.#startLoop();
    this.#refreshBallReadouts();
  }

  /** Spawn a single active ball (used by dev panel and recycle). */
  #spawnActiveBall(subIndex, ice = false, glass = false) {
    if (!this.#ballLayerEl) return;
    const w = this.#pinboardWidth;
    const count = this.#sublaunchEls.length;
    const sx = (w * (subIndex + 0.5)) / count;
    const jitter = (Math.random() - 0.5) * 14;
    const ball = new Ball({
      x: sx + jitter,
      y: -PLINKO.BALL_RADIUS * 2,
      vx: (Math.random() - 0.5) * 60,
      vy: 0,
    });
    ball.state = "active";
    const el = document.createElement("div");
    el.className = "pk-ball";
    if (ice) {
      ball.isIce = true;
      this.#iceBallIds.add(ball.id);
      el.classList.add("pk-ball--ice");
    }
    if (glass) {
      ball.isGlass = true;
      ball.glassHits = PLINKO.GLASS_BALL_MAX_HITS;
      this.#glassBallIds.add(ball.id);
      el.classList.add("pk-ball--glass");
    }
    const oy = this.#pinboardOffsetTop;
    el.style.transform = `translate(${ball.x}px, ${ball.y + oy}px)`;
    this.#ballLayerEl.appendChild(el);
    this.#balls.set(ball.id, { ball, el });
    this.#startLoop();
  }

  #refreshSublaunches() {
    for (let i = 0; i < this.#sublaunchEls.length; i++) {
      const el = this.#sublaunchEls[i];
      const held = this.#getHeldBalls(i);
      if (held.length === 0 && (this.#sublaunchBalls[i] ?? 0) === 0) {
        el.setAttribute("data-empty", "true");
      } else {
        el.removeAttribute("data-empty");
      }
    }
    this.#refreshSavedBtn();
  }

  /** @param {HTMLElement | null} el */
  #emitReceptacleParticles(el) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const safeRect = this.#safeEl?.getBoundingClientRect();
    if (!safeRect) return;
    const cx = rect.left - safeRect.left + rect.width / 2;
    const cy = rect.top - safeRect.top + rect.height / 2;
    for (let i = 0; i < 10; i++) {
      const particle = document.createElement("span");
      particle.className = "pk-particle";
      const angle = (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.5;
      const dist = 20 + Math.random() * 30;
      particle.style.left = `${cx}px`;
      particle.style.top = `${cy}px`;
      particle.style.setProperty("--px", `${Math.cos(angle) * dist}px`);
      particle.style.setProperty("--py", `${Math.sin(angle) * dist}px`);
      this.#ballLayerEl?.appendChild(particle);
      this.#bag.timeout(() => particle.remove(), 450);
    }
  }

  /* ──────────────────────────────────────────────────────────────────────
     Saved-up
     ────────────────────────────────────────────────────────────────────── */

  #refreshSavedBtn() {
    if (!this.#savedBtn) return;
    const usable = this.#saved > 0 && this.#level < PLINKO.MAX_LEVEL;
    if (usable) this.#savedBtn.removeAttribute("disabled");
    else this.#savedBtn.setAttribute("disabled", "");
    this.#savedBtn.querySelector(".gt-btn-label").textContent = i18n.t("game.send_up", { n: this.#saved });
  }

  #savedUp() {
    if (this.#saved <= 0 || this.#level >= PLINKO.MAX_LEVEL) return;
    /* Remove captured balls from gates. */
    this.#clearCapturedBalls();
    /* Remove held balls that were never fired — they'll be re-spawned after
       distribution. Without this, #spawnHeldBalls() would add on top of the
       existing held balls, doubling the count each level. */
    for (const [id, { ball, el }] of this.#balls) {
      if (ball.state === "held") {
        if (ball.isIce) { this.#iceBallIds.delete(id); this.#iceBallSaved = true; }
        if (ball.isGlass) { this.#glassBallIds.delete(id); this.#glassBallSaved = true; }
        ball.alive = false;
        el.remove();
        this.#balls.delete(id);
        this.#ballIdleTracker.delete(id);
      }
    }
    /* Equitable distribution into the sublaunches. */
    const count = this.#sublaunchEls.length;
    const per = Math.floor(this.#saved / count);
    let extra = this.#saved - per * count;
    for (let i = 0; i < count; i++) {
      this.#sublaunchBalls[i] = (this.#sublaunchBalls[i] ?? 0) + per + (extra > 0 ? 1 : 0);
      if (extra > 0) extra--;
    }
    /* Re-queue the ice ball into a random sublaunch if it was saved. */
    if (this.#iceBallSaved) {
      this.#iceBallSaved = false;
      const idx = Math.floor(Math.random() * count);
      this.#iceBallSublaunchQueued = idx;
    }
    /* Re-queue the glass ball into a random sublaunch if it was saved. */
    if (this.#glassBallSaved) {
      this.#glassBallSaved = false;
      const idx = Math.floor(Math.random() * count);
      this.#glassBallSublaunchQueued = idx;
      /* Guarantee a slot even if the distribution gave 0 balls to this sublaunch. */
      if (!(this.#sublaunchBalls[idx] > 0)) this.#sublaunchBalls[idx] = 1;
    }
    this.#saved = 0;
    this.#level += 1;
    this.#shopUsedThisLevel = false;
    /* Expire session bonuses BEFORE spawning. If ice/glass bonus expires here,
       cleanupIce/cleanupGlass resets the sublaunch queue so #spawnHeldBalls
       won't create a special ball that immediately loses its state. */
    const newUnlocks = bonusManager.onLevelUp(this.#level);
    this.#refreshBallReadouts();
    this.#addLayer();
    this.#spawnHeldBalls();
    this.#refreshSublaunches();
    this.#refreshLevelLabel();
    this.#refreshLevelBar();
    if (newUnlocks.length > 0) this.#showBonusUnlockModal(newUnlocks);
    this.#refreshBonusBar();

    if (this.#level >= PLINKO.MAX_LEVEL) this.#endRound({ victory: true });
    else this.#checkEndOfRound();
  }

  /* ──────────────────────────────────────────────────────────────────────
     Physics
     ────────────────────────────────────────────────────────────────────── */

  #startLoop() {
    if (this.#rafId !== null) return;
    this.#lastTs = performance.now();
    const loop = (ts) => {
      if (this.#ended) {
        this.#rafId = null;
        return;
      }
      const dt = Math.min((ts - this.#lastTs) / 1000, PLINKO.MAX_STEP);
      this.#lastTs = ts;
      this.#step(dt);
      if (!this.#hasSimulatedBalls()) {
        this.#rafId = null;
        return;
      }
      this.#rafId = requestAnimationFrame(loop);
    };
    this.#rafId = requestAnimationFrame(loop);
  }

  #stopLoop() {
    if (this.#rafId !== null) cancelAnimationFrame(this.#rafId);
    this.#rafId = null;
  }

  #hasSimulatedBalls() {
    for (const { ball } of this.#balls.values()) {
      if (!ball.alive) continue;
      if (ball.state === "active" || ball.state === "held") return true;
      if (ball.state === "captured") {
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (speed > 5) return true;
      }
    }
    return false;
  }

  #step(dt) {
    if (dt <= 0) return;
    const subDt = dt / PLINKO.SUBSTEPS;
    for (let s = 0; s < PLINKO.SUBSTEPS; s++) this.#substep(subDt);
    this.#renderBalls();
    this.#refreshBallReadouts();
    this.#checkStuckBalls();
    if (!this.#hasSimulatedBalls()) this.#checkEndOfRound();
  }

  #substep(dt) {
    const w = this.#pinboardWidth;
    const wallR = bonusManager.resolve("wallRestitution", PLINKO.WALL_RESTITUTION);
    const maxV = bonusManager.resolve("maxVelocity", PLINKO.MAX_VELOCITY);
    const r = bonusManager.resolve("ballRadius", PLINKO.BALL_RADIUS);
    const gravity = bonusManager.resolve("gravity", PLINKO.GRAVITY);
    const magnetOn = bonusManager.resolve("shopMagnetForce", 0) > 0;
    const bottomY = this.#pinboardHeight;
    const gateFloor = bottomY + this.#gateZoneHeight - r;

    const activeBalls = [];

    for (const entry of [...this.#balls.values()]) {
      const ball = entry.ball;
      if (!ball.alive) continue;

      ball.vy += gravity * dt;
      if (magnetOn && ball.state === "active") this.#applyShopMagnet(ball, dt);

      const v = clampVelocity(ball.vx, ball.vy, maxV);
      ball.vx = v.vx;
      ball.vy = v.vy;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      /* Wall constraints per state */
      if (ball.state === "held") {
        const box = this.#launchWalls[ball.sublaunchIdx];
        if (box) {
          if (ball.x - r < box.left) { ball.x = box.left + r; ball.vx = Math.abs(ball.vx) * wallR; }
          else if (ball.x + r > box.right) { ball.x = box.right - r; ball.vx = -Math.abs(ball.vx) * wallR; }
          if (ball.y + r > box.bottom) { ball.y = box.bottom - r; ball.vy = -Math.abs(ball.vy) * 0.3; }
          if (ball.y - r < box.top) { ball.y = box.top + r; ball.vy = Math.abs(ball.vy) * wallR; }
        }
      } else if (ball.state === "captured") {
        const gateIdx = ["save", "recycle", "shop", "drain"].indexOf(ball.gateId);
        const walls = this.#gateWalls[gateIdx];
        if (walls) {
          if (ball.x - r < walls.left) { ball.x = walls.left + r; ball.vx = Math.abs(ball.vx) * wallR; }
          else if (ball.x + r > walls.right) { ball.x = walls.right - r; ball.vx = -Math.abs(ball.vx) * wallR; }
        }
        if (ball.y + r > gateFloor) { ball.y = gateFloor - r; ball.vy = -Math.abs(ball.vy) * 0.3; }
        if (ball.y < bottomY) { ball.y = bottomY; ball.vy = Math.abs(ball.vy) * wallR; }
      } else {
        if (ball.x - r < 0) { ball.x = r; ball.vx = Math.abs(ball.vx) * wallR; }
        else if (ball.x + r > w) { ball.x = w - r; ball.vx = -Math.abs(ball.vx) * wallR; }
      }

      if (ball.state === "active") {
        this.#checkPegHits(ball);
        if (ball.alive && ball.y >= bottomY) this.#handleBottom(ball);
      }

      activeBalls.push(ball);
    }

    /* Ball-ball collisions */
    for (let i = 0; i < activeBalls.length; i++) {
      for (let j = i + 1; j < activeBalls.length; j++) {
        collideBalls(activeBalls[i], activeBalls[j]);
      }
    }
  }

  /** @param {Ball} ball @param {number} dt */
  #applyShopMagnet(ball, dt) {
    const range = PLINKO.SHOP_MAGNET_RANGE;
    const force = PLINKO.SHOP_MAGNET_FORCE;
    for (const layer of this.#layers) {
      for (const peg of layer.pegs) {
        if (peg.type !== "shop") continue;
        const dx = peg.x - ball.x;
        const dy = peg.y - ball.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= range || dist <= 0) continue;
        const strength = force * (1 - dist / range);
        ball.vx += (dx / dist) * strength * dt;
        ball.vy += (dy / dist) * strength * dt;
      }
    }
  }

  /** @param {Ball} ball */
  #checkPegHits(ball) {
    const r = PLINKO.BALL_RADIUS;
    const window = PLINKO.LAYER_HEIGHT;
    for (const layer of this.#layers) {
      if (Math.abs(layer.y - ball.y) > window) continue;
      for (const peg of layer.pegs) {
        const c = collideCircles(ball.x, ball.y, r, peg.x, peg.y, peg.radius);
        if (!c) {
          ball.recentPegs.delete(peg.id);
          continue;
        }
        ball.x += c.nx * c.depth;
        ball.y += c.ny * c.depth;
        const v = reflect(ball.vx, ball.vy, c.nx, c.ny, peg.restitution);
        ball.vx = v.vx;
        ball.vy = v.vy;
        if (!ball.recentPegs.has(peg.id)) {
          ball.recentPegs.add(peg.id);
          this.#registerHit(peg, ball);
        }
      }
    }
  }

  /** @param {import('../entities/peg-classic.js').Peg} peg @param {Ball} [ball] */
  #registerHit(peg, ball) {
    /* Glass ball: decrement hit counter toward 0, shatter when exhausted. */
    if (ball?.isGlass) {
      ball.glassHits -= 1;
      this.#syncGlassCrackClass(ball);
      /* Flash the ball on every hit so the player sees damage. */
      const glassEl = this.#balls.get(ball.id)?.el;
      if (glassEl) {
        glassEl.classList.remove("pk-glass-hit");
        void glassEl.offsetWidth;
        glassEl.classList.add("pk-glass-hit");
      }
      if (ball.glassHits <= 0) {
        this.#shatterGlassBall(ball);
        return;
      }
      /* Glass ball continues and scores normally. */
    }

    /* Ice ball on already-frozen peg: reset thaw counter. */
    if (ball?.isIce && peg.frozenHits > 0) {
      peg.frozenHits = PLINKO.ICE_HITS_TO_THAW;
      this.#syncFrozenClass(peg);
      audioManager.playSfx("click");
      return;
    }

    /* Frozen peg: chip away the ice — no effect this hit. */
    if (peg.frozenHits > 0) {
      peg.frozenHits -= 1;
      if (peg.frozenHits > 0) {
        this.#syncFrozenClass(peg);
      } else {
        const frozenEl = this.#pegEls.get(peg.id);
        if (frozenEl) {
          this.#clearFrozenClasses(frozenEl);
          frozenEl.classList.remove("pk-thaw");
          void frozenEl.offsetWidth;
          frozenEl.classList.add("pk-thaw");
          this.#bag.timeout(() => frozenEl.classList.remove("pk-thaw"), 350);
        }
      }
      audioManager.playSfx("click");
      return;
    }

    /* Ice ball on unfrozen peg: freeze it — no score or effect. */
    if (ball?.isIce) {
      peg.frozenHits = PLINKO.ICE_HITS_TO_THAW;
      this.#syncFrozenClass(peg);
      audioManager.playSfx("click");
      return;
    }

    if (peg.type === "shop") {
      this.#registerShopPegHit(/** @type {import('../entities/peg-shop.js').ShopPeg} */ (peg));
      return;
    }
    const score = peg.type === "peg"
      ? bonusManager.resolve("scorePeg", peg.score)
      : peg.score;
    const multiplier = bonusManager.resolve("scoreMultiplier", this.#scoreMultiplier);
    this.#hits += score * multiplier;
    if (this.#readoutHits) this.#readoutHits.textContent = String(this.#hits);
    gameEvents.emit("hit:registered", { totalHits: this.#hits, peg });
    audioManager.playSfx("click");
    const el = this.#pegEls.get(peg.id);
    if (el) {
      el.classList.remove("pk-flash");
      void el.offsetWidth;
      el.classList.add("pk-flash");
    }
    if (peg.type === "bumper" && this.#stackEl) {
      const pop = document.createElement("div");
      pop.className = "pk-popup pk-popup--big";
      pop.textContent = `+${peg.score}`;
      pop.style.left = `${peg.x}px`;
      pop.style.top = `${peg.y - 12}px`;
      this.#stackEl.appendChild(pop);
      this.#bag.timeout(() => pop.remove(), 600);
    }
    if (peg.type === "peg" && this.#stackEl) {
      const pop = document.createElement("div");
      pop.className = "pk-popup";
      pop.textContent = `+${score * multiplier}`;
      pop.style.left = `${peg.x}px`;
      pop.style.top = `${peg.y - 12}px`;
      this.#stackEl.appendChild(pop);
      this.#bag.timeout(() => pop.remove(), 600);
    }
    if (peg.type === "coin" && this.#stackEl) {
      this.#coins += 1;
      this.#saveCoins();
      this.#refreshCoinDisplay();
      this.#animateCoinFly(peg);
    }
  }

  /** @param {import('../entities/peg-shop.js').ShopPeg} peg */
  #registerShopPegHit(peg) {
    audioManager.playSfx("click");
    const destroyed = peg.hit();
    const el = this.#pegEls.get(peg.id);
    if (el) {
      const counter = el.querySelector(".pk-shop-peg-counter");
      if (counter) counter.textContent = String(peg.hitsRemaining);
      el.classList.remove("pk-flash");
      void el.offsetWidth;
      el.classList.add("pk-flash");
    }
    if (destroyed) this.#destroyShopPeg(peg);
  }

  /** @param {import('../entities/peg-shop.js').ShopPeg} peg */
  #destroyShopPeg(peg) {
    if (this.#stackEl) {
      const pop = document.createElement("div");
      pop.className = "pk-popup pk-popup--big";
      pop.textContent = "🛒 💥";
      pop.style.left = `${peg.x}px`;
      pop.style.top = `${peg.y - 12}px`;
      this.#stackEl.appendChild(pop);
      this.#bag.timeout(() => pop.remove(), 800);
    }
    const el = this.#pegEls.get(peg.id);
    el?.remove();
    this.#pegEls.delete(peg.id);
    for (const layer of this.#layers) {
      const idx = layer.pegs.indexOf(peg);
      if (idx !== -1) { layer.pegs.splice(idx, 1); break; }
    }
    this.#openPegShopModal(peg.rarity);
  }

  /** @param {'common' | 'rare' | 'epic' | 'legendary'} rarity */
  #openPegShopModal(rarity) {
    import("../components/shop-modal.js").then(({ ShopModal }) => {
      const choices = bonusManager.buildPegShopChoices(rarity, { sublaunchCount: this.#sublaunchEls.length });
      if (choices.length === 0) return;
      const modal = new ShopModal({
        choices,
        coins: this.#coins,
        onChoice: (choice) => this.#applyShopChoice(choice),
      });
      modal.open();
    });
  }

  /* ── Coins ── */

  #loadCoins() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.COINS);
      this.#coins = raw ? parseInt(raw, 10) || 0 : 0;
    } catch { this.#coins = 0; }
  }

  #saveCoins() {
    try {
      localStorage.setItem(STORAGE_KEYS.COINS, String(this.#coins));
    } catch { /* silent */ }
  }

  #refreshCoinDisplay() {
    if (this.#coinCountEl) this.#coinCountEl.textContent = String(this.#coins);
  }

  /** @param {import('../entities/peg-classic.js').Peg} peg */
  #animateCoinFly(peg) {
    if (!this.#stackEl || !this.#chestEl) return;
    const coin = document.createElement("div");
    coin.className = "pk-coin-fly";
    coin.textContent = "$";
    coin.style.left = `${peg.x}px`;
    coin.style.top = `${peg.y}px`;

    const chestRect = this.#chestEl.getBoundingClientRect();
    const stackRect = this.#stackEl.getBoundingClientRect();
    const targetX = chestRect.left - stackRect.left + chestRect.width / 2;
    const targetY = chestRect.top - stackRect.top + chestRect.height / 2;
    coin.style.setProperty("--pk-coin-target-x", `${targetX}px`);
    coin.style.setProperty("--pk-coin-target-y", `${targetY}px`);

    this.#stackEl.appendChild(coin);
    this.#bag.timeout(() => {
      coin.remove();
      this.#chestEl?.classList.remove("pk-flash");
      void this.#chestEl?.offsetWidth;
      this.#chestEl?.classList.add("pk-flash");
    }, PLINKO.COIN_FLY_DURATION_MS);
  }

  /* ──────────────────────────────────────────────────────────────────────
     Bottom / gates
     ────────────────────────────────────────────────────────────────────── */

  /** @param {Ball} ball */
  #handleBottom(ball) {
    const w = this.#pinboardWidth || 1;
    const fx = ball.x / w;
    const { save, recycle, shop } = bonusManager.resolveGateWidths(PLINKO.GATE_WIDTHS);
    let gate;
    if (fx < save) gate = "save";
    else if (fx < save + recycle) gate = "recycle";
    else if (fx < save + recycle + shop) gate = "shop";
    else gate = "drain";
    this.#flashGate(gate);

    if (gate === "save") {
      if (ball.isIce) { this.#iceBallIds.delete(ball.id); this.#iceBallSaved = true; }
      if (ball.isGlass) { this.#glassBallIds.delete(ball.id); this.#glassBallSaved = true; }
      this.#saved += 1;
      gameEvents.emit("ball:saved", { ball });
      this.#refreshSavedBtn();
      this.#captureBall(ball, gate);
    } else if (gate === "shop") {
      if (ball.isIce) { this.#iceBallIds.delete(ball.id); this.#iceBallSaved = true; }
      if (ball.isGlass) { this.#glassBallIds.delete(ball.id); this.#glassBallSaved = true; }
      this.#saved += 1;
      gameEvents.emit("ball:saved", { ball });
      this.#refreshSavedBtn();
      this.#captureBall(ball, gate);
      if (!this.#shopUsedThisLevel) {
        this.#shopUsedThisLevel = true;
        this.#openShopModal();
      }
    } else if (gate === "recycle" && ball.recycles < bonusManager.resolve("maxRecycles", PLINKO.MAX_RECYCLES)) {
      const oldX = ball.x;
      const oldY = ball.y;
      ball.recycles += 1;
      const sub = Math.floor(Math.random() * this.#sublaunchEls.length);
      ball.x = (w * (sub + 0.5)) / this.#sublaunchEls.length + (Math.random() - 0.5) * 14;
      ball.y = -PLINKO.BALL_RADIUS * 2;
      ball.vx = (Math.random() - 0.5) * 60;
      ball.vy = 0;
      ball.recentPegs.clear();
      this.#emitRecycleTeleport(oldX, oldY, this.#balls.get(ball.id)?.el ?? null);
    } else {
      if (ball.isIce) this.#onIceBallLost(ball);
      if (ball.isGlass) this.#glassBallIds.delete(ball.id);
      this.#drained += 1;
      if (this.#readoutDrained) this.#readoutDrained.textContent = String(this.#drained);
      this.#captureBall(ball, gate);
    }
  }

  /** @param {Ball} ball @param {string} gate */
  #captureBall(ball, gate) {
    ball.state = "captured";
    ball.gateId = gate;
    ball.vy = Math.abs(ball.vy) * 0.3;
    ball.recentPegs.clear();
  }

  /**
   * Visual teleport effect for recycled balls: impact burst at the bottom
   * entry point, then a rising beam up to the top of the safe zone.
   * @param {number} bx  ball x in pinboard-local coords
   * @param {number} by  ball y in pinboard-local coords
   * @param {HTMLElement | null} ballEl
   */
  #emitRecycleTeleport(bx, by, ballEl) {
    if (!this.#ballLayerEl) return;
    const oy = this.#pinboardOffsetTop;
    const sx = bx;
    const sy = by + oy;

    /* Impact particles at entry point. */
    for (let i = 0; i < 10; i++) {
      const p = document.createElement("div");
      p.className = "pk-particle pk-particle--recycle";
      const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      const dist = 14 + Math.random() * 16;
      p.style.cssText = `left:${sx}px;top:${sy}px;--px:${(Math.cos(angle) * dist).toFixed(1)}px;--py:${(Math.sin(angle) * dist).toFixed(1)}px`;
      this.#ballLayerEl.appendChild(p);
      this.#bag.timeout(() => p.remove(), 450);
    }

    /* Rising beam from entry point to top of safe zone. */
    const beam = document.createElement("div");
    beam.className = "pk-recycle-beam";
    beam.style.cssText = `left:${sx}px;top:0;height:${sy}px`;
    this.#ballLayerEl.appendChild(beam);
    this.#bag.timeout(() => beam.remove(), 550);

    /* Materialize flash on the ball element at the new (top) position. */
    if (ballEl) {
      ballEl.classList.remove("pk-recycle-materialize");
      void ballEl.offsetWidth;
      ballEl.classList.add("pk-recycle-materialize");
      this.#bag.timeout(() => ballEl.classList.remove("pk-recycle-materialize"), 400);
    }
  }

  #flashGate(name) {
    const el = this.#safeEl?.querySelector(`[data-gate="${name}"]`);
    if (!el) return;
    el.classList.remove("pk-flash");
    void /** @type {HTMLElement} */ (el).offsetWidth;
    el.classList.add("pk-flash");
  }

  /* ──────────────────────────────────────────────────────────────────────
     Shop
     ────────────────────────────────────────────────────────────────────── */

  #openShopModal() {
    import("../components/shop-modal.js").then(({ ShopModal }) => {
      const choices = bonusManager.buildShopChoices({ sublaunchCount: this.#sublaunchEls.length });
      const modal = new ShopModal({
        choices,
        coins: this.#coins,
        onChoice: (choice) => this.#applyShopChoice(choice),
      });
      modal.open();
    });
  }

  /** @param {{ id: string, action: string, price?: number, bonusDef?: import('../configs/bonus-defs.js').BonusDef }} choice */
  #applyShopChoice(choice) {
    const price = choice.price ?? 0;
    if (price > 0) {
      if (this.#coins < price) return;
      this.#coins -= price;
      this.#saveCoins();
      this.#refreshCoinDisplay();
    }
    if (choice.action === "ball") {
      const idx = Math.floor(Math.random() * this.#sublaunchEls.length);
      this.#sublaunchBalls[idx] = (this.#sublaunchBalls[idx] ?? 0) + 1;
      this.#refreshSublaunches();
    } else if (choice.action === "sublaunch") {
      this.#addSublaunch();
    } else if (choice.action === "bonus" && choice.bonusDef) {
      bonusManager.addSessionBonus(choice.bonusDef);
      this.#refreshBonusBar();
    }
  }

  #addSublaunch() {
    if (this.#sublaunchEls.length >= PLINKO.MAX_SUBLAUNCHES) return;
    const launchEl = this.#safeEl?.querySelector(".pk-launch");
    if (!launchEl) return;
    const idx = this.#sublaunchEls.length;
    const el = document.createElement("div");
    el.className = "pk-sublaunch";
    el.dataset.sublaunch = String(idx);
    el.innerHTML = "";
    const savedRow = launchEl.querySelector(".pk-launch-savedrow");
    launchEl.insertBefore(el, savedRow);
    this.#sublaunchEls.push(el);
    this.#sublaunchBalls.push(0);
    launchEl.style.gridTemplateColumns = `repeat(${this.#sublaunchEls.length}, 1fr)`;
    this.#redistributeHeldBalls();
    this.#refreshSublaunches();
  }

  #removeSublaunch() {
    if (this.#sublaunchEls.length <= PLINKO.SUBLAUNCH_COUNT) return;
    const launchEl = this.#safeEl?.querySelector(".pk-launch");
    if (!launchEl) return;
    const el = this.#sublaunchEls.pop();
    el?.remove();
    this.#sublaunchBalls.pop();
    launchEl.style.gridTemplateColumns = `repeat(${this.#sublaunchEls.length}, 1fr)`;
    this.#redistributeHeldBalls();
    this.#refreshSublaunches();
  }

  #redistributeHeldBalls() {
    this.#computeLaunchWalls();
    const count = this.#sublaunchEls.length;
    if (count === 0) return;
    const heldBalls = [];
    for (const entry of this.#balls.values()) {
      if (entry.ball.state === "held") heldBalls.push(entry.ball);
    }
    const perSlot = Math.floor(heldBalls.length / count);
    let extra = heldBalls.length - perSlot * count;
    let bi = 0;
    for (let i = 0; i < count; i++) {
      const n = perSlot + (extra > 0 ? 1 : 0);
      if (extra > 0) extra--;
      this.#sublaunchBalls[i] = n;
      const box = this.#launchWalls[i];
      for (let j = 0; j < n; j++) {
        const ball = heldBalls[bi++];
        ball.sublaunchIdx = i;
        if (box) {
          ball.x = (box.left + box.right) / 2 + (Math.random() - 0.5) * (box.right - box.left) * 0.5;
          ball.y = box.top + 4 + j * 4;
        }
      }
    }
  }

  /**
   * If a ball hasn't moved more than 2 px in the last STUCK_TIMEOUT ms,
   * it's considered stuck. Find the peg it's touching, destroy it and
   * award a +50 bonus score.
   */
  #checkStuckBalls() {
    const now = performance.now();
    const STUCK_MS = bonusManager.resolve("stuckTimeoutMs", PLINKO.STUCK_TIMEOUT_MS);
    const MOVE_THRESHOLD = 2;

    for (const [id, entry] of this.#balls) {
      const { ball } = entry;
      if (!ball.alive || ball.state !== "active") continue;
      let tracker = this.#ballIdleTracker.get(id);
      if (!tracker) {
        tracker = { x: ball.x, y: ball.y, since: now };
        this.#ballIdleTracker.set(id, tracker);
        continue;
      }
      const moved =
        Math.abs(ball.x - tracker.x) > MOVE_THRESHOLD ||
        Math.abs(ball.y - tracker.y) > MOVE_THRESHOLD;
      if (moved) {
        tracker.x = ball.x;
        tracker.y = ball.y;
        tracker.since = now;
        continue;
      }
      if (now - tracker.since >= STUCK_MS) {
        /* Find the closest peg touching this ball. */
        const stuckPeg = this.#findTouchingPeg(ball);
        if (stuckPeg) {
          this.#destroyPeg(stuckPeg, ball);
        } else {
          /* No peg found — nudge the ball to unblock it. */
          ball.vx = (Math.random() - 0.5) * 200;
          ball.vy = -150;
        }
        tracker.since = now;
      }
    }
  }

  /** @param {Ball} ball
   *  @returns {import('../entities/peg-classic.js').Peg | null} */
  #findTouchingPeg(ball) {
    let closest = null;
    let closestDist = Infinity;
    for (const layer of this.#layers) {
      for (const peg of layer.pegs) {
        const dx = ball.x - peg.x;
        const dy = ball.y - peg.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = ball.radius + peg.radius;
        if (dist < minDist + 4 && dist < closestDist) {
          closest = peg;
          closestDist = dist;
        }
      }
    }
    return closest;
  }

  /** Destroy a peg (bonus +50), remove it from its layer and from DOM. */
  #destroyPeg(peg, ball) {
    const bonus = PLINKO.SCORE_STUCK_DESTROY;
    this.#hits += bonus;
    if (this.#readoutHits) this.#readoutHits.textContent = String(this.#hits);
    /* Visual popup. */
    if (this.#stackEl) {
      const pop = document.createElement("div");
      pop.className = "pk-popup pk-popup--big";
      pop.textContent = `+${bonus} 💥`;
      pop.style.left = `${peg.x}px`;
      pop.style.top = `${peg.y - 12}px`;
      this.#stackEl.appendChild(pop);
      this.#bag.timeout(() => pop.remove(), 800);
    }
    /* Remove peg DOM. */
    const el = this.#pegEls.get(peg.id);
    el?.remove();
    this.#pegEls.delete(peg.id);
    /* Remove peg from layer entity. */
    for (const layer of this.#layers) {
      const idx = layer.pegs.indexOf(peg);
      if (idx !== -1) {
        layer.pegs.splice(idx, 1);
        break;
      }
    }
    /* Give ball a nudge so it continues falling. */
    if (ball) {
      ball.vx = (Math.random() - 0.5) * 150;
      ball.vy = Math.max(ball.vy, 80);
      ball.recentPegs.clear();
    }
    this.#ballIdleTracker.delete(ball?.id);
  }

  /** @param {Ball} ball */

  #clearCapturedBalls() {
    for (const [id, { ball, el }] of this.#balls) {
      if (ball.state === "captured") {
        ball.alive = false;
        el.remove();
        this.#balls.delete(id);
        this.#ballIdleTracker.delete(id);
      }
    }
  }

  #renderBalls() {
    const oy = this.#pinboardOffsetTop;
    for (const { ball, el } of this.#balls.values()) {
      el.style.transform = `translate(${ball.x}px, ${ball.y + oy}px)`;
    }
  }

  #refreshBallReadouts() {
    let total = 0, ice = 0, glass = 0;
    for (const { ball } of this.#balls.values()) {
      total++;
      if (ball.isIce) ice++;
      if (ball.isGlass) glass++;
    }
    if (this.#readoutBalls) this.#readoutBalls.textContent = String(total);
    if (this.#readoutBallsIce) this.#readoutBallsIce.textContent = String(ice);
    if (this.#readoutBallsGlass) this.#readoutBallsGlass.textContent = String(glass);
  }

  /* ──────────────────────────────────────────────────────────────────────
     End of round
     ────────────────────────────────────────────────────────────────────── */

  #checkEndOfRound() {
    if (this.#ended) return;
    if (this.#balls.size > 0) return;
    const launchEmpty = this.#sublaunchBalls.every((n) => n <= 0);
    if (launchEmpty && this.#saved <= 0) this.#endRound({ victory: false });
  }

  #endRoundEarly() {
    this.#endRound({ victory: false, early: true });
  }

  /** @param {{ victory: boolean, early?: boolean }} args */
  #endRound({ victory, early = false }) {
    if (this.#ended) return;
    this.#ended = true;
    this.#stopLoop();
    const summary = {
      level: this.#level,
      hits: this.#hits,
      saved: this.#saved,
      drained: this.#drained,
    };
    if (!early) {
      saveManager.addRanking(PLINKO_RANKING_MODE, {
        score: summary.hits,
        ...summary,
      });
    }
    /* Lazy import to avoid an init-time circular dep with game-scene.js. */
    import("../scenes/game-scene.js").then(({ GameScene }) => {
      this.#overModal = new GameOverModal({
        summary,
        victory,
        onReplay: () => this.#router?.start(GameScene),
        onBack: () => this.#router?.start(TitleScene),
      });
      this.#overModal.open();
    });
  }

  #refreshLabels() {
    if (!this.#safeEl) return;
    const setText = (sel, txt) => {
      const el = this.#safeEl?.querySelector(sel);
      if (el) el.textContent = txt;
    };
    setText('[data-gate="save"]', i18n.t("game.gate.save"));
    setText('[data-gate="recycle"]', i18n.t("game.gate.recycle"));
    setText('[data-gate="drain"]', i18n.t("game.gate.drain"));
    this.#refreshLevelLabel();
    this.#refreshSavedBtn();
  }

  /* ──────────────────────────────────────────────────────────────────────
     Bonus system
     ────────────────────────────────────────────────────────────────────── */

  #makeBonusContext() {
    return {
      spawnBonusBall: () => {
        const idx = Math.floor(Math.random() * this.#sublaunchEls.length);
        this.#spawnActiveBall(idx);
      },
      getLevel: () => this.#level,
      getHits: () => this.#hits,
      addSaved: (n) => {
        this.#saved += n;
        this.#refreshSavedBtn();
      },
      addSublaunch: (balls) => {
        this.#addSublaunch();
        const idx = this.#sublaunchEls.length - 1;
        this.#sublaunchBalls[idx] = (this.#sublaunchBalls[idx] ?? 0) + balls;
        this.#refreshSublaunches();
      },
      removeSublaunch: () => {
        this.#removeSublaunch();
      },
      queueIceBall: () => {
        const idx = Math.floor(Math.random() * this.#sublaunchEls.length);
        this.#iceBallSublaunchQueued = idx;
        this.#sublaunchBalls[idx] = (this.#sublaunchBalls[idx] ?? 0) + 1;
        this.#spawnOneHeldBall(idx, { ice: true });
        this.#refreshSublaunches();
      },
      cleanupIce: () => {
        this.#cleanupIceBallState();
      },
      queueGlassBall: () => {
        const idx = Math.floor(Math.random() * this.#sublaunchEls.length);
        this.#glassBallSublaunchQueued = idx;
        this.#sublaunchBalls[idx] = (this.#sublaunchBalls[idx] ?? 0) + 1;
        this.#spawnOneHeldBall(idx, { glass: true });
        this.#refreshSublaunches();
      },
      cleanupGlass: () => {
        this.#cleanupGlassBallState();
      },
    };
  }

  /**
   * Spawn a single held ball into an existing sublaunch mid-game.
   * Used when a bonus queues a special ball after the launch zone is already populated.
   * @param {number} subIndex
   * @param {{ ice?: boolean, glass?: boolean }} [opts]
   */
  #spawnOneHeldBall(subIndex, { ice = false, glass = false } = {}) {
    if (!this.#ballLayerEl) return;
    this.#computeLaunchWalls();
    const box = this.#launchWalls[subIndex];
    if (!box) return;
    const cx = (box.left + box.right) / 2;
    const boxW = box.right - box.left;
    /* Count how many held balls already exist to stack above them. */
    const heldCount = this.#getHeldBalls(subIndex).length;
    const jx = (Math.random() - 0.5) * (boxW * 0.5);
    const ball = new Ball({ x: cx + jx, y: box.top + 4 + heldCount * 4 });
    ball.state = "held";
    ball.sublaunchIdx = subIndex;
    const el = document.createElement("div");
    el.className = "pk-ball";
    if (ice) {
      this.#iceBallSublaunchQueued = -1;
      ball.isIce = true;
      this.#iceBallIds.add(ball.id);
      el.classList.add("pk-ball--ice");
    }
    if (glass) {
      this.#glassBallSublaunchQueued = -1;
      ball.isGlass = true;
      ball.glassHits = PLINKO.GLASS_BALL_MAX_HITS;
      this.#glassBallIds.add(ball.id);
      el.classList.add("pk-ball--glass");
    }
    const oy = this.#pinboardOffsetTop;
    el.style.transform = `translate(${ball.x}px, ${ball.y + oy}px)`;
    this.#ballLayerEl.appendChild(el);
    this.#balls.set(ball.id, { ball, el });
    this.#startLoop();
  }

  /** Remove all ice-ball state: unmark live balls, unfreeze all pegs. */
  #cleanupIceBallState() {
    this.#iceBallSublaunchQueued = -1;
    this.#iceBallSaved = false;
    for (const id of this.#iceBallIds) {
      const entry = this.#balls.get(id);
      if (entry) {
        entry.ball.isIce = false;
        entry.el.classList.remove("pk-ball--ice");
      }
    }
    this.#iceBallIds.clear();
    for (const layer of this.#layers) {
      for (const peg of layer.pegs) {
        if (peg.frozenHits > 0) {
          peg.frozenHits = 0;
          const el = this.#pegEls.get(peg.id);
          if (el) this.#clearFrozenClasses(el);
        }
      }
    }
  }

  /** @param {import('../entities/peg-classic.js').Peg} peg */
  #syncFrozenClass(peg) {
    const el = this.#pegEls.get(peg.id);
    if (!el) return;
    this.#clearFrozenClasses(el);
    if (peg.frozenHits > 0) el.classList.add(`pk-peg--frozen-${peg.frozenHits}`);
  }

  /** @param {HTMLElement} el */
  #clearFrozenClasses(el) {
    el.classList.remove("pk-peg--frozen-3", "pk-peg--frozen-2", "pk-peg--frozen-1");
  }

  /** Called when the ice ball is drained before the bonus duration ends. */
  #onIceBallLost(ball) {
    this.#iceBallIds.delete(ball.id);
    this.#cleanupIceBallState();
    bonusManager.removeSessionBonus("ice_ball");
    this.#refreshBonusBar();
  }

  /** Called when the glass ball shatters at max hits. */
  #shatterGlassBall(ball) {
    this.#glassBallIds.delete(ball.id);
    ball.alive = false;
    const entry = this.#balls.get(ball.id);
    if (entry) {
      entry.el.style.opacity = "0";
      this.#balls.delete(ball.id);
      this.#ballIdleTracker.delete(ball.id);
      this.#bag.timeout(() => entry.el.remove(), 50);
    }
    this.#emitGlassShatter(ball.x, ball.y);
    audioManager.playSfx("click");
    this.#cleanupGlassBallState();
    bonusManager.removeSessionBonus("glass_ball");
    this.#refreshBonusBar();
  }

  /**
   * Emit shatter burst and shard particles at the given pinboard position.
   * @param {number} bx  ball x in pinboard-local coords
   * @param {number} by  ball y in pinboard-local coords
   */
  #emitGlassShatter(bx, by) {
    if (!this.#ballLayerEl) return;
    const oy = this.#pinboardOffsetTop;
    const sx = bx;
    const sy = by + oy;

    /* Central burst flash. */
    const burst = document.createElement("div");
    burst.className = "pk-glass-burst";
    burst.style.cssText = `left:${sx}px;top:${sy}px`;
    this.#ballLayerEl.appendChild(burst);
    this.#bag.timeout(() => burst.remove(), 400);

    /* Shard particles flying outward. */
    for (let i = 0; i < 8; i++) {
      const p = document.createElement("div");
      p.className = "pk-particle pk-particle--glass";
      const angle = (Math.PI * 2 * i) / 8;
      const dist = 10 + Math.random() * 16;
      p.style.cssText = `left:${sx}px;top:${sy}px;--px:${(Math.cos(angle) * dist).toFixed(1)}px;--py:${(Math.sin(angle) * dist).toFixed(1)}px`;
      this.#ballLayerEl.appendChild(p);
      this.#bag.timeout(() => p.remove(), 420);
    }
  }

  /** Sync crack CSS classes on the glass ball element based on `ball.glassHits`. */
  #syncGlassCrackClass(ball) {
    const entry = this.#balls.get(ball.id);
    if (!entry) return;
    const { el } = entry;
    el.classList.remove(
      "pk-ball--glass-crack-1",
      "pk-ball--glass-crack-2",
      "pk-ball--glass-crack-3",
      "pk-ball--glass-crack-4",
    );
    /* Show cracks during the last CRACK_THRESHOLD hits.
       glassHits = 4 → crack-1, 3 → crack-2, 2 → crack-3, 1 → crack-4 */
    if (ball.glassHits >= PLINKO.GLASS_BALL_CRACK_THRESHOLD) return;
    const crackLevel = PLINKO.GLASS_BALL_CRACK_THRESHOLD - ball.glassHits;
    if (crackLevel >= 1 && crackLevel <= 4) {
      el.classList.add(`pk-ball--glass-crack-${crackLevel}`);
    }
  }

  /** Remove glass marking from all live glass balls. */
  #cleanupGlassBallState() {
    this.#glassBallSublaunchQueued = -1;
    this.#glassBallSaved = false;
    for (const id of this.#glassBallIds) {
      const entry = this.#balls.get(id);
      if (entry) {
        entry.ball.isGlass = false;
        entry.el.classList.remove(
          "pk-ball--glass",
          "pk-ball--glass-crack-1",
          "pk-ball--glass-crack-2",
          "pk-ball--glass-crack-3",
          "pk-ball--glass-crack-4",
        );
      }
    }
    this.#glassBallIds.clear();
  }

  /** @param {import('../configs/bonus-defs.js').BonusDef[]} unlocked */
  #showBonusUnlockModal(unlocked) {
    import("../components/bonus-unlock-modal.js").then(({ BonusUnlockModal }) => {
      const modal = new BonusUnlockModal({ bonuses: unlocked });
      modal.open();
    });
  }

  #refreshBonusBar() {
    if (!this.#bonusBarEl) return;
    const { permanent, session } = bonusManager.getActiveBonuses();
    const permHtml = permanent
      .map((b) => {
        const active = !b.activatable || bonusManager.isActive(b.id);
        const canUse = b.activatable && bonusManager.canActivate(b.id);
        const cls = `pk-bonus-badge${!active ? " pk-bonus-badge--inactive" : ""}${canUse ? " pk-bonus-badge--activatable" : ""}`;
        return `<span class="${cls}" data-bonus-id="${b.id}" title="${i18n.t(`bonus.permanent.${b.id}`)}">${b.icon}</span>`;
      })
      .join("");
    const sessHtml = session
      .map((b) => {
        const remaining = bonusManager.getSessionBonusRemaining(b.id);
        const badge = remaining > 0 ? `<span class="pk-bonus-badge-duration">${remaining}</span>` : "";
        return `<span class="pk-bonus-badge pk-bonus-badge--session" data-bonus-id="${b.id}" title="${i18n.t(`bonus.session.${b.id}`)}">${b.icon}${badge}</span>`;
      })
      .join("");
    this.#bonusBarEl.innerHTML = `<div class="pk-bonus-bar-section pk-bonus-bar--permanent">${permHtml}</div><div class="pk-bonus-bar-section pk-bonus-bar--session">${sessHtml}</div>`;
  }

  get root() {
    return this.#root;
  }
  get router() {
    return this.#router;
  }

  /* ──────────────────────────────────────────────────────────────────────
     Dev-only helpers (tree-shaken from prod)
     ────────────────────────────────────────────────────────────────────── */

  /** @param {boolean} ice */
  #devSpawnBall(ice, glass = false) {
    const idx = Math.floor(Math.random() * this.#sublaunchEls.length);
    this.#spawnActiveBall(idx, ice, glass);
  }

  /** @param {string} id */
  #devActivateBonus(id) {
    if (id === "bonus_launcher" && this.#sublaunchEls.length >= PLINKO.MAX_SUBLAUNCHES) return;
    const sessionDef = SESSION_BONUSES.find((b) => b.id === id);
    if (sessionDef) {
      bonusManager.addSessionBonus(sessionDef);
      this.#refreshBonusBar();
      return;
    }
    const permDef = PERMANENT_BONUSES.find((b) => b.id === id);
    if (permDef) {
      if (!bonusManager.isUnlocked(id)) {
        bonusManager._devForceUnlock?.(id);
      }
      bonusManager.activateBonus(id);
      this.#refreshBonusBar();
    }
  }
}
