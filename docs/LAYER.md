# Layer

A **layer** is a single horizontal plank inside the pinboard. Every round
starts with one layer (level 0); each `Saved ↑` action drops one more from
the top of the screen and bumps the level by one.

## Composition

- **20 slots** per layer (`PLINKO.SLOTS_PER_LAYER`).
- **Alternating fill**: only one slot out of two is occupied. The first
  filled slot — the *start slot* — is randomly picked from
  `PLINKO.START_SLOT_CHOICES = [0, 1, 2]`. This shifts the staggered grid
  from one layer to the next, which is what makes Plinko unpredictable.
- Each filled slot becomes a [`Peg`](../src/entities/peg-classic.js) or, with
  probability `bumperChanceForLevel(level)`, a [`Bumper`](../src/entities/peg-bumper.js).

The probability ramps with level:

```
chance = clamp(BUMPER_CHANCE_BASE + level * BUMPER_CHANCE_PER_LEVEL, 0, BUMPER_CHANCE_MAX)
```

So early layers are mostly pegs; high-level layers reward riskier drops
with extra bumpers.

## Geometry

- All pegs of a layer share the same `y` coordinate — the layer's vertical
  position inside the pinboard, computed at insertion time as:

  ```
  y = LAYER_TOP_PADDING + index * LAYER_HEIGHT
  ```

- Each peg's `x` comes from [`Slot.xFor(slot, pinboardWidth)`](./SLOT.md).

## Animation & camera

- A new layer mounts above the visible area (`translateY: -120%`) and falls
  in over `LAYER_FALL_MS`.
- Once more than `VISIBLE_LAYERS` (10) layers exist, the `.pk-stack`
  wrapper translates upward by one `LAYER_HEIGHT` per extra layer after a
  `CAMERA_RISE_DELAY_MS` pause.
- Layers that scroll fully off the bottom of the pinboard are pruned from
  the DOM — invisible cleanup, the player never notices.

## Visual cue

Every level whose number is a multiple of 10 gets a "milestone" badge on
the left side of the layer (larger font, cream background) so the player
can read their progress at a glance.

## Pure logic

Layer generation is **DOM-free** and fully unit-testable. See
[`tests/entities/layer.test.js`](../tests/entities/layer.test.js) — the
test injects a deterministic RNG to assert the alternating pattern, the
start-slot offset, and the bumper-chance ramp.
