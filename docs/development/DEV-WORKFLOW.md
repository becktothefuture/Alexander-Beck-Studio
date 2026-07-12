# Development workflow

## Setup and daily work

```bash
npm run install:all
npm run dev
```

Vite runs on port 8012. Node `>=20.19.0` and npm `>=10` are required.

## Canonical verification

```bash
npm run check:site
npm run preview
```

`check:site` validates malformed tokens, real Vite HTML entries, the simulation catalog, lint, generated-config parity, production-entry shell parity, config flattening, and the production build. Preview serves that build on port 8013.

Use focused Playwright audits after the server is running. Run transition audits serially in Chromium and WebKit; add `ABS_TRANSITION_STRICT_RAF=1` when motion cadence changed. Run `npm run certify:screens` only from a fresh build.

## Sources of truth

- application: `react-app/app/src/`
- authored design config: `react-app/app/public/config/design-system.json`
- editorial content: `react-app/app/public/config/contents-home.json`, `contents-portfolio.json`
- generated runtime config: `default-config.json`, `shell-config.json`, `portfolio-config.json`, `cv-config.json`
- build output: `react-app/app/dist/`

The root build is release-equivalent. A direct app build bypasses the full config/entry workflow.

## Common commands

```bash
npm run clean
npm run check:design-config
npm run validate:html-entries
npm run sim:validate
npm run audit:canvas-spa
npm run audit:portfolio-gate
npm run audit:portfolio-carousel
npm run audit:portfolio-drawer
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
