# Bonus System

Two categories of bonuses modify gameplay parameters:

## Permanent Bonuses

Unlocked once at level milestones (every 10 levels). Persist forever in
localStorage under `STORAGE_KEYS.BONUSES`.

| Level | ID                 | Effect                                            |
|-------|--------------------|---------------------------------------------------|
| 10    | `extra_start_ball` | Start each round with 6 balls per launcher        |
| 20    | `shop_magnet`      | Shop pegs attract nearby balls with gravity force |

## Session Bonuses

Obtained randomly from the shop modal. Active only for the current game —
cleared on game over or restart.

| ID               | Effect                                                                              |
|------------------|-------------------------------------------------------------------------------------|
| `bonus_launcher` | Adds 1 extra sublaunch with 5 balls. Lasts 3 levels, then the sublaunch is removed. |
| `score_x2`       | Hit score on classic peg is X2. Lasts 3 levels                                      |

## Architecture

```
src/configs/bonus-defs.js            <- Bonus definitions (pure data)
src/managers/bonus-manager.js        <- Singleton: param resolution + state
src/components/bonus-unlock-modal.js <- Modal shown on milestone unlock
src/styles/components/bonus.css      <- Badge bar + modal styles
```

### Parameter resolution

`BonusManager.resolve(paramKey, baseValue)` applies all active modifiers
to a base value. The controller calls this at key physics/logic sites
instead of reading `PLINKO.*` constants directly.

Modifier stacking order: `add` -> `multiply` -> `set`.

### onExpire callback

Session bonuses can define an `onExpire(ctx)` callback. When a bonus's
`remainingLevels` reaches 0 during `onLevelUp`, the manager calls `onExpire`
with the active bonus context. This allows `bonus_launcher` to remove its
sublaunch when it expires.

### Shop integration

The shop modal is data-driven — it receives a `choices` array built by
`bonusManager.buildShopChoices()`.

### UI

A `.pk-bonus-bar` element between the launch zone and pinboard shows icon
badges for active bonuses:
- Left side: permanent bonuses (always visible once unlocked)
- Right side: session bonuses (pink border, duration counter)

## Adding a new bonus

1. Add the definition to `src/configs/bonus-defs.js` (either
   `PERMANENT_BONUSES` or `SESSION_BONUSES` array).
2. Add locale strings to both `en.js` and `fr.js`:
   - `bonus.permanent.<id>` / `bonus.session.<id>` (name)
   - `bonus.permanent.<id>.desc` / `bonus.session.<id>.desc` (description)
3. If it uses a new parameter key, add it to `PARAM_KEYS` and wire a
   `bonusManager.resolve()` call in the game controller.
4. Run `npm test` and `npm run lint`.

## Persistence

Stored in localStorage under `com.pawko.game.bonuses`:

```json
{
  "unlocked": ["extra_start_ball", "shop_magnet"],
  "activatable": {},
  "highestLevel": 45
}
```

Reset via `bonusManager.reset()` (called by the "Reset all data" option).
