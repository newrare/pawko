import { ListenerBag } from "../utils/listener-bag.js";
import { SlowFloatBackground } from "../utils/slow-float-background.js";
import { layout } from "../managers/layout-manager.js";
import { i18n } from "../managers/i18n-manager.js";
import { saveManager } from "../managers/save-manager.js";
import { audioManager } from "../managers/audio-manager.js";
import { currencyManager } from "../managers/currency-manager.js";
import { diamondManager } from "../managers/diamond-manager.js";
import { bonusManager } from "../managers/bonus-manager.js";
import { abilityManager } from "../managers/ability-manager.js";
import { pegShopManager } from "../managers/peg-shop-manager.js";
import { gameEvents } from "../utils/event-emitter.js";
import { mountSparkWeb } from "../utils/spark-web.js";
import {
  collideCircles,
  reflect,
  clampVelocity,
  collideBalls,
} from "../utils/physics.js";
import { Ball } from "../entities/ball-classic.js";
import { createBall, BALL_KINDS } from "../entities/ball-factory.js";
import { Slot } from "../entities/slot.js";
import {
  PLINKO,
  PEG_SAVE,
  CANNON,
  TOTAL_LEVELS,
  SLOT_MACHINE,
  RARITY,
  RARITY_WEIGHTS,
} from "../configs/constants.js";
import { adjustHitScore } from "../utils/hit-score.js";
import { iconSvg } from "../utils/icon.js";
import { spawnableBalls } from "../utils/ball-budget.js";
import { Cannon, ballsForLevel } from "../entities/cannon.js";
import { simulateTrajectory } from "../utils/trajectory.js";
import {
  PARAM_KEYS,
  DIRECTIVE_ACTIONS,
  TRIGGER_EVENTS,
  TRIGGER_ACTIONS,
} from "../configs/bonus-defs.js";
import { PEG_SHOP_DEFS } from "../configs/peg-shop-defs.js";
import { LevelSelectorScene } from "../scenes/level-selector-scene.js";
import { PegSaveSystem } from "../utils/peg-save-system.js";
import { computeGateWidths, gateBounds, gateAt } from "../utils/gate-widths.js";
import { loadPinboard, persistPinboard } from "../utils/pinboard-state.js";
import { PinboardVfx } from "../utils/pinboard-vfx.js";
import { buildTestLayers } from "../utils/dev-game-helpers.js";
import { CurrencyHud } from "../components/currency-hud.js";
import { ScoreHud } from "../components/score-hud.js";
import { PinboardProgress } from "../components/pinboard-progress.js";
import { SlotMachineHud } from "../components/slot-machine.js";
import { SlotMachine } from "../entities/slot-machine.js";
import { getUnlockedUpgradeTypes } from "../utils/upgrade-pool.js";
import { rarityForUpgrade } from "../configs/slot-machine-defs.js";
import { createPeg, PEG_TYPES } from "../entities/peg-factory.js";
import {
  ScoreState,
  levelObjective,
  gateMultiplier,
} from "../utils/score-state.js";

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
  /** @type {HTMLElement | null} */ #ballLayerEl = null;

  /* --- Cannon --- */
  /** @type {Cannon} */ #cannon = new Cannon();
  /** @type {number} Total balls loaded this level (for HUD). */ #cannonTotal = 0;
  /** @type {HTMLElement | null} */ #cannonEl = null;
  /** @type {HTMLElement | null} */ #barrelEl = null;
  /** @type {HTMLElement | null} */ #cannonCountEl = null;
  /** @type {HTMLElement | null} */ #trajEl = null;
  /** @type {HTMLElement[]} pooled trajectory dot nodes */ #trajDots = [];
  /** @type {boolean} */ #aiming = false;
  /** @type {number | null} */ #aimRaf = null;
  /** @type {{ x: number, y: number } | null} */ #aimTarget = null;

  /* --- Game state --- */
  /** @type {number} */ #levelId = 1;
  /** @type {ScoreState} */ #score = new ScoreState();
  /** @type {number} Target score to clear this level. */ #objective = 0;
  /** @type {import('../entities/layer.js').Layer[]} */ #layers = [];
  /** @type {Map<number, HTMLElement>} */ #layerEls = new Map();
  /** @type {Map<number, HTMLElement>} */ #pegEls = new Map();
  /** @type {Map<number, { ball: Ball, el: HTMLElement }>} */ #balls =
    new Map();
  /** @type {Map<number, { x: number, y: number, since: number }>} */ #ballIdleTracker =
    new Map();
  /** @type {Map<number, number>} ball id → last fire-trail spawn timestamp */ #fireTrailTs =
    new Map();
  /** @type {Map<number, () => void>} ball id → spark-web unmount for electrified effect */ #elecSparkUnmounts =
    new Map();
  /** @type {number} */ #pinboardWidth = 0;
  /** @type {number} */ #pinboardHeight = 0;
  /** @type {boolean} */ #ended = false;
  /** @type {number | null} */ #rafId = null;
  /** @type {number} */ #lastTs = 0;

  /* --- Extended physics --- */
  /** @type {number} */ #pinboardOffsetTop = 0;
  /** @type {number} */ #gateZoneHeight = 0;
  /** @type {{ left: number, right: number }[]} */ #gateWalls = [];

  /** @type {import('../components/modal-base.js').BaseModal | null} */ #overModal =
    null;
  /** @type {SlowFloatBackground | null} */ #bg = null;

  /* --- Peg Save System --- */
  /** @type {PegSaveSystem} */
  #pegSave = new PegSaveSystem();
  /** @type {HTMLElement | null} */ #saveComboHudEl = null;

  /* --- Currency HUD (coins + diamonds, bottom-left) --- */
  /** @type {CurrencyHud | null} */ #currencyHud = null;

  /* --- Score HUD (live hit score × multiplier) --- */
  /** @type {ScoreHud | null} */ #scoreHud = null;
  /** @type {boolean} True while leftover balls are being converted to mult. */ #converting = false;

  /* --- Pinboard background objective progress --- */
  /** @type {PinboardProgress | null} */ #progress = null;

  /* --- Slot machine (peg-upgrade drum) --- */
  /** @type {SlotMachine} */ #slotMachine = new SlotMachine();
  /** @type {SlotMachineHud | null} */ #slotHud = null;
  /** @type {number} timestamp of the last score change (for the dim window) */ #lastScoreChangeTs = 0;
  /** @type {(() => void) | null} pending slot-dim re-evaluation timer */ #slotDimRecheck =
    null;

  /* --- Pinboard VFX --- */
  /** @type {PinboardVfx | null} */ #vfx = null;

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

    /* One cannon, loaded with one ball per level: level 1 → 1 ball, level 2 →
       2, … capped at CANNON.BALLS_MAX. The player aims and fires one ball per
       shot, re-aiming between shots. */
    this.#cannonTotal = ballsForLevel(this.#levelId);
    this.#cannon = new Cannon({ balls: this.#cannonTotal });

    /* Score mode: fresh counters + this level's target score. A malus can
       double the objective for the pinboard (OBJECTIVE_MULTIPLIER). */
    this.#score = new ScoreState();
    this.#objective = Math.round(
      levelObjective(this.#levelId) *
        bonusManager.resolve(PARAM_KEYS.OBJECTIVE_MULTIPLIER, 1),
    );

    this.#buildDom();
    this.#measure();

    this.#vfx = new PinboardVfx({
      stackEl: this.#stackEl,
      ballLayerEl: this.#ballLayerEl,
      safeEl: this.#safeEl,
      getPinboardOffsetTop: () => this.#pinboardOffsetTop,
      bag: this.#bag,
    });

    /* Coins + diamonds read-out, bottom-left, next to the ranking button. The
       available-ball count lives on the cannon counter, not in a HUD pill. */
    this.#currencyHud = new CurrencyHud();
    this.#currencyHud.mount(this.#safeEl);

    /* Live hit-score × multiplier readout, top-center. The objective is not
       shown here — it lives on the background progress bar below. */
    this.#scoreHud = new ScoreHud();
    this.#scoreHud.mount(this.#safeEl);

    /* Background objective progress — lives inside the pinboard, behind the
       pegs and balls, filling like a bar as the live score climbs. Carries the
       objective read-out on its horizon line. */
    if (this.#pinboardEl) {
      this.#progress = new PinboardProgress();
      this.#progress.mount(this.#pinboardEl);
      this.#progress.setLevelInfo(this.#levelId, TOTAL_LEVELS);
      this.#progress.setObjective(this.#objective);
      /* During play the bar tracks raw hits; multipliers grow it at the end. */
      this.#progress.setScore(this.#score.hitScore);
    }

    /* Slot machine — the peg-upgrade drum, centered in the band below the
       score HUD and above the objective line. Fresh reels + reset re-spin
       cost each level; the opening spin is free. */
    if (this.#pinboardEl) {
      const reelCount =
        SLOT_MACHINE.REEL_COUNT_DEFAULT +
        abilityManager.resolve(PARAM_KEYS.SLOT_REEL_BONUS, 0);
      const rerollDiscount = abilityManager.resolve(
        PARAM_KEYS.SLOT_REROLL_DISCOUNT,
        1,
      );
      this.#slotMachine = new SlotMachine({ reelCount, rerollDiscount });
      this.#slotMachine.resetRerolls();
      this.#slotHud = new SlotMachineHud({
        machine: this.#slotMachine,
        onDrop: (type, x, y) => this.#applyUpgrade(type, x, y),
        onReroll: () => this.#rerollSlots(),
        canAfford: (cost) => currencyManager.get() >= cost,
        canReroll: () =>
          !bonusManager.resolve(PARAM_KEYS.SLOT_REROLL_DISABLED, false),
      });
      this.#slotHud.mount(this.#pinboardEl);
      this.#slotMachine.spin(
        getUnlockedUpgradeTypes(),
        Math.random,
        this.#slotLuck(),
        this.#slotRoll(),
      );
      this.#slotHud.spin();
      /* Keep the re-spin button's affordability in sync with the wallet. */
      this.#bag.add(
        currencyManager.on("change", () => this.#slotHud?.refresh()),
      );
    }

    this.#bag.add(layout.onChange(() => this.#onResize()));
    this.#bag.add(i18n.onChange(() => this.#refreshLabels()));

    if (this.#data?.testPegs) {
      this.#devLoadTestPegs(this.#data.testPegs);
    } else {
      this.#loadAllLayers();
    }
    this.#setupAim();
    this.#applyRoundDirectives();
    this.#refreshCannon();
    this.#renderHudBonuses();

    /* Dev-admin spawn (kind passed as event arg). */
    this.#bag.add(
      gameEvents.on("dev:spawnBall", (kind = BALL_KINDS.CLASSIC) =>
        this.#devSpawnBall(kind),
      ),
    );

    /* Diamond pegs emit a diamonds event; route into the persistent
       diamond wallet here so the rest of the code only deals with one
       channel. */
    this.#bag.add(gameEvents.on("diamonds", (n) => diamondManager.add(n)));
  }

  destroy() {
    this.#stopLoop();
    if (this.#aimRaf !== null) cancelAnimationFrame(this.#aimRaf);
    this.#aimRaf = null;
    this.#trajDots = [];
    this.#overModal?.destroy();
    this.#overModal = null;
    this.#currencyHud?.destroy();
    this.#currencyHud = null;
    this.#scoreHud?.destroy();
    this.#scoreHud = null;
    this.#progress?.destroy();
    this.#progress = null;
    this.#slotHud?.destroy();
    this.#slotHud = null;
    this.#vfx = null;
    this.#pegSave.dispose();
    this.#saveComboHudEl?.remove();
    this.#saveComboHudEl = null;
    for (const unmount of this.#elecSparkUnmounts.values()) unmount();
    this.#elecSparkUnmounts.clear();
    this.#bag.dispose();
    this.#balls.clear();
    this.#ballIdleTracker.clear();
    this.#fireTrailTs.clear();
    this.#pegEls.clear();
    this.#layerEls.clear();
    this.#layers = [];
  }

  /* ──────────────────────────────────────────────────────────────────────
     DOM
     ────────────────────────────────────────────────────────────────────── */

  #buildDom() {
    this.#root.classList.add("gt-game");
    this.#bg = new SlowFloatBackground(this.#root);
    this.#bag.add(() => this.#bg?.destroy());

    const safe = document.createElement("div");
    safe.className = "gt-game-safe";

    const gateLabels = {
      x1_left: i18n.t("game.gate.x1"),
      x2_left: i18n.t("game.gate.x2"),
      return: i18n.t("game.gate.return"),
      x2_right: i18n.t("game.gate.x2"),
      x1_right: i18n.t("game.gate.x1"),
    };

    safe.innerHTML = `
      <div class="pk-board-card">
        <div class="pk-pinboard" data-role="pinboard">
          <div class="pk-hud-bonuses" data-role="hud-bonuses"></div>
          <div class="pk-stack" data-role="stack"></div>
          <div class="pk-traj" data-role="traj"></div>
          <div class="pk-cannon" data-role="cannon">
            <div class="pk-cannon-barrel" data-role="barrel"></div>
            <div class="pk-cannon-base"></div>
            <div class="pk-cannon-count" data-role="cannon-count">0</div>
          </div>
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
    this.#trajEl = safe.querySelector('[data-role="traj"]');
    this.#cannonEl = safe.querySelector('[data-role="cannon"]');
    this.#barrelEl = safe.querySelector('[data-role="barrel"]');
    this.#cannonCountEl = safe.querySelector('[data-role="cannon-count"]');

    this.#bag.on(safe, "pointerdown", this.#onPointer);
  }

  #onPointer = (event) => {
    const target = /** @type {HTMLElement} */ (event.target);

    /* Slot machine owns its own drag gesture — never aim the cannon from a
       press that started on a reel or the re-spin button. */
    if (target.closest(".pk-slot-machine")) return;

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

    /* Otherwise: aim the cannon. The pointer must land inside the pinboard
       and the cannon must still hold balls. */
    if (this.#ended || this.#cannon.isEmpty) return;
    if (!this.#pinboardEl || !this.#pinboardEl.contains(target)) return;
    this.#beginAim(event);
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
    this.#positionCannon();
  }

  /** Anchor the cannon pivot at the top-center of the pinboard. */
  #positionCannon() {
    this.#cannon.pivotX = this.#pinboardWidth / 2;
    this.#cannon.pivotY = CANNON.PIVOT_OFFSET_TOP;
    if (this.#cannonEl) {
      this.#cannonEl.style.left = `${this.#cannon.pivotX}px`;
      this.#cannonEl.style.top = `${this.#cannon.pivotY}px`;
    }
  }

  /**
   * Resolve the active collection-gate widths. Reductions come from
   * direct-effect GATE abilities (diamonds) layered on top of any bonus
   * modifier, so both sources compose.
   * @returns {Record<string, number>}
   */
  #resolveGateWidths() {
    return computeGateWidths({
      backReduction: abilityManager.resolve(
        PARAM_KEYS.GATE_BACK_WIDTH_REDUCTION,
        bonusManager.resolve(PARAM_KEYS.GATE_BACK_WIDTH_REDUCTION, 0),
      ),
      hpReduction: abilityManager.resolve(
        PARAM_KEYS.GATE_HP_WIDTH_REDUCTION,
        bonusManager.resolve(PARAM_KEYS.GATE_HP_WIDTH_REDUCTION, 0),
      ),
    });
  }

  #computeGateWalls() {
    const w = this.#pinboardWidth;
    const widths = this.#resolveGateWidths();
    this.#gateWalls = gateBounds(widths, w);
    this.#applyGateFlex(widths);
  }

  #applyGateFlex(widths) {
    if (!this.#safeEl) return;
    for (const g of PLINKO.GATE_ORDER) {
      const el = this.#safeEl.querySelector(`.pk-gate--${g}`);
      if (el) el.style.setProperty("--pk-gate-flex", String(widths[g]));
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
    this.#updateProgressGeometry();
  }

  /**
   * Feed the background progress its geometry and place the score HUD midway
   * between the cannon and the objective line. The horizon line sits 50 px
   * above the top peg row (the last, highest layer), clamped so it stays
   * on-board even with a tall stack.
   */
  #updateProgressGeometry() {
    const h = this.#pinboardHeight;
    const topPegY =
      this.#layers.length > 0
        ? h - this.#layers.length * PLINKO.LAYER_HEIGHT
        : h * 0.15;
    const lineY = Math.max(14, topPegY - PLINKO.PROGRESS_LINE_MARGIN);
    this.#progress?.setGeometry({ height: h, lineY });

    /* Vertical stack (pinboard-local y): cannon → score → slot machine →
       objective line. The machine sits in the upper band, well above the line;
       the score HUD is centered between the cannon and the machine. Score is
       expressed in safe-zone coords (pinboard offset + local y); the machine
       top is a pinboard-local y. */
    const cannonLocalY = CANNON.PIVOT_OFFSET_TOP;
    const machineTop = Math.min(
      lineY - 46,
      cannonLocalY + Math.max(150, (lineY - cannonLocalY) * 0.42),
    );
    this.#slotHud?.setGeometry({ top: machineTop });
    const scoreLocalY = (cannonLocalY + machineTop) / 2;
    this.#scoreHud?.setVerticalCenter(this.#pinboardOffsetTop + scoreLocalY);
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
      p.classList.add(
        peg.shieldActive ? "pk-peg--shield-active" : "pk-peg--shield-down",
      );
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
     Cannon — aim & fire
     ────────────────────────────────────────────────────────────────────── */

  /** Wire pointer move/up so a drag started on the board keeps aiming even
      when it wanders off, and any release fires. */
  #setupAim() {
    this.#bag.on(window, "pointermove", this.#onAimMove);
    this.#bag.on(window, "pointerup", this.#onAimEnd);
    this.#bag.on(window, "pointercancel", this.#onAimCancel);
  }

  /** Convert a pointer event to pinboard-space coordinates. */
  #pointerToPinboard(event) {
    const rect = this.#pinboardEl?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  /** @param {PointerEvent} event */
  #beginAim(event) {
    this.#aiming = true;
    this.#aimTarget = this.#pointerToPinboard(event);
    this.#cannonEl?.setAttribute("data-aiming", "true");
    /* Aiming: dim the score HUD and fade the slot machine into the background
       so neither obstructs the shot. */
    this.#scoreHud?.dim();
    this.#refreshSlotDim();
    /* Apply the angle synchronously so an instant tap (no move) still fires
       toward the tap point; defer only the heavier trajectory sim to a rAF. */
    this.#applyAim();
    this.#scheduleTrajectory();
  }

  #onAimMove = (event) => {
    if (!this.#aiming) return;
    this.#aimTarget = this.#pointerToPinboard(event);
    this.#applyAim();
    this.#scheduleTrajectory();
  };

  #onAimEnd = () => {
    if (!this.#aiming) return;
    this.#aiming = false;
    this.#cannonEl?.removeAttribute("data-aiming");
    this.#cancelAimRaf();
    this.#fireCannon();
    /* After the shot: the just-spawned ball keeps the machine faded. */
    this.#refreshSlotDim();
  };

  #onAimCancel = () => {
    if (!this.#aiming) return;
    this.#aiming = false;
    this.#aimTarget = null;
    this.#cannonEl?.removeAttribute("data-aiming");
    this.#refreshSlotDim();
    this.#cancelAimRaf();
    this.#clearTrajectory();
  };

  /** Point the barrel at the current aim target (cheap, runs synchronously). */
  #applyAim() {
    if (!this.#aimTarget) return;
    this.#cannon.aimAt(this.#aimTarget.x, this.#aimTarget.y);
    this.#renderCannonAngle();
  }

  /** Throttle the trajectory simulation to one run per animation frame. */
  #scheduleTrajectory() {
    if (this.#aimRaf !== null) return;
    this.#aimRaf = requestAnimationFrame(() => {
      this.#aimRaf = null;
      if (!this.#aiming) return;
      this.#renderTrajectory();
    });
  }

  #cancelAimRaf() {
    if (this.#aimRaf !== null) {
      cancelAnimationFrame(this.#aimRaf);
      this.#aimRaf = null;
    }
  }

  /** Fire a single ball along the current aim, consuming one cannon ball. */
  #fireCannon() {
    this.#clearTrajectory();
    if (this.#ended || !this.#ballLayerEl) return;
    if (!this.#cannon.pop()) return;

    const { x, y } = this.#cannon.muzzle;
    const { vx, vy } = this.#cannon.launchVelocity();
    const ball = new Ball({ x, y, vx, vy });
    ball.state = "active";
    const el = this.#createBallEl(ball);
    const oy = this.#pinboardOffsetTop;
    el.style.transform = `translate(${ball.x}px, ${ball.y + oy}px)`;
    this.#ballLayerEl.appendChild(el);
    this.#balls.set(ball.id, { ball, el });
    this.#updateBallEl(ball);

    audioManager.playSfx("click");
    this.#cannonEl?.setAttribute("data-firing", "true");
    this.#bag.timeout(
      () => this.#cannonEl?.removeAttribute("data-firing"),
      260,
    );
    this.#emitReceptacleParticles(this.#barrelEl);

    /* Misfire malus: a chance the ball detonates at the muzzle before it can
       touch any peg. The shot is still consumed. The ball is removed from the
       simulation, then the loop below still runs so end-of-round is detected
       even when this was the last shot. */
    const misfire = bonusManager.resolve(PARAM_KEYS.CANNON_MISFIRE_CHANCE, 0);
    if (misfire > 0 && Math.random() < misfire) {
      this.#destroyBall(ball, { reason: "misfire" });
      this.#popHtml(iconSvg("flame"), ball.x, ball.y, "pk-popup");
    }

    this.#refreshCannon();
    this.#startLoop();
  }

  /** Sync the cannon's ball counter and empty state to the DOM. */
  #refreshCannon() {
    if (this.#cannonCountEl) {
      this.#cannonCountEl.textContent = String(this.#cannon.ballsRemaining);
    }
    this.#cannonEl?.toggleAttribute("data-empty", this.#cannon.isEmpty);
    this.#renderCannonAngle();
  }

  /** Rotate the barrel to the current aim angle (0° = pointing down).
      Screen y points down, so a CSS rotation is the negative of the aim angle
      for the barrel tip to follow the launch-velocity vector. */
  #renderCannonAngle() {
    if (this.#barrelEl) {
      this.#barrelEl.style.transform = `rotate(${(-this.#cannon.degrees).toFixed(2)}deg)`;
    }
  }

  /* --- Trajectory preview (dashed, up to CANNON.TRAJ_BOUNCES bounces) --- */

  /** Build the peg list (positions + radii + restitution) for the preview. */
  #trajectoryPegs() {
    const pegs = [];
    for (const layer of this.#layers) {
      for (const peg of layer.pegs) {
        if (peg.alive === false) continue;
        /* Shield pegs deflect at their shield radius when active. */
        const radius =
          peg.type === "shield" && peg.shieldActive
            ? peg.shieldRadius
            : peg.radius;
        pegs.push({
          id: peg.id,
          x: peg.x,
          y: peg.y,
          radius,
          restitution: peg.restitution,
        });
      }
    }
    return pegs;
  }

  /** Simulate the current aim and paint the dashed preview dots. */
  #renderTrajectory() {
    if (!this.#trajEl || this.#cannon.isEmpty) {
      this.#clearTrajectory();
      return;
    }
    const { x, y } = this.#cannon.muzzle;
    const { vx, vy } = this.#cannon.launchVelocity();
    const { points } = simulateTrajectory({
      x,
      y,
      vx,
      vy,
      width: this.#pinboardWidth,
      height: this.#pinboardHeight,
      gravity: PLINKO.GRAVITY,
      ballRadius: PLINKO.BALL_RADIUS,
      wallRestitution: PLINKO.WALL_RESTITUTION,
      pegs: this.#trajectoryPegs(),
      maxBounces: CANNON.TRAJ_BOUNCES,
      maxSteps: CANNON.TRAJ_MAX_STEPS,
      dt: CANNON.TRAJ_DT,
      sampleSpacing: CANNON.TRAJ_DOT_SPACING,
    });
    this.#paintTrajectory(points);
  }

  /**
   * Reconcile the pooled dot nodes with the sampled points. Skips the first
   * point (inside the muzzle) and caps at CANNON.TRAJ_MAX_DOTS.
   * @param {Array<{ x: number, y: number }>} points
   */
  #paintTrajectory(points) {
    if (!this.#trajEl) return;
    const shown = Math.min(points.length - 1, CANNON.TRAJ_MAX_DOTS);
    for (let i = 0; i < shown; i++) {
      const p = points[i + 1];
      let dot = this.#trajDots[i];
      if (!dot) {
        dot = document.createElement("div");
        dot.className = "pk-traj-dot";
        this.#trajEl.appendChild(dot);
        this.#trajDots[i] = dot;
      }
      dot.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
      /* Dots fade out along the line so the aim reads directionally. */
      dot.style.opacity = String(Math.max(0.15, 1 - i / (shown || 1)));
      dot.hidden = false;
    }
    for (let i = shown; i < this.#trajDots.length; i++) {
      this.#trajDots[i].hidden = true;
    }
  }

  /** Hide every trajectory dot. */
  #clearTrajectory() {
    for (const dot of this.#trajDots) dot.hidden = true;
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
      if (ball.state === "active") return true;
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
    /* Keep the slot machine faded while balls are still moving; it reappears
       once the board settles (and the score-grace window elapses). */
    this.#refreshSlotDim();
  }

  /** Tick active effects on every ball (DoT damage, expiry). */
  #tickBallEffects() {
    const now = performance.now();
    for (const entry of this.#balls.values()) {
      const ball = entry.ball;
      if (!ball.alive) continue;
      const dead = ball.tickEffects(now);
      for (const evt of ball.dotEvents) {
        if (evt.id === "burning") this.#popBurningDot(ball, evt.damage);
      }
      if (dead) {
        this.#updateBallEl(ball);
        this.#destroyBall(ball, { reason: "effect" });
      } else {
        this.#syncBallEffectClasses(ball);
      }
    }
  }

  /** Pop a fire damage label anchored to the burning ball element so it follows the ball. */
  #popBurningDot(ball, damage) {
    const entry = this.#balls.get(ball.id);
    if (!entry?.el) return;
    const label = document.createElement("div");
    label.className = "pk-ball-fire-dmg";
    label.textContent = `-${damage}`;
    entry.el.appendChild(label);
    this.#bag.timeout(() => label.remove(), 950);
  }

  /** Sync CSS effect classes on the ball element. */
  #syncBallEffectClasses(ball) {
    const entry = this.#balls.get(ball.id);
    if (!entry?.el) return;
    const el = entry.el;
    const active = ball.getActiveEffectIds();
    const isElectrified = active.includes("electrified");
    for (const cls of [
      "pk-ball--on-fire",
      "pk-ball--frozen",
      "pk-ball--electrified",
    ]) {
      el.classList.remove(cls);
    }
    for (const id of active) {
      if (id === "burning") el.classList.add("pk-ball--on-fire");
      else if (id === "frozen") el.classList.add("pk-ball--frozen");
      else if (id === "electrified") el.classList.add("pk-ball--electrified");
    }
    if (isElectrified && !this.#elecSparkUnmounts.has(ball.id)) {
      this.#elecSparkUnmounts.set(
        ball.id,
        mountSparkWeb(el, { radius: 9, padding: 12 }),
      );
    } else if (!isElectrified) {
      this.#elecSparkUnmounts.get(ball.id)?.();
      this.#elecSparkUnmounts.delete(ball.id);
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

      ball.vy += gravity * dt * ball.getGravityMultiplier();
      const v = clampVelocity(ball.vx, ball.vy, maxV);
      ball.vx = v.vx;
      ball.vy = v.vy;
      /* Apply speed multiplier from active effects (e.g. ice halves speed). */
      const speedMult = ball.getSpeedMultiplier();
      ball.x += ball.vx * dt * speedMult;
      ball.y += ball.vy * dt * speedMult;

      if (ball.state === "captured") {
        const gateIdx = PLINKO.GATE_ORDER.indexOf(ball.gateId);
        const walls = this.#gateWalls[gateIdx];
        if (walls) {
          if (ball.x - r < walls.left) {
            ball.x = walls.left + r;
            ball.vx = Math.abs(ball.vx) * wallR;
          } else if (ball.x + r > walls.right) {
            ball.x = walls.right - r;
            ball.vx = -Math.abs(ball.vx) * wallR;
          }
        }
        if (ball.y + r > gateFloor) {
          ball.y = gateFloor - r;
          ball.vy = -Math.abs(ball.vy) * 0.3;
          ball.vx *= PLINKO.FLOOR_FRICTION;
        }
        if (ball.y < bottomY) {
          ball.y = bottomY;
          ball.vy = Math.abs(ball.vy) * wallR;
        }
      } else {
        if (ball.x - r < 0) {
          ball.x = r;
          ball.vx = Math.abs(ball.vx) * wallR;
        } else if (ball.x + r > w) {
          ball.x = w - r;
          ball.vx = -Math.abs(ball.vx) * wallR;
        }
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

    /* Electric attraction: each electrified active ball pulls nearby active
       balls toward it with linear force falloff from the edge to the center. */
    const attractR = PLINKO.ELEC_ATTRACT_RADIUS;
    const attractR2 = attractR * attractR;
    for (const eBall of activeBalls) {
      if (!eBall.effects.has("electrified") || eBall.state !== "active")
        continue;
      for (const other of activeBalls) {
        if (other === eBall || other.state !== "active") continue;
        const dx = eBall.x - other.x;
        const dy = eBall.y - other.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 <= 0 || dist2 > attractR2) continue;
        const dist = Math.sqrt(dist2);
        const strength = (1 - dist / attractR) * PLINKO.ELEC_ATTRACT_FORCE * dt;
        other.vx += (dx / dist) * strength;
        other.vy += (dy / dist) * strength;
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
          const sc = collideCircles(
            ball.x,
            ball.y,
            r,
            peg.x,
            peg.y,
            peg.shieldRadius,
          );
          if (sc) {
            ball.x += sc.nx * sc.depth;
            ball.y += sc.ny * sc.depth;
            const rv = reflect(
              ball.vx,
              ball.vy,
              sc.nx,
              sc.ny,
              PLINKO.RESTITUTION_PEG,
            );
            ball.vx = rv.vx;
            ball.vy = rv.vy;
            if (!ball.recentPegs.has(peg.id)) {
              ball.recentPegs.add(peg.id);
              this.#addHitScore(peg, ball);
              peg.hitShield();
              this.#updatePegEl(peg);
              const shieldEl = this.#pegEls.get(peg.id);
              if (shieldEl) {
                this.#flashPegEl(shieldEl);
                if (peg.shieldActive)
                  this.#showHpLabelOn(shieldEl, peg.shieldHits);
              }
              /* Shield contact also damages the ball. */
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
    /* Score: every genuine peg contact credits the peg's points to the gold
       hit counter and flies a +N chip toward it. Reward pegs award 0 and are
       skipped inside #addHitScore. Runs before any early return so even a
       bomb (which explodes on this hit) is scored in #detonateBomb instead. */
    this.#addHitScore(peg, ball);

    /* 1) Peg self-destruct with a reward directive (coin peg → coins).
          Also handles teleport, glue, elemental effects. */
    const reward = peg.consumeReward(ball);
    if (reward) {
      if (reward.coins) currencyManager.add(this.#coinReward(reward.coins));
      if (reward.diamonds) gameEvents.emit("diamonds", reward.diamonds);
      if (reward.teleport) {
        this.#emitPegTeleport(peg.x, peg.y, null);
        ball.teleportInside({
          width: this.#pinboardWidth,
          height: this.#pinboardHeight,
        });
        audioManager.playSfx("click");
        const died = peg.takeDamage(1);
        if (died) {
          this.#startPegRescue(peg, ball);
        } else {
          this.#applyHitFeedback(peg);
        }
        return;
      }
      /* Elemental peg: apply a timed effect (burning, frozen, electrified).
         Ice + burning and fire + frozen are opposites — they cancel each other
         instead of stacking. The ball returns to neutral with no effect applied. */
      if (reward.effect) {
        const cancelsFire =
          reward.effect === "frozen" && ball.effects.has("burning");
        const cancelsIce =
          reward.effect === "burning" && ball.effects.has("frozen");
        if (cancelsFire) {
          ball.effects.delete("burning");
          this.#syncBallEffectClasses(ball);
          this.#applyTriggers(TRIGGER_EVENTS.EFFECT_CANCELLED, {
            cancelled: "burning",
            by: "frozen",
            x: peg.x,
            y: peg.y,
          });
        } else if (cancelsIce) {
          ball.effects.delete("frozen");
          this.#syncBallEffectClasses(ball);
          this.#applyTriggers(TRIGGER_EVENTS.EFFECT_CANCELLED, {
            cancelled: "frozen",
            by: "burning",
            x: peg.x,
            y: peg.y,
          });
        } else {
          ball.applyEffect(reward.effect, performance.now());
          this.#popReward(reward, peg.x, peg.y);
        }
        audioManager.playSfx("click");
        const died = peg.takeDamage(1);
        if (died) {
          this.#startPegRescue(peg, ball);
        } else {
          this.#applyHitFeedback(peg);
        }
        /* Elemental contact still damages the ball. */
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
        this.#popReward(reward, peg.x, peg.y);
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
        this.#popReward(reward, peg.x, peg.y);
      } else {
        /* Reward-per-hit pegs (coin, diamond) — credit the reward then apply
           normal HP damage so they survive multiple hits. */
        audioManager.playSfx("click");
        this.#popReward(reward, peg.x, peg.y);
        const died = peg.takeDamage(1);
        if (died) {
          this.#startPegRescue(peg, ball);
        } else {
          this.#applyHitFeedback(peg);
        }
        return;
      }
    }

    audioManager.playSfx("click");

    /* 3) HP damage — one hit = one damage. Destroy if depleted. */
    const died = peg.takeDamage(1);
    if (died) {
      this.#startPegRescue(peg, ball);
      return;
    }

    /* Tremble + flash + HP label — same visual contract for every peg type. */
    this.#applyHitFeedback(peg);

    /* 4) Ball damage — every real peg contact subtracts 1 HP from the
          ball. Glue path already returned. */
    if (ball.alive) {
      const dead = ball.takeDamage(1);
      this.#updateBallEl(ball);
      if (dead) this.#destroyBall(ball, { reason: "depleted" });
    }
  }

  /** Short-lived pop whose content is trusted HTML (e.g. an inline icon). */
  #popHtml(html, x, y, cls) {
    this.#vfx?.popHtml(html, x, y, cls);
  }

  /**
   * Pop a reward label: uses the rich floating-text effect when the reward
   * provides HTML + color (coin, diamond), or falls back to the plain
   * popup text for other reward types.
   * @param {{ popHtml?: string, popColor?: string, popText?: string, popClass?: string }} reward
   * @param {number} x
   * @param {number} y
   */
  #popReward(reward, x, y) {
    if (reward.popHtml) {
      if (reward.mystery) {
        this.#vfx?.popMysteryFloatingText(reward.popHtml, x, y);
      } else if (reward.chest) {
        this.#vfx?.popChestFloatingText(reward.popHtml, x, y, reward.popColor);
      } else if (reward.popClass) {
        this.#vfx?.popHtml(reward.popHtml, x, y, reward.popClass);
      } else {
        this.#vfx?.popFloatingText(reward.popHtml, x, y, reward.popColor);
      }
    } else if (reward.popText) {
      this.#vfx?.popText(reward.popText, x, y, reward.popClass ?? "pk-popup");
    }
  }

  #popMultiplier(delta, x, y) {
    this.#vfx?.popMultiplier(delta, x, y);
  }

  /* ──────────────────────────────────────────────────────────────────────
     Bottom / gates
     ────────────────────────────────────────────────────────────────────── */

  /** @param {Ball} ball */
  #handleBottom(ball) {
    const w = this.#pinboardWidth || 1;
    const fx = ball.x / w;
    const widths = this.#resolveGateWidths();
    const gate = gateAt(fx, widths);
    this.#flashGate(gate);

    const maxRecycles =
      PLINKO.MAX_RECYCLES +
      bonusManager.resolve(PARAM_KEYS.TELEPORT_RECYCLE_MAX_BONUS, 0);

    /* Central return gate: send the ball back to the top of the pinboard so
       it can rack up more hits. Capped by MAX_RECYCLES. No multiplier. */
    if (gate === "return" && ball.recycles < maxRecycles) {
      ball.recycles += 1;
      const oldX = ball.x;
      const oldY = ball.y;
      ball.x = w / 2 + (Math.random() - 0.5) * 14;
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

    /* Scoring gate (x1 → +1, x2 → +2) — or a return gate with no recycles
       left (delta 0). The GATE_MULT_FACTOR ability (gate_5) doubles every
       gate's contribution. Capture the ball and raise the blue multiplier. */
    const delta =
      gateMultiplier(gate) *
      abilityManager.resolve(PARAM_KEYS.GATE_MULT_FACTOR, 1);
    if (delta > 0) {
      this.#score.addMultiplier(delta);
      this.#scoreHud?.setMultiplier(this.#score.multiplier);
      /* Multipliers do not move the bar during play — they apply at the end. */
      this.#popMultiplier(delta, ball.x, this.#pinboardHeight);
    }
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

  #emitPegTeleport(bx, by, ballEl) {
    this.#vfx?.emitPegTeleport(bx, by, ballEl);
  }

  #flashGate(name) {
    this.#vfx?.flashGate(name);
  }

  /**
   * Credit a peg's points to the gold hit counter and fly a +N chip toward
   * the score HUD. No-op for reward pegs (0 points).
   * @param {import('../entities/peg-classic.js').Peg} peg
   */
  #addHitScore(peg, ball) {
    /* Bombs are scored per explosion in #detonateBomb (so taps and chain
       reactions also bank the points), not on the raw contact here. */
    if (peg.type === "bomb") return;
    const points = this.#effectAdjustedPoints(peg.points, ball);
    this.#creditPoints(points, peg.x, peg.y, peg.type);
  }

  /**
   * Adjust a peg's base points by the hitting ball's active effects.
   * Additive bonuses (fire +5, ice +10) are summed, then multiplicative
   * factors (electrical ×2) are applied — see EFFECT_HIT_SCORE.
   * @param {number} base
   * @param {import('../entities/ball-classic.js').Ball} [ball]
   * @returns {number}
   */
  #effectAdjustedPoints(base, ball) {
    if (!ball) return base;
    return adjustHitScore(base, ball.effects.keys());
  }

  /**
   * Credit `points` to the gold hit counter and fly a +N chip toward it.
   * The gold total only ticks up once the flying chip merges in, so the
   * player first reads the +N at the source (see PinboardVfx.flyPointsToScore).
   * The score model is credited immediately — the HUD update is display-only
   * and always reflects the live cumulative total on arrival.
   * @param {number} points
   * @param {number} x — pinboard-space x
   * @param {number} y — pinboard-space y
   * @param {string} type — peg type driving the chip's colour/typography
   */
  #creditPoints(points, x, y, type) {
    if (points <= 0) return;
    this.#score.addHit(points);
    this.#markScoreActivity();
    const applyScore = () => {
      this.#scoreHud?.setHitScore(this.#score.hitScore);
      this.#progress?.setScore(this.#score.hitScore);
    };
    if (this.#vfx) {
      this.#vfx.flyPointsToScore(
        points,
        x,
        y,
        this.#scoreHud?.hitsEl ?? null,
        type,
        applyScore,
      );
    } else {
      applyScore();
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
    const el = this.#pegEls.get(peg.id);
    this.#pegEls.delete(peg.id);
    for (const layer of this.#layers) {
      const idx = layer.pegs.indexOf(peg);
      if (idx !== -1) {
        layer.pegs.splice(idx, 1);
        break;
      }
    }
    /* Implode animation: ring shrinks to centre then element is removed.
       When the rescue-window early-implode already ran (dataset flag set),
       the animation has already played — just remove the node outright. */
    if (el) {
      if (el.dataset.pkImploding) {
        el.remove();
      } else if (this.#vfx) {
        this.#vfx.implodePeg(el);
      } else {
        el.remove();
      }
    }
    if (ball) {
      ball.vx = (Math.random() - 0.5) * 150;
      ball.vy = Math.max(ball.vy, 80);
      ball.recentPegs.clear();
    }
    this.#ballIdleTracker.delete(ball?.id);
    this.#applyTriggers(TRIGGER_EVENTS.PEG_DESTROYED, {
      x: peg.x,
      y: peg.y,
      type: peg.type,
    });
  }

  /**
   * Remove a peg's DOM element and splice it out of its layer.
   * @param {import('../entities/peg-classic.js').Peg} peg
   */
  #removePegEl(peg) {
    const el = this.#pegEls.get(peg.id);
    this.#pegEls.delete(peg.id);
    for (const layer of this.#layers) {
      const idx = layer.pegs.indexOf(peg);
      if (idx !== -1) {
        layer.pegs.splice(idx, 1);
        break;
      }
    }
    if (el) {
      if (this.#vfx) {
        this.#vfx.implodePeg(el);
      } else {
        el.remove();
      }
    }
  }

  /* ──────────────────────────────────────────────────────────────────────
     Slot machine — apply upgrade / re-spin
     ────────────────────────────────────────────────────────────────────── */

  /**
   * Drop handler for the slot machine: turn the classic peg under the pointer
   * into `type`. Only classic pegs accept an upgrade (mirrors the old radial
   * replace). Free — the roll itself is the cost. Returns true when a peg was
   * upgraded so the HUD can empty the source reel.
   * @param {string} type @param {number} clientX @param {number} clientY
   * @returns {boolean}
   */
  #applyUpgrade(type, clientX, clientY) {
    if (this.#ended || !this.#pinboardEl) return false;
    const rect = this.#pinboardEl.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const hitRadius = PLINKO.PEG_RADIUS * 2.5;
    let target = null;
    let targetLayer = null;
    let best = hitRadius * hitRadius;
    for (const layer of this.#layers) {
      for (const peg of layer.pegs) {
        if (peg.type !== PEG_TYPES.CLASSIC) continue;
        const dx = px - peg.x;
        const dy = py - peg.y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= best) {
          best = d2;
          target = peg;
          targetLayer = layer;
        }
      }
    }
    if (!target || !targetLayer) return false;
    this.#upgradePeg(target, targetLayer, type);
    return true;
  }

  /**
   * Swap `oldPeg` for a fresh peg of `type` in the same slot, rebuild its DOM
   * element and persist the board. Reuses the peg factory + `#createPegEl`.
   * @param {import('../entities/peg-classic.js').Peg} oldPeg
   * @param {import('../entities/layer.js').Layer} layer
   * @param {string} type
   */
  #upgradePeg(oldPeg, layer, type) {
    const idx = layer.pegs.indexOf(oldPeg);
    if (idx === -1) return;
    const newPeg = createPeg(type, {
      x: oldPeg.x,
      y: oldPeg.y,
      slot: oldPeg.slot,
    });
    layer.pegs[idx] = newPeg;

    const oldEl = this.#pegEls.get(oldPeg.id);
    this.#pegEls.delete(oldPeg.id);
    oldEl?.__pkSparkUnmount?.();
    oldEl?.remove();

    const layerEl = this.#layerEls.get(layer.id);
    const newEl = this.#createPegEl(newPeg);
    this.#pegEls.set(newPeg.id, newEl);
    layerEl?.appendChild(newEl);
    this.#flashPegEl(newEl);

    this.#persistPinboard();
    audioManager.playSfx("click");
  }

  /**
   * Re-spin handler for the slot machine: pay the exponential re-spin cost and
   * re-roll **every** reel (kept upgrades included). Returns true when the
   * re-spin happened.
   * @returns {boolean}
   */
  #rerollSlots() {
    if (bonusManager.resolve(PARAM_KEYS.SLOT_REROLL_DISABLED, false)) {
      return false;
    }
    const cost = this.#slotMachine.rerollCost();
    if (!currencyManager.spend(cost)) return false;
    this.#slotMachine.spin(
      getUnlockedUpgradeTypes(),
      Math.random,
      this.#slotLuck(),
      this.#slotRoll(),
    );
    this.#slotMachine.noteReroll();
    return true;
  }

  /**
   * Lucky-reel spin options driven by the `SLOT_LUCKY_REEL_CHANCE` reward: with
   * that probability a reel rolls from the peg types **not yet bought in the
   * boutique this run** instead of the normal pool.
   * @returns {{ pool?: string[], chance?: number }}
   */
  #slotLuck() {
    const chance = bonusManager.resolve(PARAM_KEYS.SLOT_LUCKY_REEL_CHANCE, 0);
    if (chance <= 0) return {};
    const acquired = new Set(pegShopManager.getAcquired());
    const pool = PEG_SHOP_DEFS.map((d) => d.type).filter(
      (t) => !acquired.has(t),
    );
    return pool.length ? { pool, chance } : {};
  }

  /**
   * Rarity roll options for a slot spin: weight every reel by the peg's
   * intrinsic rarity, and — when the `SLOT_FORCE_COMMON` malus is active — pin
   * every reel to common (the per-reel rarity "cheat").
   * @returns {import('../entities/slot-machine.js').SlotRoll}
   */
  #slotRoll() {
    const forceCommon = bonusManager.resolve(
      PARAM_KEYS.SLOT_FORCE_COMMON,
      false,
    );
    return {
      rarityOf: rarityForUpgrade,
      weights: RARITY_WEIGHTS,
      reelRarity: forceCommon ? () => RARITY.COMMON : undefined,
    };
  }

  /**
   * Apply the run's coin multiplier reward to a raw coin reward.
   * @param {number} coins
   * @returns {number}
   */
  #coinReward(coins) {
    return Math.round(
      coins * bonusManager.resolve(PARAM_KEYS.DESTROY_COIN_MULTIPLIER, 1),
    );
  }

  /** Note that the score just moved, then re-evaluate the slot-machine fade. */
  #markScoreActivity() {
    this.#lastScoreChangeTs = performance.now();
    this.#refreshSlotDim();
  }

  /**
   * Keep the slot machine faded into the background while the board is
   * "busy" — the player is aiming, a ball is still in motion, or the score is
   * still climbing (within a short grace window). It reappears only when none
   * of these hold. A one-shot re-check covers the case where the score window
   * is the last thing keeping it dimmed.
   */
  #refreshSlotDim() {
    if (!this.#slotHud) return;
    const now = performance.now();
    const scoreActive =
      now - this.#lastScoreChangeTs < SLOT_MACHINE.DIM_SCORE_IDLE_MS;
    const ballsMoving = this.#hasSimulatedBalls();
    this.#slotHud.setDimmed(this.#aiming || ballsMoving || scoreActive);

    this.#slotDimRecheck?.();
    this.#slotDimRecheck = null;
    /* If only the score window is holding it dimmed, schedule the reappearance. */
    if (scoreActive && !this.#aiming && !ballsMoving) {
      this.#slotDimRecheck = this.#bag.timeout(() => {
        this.#slotDimRecheck = null;
        this.#refreshSlotDim();
      }, SLOT_MACHINE.DIM_SCORE_IDLE_MS);
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

    /* Reward pegs (chest, coin, diamond, mystery) self-consume on death and
       cannot be rescued — reviving them would let them be milked. */
    if (
      peg.type === "chest" ||
      peg.type === "coin" ||
      peg.type === "diamond" ||
      peg.type === "mystery"
    ) {
      const deathReward = peg.onDestroyed(ball);
      if (deathReward) this.#applyDestroyReward(deathReward, peg);
      this.#destroyPeg(peg, ball);
      return;
    }

    /* Visual: mark peg as rescuable (triggers CSS ring + pulse). */
    el.classList.remove("pk-tremble", "pk-flash");
    el.classList.add("pk-peg--rescuable");

    /* Trigger the peg implosion exactly when the rescue ring (scale 3→0 over
       RESCUE_DURATION_MS) reaches scale 1 — i.e. at 2/3 of the duration.
       We mark the element with a dataset flag so that #destroyPeg knows the
       animation already ran and should just remove the node. */
    const implodeAt = Math.round((PEG_SAVE.RESCUE_DURATION_MS * 2) / 3);
    this.#bag.timeout(() => {
      /* Guard: player may have tapped to save before this fires. */
      if (!this.#pegSave.isRescuable(peg.id)) return;
      const pegEl = this.#pegEls.get(peg.id);
      if (!pegEl) return;
      pegEl.dataset.pkImploding = "1";
      pegEl.style.pointerEvents = "none";
      /* Strip classes that would fight the implode. */
      pegEl.classList.remove("pk-peg--rescuable");
      void pegEl.offsetWidth; /* reflow so class removal is committed */
      pegEl.style.animation = "pk-peg-implode 260ms ease-in forwards";

      /* Glue peg: release the trapped ball exactly when the rescue ring
         touches the peg ring (= implode start). Two things must happen
         simultaneously:
         1. Ball released — so it falls with the implode animation.
         2. Peg spliced out of layer.pegs — so the freed ball cannot
            re-trap on it in the very next physics tick (recentPegs was
            cleared by trapOn, so the guard would not block a re-hit).
         The DOM element is intentionally kept in #pegEls so that the
         implode animation plays to completion; onExpire → #destroyPeg
         will call el.remove() when the rescue timer expires. */
      if (peg.type === "glue" && peg.trappedBall) {
        const deathReward = peg.onDestroyed(ball);
        for (const layer of this.#layers) {
          const idx = layer.pegs.indexOf(peg);
          if (idx !== -1) {
            layer.pegs.splice(idx, 1);
            break;
          }
        }
        if (deathReward) this.#applyDestroyReward(deathReward, peg);
        this.#startLoop();
      }
    }, implodeAt);

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
    /* If the early-implode animation already started (player saved within the
       last ~667 ms of the rescue window), cancel it so the save flash plays. */
    if (el.dataset.pkImploding) {
      delete el.dataset.pkImploding;
      el.style.animation = "";
      el.style.pointerEvents = "";
    }
    el.classList.remove("pk-peg--rescuable", "pk-tremble");
    el.classList.add("pk-peg--saved");
    this.#bag.timeout(() => el.classList.remove("pk-peg--saved"), 400);

    /* Big combo banner at the peg position, tinted with the peg's own
       resolved --pk-peg-color so the banner always matches the saved
       peg's identity. */
    const mult = this.#pegSave.comboMultiplier;
    const color = getComputedStyle(el)
      .getPropertyValue("--pk-peg-color")
      .trim();
    this.#vfx?.showSaveBanner(
      `${iconSvg("save")} SAVED! ×${mult.toFixed(1)}`,
      peg.x,
      peg.y,
      color,
    );

    this.#updateSaveComboHud();
    /* Schedule a HUD refresh after the combo might decay. */
    this.#bag.timeout(
      () => this.#updateSaveComboHud(),
      PEG_SAVE.COMBO_DECAY_MS + 50,
    );

    this.#applyTriggers(TRIGGER_EVENTS.PEG_SAVED, {
      x: peg.x,
      y: peg.y,
      type: peg.type,
    });
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
    if (reward.coins) currencyManager.add(this.#coinReward(reward.coins));
    if (reward.diamonds) gameEvents.emit("diamonds", reward.diamonds);
    if (reward.extraBalls) this.#addExtraBalls(reward.extraBalls);
    if (reward.spawnBalls) this.#spawnBallsAt(peg.x, peg.y, reward.spawnBalls);
    if (reward.releaseBall && this.#balls.has(reward.releaseBall.id)) {
      reward.releaseBall.release();
    }
    if (reward.activate) bonusManager.activateSession(reward.activate);
    if (reward.queueSession) {
      /* A mystery peg is a mystery draw: tick mystery-scoped rewards, then
         queue the freshly drawn reward for the next pinboard. */
      bonusManager.onMysteryDraw();
      bonusManager.queueSessionNext(reward.queueSession);
    }
    this.#popReward(reward, peg.x, peg.y);
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
    const radius =
      peg.blastRadius + bonusManager.resolve(PARAM_KEYS.BOMB_RADIUS_BONUS, 0);
    const r2 = radius * radius;

    audioManager.playSfx("click");
    this.#popHtml(iconSvg("bomb"), bx, by, "pk-popup pk-popup--bomb");
    /* Every explosion — direct hit, tap, or chain reaction — banks the bomb's
       points and flies a big +N chip toward the total (typography set by the
       .pk-score-fly--bomb class). */
    this.#creditPoints(peg.points, bx, by, "bomb");

    /* Collect pegs in blast radius first — avoids skipping elements when
       #removePegEl splices layer.pegs during iteration. */
    const pegsInRange = [];
    for (const layer of this.#layers) {
      for (const p of layer.pegs) {
        if (p === peg || p.alive === false) continue;
        const dx = p.x - bx;
        const dy = p.y - by;
        if (dx * dx + dy * dy <= r2) pegsInRange.push(p);
      }
    }

    /* Destroy or chain-detonate each peg in range. */
    for (const p of pegsInRange) {
      if (p.type === "bomb" && !p.detonated) {
        /* Chain reaction: tremble the primed bomb, then detonate it. */
        const chainEl = this.#pegEls.get(p.id);
        if (chainEl) chainEl.classList.add("pk-tremble");
        this.#bag.timeout(() => this.#detonateBomb(p), 220);
      } else {
        p.alive = false;
        this.#removePegEl(p);
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

    this.#vfx?.emitBombExplosion(bx, by, radius);
  }

  /** Add extra balls to the cannon. */
  #addExtraBalls(count) {
    this.#cannon.addBalls(count);
    this.#cannonTotal += Math.max(0, Math.floor(count));
    this.#refreshCannon();
  }

  /**
   * Spawn `count` classic balls into live play at (x, y), bursting outward in
   * an upward fan so they scatter across the board. Used when a chest is
   * destroyed and releases the balls stored inside it.
   * @param {number} x — pinboard-space x
   * @param {number} y — pinboard-space y
   * @param {number} count
   */
  #spawnBallsAt(x, y, count) {
    if (this.#ended || !this.#ballLayerEl) return;
    const oy = this.#pinboardOffsetTop;
    /* Respect the pinboard ball cap. Cannon balls count in advance (the player
       will still launch them), so we only create up to the remaining headroom. */
    const n = spawnableBalls(
      count,
      this.#balls.size,
      this.#cannon?.ballsRemaining ?? 0,
      PLINKO.MAX_PINBOARD_BALLS,
    );
    if (n === 0) return;
    for (let i = 0; i < n; i++) {
      /* Fan the burst across [-0.5, 0.5] of the horizontal spread. */
      const spread = n > 1 ? i / (n - 1) - 0.5 : 0;
      const vx = spread * 220 + (Math.random() - 0.5) * 40;
      const vy = -120 - Math.random() * 80;
      const ball = new Ball({ x, y, vx, vy });
      ball.state = "active";
      const el = this.#createBallEl(ball);
      el.style.transform = `translate(${ball.x}px, ${ball.y + oy}px)`;
      this.#ballLayerEl.appendChild(el);
      this.#balls.set(ball.id, { ball, el });
      this.#updateBallEl(ball);
    }
    this.#startLoop();
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
      if (
        ball.alive &&
        ball.state === "active" &&
        ball.effects.has("burning")
      ) {
        this.#maybeEmitFireTrail(ball, oy);
      }
    }
  }

  /**
   * Emit fire trail particles at the ball's position, throttled per-ball.
   * Spawns 3 dots with size/position jitter for an organic fire look.
   * @param {Ball} ball
   * @param {number} oy — pinboard offset top
   */
  #maybeEmitFireTrail(ball, oy) {
    if (!this.#ballLayerEl) return;
    const now = performance.now();
    if (now - (this.#fireTrailTs.get(ball.id) ?? 0) < 30) return;
    this.#fireTrailTs.set(ball.id, now);
    for (let i = 0; i < 3; i++) {
      const size = 10 + Math.random() * 8;
      const jx = (Math.random() - 0.5) * 6;
      const jy = (Math.random() - 0.5) * 6;
      const p = document.createElement("div");
      p.className = "pk-fire-trail-dot";
      p.style.left = `${ball.x + jx}px`;
      p.style.top = `${ball.y + oy + jy}px`;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.marginLeft = `${-size / 2}px`;
      p.style.marginTop = `${-size / 2}px`;
      p.style.animationDuration = `${0.28 + Math.random() * 0.15}s`;
      p.style.animationDelay = `${i * 12}ms`;
      this.#ballLayerEl.appendChild(p);
      this.#bag.timeout(() => p.remove(), 480);
    }
  }

  /* ──────────────────────────────────────────────────────────────────────
     End of round
     ────────────────────────────────────────────────────────────────────── */

  #checkEndOfRound() {
    if (this.#ended || this.#converting) return;
    /* A pending peg rescue can still resolve into freed balls (glue peg),
       so the round is not over until every rescue window has been closed. */
    if (this.#pegSave.rescuableCount > 0) return;
    /* Every ball in play must have come to rest before we decide anything. */
    for (const { ball } of this.#balls.values()) {
      if (!ball.alive) continue;
      if (ball.state === "active") return;
      if (ball.state === "captured") {
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (speed > 5) return;
      }
    }
    /* Balls still loaded in the cannon: normally the player keeps firing. But
       once the objective is already met, the leftover shots would only pad the
       score — convert them straight into blue multipliers (with a fly-in VFX)
       instead of making the player fire them one by one. */
    if (!this.#cannon.isEmpty) {
      if (this.#score.finalScore >= this.#objective) {
        this.#convertRemainingBalls();
      }
      return;
    }
    /* Score mode: all balls have settled. The win/lose decision is computed
       from the final score (hits × multiplier) in #endRound. A short delay
       lets the last captured balls come to rest first. */
    this.#ended = true;
    this.#bag.timeout(() => this.#endRound(), 1200);
  }

  /**
   * Convert every remaining cannon ball into a +1 blue multiplier, one at a
   * time. Each conversion flies an orb from the cannon counter to the score
   * HUD multiplier; the multiplier is raised exactly when the orb lands. When
   * the cannon runs dry the round ends normally via {@link #checkEndOfRound}.
   */
  #convertRemainingBalls() {
    if (this.#converting || this.#cannon.isEmpty) return;
    this.#converting = true;

    const convertOne = () => {
      if (this.#ended) {
        this.#converting = false;
        return;
      }
      if (this.#cannon.isEmpty) {
        this.#converting = false;
        this.#checkEndOfRound();
        return;
      }
      this.#cannon.pop();
      this.#refreshCannon();
      audioManager.playSfx("click");
      this.#vfx?.flyBallToMultiplier(
        this.#cannonCountEl,
        this.#scoreHud?.multEl ?? null,
        () => {
          this.#score.addMultiplier(1);
          this.#scoreHud?.setMultiplier(this.#score.multiplier);
        },
      );
      this.#bag.timeout(convertOne, 300);
    };

    convertOne();
  }

  #endRound() {
    if (this.#overModal) return;
    this.#ended = true;
    this.#stopLoop();

    const hitScore = this.#score.hitScore;
    /* Run reward: SCORE_TOTAL_MULTIPLIER scales the whole final score. Folded
       into the multiplier so victory/ranking/modal/reveal all stay consistent;
       when > 1 it also lands as one extra reveal step. */
    const scoreMult = bonusManager.resolve(
      PARAM_KEYS.SCORE_TOTAL_MULTIPLIER,
      1,
    );
    const baseMultiplier = this.#score.multiplier;
    const baseSteps = this.#score.multiplierSteps;
    const multiplier = baseMultiplier * scoreMult;
    const steps =
      scoreMult > 1
        ? [...baseSteps, baseMultiplier * (scoreMult - 1)]
        : baseSteps;
    const finalScore = Math.round(hitScore * multiplier);
    const objective = this.#objective;
    const victory = finalScore >= objective;

    if (victory) {
      this.#markLevelComplete();
      /* Tick session bonuses so they expire after N levels on victory.
         On defeat the run is reset entirely (see onRetry/onBack below). */
      bonusManager.onLevelUp({ controller: this });
    }

    /* Record the final score in the rankings regardless of outcome. */
    saveManager.addRanking("default", {
      score: finalScore,
      level: this.#levelId,
      date: Date.now(),
    });

    const resetRun = () => {
      saveManager.clearGridState();
      saveManager.clearPinboardState();
      bonusManager.clearSession();
      pegShopManager.reset();
    };

    const openModal = () => {
      Promise.all([import("../components/level-end-modal.js")]).then(
        ([{ LevelEndModal }]) => {
          this.#overModal = new LevelEndModal({
            victory,
            levelId: this.#levelId,
            hitScore,
            multiplier,
            finalScore,
            objective,
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
        },
      );
    };

    /* Play the reveal: the total grows one multiplier at a time, and the
       background bar climbs in lock-step (from raw hits up to the final
       score). Open the level-end modal once it settles. */
    const reveal = this.#scoreHud?.reveal({
      finalScore,
      victory,
      hitScore,
      steps,
      onStep: (total) => {
        this.#progress?.setScore(total);
        this.#markScoreActivity();
      },
    });
    if (reveal) reveal.then(openModal);
    else openModal();
  }

  #markLevelComplete() {
    const data = saveManager.loadLevelProgress() ?? {
      completed: [],
    };
    if (!data.completed.includes(this.#levelId)) {
      data.completed.push(this.#levelId);
    }
    saveManager.saveLevelProgress(data);
  }

  #refreshLabels() {
    if (!this.#safeEl) return;
    const gateLocaleKey = (gate) => {
      if (gate === "x1_left" || gate === "x1_right") return "game.gate.x1";
      if (gate === "x2_left" || gate === "x2_right") return "game.gate.x2";
      return "game.gate.return";
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
      el.classList.add(
        peg.shieldActive ? "pk-peg--shield-active" : "pk-peg--shield-down",
      );
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
   * Plays the explosion destroy animation before removing the element.
   * @param {Ball} ball
   * @param {{ reason?: string }} [opts]
   */
  #destroyBall(ball, { reason = "destroyed" } = {}) {
    const entry = this.#balls.get(ball.id);
    if (!entry) return;
    ball.alive = false;

    /* Remove from simulation immediately so #renderBalls won't touch it. */
    this.#balls.delete(ball.id);
    this.#ballIdleTracker.delete(ball.id);
    this.#fireTrailTs.delete(ball.id);
    this.#elecSparkUnmounts.get(ball.id)?.();
    this.#elecSparkUnmounts.delete(ball.id);

    if (reason === "shatter") {
      this.#popHtml(iconSvg("zap"), ball.x, ball.y, "pk-popup pk-popup--big");
    }

    /* Freeze position via CSS vars and trigger explosion animation. */
    const el = entry.el;
    const oy = this.#pinboardOffsetTop;
    el.style.setProperty("--bx", `${ball.x}px`);
    el.style.setProperty("--by", `${ball.y + oy}px`);
    el.classList.add("pk-ball--destroying");
    this.#spawnDestroyParticles(ball.x, ball.y + oy);

    /* Remove DOM element once animation completes. */
    this.#bag.timeout(() => el.remove(), 600);
  }

  /**
   * Spawn explosion particles centered on the destroyed ball.
   * @param {number} cx - X in ball-layer coordinates
   * @param {number} cy - Y in ball-layer coordinates
   */
  #spawnDestroyParticles(cx, cy) {
    if (!this.#ballLayerEl) return;
    const COUNT = 10;
    const COLORS = [
      "var(--pk-gold)",
      "var(--pk-gold-light)",
      "var(--pk-crimson)",
      "var(--pk-rose)",
    ];
    for (let i = 0; i < COUNT; i++) {
      const p = document.createElement("div");
      p.className = "pk-ball-explode-particle";
      const angle = (Math.PI * 2 * i) / COUNT;
      const dist = 18 + Math.random() * 16;
      const size = 5 + Math.random() * 5;
      p.style.left = `${cx}px`;
      p.style.top = `${cy}px`;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.marginLeft = `${-size / 2}px`;
      p.style.marginTop = `${-size / 2}px`;
      p.style.setProperty("--px", `${Math.cos(angle) * dist}px`);
      p.style.setProperty("--py", `${Math.sin(angle) * dist}px`);
      p.style.animationDelay = `${i * 20}ms`;
      p.style.animationDuration = `${0.4 + Math.random() * 0.2}s`;
      p.style.background = COLORS[i % COLORS.length];
      this.#ballLayerEl.appendChild(p);
      this.#bag.timeout(() => p.remove(), 700);
    }
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
    const x = w / 2 + (Math.random() - 0.5) * 16;
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
   * apply each action to the cannon's ball count. Called once from start().
   * Only classic balls exist for now, so add/remove adjust the loaded count
   * and transform is a no-op until ball variants land.
   */
  #applyRoundDirectives() {
    bonusManager.consumeQueuedSessions();
    const directives = bonusManager.consumeDirectives();
    if (directives.length === 0) return;

    for (const d of directives) {
      const p = d.payload ?? {};
      switch (d.action) {
        case DIRECTIVE_ACTIONS.ADD_BALL: {
          const count = p.count ?? 1;
          this.#cannon.addBalls(count);
          this.#cannonTotal += Math.max(0, Math.floor(count));
          break;
        }
        case DIRECTIVE_ACTIONS.REMOVE_BALL: {
          const n = p.count ?? 1;
          const removed = Math.min(n, this.#cannon.ballsRemaining);
          this.#cannon.removeBalls(n);
          this.#cannonTotal = Math.max(0, this.#cannonTotal - removed);
          break;
        }
      }
    }
    this.#refreshCannon();
  }

  /**
   * Dispatch every active reward trigger listening to `event`. Each trigger's
   * optional `match` is checked against `ctx` first. Mirrors
   * `#applyRoundDirectives` but for event-driven rewards.
   * @param {string} event — one of TRIGGER_EVENTS
   * @param {object} [ctx] — event data (x, y, type, cancelled, by, …)
   */
  #applyTriggers(event, ctx = {}) {
    const triggers = bonusManager.getActiveTriggers(event);
    if (triggers.length === 0) return;
    for (const { trigger } of triggers) {
      if (trigger.match && !this.#triggerMatches(trigger.match, ctx)) continue;
      const p = trigger.payload ?? {};
      switch (trigger.action) {
        case TRIGGER_ACTIONS.ADD_HIT_SCORE:
          this.#creditPoints(
            p.points ?? 0,
            ctx.x ?? 0,
            ctx.y ?? 0,
            ctx.type ?? "peg",
          );
          break;
        case TRIGGER_ACTIONS.SPAWN_BALL:
          this.#spawnBallsAt(
            ctx.x ?? this.#pinboardWidth / 2,
            ctx.y ?? 0,
            p.count ?? 1,
          );
          break;
        case TRIGGER_ACTIONS.ADD_COINS:
          if (p.coins) currencyManager.add(p.coins);
          break;
        case TRIGGER_ACTIONS.ACTIVATE:
          if (p.bonusId) bonusManager.activateSession(p.bonusId);
          break;
      }
    }
  }

  /**
   * @param {object} match — required key/value pairs
   * @param {object} ctx — event data
   * @returns {boolean}
   */
  #triggerMatches(match, ctx) {
    return Object.entries(match).every(([k, v]) => ctx[k] === v);
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
