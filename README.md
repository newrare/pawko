# Game Template

Phaser 3 + Vite + Capacitor starter template for mobile-first games. Ships
with modular managers, a thin-scene architecture, a leak-proof listener
pattern, unit tests under happy-dom, and orientation toggling via a single
constant.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Other commands:

```bash
npm run build        # production build → dist/
npm run preview      # preview the build
npm test             # run unit tests once
npm run test:watch   # watch mode
npm run lint
npm run format
```

Mobile (after `npm run build`):

```bash
npx cap add android
npx cap add ios
npm run cap:android
npm run cap:ios
```

## Configuring orientation

Edit one line in [src/configs/constants.js](src/configs/constants.js):

```js
export const ORIENTATION = ORIENTATIONS.PORTRAIT; // or LANDSCAPE
```

That single source of truth drives the Phaser scale hints, the safe-zone
aspect, and the `[data-orientation]` attribute on `<html>`.

## Folders

- **`docs/`** — detailed documentation in Markdown (tracked by git). Use this for
  in-depth guides, API references, and architectural notes.
- **`drafts/`** — temporary working files (gitignored). Use this for experiments,
  sketches, and files under development that should not be committed.

## Architecture

See [CLAUDE.md](CLAUDE.md) for the full architectural guide. Short version:

- **Configs** — every constant lives here.
- **Entities** — pure data, zero side effects, fully unit-testable.
- **Managers** — singletons for cross-cutting concerns (layout, i18n,
  options, audio, save). Side-effecting managers subscribe to the source
  of truth (`optionsManager`) instead of duplicating state.
- **No theme system** — a single token set lives in
  [src/styles/tokens.css](src/styles/tokens.css). Edit once to rebrand.
- **Dev affordances** — DEV-only safe-zone overlay and a Styleguide
  scene (corner button on the title screen). Both tree-shaken from prod.
- **Controllers** — orchestrate a play session so scenes stay thin.
- **Components** — DOM modals/overlays. All extend `BaseModal`.
- **Scenes** — minimal `Phaser.Scene` shells that delegate.
- **Utils** — pure helpers; `ListenerBag` and `SwipeDetector` live here.

## License

[MIT](LICENSE)
