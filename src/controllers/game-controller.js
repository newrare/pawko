import { ListenerBag } from "../utils/listener-bag.js";
import { BackgroundAnimator } from "../utils/background-animator.js";
import { layout } from "../managers/layout-manager.js";
import { i18n } from "../managers/i18n-manager.js";
import { saveManager } from "../managers/save-manager.js";
import { audioManager } from "../managers/audio-manager.js";
import { currencyManager } from "../managers/currency-manager.js";
import { diamondManager } from "../managers/diamond-manager.js";
import { bonusManager } from "../managers/bonus-manager.js";
import { gameEvents } from "../utils/event-emitter.js";
import { mountSparkWeb } from "../utils/spark-web.js";
import { collideCircles, reflect, clampVelocity, collideBalls } from "../utils/physics.js";
import { Ball } from "../entities/ball-classic.js";
import { createBall, BALL_KINDS } from "../entities/ball-factory.js";
import { Slot } from "../entities/slot.js";
import { PLINKO, PEG_SAVE, PEG_REPLACE_COSTS } from "../configs/constants.js";
import { PARAM_KEYS, DIRECTIVE_ACTIONS } from "../configs/bonus-defs.js";
import { LevelSelectorScene } from "../scenes/level-selector-scene.js";
import { PegSaveSystem } from "../utils/peg-save-system.js";
import { createPeg } from "../entities/peg-factory.js";
import { loadPinboard, persistPinboard } from "../utils/pinboard-state.js";
import { PinboardVfx } from "../utils/pinboard-vfx.js";
import { buildTestLayers } from "../utils/dev-game-helpers.js";
import { InfoBar, INFO_BAR_MODES } from "../components/info-bar.js";
import { RadialPegMenu } from "../components/radial-peg-menu.js";


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
  /** @type {HTMLElement[]} */ #sublaunchEls = [];
  /** @type {HTMLElement | null} */ #ballLayerEl = null;

  /* --- Game state --- */
  /** @type {number} */ #levelId = 1;
  /** @type {number} */ #playerHp = 0;
  /** @type {number} */ #playerMaxHp = 0;
  /** @type {number[]} */ #sublaunchBalls = [];
  /** @type {boolean[]} */ #sublaunchFired = [];
  /** @type {import('../entities/layer.js').Layer[]} */ #layers = [];
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
  /** @type {BackgroundAnimator | null} */ #bg = null;

  /* --- Peg Save System --- */
  /** @type {PegSaveSystem} */
  #pegSave = new PegSaveSystem();
  /** @type {HTMLElement | null} */ #saveComboHudEl = null;

  /* --- InfoBar --- */
  /** @type {InfoBar | null} */ #infoBar = null;

  /* --- Pinboard VFX --- */
  /** @type {PinboardVfx | null} */ #vfx = null;

  /* --- Radial peg-replace menu (tap on classic peg, pre-wave) --- */
  /** @type {Array<() => void>} */ #pegTapUnsubs = [];
  /** @type {RadialPegMenu | null} */ #radialMenu = null;

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
    /* Tower-defense: ball count scales with the level — base + step * levelId.
       Level 1 fires 20 balls per sublaunch, level 2 → 30, etc. Divided across
       sublaunches so the total wave size stays consistent. */
    const levelBalls =
      PLINKO.BALLS_LEVEL_BASE + PLINKO.BALLS_LEVEL_STEP * this.#levelId;
    const scaledBase = bonusManager.resolve(
      PARAM_KEYS.STARTING_BALLS_PER_SUBLAUNCH,
      levelBalls / sublaunchCount,
    );
    const ballsPerSublaunch = Math.max(1, Math.floor(scaledBase));
    this.#sublaunchBalls = Array(sublaunchCount).fill(ballsPerSublaunch);
    this.#sublaunchFired = Array(sublaunchCount).fill(false);

    this.#playerMaxHp = PLINKO.PLAYER_MAX_HP +
      bonusManager.resolve(PARAM_KEYS.PLAYER_MAX_HP_BONUS, 0);
    this.#playerHp = this.#playerMaxHp;

    this.#buildDom();
    this.#measure();

    this.#vfx = new PinboardVfx({
      stackEl: this.#stackEl,
      ballLayerEl: this.#ballLayerEl,
      safeEl: this.#safeEl,
      getPinboardOffsetTop: () => this.#pinboardOffsetTop,
      bag: this.#bag,
    });

    this.#infoBar = new InfoBar({ mode: INFO_BAR_MODES.PINBOARD });
    this.#infoBar.mount(this.#safeEl);

    this.#bag.add(layout.onChange(() => this.#onResize()));
    this.#bag.add(i18n.onChange(() => this.#refreshLabels()));

    if (this.#data?.testPegs) {
      this.#devLoadTestPegs(this.#data.testPegs);
    } else {
      this.#loadAllLayers();
    }
    this.#setupPegTap();
    this.#spawnHeldBalls();
    this.#applyRoundDirectives();
    this.#refreshSublaunches();
    this.#renderHudBonuses();
    this.#updateInfoBar();

    /* Dev-admin spawn (kind passed as event arg). */
    this.#bag.add(
      gameEvents.on("dev:spawnBall", (kind = BALL_KINDS.CLASSIC) =>
        this.#devSpawnBall(kind),
      ),
    );

    /* Diamond pegs emit a diamonds event; route into the persistent
       diamond wallet here so the rest of the code only deals with one
       channel. */
    this.#bag.add(
      gameEvents.on("diamonds", (n) => diamondManager.add(n)),
    );
  }

  destroy() {
    this.#stopLoop();
    this.#overModal?.destroy();
    this.#overModal = null;
    this.#infoBar?.destroy();
    this.#infoBar = null;
    this.#vfx = null;
    this.#pegSave.dispose();
    this.#saveComboHudEl?.remove();
    this.#saveComboHudEl = null;
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
    this.#bg = new BackgroundAnimator(this.#root, 'plinko');
    this.#bag.add(() => this.#bg?.destroy());

    const safe = document.createElement("div");
    safe.className = "gt-game-safe";

    const gateLabels = {
      teleport_left: i18n.t("game.gate.teleport"),
      destroy_left: i18n.t("game.gate.destroy"),
      hp: i18n.t("game.gate.hp"),
      destroy_right: i18n.t("game.gate.destroy"),
      teleport_right: i18n.t("game.gate.teleport"),
    };

    const sublaunchCount = this.#sublaunchBalls.length;
    safe.innerHTML = `
      <div class="pk-board-card">
        <div class="pk-launch" data-role="launch" style="grid-template-columns: repeat(${sublaunchCount}, 1fr)">
          ${Array.from({ length: sublaunchCount }, (_, i) => `<div class="pk-sublaunch" data-sublaunch="${i}"></div>`).join("")}
        </div>
        <div class="pk-pinboard" data-role="pinboard">
          <div class="pk-hud-bonuses" data-role="hud-bonuses"></div>
          <div class="pk-stack" data-role="stack"></div>
        </div>
        <div class="pk-collection">
          ${PLINKO.GATE_ORDER.map((g) => `<div class="pk-gate pk-gate--${g}" data-gate="${g}"><span class="pk-gate-label">${gateLabels[g]}</span></div>`).join("")}
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
    this.#sublaunchEls = Array.from(safe.querySelectorAll(".pk-sublaunch"));

    this.#bag.on(safe, "pointerdown", this.#onPointer);
  }

  #onPointer = (event) => {
    const target = /** @type {HTMLElement} */ (event.target);

    /* Peg save: coordinate-based hit test against all active rescue windows.
       The visible ring extends well beyond the 22 px peg DOM box, so
       target.closest() is unreliable — we project the pointer into pinboard
       space and accept any tap within the initial ring radius (3× peg radius). */
    if (this.#pegSave.rescuableCount > 0 && this.#pinboardEl) {
      const rect = this.#pinboardEl.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const hitRadius = PLINKO.PEG_RADIUS * 3;
      for (const pegId of this.#pegSave.rescuableIds) {
        const peg = this.#findPegById(pegId);
        if (!peg) continue;
        const dx = px - peg.x;
        const dy = py - peg.y;
        if (dx * dx + dy * dy <= hitRadius * hitRadius) {
          if (this.#pegSave.trySave(pegId)) {
            const el = this.#pegEls.get(pegId);
            if (el) this.#onPegSaved(pegId, peg, el);
          }
          return;
        }
      }
    }

    /* Bomb peg: tappable during play. Hit-test via closest matching class. */
    const bombEl = target.closest(".pk-peg--bomb");
    if (bombEl && this.#pinboardEl) {
      const pegId = Number(bombEl.dataset.pegId);
      const peg = this.#findPegById(pegId);
      if (peg && peg.type === "bomb" && !peg.detonated) {
        this.#detonateBomb(peg);
        return;
      }
    }

    const sub = target.closest("[data-sublaunch]");
    if (sub) {
      const i = Number(/** @type {HTMLElement} */ (sub).dataset.sublaunch);
      this.#fireSublaunch(i);
    }
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
    const { layers, fromSave } = loadPinboard({
      levelId: this.#levelId,
      width: this.#pinboardWidth,
    });
    this.#layers = layers;
    if (!fromSave) this.#persistPinboard();
    this.#recalcLayerPositions();
    for (const layer of this.#layers) {
      this.#renderLayer(layer);
    }
  }

  #persistPinboard() {
    persistPinboard(this.#layers);
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

  /** @param {import('../entities/layer.js').Layer} layer */
  #renderLayer(layer) {
    if (!this.#stackEl) return;
    const el = document.createElement("div");
    el.className = "pk-layer";
    el.style.top = `${layer.y}px`;

    for (const peg of layer.pegs) {
      peg.y = layer.y;
      const p = this.#createPegEl(peg);
      el.appendChild(p);
      this.#pegEls.set(peg.id, p);
    }

    this.#stackEl.appendChild(el);
    this.#layerEls.set(layer.id, el);
  }

  /**
   * Build a peg DOM element from a peg entity. Class naming and
   * interactivity flags are sourced from the entity (`cssModifier`,
   * `extraCssClasses`). Shield + electrical pegs add a couple of
   * state-specific bits (shield ring radius, spark-web mount).
   * @param {import('../entities/peg-classic.js').Peg} peg
   * @returns {HTMLElement}
   */
  #createPegEl(peg) {
    const p = document.createElement("div");
    const classes = ["pk-peg"];
    if (peg.cssModifier) classes.push(`pk-peg--${peg.cssModifier}`);
    classes.push(...peg.extraCssClasses);
    p.className = classes.join(" ");

    if (peg.type === "shield") {
      p.classList.add(peg.shieldActive ? "pk-peg--shield-active" : "pk-peg--shield-down");
      p.style.setProperty("--pk-shield-radius", `${peg.shieldRadius}px`);
    }
    p.style.left = `${peg.x}px`;
    p.style.top = "0px";
    p.dataset.pegId = String(peg.id);

    if (peg.type === "electrical") {
      p.__pkSparkUnmount = mountSparkWeb(p, { radius: 11, padding: 16 });
    }
    return p;
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
    this.#teardownPegTap();
    const subEl = this.#sublaunchEls[index];
    subEl?.setAttribute("data-firing", "true");
    this.#bag.timeout(() => subEl?.removeAttribute("data-firing"), 400);
    this.#emitReceptacleParticles(subEl);

    for (const { ball } of held) {
      ball.state = "active";
    }
    this.#sublaunchBalls[index] = 0;
    this.#refreshSublaunches();
    this.#updateInfoBar();
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

  /* ──────────────────────────────────────────────────────────────────────
     Tap on classic peg → Radial peg-replace menu (pre-wave only)
     ────────────────────────────────────────────────────────────────────── */

  /** Attach tap listeners to all classic pegs (pre-wave only). */
  #setupPegTap() {
    if (!this.#pinboardEl) return;
    for (const layer of this.#layers) {
      for (const peg of layer.pegs) {
        if (peg.type !== "peg") continue; // only classic pegs
        const el = this.#pegEls.get(peg.id);
        if (!el) continue;
        const cleanup = this.#bag.on(el, "pointerdown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.#openRadialMenu(peg, el);
        });
        this.#pegTapUnsubs.push(cleanup);
      }
    }
  }

  /** Dispose all peg tap listeners (called when wave fires). */
  #teardownPegTap() {
    for (const unsub of this.#pegTapUnsubs) unsub();
    this.#pegTapUnsubs = [];
    if (this.#radialMenu) {
      this.#radialMenu.close();
      this.#radialMenu = null;
    }
  }

  /**
   * Open the radial peg-replace menu around the given peg element.
   * @param {import('../entities/peg-classic.js').Peg} peg
   * @param {HTMLElement} anchorEl
   */
  #openRadialMenu(peg, anchorEl) {
    if (this.#radialMenu) this.#radialMenu.close();
    if (this.#sublaunchFired[0]) return; // wave already fired

    this.#radialMenu = new RadialPegMenu({
      anchorEl,
      onSelect: (type) => this.#replacePeg(peg, type),
    });
    this.#radialMenu.open();
  }

  /**
   * Replace a classic peg with a new type, spending coins.
   * @param {import('../entities/peg-classic.js').Peg} oldPeg
   * @param {string} type
   */
  #replacePeg(oldPeg, type) {
    const baseCost = PEG_REPLACE_COSTS[type];
    if (!baseCost) return;
    const cost = Math.max(1, Math.round(
      baseCost * bonusManager.resolve(PARAM_KEYS.PEG_REPLACE_DISCOUNT, 1),
    ));
    if (currencyManager.get() < cost) return;

    currencyManager.spend(cost);

    // Find the layer containing this peg.
    let parentLayer = null;
    let pegIdx = -1;
    for (const layer of this.#layers) {
      const idx = layer.pegs.indexOf(oldPeg);
      if (idx !== -1) {
        parentLayer = layer;
        pegIdx = idx;
        break;
      }
    }
    if (!parentLayer) return;

    // Create new peg at same position.
    const newPeg = createPeg(type, { x: oldPeg.x, y: oldPeg.y, slot: oldPeg.slot });
    newPeg.x = oldPeg.x;
    newPeg.y = oldPeg.y;

    // Swap in the layer.
    parentLayer.pegs[pegIdx] = newPeg;

    // Remove old DOM element.
    const oldEl = this.#pegEls.get(oldPeg.id);
    oldEl?.remove();
    this.#pegEls.delete(oldPeg.id);

    // Create new DOM element via the shared builder.
    const p = this.#createPegEl(newPeg);
    const layerEl = this.#layerEls.get(parentLayer.id);
    if (layerEl) layerEl.appendChild(p);
    this.#pegEls.set(newPeg.id, p);

    this.#persistPinboard();
    this.#updateInfoBar();
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
        const el = this.#createBallEl(ball);
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

  #emitReceptacleParticles(el) {
    this.#vfx?.emitReceptacleParticles(el);
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
    this.#tickBallEffects();
    this.#renderBalls();
    this.#checkStuckBalls();
    this.#tickShields();
    if (!this.#hasSimulatedBalls()) this.#checkEndOfRound();
  }

  /** Tick active effects on every ball (DoT damage, expiry). */
  #tickBallEffects() {
    const now = performance.now();
    for (const entry of this.#balls.values()) {
      const ball = entry.ball;
      if (!ball.alive) continue;
      const dead = ball.tickEffects(now);
      if (dead) {
        this.#updateBallEl(ball);
        this.#destroyBall(ball, { reason: "effect" });
      } else {
        this.#syncBallEffectClasses(ball);
      }
    }
  }

  /** Sync CSS effect classes on the ball element. */
  #syncBallEffectClasses(ball) {
    const entry = this.#balls.get(ball.id);
    if (!entry?.el) return;
    const el = entry.el;
    const active = ball.getActiveEffectIds();
    for (const cls of ["pk-ball--on-fire", "pk-ball--frozen", "pk-ball--electrified"]) {
      el.classList.remove(cls);
    }
    for (const id of active) {
      if (id === "burning") el.classList.add("pk-ball--on-fire");
      else if (id === "frozen") el.classList.add("pk-ball--frozen");
      else if (id === "electrified") el.classList.add("pk-ball--electrified");
    }
  }

  #substep(dt) {
    const w = this.#pinboardWidth;
    const wallR = PLINKO.WALL_RESTITUTION;
    const maxV = PLINKO.MAX_VELOCITY;
    const r = PLINKO.BALL_RADIUS;
    const gravity = PLINKO.GRAVITY;
    const bottomY = this.#pinboardHeight;
    /* gateFloor is the y-coordinate of the gate-zone floor surface.
       Captured balls rest with ball.y = gateFloor - r so ball.bottom = gateFloor,
       i.e. visually touching the actual bottom of the gate row. */
    const gateFloor = bottomY + this.#gateZoneHeight;

    const activeBalls = [];

    for (const entry of [...this.#balls.values()]) {
      const ball = entry.ball;
      if (!ball.alive) continue;

      /* Glued balls are locked to their trapping peg — no gravity, no
         integration, no wall checks, no peg hits. They are still tracked
         so #renderBalls keeps them in sync visually. */
      if (ball.state === "glued") {
        const peg = ball.trappedPeg;
        if (peg) {
          ball.x = peg.x + ball.trappedOffsetX;
          ball.y = peg.y + ball.trappedOffsetY;
        }
        ball.vx = 0;
        ball.vy = 0;
        continue;
      }

      ball.vy += gravity * dt;
      const v = clampVelocity(ball.vx, ball.vy, maxV);
      ball.vx = v.vx;
      ball.vy = v.vy;
      /* Apply speed multiplier from active effects (e.g. ice halves speed). */
      const speedMult = ball.getSpeedMultiplier();
      ball.x += ball.vx * dt * speedMult;
      ball.y += ball.vy * dt * speedMult;

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
        /* Shield peg: deflect off the shield radius first. */
        if (peg.type === "shield" && peg.shieldActive) {
          const sc = collideCircles(ball.x, ball.y, r, peg.x, peg.y, peg.shieldRadius);
          if (sc) {
            ball.x += sc.nx * sc.depth;
            ball.y += sc.ny * sc.depth;
            const rv = reflect(ball.vx, ball.vy, sc.nx, sc.ny, PLINKO.RESTITUTION_PEG);
            ball.vx = rv.vx;
            ball.vy = rv.vy;
            if (!ball.recentPegs.has(peg.id)) {
              ball.recentPegs.add(peg.id);
              peg.hitShield();
              this.#updatePegEl(peg);
              const shieldEl = this.#pegEls.get(peg.id);
              if (shieldEl) {
                this.#flashPegEl(shieldEl);
                if (peg.shieldActive) this.#showHpLabelOn(shieldEl, peg.shieldHits);
              }
              /* Tower-defense: shield contact also damages the ball. */
              if (ball.alive) {
                const dead = ball.takeDamage(1);
                this.#updateBallEl(ball);
                if (dead) {
                  this.#destroyBall(ball, { reason: "depleted" });
                  return;
                }
              }
            }
            continue;
          }
          ball.recentPegs.delete(peg.id);
          continue;
        }

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
    /* 1) Peg self-destruct with a reward directive (coin peg → coins).
          Also handles teleport, glue, elemental effects. */
    const reward = peg.consumeReward(ball);
    if (reward) {
      if (reward.coins) currencyManager.add(reward.coins);
      if (reward.diamonds) gameEvents.emit("diamonds", reward.diamonds);
      if (reward.teleport) {
        ball.teleportInside({ width: this.#pinboardWidth, height: this.#pinboardHeight });
        audioManager.playSfx("click");
        if (reward.popText) {
          this.#popText(reward.popText, peg.x, peg.y, reward.popClass ?? "pk-popup");
        }
        const died = peg.takeDamage(1);
        if (died) {
          this.#startPegRescue(peg, ball);
        } else {
          this.#applyHitFeedback(peg);
        }
        return;
      }
      /* Elemental peg: apply a timed effect (burning, frozen, electrified). */
      if (reward.effect) {
        ball.applyEffect(reward.effect, performance.now());
        audioManager.playSfx("click");
        if (reward.popText) {
          this.#popText(reward.popText, peg.x, peg.y, reward.popClass ?? "pk-popup");
        }
        const died = peg.takeDamage(1);
        if (died) {
          this.#startPegRescue(peg, ball);
        } else {
          this.#applyHitFeedback(peg);
        }
        /* Tower-defense: contact still damages ball. */
        if (ball.alive) {
          const dead = ball.takeDamage(1);
          this.#updateBallEl(ball);
          if (dead) this.#destroyBall(ball, { reason: "depleted" });
        }
        return;
      }
      /* Black peg: instant kill — set ball HP to 0. */
      if (reward.instantKill) {
        audioManager.playSfx("click");
        if (reward.popText) {
          this.#popText(reward.popText, peg.x, peg.y, reward.popClass ?? "pk-popup");
        }
        ball.hp = 0;
        ball.alive = false;
        this.#updateBallEl(ball);
        this.#destroyBall(ball, { reason: "depleted" });
        /* Black peg does NOT take damage — it persists. */
        return;
      }
      /* Bomb peg: explode on contact, destroy nearby pegs and balls. */
      if (reward.bomb) {
        this.#detonateBomb(peg);
        return;
      }
      if (reward.trapped) {
        /* Glue: stick the ball to the peg then fall through to the normal
           damage / HP-label / tremble flow so the peg behaves like a classic
           peg in every other respect. */
        ball.trapOn(peg);
        audioManager.playSfx("click");
        if (reward.popText) {
          this.#popText(reward.popText, peg.x, peg.y, reward.popClass ?? "pk-popup");
        }
      } else {
        /* Reward-per-hit pegs (coin, diamond) — credit the reward then apply
           normal HP damage so they survive multiple hits. */
        audioManager.playSfx("click");
        if (reward.popText) {
          this.#popText(reward.popText, peg.x, peg.y, reward.popClass ?? "pk-popup");
        }
        const died = peg.takeDamage(1);
        if (died) {
          this.#startPegRescue(peg, ball);
        } else {
          this.#applyHitFeedback(peg);
        }
        return;
      }
    }

    /* 2) Score the contact. Bumpers opt out of the PEG_SCORE_MULTIPLIER
          (they already encode the boost). */
    const baseScore = peg.scoreForContact();
    const score = peg.appliesPegMultiplier
      ? Math.round(bonusManager.resolve(PARAM_KEYS.PEG_SCORE_MULTIPLIER, 1) * baseScore)
      : baseScore;
    ball.score += score;
    audioManager.playSfx("click");

    /* 3) HP damage — one hit = one damage. Destroy if depleted. */
    const died = peg.takeDamage(1);
    if (died) {
      this.#startPegRescue(peg, ball);
      return;
    }

    /* Tremble + flash + HP label — same visual contract for every peg type. */
    this.#applyHitFeedback(peg);

    if (score > 0) {
      this.#popText(
        `+${score}`,
        peg.x,
        peg.y,
        `pk-popup${peg.type === "bumper" ? " pk-popup--big" : ""}`,
      );
    }

    /* 4) Tower-defense damage — every real peg contact subtracts 1 HP
          from the ball. Glue path already returned. */
    if (ball.alive) {
      const dead = ball.takeDamage(1);
      this.#updateBallEl(ball);
      if (dead) this.#destroyBall(ball, { reason: "depleted" });
    }
  }

  #popText(text, x, y, cls) {
    this.#vfx?.popText(text, x, y, cls);
  }

  #popGateScore(points, x, y) {
    this.#vfx?.popGateScore(points, x, y);
  }

  /* ──────────────────────────────────────────────────────────────────────
     Bottom / gates
     ────────────────────────────────────────────────────────────────────── */

  /** @param {Ball} ball */
  #handleBottom(ball) {
    const w = this.#pinboardWidth || 1;
    const fx = ball.x / w;
    const gateWidth = 0.2;
    let gate = PLINKO.GATE_ORDER[PLINKO.GATE_ORDER.length - 1];
    let cumulative = 0;
    for (const g of PLINKO.GATE_ORDER) {
      cumulative += gateWidth;
      if (fx < cumulative) {
        gate = g;
        break;
      }
    }
    this.#flashGate(gate);

    const isTeleport = gate === "teleport_left" || gate === "teleport_right";
    const isDestroy = gate === "destroy_left" || gate === "destroy_right";

    const maxRecycles = PLINKO.MAX_RECYCLES +
      bonusManager.resolve(PARAM_KEYS.TELEPORT_RECYCLE_MAX_BONUS, 0);

    if (isTeleport && ball.recycles < maxRecycles) {
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
      return;
    }

    if (isDestroy) {
      const hp = ball.hp ?? ball.maxHp ?? 0;
      const coinMult = bonusManager.resolve(PARAM_KEYS.DESTROY_COIN_MULTIPLIER, 1);
      const coins = Math.max(0, Math.round(hp * PLINKO.DESTROY_COIN_PER_HP * coinMult));
      if (coins > 0) currencyManager.add(coins);
      this.#popGateScore(coins, ball.x, this.#pinboardHeight);
      this.#captureBall(ball, gate);
      return;
    }

    if (gate === "hp") {
      this.#damagePlayer(PLINKO.HP_GATE_DAMAGE);
      this.#updateInfoBar();
      this.#popGateScore(-PLINKO.HP_GATE_DAMAGE, ball.x, this.#pinboardHeight);
      this.#captureBall(ball, gate);
      return;
    }

    // Teleport gate without remaining recycles → treat as destroy fallback.
    const hp = ball.hp ?? ball.maxHp ?? 0;
    const coinMult = bonusManager.resolve(PARAM_KEYS.DESTROY_COIN_MULTIPLIER, 1);
    const coins = Math.max(0, Math.round(hp * PLINKO.DESTROY_COIN_PER_HP * coinMult));
    if (coins > 0) currencyManager.add(coins);
    this.#popGateScore(coins, ball.x, this.#pinboardHeight);
    this.#captureBall(ball, gate);
  }

  /** @param {Ball} ball @param {string} gate */
  #captureBall(ball, gate) {
    ball.state = "captured";
    ball.gateId = gate;
    ball.vy = Math.abs(ball.vy) * 0.3;
    ball.recentPegs.clear();
  }

  #emitRecycleTeleport(bx, by, ballEl) {
    this.#vfx?.emitRecycleTeleport(bx, by, ballEl);
  }

  #flashGate(name) {
    this.#vfx?.flashGate(name);
  }

  #updateInfoBar() {
    if (!this.#infoBar) return;

    const ballsByKind = {};
    for (const kind of Object.values(BALL_KINDS)) {
      ballsByKind[kind] = 0;
    }
    for (const { ball } of this.#balls.values()) {
      if (ball.alive) {
        const kind = ball.kind ?? BALL_KINDS.CLASSIC;
        ballsByKind[kind] = (ballsByKind[kind] ?? 0) + 1;
      }
    }
    let heldBalls = 0;
    for (const count of this.#sublaunchBalls) {
      heldBalls += count;
    }
    ballsByKind[BALL_KINDS.CLASSIC] = (ballsByKind[BALL_KINDS.CLASSIC] ?? 0) + heldBalls;

    this.#infoBar.setData("balls", ballsByKind);
    this.#infoBar.setData("launchers", {
      total: this.#sublaunchBalls.length,
      fired: this.#sublaunchFired.filter(Boolean).length,
    });
    this.#infoBar.setData("hp", { current: this.#playerHp, max: this.#playerMaxHp });
  }

  /**
   * Inflict damage to the player when a ball reaches the central HP gate.
   * Ends the round when HP reaches 0.
   */
  #damagePlayer(amount = 1) {
    if (this.#ended) return;
    this.#playerHp = Math.max(0, this.#playerHp - amount);
    this.#updateInfoBar();
    if (this.#playerHp <= 0) {
      this.#ended = true;
      this.#bag.timeout(() => this.#endRound({ victory: false }), 1500);
    }
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

  /**
   * Look up a peg entity by id across all layers.
   * @param {number} id
   * @returns {import('../entities/peg-classic.js').Peg | null}
   */
  #findPegById(id) {
    for (const layer of this.#layers) {
      for (const peg of layer.pegs) {
        if (peg.id === id) return peg;
      }
    }
    return null;
  }

  /** @param {import('../entities/peg-classic.js').Peg} peg @param {Ball} ball */
  #destroyPeg(peg, ball) {
    /* If a glue peg held a ball that never made it through the normal
       onDestroyed → applyDestroyReward path (e.g. stuck-ball recovery),
       free it here so it does not stay locked in the "glued" state. */
    if (peg.type === "glue" && peg.trappedBall) {
      const freed = peg.trappedBall;
      peg.trappedBall = null;
      if (this.#balls.has(freed.id)) freed.release();
    }
    this.#vfx?.popText("💥", peg.x, peg.y, "pk-popup pk-popup--big");
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

  /**
   * Remove a peg's DOM element and splice it out of its layer.
   * @param {import('../entities/peg-classic.js').Peg} peg
   */
  #removePegEl(peg) {
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
  }

  /* --- Peg Save System helpers --- */

  /**
   * Start a rescue window for a peg that just died. Instead of destroying
   * immediately, the peg enters a "rescuable" state with a shrinking ring.
   * @param {import('../entities/peg-classic.js').Peg} peg
   * @param {Ball} ball
   */
  #startPegRescue(peg, ball) {
    const el = this.#pegEls.get(peg.id);
    if (!el) {
      /* No DOM element — skip rescue, destroy directly. */
      const deathReward = peg.onDestroyed(ball);
      if (deathReward) this.#applyDestroyReward(deathReward, peg);
      this.#destroyPeg(peg, ball);
      return;
    }

    /* Reward pegs (chest, coin, diamond) self-consume on death and cannot
       be rescued — the player already collected the reward, so reviving
       them would let them be milked indefinitely. */
    if (peg.type === "chest" || peg.type === "coin" || peg.type === "diamond") {
      const deathReward = peg.onDestroyed(ball);
      if (deathReward) this.#applyDestroyReward(deathReward, peg);
      this.#destroyPeg(peg, ball);
      return;
    }

    /* Visual: mark peg as rescuable (triggers CSS ring + pulse). */
    el.classList.remove("pk-tremble", "pk-flash");
    el.classList.add("pk-peg--rescuable");

    /* Kick ball away so it doesn't stick on the dead peg. */
    if (ball) {
      ball.vx = (Math.random() - 0.5) * 150;
      ball.vy = Math.max(ball.vy, 80);
      ball.recentPegs.clear();
    }

    this.#pegSave.startRescue(peg, {
      onExpire: () => {
        /* Timer ran out — destroy for real. peg.onDestroyed() is called
           lazily here so that a rescued peg keeps its side-effect state
           intact (e.g. a glue peg's trappedBall must survive a save). */
        const deathReward = peg.onDestroyed(ball);
        if (deathReward) this.#applyDestroyReward(deathReward, peg);
        this.#destroyPeg(peg, null);
        /* A glue peg may have just released a trapped ball; resume the
           simulation so the released ball gets played out, and re-check
           end-of-round in case this was the last pending rescue. */
        this.#startLoop();
        this.#checkEndOfRound();
      },
      onSave: () => {
        /* Player tapped in time — handled in #onPegSaved. The round may
           now be ready to end since the rescue window closed. */
        this.#checkEndOfRound();
      },
    });
  }

  /**
   * Called when a peg is successfully saved by the player.
   * @param {number} pegId
   * @param {import('../entities/peg-classic.js').Peg} peg
   * @param {HTMLElement} el
   */
  #onPegSaved(pegId, peg, el) {
    audioManager.playSfx("click");
    el.classList.remove("pk-peg--rescuable", "pk-tremble");
    el.classList.add("pk-peg--saved");
    this.#bag.timeout(() => el.classList.remove("pk-peg--saved"), 400);

    /* Big combo banner at the peg position, tinted with the peg's own
       resolved --pk-peg-color so the banner always matches the saved
       peg's identity. */
    const mult = this.#pegSave.comboMultiplier;
    const color = getComputedStyle(el).getPropertyValue("--pk-peg-color").trim();
    this.#vfx?.showSaveBanner(`💾 SAVED! ×${mult.toFixed(1)}`, peg.x, peg.y, color);

    this.#updateSaveComboHud();
    /* Schedule a HUD refresh after the combo might decay. */
    this.#bag.timeout(() => this.#updateSaveComboHud(), PEG_SAVE.COMBO_DECAY_MS + 50);
  }

  /** Update or create the save combo HUD badge. */
  #updateSaveComboHud() {
    if (!this.#pinboardEl) return;
    const mult = this.#pegSave.comboMultiplier;
    if (mult <= 1) {
      this.#saveComboHudEl?.remove();
      this.#saveComboHudEl = null;
      return;
    }
    if (!this.#saveComboHudEl) {
      this.#saveComboHudEl = document.createElement("div");
      this.#saveComboHudEl.className = "pk-save-combo-hud";
      this.#pinboardEl.appendChild(this.#saveComboHudEl);
    }
    this.#saveComboHudEl.textContent = `Save ×${mult.toFixed(1)}`;
  }

  /* --- New peg behaviour helpers --- */

  /**
   * Apply a destruction reward from peg.onDestroyed().
   * @param {object} reward
   * @param {import('../entities/peg-classic.js').Peg} peg
   */
  #applyDestroyReward(reward, peg) {
    if (reward.coins) currencyManager.add(reward.coins);
    if (reward.diamonds) gameEvents.emit("diamonds", reward.diamonds);
    if (reward.extraBalls) this.#addExtraBalls(reward.extraBalls);
    if (reward.releaseBall && this.#balls.has(reward.releaseBall.id)) {
      reward.releaseBall.release();
    }
    if (reward.activate) bonusManager.activateSession(reward.activate);
    if (reward.popText) {
      this.#popText(reward.popText, peg.x, peg.y, reward.popClass ?? "pk-popup");
    }
  }

  /**
   * Detonate a bomb peg — destroy all pegs and kill all balls within its
   * blast radius. The bomb peg itself is destroyed.
   * @param {import('../entities/peg-bomb.js').BombPeg} peg
   */
  #detonateBomb(peg) {
    if (!peg.explode()) return;
    const bx = peg.x;
    const by = peg.y;
    const radius = peg.blastRadius + bonusManager.resolve(PARAM_KEYS.BOMB_RADIUS_BONUS, 0);
    const r2 = radius * radius;

    audioManager.playSfx("click");
    this.#popText("💣", bx, by, "pk-popup pk-popup--bomb");

    /* Destroy nearby pegs. */
    for (const layer of this.#layers) {
      for (const p of layer.pegs) {
        if (p === peg) continue;
        if (!p.alive) continue;
        const dx = p.x - bx;
        const dy = p.y - by;
        if (dx * dx + dy * dy <= r2) {
          p.hp = 0;
          p.alive = false;
          this.#removePegEl(p);
        }
      }
    }

    /* Kill nearby balls. */
    for (const entry of this.#balls.values()) {
      const ball = entry.ball;
      if (!ball.alive) continue;
      const dx = ball.x - bx;
      const dy = ball.y - by;
      if (dx * dx + dy * dy <= r2) {
        ball.hp = 0;
        ball.alive = false;
        this.#updateBallEl(ball);
        this.#destroyBall(ball, { reason: "bomb" });
      }
    }

    /* Remove the bomb peg itself. */
    this.#removePegEl(peg);

    this.#vfx?.emitBombShockwave(bx, by, radius);
  }

  /** Add extra balls to a random sublaunch. */
  #addExtraBalls(count) {
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * this.#sublaunchBalls.length);
      this.#sublaunchBalls[idx]++;
    }
    this.#refreshSublaunches();
  }

  /** Reactivate shields whose cooldown has elapsed. */
  #tickShields() {
    for (const layer of this.#layers) {
      for (const peg of layer.pegs) {
        if (peg.type === "shield" && peg.tickShield()) {
          this.#updatePegEl(peg);
        }
      }
    }
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
    /* A pending peg rescue can still resolve into freed balls (glue peg)
       or score (peg save combo), so the round is not over until every
       rescue window has been closed. */
    if (this.#pegSave.rescuableCount > 0) return;
    for (const { ball } of this.#balls.values()) {
      if (!ball.alive) continue;
      if (ball.state === "active") return;
      if (ball.state === "captured") {
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (speed > 5) return;
      }
    }
    /* Tower-defense win condition: all balls are destroyed or captured
       and the player still has HP remaining. */
    const victory = this.#playerHp > 0;
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
      /* Tick session bonuses so they expire after N levels on victory.
         On defeat the run is reset entirely (see onRetry/onBack below). */
      bonusManager.onLevelUp({ controller: this });
    }

    const resetRun = () => {
      saveManager.clearGridState();
      saveManager.clearPinboardState();
      bonusManager.clearSession();
    };

    Promise.all([
      import("../components/level-end-modal.js"),
    ]).then(([{ LevelEndModal }]) => {
      this.#overModal = new LevelEndModal({
        victory,
        levelId: this.#levelId,
        onContinue: () => this.#router?.start(LevelSelectorScene),
        onRetry: () => {
          resetRun();
          this.#router?.start(LevelSelectorScene);
        },
        onBack: () => {
          resetRun();
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
    saveManager.saveLevelProgress(data);
  }

  #refreshLabels() {
    if (!this.#safeEl) return;
    const gateLocaleKey = (gate) => {
      if (gate === "teleport_left" || gate === "teleport_right") return "game.gate.teleport";
      if (gate === "destroy_left" || gate === "destroy_right") return "game.gate.destroy";
      return `game.gate.${gate}`;
    };
    for (const gate of PLINKO.GATE_ORDER) {
      const el = this.#safeEl.querySelector(
        `[data-gate="${gate}"] .pk-gate-label`,
      );
      if (el) el.textContent = i18n.t(gateLocaleKey(gate));
    }
  }

  #renderHudBonuses() {
    const el = this.#safeEl?.querySelector('[data-role="hud-bonuses"]');
    if (!el) return;
    const active = bonusManager.getActiveSession();
    el.innerHTML = active
      .map(({ id, remaining, def }) => {
        const dur = Number.isFinite(remaining) ? remaining : "∞";
        const isMalus = def.category === "malus";
        return `<span class="pk-hud-bonus${isMalus ? " pk-hud-bonus--malus" : ""}" title="${id}">${def.icon}<span class="pk-hud-bonus-dur">${dur}</span></span>`;
      })
      .join("");
  }

  /* ──────────────────────────────────────────────────────────────────────
     Ball-effect helpers
     ────────────────────────────────────────────────────────────────────── */

  /** @param {Ball} ball */
  #createBallEl(ball) {
    const el = document.createElement("div");
    const mod = ball.cssModifier;
    el.className = `pk-ball${mod ? ` pk-ball--${mod}` : ""}`;
    return el;
  }

  /** @param {Ball} ball */
  #updateBallEl(ball) {
    const entry = this.#balls.get(ball.id);
    if (!entry) return;
    const el = entry.el;
    /* HP gauge as a CSS custom property — stylesheet reads it for an
       optional overlay (drained slice / opacity). */
    if (ball.maxHp > 0) {
      el.style.setProperty("--pk-ball-hp", `${ball.hp / ball.maxHp}`);
    }
  }

  /**
   * Visual feedback played after a non-fatal hit on a peg: tremble when HP
   * gets low, a brief flash, and the centered HP-remaining label. Every
   * peg type uses the same transient label — shown for 2 s at the peg
   * center and tinted with the peg color.
   * @param {import('../entities/peg-classic.js').Peg} peg
   */
  #applyHitFeedback(peg) {
    const el = this.#pegEls.get(peg.id);
    if (!el) return;

    const isLowHp = peg.hp > 1 && peg.hp / peg.maxHp <= 0.25;
    el.classList.toggle("pk-tremble", peg.isLastHit || isLowHp);
    this.#flashPegEl(el);

    if (peg.hp > 0) this.#showHpLabelOn(el, peg.hp);
  }

  #flashPegEl(el) {
    this.#vfx?.flashPegEl(el);
  }

  #showHpLabelOn(el, value) {
    this.#vfx?.showHpLabelOn(el, value);
  }

  /** @param {import('../entities/peg-classic.js').Peg} peg */
  #updatePegEl(peg) {
    const el = this.#pegEls.get(peg.id);
    if (!el) return;
    el.classList.remove(
      "pk-peg--shield-active",
      "pk-peg--shield-down",
      "pk-tremble",
    );
    if (peg.isLastHit) el.classList.add("pk-tremble");

    /* Shield visual states. The remaining shield charges are shown
       transiently — see #checkPegHits when a shield hit lands. */
    if (peg.type === "shield") {
      el.classList.add(peg.shieldActive ? "pk-peg--shield-active" : "pk-peg--shield-down");
    }

    /* Spark web is JS-driven; mount it lazily on first electrification.
       Electrical-type pegs carry the web permanently (it's their identity).
       DOM peg is 22×22 (radius 11). */
    const needsSpark = peg.type === "electrical";
    if (needsSpark && !el.__pkSparkUnmount) {
      el.__pkSparkUnmount = mountSparkWeb(el, { radius: 11, padding: 16 });
    } else if (!needsSpark && el.__pkSparkUnmount) {
      el.__pkSparkUnmount();
      el.__pkSparkUnmount = null;
    }
  }

  /**
   * Destroy a ball mid-flight (currently used by glass shatter).
   * @param {Ball} ball
   * @param {{ reason?: string }} [opts]
   */
  #destroyBall(ball, { reason = "destroyed" } = {}) {
    const entry = this.#balls.get(ball.id);
    if (!entry) return;
    ball.alive = false;
    /* Forfeit the ball's accumulated score — it never reaches a gate. */
    ball.score = 0;
    if (reason === "shatter") {
      this.#popText("💥", ball.x, ball.y, "pk-popup pk-popup--big");
    }
    entry.el.remove();
    this.#balls.delete(ball.id);
    this.#ballIdleTracker.delete(ball.id);
    this.#updateInfoBar();
  }

  /**
   * Spawn an extra ball of a given kind into the running round. Used by
   * the dev admin panel. The ball is dropped from the top of the
   * pinboard above a random sublauncher so it enters play immediately.
   * @param {string} kind
   */
  #devSpawnBall(kind) {
    if (this.#ended || !this.#ballLayerEl) return;
    const w = this.#pinboardWidth || 1;
    const subCount = Math.max(1, this.#sublaunchEls.length);
    const sub = Math.floor(Math.random() * subCount);
    const x = (w * (sub + 0.5)) / subCount + (Math.random() - 0.5) * 16;
    const ball = createBall(kind, {
      x,
      y: -PLINKO.BALL_RADIUS * 2,
      vx: (Math.random() - 0.5) * 60,
      vy: 0,
    });
    ball.state = "active";
    const el = this.#createBallEl(ball);
    const oy = this.#pinboardOffsetTop;
    el.style.transform = `translate(${ball.x}px, ${ball.y + oy}px)`;
    this.#ballLayerEl.appendChild(el);
    this.#balls.set(ball.id, { ball, el });
    this.#updateBallEl(ball);
    this.#startLoop();
  }

  /**
   * Drain the bonus-manager directive queue at the start of a round and
   * apply each action against the held-ball pool. Called once from
   * start().
   */
  #applyRoundDirectives() {
    const directives = bonusManager.consumeDirectives();
    if (directives.length === 0) return;
    const subCount = this.#sublaunchEls.length;
    if (subCount === 0) return;

    for (const d of directives) {
      const p = d.payload ?? {};
      switch (d.action) {
        case DIRECTIVE_ACTIONS.ADD_BALL: {
          const kind = p.kind ?? BALL_KINDS.CLASSIC;
          const count = p.count ?? 1;
          const targets =
            p.target === "all"
              ? Array.from({ length: subCount }, (_, i) => i)
              : [Math.floor(Math.random() * subCount)];
          for (const idx of targets) {
            for (let i = 0; i < count; i++) {
              this.#spawnHeldBall(idx, kind);
            }
          }
          break;
        }
        case DIRECTIVE_ACTIONS.REMOVE_BALL: {
          const kind = p.kind;
          let n = p.count ?? 1;
          for (const [id, entry] of [...this.#balls]) {
            if (n <= 0) break;
            if (
              entry.ball.state === "held" &&
              (entry.ball.kind ?? "classic") === kind
            ) {
              entry.el.remove();
              this.#balls.delete(id);
              n--;
            }
          }
          break;
        }
        case DIRECTIVE_ACTIONS.TRANSFORM_BALL: {
          const from = p.from ?? "classic";
          const to = p.to ?? "glass";
          for (let i = 0; i < subCount; i++) {
            for (const [id, entry] of this.#balls) {
              if (
                entry.ball.state === "held" &&
                entry.ball.sublaunchIdx === i &&
                (entry.ball.kind ?? "classic") === from
              ) {
                const { x, y } = entry.ball;
                entry.el.remove();
                this.#balls.delete(id);
                this.#spawnHeldBall(i, to, { x, y });
                break;
              }
            }
          }
          break;
        }
      }
    }
    this.#updateInfoBar();
  }

  /**
   * Spawn a held ball of an arbitrary kind into a given sublauncher.
   * @param {number} subIdx
   * @param {string} kind
   * @param {{ x?: number, y?: number }} [opts]
   */
  #spawnHeldBall(subIdx, kind, opts = {}) {
    if (!this.#ballLayerEl) return;
    this.#computeLaunchWalls();
    const box = this.#launchWalls[subIdx];
    if (!box) return;
    const cx = (box.left + box.right) / 2;
    const boxW = box.right - box.left;
    const x = opts.x ?? cx + (Math.random() - 0.5) * (boxW * 0.5);
    const y = opts.y ?? box.top + 4;
    const ball = createBall(kind, { x, y, vx: 0, vy: 0 });
    ball.state = "held";
    ball.sublaunchIdx = subIdx;
    const el = this.#createBallEl(ball);
    const oy = this.#pinboardOffsetTop;
    el.style.transform = `translate(${ball.x}px, ${ball.y + oy}px)`;
    this.#ballLayerEl.appendChild(el);
    this.#balls.set(ball.id, { ball, el });
  }

  /**
   * Dev: clear layers and build a test pinboard using the real slot grid.
   * @param {string} filter — see {@link buildTestLayers}.
   */
  #devLoadTestPegs(filter = "all") {
    if (!this.#stackEl) return;
    for (const el of this.#layerEls.values()) el.remove();
    this.#layerEls.clear();
    this.#pegEls.clear();
    this.#layers = buildTestLayers(filter, this.#pinboardWidth);
    this.#recalcLayerPositions();
    for (const layer of this.#layers) {
      this.#renderLayer(layer);
    }
  }
}

