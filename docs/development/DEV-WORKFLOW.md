# Development workflow

## Setup and daily work

```bash
npm run install:all
npm run dev
```

Vite runs on port 8012. Node `>=22.19.0` and npm `>=10` are required.

## Canonical verification

```bash
npm run check:site
npm run preview
```

`check:site` validates malformed tokens, real Vite HTML entries, the simulation catalog, Node test suites, lint, generated-config parity, production-entry shell parity, config flattening, and the production build. The Node layer uses the built-in `node:test` runner and includes About narrative, geometry, and route/simulation transaction coverage. Preview serves the production build on port 8013.

Use focused Playwright audits after the server is running. Run transition audits serially in Chromium and WebKit; add `ABS_TRANSITION_STRICT_RAF=1` when motion cadence changed. Run `npm run certify:screens` only from a fresh build.

`npm run audit:work-canvas` checks Work route and compatibility-alias readiness, four-tab navigation, the case-study/snippet hierarchy, two-axis input and wrapping, the deterministic three-layer depth field, centre-before-open sequencing, protected access, case-study drawer, snippet stage, focus/history behavior, Reduced Motion, mobile geometry, theme switching, disposal, and local loading errors. It uses Chromium by default. Set `ABS_BROWSER=webkit` to run the same contract in WebKit. `audit:playground` remains an alias only.

Work remains under construction in production. `npm run dev` and the safe public development mirror show the full canvas; `npm run preview` shows the held production screen. The root build enforces this boundary with `check:work-publication`, and `audit:work-publication` verifies direct URLs, old Lab aliases, query/access attempts, SPA navigation, and history. Publishing does not remove the hold. A separate launch decision is required.

These are three complementary layers: source/configuration checks and build validation, Node tests, and browser audits. A green non-browser gate does not replace the focused Playwright checks required for a changed route or interaction.

## About environment boundary

`react-app/app/src/routes/about/AboutRoute.jsx` lazy-loads the spatial narrative in production and development. The canonical playback source is shared, but the editor, Save endpoint, and authoring diagnostics remain development-only. Use `?edit=0` for local playback without the editor.

## Sources of truth

- application: `react-app/app/src/`
- authored design config: `react-app/app/public/config/design-system.json`
- Home and Work editorial content: `react-app/app/public/config/contents-home.json`, `react-app/app/public/config/contents-portfolio.json`
- About narrative content and choreography: `react-app/app/public/config/contents-about.json`
- generated runtime config: `default-config.json`, `shell-config.json`, `portfolio-config.json`, `cv-config.json`
- build output: `react-app/app/dist/`

The root build is release-equivalent. A direct app build bypasses the full config/entry workflow.

## Common commands

```bash
npm run clean
npm run check:design-config
npm run validate:html-entries
npm run sim:validate
npm run check:about-narrative
npm run audit:canvas-spa
npm run audit:about-narrative
npm run audit:about-interactive-stack
npm run check:work-canvas
npm run audit:work-canvas
npm run audit:transition-flows
npm run certify:screens
```

## Build warnings

The Three.js vendor chunk for point-cloud/lab routes is an accepted large chunk. Treat new route-owned large chunks as regressions requiring an explicit decision.

## Related contracts

- `docs/reference/SYSTEM-ARCHITECTURE.md`
- `docs/reference/CONFIGURATION.md`
- `docs/reference/GENERATED-CONFIG.md`
- `docs/reference/CANVAS-RUNTIME.md`
- `docs/reference/PARITY-CONTRACT.md`
- `docs/reference/MODES.md`
- `docs/reference/PLAYGROUND.md`
