# Layer

A **layer** is a single horizontal plank inside the pinboard. Each level loads
`PLINKO.INITIAL_LAYERS` (8) layers at once through `loadPinboard`
([src/utils/pinboard-state.js](../src/utils/pinboard-state.js)); there is no
per-shot layer drop. **Every peg spawns as a classic peg** — special pegs come
only from dragging a slot-machine upgrade onto a classic one
(see [SLOT-MACHINE.md](./SLOT-MACHINE.md)).

## Composition

- **20 slots** per layer (`PLINKO.SLOTS_PER_LAYER`).
- **Alternating fill**: only one slot out of two is occupied. The first
  filled slot — the *start slot* — is randomly picked from
  `PLINKO.START_SLOT_CHOICES = [0, 1, 2]`. This shifts the staggered grid
  from one layer to the next, which is what makes Plinko unpredictable.
- **Edge clearing**: a candidate peg whose center falls within
  `PLINKO.PEG_EDGE_MARGIN_RATIO` of either wall is dropped (`Slot.isClear`),
  so no peg hugs the board border. Rows may therefore end up with fewer pegs,
  which is intended.
- Every filled slot becomes a classic [`Peg`](../src/entities/peg-classic.js)
  via [`createPeg`](../src/entities/peg-factory.js).

## Geometry

Layers are stacked from the **bottom up** — layer 0 sits at the floor, later
layers climb toward the objective line. The controller assigns each layer's
`y` from the pinboard height at render time:

```
y = pinboardHeight - (index + 1) * LAYER_HEIGHT
```

Each peg's `x` comes from [`Slot.xFor(slot, pinboardWidth)`](./SLOT.md); all
pegs of a layer share the layer's `y`. The board is fixed-size for the level —
all layers are placed statically, with no scrolling camera.

## Pure logic

Layer generation is **DOM-free** and fully unit-testable. See
[`tests/entities/layer.test.js`](../tests/entities/layer.test.js) — the test
injects a deterministic RNG to assert the alternating pattern, the start-slot
offset, and the edge-clearing rule.
