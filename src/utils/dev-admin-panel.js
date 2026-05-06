import { gameEvents } from "./event-emitter.js";
import { SESSION_BONUSES, PERMANENT_BONUSES } from "../configs/bonus-defs.js";

/**
 * Dev-only admin panel. Mounted directly on `document.body` to the right
 * of the safe zone. Provides buttons for activating bonuses and spawning balls.
 *
 * Communicates with GameController via gameEvents — no direct coupling.
 * @param {{ onTitle?: () => void, onStyleguide?: () => void }} [hooks]
 */
export function installDevAdminPanel({ onTitle, onStyleguide } = {}) {
  if (document.getElementById("pk-dev-admin")) return;

  const panel = document.createElement("div");
  panel.id = "pk-dev-admin";
  panel.className = "pk-dev-admin";
  panel.setAttribute("data-no-sfx", "");

  const allBonuses = [...PERMANENT_BONUSES, ...SESSION_BONUSES];

  panel.innerHTML = `
    <h3 class="pk-dev-admin-title">Admin</h3>
    <div class="pk-dev-admin-section">
      <h4>Nav</h4>
      <button class="pk-dev-admin-btn" data-dev="nav-title" data-no-sfx>Title</button>
      <button class="pk-dev-admin-btn" data-dev="nav-styleguide" data-no-sfx>Style guide</button>
    </div>
    <div class="pk-dev-admin-section">
      <h4>Balls</h4>
      <button class="pk-dev-admin-btn" data-dev="ball">Normal</button>
      <button class="pk-dev-admin-btn pk-dev-admin-btn--ice" data-dev="ice-ball">Ice</button>
      <button class="pk-dev-admin-btn pk-dev-admin-btn--glass" data-dev="glass-ball">Glass</button>
    </div>
    <div class="pk-dev-admin-section">
      <h4>Bonus</h4>
      ${allBonuses
        .map(
          (b) =>
            `<button class="pk-dev-admin-btn" data-dev="bonus" data-bonus-id="${b.id}" title="${b.id}">${b.icon} ${b.id}</button>`,
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
      else if (action === "ball") gameEvents.emit("dev:spawnBall");
      else if (action === "ice-ball") gameEvents.emit("dev:spawnIceBall");
      else if (action === "glass-ball") gameEvents.emit("dev:spawnGlassBall");
      else if (action === "bonus") {
        gameEvents.emit("dev:activateBonus", { id: /** @type {HTMLElement} */ (btn).dataset.bonusId });
      }
    },
    true,
  );

  document.body.appendChild(panel);
}
