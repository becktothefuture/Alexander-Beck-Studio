# Action Sequence

## Phase 0: Baseline And Approval

Before implementation:

```bash
git status --short
npm run check:site
npm run build
```

Confirm the product decisions in `README.md`.

## Phase 1: Route Model

PRD:

- `prd-01-route-model-and-bottom-tabs.md`

Goals:

- Add canonical Contact and About route definitions and direct multi-entry shell files.
- Make Portfolio the only gated route.
- Define route-derived active tab state.
- Introduce the shell tab skeleton and stable semantic selectors.
- Update route readiness selectors so transitions no longer depend on `#main-links`.
- Keep transition ownership in `useShellRouteTransition`.

Exit gate:

```bash
git diff --check
npm run check:site
npm run build
```

## Phase 2: Geometry

PRD:

- `prd-02-bottom-shell-geometry-and-canvas.md`

Goals:

- Introduce the bottom shell band and inner window geometry model.
- Keep canvas/physics tied to the inner window, not the tab band.
- Preserve rounded-corner behavior and portfolio drawer stacking.

Exit gate:

```bash
npm run build
npm run check:design-config
ABS_DEV_URL=http://127.0.0.1:8012 npm run audit:canvas-spa:quick
```

## Phase 3: Tab Material

PRD:

- `prd-03-skeuomorphic-tab-material.md`

Goals:

- Implement the tactile tab style.
- Add active route, focus, hover, pressed, pending, reduced-motion states.
- Update styleguide/docs.

Exit gate:

```bash
npm run build
npm run certify:screens
```

## Phase 4: Content Routes

PRDs:

- `prd-04-contact-page-from-modal-content.md`
- `prd-05-about-page-archive-coming-soon.md`

Goals:

- Move Contact content from modal presentation into a route page.
- Archive About/CV content and replace page with centered coming soon.
- Remove Contact and About/CV modal behavior.

Exit gate:

```bash
npm run check:site
npm run build
npm run certify:screens
```

## Phase 5: Portfolio In-Window Gate

PRD:

- `prd-06-portfolio-in-window-gate.md`

Goals:

- Render Portfolio gate inside the inner window.
- Keep bottom tabs visible.
- Preserve portfolio unlock and portfolio deck behavior.

Exit gate:

```bash
npm run check:site
npm run build
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-gate
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-drawer
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-drawer:pointer
```

## Phase 6: Window Content Transition

PRD:

- `prd-08-window-content-transition.md`

Goals:

- Add the fast Instrument Wake transition for content changes inside the window.
- Cover Home, Contact, About, Portfolio locked, and Portfolio unlocked states now that all surfaces exist.

Exit gate:

```bash
npm run check:site
npm run build
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit npm run audit:transition-flows
```

## Phase 7: Audit Migration And Release

PRD:

- `prd-07-audit-migration-and-release-gate.md`

Goals:

- Migrate screenshot, route, modal, gate, transition, and drawer audits.
- Verify on preview.
- Run final visual QA.

Final gate:

```bash
git diff --check
npm run check:site
npm run build
npm run check:design-config
npm run preview
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:boot-overlay
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit ABS_TRANSITION_STRICT_RAF=1 ABS_TRANSITION_HARD_TIMEOUT_MS=300000 npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-gate
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-drawer
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-drawer:pointer
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:modal-unified
ABS_DEV_URL=http://127.0.0.1:8013 npm run certify:screens
```

Run `npm run preview` in a separate terminal and restart it after any subsequent build-affecting change.
