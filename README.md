# Pawko

A Plinko-style cat game built on a mobile-first Vanilla JS + Vite + Capacitor
template. Drop balls (curious mice), watch them bounce off pegs and bumpers
arranged in stacked layers, and save as many as you can to unlock the next
layer. Reach level 200 and the cardboard box is yours.

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

## Game layout & vocabulary

```
  ┌──────────────────────────────────┐
  │  [●●●]   [●●●●●●●●●]   [●●●●●]   │  ← Launch zone — 3 sublaunches (Buttons action)
  │          [ Saved ↑ ]             │  ← reload ball and add new layer (Button action)
  │                                  │  ← free space
  │  ·    ·    ·    ·    ·    ·    · │
  │     ·    ◎    ·    ·    ◎    ·   │  Pinboard (layers of pegs)
  │  ·    ·    ·    ★    ·    ·    · │
  │     ·    ·    ·    ·    ·    ·   │  · = peg (classic)
  │  ·    ◉    ·    ·    ·    ◉    · │  ◎ = bumper
  │     ·    ·    ·    ·    ·    ·   │  ◉ = coin peg
  │  ·    ·    ·   ●    ·    ·    ·  │  ★ = shop peg
  │     ◎    ·    ·    ·    ·    ◎   │  ● = ball in flight
  ├─────────┬────────────┬────┬──────┤
  │  SAVE   │  RECYCLE   │ $  │ DRAIN│  ← Collection gates
  │  (25%)  │   (48%)    │(2%)│ (25%)│
  ├──────────────────────────────────┤
  │  Hits: 120 · Lv: 5 · Saved: 3    │  ← HUD (infos)
  └──────────────────────────────────┘
```

### Zone vocabulary

| Zone                 | Description                                                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HUD**              | Persistent overlay: hit counter, level, saved-balls count, and the `Saved ↑` trigger button                                                        |
| **Launch zone**      | Row of **sublaunches** (3 by default) at the top of the pinboard; each holds a queue of balls to drop                                              |
| **Sublaunch**        | One launch cell; balls drop from it one by one with an 80 ms delay between each                                                                    |
| **Pinboard**         | Tall play area that contains all layers; origin is its top-left corner                                                                             |
| **Layer**            | One horizontal plank of up to 20 pegs; layers stack from top (newest) to bottom (oldest); up to 10 layers visible at once                          |
| **Slot**             | A horizontal index (0–19) inside a layer — a *position*, not an entity; the helper `Slot.xFor(index, width)` converts it to a CSS pixel coordinate |
| **Peg**              | Classic obstacle; small dark disc; +1 hit on contact; restitution 0.55                                                                             |
| **Bumper peg**       | Boosted peg; golden disc; +10 hits; restitution 1.05 (ball bounces faster than it arrived); pulsing idle animation                                 |
| **Coin peg**         | Special peg; neutral score; one guaranteed per layer; produces a coin ($$) that flies to the shop chest                                            |
| **Shop peg**         | Destructible peg; has a rarity (common → legendary) and a hit counter; opens the **Shop** when destroyed                                           |
| **Ball**             | The falling bead; carries velocity `(vx, vy)`, a recycle counter, and a set of recently-touched peg IDs (hit dedup)                                |
| **Collection gates** | Adjacent zones at the pinboard bottom that sort arriving balls                                                                                     |
| **Save gate**        | 25 % of width — banks the ball into the Saved counter                                                                                              |
| **Recycle gate**     | 48 % of width — sends the ball back to a random sublaunch (max 8 recycles per ball)                                                                |
| **Shop gate**        | 2 % of width — rare landing spot; opens the Shop modal                                                                                             |
| **Drain gate**       | 25 % of width — ball is lost forever |

### Peg family hierarchy

```
Entity
└── Peg (base — classic peg)
    ├── BumperPeg   (golden, boosted restitution)
    ├── CoinPeg     (1 per layer, drops coins)
    └── ShopPeg     (rarity-based hit counter, opens shop)
```

## How to play

1. **Tap a sublaunch** at the top to drop the balls it holds.
2. Balls fall through the **pinboard**, bouncing on **pegs** (+1) and
   **bumpers** (+10). Every contact adds to the hit counter.
3. At the bottom, four gates sort the balls:
   - **SAVE** — banked into your Saved counter.
   - **RECYCLE** — sent back to a random sublaunch, up to 8 times
     per ball (anti-loop cap).
   - **$** (Shop) — opens the shop (rare, 2 % gate width).
   - **DRAIN** — lost forever.
4. Hit a **coin peg** and a coin flies to the shop chest.
   Hit a **shop peg** enough times and it explodes, opening the shop.
5. When `Saved > 0`, press **Saved ↑**: saved balls are redistributed
   evenly across the sublaunches, a new layer falls in, and your **Level**
   goes up by one.
6. Reach **Level 200** to win. If every sublaunch empties and no balls
   remain, the round ends.

## Game model

| Concept    | What it is                                           | Doc                            |
| ---------- | ---------------------------------------------------- | ------------------------------ |
| Layer      | One plank of 20 slots                                | [docs/LAYER.md](docs/LAYER.md) |
| Slot       | Horizontal index 0–19 inside a layer                 | [docs/SLOT.md](docs/SLOT.md)   |
| ClassicPeg | Basic obstacle, +1 hit                               | [docs/SLOT.md](docs/SLOT.md)   |
| BumperPeg  | Boosted peg, +10 hits, stronger rebound              | [docs/SLOT.md](docs/SLOT.md)   |
| CoinPeg    | Special peg, produces coins for the shop             | [docs/SLOT.md](docs/SLOT.md)   |
| ShopPeg    | Destructible peg, opens shop when destroyed          | [docs/SLOT.md](docs/SLOT.md)   |
| Ball       | The bead in flight                                   | [docs/BALL.md](docs/BALL.md)   |
| Bonus      | Permanent milestone reward or session purchase       | [docs/BONUS.md](docs/BONUS.md) |
| Gates      | Save / Recycle / Shop / Drain at the pinboard bottom | —                              |

All gameplay tuning lives in [src/configs/constants.js](src/configs/constants.js)
under the `PLINKO` block — peg sizes, gravity, restitutions, gate widths,
starting balls, max recycles, max level.

Shop peg rarities and prices live in the `SHOP_PEG_RARITIES` and
`SHOP_PRICES` blocks of the same file.

Bonus definitions (permanent milestones and session bonuses) live in
[src/configs/bonus-defs.js](src/configs/bonus-defs.js).

## Architecture

See [CLAUDE.md](CLAUDE.md) for the full architectural guide. Short version:

- **Configs** — every constant in [src/configs/constants.js](src/configs/constants.js); bonus definitions in [src/configs/bonus-defs.js](src/configs/bonus-defs.js).
- **Entities** — pure data/logic, zero DOM dependency, fully unit-testable ([Ball](src/entities/ball.js), [PegClassic](src/entities/peg-classic.js), [PegBumper](src/entities/peg-bumper.js), [PegCoin](src/entities/peg-coin.js), [PegShop](src/entities/peg-shop.js), [Layer](src/entities/layer.js), [Slot](src/entities/slot.js)).
- **Managers** — singletons (`layout`, `i18n`, `optionsManager`, `audioManager`, `saveManager`, `bonusManager`).
- **Controllers** — `GameController` owns the round: DOM tree, state, layer stack, RAF physics loop, end-of-round detection. Scenes stay thin.
- **Physics** — pure helpers in [src/utils/physics.js](src/utils/physics.js); 3 substeps per frame, circle–circle collision, velocity reflection.
- **Single visual identity** — cardboard tokens in [src/styles/tokens.css](src/styles/tokens.css). One file to rebrand.
- **Dev affordances** — DEV-only safe-zone overlay and a Styleguide scene showing every UI primitive.


## License

[MIT](LICENSE)
