# Ability System

**Abilities** are permanent, cross-run unlocks bought with **diamonds** 💎 in
the Ability scene. Every ability is **direct-effect**: buying it immediately
applies its `modifiers`, resolved through
`abilityManager.resolve(paramKey, baseValue)` (order add → multiply → set).
There is no shop-gating indirection anymore — the ability *is* the effect.

`abilityManager` is the single source of every **permanent** parameter
(boutique discount, gate widths, map reveal, slot-machine wheels). Run-scoped
effects live in `bonusManager` instead (see [`BONUS.md`](./BONUS.md)).

Definitions live in [`src/configs/ability-defs.js`](../src/configs/ability-defs.js).

## Flow

A fresh run opens the Ability scene **before** the level grid is shown: when
`LevelSelectorScene` mounts and finds no persisted grid state, it wipes
run-scoped state (rewards + boutique pegs), generates a grid, persists it, and
routes to `AbilityScene`. Clicking Home loads the persisted grid. On later
visits the grid already exists, so the Ability scene is not re-entered
automatically — open it from the HUD if needed.

## Categories

Four categories, each a vertical progression (`level N+1` requires `level N`):

| Category | Theme                                                     |
| -------- | --------------------------------------------------------- |
| `SHOP`   | Tiered discounts on **boutique** prices (`SHOP_DISCOUNT`) |
| `GATE`   | Collection-gate width + multiplier upgrades               |
| `MAP`    | Reveal flags (mystery, shops, paths, boss)                |
| `WHEEL`  | Slot-machine reels + re-spin discount                     |

## Diamond cost

Cost grows exponentially with level inside a category: `cost(level) = 2^(level-1)`
(L1=1 … L6=32). Use `diamondCost(level)` rather than hard-coding.

## Catalogue

### SHOP — 6 levels
Each level adds `SHOP_DISCOUNT +0.05` (additive), stacking to −30% at L6.
Consumed by the boutique's `#priceFor` (clamped 0–0.9).

### GATE — 5 levels
Width tiers are cumulative totals expressed as additive increments (strict
prerequisite chain). `GATE_HP_WIDTH_REDUCTION` shrinks the central `return`
gate (L1 −50%, L2 −80% total); `GATE_BACK_WIDTH_REDUCTION` the edge x1 gates
(L3 −25%, L4 −50% total); `GATE_MULT_FACTOR ×2` at L5 doubles every multiplier
gate. Consumed in `game-controller.js` via `computeGateWidths()`.

### MAP — 4 levels
`REVEAL_MYSTERY` / `REVEAL_SHOPS` / `REVEAL_PATHS` / `REVEAL_BOSS` (`set: true`),
consumed by `LevelSelectorScene` via `abilityManager.resolve`.

### WHEEL — 4 levels
`SLOT_REEL_BONUS +1` at L1–L3 (unlocks reels 5→7, capped at `REEL_COUNT_MAX`);
`SLOT_REROLL_DISCOUNT ×0.5` at L4. Consumed when the controller builds the
`SlotMachine` (`reelCount`, `rerollDiscount`). See [`SLOT-MACHINE.md`](./SLOT-MACHINE.md).

## Anatomy of a def

```js
{
  id: "gate_1",
  category: ABILITY_CATEGORIES.GATE,
  level: 1,
  cost: diamondCost(1),   // 1
  modifiers: [
    { paramKey: PARAM_KEYS.GATE_HP_WIDTH_REDUCTION, op: "add", value: 0.5 },
  ],
}
```

`abilityManager.resolve(paramKey, baseValue)` walks every **unlocked** ability's
`modifiers`. Several params (the gates) are composed on top of
`bonusManager.resolve` in the controller.

## Manager API

```js
abilityManager.getAll();                 // ABILITY_DEFS
abilityManager.getUnlocked();            // [ids]
abilityManager.isUnlocked(id);           // boolean
abilityManager.unlock(id);               // boolean; spends nothing — caller pays
abilityManager.resolve(paramKey, base);  // permanent modifier resolution
abilityManager.reset();
abilityManager.on("change", cb);
```

The Ability scene wires the payment: `if (diamondManager.spend(def.cost)) abilityManager.unlock(def.id);`.
`saveManager.resetAll()` also wipes ability unlocks and diamonds.

## Adding a new ability

1. **Add to `ABILITY_DEFS`** with the right category and level (`diamondCost(level)`).
2. **Add `modifiers`** (each `paramKey` from `PARAM_KEYS`) and make sure a
   consumer calls `abilityManager.resolve(paramKey, …)`.
3. **Localize**: add `ability.<id>`, `ability.<id>.desc`, and (new category)
   `ability.category.<cat>` to both `en.js` and `fr.js`.
4. **Test** in `tests/managers/ability-manager.test.js` and
   `tests/configs/ability-defs.test.js`.
