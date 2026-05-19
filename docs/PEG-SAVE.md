# Peg Save System

## Overview

The **Peg Save System** adds a reactive interactivity layer to the pinboard.
When any peg's HP reaches 0 (destruction), instead of disappearing instantly,
a **rescue circle** appears around it. The circle shrinks over 2 seconds — if
the player taps/clicks the peg before the circle closes, the peg is **saved**
with 1 bonus HP. If the timer expires, the peg is destroyed normally.

This mechanic makes the pinboard more interactive, dynamic, and strategic:
players must have fast reflexes **and** choose wisely which pegs to rescue
(e.g. diamond pegs, shield pegs) and which to let die.

## Gameplay Rules

| Rule                      | Value                   |
|---------------------------|-------------------------|
| Rescue window             | 2 000 ms                |
| HP restored on save       | 1                       |
| Save combo bonus per save | +0.1× multiplier        |
| Combo decay timeout       | 5 000 ms without a save |

## Combo Multiplier

Each successful save increments a **save combo multiplier**:

- First save: ×1.1
- Second save (within 5 s): ×1.2
- Third consecutive save: ×1.3
- …and so on

If the player does not save any peg within 5 seconds, the combo resets to
×1.0. The save combo multiplier is applied to the **total level score** at
the end of the round (stacks with the electric arc combo).

## Visual Feedback

1. **Rescue ring** — a CSS circle (border) placed around the peg via a
   `::before` pseudo-element on the peg DOM element (class `pk-peg--rescuable`).
   The ring starts large (3× peg radius) and shrinks to 0 over the rescue
   duration via a CSS `@keyframes pk-rescue-shrink` animation.

2. **Peg pulse** — while rescuable, the peg itself pulses gently
   (`pk-rescue-pulse` keyframe) to attract attention.

3. **Save flash** — on successful save, a quick green flash (`pk-saved-flash`)
   confirms the action.

4. **Combo HUD** — a small `×1.3` badge appears near the top of the pinboard
   when the save combo is active, similar to the electric combo display.

## Architecture

### Layer: `src/utils/peg-save-system.js`

A **non-singleton utility class** (one instance per game session, owned by
`GameController`). Responsibilities:

- Track which pegs are in the "rescuable" window (Map of pegId → timer).
- Start a rescue when a peg dies (`startRescue(peg, callbacks)`).
- Handle player tap on a rescuable peg (`trySave(pegId)`).
- Maintain the save combo multiplier with decay timer.
- Provide the final combo multiplier for end-of-round scoring.
- Clean up all timers on `dispose()`.

### Integration points

| Where                                      | What                                                                                                |
|--------------------------------------------|-----------------------------------------------------------------------------------------------------|
| `game-controller.js` `#registerHit` step 7 | On `peg.takeDamage(1)` returning true → defer destruction, call `pegSaveSystem.startRescue(peg, …)` |
| `game-controller.js` `#onPointer`          | Check if tap target is a rescuable peg → call `pegSaveSystem.trySave(pegId)`                        |
| `game-controller.js` `#endRound`           | Apply `pegSaveSystem.comboMultiplier` to final score                                                |
| `game-controller.js` `destroy()`           | Call `pegSaveSystem.dispose()`                                                                      |

### Constants: `src/configs/constants.js`

```js
export const PEG_SAVE = {
  RESCUE_DURATION_MS: 2000,
  SAVED_HP: 1,
  COMBO_INCREMENT: 0.1,
  COMBO_DECAY_MS: 5000,
};
```

### CSS: `src/styles/components/peg-save.css`

- `.pk-peg--rescuable` — marks the peg as saveable (adds the pseudo-element ring).
- `@keyframes pk-rescue-shrink` — ring shrinks from scale(3) to scale(0).
- `@keyframes pk-rescue-pulse` — gentle scale pulse on the peg body.
- `.pk-peg--saved` — brief green flash on successful save.
- `.pk-save-combo-hud` — combo multiplier badge display.

## Sequence Diagram

```
Ball hits peg → peg.takeDamage(1) → hp = 0 (died = true)
  │
  ├─ Store deferred reward (peg.onDestroyed)
  ├─ Add .pk-peg--rescuable to DOM element
  ├─ pegSaveSystem.startRescue(peg, { onExpire, onSave })
  │     ├─ Start 2 s timer
  │     └─ Register peg as rescuable
  │
  ├─ [Player taps peg within 2 s]
  │     ├─ pegSaveSystem.trySave(pegId)
  │     ├─ Cancel timer
  │     ├─ Restore peg.hp = 1
  │     ├─ Remove .pk-peg--rescuable, add .pk-peg--saved
  │     ├─ Increment save combo
  │     └─ Reset combo decay timer
  │
  └─ [Timer expires — no tap]
        ├─ onExpire callback
        ├─ Apply deferred reward
        └─ #destroyPeg(peg, null)
```
