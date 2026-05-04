import { ListenerBag } from "../utils/listener-bag.js";
import { layout } from "../managers/layout-manager.js";
import { i18n } from "../managers/i18n-manager.js";
import { saveManager } from "../managers/save-manager.js";
import { audioManager } from "../managers/audio-manager.js";
import { bonusManager } from "../managers/bonus-manager.js";
import { gameEvents } from "../utils/event-emitter.js";
import { collideCircles, reflect, clampVelocity } from "../utils/physics.js";
import { Ball } from "../entities/ball.js";
import { Layer, bumperChanceForLevel } from "../entities/layer.js";
import { Slot } from "../entities/slot.js";
import { PLINKO, PLINKO_RANKING_MODE, STORAGE_KEYS } from "../configs/constants.js";
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

    bonusManager.initSession(this.#makeBonusContext());
    this.#refreshBonusBar();

    /* Drop the first layer (level 0). Launch is locked while it falls. */
    this.#addLayer({ initial: true });
    this.#bag.timeout(() => {
      this.#lockedLaunch = false;
    }, PLINKO.LAYER_FALL_MS);

    gameEvents.emit("game:start");
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
          <div class="pk-sublaunch" data-sublaunch="${i}">
            <span class="pk-sublaunch-icon">🐭</span>
            <span class="pk-sublaunch-count">0</span>
          </div>`,
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
        <div class="pk-gate pk-gate--save"    data-gate="save">${i18n.t("game.gate.save")}</div>
        <div class="pk-gate pk-gate--recycle" data-gate="recycle">${i18n.t("game.gate.recycle")}</div>
        <div class="pk-gate pk-gate--shop"    data-gate="shop">${i18n.t("game.gate.shop")}</div>
        <div class="pk-gate pk-gate--drain"   data-gate="drain">${i18n.t("game.gate.drain")}</div>
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
        </div>
        <div class="pk-status-actions">
          ${buttonHtml({ action: "back", label: i18n.t("game.back"), variant: "ghost" })}
        </div>
      </div>
    `;
    this.#root.appendChild(safe);
    this.#safeEl = safe;
    this.#pinboardEl = safe.querySelector('[data-role="pinboard"]');
    this.#stackEl = safe.querySelector('[data-role="stack"]');
    this.#levelBarEl = safe.querySelector('[data-role="level-bar"]');
    this.#levelLabelEl = safe.querySelector('[data-role="level-label"]');
    this.#sublaunchEls = Array.from(safe.querySelectorAll(".pk-sublaunch"));
    this.#savedBtn = safe.querySelector(".pk-saved-up");
    this.#readoutHits = safe.querySelector('[data-role="r-hits"]');
    this.#readoutDrained = safe.querySelector('[data-role="r-drained"]');
    this.#readoutLevel = safe.querySelector('[data-role="r-level"]');
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
    if (!this.#pinboardEl) return;
    const r = this.#pinboardEl.getBoundingClientRect();
    this.#pinboardWidth = r.width;
    this.#pinboardHeight = r.height;
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
    const remaining = this.#sublaunchBalls[index] ?? 0;
    if (remaining <= 0) return;
    const subEl = this.#sublaunchEls[index];
    subEl?.setAttribute("data-firing", "true");
    this.#bag.timeout(() => subEl?.removeAttribute("data-firing"), 400);

    let i = 0;
    const total = remaining;
    const tick = () => {
      if (this.#ended) return;
      if (i >= total) return;
      if ((this.#sublaunchBalls[index] ?? 0) <= 0) return;
      this.#sublaunchBalls[index] -= 1;
      this.#spawnBall(index);
      this.#refreshSublaunches();
      i += 1;
      this.#bag.timeout(tick, bonusManager.resolve("launchDelayMs", PLINKO.LAUNCH_DELAY_MS));
    };
    tick();
  }

  /** @param {number} subIndex */
  #spawnBall(subIndex) {
    if (!this.#stackEl) return;
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
    const el = document.createElement("div");
    el.className = "pk-ball";
    el.style.transform = `translate(${ball.x}px, ${ball.y}px)`;
    this.#stackEl.appendChild(el);
    this.#balls.set(ball.id, { ball, el });
    this.#startLoop();
  }

  #refreshSublaunches() {
    for (let i = 0; i < this.#sublaunchEls.length; i++) {
      const el = this.#sublaunchEls[i];
      const n = this.#sublaunchBalls[i] ?? 0;
      const countEl = el.querySelector(".pk-sublaunch-count");
      if (countEl) countEl.textContent = String(n);
      if (n === 0) el.setAttribute("data-empty", "true");
      else el.removeAttribute("data-empty");
    }
    this.#refreshSavedBtn();
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
    /* Equitable distribution into the sublaunches. */
    const count = this.#sublaunchEls.length;
    const per = Math.floor(this.#saved / count);
    let extra = this.#saved - per * count;
    for (let i = 0; i < count; i++) {
      this.#sublaunchBalls[i] = (this.#sublaunchBalls[i] ?? 0) + per + (extra > 0 ? 1 : 0);
      if (extra > 0) extra--;
    }
    this.#saved = 0;
    this.#level += 1;
    this.#shopUsedThisLevel = false;
    this.#addLayer();
    this.#refreshSublaunches();
    this.#refreshLevelLabel();
    this.#refreshLevelBar();

    /* Bonus system: check for new permanent unlocks. */
    const newUnlocks = bonusManager.onLevelUp(this.#level);
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
      if (this.#balls.size === 0) {
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

  #step(dt) {
    if (dt <= 0) return;
    const subDt = dt / PLINKO.SUBSTEPS;
    for (let s = 0; s < PLINKO.SUBSTEPS; s++) this.#substep(subDt);
    this.#renderBalls();
    this.#checkStuckBalls();
    if (this.#balls.size === 0) this.#checkEndOfRound();
  }

  #substep(dt) {
    const w = this.#pinboardWidth;
    const wallR = bonusManager.resolve("wallRestitution", PLINKO.WALL_RESTITUTION);
    const maxV = bonusManager.resolve("maxVelocity", PLINKO.MAX_VELOCITY);
    const r = bonusManager.resolve("ballRadius", PLINKO.BALL_RADIUS);
    const gravity = bonusManager.resolve("gravity", PLINKO.GRAVITY);
    const magnetOn = bonusManager.resolve("shopMagnetForce", 0) > 0;
    /* All positions are in pinboard-absolute coords (origin = top-left).
       Gates are at the very bottom of the pinboard.                        */
    const bottomY = this.#pinboardHeight;

    for (const entry of [...this.#balls.values()]) {
      const ball = entry.ball;
      if (!ball.alive) continue;

      ball.vy += gravity * dt;

      if (magnetOn) this.#applyShopMagnet(ball, dt);

      const v = clampVelocity(ball.vx, ball.vy, maxV);
      ball.vx = v.vx;
      ball.vy = v.vy;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x - r < 0) {
        ball.x = r;
        ball.vx = Math.abs(ball.vx) * wallR;
      } else if (ball.x + r > w) {
        ball.x = w - r;
        ball.vx = -Math.abs(ball.vx) * wallR;
      }

      this.#checkPegHits(ball);

      if (ball.alive && ball.y >= bottomY) this.#handleBottom(ball);
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
          this.#registerHit(peg);
        }
      }
    }
  }

  /** @param {import('../entities/peg-classic.js').Peg} peg */
  #registerHit(peg) {
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
      const choices = bonusManager.buildPegShopChoices(rarity);
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
      this.#saved += 1;
      gameEvents.emit("ball:saved", { ball });
      this.#refreshSavedBtn();
      this.#removeBall(ball);
    } else if (gate === "shop") {
      /* Ball is saved. Shop modal opens only once per level. */
      this.#saved += 1;
      gameEvents.emit("ball:saved", { ball });
      this.#refreshSavedBtn();
      this.#removeBall(ball);
      if (!this.#shopUsedThisLevel) {
        this.#shopUsedThisLevel = true;
        this.#openShopModal();
      }
    } else if (gate === "recycle" && ball.recycles < bonusManager.resolve("maxRecycles", PLINKO.MAX_RECYCLES)) {
      ball.recycles += 1;
      const sub = Math.floor(Math.random() * this.#sublaunchEls.length);
      ball.x = (w * (sub + 0.5)) / this.#sublaunchEls.length + (Math.random() - 0.5) * 14;
      ball.y = -PLINKO.BALL_RADIUS * 2;
      ball.vx = (Math.random() - 0.5) * 60;
      ball.vy = 0;
      ball.recentPegs.clear();
    } else {
      this.#drained += 1;
      if (this.#readoutDrained) this.#readoutDrained.textContent = String(this.#drained);
      this.#removeBall(ball);
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
      const choices = bonusManager.buildShopChoices();
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
    const launchEl = this.#safeEl?.querySelector(".pk-launch");
    if (!launchEl) return;
    const idx = this.#sublaunchEls.length;
    const el = document.createElement("div");
    el.className = "pk-sublaunch";
    el.dataset.sublaunch = String(idx);
    el.innerHTML = `<span class="pk-sublaunch-icon">🐭</span><span class="pk-sublaunch-count">0</span>`;
    /* Insert before the savedrow. */
    const savedRow = launchEl.querySelector(".pk-launch-savedrow");
    launchEl.insertBefore(el, savedRow);
    this.#sublaunchEls.push(el);
    this.#sublaunchBalls.push(0);
    /* Update grid columns. */
    launchEl.style.gridTemplateColumns = `repeat(${this.#sublaunchEls.length}, 1fr)`;
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
    this.#refreshSublaunches();
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
      if (!ball.alive) continue;
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
  #removeBall(ball) {
    ball.alive = false;
    const entry = this.#balls.get(ball.id);
    entry?.el.remove();
    this.#balls.delete(ball.id);
    this.#ballIdleTracker.delete(ball.id);
  }

  #renderBalls() {
    for (const { ball, el } of this.#balls.values()) {
      el.style.transform = `translate(${ball.x}px, ${ball.y}px)`;
    }
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
        this.#spawnBall(idx);
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
    };
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
}
