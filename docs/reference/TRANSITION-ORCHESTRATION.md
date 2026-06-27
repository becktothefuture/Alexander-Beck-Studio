# Transition Orchestration Contract

Canonical engineering contract for route and modal transitions.

## 1) Single owner
- **Only** `useShellRouteTransition` may own transition sequencing.
- Canonical phase state lives on `<html data-abs-transition-phase>`.
- Allowed values:
  - `idle`
  - `modal-open`
  - `route-out`
  - `route-in`

## 2) Legacy role (execute, do not orchestrate)
- Legacy modules may execute visual effects (blur/depth/modal card/cursor behavior).
- Legacy modules must not own route/modal transition sequencing.
- Legacy modules must not directly set orchestration state outside the phase API.
- Legacy boot helpers may reveal direct loads only. They must no-op during `route-out` / `route-in`.

## 3) Phase contract
- Entering a modal sets `modal-open`.
- Route transition starts with `route-out`.
- Destination reveal uses `route-in`.
- Settled state returns to `idle`.
- Optional return easing marker: `data-abs-transition-returning="active"`.
- `abs:route-ready` means the destination route is layout-settled enough to reveal, not merely mounted.
- First-load entrance choreography and SPA route choreography are separate systems. Direct-load helpers must not mutate route-in visibility.

## 4) Direct-load boot overlay
- Direct document loads start behind `#abs-boot-overlay`, with `<html data-abs-boot-state="booting">` and `#root` hidden/inert.
- A CSS-generated `html::before` / `html::after` bridge covers the viewport from the critical head style before the body overlay DOM exists; the first-paint browser chrome fallback is `#141517`, and `#abs-boot-overlay` remains the main release/fade layer.
- The first-paint loader is a 32px six-dot spinner using the six canonical `colorDistribution` ball colours, with inline fallbacks so it paints before runtime palette loading.
- The overlay must remain visible for at least 750ms on every direct document load before it can begin its exit fade.
- The spinner must disappear as the overlay exit begins; the dark overlay surface carries the soft fade by itself.
- The overlay is first-paint infrastructure, not route choreography. It may only be completed by direct-load boot helpers in `page-orchestrator.js`.
- Direct boot completion must first compose the route to final geometry, then set `data-abs-boot-state="revealing"`, release `#root`, and fade/remove the overlay.
- Home direct loads replay the non-canvas UI entrance one RAF after the overlay is removed; SPA route transitions do not replay that entrance.
- Home direct-load entrance order uses named groups: identity first, all six top-left legend labels in visual order, top-right context after the labels are established, then action nav and footer/support chrome. The slow stagger settles in roughly 3.9s.
- Boot helpers must no-op during `route-out` / `route-in`; SPA route transitions remain owned by `useShellRouteTransition`.
- The localhost-only `?absBootHold=1` hook may hold the overlay for audits, then release through `window.__ABS_RELEASE_BOOT_OVERLAY__()`.

## 5) Forbidden ownership patterns
- Do not reintroduce direct orchestration ownership via:
  - `html.modal-active`
  - `html.modal-returning`
  - `data-abs-route-transition` / `data-abs-gate-transition`
  - `center-stage--modal-hidden`
  - `fade-out-up`
- These may exist for compatibility, but must not be the source of truth for sequencing.
- Do not call `forceBootVisible()` / legacy reveal helpers from SPA bootstraps while the phase is `route-out` or `route-in`.
- Do not mutate `entrance-pre-transition`, `entrance-transitioning`, `entrance-complete`, or `ui-entered` during SPA route transitions.

## 6) Surface grouping contract
- The shell owns explicit transition surfaces: wall, hero, chrome, footer, and route secondary content.
- Route-in restores readable groups, not selector sweeps.
- Portfolio route-in must restore hero + top chrome + footer together before labels / pit accents become readable.
- First readable route-in frame must already have final geometry for the hero surface inside the inner wall.

## 7) Validation gate for transition changes
Run on preview or dev server (serially, not in parallel):

```bash
ABS_DEV_URL=http://localhost:8013 npm run audit:boot-overlay
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit ABS_TRANSITION_STRICT_RAF=1 ABS_TRANSITION_HARD_TIMEOUT_MS=300000 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-gate
ABS_DEV_URL=http://localhost:8013 npm run certify:screens
```

## 8) PR acceptance checklist (transition-related work)
- [ ] Transition owner remains centralized in shell hook/FSM.
- [ ] No new direct orchestration class/dataset toggles in legacy modules.
- [ ] SPA bootstraps do not call boot-only reveal helpers during active route phases.
- [ ] Direct document loads hold `#abs-boot-overlay` until the route is visually ready.
- [ ] First readable gated home → portfolio frame has hero inside the inner wall and no geometry snap afterward.
- [ ] Chromium/WebKit audits pass (normal + strict RAF).
- [ ] In-flight and settled checkpoint artifacts are generated.
- [ ] `certify:screens` passes.
