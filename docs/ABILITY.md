# Ability System

**Abilities** are permanent unlocks bought with **diamonds** 💎 in the
Ability scene. They never affect gameplay directly — instead they act as
**gates** that make new bonuses, ball kinds, and reveal flags available
in the shop and on the level map.

Definitions live in [`src/configs/ability-defs.js`](../src/configs/ability-defs.js)
and are accessed through `abilityManager`.

## Categories

Abilities are grouped into five categories. Each category is a vertical
progression: `level 2` requires `level 1`, etc.

| Category   | Theme                                          |
| ---------- | ---------------------------------------------- |
| `BALL`     | Extra starting balls per sublauncher           |
| `GATE`     | Gate reveal & gate-multiplier upgrades         |
| `LAUNCHER` | Extra sublaunchers (run-scoped, fed by shop)   |
| `PINBOARD` | One-shot pinboard score bonuses                |
| `AVANTAGE` | Quality-of-life reveals (shops, mystery, boss) |

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

| id              | Cat      | Lvl | Unlocks (bonus id)                                     |
| --------------- | -------- | --- | ------------------------------------------------------ |
| `ball_1`        | BALL     | 1   | `perm_extra_ball_1`, `session_extra_classic_ball_one`  |
| `ball_2`        | BALL     | 2   | `perm_extra_ball_2`                                    |
| `ball_3`        | BALL     | 3   | `perm_extra_ball_3`                                    |
| `gate_1`        | GATE     | 1   | `session_gate_malus_reduce`                            |
| `gate_2`        | GATE     | 2   | `session_gate_x_boost` (×1.5 on every gate multiplier) |
| `gate_3`        | GATE     | 3   | `session_gate_x_double`                                |
| `launcher_1`    | LAUNCHER | 1   | nothing (gate only)                                    |
| `launcher_2`    | LAUNCHER | 2   | shop now lists `session_launcher_4` (+1 sublauncher)   |
| `launcher_3..6` | LAUNCHER | 3-6 | unlock `session_launcher_5..9` progressively           |
| `pinboard_2`    | PINBOARD | 2   | shop now lists +50% next-pinboard score bonus          |
| `pinboard_3`    | PINBOARD | 3   | +100% next-pinboard score bonus                        |
| `avantage_1`    | AVANTAGE | 1   | `perm_reveal_shops`                                    |
| `avantage_2`    | AVANTAGE | 2   | `perm_reveal_abilities`                                |
| `avantage_3`    | AVANTAGE | 3   | `perm_reveal_mystery`, `perm_reveal_paths`             |
| `avantage_4`    | AVANTAGE | 4   | `perm_reveal_boss`                                     |

## Anatomy of a def

```js
{
  id: "ball_2",
  category: ABILITY_CATEGORIES.BALL,
  level: 2,
  cost: diamondCost(2),   // 2
  unlocks: ["perm_extra_ball_2", "session_extra_black_ball_one"],
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
   `unlocks`. If it just enables a feature (e.g. a reveal flag), the
   matching `perm_reveal_*` bonus must exist in `PERMANENT_BONUSES`.
3. **Localize**: add `ability.<id>` and `ability.<id>.desc` to both
   `en.js` and `fr.js`. Category headers live under
   `ability.category.<cat>`.
4. **Test** in `tests/managers/ability-manager.test.js`.
