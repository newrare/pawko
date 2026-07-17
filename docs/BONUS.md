# Bonus System

Pawko's rogue-lite loop is driven by **bonuses** and **maluses**. Every
modifier the player ever earns flows through one channel: `bonusManager`.

## Catalogue split

Definitions live in [`src/configs/bonus-defs.js`](../src/configs/bonus-defs.js).
There are three top-level lists:

| List               | Type                       | Category    | Earned by                              | Cleared by                  |
| ------------------ | -------------------------- | ----------- | -------------------------------------- | --------------------------- |
| `PERMANENT_BONUSES`| `BONUS_TYPES.PERMANENT`    | `BONUS`     | Shop (coins) — gated by abilities      | `saveManager.resetAll()`    |
| `SESSION_BONUSES`  | `BONUS_TYPES.SESSION`      | `BONUS`     | Shop, mystery peg, mystery cell        | End of run (`clearSession`) |
| `SESSION_MALUSES`  | `BONUS_TYPES.SESSION`      | `MALUS`     | Mystery peg, mystery cell — never sold | End of run, or duration     |

The shop catalogue is `bonusManager.getAll()` which **excludes** maluses
by design. To enumerate every entry use `ALL_BONUSES` directly.

## Anatomy of a definition

```js
{
  id: "session_coin_drop_x2",
  type: BONUS_TYPES.SESSION,
  category: BONUS_CATEGORIES.BONUS,
  cost: 1500,                   // coins for shop entries, 0 for mystery-only
  abilityRequired: null,        // ability id or null = no gate
  rarity: "rare",               // visual tier in shop card
  icon: "🪙",
  durationLevels: 3,            // null = run-scoped (Infinity)
  modifiers: [
    { paramKey: PARAM_KEYS.DESTROY_COIN_MULTIPLIER, op: "multiply", value: 2 },
  ],
  directives: [
    // optional — drained once per round by the controller
  ],
}
```

Notes:

- **`durationLevels: null`** is stored as **`Infinity`** internally and
  is **not** decremented by `onLevelUp()`. The bonus is cleared only by
  `clearSession()` (new run) or by the player choosing to discard it
  (future work).
- **`durationLevels: N`** with N ≥ 1 ticks once per level via
  `bonusManager.onLevelUp()`. When `remaining` reaches 0 the entry is
  removed and the def's optional `onExpire()` callback fires.
- Maluses sit in the same activation list as session bonuses but are
  excluded from `getAll()` so the shop never lists them.

## Modifiers

```js
{ paramKey, op, value }
```

| `op`       | Effect                                              |
| ---------- | --------------------------------------------------- |
| `add`      | sum into the base                                   |
| `multiply` | multiply the post-add total                         |
| `set`      | overwrite (last `set` wins; used for boolean flags) |

Resolution order in `bonusManager.resolve(paramKey, base)` is
**add → multiply → set**, with permanents and session entries
contributing to the same buckets.

Every parameter the engine reads through `resolve()` is enumerated in
`PARAM_KEYS`. Engines should never branch on a bonus id — always
resolve a parameter.

## Directives

Some bonuses can't be expressed as a number — for example "spawn an
extra classic ball into one launcher". These use the **directive queue**:

```js
{ action: DIRECTIVE_ACTIONS.ADD_BALL, payload: { kind: "classic", count: 1, target: "one" } }
{ action: DIRECTIVE_ACTIONS.REMOVE_BALL, payload: { kind: "classic", count: 1 } }
{ action: DIRECTIVE_ACTIONS.TRANSFORM_BALL, payload: { from: "classic", to: "classic", count: 1, target: "all" } }
```

Activation enqueues every directive. The `GameController` calls
`bonusManager.consumeDirectives()` once per round (at `start()`), drains
the queue, and applies each action. Directives are therefore **single-use**
even when the bonus is multi-level.

`target: "all"` repeats the action per sublauncher; `target: "one"`
picks a random sublauncher. `REMOVE_BALL` / `TRANSFORM_BALL` actions are
kept as plumbing for future ball variants; today only `kind: "classic"`
exists.

## Malus catalogue

| id                                | Effect                                           |
| --------------------------------- | ------------------------------------------------ |
| `malus_obfuscate_level_number`    | hides level numbers on the map for one selection |
| `malus_player_hp_drain`           | -3 max HP for the run                            |

Maluses are only obtainable via the **mystery peg** (30% chance) or the
**mystery cell** on the level map (30% chance). They never appear in the
shop.

## Manager API

```js
bonusManager.unlockPermanent(id);     // boolean
bonusManager.isPermanentUnlocked(id);
bonusManager.getUnlockedPermanent();  // [defs]

bonusManager.activateSession(id);     // BONUS only
bonusManager.activateMalus(id);       // MALUS only
bonusManager.isSessionActive(id);
bonusManager.getActiveSession();      // [{ id, remaining, def }]
bonusManager.consumeDirectives();     // [{ action, payload }]
bonusManager.onLevelUp();             // tick durations
bonusManager.clearSession();          // new run

bonusManager.resolve(paramKey, base);

bonusManager.getAll();                // shop catalogue (no maluses)
bonusManager.getAllPermanent();
bonusManager.getAllSession();
bonusManager.getAllMaluses();
bonusManager.resetAll();              // wipe everything (shared with save)
```

## Adding a new bonus

1. **Pick (or add) a `PARAM_KEYS` entry** for the parameter the engine
   should read. If a directive is needed instead, pick (or add) a
   `DIRECTIVE_ACTIONS` constant.
2. **Add the def** to `PERMANENT_BONUSES`, `SESSION_BONUSES`, or
   `SESSION_MALUSES`. Set `durationLevels: null` for run-scoped session
   entries.
3. **Localize** the id: add `bonus.<scope>.<id>` and
   `bonus.<scope>.<id>.desc` keys to **both** `src/locales/en.js` and
   `fr.js` (where `<scope>` is `permanent`, `session`, or `malus`).
4. **Wire the consumer**: have whatever subsystem cares about the new
   parameter call `bonusManager.resolve(PARAM_KEYS.X, base)`. For
   directives, the controller already drains them — add a `case` in
   `#applyRoundDirectives()` if you introduced a new action.
5. **Test** in `tests/managers/bonus-manager.test.js`: resolve()
   stacking, persistence (permanents only), and any directive drain.
