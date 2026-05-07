# Ability System

Abilities are the **unlock layer** of Pawko's rogue-lite progression.
Buying an ability is a one-time, persistent purchase paid in coins. Once
owned, an ability stays unlocked across runs and across data resets that
go through the `Reset all data` action only.

## What an ability does

An ability does **not** affect gameplay directly. It unlocks one or more
bonus IDs in the [Shop](BONUS.md). A bonus whose `abilityRequired` is
not yet unlocked is hidden from the Shop list.

This split keeps the rogue-lite curve readable:

- **Ability tree** answers *"what categories of bonus can the player ever
  buy?"*
- **Shop** answers *"which of those, this run, can the player afford?"*

## Ability definition shape

```js
{
  id: 'start_ball_up',
  cost: 80,                       // coins to unlock
  unlocks: ['extra_start_ball'],  // bonus IDs gated by this ability
}
```

Locale strings for an ability live under:

- `ability.<id>` — short name shown in the list
- `ability.<id>.desc` — one-sentence description shown below the name

## Ability list (ships in v0.1)

| ID              | Cost | Unlocks bonuses    |
| --------------- | ---- | ------------------ |
| `start_ball_up` | 80   | `extra_start_ball` |
| `magnet`        | 150  | `shop_magnet`      |
| `extra_launch`  | 70   | `bonus_launcher`   |
| `score_boost`   | 60   | `score_x2`         |

The mapping from ability → bonuses is one-to-many on purpose: a future
`magnet` upgrade could unlock both `shop_magnet` and a stronger
`shop_magnet_xl`.

## Persistence

`STORAGE_KEYS.ABILITIES` stores `{ unlocked: string[] }`. The
`abilityManager` is the only writer — never write to this key directly.

## Public API

```js
abilityManager.isUnlocked(id)   // boolean
abilityManager.unlock(id)       // persists, emits 'change'
abilityManager.getUnlocked()    // string[] — owned ability IDs
abilityManager.getAll()         // ABILITY_DEFS (pure data)
abilityManager.canBuyBonus(id)  // does any unlocked ability gate this bonus?
abilityManager.reset()          // clears every unlock (used by reset-all)
abilityManager.on('change', cb) // subscribe
```

## Ability scene

Reachable from the **Ability** button on the [Level Selector](../src/scenes/level-selector-scene.js).

- Each row shows the ability name, description, cost, and an unlock
  button.
- Owned abilities are checked and disabled.
- Locked abilities the player cannot afford are dimmed.
- A coin balance is shown at the top.

## Dev shortcut

The dev admin panel (DEV builds only) has an **Unlock all abilities**
button to fast-forward the rogue-lite tree while testing.
