# Currency System

Pawko has a single soft-currency: **coins**. They are persistent across
runs and spent at the [Ability](ABILITY.md) and [Shop](BONUS.md) scenes.

## Earning coins

Coins drop from the `CoinPeg` entity. A coin peg is rendered with the
`.pk-peg pk-peg--coin` class and shows the cent glyph (`¢`). The first
ball that touches a coin peg awards `peg.coinValue` coins (default
`PLINKO.COIN_VALUE = 5`) and the peg is removed for the rest of the
round.

A coin peg also flashes a `+N¢` popup, exactly like a scoring peg, so
the feedback loop is identical.

Coin pegs spawn alongside regular pegs in `Layer.constructor`. Their
spawn probability uses `PLINKO.COIN_CHANCE_BASE` and follows the same
"alternating slot" rule as bumpers.

## Spending coins

Coins are spent through `currencyManager.spend(amount)`. The function
returns `true` and emits `change` if the balance was sufficient,
`false` otherwise — callers are expected to gate the UI on this return
value.

`currencyManager.add(amount)` always succeeds and emits `change`.

## Public API

```js
currencyManager.get()          // current balance
currencyManager.add(amount)    // credit, emits change
currencyManager.spend(amount)  // returns boolean
currencyManager.reset()        // sets to 0
currencyManager.on('change', cb)
```

## Persistence

`STORAGE_KEYS.CURRENCY` stores `{ coins: number }`. The
`currencyManager` is the only writer — never write to this key directly.

## Dev affordances

The dev admin panel exposes a **+100 coins** button in DEV builds for
fast iteration on the Shop and Ability scenes.
