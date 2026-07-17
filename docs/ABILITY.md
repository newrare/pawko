# Ability System

**Abilities** are permanent unlocks bought with **diamonds** 💎 in the
Ability scene. They never affect gameplay directly — instead they act as
**gates** that make new bonuses, ball kinds, and reveal flags available
in the shop.

Definitions live in [`src/configs/ability-defs.js`](../src/configs/ability-defs.js)
and are accessed through `abilityManager`.

## Flow

A fresh run opens the Ability scene **before** the level grid is shown:
when `LevelSelectorScene` mounts and finds no persisted grid state, it
generates one, persists it, and routes to `AbilityScene` immediately.
Clicking Home from the Ability scene loads the persisted grid normally.
On subsequent visits the grid already exists, so the Ability scene is
not re-entered automatically — open it from the HUD if needed.

There is no longer an `ability` cell type on the grid map.

## Categories

Six categories, each a vertical progression (`level N+1` requires `level N`):

| Category   | Theme                                                        |
| ---------- | ------------------------------------------------------------ |
| `SHOP`     | Tiered discounts on shop prices                              |
| `ECONOMY`  | Tiered discounts on peg replacement                          |
| `PEG`      | Boosts on special pegs (bomb radius, effect duration, glue)  |
| `GATE`     | Destroy-coin multiplier + width reductions on back & hp gates |
| `PLAYER`   | Max HP tiers (tower-defense)                                 |
| `MAP`      | Reveal flags (mystery, shops, paths, boss)                   |

## Diamond cost

Cost grows exponentially with level inside a category:

$$ \text{cost}(level) = 2^{level-1} $$

| Level | Cost (💎) |
| ----- | --------- |
| 1     | 1         |
| 2     | 2         |
| 3     | 4         |
| 4     | 8         |
| 5     | 16        |
| 6     | 32        |

Use the helper `diamondCost(level)` rather than hard-coding.

## Catalogue

### SHOP — 6 levels

| id       | Lvl | Unlocks                  |
| -------- | --- | ------------------------ |
| `shop_1` | 1   | `perm_shop_discount_1` (-5%)  |
| `shop_2` | 2   | `perm_shop_discount_2` (-10%) |
| `shop_3` | 3   | `perm_shop_discount_3` (-15%) |
| `shop_4` | 4   | `perm_shop_discount_4` (-20%) |
| `shop_5` | 5   | `perm_shop_discount_5` (-25%) |
| `shop_6` | 6   | `perm_shop_discount_6` (-30%) |

### ECONOMY — 6 levels

| id          | Lvl | Unlocks                 |
| ----------- | --- | ----------------------- |
| `economy_1` | 1   | `perm_peg_discount_1` (-5%)  |
| `economy_2` | 2   | `perm_peg_discount_2` (-10%) |
| `economy_3` | 3   | `perm_peg_discount_3` (-15%) |
| `economy_4` | 4   | `perm_peg_discount_4` (-20%) |
| `economy_5` | 5   | `perm_peg_discount_5` (-25%) |
| `economy_6` | 6   | `perm_peg_discount_6` (-30%) |

### PEG — 5 levels

| id      | Lvl | Unlocks                                                      |
| ------- | --- | ------------------------------------------------------------ |
| `peg_1` | 1   | `perm_bomb_radius_xl` (+25 blast radius)                     |
| `peg_2` | 2   | `perm_fire_duration_1/2/3` (+1s/+2s/+3s burning)             |
| `peg_3` | 3   | `perm_ice_duration_1/2/3` (+1s/+2s/+3s frozen)               |
| `peg_4` | 4   | `perm_electrical_duration_1/2/3` (+1s/+2s/+3s electrified)   |
| `peg_5` | 5   | `perm_glue_hp_1/2/3` (+5/+10/+15 HP on glue pegs)            |

### GATE — 5 levels

| id       | Lvl | Unlocks                                            |
| -------- | --- | -------------------------------------------------- |
| `gate_1` | 1   | `perm_destroy_coins_x2` (destroy gates ×2 coins)   |
| `gate_2` | 2   | `perm_gate_back_width_1` (-5% width on back gates) |
| `gate_3` | 3   | `perm_gate_back_width_2` (-10% width on back gates)|
| `gate_4` | 4   | `perm_gate_hp_width_1` (-5% width on hp gate)      |
| `gate_5` | 5   | `perm_gate_hp_width_2` (-10% width on hp gate)     |

### PLAYER — 4 levels

| id         | Lvl | Unlocks                          |
| ---------- | --- | -------------------------------- |
| `player_1` | 1   | `perm_extra_hp_1` (+5 max HP)    |
| `player_2` | 2   | `perm_extra_hp_2` (+10 max HP)   |
| `player_3` | 3   | `perm_extra_hp_3` (+15 max HP)   |
| `player_4` | 4   | `perm_extra_hp_4` (+20 max HP)   |

### MAP — 4 levels

| id      | Lvl | Unlocks                  |
| ------- | --- | ------------------------ |
| `map_1` | 1   | `perm_reveal_mystery`    |
| `map_2` | 2   | `perm_reveal_shops`      |
| `map_3` | 3   | `perm_reveal_paths`      |
| `map_4` | 4   | `perm_reveal_boss`       |

## Anatomy of a def

```js
{
  id: "peg_2",
  category: ABILITY_CATEGORIES.PEG,
  level: 2,
  cost: diamondCost(2),   // 2
  unlocks: [
    "perm_fire_duration_1",
    "perm_fire_duration_2",
    "perm_fire_duration_3",
  ],
}
```

`abilityManager.canBuyBonus(bonusId)` walks the catalogue and returns
`true` if any unlocked ability lists `bonusId` in its `unlocks` array
(or if no ability mentions the bonus at all). The shop card uses this
to lock-out ungated buttons.

## Manager API

```js
abilityManager.getAll();           // ABILITY_DEFS
abilityManager.getUnlocked();      // [ids]
abilityManager.isUnlocked(id);     // boolean
abilityManager.unlock(id);         // boolean; spends nothing — caller pays
abilityManager.canBuyBonus(bonusId);
abilityManager.reset();
abilityManager.on("change", cb);
```

The Ability scene is the only place that wires the payment:

```js
if (diamondManager.spend(def.cost)) abilityManager.unlock(def.id);
```

`saveManager.resetAll()` also wipes ability unlocks and diamonds.

## Adding a new ability

1. **Add to `ABILITY_DEFS`** with the right category and level. Costs
   come from `diamondCost(level)`.
2. **Wire the unlocks**: if it gates a new bonus, list its id in
   `unlocks`. The bonus must exist in `PERMANENT_BONUSES` (or session
   bonuses) before the ability references it.
3. **Localize**: add `ability.<id>` and `ability.<id>.desc` to both
   `en.js` and `fr.js`. Category headers live under
   `ability.category.<cat>`.
4. **Test** in `tests/managers/ability-manager.test.js` and
   `tests/configs/ability-defs.test.js` (structural invariants).
