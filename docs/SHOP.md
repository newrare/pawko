# Boutique — per-run peg shop

The **boutique** (`ShopScene`, reached from a `SHOP` cell on the level map)
sells **peg types** with **coins** 🪙. A purchase adds the peg to the
slot-machine pool **for the current run only** and removes the item from the
offer (it has been *acquired* this run). Prices range from **100 to 1000**
coins by power.

This is the run-scoped counterpart of the permanent **abilities** (diamonds):
abilities persist across runs, boutique pegs reset every run.

## Rules

- **Scope: one run.** Acquisitions are tracked by the transient
  `pegShopManager` (no persistence). They are wiped at the start of every run —
  when a fresh grid is generated in `LevelSelectorScene`, and on
  defeat/retry/back via the controller's `resetRun()`.
- **Acquired = removed from the offer.** `#fillSlots` lists only
  `PEG_SHOP_DEFS.filter(d => !pegShopManager.isAcquired(d.type))`.
- **Discount.** Prices are reduced by the permanent **SHOP** abilities
  (`abilityManager.resolve(SHOP_DISCOUNT, 0)`, clamped 0–0.9).
- **Price malus.** The `malus_shop_price` malus inflates every price by
  `SHOP_PRICE_MULT` (×2 / ×5 / ×10, rolled at activation), applied in
  `#priceFor` **after** the discount. Entering the boutique also ticks any
  shop-scoped reward duration (`bonusManager.onShopVisited()`).
- **Rarity.** Each peg's rarity tier is derived from its price by
  `rarityForCost` (`peg-shop-defs.js`) — the single source reused by the shop
  card styling and the slot-machine reel roll.
- **Effect.** An acquired type joins `getUnlockedUpgradeTypes()` = defaults +
  `pegShopManager.getAcquired()`, so it can be rolled by the slot machine for
  the rest of the run (see [SLOT-MACHINE.md](./SLOT-MACHINE.md)).

## Catalogue

Defined in [`peg-shop-defs.js`](../src/configs/peg-shop-defs.js) — `{ type, cost, icon }`,
icon sourced from `iconForUpgrade` (single source of truth):

| Type         | Cost |
| ------------ | ---- |
| `ice`        | 100  |
| `glue`       | 200  |
| `electrical` | 300  |
| `teleport`   | 400  |
| `chest`      | 500  |
| `mystery`    | 600  |
| `shield`     | 700  |
| `diamond`    | 800  |
| `bomb`       | 1000 |

The three default upgrade types (`fire`, `coin`, `bumper`) are always in the
pool and never sold.

## Manager API

```js
pegShopManager.acquire(type);   // boolean; caller pays via currencyManager.spend first
pegShopManager.isAcquired(type);
pegShopManager.getAcquired();   // [types]
pegShopManager.reset();         // start of each run
pegShopManager.on("change", cb);
```

## Adding a new boutique peg

1. Ensure the peg type exists in `PEG_TYPES` and in `UPGRADE_TYPE_CATALOG`.
2. Add `item("<type>", cost)` to `PEG_SHOP_DEFS` (100–1000).
3. Localize `peg_shop.<type>` (+ `.desc`) in both `en.js` and `fr.js`.
4. Cover it in `tests/configs/peg-shop-defs.test.js`.
