# Bonus System

Pawko has a rogue-lite progression layer built on three persistent
concepts and one per-run concept:

| Concept            | Persistence | Purchased in   | Effect                             |
| ------------------ | ----------- | -------------- | ---------------------------------- |
| **Currency**       | persistent  | earned in-game | spend at Shop and Ability scenes   |
| **Ability**        | persistent  | Ability scene  | unlocks bonuses for the Shop       |
| **Permanent bonus**| persistent  | Shop scene     | always-on modifier once unlocked   |
| **Session bonus**  | per run     | Shop scene     | active for N levels then expires   |

Permanent bonuses are unlocked **forever** — they survive a fresh game.
Session bonuses last only `durationLevels` levels then call their
`onExpire` callback. Both are bought from the Shop scene with coins, but
a bonus is **invisible in the shop** until at least one Ability that
gates it is unlocked.

## Coin economy

Coins drop from `CoinPeg` instances on the pinboard. A ball that touches
a coin peg awards `peg.coinValue` coins (default `PLINKO.COIN_VALUE`)
and the peg is consumed for the rest of the round. Coins persist across
runs in `STORAGE_KEYS.CURRENCY` and are spent on the Ability and Shop
scenes.

See [CURRENCY.md](CURRENCY.md) for the full economy surface.

## Shop

Reachable from a button on the Level Selector scene. Lists every bonus
whose `abilityRequired` is unlocked (or which has no ability gate). Each
row shows name, description, cost, and a Buy button. Permanent bonuses
that are already owned are greyed out; session bonuses can be re-bought.

## Ability

Reachable from a button on the Level Selector scene. Lists every
ability — locked rows show the unlock cost, unlocked rows are checked
and disabled. Buying an ability deducts coins, persists the unlock, and
makes the gated bonuses appear in the Shop.

See [ABILITY.md](ABILITY.md) for the ability tree and the full
definition shape.

## Bonus IDs (ships in v0.1)

### Permanent

| ID                 | Cost | Ability         | Effect                                            |
| ------------------ | ---- | --------------- | ------------------------------------------------- |
| `extra_start_ball` | 60   | `start_ball_up` | Start each round with 6 balls per launcher        |
| `shop_magnet`      | 120  | `magnet`        | Shop pegs attract nearby balls with gravity force |

### Session (last 3 levels)

| ID               | Cost | Ability        | Effect                                                          |
| ---------------- | ---- | -------------- | --------------------------------------------------------------- |
| `bonus_launcher` | 40   | `extra_launch` | Adds 1 extra sublaunch with 5 balls. Removed when bonus expires.|
| `score_x2`       | 30   | `score_boost`  | Classic peg score is ×2.                                        |

## Architecture

```
src/configs/bonus-defs.js            <- Bonus definitions (pure data)
src/managers/bonus-manager.js        <- Permanent + session state, modifier resolution
src/managers/currency-manager.js     <- Persistent coin balance
src/managers/ability-manager.js      <- Persistent unlocked abilities
src/entities/peg-coin.js             <- The CoinPeg entity
src/scenes/shop-scene.js             <- Shop UI
src/scenes/ability-scene.js          <- Ability tree UI
src/styles/components/shop.css       <- Shop scene styles
src/styles/components/ability.css    <- Ability scene styles
```

### Bonus definition shape

```js
{
  id: 'extra_start_ball',
  type: 'permanent',                // 'permanent' | 'session'
  cost: 60,                         // coins to buy in shop
  abilityRequired: 'start_ball_up', // null for ungated bonuses
  durationLevels: 3,                // session only
  modifiers: [
    { paramKey: 'startingBallsPerSublaunch', op: 'add', value: 1 },
  ],
  onExpire: null,                   // optional, session only — fn(ctx)
}
```

`paramKey` is one of:

- `startingBallsPerSublaunch` — base balls held per sublaunch at round start.
- `sublaunchCount` — number of sublaunchers shown for the round.
- `pegScoreMultiplier` — multiplies score awarded by classic pegs (not bumpers).
- `shopMagnetEnabled` — when truthy, shop pegs attract nearby balls.

`op` is `'add'`, `'multiply'`, or `'set'`. Resolution order is `add → multiply → set`.

### Parameter resolution

`bonusManager.resolve(paramKey, baseValue)` walks every active modifier
(permanent + session) and applies them in `add → multiply → set` order.
The controller calls this at the few sites that consume gameplay tuning
instead of reading `PLINKO.*` directly.

### Session bonus lifecycle

```
[ shop buy ] -> activateSession(id)         remaining = durationLevels
[ each level cleared ] -> onLevelUp()       remaining -= 1
                                             if remaining === 0:
                                               onExpire?.(ctx)
                                               remove from active list
```

`onExpire(ctx)` receives a context object so a bonus can react when it
times out — for example `bonus_launcher` removes its extra sublaunch DOM
when it expires.

## Adding a new bonus

1. Add the definition to [src/configs/bonus-defs.js](../src/configs/bonus-defs.js)
   under `PERMANENT_BONUSES` or `SESSION_BONUSES`.
2. Add locale strings to **both** `en.js` and `fr.js`:
   - `bonus.permanent.<id>` / `bonus.session.<id>` (name)
   - `bonus.permanent.<id>.desc` / `bonus.session.<id>.desc` (description)
3. If it gates on a new ability, add the ability to `src/configs/ability-defs.js`
   and add its locale strings.
4. If it introduces a new parameter, add a `bonusManager.resolve()` call
   at the relevant site in [game-controller.js](../src/controllers/game-controller.js).
5. Run `npm test` and `npm run lint`.

## Persistence

| Key                       | Shape                                                                  |
| ------------------------- | ---------------------------------------------------------------------- |
| `STORAGE_KEYS.BONUSES`    | `{ unlocked: string[] }` — owned permanent bonus IDs                   |
| `STORAGE_KEYS.ABILITIES`  | `{ unlocked: string[] }` — owned ability IDs                           |
| `STORAGE_KEYS.CURRENCY`   | `{ coins: number }`                                                    |

Session bonuses are **not** persisted. They live in memory inside
`bonusManager` and are cleared on `bonusManager.clearSession()`.

`saveManager.resetAll()` clears coins, abilities and permanent bonuses
in addition to its previous responsibilities.

## Dev admin panel

The dev admin panel (visible only in DEV builds) has a "Rogue-lite"
section:

- **+100 coins** — credits coins for testing the shop
- **Unlock all permanent** — unlocks every `PERMANENT_BONUSES` entry
- **Activate all session** — activates every `SESSION_BONUSES` entry
- **Reset rogue-lite** — clears coins, abilities, owned bonuses, and
  active session bonuses
