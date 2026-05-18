# Slot, Peg & Bumper

A **slot** is a horizontal index inside a layer (0..19). It is a *position*,
not an entity — there is no `Slot` instance, just helpers.

A **peg** (and its boosted variant the **bumper**) is the actual obstacle
mounted on a slot. Both are pure-data entities that the controller pairs
with a `.pk-peg` DOM node.

## Slot

Implementation: [`src/entities/slot.js`](../src/entities/slot.js).

```js
Slot.count               // PLINKO.SLOTS_PER_LAYER (= 20)
Slot.xFor(index, width)  // CSS-px x coordinate for slot `index`
```

`Slot.xFor` evenly partitions `width` into `count` cells and returns the
center of cell `index`:

```
step = width / SLOTS_PER_LAYER
x    = step / 2 + index * step
```

The half-step inset on slot 0 keeps the row symmetrically padded inside
the pinboard, matching the reference Plinko look.

## Peg

Implementation: [`src/entities/peg-classic.js`](../src/entities/peg-classic.js).

| Field         | Value                           |
| ------------- | ------------------------------- |
| `type`        | `"peg"`                         |
| `radius`      | `PLINKO.PEG_RADIUS` (7 px)      |
| `score`       | `PLINKO.SCORE_PEG` (1)          |
| `restitution` | `PLINKO.RESTITUTION_PEG` (0.55) |

Visual: small dark cocoa disc with a soft drop shadow.

## Bumper

Implementation: [`src/entities/peg-bumper.js`](../src/entities/peg-bumper.js).
Subclasses `Peg` so collision code never branches on type.

| Field         | Value                              |
| ------------- | ---------------------------------- |
| `type`        | `"bumper"`                         |
| `radius`      | `PLINKO.BUMPER_RADIUS` (11 px)     |
| `score`       | `PLINKO.SCORE_BUMPER` (10)         |
| `restitution` | `PLINKO.RESTITUTION_BUMPER` (1.05) |

Visual: golden radial gradient with a brown ring, gently pulsing while
idle and flashing on contact. A floating `+10` label spawns on hit.

## Family hierarchy

```
Peg (basic)
├── Bumper  (golden, boosted, opts out of PEG_SCORE_MULTIPLIER)
└── CoinPeg (one-shot, awards coins via `consumeReward()`)
        └── … (future variants — sticky peg, multiplier, magnet, …)
```

Each peg participates in the contact pipeline through a small contract,
mirroring the [Ball variants](BALL.md):

| Hook                     | Default                  | Overridden by                                |
| ------------------------ | ------------------------ | -------------------------------------------- |
| `score`                  | `PLINKO.SCORE_PEG`       | `Bumper` (SCORE_BUMPER), `CoinPeg` (0)       |
| `restitution`            | `PLINKO.RESTITUTION_PEG` | `Bumper` (RESTITUTION_BUMPER)                |
| `appliesPegMultiplier`   | `true`                   | `Bumper` (`false`)                           |
| `scoreForContact()`      | base, ice=0, burn÷2      | `CoinPeg` (always 0)                         |
| `consumeReward(ball)`    | `null`                   | `CoinPeg` (returns coin payout directive)    |
| `onAfterScored()`        | decay one ice charge     | —                                            |

Adding a new family member is as simple as subclassing `Peg`, overriding
the relevant hooks, and giving it a `type` tag. The `Layer` factory will
pick it up via the existing rendering path (`.pk-peg.pk-peg--<type>`).

## Tests

[`tests/entities/peg-classic.test.js`](../tests/entities/peg-classic.test.js) verifies
score values and that bumpers inherit cleanly from pegs.
