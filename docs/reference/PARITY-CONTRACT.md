# Parity Contract

"Frontend unchanged" means the public site should look, feel, boot, route, animate, and deploy the same after a refactor.

## Required Parity

Preserve:

- same public routes and URL aliases;
- same page content and public JSON content;
- same invite-code gate behavior;
- same boot overlay behavior and timing;
- same early theme/chrome first-paint behavior;
- same Canvas visual output;
- same physics, collisions, and pointer response;
- same route transition timings and phase ownership;
- same modal/gate behavior;
- same portfolio drawer stacking above route chrome;
- same CSS, typography, spacing, colors, radius, shadows, blur, and z-index semantics;
- same public config values;
- same generated build output semantics;
- same GitHub Pages deployment target.

## Verification Rule

Any future refactor touching runtime, CSS, HTML boot logic, public config, route transitions, canvas renderer, physics, portfolio stacking, route content, or build/deploy output must state how parity was verified.

Minimum command set for low-risk docs/tooling changes:

```bash
npm run check:malformed-tokens -- --full
npm run validate:html-fragments
npm run lint --prefix react-app/app
npm run check:design-config
npm run build
```

For route, renderer, loop, or canvas remount changes:

```bash
ABS_DEV_URL=http://127.0.0.1:8012 npm run audit:canvas-spa:quick
```

For portfolio gate or drawer behavior:

```bash
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-gate:quick
```

For transition, motion, or routing choreography:

```bash
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit npm run audit:transition-flows
```

Run transition audits serially per browser when validating reliability.

## What A Build Proves

`npm run build` proves the root production build still flattens `design-system.json` before Vite builds `react-app/app/dist/`.

It does not prove:

- visual parity;
- all 21+ modes at 60 FPS;
- mobile/touch behavior;
- browser-specific transition reliability.

Use browser audits or manual QA when a change touches those surfaces.

## Reporting Language

Use one of these statements:

- "Visual parity was verified with: [specific checks]."
- "Visual parity is expected because no runtime, CSS, HTML boot logic, public config values, route transitions, physics, canvas rendering, modal behavior, or public content were changed, and build checks passed."
- "Visual parity cannot be claimed because [specific checks] could not be run."
