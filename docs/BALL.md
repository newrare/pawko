# Ball

A **ball** is the physical bead the player fires from the **cannon**.
Base class: [`src/entities/ball-classic.js`](../src/entities/ball-classic.js).

Only the classic ball exists today. Future variants will live in sibling
`ball-*.js` files; spawn the right one through
[`createBall(kind, opts)`](../src/entities/ball-factory.js).

## Pure data

Like every other entity, `Ball` carries zero DOM dependency. It owns:

| Field         | Meaning                                                                  |
| ------------- | ------------------------------------------------------------------------ |
| `x`, `y`      | Position in pinboard-local CSS pixels.                                   |
| `vx`, `vy`    | Velocity in CSS px/sec.                                                  |
| `hp` / `maxHp`| Hit points. Each peg contact subtracts 1; effects can tick further.      |
| `recycles`    | How many times this ball has gone through the central **return** gate.   |
| `alive`       | Becomes `false` once the ball is destroyed or captured.                  |
| `state`       | One of `"held" \| "active" \| "captured" \| "glued"`.                    |
| `effects`     | Map of active peg-driven effects (`burning`, `frozen`, `electrified`).   |
| `recentPegs`  | Set of peg ids touched in the current contact frame (anti-double-count). |
| `radius`      | `PLINKO.BALL_RADIUS`.                                                    |

Convenience: `ball.canRecycle()` returns `true` while
`ball.recycles < PLINKO.MAX_RECYCLES` (8 by default).

## Variants

A variant overrides a small contract instead of being branched on with
a `switch (ball.kind)` from the controller:

| Hook          | Default                     | Notes                                                         |
| ------------- | --------------------------- | ------------------------------------------------------------- |
| `kind`        | `"classic"`                 | Every subclass returns its own literal string                 |
| `cssModifier` | `""`                        | Subclass returns e.g. `"sniper"` → `.pk-ball pk-ball--sniper` |
| `maxHp`       | `BALL_DEFS.classic.hp` (20) | Subclass sets its own default                                 |

Adding a new ball type = one new file in `src/entities/`, plus the entry
in [ball-factory.js](../src/entities/ball-factory.js) and the
`BALL_KINDS` constant. The controller never branches on a ball-specific
field — keep the variant logic in the entity.

## Peg-driven effects

Elemental pegs (fire / ice / electrical) apply a timed effect to the
ball they hit:

| Effect        | Source          | Behaviour                      | Hit-score |
| ------------- | --------------- | ------------------------------ | --------- |
| `burning`     | `FirePeg`       | DoT: -1 HP every 1 s for 3 s   | +5 / hit  |
| `frozen`      | `IcePeg`        | Speed × 0.5 for 2 s            | +10 / hit |
| `electrified` | `ElectricalPeg` | DoT: -1 HP every 0.5 s for 3 s | ×2 / hit  |

While an effect is active, every peg the ball hits scores more: additive
bonuses are summed then multiplicative factors applied
(`Math.round((base + Σadd) × Πmult)`, see `EFFECT_HIT_SCORE` and
[src/utils/hit-score.js](../src/utils/hit-score.js)). A burning ball hitting a
classic peg scores 15 instead of 10; an electrical ball scores 20.

Durations live in `EFFECT_DEFS` ([src/configs/constants.js](../src/configs/constants.js)).
The controller calls `ball.tickEffects(now)` once per physics frame and
swaps the matching `.pk-ball--on-fire | --frozen | --electrified` class
on the DOM element via `#syncBallEffectClasses`.

## Physics

Balls are stepped by [`GameController`](../src/controllers/game-controller.js)
inside its own `requestAnimationFrame` loop (started lazily when the first
ball spawns and stopped automatically when the last one leaves the board).

For each substep (`PLINKO.SUBSTEPS = 3` per frame for stability):

1. `vy += GRAVITY * dt`
2. Velocity is clamped to `MAX_VELOCITY` to avoid tunneling.
3. Position integrated using `ball.getSpeedMultiplier()` and
   `ball.getGravityMultiplier()` (frozen halves speed and cuts gravity to
   ⅓). Clamped to pinboard walls with `WALL_RESTITUTION` damping.
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
cannon (state="held") → fire → state="active", falls through the pegs
  → scores on each peg contact; elemental pegs apply timed effects
  → may be trapped by a glue peg (state="glued") until released
  → may be destroyed mid-fall when HP reaches 0 (contact damage / DoT)
  → reaches a collection gate at the bottom:
       ├─ x1 / x2 → captured, raises the multiplier (state="captured")
       └─ RETURN  → if canRecycle() sent back to the top (recycles++),
                    otherwise captured
```

## Rendering

The controller pairs each `Ball` with a `.pk-ball` DOM node, positioned by
`transform: translate(x, y)` every frame. There is no canvas; the browser
compositor takes care of GPU acceleration.

## Tests

[`tests/entities/ball.test.js`](../tests/entities/ball.test.js) covers
the base class. The factory is covered by
[`ball-factory.test.js`](../tests/entities/ball-factory.test.js). The
peg-driven effect system (`burning` / `frozen` / `electrified`) is
exercised by
[`tests/entities/peg-elemental.test.js`](../tests/entities/peg-elemental.test.js).
