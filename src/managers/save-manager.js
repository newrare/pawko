import { STORAGE_KEYS, MAX_SAVE_SLOTS } from '../configs/constants.js';

/**
 * SaveManager — generic localStorage persistence for game-wide state.
 *
 * Three primitives:
 *   - **autoSave**: a single most-recent snapshot, written after every move.
 *   - **slots**: a fixed-size array of named user saves (`null` for empty).
 *   - **rankings**: per-mode top-N leaderboards.
 *
 * The shape of stored payloads is opaque to this class — callers pick what
 * to serialise. JSON-safe values only.
 */
class SaveManager {
  // ─── Auto-save ────────────────────────────────────

  /** @param {object} state */
  saveAuto(state) {
    this.#write(STORAGE_KEYS.AUTOSAVE, { ...state, date: Date.now() });
  }

  /** @returns {object | null} */
  loadAuto() {
    return this.#read(STORAGE_KEYS.AUTOSAVE);
  }

  clearAuto() {
    localStorage.removeItem(STORAGE_KEYS.AUTOSAVE);
  }

  // ─── Slots ────────────────────────────────────────

  /**
   * @returns {Array<object | null>} length === MAX_SAVE_SLOTS
   */
  getSlots() {
    const raw = this.#read(STORAGE_KEYS.SAVE_SLOTS);
    const slots = Array.isArray(raw) ? raw : [];
    while (slots.length < MAX_SAVE_SLOTS) slots.push(null);
    return slots.slice(0, MAX_SAVE_SLOTS);
  }

  /**
   * @param {number} index 0-based slot
   * @param {object} state
   */
  saveSlot(index, state) {
    if (index < 0 || index >= MAX_SAVE_SLOTS) {
      throw new Error(`Slot index ${index} out of range`);
    }
    const slots = this.getSlots();
    slots[index] = { ...state, date: Date.now() };
    this.#write(STORAGE_KEYS.SAVE_SLOTS, slots);
  }

  /** @param {number} index */
  loadSlot(index) {
    return this.getSlots()[index] ?? null;
  }

  /** @param {number} index */
  clearSlot(index) {
    const slots = this.getSlots();
    slots[index] = null;
    this.#write(STORAGE_KEYS.SAVE_SLOTS, slots);
  }

  // ─── Rankings ─────────────────────────────────────

  /**
   * Per-mode rankings (top 10 by default).
   * @param {string} mode
   * @returns {Array<object>}
   */
  getRankings(mode) {
    const all = this.#read(STORAGE_KEYS.RANKINGS) ?? {};
    return Array.isArray(all[mode]) ? all[mode] : [];
  }

  /**
   * Insert a score into the ranking, keep top `limit`.
   * @param {string} mode
   * @param {object} entry  Caller-defined shape (must include `score`).
   * @param {number} [limit=10]
   */
  addRanking(mode, entry, limit = 10) {
    const all = this.#read(STORAGE_KEYS.RANKINGS) ?? {};
    const list = Array.isArray(all[mode]) ? all[mode] : [];
    list.push({ ...entry, date: entry.date ?? Date.now() });
    list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    all[mode] = list.slice(0, limit);
    this.#write(STORAGE_KEYS.RANKINGS, all);
  }

  /** @param {string} [mode] If omitted, clears every mode. */
  clearRankings(mode) {
    if (!mode) {
      localStorage.removeItem(STORAGE_KEYS.RANKINGS);
      return;
    }
    const all = this.#read(STORAGE_KEYS.RANKINGS) ?? {};
    delete all[mode];
    this.#write(STORAGE_KEYS.RANKINGS, all);
  }

  /** Wipe every save key (rankings, slots, autosave). */
  resetAll() {
    localStorage.removeItem(STORAGE_KEYS.AUTOSAVE);
    localStorage.removeItem(STORAGE_KEYS.SAVE_SLOTS);
    localStorage.removeItem(STORAGE_KEYS.RANKINGS);
  }

  // ─── Internals ────────────────────────────────────

  #read(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  #write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`[save] failed to write ${key}:`, err);
    }
  }
}

export const saveManager = new SaveManager();
