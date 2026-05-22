# Currency System

Pawko has two currencies, both persistent across runs:

| Currency        | Manager            | Storage key              | Spent at        |
| --------------- | ------------------ | ------------------------ | --------------- |
| **Coins** 🪙    | `currencyManager`  | `STORAGE_KEYS.CURRENCY`  | Shop scene      |
| **Diamonds** 💎 | `diamondManager`   | `STORAGE_KEYS.DIAMONDS`  | Ability scene   |

Coins fund **session bonuses** (one-shot or N-level buffs sold in the
shop). Diamonds fund **abilities** — permanent gates that unlock new
bonuses, ball kinds, and reveal flags.

## Earning coins 🪙

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

## Earning diamonds 💎

Diamonds drop from rarer pegs: `DiamondPeg`, `ChestPeg`, and as one of
the random outcomes of `MysteryPeg`. The reward payload contains a
`diamonds` field, e.g. `{ diamonds: 1, popText: "+1💎" }`. The
controller routes any `diamonds` value into `diamondManager.add(n)` via
the global `gameEvents` channel — peg code never imports the manager
directly.

## Spending

```js
currencyManager.spend(amount); // returns boolean
diamondManager.spend(amount);  // returns boolean
```

Both refuse non-positive amounts and return `false` when the balance is
insufficient. Callers must gate the UI on the return value.

`currencyManager.add(amount)` and `diamondManager.add(amount)` always
succeed and emit `change`.

## Public API

```js
currencyManager.get();
currencyManager.add(amount);
currencyManager.spend(amount); // boolean
currencyManager.reset();
currencyManager.on("change", cb);

diamondManager.get();
diamondManager.add(amount);
diamondManager.spend(amount); // boolean
diamondManager.reset();
diamondManager.on("change", cb);
```

## Persistence

- `STORAGE_KEYS.CURRENCY` → `{ coins: number }` — owned by `currencyManager`.
- `STORAGE_KEYS.DIAMONDS` → `{ diamonds: number }` — owned by `diamondManager`.

Never write to either key directly — go through the managers.

## Dev affordances

The dev admin panel exposes both **+100 coins** and **+50 diamonds**
buttons in DEV builds for fast iteration on the Shop and Ability scenes.
The roguelite reset button also resets both currencies.
