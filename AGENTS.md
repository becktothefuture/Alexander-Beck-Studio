# AGENTS.md

## Project reality

- The production site is the Vite/React app in `react-app/app/`.
- Every production entry mounts `SiteApp`, which renders `StudioShell` and a route descriptor.
- Routes are Home, Portfolio, About Me, and Contact. The persistent `ShellButtonBar` is the primary navigation.
- The Canvas 2D simulation runtime in `src/legacy/` is active infrastructure. Its directory name is historical; do not delete or rewrite it merely for modernization.
- The canonical authored design source is `react-app/app/public/config/design-system.json`. Generated runtime configs are never hand-edited.

## Commands

- `npm run install:all` — install root and app dependencies
- `npm run dev` — Vite development server on port 8012
- `npm run build` — entry-shell parity check, config flattening, then the Vite production build
- `npm run preview` — serve the production build on port 8013
- `npm run check:site` — canonical local gate: tokens, HTML entries, simulation catalog, lint, config parity, and build
- `npm run certify:screens` — Home, Portfolio, About Me, and Contact across desktop/mobile and light/dark
- `npm run audit:canvas-spa` — backing-store and route-generation checks across SPA hops
- `npm run audit:theme-wall-invariance` — outer-shell invariance plus inner-window theme switching
- `npm run audit:palette-surface-contract` — palette accents plus shell/window token ownership
- `npm run audit:outer-wall-frame` — browser-scheme × site-theme frame/window matrix
- `npm run audit:theme-consistency` — theme persistence, routes, tabs, and independent browser harmony
- `npm run audit:portfolio-gate` — current in-window Portfolio gate flow
- `npm run audit:portfolio-carousel` — current orbital Portfolio deck
- `npm run audit:portfolio-drawer` — Portfolio project drawer
- `npm run audit:transition-flows` — route and project transitions; run serially in Chromium and WebKit

## Architecture and ownership

- Entry: `react-app/app/src/entries/*.jsx`
- App/router: `src/components/app/SiteApp.jsx`
- Shared shell: `src/components/app/StudioShell.jsx`
- Primary navigation: `src/components/app/ShellButtonBar.jsx` + `src/lib/routes.js`
- Route views: `src/routes/`
- Home simulation runtime: `src/legacy/main.js` and `src/legacy/modules/`
- Portfolio deck/drawer/handoff: `src/legacy/modules/portfolio/`
- Editorial content: `public/config/contents-home.json` and `contents-portfolio.json`
- Design config: `public/config/design-system.json`
- Live component reference: `/styleguide.html` and `docs/reference/COMPONENT-LIBRARY.md`

Read the focused reference before changing a contract: `SYSTEM-ARCHITECTURE.md`, `CANVAS-RUNTIME.md`, `PORTFOLIO.md`, `TRANSITION-ORCHESTRATION.md`, `LAYER-STACKING.md`, `CONFIGURATION.md`, or `CUSTOM-CURSOR.md`.

## Implementation rules

- Use ES modules with explicit `.js` extensions.
- Match existing naming: PascalCase classes/components, UPPER_SNAKE_CASE constants, camelCase functions/variables.
- Use design tokens in CSS; avoid unrelated reformatting and `!important`.
- Preserve accessibility, responsive behavior, reduced motion, and 60 FPS hot paths.
- Keep physics-loop work allocation-free and bounded.
- Do not hand-edit generated configs or treat browser storage as design truth.
- A configurable value is complete only when live apply, canonical save, reload, flattening, and preview agree.
- Primary route controls belong in the Button Bar. Route top bars are optional utility/back strips, not a second navigation system.

## Locked visual contracts

- The physical window, outer frame, Button Bar, and outside-window shell do not enter/exit with route content.
- Portfolio project sheets cover route content but stop above the Button Bar. See `LAYER-STACKING.md`.
- Portfolio detail handoff animates the selected media geometry into the drawer hero; preserve reversal and reduced-motion behavior.
- The home canvas owns balls plus the visual title path; semantic DOM copy remains for accessibility.
- Do not add thin helper rings/lines to simulation visuals. Express forces through material motion or broad tonal fields.
- Preserve wall/frame color separation and do not alter wall geometry, radii, shadow plates, or shell colors without explicit scope.
- Manual light/dark theme affects the studio-window interior only: `--studio-window-bg`, `--frame-inner-surface`, in-window finish, route content, simulations, gates, and overlays. Never alias those surfaces to `--abs-wall-base`.
- The exposed band is browser-aware, not site-theme-aware. Preserve `chromeHarmonyMode: auto`: Safari/theme-color browsers use the authored frame palette; locked desktop Chromium/Firefox use browser-native chrome; active outer harmony follows the browser/OS scheme independently of a manual site preference.
- The Button Bar belongs to the stable outer shell. Do not derive its ink/material from `--text-primary` or `--text-muted`, and verify all four route tabs remain legible and selected correctly in both site themes.
- The custom cursor uses the small solid dot on Home/Portfolio backgrounds and the 64px tap ring for Portfolio detail, About, Contact, gates, and modal states. Home-dot sizing is derived from the active canvas mapping; Portfolio uses the same perceptual size.
- Quote puck behavior includes the current air-hockey-style drag/throw response. Do not describe it as drag-only.
- Public Daily Simulation state settles on the clean Home URL.

## Verification

Run the checks proportional to the change, then inspect the final diff. At minimum:

```bash
npm run check:site
```

For visual or routing work, build first, run preview separately, then run the relevant Playwright audits. Transition work requires Chromium and WebKit serial runs; use strict RAF mode when cadence changed. Generated screenshots live under the gitignored `output/playwright/` tree.

Theme/frame work requires the palette-surface, wall-invariance, outer-frame, and theme-consistency audits. Run wall invariance, outer frame, and theme consistency with `ABS_BROWSER=chromium` and `ABS_BROWSER=webkit`, then inspect Home, Portfolio, About Me, and Contact in light/dark at desktop and mobile sizes. A green state-propagation audit is insufficient if window contrast or exposed-frame pixels are wrong.

Do not claim parity from a green build alone. State which routes, viewports, browsers, screenshots, and runtime audits were checked. Do not commit unless explicitly asked.
