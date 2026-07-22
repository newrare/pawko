# Cannon

A single **cannon** sits at the top-center of the pinboard and replaces the
old wide ball reservoir. The player aims it (bubble-shooter style) and fires
**one ball per shot**, re-aiming between shots. The number of balls loaded
scales with the level: level 1 → 1 ball, level 2 → 2, … capped at
`CANNON.BALLS_MAX` (20).

Entity: [`src/entities/cannon.js`](../src/entities/cannon.js).
Config: `CANNON` in [`src/configs/constants.js`](../src/configs/constants.js).

## Pure data

Like every entity, `Cannon` carries zero DOM dependency. It owns:

| Field / getter           | Meaning                                                            |
| ------------------------ | ------------------------------------------------------------------ |
| `pivotX`, `pivotY`.      | Pivot position in pinboard-local CSS px (set by the controller).   |
| `angle`                  | Aim angle in radians. `0` = straight down, `+` = right, `-` = left.|
| `degrees`                | `angle` in degrees for the CSS `rotate()` on the barrel.           |
| `ballsRemaining`         | Balls left to fire.                                                |
| `isEmpty`                | `true` once no balls are left.                                     |
| `muzzle`                 | `{ x, y }` tip position where a ball spawns.                       |
| `launchVelocity(speed?)` | `{ vx, vy }` initial velocity along the current aim.               |

Helpers: `aimAt(px, py)` and `setAngle(a)` both clamp to the downward cone
`±CANNON.MAX_ANGLE` — the barrel can never point flat or upward, so a launched
ball always heads down into the board. `pop()` consumes one ball;
`addBalls(n)` / `removeBalls(n)` adjust the count for bonus/malus directives.

`ballsForLevel(levelId)` returns `min(levelId, CANNON.BALLS_MAX)` (floored at 1).

## Firing flow

The `GameController` owns the DOM cannon (`.pk-cannon`) and the aiming input:

1. **Aim** — `pointerdown` inside the pinboard begins aiming; `pointermove`
   updates the angle (applied synchronously so an instant tap still fires
   toward the tap point). Peg-save and bomb taps consume their own pointer
   events, so they never start an aim.
2. **Preview** — while aiming, the parabolic path is simulated by
   [`simulateTrajectory`](../src/utils/trajectory.js) and painted as a dashed
   line of dots (`.pk-traj-dot`) up to `CANNON.TRAJ_BOUNCES` (2) bounces off
   walls or pegs. The sim mirrors the real substep physics (gravity, wall and
   peg reflection) so the preview matches the actual shot. It is throttled to
   one run per animation frame.
3. **Fire** — `pointerup` launches one ball from the muzzle with
   `launchVelocity()` (initial speed `CANNON.LAUNCH_SPEED`, then gravity
   applies), consumes one cannon ball, and starts the physics loop.

The available-ball count is shown on the cannon hub itself (`.pk-cannon-count`,
centered on the base) — there is no separate ball HUD pill.

The round ends only once the cannon is empty **and** every ball has settled
(see `#checkEndOfRound`).

## Leftover balls → multipliers

Once the **objective is already met** (`finalScore ≥ objective`) but shots are
still loaded, firing them would only pad a score that has already won. Instead,
after the current shot settles `#checkEndOfRound` calls
`#convertRemainingBalls`: each leftover cannon ball is popped and converted into
a **+1 blue multiplier**, one at a time. Each conversion flies an orb
(`.pk-mult-fly`) from the cannon counter to the score-HUD multiplier via
`PinboardVfx.flyBallToMultiplier`, and the multiplier is raised exactly when the
orb lands. When the cannon runs dry the round ends normally. A `#converting`
guard keeps `#checkEndOfRound` from re-entering mid-conversion.

## Trajectory preview

[`simulateTrajectory(opts)`](../src/utils/trajectory.js) is a pure function
(no DOM, no shared state) that integrates the launch with fixed steps and
returns `{ points, bounces, stopReason }`. It stops when one more bounce than
`maxBounces` would occur, when the ball drops below `height`, or at
`maxSteps`. A per-peg recent-contact set de-dups a multi-frame overlap into a
single bounce, matching the ball's own `recentPegs` guard.

## Tuning (`CANNON`)

| Key                | Default | Meaning                                            |
| ------------------ | ------- | -------------------------------------------------- |
| `BALLS_MAX`        | 20      | Cap on balls loaded for a level.                   |
| `LAUNCH_SPEED`     | 640     | Initial ball speed (px/s); gravity then applies.   |
| `MAX_ANGLE`        | 75°     | Half-angle of the aim cone from straight down.     |
| `MUZZLE_LENGTH`    | 30      | Pivot → muzzle distance (px) where a ball spawns.  |
| `PIVOT_OFFSET_TOP` | 24      | Cannon pivot offset below the pinboard top (px).   |
| `TRAJ_BOUNCES`     | 2       | Bounces shown in the dashed preview.               |
| `TRAJ_DT`          | 1/120   | Preview integration step (s).                      |
| `TRAJ_MAX_STEPS`   | 420     | Anti-runaway cap on preview steps.                 |
| `TRAJ_DOT_SPACING` | 15      | Min px between two preview dots.                   |
| `TRAJ_MAX_DOTS`    | 60      | Max dots rendered for the preview line.            |
