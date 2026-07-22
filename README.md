# Pawko

A Plinko-style cat game built on a mobile-first Vanilla JS + Vite + Capacitor
template. Aim a **cannon**, fire balls (curious mice) down a pinboard of pegs,
and chain peg hits with gate multipliers to beat each level's **score
objective**. Spend your winnings on peg upgrades and permanent abilities, then
explore the map all the way to the boss.

The game uses pure DOM + CSS rendering with a custom physics loop —
no canvas, no game engine. Stays small, stays cute.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Other commands:

```bash
npm run build        # production build → dist/
npm run preview
npm test             # vitest + happy-dom
npm run test:watch
npm run test:coverage
npm run lint
npm run format
```

Mobile (after `npm run build`):

```bash
npx cap add android
npx cap add ios
npm run cap:android
npm run cap:ios
```

## Game loop

```
Title ─▶ Exploration map ─▶ cell ─▶ back to map ─▶ … ─▶ Boss
                │
                ├─ Level cell   → play a pinboard round (beat the objective)
                ├─ Shop cell    → boutique: buy peg types with coins (per run)
                ├─ Mystery cell → roll a run reward (bonus / malus)
                └─ Ability      → spend diamonds on permanent upgrades
```

A fresh run opens the **Ability scene** first, then reveals a **7×12
exploration map** (`LevelSelectorScene`). Cells are connected by a random edge
graph, so every run traces a different path toward the boss.

## Pinboard layout & vocabulary

```
  ┌──────────────────────────────────┐
  │                ▲                 │  ← Cannon — aim & fire, 1 ball per shot
  |                                  |
  │           score 1 240   ×3       │  ← Score HUD (gold total × blue multiplier)
  │        [ 🔥 ❄️ ⚡ 🟠 ]   ↻ 25     │  ← Slot machine — drag an upgrade onto a peg
  │  · · · · · · · · · · · · · · · · │  ── objective horizon line ──
  │    ·   ◎   ·   ◈   ·   ◎   ·  ·  │  Pinboard (stacked layers of pegs)
  │  ·   ·   ¢   ·   ·   ✦   ·   ·   │  ·  classic peg   ◎ bumper   ¢ coin
  │    ·   ·   ·   ●   ·   ·   ·  ·  │  ◈ diamond   ✦ mystery   ● ball in flight
  ├──────┬──────┬──────┬──────┬──────┤
  │  x1  │  x2  │ RTN  │  x2  │  x1  │  ← Collection gates — 5 equal zones
  ├──────────────────────────────────┤
  │   Objective 2 500  ·  Level 5/20 │  ← HUD (progress bar + level)
  └──────────────────────────────────┘
```

### Zone vocabulary

| Zone                 | Description                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Cannon**           | A single cannon at the top-center. The player aims it (bubble-shooter style) and fires **one ball per shot**; balls loaded = `min(level, 20)`          |
| **Score HUD**        | Live readout of the **gold** hit-score total and the **blue** multiplier; the final score is `gold × multiplier`                                       |
| **Slot machine**     | A reel drum ("bandit manchot") that rolls random **peg upgrades**; drag one onto a classic peg to evolve it. Opening spin is free, re-spins cost coins |
| **Objective line**   | Dashed horizon marking the objective zone; the progress gauge fills up to it                                                                           |
| **Pinboard**         | Tall play area holding all layers; origin is its top-left corner                                                                                       |
| **Layer**            | One horizontal plank of up to 20 pegs, filled on alternating slots; `INITIAL_LAYERS` (8) load per level                                                |
| **Slot**             | A horizontal index (0–19) inside a layer — a *position*, not an entity; `Slot.xFor(index, width)` converts it to a CSS pixel coordinate                |
| **Peg**              | Base obstacle; classic pegs credit points on contact and can be upgraded into elemental / reward variants (see hierarchy below)                        |
| **Ball**             | The falling bead; carries velocity `(vx, vy)`, HP, a recycle counter, active effects, and a set of recently-touched peg IDs (hit dedup)                |
| **Collection gates** | Five equal-width zones at the pinboard bottom: `x1 | x2 | RETURN | x2 | x1`                                                                            |
| **x1 / x2 gates**    | Raise the blue multiplier (`+1` / `+2`) when a ball is captured                                                                                        |
| **RETURN gate**      | Central gate — recycles the ball back to the top of the pinboard (max `MAX_RECYCLES` = 8 per ball)                                                     |

### Peg family hierarchy

Built through [`createPeg(type, opts)`](src/entities/peg-factory.js); every peg
type has a base HP (`PEG_DEFS`) and awards points on hit (`PEG_POINTS`).

```
Entity
└── Peg (base — classic peg, +10 pts)
    ├── BumperPeg      (golden, boosted rebound)
    ├── CoinPeg        (drops coins 🪙 to the currency HUD)
    ├── DiamondPeg     (drops diamonds 💎)
    ├── MysteryPeg     (rolls a random reward / diamond)
    ├── ChestPeg       (releases classic balls when destroyed)
    ├── ShieldPeg      (absorbs hits, cooldown-gated)
    ├── GluePeg        (traps a ball)
    ├── TeleportPeg    (warps a ball elsewhere)
    ├── FirePeg        (burning effect)
    ├── IcePeg         (frozen / slow effect)
    ├── ElectricalPeg  (electrified effect, attracts nearby balls)
    └── BombPeg        (explodes, clearing pegs within BOMB_RADIUS)
```

## How to play

1. **Aim and fire the cannon.** Drag or tap inside the pinboard to aim, then
   release to fire one ball. Re-aim between shots. The barrel only points
   downward, so a ball always heads into the board.
2. Balls bounce on **pegs**, and every contact adds that peg's points to your
   **gold** hit-score. Elemental and bumper pegs award more; reward pegs
   (coin, diamond, mystery, chest) grant coins/diamonds/powers instead of
   points.
3. At the bottom, five equal **gates** capture the ball:
   - **x1 / x2** — raise your blue **multiplier** by 1 / 2.
   - **RETURN** (center) — recycles the ball to the top (up to 8 times).
4. Your final score is `gold × multiplier`. Reach the level **objective**
   (`SCORE.OBJECTIVE_BASE × levelId`) to clear the level.
5. **Rescue pegs:** when a peg drops to 0 HP a shrinking ring appears — tap it
   within 2 s to save it with 1 HP and grow your save combo multiplier.
6. **Upgrade pegs** with the slot machine: the opening spin is free; drag a
   rolled upgrade onto a classic peg. Re-spin (coins) to re-roll every reel.
7. **Spend your winnings:** coins buy per-run peg types in the **boutique**;
   diamonds buy permanent **abilities**. **Mystery** cells and pegs grant
   run-scoped **rewards** (bonus or malus).
8. **Explore the map** and reach the **boss** to win the run.

## Game model

| Concept      | What it is                                              | Doc                                          |
| ------------ | ------------------------------------------------------- | -------------------------------------------- |
| Cannon       | Aimed launcher, one ball per shot                       | [docs/CANNON.md](docs/CANNON.md)             |
| Layer        | One plank of 20 slots                                   | [docs/LAYER.md](docs/LAYER.md)               |
| Slot / Peg   | Horizontal index 0–19 and the obstacle mounted on it    | [docs/SLOT.md](docs/SLOT.md)                 |
| Ball         | The bead in flight (HP, effects, recycles)              | [docs/BALL.md](docs/BALL.md)                 |
| Peg save     | Tap-to-rescue mechanic when a peg reaches 0 HP          | [docs/PEG-SAVE.md](docs/PEG-SAVE.md)         |
| Slot machine | Peg-upgrade drum inside the pinboard                    | [docs/SLOT-MACHINE.md](docs/SLOT-MACHINE.md) |
| Currency     | Coins and diamonds                                      | [docs/CURRENCY.md](docs/CURRENCY.md)         |
| Boutique     | Per-run peg purchases (coins)                           | [docs/SHOP.md](docs/SHOP.md)                 |
| Abilities    | Permanent, cross-run upgrades (diamonds)                | [docs/ABILITY.md](docs/ABILITY.md)           |
| Rewards      | Run-scoped bonuses / maluses from mystery sources       | [docs/BONUS.md](docs/BONUS.md)               |

## Configuration & content

All tuning is data. Nothing here needs touching a manager, controller, or
scene — edit the `src/configs/*.js` files (and, for anything player-facing,
the two locale files). The layer rules from
[CLAUDE.md](CLAUDE.md) still apply: **never hardcode a magic value** — add it
to `constants.js` or the relevant `*-defs.js` file.

### Where each constant lives

Global gameplay tuning is grouped in
[src/configs/constants.js](src/configs/constants.js):

| Group                                | Tunes                                                          |
| ------------------------------------ | -------------------------------------------------------------- |
| `PLINKO`                             | Peg sizes, gravity, restitutions, gate widths, recycle cap     |
| `CANNON`                             | Aim cone, launch speed, trajectory preview                     |
| `SCORE`                              | Objective base (`OBJECTIVE_BASE × levelId`) + multiplier rules |
| `TOTAL_LEVELS`                       | Run length (number of levels before the boss)                  |
| `PEG_DEFS`                           | Base HP per peg type                                           |
| `PEG_POINTS`                         | Points a peg awards on hit                                     |
| `EFFECT_DEFS`                        | Elemental effect durations / strengths                         |
| `EFFECT_HIT_SCORE`                   | Bonus points from elemental hits                               |
| `PEG_SAVE`                           | Tap-to-rescue window, combo growth                             |
| `SLOT_MACHINE`                       | Reel count, free spin, re-spin pricing                         |
| `BOMB_RADIUS` / `CHEST_BALL_RELEASE` | Bomb peg blast, chest ball count                               |

Other files in `src/configs/` hold the per-domain content catalogues
described below.

### Abilities (permanent, diamonds)

Edit [src/configs/ability-defs.js](src/configs/ability-defs.js). Each entry is
built with the `ability(id, category, level, modifiers)` helper and pushed to
`ABILITY_DEFS`. To add or change one:

1. Pick a `category` from `ABILITY_CATEGORIES` (`SHOP` / `GATE` / `MAP` /
   `WHEEL`) and a `level` — levels form a **strict prerequisite chain** inside
   a category (L2 is buyable only once L1 is owned). Cost is derived
   automatically: `2^(level-1)` diamonds.
2. Give it `modifiers` — `{ paramKey, op, value }` resolved through
   `abilityManager.resolve()`. `paramKey` **must** exist in `PARAM_KEYS`
   (in `bonus-defs.js`); add a new key there first if needed. `op` is
   `add` → `multiply` → `set` (applied in that order).
3. Add the display strings `ability.<id>` and `ability.<id>.desc` to **both**
   [src/locales/en.js](src/locales/en.js) and
   [src/locales/fr.js](src/locales/fr.js).

See [docs/ABILITY.md](docs/ABILITY.md).

### Run rewards — bonus & malus (mystery only)

Edit [src/configs/bonus-defs.js](src/configs/bonus-defs.js). Rewards are never
bought — they drop from mystery cells/pegs and are run-scoped. Add a `BonusDef`
to `REWARD_BONUSES` or `REWARD_MALUSES`:

- `category` (`BONUS` / `MALUS`), `rarity`, `icon`, and `durationLevels`
  (`null` = whole run).
- One or more of: **`modifiers`** (`{ paramKey, op, value }`, resolved via
  `bonusManager.resolve()`), **`directives`** (one-shot actions from
  `DIRECTIVE_ACTIONS`, e.g. add a ball), **`triggers`** (event-driven, keyed on
  `TRIGGER_EVENTS` → `TRIGGER_ACTIONS`).
- Any new `paramKey`, directive action, or trigger event/action must be added
  to the corresponding map (`PARAM_KEYS`, `DIRECTIVE_ACTIONS`,
  `TRIGGER_EVENTS`, `TRIGGER_ACTIONS`) in the same file.
- Add `bonus.reward.<id>` and `bonus.reward.<id>.desc` to **both** locale
  files.

See [docs/BONUS.md](docs/BONUS.md).

### Boutique & slot machine (peg types)

The boutique sells **peg types** that join the slot-machine pool for the
current run. The two files stay in sync (verified by a test):

- [src/configs/slot-machine-defs.js](src/configs/slot-machine-defs.js) —
  `UPGRADE_TYPE_CATALOG` is the single source of truth for the upgradeable
  type list and each type's `icon`. `DEFAULT_UPGRADE_TYPES` (`fire`, `coin`,
  `bumper`) are always in the pool and therefore never sold.
- [src/configs/peg-shop-defs.js](src/configs/peg-shop-defs.js) —
  `PEG_SHOP_DEFS` lists which non-default types the boutique offers and their
  coin `cost` (100–1000, by power). Icons are pulled from the slot-machine
  catalogue via `iconForUpgrade()`.

To sell a **new** peg type: add its `PEG_TYPES` value + entry in the peg
factory, add it to `UPGRADE_TYPE_CATALOG` (with an icon), then add an `item()`
row to `PEG_SHOP_DEFS`, and finally the `peg_shop.<type>` /
`peg_shop.<type>.desc` locale strings. To just re-price or drop an item, edit
`PEG_SHOP_DEFS` alone.

See [docs/SHOP.md](docs/SHOP.md) and
[docs/SLOT-MACHINE.md](docs/SLOT-MACHINE.md).

## Architecture

See [CLAUDE.md](CLAUDE.md) for the full architectural guide. Short version:

- **Configs** — every constant in [src/configs/constants.js](src/configs/constants.js); domain defs in the sibling `*-defs.js` files.
- **Entities** — pure data/logic, zero DOM dependency, fully unit-testable ([Cannon](src/entities/cannon.js), the peg family via [peg-factory](src/entities/peg-factory.js), [ball-factory](src/entities/ball-factory.js), [Layer](src/entities/layer.js), [Slot](src/entities/slot.js), [LevelGrid](src/entities/level-grid.js), [SlotMachine](src/entities/slot-machine.js)).
- **Managers** — singletons: `layout`, `i18n`, `optionsManager`, `audioManager`, `saveManager`, `notify`, plus the gameplay managers `currencyManager`, `diamondManager`, `abilityManager`, `bonusManager`, `pegShopManager`.
- **Controllers** — `GameController` owns the round: DOM tree, cannon input, state, layer stack, RAF physics loop, score/objective tracking, and end-of-round detection. Scenes stay thin.
- **Scenes** — `TitleScene`, `LevelSelectorScene` (the map), `GameScene`, `ShopScene`, `AbilityScene`.
- **Physics** — pure helpers in [src/utils/physics.js](src/utils/physics.js); 3 substeps per frame, circle–circle collision, velocity reflection.
- **Single visual identity** — cardboard tokens in [src/styles/tokens.css](src/styles/tokens.css). One file to rebrand.
- **Dev affordances** — DEV-only safe-zone overlay, admin panel, and a Styleguide scene showing every UI primitive.

## License

[MIT](LICENSE)
