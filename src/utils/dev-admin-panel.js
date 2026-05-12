import { gameEvents } from "./event-emitter.js";
import { currencyManager } from "../managers/currency-manager.js";
import { abilityManager } from "../managers/ability-manager.js";
import { bonusManager } from "../managers/bonus-manager.js";
import {
  PERMANENT_BONUSES,
  SESSION_BONUSES,
} from "../configs/bonus-defs.js";
import { ABILITY_DEFS } from "../configs/ability-defs.js";

/**
 * Dev-only admin panel. Mounted directly on `document.body` to the right
 * of the safe zone. Provides buttons for navigation, spawning balls, and
 * fast-forwarding the rogue-lite progression while testing.
 *
 * Communicates with GameController via gameEvents — no direct coupling.
 * @param {{ onTitle?: () => void, onStyleguide?: () => void, onShop?: () => void, onAbility?: () => void }} [hooks]
 */
export function installDevAdminPanel({ onTitle, onStyleguide, onShop, onAbility } = {}) {
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
    <div class="pk-dev-admin-section">
      <h4>Balls</h4>
      <button class="pk-dev-admin-btn" data-dev="ball">Spawn</button>
    </div>
    <div class="pk-dev-admin-section">
      <h4>Rogue-lite</h4>
      <button class="pk-dev-admin-btn" data-dev="add-coins">+100 coins</button>
      <button class="pk-dev-admin-btn" data-dev="unlock-abilities">Unlock all abilities</button>
      <button class="pk-dev-admin-btn" data-dev="unlock-permanent">Unlock all permanent</button>
      <button class="pk-dev-admin-btn" data-dev="activate-session">Activate all session</button>
      <button class="pk-dev-admin-btn" data-dev="reset-roguelite">Reset rogue-lite</button>
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
      else if (action === "ball") gameEvents.emit("dev:spawnBall");
      else if (action === "add-coins") currencyManager.add(100);
      else if (action === "unlock-abilities") {
        for (const a of ABILITY_DEFS) abilityManager.unlock(a.id);
      } else if (action === "unlock-permanent") {
        for (const b of PERMANENT_BONUSES) bonusManager.unlockPermanent(b.id);
      } else if (action === "activate-session") {
        for (const b of SESSION_BONUSES) bonusManager.activateSession(b.id);
      } else if (action === "reset-roguelite") {
        currencyManager.reset();
        abilityManager.reset();
        bonusManager.resetAll();
      }
    },
    true,
  );

  document.body.appendChild(panel);
}
