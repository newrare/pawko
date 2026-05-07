import { ListenerBag } from "../utils/listener-bag.js";
import { layout } from "../managers/layout-manager.js";
import { i18n } from "../managers/i18n-manager.js";
import { saveManager } from "../managers/save-manager.js";
import { audioManager } from "../managers/audio-manager.js";
import { currencyManager } from "../managers/currency-manager.js";
import { bonusManager } from "../managers/bonus-manager.js";
import { collideCircles, reflect, clampVelocity, collideBalls } from "../utils/physics.js";
import { Ball } from "../entities/ball.js";
import { Layer, bumperChanceForLevel } from "../entities/layer.js";
import { Slot } from "../entities/slot.js";
import { PLINKO, LEVELS } from "../configs/constants.js";
import { PARAM_KEYS } from "../configs/bonus-defs.js";
import { buttonHtml } from "../components/ui/button.js";
import { LevelSelectorScene } from "../scenes/level-selector-scene.js";

/**
 * GameController — wires a single Plinko level.
 *
 * Loads 10 layers at once, lets the player fire sublaunchers manually,
 * tracks per-ball scoring, and ends the level when all balls are captured.
 */
export class GameController {
  /** @type {HTMLElement} */ #root;
  /** @type {import('../scenes/scene-router.js').SceneRouter | null} */ #router;
  /** @type {object} */ #data;
  /** @type {ListenerBag} */ #bag = new ListenerBag();

  /** @type {HTMLElement | null} */ #safeEl = null;
  /** @type {HTMLElement | null} */ #pinboardEl = null;
  /** @type {HTMLElement | null} */ #stackEl = null;
  /** @type {HTMLElement | null} */ #scoreGaugeEl = null;
  /** @type {HTMLElement | null} */ #scoreLabelEl = null;
  /** @type {HTMLElement[]} */ #sublaunchEls = [];
  /** @type {HTMLElement | null} */ #ballLayerEl = null;

  /* --- Game state --- */
  /** @type {number} */ #levelId = 1;
  /** @type {number} */ #targetScore = 100;
  /** @type {number} */ #levelScore = 0;
  /** @type {number[]} */ #sublaunchBalls = [];
  /** @type {boolean[]} */ #sublaunchFired = [];
  /** @type {Layer[]} */ #layers = [];
  /** @type {Map<number, HTMLElement>} */ #layerEls = new Map();
  /** @type {Map<number, HTMLElement>} */ #pegEls = new Map();
  /** @type {Map<number, { ball: Ball, el: HTMLElement }>} */ #balls = new Map();
  /** @type {Map<number, { x: number, y: number, since: number }>} */ #ballIdleTracker = new Map();
  /** @type {number} */ #pinboardWidth = 0;
  /** @type {number} */ #pinboardHeight = 0;
  /** @type {boolean} */ #ended = false;
  /** @type {number | null} */ #rafId = null;
  /** @type {number} */ #lastTs = 0;

  /* --- Extended physics --- */
  /** @type {number} */ #pinboardOffsetTop = 0;
  /** @type {number} */ #gateZoneHeight = 0;
  /** @type {{ left: number, right: number }[]} */ #gateWalls = [];
  /** @type {{ left: number, right: number, top: number, bottom: number }[]} */ #launchWalls = [];

  /** @type {import('../components/modal-base.js').BaseModal | null} */ #overModal = null;

  /**
   * @param {{ root: HTMLElement,
   *   router?: import('../scenes/scene-router.js').SceneRouter,
   *   data?: object }} args
   */
  constructor({ root, router = null, data = {} }) {
    this.#root = root;
    this.#router = router;
    this.#data = data;
  }

  start() {
    this.#levelId = this.#data?.levelId ?? 1;
    const levelDef = LEVELS.find((l) => l.id === this.#levelId);
    this.#targetScore = levelDef?.target ?? 100;

    /* Active bonuses can mutate the round shape (extra balls, extra
       sublaunchers). Resolve once on round start and snapshot the values
       in the round state — so a bonus expiring mid-round does not yank
       balls/sublauncher away under the player. */
    const sublaunchCount = Math.max(
      1,
      Math.floor(
        bonusManager.resolve(
          PARAM_KEYS.SUBLAUNCH_COUNT,
          PLINKO.SUBLAUNCH_COUNT,
        ),
      ),
    );
    const ballsPerSublaunch = Math.max(
      1,
      Math.floor(
        bonusManager.resolve(
          PARAM_KEYS.STARTING_BALLS_PER_SUBLAUNCH,
          PLINKO.STARTING_BALLS_PER_SUBLAUNCH,
        ),
      ),
    );
    this.#sublaunchBalls = Array(sublaunchCount).fill(ballsPerSublaunch);
    this.#sublaunchFired = Array(sublaunchCount).fill(false);

    this.#buildDom();
    this.#measure();
    this.#bag.add(layout.onChange(() => this.#onResize()));
    this.#bag.add(i18n.onChange(() => this.#refreshLabels()));

    this.#loadAllLayers();
    this.#spawnHeldBalls();
    this.#refreshSublaunches();
    this.#updateScoreGauge();
    this.#renderHudBonuses();
  }

  destroy() {
    this.#stopLoop();
    this.#overModal?.destroy();
    this.#overModal = null;
    this.#bag.dispose();
    this.#balls.clear();
    this.#ballIdleTracker.clear();
    this.#pegEls.clear();
    this.#layerEls.clear();
    this.#layers = [];
  }

  /* ──────────────────────────────────────────────────────────────────────
     DOM
     ────────────────────────────────────────────────────────────────────── */

  #buildDom() {
    this.#root.classList.add("gt-game");
    const safe = document.createElement("div");
    safe.className = "gt-game-safe";

    const gateLabels = {
      recycle: i18n.t("game.gate.recycle"),
      x2: i18n.t("game.gate.x2"),
      x10: i18n.t("game.gate.x10"),
      x5: i18n.t("game.gate.x5"),
      malus: i18n.t("game.gate.malus"),
    };

    const sublaunchCount = this.#sublaunchBalls.length;
    safe.innerHTML = `
      <div class="pk-launch" data-role="launch" style="grid-template-columns: repeat(${sublaunchCount}, 1fr)">
        ${Array.from({ length: sublaunchCount }, (_, i) => `<div class="pk-sublaunch" data-sublaunch="${i}"></div>`).join("")}
      </div>
      <div class="pk-pinboard" data-role="pinboard">
        <div class="pk-score-gauge" data-role="score-gauge"></div>
        <div class="pk-score-label" data-role="score-label">0 / ${this.#targetScore}</div>
        <div class="pk-hud-bonuses" data-role="hud-bonuses"></div>
        <div class="pk-stack" data-role="stack"></div>
      </div>
      <div class="pk-collection">
        ${PLINKO.GATE_ORDER.map((g) => `<div class="pk-gate pk-gate--${g}" data-gate="${g}"><span class="pk-gate-label">${gateLabels[g]}</span></div>`).join("")}
      </div>
      <div class="pk-status">
        <div class="pk-status-score">
          <span data-role="score-text">${i18n.t("game.score")}: <b data-role="r-score">0</b> / ${this.#targetScore}</span>
        </div>
        <div class="pk-status-actions">
          ${buttonHtml({ action: "back", label: i18n.t("game.back"), variant: "ghost" })}
        </div>
      </div>
    `;
    this.#root.appendChild(safe);
    this.#safeEl = safe;

    const ballLayer = document.createElement("div");
    ballLayer.className = "pk-ball-layer";
    safe.appendChild(ballLayer);
    this.#ballLayerEl = ballLayer;

    this.#pinboardEl = safe.querySelector('[data-role="pinboard"]');
    this.#stackEl = safe.querySelector('[data-role="stack"]');
    this.#scoreGaugeEl = safe.querySelector('[data-role="score-gauge"]');
    this.#scoreLabelEl = safe.querySelector('[data-role="score-label"]');
    this.#sublaunchEls = Array.from(safe.querySelectorAll(".pk-sublaunch"));

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
    const action = target.closest("[data-action]");
    if (!action) return;
    const name = /** @type {HTMLElement} */ (action).dataset.action;
    if (name === "back") this.#endRound({ victory: false });
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
    this.#recalcLayerPositions();
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
    const gateWidth = w * 0.2;
    this.#gateWalls = PLINKO.GATE_ORDER.map((_, i) => ({
      left: i * gateWidth,
      right: (i + 1) * gateWidth,
    }));
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

  #loadAllLayers() {
    if (!this.#stackEl) return;
    for (let i = 0; i < PLINKO.INITIAL_LAYERS; i++) {
      const layer = new Layer({
        level: this.#levelId,
        width: this.#pinboardWidth || 320,
        y: 0,
        bumperChance: bumperChanceForLevel(this.#levelId),
      });
      this.#layers.push(layer);
    }
    this.#recalcLayerPositions();
    for (const layer of this.#layers) {
      this.#renderLayer(layer);
    }
  }

  #recalcLayerPositions() {
    const h = this.#pinboardHeight;
    for (let i = 0; i < this.#layers.length; i++) {
      const layer = this.#layers[i];
      layer.y = h - (i + 1) * PLINKO.LAYER_HEIGHT;
      for (const peg of layer.pegs) peg.y = layer.y;
      const el = this.#layerEls.get(layer.id);
      if (el) el.style.top = `${layer.y}px`;
    }
  }

  /** @param {Layer} layer */
  #renderLayer(layer) {
    if (!this.#stackEl) return;
    const el = document.createElement("div");
    el.className = "pk-layer";
    el.style.top = `${layer.y}px`;

    for (const peg of layer.pegs) {
      peg.y = layer.y;
      const p = document.createElement("div");
      let extra = "";
      if (peg.type === "bumper") extra = " pk-peg--bumper";
      else if (peg.type === "coin") extra = " pk-peg--coin";
      p.className = `pk-peg${extra}`;
      if (peg.type === "coin") p.textContent = "¢";
      p.style.left = `${peg.x}px`;
      p.style.top = "0px";
      p.dataset.pegId = String(peg.id);
      el.appendChild(p);
      this.#pegEls.set(peg.id, p);
    }

    this.#stackEl.appendChild(el);
    this.#layerEls.set(layer.id, el);
  }

  /* ──────────────────────────────────────────────────────────────────────
     Launch
     ────────────────────────────────────────────────────────────────────── */

  /** @param {number} index */
  #fireSublaunch(index) {
    if (this.#ended) return;
    if (this.#sublaunchFired[index]) return;
    const held = this.#getHeldBalls(index);
    if (held.length === 0) return;

    this.#sublaunchFired[index] = true;
    const subEl = this.#sublaunchEls[index];
    subEl?.setAttribute("data-firing", "true");
    this.#bag.timeout(() => subEl?.removeAttribute("data-firing"), 400);
    this.#emitReceptacleParticles(subEl);

    for (const { ball } of held) {
      ball.state = "active";
    }
    this.#sublaunchBalls[index] = 0;
    this.#refreshSublaunches();
    this.#startLoop();
  }

  /** @param {number} subIndex */
  #getHeldBalls(subIndex) {
    const result = [];
    for (const entry of this.#balls.values()) {
      if (entry.ball.state === "held" && entry.ball.sublaunchIdx === subIndex)
        result.push(entry);
    }
    return result;
  }

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
        const oy = this.#pinboardOffsetTop;
        el.style.transform = `translate(${ball.x}px, ${ball.y + oy}px)`;
        this.#ballLayerEl.appendChild(el);
        this.#balls.set(ball.id, { ball, el });
      }
    }
    this.#startLoop();
  }

  #refreshSublaunches() {
    for (let i = 0; i < this.#sublaunchEls.length; i++) {
      const el = this.#sublaunchEls[i];
      if (this.#sublaunchFired[i]) {
        el.setAttribute("data-empty", "true");
      } else {
        el.removeAttribute("data-empty");
      }
    }
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
        this.#checkEndOfRound();
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
    this.#checkStuckBalls();
    if (!this.#hasSimulatedBalls()) this.#checkEndOfRound();
  }

  #substep(dt) {
    const w = this.#pinboardWidth;
    const wallR = PLINKO.WALL_RESTITUTION;
    const maxV = PLINKO.MAX_VELOCITY;
    const r = PLINKO.BALL_RADIUS;
    const gravity = PLINKO.GRAVITY;
    const bottomY = this.#pinboardHeight;
    const gateFloor = bottomY + this.#gateZoneHeight - r;

    const activeBalls = [];

    for (const entry of [...this.#balls.values()]) {
      const ball = entry.ball;
      if (!ball.alive) continue;

      ball.vy += gravity * dt;
      const v = clampVelocity(ball.vx, ball.vy, maxV);
      ball.vx = v.vx;
      ball.vy = v.vy;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.state === "held") {
        const box = this.#launchWalls[ball.sublaunchIdx];
        if (box) {
          if (ball.x - r < box.left) { ball.x = box.left + r; ball.vx = Math.abs(ball.vx) * wallR; }
          else if (ball.x + r > box.right) { ball.x = box.right - r; ball.vx = -Math.abs(ball.vx) * wallR; }
          if (ball.y + r > box.bottom) { ball.y = box.bottom - r; ball.vy = -Math.abs(ball.vy) * 0.3; ball.vx *= PLINKO.FLOOR_FRICTION; }
          if (ball.y - r < box.top) { ball.y = box.top + r; ball.vy = Math.abs(ball.vy) * wallR; }
        }
      } else if (ball.state === "captured") {
        const gateIdx = PLINKO.GATE_ORDER.indexOf(ball.gateId);
        const walls = this.#gateWalls[gateIdx];
        if (walls) {
          if (ball.x - r < walls.left) { ball.x = walls.left + r; ball.vx = Math.abs(ball.vx) * wallR; }
          else if (ball.x + r > walls.right) { ball.x = walls.right - r; ball.vx = -Math.abs(ball.vx) * wallR; }
        }
        if (ball.y + r > gateFloor) { ball.y = gateFloor - r; ball.vy = -Math.abs(ball.vy) * 0.3; ball.vx *= PLINKO.FLOOR_FRICTION; }
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

    for (let i = 0; i < activeBalls.length; i++) {
      for (let j = i + 1; j < activeBalls.length; j++) {
        collideBalls(activeBalls[i], activeBalls[j]);
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
        const rv = reflect(ball.vx, ball.vy, c.nx, c.ny, peg.restitution);
        ball.vx = rv.vx;
        ball.vy = rv.vy;
        if (!ball.recentPegs.has(peg.id)) {
          ball.recentPegs.add(peg.id);
          this.#registerHit(peg, ball);
        }
      }
    }
  }

  /** @param {import('../entities/peg-classic.js').Peg} peg @param {Ball} ball */
  #registerHit(peg, ball) {
    /* Coin peg: credit currency, pop a coin label, consume the peg. */
    if (peg.type === "coin") {
      const coinValue = /** @type {any} */ (peg).coinValue ?? PLINKO.COIN_VALUE;
      currencyManager.add(coinValue);
      audioManager.playSfx("click");
      this.#popText(`+${coinValue}`, peg.x, peg.y, "pk-popup pk-popup--coin");
      this.#destroyPeg(peg, ball);
      return;
    }

    /* Score peg / bumper. Apply pegScoreMultiplier only to non-bumpers
       since `score_x2` is documented as classic-peg only. */
    const baseScore = peg.score;
    const score =
      peg.type === "bumper"
        ? baseScore
        : Math.round(
            bonusManager.resolve(PARAM_KEYS.PEG_SCORE_MULTIPLIER, 1) * baseScore,
          );
    ball.score += score;
    this.#updateScoreGauge();
    audioManager.playSfx("click");

    const el = this.#pegEls.get(peg.id);
    if (el) {
      el.classList.remove("pk-flash");
      void el.offsetWidth;
      el.classList.add("pk-flash");
    }

    this.#popText(
      `+${score}`,
      peg.x,
      peg.y,
      `pk-popup${peg.type === "bumper" ? " pk-popup--big" : ""}`,
    );
  }

  /** @param {string} text @param {number} x @param {number} y @param {string} cls */
  #popText(text, x, y, cls) {
    if (!this.#stackEl) return;
    const pop = document.createElement("div");
    pop.className = cls;
    pop.textContent = text;
    pop.style.left = `${x}px`;
    pop.style.top = `${y - 12}px`;
    this.#stackEl.appendChild(pop);
    this.#bag.timeout(() => pop.remove(), 600);
  }

  /**
   * Pop a floating score label at the pinboard bottom when a ball enters a gate.
   * @param {number} points
   * @param {number} x
   * @param {number} y
   */
  #popGateScore(points, x, y) {
    if (!this.#stackEl || points === 0) return;
    const pop = document.createElement("div");
    pop.className = `pk-popup pk-popup--gate ${points > 0 ? "pk-popup--bonus" : "pk-popup--malus"}`;
    pop.textContent = points > 0 ? `+${points}` : `${points}`;
    pop.style.left = `${x}px`;
    pop.style.top = `${y - 8}px`;
    this.#stackEl.appendChild(pop);
    this.#bag.timeout(() => pop.remove(), 900);
  }

  /* ──────────────────────────────────────────────────────────────────────
     Bottom / gates
     ────────────────────────────────────────────────────────────────────── */

  /** @param {Ball} ball */
  #handleBottom(ball) {
    const w = this.#pinboardWidth || 1;
    const fx = ball.x / w;
    const gateWidth = 0.2;
    let gate = "malus";
    let cumulative = 0;
    for (const g of PLINKO.GATE_ORDER) {
      cumulative += gateWidth;
      if (fx < cumulative) {
        gate = g;
        break;
      }
    }
    this.#flashGate(gate);

    if (gate === "recycle" && ball.canRecycle()) {
      ball.recycles += 1;
      const sub = Math.floor(Math.random() * this.#sublaunchEls.length);
      const oldX = ball.x;
      const oldY = ball.y;
      ball.x =
        (w * (sub + 0.5)) / this.#sublaunchEls.length +
        (Math.random() - 0.5) * 14;
      ball.y = -PLINKO.BALL_RADIUS * 2;
      ball.vx = (Math.random() - 0.5) * 60;
      ball.vy = 0;
      ball.recentPegs.clear();
      this.#emitRecycleTeleport(
        oldX,
        oldY,
        this.#balls.get(ball.id)?.el ?? null,
      );
    } else {
      let points = 0;
      if (gate === "x2") points = ball.score * 2;
      else if (gate === "x10") points = ball.score * 10;
      else if (gate === "x5") points = ball.score * 5;
      else if (gate === "malus") points = -PLINKO.MALUS_POINTS;
      else if (gate === "recycle") points = ball.score;

      this.#levelScore = Math.max(0, this.#levelScore + points);
      this.#updateScoreGauge();
      this.#popGateScore(points, ball.x, this.#pinboardHeight);
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
   * @param {number} bx
   * @param {number} by
   * @param {HTMLElement | null} ballEl
   */
  #emitRecycleTeleport(bx, by, ballEl) {
    if (!this.#ballLayerEl) return;
    const oy = this.#pinboardOffsetTop;
    const sx = bx;
    const sy = by + oy;

    for (let i = 0; i < 10; i++) {
      const p = document.createElement("div");
      p.className = "pk-particle pk-particle--recycle";
      const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      const dist = 14 + Math.random() * 16;
      p.style.cssText = `left:${sx}px;top:${sy}px;--px:${(Math.cos(angle) * dist).toFixed(1)}px;--py:${(Math.sin(angle) * dist).toFixed(1)}px`;
      this.#ballLayerEl.appendChild(p);
      this.#bag.timeout(() => p.remove(), 450);
    }

    const beam = document.createElement("div");
    beam.className = "pk-recycle-beam";
    beam.style.cssText = `left:${sx}px;top:0;height:${sy}px`;
    this.#ballLayerEl.appendChild(beam);
    this.#bag.timeout(() => beam.remove(), 550);

    if (ballEl) {
      ballEl.classList.remove("pk-recycle-materialize");
      void ballEl.offsetWidth;
      ballEl.classList.add("pk-recycle-materialize");
      this.#bag.timeout(
        () => ballEl.classList.remove("pk-recycle-materialize"),
        400,
      );
    }
  }

  /** @param {string} name */
  #flashGate(name) {
    const el = this.#safeEl?.querySelector(`[data-gate="${name}"]`);
    if (!el) return;
    el.classList.remove("pk-flash");
    void /** @type {HTMLElement} */ (el).offsetWidth;
    el.classList.add("pk-flash");
  }

  /* ──────────────────────────────────────────────────────────────────────
     Score gauge
     ────────────────────────────────────────────────────────────────────── */

  #updateScoreGauge() {
    let preview = this.#levelScore;
    for (const { ball } of this.#balls.values()) {
      if (ball.alive && ball.state === "active") preview += ball.score;
    }
    const pct = Math.min(1, Math.max(0, preview / this.#targetScore)) * 100;
    if (this.#scoreGaugeEl) this.#scoreGaugeEl.style.height = `${pct}%`;
    if (this.#scoreLabelEl)
      this.#scoreLabelEl.textContent = `${this.#levelScore} / ${this.#targetScore}`;

    const scoreEl = this.#safeEl?.querySelector('[data-role="r-score"]');
    if (scoreEl) scoreEl.textContent = String(this.#levelScore);
  }

  /* ──────────────────────────────────────────────────────────────────────
     Stuck balls
     ────────────────────────────────────────────────────────────────────── */

  #checkStuckBalls() {
    const now = performance.now();
    const STUCK_MS = PLINKO.STUCK_TIMEOUT_MS;
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
        const stuckPeg = this.#findTouchingPeg(ball);
        if (stuckPeg) {
          this.#destroyPeg(stuckPeg, ball);
        } else {
          ball.vx = (Math.random() - 0.5) * 200;
          ball.vy = -150;
        }
        tracker.since = now;
      }
    }
  }

  /** @param {Ball} ball @returns {import('../entities/peg-classic.js').Peg | null} */
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

  /** @param {import('../entities/peg-classic.js').Peg} peg @param {Ball} ball */
  #destroyPeg(peg, ball) {
    if (this.#stackEl) {
      const pop = document.createElement("div");
      pop.className = "pk-popup pk-popup--big";
      pop.textContent = "💥";
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
      if (idx !== -1) {
        layer.pegs.splice(idx, 1);
        break;
      }
    }
    if (ball) {
      ball.vx = (Math.random() - 0.5) * 150;
      ball.vy = Math.max(ball.vy, 80);
      ball.recentPegs.clear();
    }
    this.#ballIdleTracker.delete(ball?.id);
  }

  #renderBalls() {
    const oy = this.#pinboardOffsetTop;
    for (const { ball, el } of this.#balls.values()) {
      el.style.transform = `translate(${ball.x}px, ${ball.y + oy}px)`;
    }
  }

  /* ──────────────────────────────────────────────────────────────────────
     End of round
     ────────────────────────────────────────────────────────────────────── */

  #checkEndOfRound() {
    if (this.#ended) return;
    const allFired = this.#sublaunchFired.every(Boolean);
    if (!allFired) return;
    for (const { ball } of this.#balls.values()) {
      if (!ball.alive) continue;
      if (ball.state === "active") return;
      if (ball.state === "captured") {
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (speed > 5) return;
      }
    }
    const victory = this.#levelScore >= this.#targetScore;
    this.#bag.timeout(() => this.#endRound({ victory }), 2000);
    this.#ended = true;
  }

  /** @param {{ victory: boolean }} args */
  #endRound({ victory }) {
    if (this.#overModal) return;
    this.#ended = true;
    this.#stopLoop();

    if (victory) {
      this.#markLevelComplete();
      /* Tick session bonuses so they expire after N levels. Loss does
         not consume duration — players retry without penalty. */
      bonusManager.onLevelUp({ controller: this });
    }

    Promise.all([
      import("../components/level-end-modal.js"),
    ]).then(([{ LevelEndModal }]) => {
      this.#overModal = new LevelEndModal({
        victory,
        score: this.#levelScore,
        target: this.#targetScore,
        levelId: this.#levelId,
        onContinue: () => this.#router?.start(LevelSelectorScene),
        onRetry: () => {
          saveManager.clearLevelProgress();
          this.#router?.start(LevelSelectorScene);
        },
        onBack: () => {
          saveManager.clearLevelProgress();
          this.#router?.start(LevelSelectorScene);
        },
      });
      this.#overModal.open();
    });
  }

  #markLevelComplete() {
    const data = saveManager.loadLevelProgress() ?? {
      completed: [],
      globalScore: 0,
    };
    if (!data.completed.includes(this.#levelId)) {
      data.completed.push(this.#levelId);
    }
    data.globalScore += this.#levelScore;
    saveManager.saveLevelProgress(data);
  }

  #refreshLabels() {
    if (!this.#safeEl) return;
    for (const gate of PLINKO.GATE_ORDER) {
      const el = this.#safeEl.querySelector(
        `[data-gate="${gate}"] .pk-gate-label`,
      );
      if (el) el.textContent = i18n.t(`game.gate.${gate}`);
    }
  }

  #renderHudBonuses() {
    const el = this.#safeEl?.querySelector('[data-role="hud-bonuses"]');
    if (!el) return;
    const active = bonusManager.getActiveSession();
    const icons = {
      bonus_launcher: "🚀",
      score_x2: "×2",
    };
    el.innerHTML = active
      .map((b) => {
        const icon = icons[b.id] ?? "⭐";
        return `<span class="pk-hud-bonus" title="${b.id}">${icon}<span class="pk-hud-bonus-dur">${b.remaining}</span></span>`;
      })
      .join("");
  }
}
