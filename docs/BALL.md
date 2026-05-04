# Ball

A **ball** is the physical bead the player drops from the launch zone.
Implementation: [`src/entities/ball.js`](../src/entities/ball.js).

## Pure data

Like every other entity, `Ball` carries zero DOM dependency. It owns:

| Field         | Meaning                                                                  |
| ------------- | ------------------------------------------------------------------------ |
| `x`, `y`      | Position in pinboard-local CSS pixels.                                   |
| `vx`, `vy`    | Velocity in CSS px/sec.                                                  |
| `recycles`    | How many times this ball has gone through the recycle gate.              |
| `alive`       | Becomes `false` once the ball reaches a save / drain gate.               |
| `recentPegs`  | Set of peg ids touched in the current contact frame (anti-double-count). |
| `radius`      | `PLINKO.BALL_RADIUS`.                                                    |

Convenience: `ball.canRecycle()` returns `true` while
`ball.recycles < PLINKO.MAX_RECYCLES` (8 by default).

## Physics

Balls are stepped by [`GameController`](../src/controllers/game-controller.js)
inside its own `requestAnimationFrame` loop (started lazily when the first
ball spawns and stopped automatically when the last one leaves the board).

For each substep (`PLINKO.SUBSTEPS = 3` per frame for stability):

1. `vy += GRAVITY * dt`
2. Velocity is clamped to `MAX_VELOCITY` to avoid tunneling.
3. Position is integrated and clamped to the pinboard left/right walls
   (`WALL_RESTITUTION` damping).
4. **Collisions** with every peg whose layer y is within one
   `LAYER_HEIGHT` of the ball — circle vs circle, resolved with
   [`collideCircles`](../src/utils/physics.js) and
   [`reflect`](../src/utils/physics.js) using the peg's own
   `restitution` (low for pegs, > 1 for bumpers).
5. **Hit dedupe**: a peg added to `recentPegs` does not score again until
   the ball has cleared it. Removing the entry happens automatically on
   the first frame the collision returns null.

## Lifecycle (one round)

```
launch zone → spawn (y < 0)
            → falls through pegs/bumpers
            → reaches bottom band:
                ┌─ SAVE    → saved += 1, ball removed
                ├─ RECYCLE → if recycles < MAX, sent back to a launch
                │            cell with reset velocity; else drained
                └─ DRAIN   → drained += 1, ball removed
```

## Rendering

The controller pairs each `Ball` with a `.pk-ball` DOM node (a `radial-gradient`
mouse-grey orb), positioned by `transform: translate(x, y)` every frame.
There is no canvas; the browser compositor takes care of GPU acceleration.

## Tests

[`tests/entities/ball.test.js`](../tests/entities/ball.test.js) covers the
recycle counter, default state, and constants binding.
