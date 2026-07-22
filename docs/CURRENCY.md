# Currency System

Pawko has two currencies, both persistent across runs:

| Currency     | Manager            | Storage key              | Spent at            |
| ------------ | ------------------ | ------------------------ | ------------------- |
| **Coins**    | `currencyManager`  | `STORAGE_KEYS.CURRENCY`  | Boutique + re-spins |
| **Diamonds** | `diamondManager`   | `STORAGE_KEYS.DIAMONDS`  | Ability scene       |

Coins fund the **boutique** — peg types added to the slot-machine pool for the
current run (see [SHOP.md](./SHOP.md)) — and slot-machine re-spins.
Diamonds fund **abilities** — permanent, direct-effect upgrades (see
[ABILITY.md](./ABILITY.md)). Run **rewards** (bonuses/maluses) are never bought;
they come only from mystery sources (see [BONUS.md](./BONUS.md)). There is no
separate "reward" currency.

## Earning coins 🪙

Coins drop from the `CoinPeg` entity, rendered with the
`.pk-peg pk-peg--coin` class. The first ball that touches a coin peg awards
`peg.coinValue` coins (default `PLINKO.COIN_VALUE = 1`) and the peg is
removed for the rest of the round. It flashes a `+N` popup with the coin
icon, exactly like a scoring peg, so the feedback loop is identical.

Coin pegs are **not** spawned in layers — layers hold classic pegs only.
`coin` is one of the three default slot-machine upgrades
(`DEFAULT_UPGRADE_TYPES = [fire, coin, bumper]`), so the player creates a
coin peg by dragging a rolled `coin` upgrade onto a classic peg (see
[SLOT-MACHINE.md](./SLOT-MACHINE.md)).

## Earning diamonds 💎

Diamonds drop from rarer pegs: `DiamondPeg` and as one of the random
outcomes of `MysteryPeg`. (`ChestPeg` no longer drops currency — when
destroyed it releases `CHEST_BALL_RELEASE` classic balls onto the
pinboard instead, subject to the `PLINKO.MAX_PINBOARD_BALLS` cap — see
[src/utils/ball-budget.js](../src/utils/ball-budget.js).) The reward payload contains a
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
