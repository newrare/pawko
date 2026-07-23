# Bonus (Reward) System

Pawko's rogue-lite loop is driven by run-scoped **rewards** — **bonuses** and
**maluses**. They are never bought: a reward is obtained only from a **mystery**
source (a mystery cell on the map, or a mystery peg on the pinboard). Everything
flows through one channel: `bonusManager`, which holds **no persistent state** —
rewards live and die within a single run.

Permanent progression (boutique discount, gates, map reveal, wheels) lives in
[`ABILITY.md`](./ABILITY.md); peg purchases in [`SHOP.md`](./SHOP.md).

## Catalogue split

Definitions live in [`src/configs/bonus-defs.js`](../src/configs/bonus-defs.js):

| List             | Category | Earned by                    | Cleared by                   |
| ---------------- | -------- | ---------------------------- | ---------------------------- |
| `REWARD_BONUSES` | `BONUS`  | mystery cell (choice) / peg  | duration, or `clearSession`  |
| `REWARD_MALUSES` | `MALUS`  | mystery cell (choice) / peg  | duration, or `clearSession`  |

`ALL_BONUSES = [...REWARD_BONUSES, ...REWARD_MALUSES]`.

### Two mystery sources, two behaviours

Both sources draw **weighted by rarity** (`RARITY_WEIGHTS` in `constants.js`):
common outcomes are frequent, legendary ones rare. The shared draw helpers live
in [`src/utils/reward-roll.js`](../src/utils/reward-roll.js). The
`malus_mystery_common` malus sets `MYSTERY_FORCE_COMMON`, which restricts either
source to **common** rewards while active.

- **Mystery peg** (on the pinboard) — a blind **roll**: picks a malus with 30%
  probability, otherwise a rarity-weighted bonus, and queues it for the next
  round via `bonusManager.queueSessionNext`. Destroying a mystery peg counts as
  a mystery **draw** (`bonusManager.onMysteryDraw()`). See
  [`src/entities/peg-mystery.js`](../src/entities/peg-mystery.js).
- **Mystery cell** (on the map) — a forced **choice**: opens
  `MysteryChoiceModal` offering `MYSTERY_CHOICE.COUNT` (2) distinct reward
  cards drawn (rarity-weighted, without replacement) from the **whole
  catalogue** (`ALL_BONUSES` — bonuses AND maluses), and the player must pick
  one (backdrop / Escape closes are disabled), so the choice carries risk.
  Applying a choice counts as a mystery draw. Rewards already active this run
  are excluded from the draw; when fewer than `COUNT` remain, empty slots become
  a **common** currency card granting coins or diamonds (amounts from
  `MYSTERY_CHOICE.FALLBACK_*` in `constants.js`). The pure draw logic lives in
  [`src/utils/mystery-choice.js`](../src/utils/mystery-choice.js)
  (`buildMysteryChoices`); cards are rendered with the shared **power card**
  ([`src/components/ui/power-card.js`](../src/components/ui/power-card.js),
  styled in `power-card.css`) — hero icon, background watermark, footer stat
  list (duration + type) and a pop-out rarity badge — previewed in the style
  guide. Accent and animation are gated per rarity:
  - legendary — gold, shimmer + ping radar
  - epic — crimson, shimmer
  - rare — rose · common — rose-dim (static)
  - malus — inverted card (dark surface, dashed badge, static)

## Three kinds of effect

A reward def can carry any combination of:

1. **modifiers** — `{ paramKey, op, value }`, resolved on every
   `bonusManager.resolve(paramKey, base)` while active (order add → multiply → set).
2. **directives** — one-shot actions queued on activation, drained once per round
   by the controller (`consumeDirectives`).
3. **triggers** — event-driven effects fired by the controller when a matching
   gameplay event happens.

```js
{
  id: "reward_coins_x2",
  category: BONUS_CATEGORIES.BONUS,
  rarity: "rare",
  icon: "🪙",
  durationLevels: 3, // null = run-scoped (Infinity)
  modifiers: [
    { paramKey: PARAM_KEYS.DESTROY_COIN_MULTIPLIER, op: "multiply", value: 2 },
  ],
}
```

### Duration — three countable units

An active reward carries a `{ unit, remaining }` counter (`unit` ∈
`DURATION_UNITS`: `level` / `shop` / `mystery` / `run`). Two ways to declare it
on a def:

- **`durationLevels: null`** → run-scoped: stored as `Infinity`; never ticked;
  cleared only on a new run. **`durationLevels: N`** → ticks once per level
  (`unit: 'level'`). Used by bonuses.
- **`durationRandom: true`** → the duration is **rolled at activation** from
  `RANDOM_DURATIONS` — one of {1, 5} in each unit (`level` / `shop` / `mystery`)
  or the whole run (7 options, uniform). Used by **every malus**.

Each unit is ticked by its own game-controller event:

| unit      | ticked by                      | fired when                       |
| --------- | ------------------------------ | -------------------------------- |
| `level`   | `bonusManager.onLevelUp()`     | a level is completed (victory)   |
| `shop`    | `bonusManager.onShopVisited()` | the boutique is entered          |
| `mystery` | `bonusManager.onMysteryDraw()` | a mystery reward is drawn        |
| `run`     | — (never)                      | cleared only on a new run        |

On reaching 0 the entry is removed and the optional `onExpire()` fires.

### Variable magnitudes

A modifier may carry `values: [...]` instead of `value`; one magnitude is
**rolled at activation** and frozen on the session entry (e.g. `malus_shop_price`
rolls ×2 / ×5 / ×10, `malus_score_penalty` rolls ×0.90…×0.70). `resolve()` reads
these frozen per-entry modifiers, not the def.

## Triggers

```js
triggers: [
  { on: TRIGGER_EVENTS.PEG_DESTROYED, action: TRIGGER_ACTIONS.ADD_HIT_SCORE, payload: { points: 50 } },
  { on: TRIGGER_EVENTS.EFFECT_CANCELLED, action: TRIGGER_ACTIONS.ACTIVATE,
    match: { cancelled: "burning", by: "frozen" }, payload: { bonusId: "reward_score_total_x2" } },
]
```

Events (`TRIGGER_EVENTS`): `PEG_DESTROYED`, `PEG_SAVED`, `EFFECT_CANCELLED`.
Actions (`TRIGGER_ACTIONS`): `ADD_HIT_SCORE`, `SPAWN_BALL`, `ADD_COINS`, `ACTIVATE`.
An optional `match` object filters the event by context fields.

The controller emits events at their choke points (`#destroyPeg`, `#onPegSaved`,
the fire/ice cancel branch in `#registerHit`) and dispatches through
`#applyTriggers(event, ctx)`, which reads `bonusManager.getActiveTriggers(event)`.

## Reward catalogue (current)

Bonuses: `reward_score_total_x2` (SCORE ×2), `reward_peg_destroy_50` (+50/peg),
`reward_save_spawn_ball`, `reward_ice_quench_x2`, `reward_lucky_reel`
(10% chance a reel rolls an unbought boutique peg), `reward_coins_x2/x3`,
`reward_extra_recycles`, `reward_extra_ball`, `reward_bomb_radius`.

Maluses (all roll a random duration; variable magnitudes rolled at activation):
`malus_obfuscate_level_number` (Blind — hide level numbers),
`malus_shop_price` (Racket — boutique price ×2/×5/×10),
`malus_cannon_misfire` (Misfire — 10/30/50% a ball detonates at the muzzle),
`malus_mystery_common` (Jinx — mystery draws common-only),
`malus_objective_double` (Double Trouble — target score ×2),
`malus_slot_no_reroll` (Jammed — no slot re-spin),
`malus_slot_common` (Cheap Reels — slot rolls common pegs only),
`malus_score_penalty` (Handicap — score ×0.90…×0.70).

## Manager API

```js
bonusManager.activateSession(id);     // any reward (bonus or malus)
bonusManager.activateMalus(id);       // MALUS only
bonusManager.queueSessionNext(id);    // activate at next round start
bonusManager.consumeQueuedSessions();
bonusManager.isSessionActive(id);
bonusManager.getActiveSession();      // [{ id, remaining, unit, def }]
bonusManager.getActiveTriggers(event);// [{ def, trigger }]
bonusManager.consumeDirectives();     // [{ action, payload }]
bonusManager.onLevelUp();             // tick level-scoped durations
bonusManager.onShopVisited();         // tick shop-scoped durations
bonusManager.onMysteryDraw();         // tick mystery-scoped durations
bonusManager.clearSession();          // new run / game over
bonusManager.resolve(paramKey, base);
bonusManager.getAllBonuses(); bonusManager.getAllMaluses();
bonusManager.resetAll();
```

## Adding a new reward

1. Pick/add a `PARAM_KEYS` entry (modifier), a `DIRECTIVE_ACTIONS` (directive),
   or a `TRIGGER_EVENTS`/`TRIGGER_ACTIONS` pair (trigger).
2. Add the def to `REWARD_BONUSES` or `REWARD_MALUSES`.
3. Localize `bonus.reward.<id>` / `bonus.malus.<id>` (+ `.desc`) in `en.js` and `fr.js`.
4. Wire the consumer: `bonusManager.resolve(...)`, a `case` in
   `#applyRoundDirectives`, or a `case` in `#applyTriggers`.
5. Test in `tests/managers/bonus-manager.test.js` and `tests/configs/bonus-defs.test.js`.
