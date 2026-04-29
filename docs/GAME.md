# GAME — Prototype Design Document

This document captures the gameplay concept currently being prototyped in
[`src/scenes/prototype-scene.js`](../src/scenes/prototype-scene.js). It is
the source-of-truth vocabulary and rule set for any future implementation
of the game.

> **Status:** prototype. Numbers, layout proportions and exact behaviours
> are still being tuned.

---

## 1. Vocabulary

The whole game (code, CSS, copy, future docs) uses the terms below. Avoid
synonyms when possible — every concept has one canonical name.

### 1.1 Layout regions

| Term                | Meaning                                                                                            | CSS class                   |
| ------------------- | -------------------------------------------------------------------------------------------------- | --------------------------- |
| **Safe zone**       | The centred play box computed by `LayoutManager`. Everything below lives inside it.                | `gt-safe`                   |
| **Level zone**      | 5%-wide strip on the **left** edge of the safe zone, full height. Displays the current **level**.  | `gt-proto-level-zone`       |
| **Main column**     | The remaining 95% to the right of the level zone — host of the four stacked panels below.          | `gt-proto-main`             |
| **Launch panel**    | Top **10%** of the main column. Holds the three **launch zones**.                                  | `gt-proto-launch-panel`     |
| **Pinboard**        | Middle **70%** of the main column. The physics arena where balls fall through layers of pegs.      | `gt-proto-pinboard`         |
| **Stack**           | The container inside the pinboard that holds **layers**. Its `translateY` implements the camera.   | `gt-proto-stack`            |
| **Collection panel**| **10%** band below the pinboard. Holds the three **collection zones** (save / recycle / drain).    | `gt-proto-collection-panel` |
| **Status panel**    | Bottom **10%** of the main column. Readouts (hits, drained, saved) plus action buttons.            | `gt-proto-status-panel`     |

### 1.2 Active elements

| Term                | Meaning                                                                                                                     | CSS class               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| **Launch zone**     | One of the three top cells. Holds a stack of balls (`3 / 10 / 5` by default). Tapping the cell **launches** them.           | `gt-proto-launch`       |
| **Open zone**       | The launch zone the player most-recently selected. Recycled and released balls return here first.                           | `.is-open` modifier     |
| **Layer**           | A fixed-height **wooden plank** with **20 slots**. Falls vertically from above and stacks on top of existing layers.        | `gt-proto-layer`        |
| **Slot**            | One of 20 evenly-spaced horizontal positions on a layer. Filled slots alternate (1-in-2) with a peg or a bumper.            | (data only)             |
| **Start slot**      | The first filled slot of a layer (0, 1, or 2 — randomised per layer to vary patterns).                                      | `spec.startSlot`        |
| **Peg** (**nail**)  | A small static circular obstacle that bounces balls. Visually grey/metallic.                                                | `gt-proto-peg`          |
| **Bumper**          | An enlarged peg with extra restitution. Visually golden.                                                                    | `gt-proto-peg--bumper`  |
| **Ball**            | The marble-like physics body that falls from a launch zone, bounces off pegs, and ends in a collection zone.                | `gt-proto-ball`         |
| **Collection zone** | One of the three cells of the collection panel. Each has a distinct fate for the ball that enters it.                       | `gt-proto-collection`   |
| **Save gate**       | Left collection zone. Balls landing here are **saved** (kept for later release).                                            | `--save`                |
| **Recycle gate**    | Middle collection zone. Balls landing here are teleported back into the open launch zone (capped to avoid loops).           | `--recycle`             |
| **Drain zone**      | Right collection zone. Balls landing here are **drained** (lost).                                                           | `--drain`               |
| **World index**     | The unique 0-based ID of a layer, equal to the order in which it was created. Persists for the layer's lifetime.            | `layer.worldIndex`      |
| **Camera**          | The `translateY` applied to the **stack**. Increases as new layers are added so only the top `VISIBLE_LAYERS` stay in view. | `stackOffset`           |

### 1.3 Counters

| Term              | Meaning                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| **Hits**          | Score. Incremented by **+1 every time a ball bounces off a peg** (de-duplicated per ball/peg pair).    |
| **Saved**         | Number of balls currently held in the **save bank**. Releasing them creates a new layer (level +1).    |
| **Drained**       | Number of balls lost to the drain zone since the round started.                                        |
| **Level**         | Total number of layers the player has created since round start. Capped at **`MAX_LEVEL = 200`**.      |
| **Recycle count** | Internal per-ball counter; a ball is dropped from play after `MAX_RECYCLES` recycles to prevent loops. |

---

## 2. Round flow

1. **Setup.** The pinboard is pre-populated with `INITIAL_LEVEL = 10` random
   layers. Launch zones hold the default ball counts `[3, 10, 5]`. Level
   reads `10`. All counters at `0`. Camera offset is `0`.
2. **Launch.** Player taps a launch zone. That zone becomes the **open
   zone**. Its balls drop one by one into the pinboard with a small
   stagger.
3. **Falling.** Balls fall under gravity, collide with pegs (each
   collision: `Hits +1`), and eventually exit through one of the three
   collection zones.
4. **Collection.**
   - **Save gate** → ball is added to the save bank (`Saved +1`).
   - **Recycle gate** → ball is teleported to the top of the **open
     zone** with a randomised x-offset and zero velocity.
   - **Drain zone** → `Drained +1`. Ball removed.
5. **Release-saved (player action).** When the save bank holds at least
   one ball, the **Saved** button in the status panel becomes active.
   Tapping it:
   1. Distributes the saved balls back into the three launch zones
      (evenly; remainder goes to the **open zone** first, then rotates).
   2. **Drops a new layer** onto the pinboard — see §3 below.
   3. Increments **Level** by 1 (capped at `MAX_LEVEL`).
6. **Round end.** When all of these are true: launch zones empty, spawn
   queue empty, no balls in play, save bank empty. The status panel is
   highlighted. The player can press **Replay** to reset to step 1.

---

## 3. Layer / camera system

### 3.1 Layer composition

A layer is a fixed-height rectangle (the **wooden plank**) divided
horizontally into **20 evenly-spaced slots**. The layer is filled by
walking from a randomised **start slot** (`0`, `1`, or `2`) and stepping
by 2 — so every other slot is filled, never two adjacent slots. Each
filled slot receives either a **peg** (default) or a **bumper** (with
probability `BUMPER_CHANCE = 0.3`).

Concretely, a `startSlot = 1` layer fills slots `1, 3, 5, …, 19` (10
fillers); a `startSlot = 2` layer fills slots `2, 4, …, 18` (9 fillers).

### 3.2 Drop animation

When the player releases their saved balls:

1. A fresh layer is created at **world index `level`** (= one above the
   current top).
2. It is initially translated upward by `pinboardHeight` (positioned
   above the visible pinboard) and appended to the **stack**.
3. A `transform` transition (`LAYER_DROP_MS = 480ms`, `ease-out`)
   animates it from `translateY(-pinboardHeight)` back to `translateY(0)`,
   producing the **falling-from-above** effect.
4. In parallel, if the new total exceeds `VISIBLE_LAYERS = 10`, the
   stack's own transform animates from the previous offset to the new
   one — that's the **camera moving up**.
5. Physics peg positions are rebuilt **immediately** when the drop
   starts. Ball physics is **paused** while `dropping = true` to avoid
   visual/physics drift during the 480ms animation.
6. After the animation, layers whose `worldIndex < level - VISIBLE_LAYERS`
   are pruned from the DOM. They have already scrolled below the
   pinboard's bottom edge, so the player never sees them disappear.

### 3.3 Coordinate system

- Each layer is positioned with `bottom: worldIndex * layerH` inside the
  stack. Layer 0 sits at the bottom of the stack; layer N at the top.
- The stack is `position: absolute; bottom: 0; height: 100%`, so its
  bottom edge aligns with the pinboard's bottom.
- The stack's `translateY(stackOffset)` shifts the whole stack down so
  that the topmost `VISIBLE_LAYERS` layers fit inside the pinboard's
  viewport. `stackOffset = max(0, (level - VISIBLE_LAYERS) * layerH)`.
- The `pinboard` has `overflow: hidden`, so layers scrolled below its
  bottom edge are clipped naturally.
- Physics works in **pinboard-local coordinates** — peg positions are
  recomputed from `worldIndex`, `slot`, `layerH` and `stackOffset` on
  every layer change.

---

## 4. Constants

Defined at the top of [`prototype-scene.js`](../src/scenes/prototype-scene.js):

| Constant              | Value          | Purpose                                                  |
| --------------------- | -------------- | -------------------------------------------------------- |
| `LAUNCH_COUNTS`       | `[3, 10, 5]`   | Balls held by each launch zone at round start.           |
| `BALL_RADIUS`         | `7`            | Ball radius in CSS px.                                   |
| `PEG_RADIUS`          | `5`            | Peg radius. Bumper radius is `× BUMPER_RADIUS_MULT`.     |
| `BUMPER_RADIUS_MULT`  | `1.6`          | Bumper-to-peg radius ratio.                              |
| `BUMPER_CHANCE`       | `0.3`          | Probability that a filled slot is a bumper.              |
| `GRAVITY`             | `0.35`         | Vertical acceleration (px/frame²).                       |
| `RESTITUTION`         | `0.72`         | Bounce energy retained on collision.                     |
| `FRICTION`            | `0.999`        | Horizontal damping per frame.                            |
| `MAX_SPEED`           | `14`           | Speed cap (px/frame).                                    |
| `SPAWN_INTERVAL`      | `80` ms        | Stagger between balls of a single launch.                |
| `MAX_RECYCLES`        | `8`            | Per-ball recycle cap (anti-loop).                        |
| `VISIBLE_LAYERS`      | `10`           | Layers shown in the pinboard at all times.               |
| `INITIAL_LEVEL`       | `10`           | Layers pre-populated at round start. Equals `level`.     |
| `MAX_LEVEL`           | `200`          | Hard cap on layers ever created.                         |
| `SLOTS_PER_LAYER`     | `20`           | Number of horizontal slot positions per layer.           |
| `LAYER_DROP_MS`       | `480`          | Layer-fall + camera-shift animation duration.            |

---

## 5. Open questions / future work

These are intentionally **not** implemented in the prototype. They will
be revisited when the prototype graduates to a real game:

- **Win condition.** Currently the round just "ends" when nothing is in
  play. A real game would need a target (level reached, hits target,
  surviving N waves, …).
- **Difficulty curve.** Layer randomness is uniform. Higher levels could
  bias toward narrower peg patterns, more bumpers, or denser layouts.
- **Save bank UI.** A simple counter for now; could become an inventory
  with per-ball provenance (origin launch zone, modifiers).
- **Recycle policy.** Currently sends balls back into the **open** zone.
  Alternatives: original zone, random zone, dedicated recycle queue.
- **Specials.** Only standard pegs and bumpers exist. A full game would
  layer in multipliers, traps, switches, etc.
- **Persistence.** Nothing is saved between sessions. Future game wires
  through `saveManager`.
- **Audio / haptics.** Peg hit, collection, level-up SFX absent.
- **Mobile feel.** Tuning for portrait phones (current default) and
  optional landscape variant.

---

## 6. File map

| Concern                 | File                                                                          |
| ----------------------- | ----------------------------------------------------------------------------- |
| Scene + physics + state | [src/scenes/prototype-scene.js](../src/scenes/prototype-scene.js)             |
| Scene styles            | [src/styles/components/prototype.css](../src/styles/components/prototype.css) |
| Dev nav entry           | [src/utils/dev-overlay.js](../src/utils/dev-overlay.js) — `Prototype` button  |
| Routing                 | [src/main.js](../src/main.js) — dev-only dynamic import                       |
