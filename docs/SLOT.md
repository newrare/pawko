# Slot, Peg & Bumper

A **slot** is a horizontal index inside a layer (0..19). It is a *position*,
not an entity — there is no `Slot` instance, just helpers.

A **peg** is the actual obstacle mounted on a slot. Layers spawn **classic
pegs only**; every special variant (bumper, coin, fire, …) is produced by
dragging a slot-machine upgrade onto a classic peg
(see [SLOT-MACHINE.md](./SLOT-MACHINE.md)). All peg types are pure-data
entities that the controller pairs with a `.pk-peg` DOM node.

## Slot

Implementation: [`src/entities/slot.js`](../src/entities/slot.js).

```js
Slot.count                 // PLINKO.SLOTS_PER_LAYER (= 20)
Slot.xFor(index, width)    // CSS-px x coordinate for slot `index`
Slot.isClear(index, width) // false when the peg would hug a side wall
```

`Slot.xFor` evenly partitions `width` into `count` cells and returns the
center of cell `index`:

```
step = width / SLOTS_PER_LAYER
x    = step / 2 + index * step
```

`Slot.isClear` drops candidate pegs closer than
`PLINKO.PEG_EDGE_MARGIN_RATIO × width` to either wall, keeping the row off the
board border.

## Peg

Implementation: [`src/entities/peg-classic.js`](../src/entities/peg-classic.js).

| Field / getter | Value                           |
| -------------- | ------------------------------- |
| `type`         | `"peg"`                         |
| `radius`       | `PLINKO.PEG_RADIUS` (10 px)     |
| `hp` / `maxHp` | `PEG_DEFS.peg.hp` (10)          |
| `points`       | `PEG_POINTS.peg` (10)           |
| `restitution`  | `PLINKO.RESTITUTION_PEG` (0.40) |

Visual: small dark cocoa disc with a soft drop shadow.

## Bumper

Implementation: [`src/entities/peg-bumper.js`](../src/entities/peg-bumper.js).
Subclasses `Peg` so collision code never branches on type. It is one of the
three default slot-machine upgrades (`fire`, `coin`, `bumper`).

| Field / getter | Value                              |
| -------------- | ---------------------------------- |
| `type`         | `"bumper"`                         |
| `radius`       | `PLINKO.BUMPER_RADIUS` (10 px)     |
| `hp` / `maxHp` | `PEG_DEFS.bumper.hp` (10)          |
| `points`       | `PEG_POINTS.bumper` (30)           |
| `restitution`  | `PLINKO.RESTITUTION_BUMPER` (1.00) |

Visual: golden radial gradient with a brown ring, gently pulsing while idle
and flashing on contact.

## Family hierarchy

Every peg type is built through
[`createPeg(type, opts)`](../src/entities/peg-factory.js) and subclasses `Peg`:

```
Peg (classic)
├── Bumper       CoinPeg      DiamondPeg   MysteryPeg   ChestPeg
├── ShieldPeg    GluePeg      TeleportPeg
└── FirePeg      IcePeg       ElectricalPeg   BombPeg
```

Each peg participates in the contact pipeline through a small contract, so the
controller never branches on a peg-specific field:

| Hook                  | Default                  | Overridden by                                                    |
| --------------------- | ------------------------ | ---------------------------------------------------------------- |
| `points`              | `PEG_POINTS[type]`       | keyed by type; reward pegs return 0                              |
| `restitution`         | `PLINKO.RESTITUTION_PEG` | `Bumper` (`RESTITUTION_BUMPER`)                                  |
| `radius`              | `PLINKO.PEG_RADIUS`      | `Bumper` (`BUMPER_RADIUS`)                                       |
| `cssModifier`         | the peg `type`           | subclasses may remap                                             |
| `takeDamage(n)`       | −n HP, true when dead    | —                                                                |
| `consumeReward(ball)` | `null`                   | coin/diamond (currency), elemental pegs (effect), bomb (explode) |
| `onDestroyed(ball)`   | `null`                   | `ChestPeg` (release balls), `MysteryPeg` (roll reward)           |

Adding a family member = subclass `Peg`, set `this.type`, call `_resolveHp()`,
override the relevant hooks, and register it in
[peg-factory.js](../src/entities/peg-factory.js). The rendering path picks it up
via `.pk-peg.pk-peg--<type>`.

## Tests

[`tests/entities/peg-classic.test.js`](../tests/entities/peg-classic.test.js)
verifies HP/points values and that bumpers inherit cleanly from pegs;
[`peg-points.test.js`](../tests/entities/peg-points.test.js) covers the
per-type point table.
