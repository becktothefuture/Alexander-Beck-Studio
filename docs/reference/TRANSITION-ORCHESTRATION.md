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
- A CSS-generated `html::before` / `html::after` bridge covers the viewport from the critical head style before the body overlay DOM exists; the first-paint browser chrome fallback mirrors `shell.theme.siteFrameDark` in `design-system.json`, and `#abs-boot-overlay` remains the main release/fade layer.
- The first-paint loader is a compact 36px six-dot spinner derived from the exact simulation-system ball palette slots, excluding only the pure white and pure black ball slots. The dots use the loader playground's Fluid Sweep cadence: a roughly 2.24s eased orbit and 4.8px dots on a 14.25px radius. Colour changes are intentionally less frequent: the dots hold a stable palette through most of a roughly 6.72s colour cycle, then run a short stepped burst around the ring using 160ms phase offsets. Saved light and dark themes use the same simulation-system dot palette.
- The overlay must remain visible for at least 750ms on every direct document load before it can begin its exit fade.
- The spinner must disappear as the overlay exit begins; the dark overlay surface carries the soft fade by itself.
- Loaded simulations must not reuse the loader's tight centre-orbit silhouette. If the current home mode uses coloured balls near the title, seed and attract them as an organic page composition so the boot spinner reads as a separate temporary object.
- The overlay is first-paint infrastructure, not route choreography. Final direct-load completion is owned by the active route family: `page-orchestrator.js` for the home canvas route, `SiteApp.jsx` for non-home shell routes, and `DailyFocusShellBridge.jsx` for route-backed Daily Focus direct loads.
- Direct boot completion must first compose the route to final geometry, then set `data-abs-boot-state="revealing"`, release `#root`, and fade/remove the overlay.
- Home direct loads replay the non-canvas UI entrance one RAF after the overlay is removed.
- Bottom-tab SPA route transitions replay route-owned child entrances through `[data-route-enter]` markers after the destination route is layout-ready. This is the reusable route entrance system, not legacy boot ownership.
- Returning to Home through the SPA runs a compact `home-route-return` simulation-material grow after the new canvas is visually ready. It does not replay the direct-load Home UI choreography; reduced motion settles the simulation immediately.
- Home direct-load entrance order uses named groups: identity first, all six top-left legend labels in visual order, top-right context after the labels are established, then action nav and footer/support chrome. The slow stagger settles in roughly 3.9s.
- `audit:boot-overlay` runs desktop, tablet-emulated, and mobile-emulated profiles by default; set `ABS_BOOT_AUDIT_PROFILE=desktop`, `tablet`, or `mobile` only for focused local reruns.
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
- `legacy/modules/utils/page-nav.js` is fallback-only compatibility for hard document navigation, View Transitions API arrival/departure, bfcache restore, and pre-SPA modal routing state. It may close stale overlays before `pageswap` / `pagehide`, reveal content after a browser View Transition on `pagereveal`, and clear old session navigation flags. It must no-op phase normalization while `useShellRouteTransition` owns `data-abs-route-transition="active"`.

## 6) Surface grouping contract
- Route view ownership is intentionally two-slot: `simulationLayer` for page-owned wall/content, and `uiLayer` for page-owned chrome/actions. Optional `heroLayer` belongs to the route simulation/content side.
- Button Bar and the footer are stable shell controls; route transitions must not animate or hide them.
- The stable shell preserves explicit transition surfaces as implementation details: wall, hero, chrome, and route secondary content.
- Route-in restores readable groups first, then animates route-owned children marked with `[data-route-enter]`.
- `[data-route-enter]` accepts the named groups `identity`, `legend`, `context`, `action`, and `footer`; `data-route-enter-order` controls order inside a group. Add these markers to route content instead of adding new shell selectors when a view needs child-level entrance motion.
- After `abs:route-ready`, route-in must wait for a short paint barrier before preparing child entrances so destination refs, layout, and `[data-route-enter]` markers belong to the new route.
- Portfolio route-in must restore hero + route UI together before slider labels / pit accents become readable.
- First readable route-in frame must already have final geometry for the hero surface inside the inner wall.

## 7) Instrument Wake
- Bottom-tab route switches use the named Instrument Wake transition inside `useShellRouteTransition`; this remains part of the single route owner, not a second state machine.
- `<html data-abs-instrument-wake="out|in">` is an effect marker only. The canonical route phase remains `data-abs-transition-phase="route-out|route-in|idle"`.
- Instrument Wake targets route-owned window content surfaces: studio window, hero, chrome, and route secondary content. It must not target `.fade-content` as a whole, `.button-bar` / legacy `.shell-bottom-band`, `#portfolio-sheet-host`, or modal layers.
- Timing is intentionally fast: outgoing content is roughly 110ms; incoming content is roughly 165ms. The former masked gradient sweep is intentionally disabled; `data-abs-instrument-wake` remains an internal marker only.
- Child route entrances use the same named groups as the home post-boot entrance, but with a compact route cadence so bottom-tab clicks remain responsive; persistent shell controls remain stable while the route's own elements animate in.
- Reduced motion disables blur, depth scaling, and the window pass while preserving the route phase cleanup back to `idle`.

## 8) Validation gate for transition changes
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

## 9) PR acceptance checklist (transition-related work)
- [ ] Transition owner remains centralized in shell hook/FSM.
- [ ] No new direct orchestration class/dataset toggles in legacy modules.
- [ ] SPA bootstraps do not call boot-only reveal helpers during active route phases.
- [ ] Direct document loads hold `#abs-boot-overlay` until the route is visually ready.
- [ ] First readable gated home → portfolio frame has hero inside the inner wall and no geometry snap afterward.
- [ ] Chromium/WebKit audits pass (normal + strict RAF).
- [ ] In-flight and settled checkpoint artifacts are generated.
- [ ] `certify:screens` passes.
