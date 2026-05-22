import { EventEmitter } from "../utils/event-emitter.js";

/**
 * @typedef {'success' | 'error' | 'warning' | 'info'} NotificationType
 */

/**
 * @typedef {object} NotificationOptions
 * @property {NotificationType} [type='info'] - Visual variant.
 * @property {number} [duration=3000] - Time in ms before auto-dismiss.
 */

/**
 * NotificationManager — displays stacking toast notifications.
 *
 * Singleton. Notifications mount on `document.body` and stack vertically.
 * Each auto-dismisses after `duration` ms. CSS handles entrance/exit
 * animations.
 *
 * @example
 * import { notify } from '../managers/notification-manager.js';
 * notify.show('Level complete!', { type: 'success' });
 * notify.show('No balls left', { type: 'error', duration: 4000 });
 */
class NotificationManager extends EventEmitter {
  /** @type {HTMLElement | null} */
  #container = null;

  /** @type {{ id: number, el: HTMLElement, timer: number }[]} */
  #active = [];

  #nextId = 0;

  /** Default auto-dismiss duration (ms). */
  static DEFAULT_DURATION = 3000;

  /** Max simultaneous notifications. Oldest dismissed if exceeded. */
  static MAX_VISIBLE = 5;

  /**
   * Show a notification message.
   * @param {string} message - Text to display.
   * @param {NotificationOptions} [options]
   * @returns {number} Notification id (can be used to dismiss manually).
   */
  show(message, options = {}) {
    const { type = "info", duration = NotificationManager.DEFAULT_DURATION } =
      options;
    this.#ensureContainer();

    const id = this.#nextId++;
    const el = document.createElement("div");
    el.className = `pk-notif pk-notif--${type}`;
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.textContent = message;

    this.#container.appendChild(el);

    /* Force reflow so the entrance animation triggers. */
    el.offsetHeight;
    el.classList.add("pk-notif--visible");

    const timer = window.setTimeout(() => this.dismiss(id), duration);
    this.#active.push({ id, el, timer });

    /* Evict oldest if we exceed the cap. */
    if (this.#active.length > NotificationManager.MAX_VISIBLE) {
      this.dismiss(this.#active[0].id);
    }

    this.emit("show", { id, message, type });
    return id;
  }

  /**
   * Convenience shortcuts.
   * @param {string} message
   * @param {Omit<NotificationOptions, 'type'>} [options]
   */
  success(message, options) {
    return this.show(message, { ...options, type: "success" });
  }
  error(message, options) {
    return this.show(message, { ...options, type: "error" });
  }
  warning(message, options) {
    return this.show(message, { ...options, type: "warning" });
  }
  info(message, options) {
    return this.show(message, { ...options, type: "info" });
  }

  /**
   * Dismiss a notification by id.
   * @param {number} id
   */
  dismiss(id) {
    const idx = this.#active.findIndex((n) => n.id === id);
    if (idx === -1) return;
    const entry = this.#active[idx];
    window.clearTimeout(entry.timer);
    entry.el.classList.remove("pk-notif--visible");
    entry.el.classList.add("pk-notif--exit");
    entry.el.addEventListener(
      "animationend",
      () => entry.el.remove(),
      { once: true },
    );
    this.#active.splice(idx, 1);
    this.emit("dismiss", { id });
  }

  /** Dismiss all active notifications immediately. */
  dismissAll() {
    for (const entry of [...this.#active]) {
      this.dismiss(entry.id);
    }
  }

  /** @returns {number} Number of currently visible notifications. */
  get count() {
    return this.#active.length;
  }

  #ensureContainer() {
    if (this.#container && document.body.contains(this.#container)) return;
    this.#container = document.createElement("div");
    this.#container.className = "pk-notif-container";
    this.#container.setAttribute("aria-label", "Notifications");
    document.body.appendChild(this.#container);
  }
}

/** Singleton instance. */
export const notify = new NotificationManager();
