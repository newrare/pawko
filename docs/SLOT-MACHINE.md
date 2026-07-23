# Slot machine — peg-upgrade drum

The **slot machine** ("bandit manchot") lives inside the pinboard, in the
upper band between the score HUD (raised to hug the cannon) and the top peg
row. On level open its reels spin and settle on random **peg upgrades**; the
player **drags an upgrade onto a classic peg** to evolve it. A reel emptied by
a drop can be re-filled with a paid **re-spin**.

Its vertical placement follows the **top peg row**, not the objective line —
the objective line now moves per level on the shared score scale (low for
level 1, high for the last level), so the machine is anchored to the pegs to
keep a stable position.

```
[ cannon ]
[ score HUD ]          ← raised near the cannon
[ 🔥 ❄️ ⚡ 🟠 ]  ↻ 25   ← slot machine, above the top peg row
· · · pegs · · ·
─Lv1──────────────500─  ← objective line (position varies per level)
```

## Rules

- **Free to apply.** The roll is the reward; dropping an upgrade on a classic
  peg costs nothing. Only **classic** pegs (`type === "peg"`) accept an
  upgrade — special pegs are left alone.
- **Opening spin is free.** It runs once per level from the current pool.
- **Re-spin re-rolls every reel** (kept upgrades included). It is available
  whenever the player can afford it — **unless** the `malus_slot_no_reroll`
  malus (`SLOT_REROLL_DISABLED`) is active, which locks the button entirely
  (`SlotMachineHud`'s `canReroll` probe). Its coin cost is exponential in the
  number of re-spins used this level — `REROLL_BASE_COST × REROLL_GROWTH^n` —
  and is **reset every level**.
- **Rarity-weighted roll.** Each peg type has an intrinsic `rarity`
  (`rarityForUpgrade` in `slot-machine-defs.js`, mirroring the boutique price
  tier; the three defaults are `common`). The reel roll is weighted by
  `RARITY_WEIGHTS`, passed to `spin()`/`refillEmpty()` via the optional `roll`
  argument. A reward can **cheat the rarity per reel** through `roll.reelRarity`:
  the `malus_slot_common` malus (`SLOT_FORCE_COMMON`) pins every reel to
  `common`. A per-reel constraint that would empty a reel's pool falls back to
  the full pool; one that empties the lucky pool simply skips luck for that reel.
- **7 reel slots are always shown.** The first `REEL_COUNT_DEFAULT` (4) are
  active; the remaining slots up to `REEL_COUNT_MAX` (7) render a **padlock**
  🔒. The active count is `REEL_COUNT_DEFAULT + SLOT_REEL_BONUS`, where
  `SLOT_REEL_BONUS` comes from the permanent **WHEEL** abilities
  (`abilityManager.resolve`); WHEEL L1–L3 unlock reels 5→7. The re-spin cost is
  also scaled by `SLOT_REROLL_DISCOUNT` (WHEEL L4 ×0.5), applied inside
  `SlotMachine.rerollCost()` via the `rerollDiscount` constructor option.
- **Lucky reel.** While the `reward_lucky_reel` reward is active
  (`SLOT_LUCKY_REEL_CHANCE`), each reel has that probability of rolling from the
  peg types **not yet bought in the boutique this run** instead of the normal
  pool — passed to `spin()`/`refillEmpty()` as the optional `luck` argument.
- **Reel motion:** a long, heavy vertical deceleration
  (`SPIN_EASING`, `SPIN_DURATION_MS`) rolling through `SPIN_ROLL_CELLS`, reels
  settling one after another (`SPIN_STAGGER_MS`), each with a small tremble
  (`TREMBLE_MS`) as it lands — via the Web Animations API.
- **Aim fade:** while the player aims the cannon the machine fades into the
  background (opacity), mirroring the score HUD; it fades back when the aim
  ends. Driven by `SlotMachineHud.setDimmed()` from the controller's aim hooks.

## Upgrade pool

Three types are available from the first level with no purchase:
**`fire`, `coin`, `bumper`** (`DEFAULT_UPGRADE_TYPES`). Every other type is added
to the pool **for the current run** by buying it in the **boutique** (coins) —
see [`SHOP.md`](./SHOP.md). Acquisitions are tracked by the transient
`pegShopManager` and reset at the start of each run. The live pool is resolved
by `getUnlockedUpgradeTypes()` = defaults + `pegShopManager.getAcquired()`.

Boutique-sold types (100–1000 coins): `ice`, `glue`, `electrical`, `teleport`,
`chest`, `mystery`, `shield`, `diamond`, `bomb`. Prices live in
[peg-shop-defs.js](../src/configs/peg-shop-defs.js); icons come from
`UPGRADE_TYPE_CATALOG` (single source of truth).

## Code map

| Concern                     | Location                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| Tuning constants            | `SLOT_MACHINE` in [constants.js](../src/configs/constants.js)                                |
| Type catalogue + icons      | [slot-machine-defs.js](../src/configs/slot-machine-defs.js)                                  |
| Boutique prices + defs      | [peg-shop-defs.js](../src/configs/peg-shop-defs.js)                                          |
| Run acquisitions (transient)| `pegShopManager` — [peg-shop-manager.js](../src/managers/peg-shop-manager.js)                |
| Resolved pool               | `getUnlockedUpgradeTypes()` — [upgrade-pool.js](../src/utils/upgrade-pool.js)                |
| Reel logic (no DOM)         | [slot-machine.js](../src/entities/slot-machine.js) (`SlotMachine`)                           |
| UI + drag gesture           | [slot-machine.js](../src/components/slot-machine.js) (`SlotMachineHud`)                      |
| Styles                      | [slot-machine.css](../src/styles/components/slot-machine.css)                                |
| Wiring (spin/drop/re-spin)  | `GameController` — `#applyUpgrade`, `#upgradePeg`, `#rerollSlots`, `#updateProgressGeometry` |

The peg swap reuses the peg factory (`createPeg`) and the controller's
`#createPegEl`, then `persistPinboard()` — a peg's identity is just its `type`
string, so an applied upgrade survives between levels with no serialization
change.

## Adding a new upgrade type

1. Ensure the peg type exists in `PEG_TYPES` / `PEG_REGISTRY`
   ([peg-factory.js](../src/entities/peg-factory.js)).
2. Add a row to `UPGRADE_TYPE_CATALOG` in
   [slot-machine-defs.js](../src/configs/slot-machine-defs.js) with its icon (or
   add it to `DEFAULT_UPGRADE_TYPES` to make it a free default).
3. To sell it, add an `item("<type>", cost)` to `PEG_SHOP_DEFS` in
   [peg-shop-defs.js](../src/configs/peg-shop-defs.js) (100–1000 coins).
4. Localize `peg_shop.<type>` (+ `.desc`) in **both** `en.js` and `fr.js`.
5. Add a per-type accent rule in
   [slot-machine.css](../src/styles/components/slot-machine.css).
6. Cover it in `tests/configs/slot-machine-defs.test.js` /
   `tests/configs/peg-shop-defs.test.js`.
