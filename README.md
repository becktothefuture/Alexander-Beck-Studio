# Alexander Beck Studio

An interactive portfolio built as a React/Vite shell around a live Canvas 2D simulation runtime.

## Start here

```bash
npm run install:all
npm run dev
```

Development runs at `http://127.0.0.1:8012`. The live component reference is `/styleguide.html`.

## Development and release workflow

```bash
npm run studio:dev       # local authoring + safe public phone URL
npm run studio:status    # servers, tunnel, Git, and production-sync state
npm run studio:stop      # stop the managed public development session
npm run studio:check     # canonical local production gate
npm run studio:publish   # verify and push committed main to trigger GitHub Pages
```

Both development servers watch the same working tree, so saved changes update localhost and the public phone URL through Vite HMR. Production remains commit-based and deploys only after a successful push to `origin/main`. See [`docs/deployment/DEVELOPMENT-AND-RELEASE.md`](docs/deployment/DEVELOPMENT-AND-RELEASE.md) for the safety boundary, URL lifetime, and optional stable Cloudflare hostname setup.

The default working rule is: **save to update development, commit to preserve work, and publish to update production**. Start with `npm run studio:status`, use `npm run studio:dev` whenever phone/public review is needed, and use `npm run studio:publish` only when the committed `main` branch is intentionally ready for `beck.fyi`.

## Design

[`DESIGN.md`](DESIGN.md) is the production design constitution for Home, Work/Portfolio, About Me, Contact, and the shared shell. It records the design thesis, cross-route rules, fluid responsive policy, intentional exceptions, and current outliers. Exact authored values remain in `react-app/app/public/config/design-system.json`; component-level usage remains in `docs/reference/SITE-STYLEGUIDE.md` and `docs/reference/COMPONENT-LIBRARY.md`.

## Production

```bash
npm run check:site
npm run preview
```

The root build is canonical. It verifies shared production entry shells, flattens `design-system.json` into runtime configs, then builds all Vite entries into `react-app/app/dist/`.

## Current structure

```text
react-app/app/
├── src/
│   ├── components/app/   SiteApp, StudioShell, Button Bar
│   ├── routes/           Home, Portfolio, About, Contact, tools/labs
│   ├── entries/          Vite entry mounts
│   └── legacy/           active Canvas 2D and imperative route runtimes
├── public/
│   ├── config/           authored design/content JSON + generated configs
│   ├── css/              shared and route CSS
│   └── images/           production media
└── dist/                 generated production build
scripts/                  validation, flattening, audits, capture
docs/reference/           current contracts only
```

The `legacy/` name does not mean unused: it contains the active simulation engine and Portfolio imperative runtime. Obsolete parallel page/template pipelines and historical task packets have been removed.

## Routes

- Home — interactive simulation wall and Daily Simulation focus
- Portfolio — orbital project deck, in-window access gate, detail drawer
- About Me — current About route
- Contact — current contact route

The persistent Button Bar owns primary navigation. Route top bars are utility/back surfaces only.

## Source of truth

- Routes and Button Bar labels: `react-app/app/src/lib/routes.js`
- Shared shell: `react-app/app/src/components/app/StudioShell.jsx`
- Editorial copy: `react-app/app/public/config/contents-home.json` and `contents-portfolio.json`
- Authored design values: `react-app/app/public/config/design-system.json`
- Generated configs: `default-config.json`, `shell-config.json`, `portfolio-config.json`, `cv-config.json`

See `docs/reference/GENERATED-CONFIG.md` for the compatibility-output boundary.

## Verification

`npm run check:site` is the canonical non-browser gate. Browser coverage is supplied by focused Playwright audits, including screen certification, Portfolio gate/carousel/drawer, Canvas SPA stability, boot overlay, performance, and route transitions. There is no unit-test suite; do not describe the project as manual-only.

Current architecture and behavior are documented in:

- `DESIGN.md`
- `docs/reference/SYSTEM-ARCHITECTURE.md`
- `docs/reference/CONFIGURATION.md`
- `docs/reference/CANVAS-RUNTIME.md`
- `docs/reference/PORTFOLIO.md`
- `docs/reference/TRANSITION-ORCHESTRATION.md`
- `docs/reference/LAYER-STACKING.md`
- `docs/reference/PARITY-CONTRACT.md`
