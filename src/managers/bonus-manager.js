import { gameEvents } from "../utils/event-emitter.js";
import { STORAGE_KEYS, SESSION_BONUS_DEFAULT_DURATION, SHOP_PRICES, PLINKO } from "../configs/constants.js";
import {
  PERMANENT_BONUSES,
  SESSION_BONUSES,
  BONUS_MILESTONE_INTERVAL,
} from "../configs/bonus-defs.js";

/**
 * BonusManager — singleton that tracks permanent and session bonuses,
 * resolves modified game parameters, and manages trigger-based effects.
 *
 * Follows the same pattern as `optionsManager` (owns its own localStorage key).
 */
class BonusManager {
  /* --- Persistent state (survives between games) --- */
  /** @type {Set<string>} */
  #unlockedIds = new Set();
  /** @type {Record<string, { cooldownUntilLevel?: number, activeUntilLevel?: number }>} */
  #activatableState = {};
  /** @type {number} */
  #highestLevelReached = 0;

  /* --- Session state (reset each game) --- */
  /** @type {Array<{ def: import('../configs/bonus-defs.js').BonusDef, remainingLevels: number }>} */
  #sessionBonuses = [];
  /** @type {Array<() => void>} */
  #triggerCleanups = [];
  /** @type {import('../configs/bonus-defs.js').BonusContext | null} */
  #ctx = null;
  /** @type {number} */
  #currentLevel = 0;

  constructor() {
    this.load();
  }

  /* ──────────────────────────────────────────────────────────────────────
     Session lifecycle
     ────────────────────────────────────────────────────────────────────── */

  /**
   * Called at the start of a new game round.
   * @param {import('../configs/bonus-defs.js').BonusContext} ctx
   */
  initSession(ctx) {
    this.#ctx = ctx;
    this.#sessionBonuses = [];
    this.#currentLevel = 0;
    this.#bindTriggers();
  }

  /** Called when the game round ends. */
  endSession() {
    this.#unbindTriggers();
    this.#sessionBonuses = [];
    this.#ctx = null;
    this.save();
  }

  /* ──────────────────────────────────────────────────────────────────────
     Level progression
     ────────────────────────────────────────────────────────────────────── */

  /**
   * Called when the player advances to a new level.
   * @param {number} level
   * @returns {import('../configs/bonus-defs.js').BonusDef[]} Newly unlocked bonuses (if any)
   */
  onLevelUp(level) {
    this.#currentLevel = level;

    /* Update activatable durations. */
    for (const [, state] of Object.entries(this.#activatableState)) {
      if (state.activeUntilLevel != null && level >= state.activeUntilLevel) {
        delete state.activeUntilLevel;
      }
    }

    /* Track highest level ever for persistence. */
    if (level > this.#highestLevelReached) {
      this.#highestLevelReached = level;
    }

    /* Check for new milestone unlocks. */
    const newUnlocks = [];
    if (level % BONUS_MILESTONE_INTERVAL === 0) {
      for (const def of PERMANENT_BONUSES) {
        if (def.unlockLevel === level && !this.#unlockedIds.has(def.id)) {
          this.#unlockedIds.add(def.id);
          newUnlocks.push(def);
        }
      }
    }

    if (newUnlocks.length > 0) {
      this.#rebindTriggers();
      this.save();
    }

    /* Expire session bonuses that have run out of levels. */
    const prevLen = this.#sessionBonuses.length;
    const expired = [];
    this.#sessionBonuses = this.#sessionBonuses.filter((entry) => {
      entry.remainingLevels -= 1;
      if (entry.remainingLevels > 0) return true;
      expired.push(entry.def);
      return false;
    });
    if (this.#sessionBonuses.length !== prevLen) {
      this.#rebindTriggers();
      for (const def of expired) {
        if (def.onExpire && this.#ctx) def.onExpire(this.#ctx);
      }
    }

    return newUnlocks;
  }

  /* ──────────────────────────────────────────────────────────────────────
     Parameter resolution
     ────────────────────────────────────────────────────────────────────── */

  /**
   * Resolve a game parameter through all active modifiers.
   * Order: add → multiply → set.
   * @param {string} paramKey
   * @param {number} baseValue
   * @returns {number}
   */
  resolve(paramKey, baseValue) {
    const mods = this.#getActiveModifiers(paramKey);
    if (mods.length === 0) return baseValue;

    let value = baseValue;
    /* Apply in order: add first, multiply second, set last. */
    for (const mod of mods) {
      if (mod.op === "add") value += mod.value;
    }
    for (const mod of mods) {
      if (mod.op === "multiply") value *= mod.value;
    }
    for (const mod of mods) {
      if (mod.op === "set") value = mod.value;
    }
    return value;
  }

  /**
   * Resolve gate widths with normalization so they still sum to 1.
   * @param {{ save: number, recycle: number, shop: number, drain: number }} baseWidths
   * @returns {{ save: number, recycle: number, shop: number, drain: number }}
   */
  resolveGateWidths(baseWidths) {
    const result = { ...baseWidths };
    result.drain = this.resolve("gateWidthDrain", result.drain);
    result.save = this.resolve("gateWidthSave", result.save);

    /* Normalize: distribute remaining space to recycle + shop proportionally. */
    const fixed = result.drain + result.save;
    const remaining = Math.max(0, 1 - fixed);
    const baseRemaining = baseWidths.recycle + baseWidths.shop;
    if (baseRemaining > 0) {
      result.recycle = (baseWidths.recycle / baseRemaining) * remaining;
      result.shop = (baseWidths.shop / baseRemaining) * remaining;
    } else {
      result.recycle = remaining / 2;
      result.shop = remaining / 2;
    }

    return result;
  }

  /* ──────────────────────────────────────────────────────────────────────
     Session bonuses (from shop)
     ────────────────────────────────────────────────────────────────────── */

  /**
   * Remove a session bonus early (e.g. ice ball lost to drain).
   * Does not call onExpire — caller handles its own cleanup.
   * @param {string} id
   */
  removeSessionBonus(id) {
    const idx = this.#sessionBonuses.findIndex((e) => e.def.id === id);
    if (idx === -1) return;
    this.#sessionBonuses.splice(idx, 1);
    this.#rebindTriggers();
  }

  /**
   * Add a session bonus (selected in shop).
   * @param {import('../configs/bonus-defs.js').BonusDef} def
   */
  addSessionBonus(def) {
    const duration = def.durationLevels ?? SESSION_BONUS_DEFAULT_DURATION;
    this.#sessionBonuses.push({ def, remainingLevels: duration });
    this.#rebindTriggers();
    /* Fire immediate trigger for bonuses that activate on application. */
    if (def.trigger?.event === "bonus:applied" && this.#ctx) {
      def.trigger.effect(this.#ctx);
    }
  }

  /**
   * Build peg-shop choices filtered by rarity. Offered for free (no coin cost).
   * Higher rarity unlocks progressively better bonus pools:
   *   common → common only · rare → common + rare · epic → + epic · legendary → all
   * @param {'common' | 'rare' | 'epic' | 'legendary'} rarity
   * @param {{ sublaunchCount?: number }} [opts]
   * @returns {Array<{ id: string, action: string, label: string, icon: string, bonusDef?: import('../configs/bonus-defs.js').BonusDef }>}
   */
  buildPegShopChoices(rarity, { sublaunchCount = 0 } = {}) {
    const RARITY_ORDER = ["common", "rare", "epic", "legendary"];
    const maxIdx = RARITY_ORDER.indexOf(rarity);
    const activeIds = new Set(this.#sessionBonuses.map((e) => e.def.id));
    const atMaxLaunchers = sublaunchCount >= PLINKO.MAX_SUBLAUNCHES;
    let available = SESSION_BONUSES.filter((b) => {
      if (activeIds.has(b.id)) return false;
      if (atMaxLaunchers && b.id === "bonus_launcher") return false;
      const bIdx = RARITY_ORDER.indexOf(b.rarity ?? "common");
      return bIdx <= maxIdx;
    });
    /* Fallback: if rarity filter yields nothing, show all unowned bonuses. */
    if (available.length === 0) {
      available = SESSION_BONUSES.filter((b) => !activeIds.has(b.id));
    }
    const shuffled = this.#weightedShuffle(available);
    return shuffled.slice(0, 3).map((b) => ({
      id: b.id,
      action: "bonus",
      label: `bonus.session.${b.id}`,
      icon: b.icon,
      bonusDef: b,
      /* no price — peg shop rewards are free */
    }));
  }

  /**
   * Build shop choices: 3 items mixing original choices with session bonuses.
   * Always guarantees at least one "ball" option.
   * @param {{ sublaunchCount?: number }} [opts]
   * @returns {Array<{ id: string, action: string, label: string, icon: string, bonusDef?: import('../configs/bonus-defs.js').BonusDef }>}
   */
  buildShopChoices({ sublaunchCount = 0 } = {}) {
    /* Filter out session bonuses already active (no duplicates). */
    const activeIds = new Set(this.#sessionBonuses.map((e) => e.def.id));
    const available = SESSION_BONUSES.filter((b) => !activeIds.has(b.id) && b.shopWeight > 0);

    const atMaxLaunchers = sublaunchCount >= PLINKO.MAX_SUBLAUNCHES;

    /* Always include ball as guaranteed slot 0. */
    const choices = [{ id: "ball", action: "ball", label: "shop.choice.ball", icon: "\uD83C\uDFB1", price: SHOP_PRICES.BALL }];

    /* Build pool: sublaunch + available session bonuses. */
    const pool = [
      ...(!atMaxLaunchers ? [{ id: "sublaunch", action: "sublaunch", label: "shop.choice.sublaunch", icon: "\uD83D\uDE80", price: SHOP_PRICES.SUBLAUNCH }] : []),
      ...available
        .filter((b) => !(atMaxLaunchers && b.id === "bonus_launcher"))
        .map((b) => ({
          id: b.id,
          action: "bonus",
          label: `bonus.session.${b.id}`,
          icon: b.icon,
          bonusDef: b,
          price: SHOP_PRICES.SESSION_BONUS,
        })),
    ];

    /* Weighted random pick of 2 from pool. */
    const shuffled = this.#weightedShuffle(pool);
    choices.push(shuffled[0], shuffled[1]);

    return choices;
  }

  /* ──────────────────────────────────────────────────────────────────────
     Activatable bonuses (manual trigger)
     ────────────────────────────────────────────────────────────────────── */

  /**
   * Activate a manually-triggered permanent bonus.
   * @param {string} id
   * @returns {boolean} true if activated successfully
   */
  activateBonus(id) {
    const def = PERMANENT_BONUSES.find((b) => b.id === id);
    if (!def || !def.activatable) return false;
    if (!this.#unlockedIds.has(id)) return false;

    const state = this.#activatableState[id] || {};
    /* Check cooldown. */
    if (state.cooldownUntilLevel != null && this.#currentLevel < state.cooldownUntilLevel) {
      return false;
    }

    /* Activate: set duration and cooldown. */
    state.activeUntilLevel = this.#currentLevel + (def.durationLevels || 2);
    state.cooldownUntilLevel = this.#currentLevel + (def.cooldownLevels || 10);
    this.#activatableState[id] = state;
    this.save();
    return true;
  }

  /**
   * Check if an activatable bonus is currently active.
   * @param {string} id
   * @returns {boolean}
   */
  isActive(id) {
    const state = this.#activatableState[id];
    return state?.activeUntilLevel != null && this.#currentLevel < state.activeUntilLevel;
  }

  /**
   * Check if an activatable bonus can be used (unlocked + off cooldown).
   * @param {string} id
   * @returns {boolean}
   */
  canActivate(id) {
    if (!this.#unlockedIds.has(id)) return false;
    const def = PERMANENT_BONUSES.find((b) => b.id === id);
    if (!def?.activatable) return false;
    const state = this.#activatableState[id];
    if (state?.cooldownUntilLevel != null && this.#currentLevel < state.cooldownUntilLevel) {
      return false;
    }
    if (state?.activeUntilLevel != null && this.#currentLevel < state.activeUntilLevel) {
      return false;
    }
    return true;
  }

  /* ──────────────────────────────────────────────────────────────────────
     Queries
     ────────────────────────────────────────────────────────────────────── */

  /** @param {string} id */
  isUnlocked(id) {
    return this.#unlockedIds.has(id);
  }

  /**
   * Get all active bonuses for UI display.
   * @returns {{ permanent: import('../configs/bonus-defs.js').BonusDef[], session: import('../configs/bonus-defs.js').BonusDef[] }}
   */
  getActiveBonuses() {
    const permanent = PERMANENT_BONUSES.filter((b) => this.#unlockedIds.has(b.id));
    return { permanent, session: this.#sessionBonuses.map((e) => e.def) };
  }

  /**
   * Get remaining levels for a session bonus.
   * @param {string} id
   * @returns {number} 0 if not active
   */
  getSessionBonusRemaining(id) {
    const entry = this.#sessionBonuses.find((e) => e.def.id === id);
    return entry?.remainingLevels ?? 0;
  }

  /** @returns {number} */
  get highestLevelReached() {
    return this.#highestLevelReached;
  }

  /** @returns {number} */
  get currentLevel() {
    return this.#currentLevel;
  }

  /* ──────────────────────────────────────────────────────────────────────
     Persistence
     ────────────────────────────────────────────────────────────────────── */

  save() {
    const data = {
      unlocked: [...this.#unlockedIds],
      activatable: this.#activatableState,
      highestLevel: this.#highestLevelReached,
    };
    try {
      localStorage.setItem(STORAGE_KEYS.BONUSES, JSON.stringify(data));
    } catch {
      /* Quota exceeded — silent fail. */
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.BONUSES);
      if (!raw) return;
      const data = JSON.parse(raw);
      this.#unlockedIds = new Set(data.unlocked || []);
      this.#activatableState = data.activatable || {};
      this.#highestLevelReached = data.highestLevel || 0;
    } catch {
      /* Corrupted data — start fresh. */
    }
  }

  /** Reset all bonus data (used by "reset all data" option). */
  reset() {
    this.#unlockedIds.clear();
    this.#activatableState = {};
    this.#highestLevelReached = 0;
    this.#sessionBonuses = [];
    this.#unbindTriggers();
    localStorage.removeItem(STORAGE_KEYS.BONUSES);
  }

  /** Dev-only: force-unlock a permanent bonus by id. */
  _devForceUnlock(id) {
    this.#unlockedIds.add(id);
    this.#rebindTriggers();
    this.save();
  }

  /* ──────────────────────────────────────────────────────────────────────
     Internal — modifier collection
     ────────────────────────────────────────────────────────────────────── */

  /**
   * Collect all active modifiers for a given param key.
   * @param {string} paramKey
   * @returns {Array<{ op: string, value: number }>}
   */
  #getActiveModifiers(paramKey) {
    const mods = [];

    /* Permanent bonuses (non-activatable = always on; activatable = only when active). */
    for (const def of PERMANENT_BONUSES) {
      if (!this.#unlockedIds.has(def.id)) continue;
      if (def.activatable && !this.isActive(def.id)) continue;
      if (!def.modifiers) continue;
      for (const mod of def.modifiers) {
        if (mod.param === paramKey) mods.push(mod);
      }
    }

    /* Session bonuses. */
    for (const { def } of this.#sessionBonuses) {
      if (!def.modifiers) continue;
      for (const mod of def.modifiers) {
        if (mod.param === paramKey) mods.push(mod);
      }
    }

    return mods;
  }

  /* ──────────────────────────────────────────────────────────────────────
     Internal — event triggers
     ────────────────────────────────────────────────────────────────────── */

  #bindTriggers() {
    this.#unbindTriggers();

    const bonuses = [
      ...PERMANENT_BONUSES.filter((b) => this.#unlockedIds.has(b.id)),
      ...this.#sessionBonuses.map((e) => e.def),
    ];

    for (const def of bonuses) {
      if (!def.trigger || def.trigger.event === "bonus:applied") continue;
      const handler = (data) => {
        if (!this.#ctx) return;
        if (def.trigger.condition && !def.trigger.condition(this.#ctx, data)) return;
        def.trigger.effect(this.#ctx, data);
      };
      const off = gameEvents.on(def.trigger.event, handler);
      this.#triggerCleanups.push(off);
    }
  }

  #unbindTriggers() {
    for (const off of this.#triggerCleanups) off();
    this.#triggerCleanups = [];
  }

  #rebindTriggers() {
    if (this.#ctx) this.#bindTriggers();
  }

  /* ──────────────────────────────────────────────────────────────────────
     Internal — weighted shuffle for shop choices
     ────────────────────────────────────────────────────────────────────── */

  /**
   * @template T
   * @param {Array<T & { bonusDef?: { shopWeight?: number } }>} items
   * @returns {Array<T>}
   */
  #weightedShuffle(items) {
    const weighted = items.map((item) => ({
      item,
      weight: item.bonusDef?.shopWeight ?? 1,
      sort: Math.random() ** (1 / (item.bonusDef?.shopWeight ?? 1)),
    }));
    weighted.sort((a, b) => b.sort - a.sort);
    return weighted.map((w) => w.item);
  }
}

export const bonusManager = new BonusManager();
