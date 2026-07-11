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
- same semantic homepage layer order: Base Frame → App Scene Transform Group → Simulation Wall + Scene Effects → Ball Canvas → Contrast Inner-Shadow Veil → UI Layer → Overlay Layer → Modal Layer;
- same accessible home title source, even when the visible title/subtitle are canvas-rendered through the title-depth path;
- same public config values;
- same generated build output semantics;
- same GitHub Pages deployment target.

## Verification Rule

Any future refactor touching runtime, CSS, HTML boot logic, public config, route transitions, canvas renderer, physics, portfolio stacking, route content, or build/deploy output must state how parity was verified.

Minimum command set for low-risk docs/tooling changes:

```bash
npm run check:malformed-tokens
npm run validate:html-fragments
npm run sim:validate
npm run lint --prefix react-app/app
npm run check:design-config
npm run build
```

`npm run precommit:check` is a lightweight inspection checklist. It does not replace the full local gate, which is `npm run check:site`.

For route, renderer, loop, or canvas remount changes:

```bash
ABS_DEV_URL=http://127.0.0.1:8012 npm run audit:canvas-spa:quick
```

For pointer/touch interaction or title depth layering changes:

```bash
ABS_DEV_URL=http://127.0.0.1:8012 npm run audit:pointer-title-depth
```

For homepage semantic layer, veil, or canvas-title changes, also verify:

```bash
ABS_DEV_URL=http://127.0.0.1:8012 npm run audit:canvas-spa:quick
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-gate:quick
```

For portfolio gate or drawer behavior:

```bash
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-gate:quick
```

For theme preference, route, reload, mobile, or gate-background changes:

```bash
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium npm run audit:theme-consistency
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit npm run audit:theme-consistency
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-gate
```

For shared shell, footer, noise, modal stacking, or route-identity changes:

```bash
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium npm run audit:modal-unified
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit ABS_MODAL_UNIFIED_WAIT_MS=60000 npm run audit:modal-unified
```

This audit compares Home, Portfolio, About, and Contact footer geometry and computed styles at 390×844, 768×1024, and 1280×900. Portfolio must differ only by omitting the middle caption. It also verifies visible shared noise and the modal/light-edge stacking contract.

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
