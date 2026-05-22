import { gameEvents } from "./event-emitter.js";
import { currencyManager } from "../managers/currency-manager.js";
import { diamondManager } from "../managers/diamond-manager.js";
import { abilityManager } from "../managers/ability-manager.js";
import { bonusManager } from "../managers/bonus-manager.js";
import { notify } from "../managers/notification-manager.js";
import {
  PERMANENT_BONUSES,
  SESSION_BONUSES,
  SESSION_MALUSES,
} from "../configs/bonus-defs.js";
import { ABILITY_DEFS } from "../configs/ability-defs.js";
import { BALL_KINDS } from "../entities/ball-factory.js";
import { PEG_TYPES } from "../entities/peg-factory.js";

/**
 * Dev-only admin panel. Mounted directly on `document.body` to the right
 * of the safe zone. Provides buttons for navigation, spawning balls, and
 * fast-forwarding the rogue-lite progression while testing.
 *
 * Communicates with GameController via gameEvents — no direct coupling.
 * @param {{ onTitle?: () => void, onStyleguide?: () => void, onShop?: () => void, onAbility?: () => void, onTestPegs?: (type: string) => void }} [hooks]
 */
export function installDevAdminPanel({
  onTitle,
  onStyleguide,
  onShop,
  onAbility,
  onTestPegs,
} = {}) {
  if (document.getElementById("pk-dev-admin")) return;

  const panel = document.createElement("div");
  panel.id = "pk-dev-admin";
  panel.className = "pk-dev-admin";
  panel.setAttribute("data-no-sfx", "");

  panel.innerHTML = `
    <h3 class="pk-dev-admin-title">Admin</h3>
    <div class="pk-dev-admin-section">
      <h4>Nav</h4>
      <button class="pk-dev-admin-btn" data-dev="nav-title" data-no-sfx>Title</button>
      <button class="pk-dev-admin-btn" data-dev="nav-styleguide" data-no-sfx>Style guide</button>
      <button class="pk-dev-admin-btn" data-dev="nav-shop" data-no-sfx>Shop</button>
      <button class="pk-dev-admin-btn" data-dev="nav-ability" data-no-sfx>Ability</button>
    </div>
    <div class="pk-dev-admin-section pk-dev-admin-section--game-only" data-section="spawn-ball">
      <h4>Spawn ball</h4>
      ${Object.values(BALL_KINDS)
        .map(
          (k) =>
            `<button class="pk-dev-admin-btn pk-dev-admin-btn--${k}" data-dev="spawn-ball" data-kind="${k}" data-no-sfx>+ ${k}</button>`,
        )
        .join("")}
    </div>
    <div class="pk-dev-admin-section">
      <h4>Currencies</h4>
      <button class="pk-dev-admin-btn" data-dev="add-coins">+100 coins</button>
      <button class="pk-dev-admin-btn" data-dev="add-diamonds">+50 diamonds</button>
      <button class="pk-dev-admin-btn pk-dev-admin-btn--malus" data-dev="clear-coins">Remove all coins</button>
      <button class="pk-dev-admin-btn pk-dev-admin-btn--malus" data-dev="clear-diamonds">Remove all diamonds</button>
    </div>
    <div class="pk-dev-admin-section">
      <h4>Rogue-lite</h4>
      <button class="pk-dev-admin-btn" data-dev="unlock-abilities">Unlock all abilities</button>
      <button class="pk-dev-admin-btn" data-dev="unlock-permanent">Unlock all permanent</button>
      <button class="pk-dev-admin-btn" data-dev="activate-session">Activate all session</button>
      <button class="pk-dev-admin-btn pk-dev-admin-btn--malus" data-dev="activate-malus">Activate all maluses</button>
      <button class="pk-dev-admin-btn pk-dev-admin-btn--malus" data-dev="clear-abilities">Remove active abilities</button>
      <button class="pk-dev-admin-btn pk-dev-admin-btn--malus" data-dev="clear-permanent">Remove all permanent bonuses</button>
      <button class="pk-dev-admin-btn pk-dev-admin-btn--malus" data-dev="clear-session-bonuses">Remove all session bonuses</button>
      <button class="pk-dev-admin-btn pk-dev-admin-btn--malus" data-dev="clear-session-maluses">Remove all session maluses</button>
    </div>
    <div class="pk-dev-admin-section">
      <h4>Test Level</h4>
      <button class="pk-dev-admin-btn pk-dev-admin-btn--test" data-dev="test-pegs" data-peg-type="all" data-no-sfx>All pegs pinboard</button>
      ${Object.values(PEG_TYPES)
        .map(
          (t) =>
            `<button class="pk-dev-admin-btn pk-dev-admin-btn--test" data-dev="test-pegs" data-peg-type="${t}" data-no-sfx>Only ${t}</button>`,
        )
        .join("")}
    </div>
  `;

  panel.addEventListener(
    "pointerdown",
    (e) => {
      const btn = /** @type {HTMLElement | null} */ (e.target).closest("[data-dev]");
      if (!btn) return;
      e.stopPropagation();
      e.preventDefault();
      const action = /** @type {HTMLElement} */ (btn).dataset.dev;
      if (action === "nav-title") onTitle?.();
      else if (action === "nav-styleguide") onStyleguide?.();
      else if (action === "nav-shop") onShop?.();
      else if (action === "nav-ability") onAbility?.();
      else if (action === "spawn-ball") {
        const kind = /** @type {HTMLElement} */ (btn).dataset.kind || "classic";
        gameEvents.emit("dev:spawnBall", kind);
        notify.success(`Spawned ${kind} ball`);
      } else if (action === "add-coins") {
        currencyManager.add(100);
        notify.success("+100 coins");
      } else if (action === "add-diamonds") {
        diamondManager.add(50);
        notify.success("+50 diamonds");
      } else if (action === "clear-coins") {
        if (currencyManager.get() === 0) notify.error("No coins to remove");
        else {
          currencyManager.reset();
          notify.success("Coins removed");
        }
      } else if (action === "clear-diamonds") {
        if (diamondManager.get() === 0) notify.error("No diamonds to remove");
        else {
          diamondManager.reset();
          notify.success("Diamonds removed");
        }
      } else if (action === "unlock-abilities") {
        let unlocked = 0;
        for (const a of ABILITY_DEFS) if (abilityManager.unlock(a.id)) unlocked += 1;
        if (unlocked === 0) notify.error("Abilities already unlocked");
        else notify.success("All abilities unlocked");
      } else if (action === "clear-abilities") {
        if (abilityManager.getUnlocked().length === 0)
          notify.error("No abilities to remove");
        else {
          abilityManager.reset();
          notify.success("Abilities removed");
        }
      } else if (action === "unlock-permanent") {
        let unlocked = 0;
        for (const b of PERMANENT_BONUSES)
          if (bonusManager.unlockPermanent(b.id)) unlocked += 1;
        if (unlocked === 0) notify.error("Permanent bonuses already unlocked");
        else notify.success("All permanent bonuses unlocked");
      } else if (action === "clear-permanent") {
        if (bonusManager.clearPermanent()) notify.success("Permanent bonuses removed");
        else notify.error("No permanent bonuses to remove");
      } else if (action === "activate-session") {
        let activated = 0;
        for (const b of SESSION_BONUSES)
          if (bonusManager.activateSession(b.id)) activated += 1;
        if (activated === 0) notify.error("No session bonuses activated");
        else notify.success("All session bonuses activated");
      } else if (action === "activate-malus") {
        let activated = 0;
        for (const m of SESSION_MALUSES)
          if (bonusManager.activateMalus(m.id)) activated += 1;
        if (activated === 0) notify.error("No maluses activated");
        else notify.warning("All maluses activated");
      } else if (action === "clear-session-bonuses") {
        if (bonusManager.clearSessionBonuses())
          notify.success("Session bonuses removed");
        else notify.error("No active session bonuses");
      } else if (action === "clear-session-maluses") {
        if (bonusManager.clearSessionMaluses())
          notify.success("Session maluses removed");
        else notify.error("No active session maluses");
      } else if (action === "test-pegs") {
        const type = /** @type {HTMLElement} */ (btn).dataset.pegType || "all";
        onTestPegs?.(type);
        notify.success(`Test level: ${type}`);
      }
    },
    true,
  );

  document.body.appendChild(panel);

  // Track the active scene so we can show/hide scene-specific sections
  // (currently only "Spawn ball", which is meaningful inside GameScene).
  gameEvents.on("scene:change", ({ name } = {}) => {
    if (name) panel.dataset.scene = name;
    else delete panel.dataset.scene;
  });
}
