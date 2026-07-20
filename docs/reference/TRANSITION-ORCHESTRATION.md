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
- Runtime-backed `abs:route-ready` events include a generation. Readiness consumers compare it with the authoritative module-local runtime snapshot and ignore stale events.
- Home readiness requires the current runtime snapshot, `data-abs-home-route-ready="true"`, and either a confirmed canvas-title draw or the restored three-line semantic title fallback. Canvas allocation alone is not readiness.
- First-load entrance choreography and SPA route choreography are separate systems. Direct-load helpers must not mutate route-in visibility.
- Both systems execute route-owned child reveals through `src/lib/motion/entrance-sequence.js`. Routes declare targets; boot and route owners decide when the shared executor may run.
- A motion target may animate opacity and filter, but never its layout `transform`. The named `bookend-title` variant may additionally animate a rectangular `clip-path` mask while retaining its settled geometry. Positioned or centred elements retain their settled geometry for the complete transaction; expressive scale belongs to the route surface or simulation material layer.

### Simulation focus overlay ownership

- `useShellRouteTransition` is the sole owner of simulation handoff state through `<html data-abs-simulation-focus-transition="prepare|out|hold|in">`.
- The chooser may own `simulation-focus-modal-open` only while its dialog is mounted. Providers must not create a second global handoff or blur-suppression class.
- Selecting a different simulation dismisses the chooser and its backdrop immediately. The `out|hold|in` handoff stays unobscured so the existing material scale-down/scale-up transition remains visible.
- Route-backed runtime preloading runs inside the transition transaction so load failure, history navigation, preemption, and unmount share the same cleanup path.
- Simulation handoff state must never paint a modal blur on Home or affect Portfolio, About Me, Contact, or another route if state becomes stale.
- Completion, failure, normal route navigation, `popstate`, and unmount all remove the simulation phase, discard retained snapshots when interrupted, restore shell surfaces, and dismiss the legacy backdrop. The in-window layer is the only visible fade surface.

## 4) Direct-load boot overlay
- Direct document loads start behind `#abs-boot-overlay`, with `<html data-abs-boot-state="booting">` and `#root` hidden/inert.
- Portfolio prepares its route content behind the overlay and releases its local entrance from `completeDirectBoot()` only after `onOverlayHidden`; its cards must not finish while the overlay is still visible.
- The critical head style paints the authored dark frame before body markup exists. The early boot script may substitute only a dark Chromium/Firefox approximation when the browser/OS itself is dark; light browser schemes and iOS retain the authored dark frame. `#abs-boot-overlay` remains the main release/fade layer.
- The first-paint loader, its soft shadow, and long-wait copy use fixed light ink on the dark outer-shell surface. Stored or automatic light preference is resolved behind the overlay, so release reveals the light studio window without recolouring the preloader.
- The overlay must remain visible for at least 750ms on every direct document load before it can begin its exit fade.
- The spinner must disappear as the overlay exit begins; the dark overlay surface carries the soft fade by itself.
- Raw `file://` entry previews cannot mount the Vite module graph. They replace the spinner with the concise `npm run dev` preview hint instead of implying that the simulation is still loading.
- Loaded simulations must not reuse the loader's tight centre-orbit silhouette. If the current home mode uses coloured balls near the title, seed and attract them as an organic page composition so the boot spinner reads as a separate temporary object.
- The overlay is first-paint infrastructure, not route choreography. Final direct-load completion is owned by the active route family: `page-orchestrator.js` for the home canvas route, `SiteApp.jsx` for non-home shell routes, and `DailyFocusShellBridge.jsx` for route-backed Daily Focus direct loads.
- Home and route-backed Daily Focus loads may release only after fonts, usable route geometry, the active simulation surface, and two render frames are ready. Home gives the canvas-title geometry a bounded grace period, then releases with the semantic DOM title as its visual fallback. `data-abs-home-simulation-ready` and `data-abs-home-canvas-title-prepared` expose those independent states for diagnostics.
- Direct boot completion first composes the route at full material scale behind the opaque cover. At `data-abs-boot-state="revealing"`, `onRevealStart` resets and blooms the simulation material while only the route-owned studio-window surface eases from `0.97` to `1`; the physical window, outer frame, and Button Bar remain fixed.
- Home direct loads begin the non-canvas UI entrance one RAF after `#abs-boot-overlay` has been removed. Reduced motion preserves the same ordering but settles the scene and copy without scale, blur, or stagger.
- `abs-home-post-boot-pending|enter|complete` and `data-abs-intro-phase` are diagnostics only. CSS must not use those markers to replace target geometry or run a competing transition.
- Once the Home runtime is executing, canvas backing-store readiness is bounded to 3.2 seconds and canvas-title preparation receives a further 1.2-second grace period. Known failures fail open immediately. The CSS-only 5/10/20/30/40-second reassurance remains available while assets are genuinely still downloading, but runtime geometry can never hold the overlay for that duration.
- Bottom-tab SPA route transitions replay route-owned child entrances through `[data-route-enter]` markers after the destination route is layout-ready. This is the reusable route entrance system, not legacy boot ownership.
- Returning to Home through the SPA runs a compact `home-route-return` simulation-material grow after the new canvas is visually ready. It does not replay the direct-load Home UI choreography; reduced motion settles the simulation immediately.
- Home direct-load entrance order uses named groups: identity first, all six top-left legend labels in visual order, top-right context after the labels are established, then action nav and footer/support chrome. The Home simulation selector enters last. The slow stagger settles in roughly 3.9s.
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
- The Button Bar is a stable shell control; route transitions must not animate or hide it. The footer is Home-only content and remains absent on the other routes.
- The stable shell preserves explicit transition surfaces as implementation details: wall, hero, chrome, and route secondary content.
- Route-in restores readable groups first, then animates route-owned children marked with `[data-route-enter]`.
- `[data-route-enter]` accepts the named groups `identity`, `legend`, `context`, `action`, `footer`, and `control`; `data-route-enter-order` controls order inside a group. The same declaration is used by direct-load and SPA profiles. Add these markers to route content instead of adding new shell selectors when a view needs child-level entrance motion.
- Route-out animates route-owned surfaces as a unit. It does not reverse or replay child staggers; any active child entrance is cancelled and settled before the destination transaction proceeds.
- After `abs:route-ready`, route-in must wait for a short paint barrier before preparing child entrances so destination refs, layout, and `[data-route-enter]` markers belong to the new route.
- Portfolio route-in prepares final deck geometry, restores hero + route UI together, then uses the shell-owned `abs:portfolio:reveal` boundary to start its local cards/dial reveal. Title and description retain the shared `identity` and `context` groups; card transforms remain Portfolio-owned.
- During Portfolio route-in the speed field may paint a deterministic static frame, but it must not schedule drift until the global phase returns to `idle`.
- First readable route-in frame must already have final geometry for the hero surface inside the inner wall.

## 7) Instrument Wake
- Bottom-tab route switches use the named Instrument Wake transition inside `useShellRouteTransition`; this remains part of the single route owner, not a second state machine.
- `<html data-abs-instrument-wake="out|in">` is an effect marker only. The canonical route phase remains `data-abs-transition-phase="route-out|route-in|idle"`.
- Instrument Wake targets route-owned window content surfaces: studio window, hero, chrome, and route secondary content. It must not target `.fade-content` as a whole, `.button-bar` / legacy `.shell-bottom-band`, `#portfolio-sheet-host`, or modal layers.
- Timing is intentionally fast: outgoing content is roughly 110ms; incoming content is roughly 165ms. The former masked gradient sweep is intentionally disabled; `data-abs-instrument-wake` remains an internal marker only.
- Child route entrances use the same named groups as the home post-boot entrance, but with a compact route cadence so bottom-tab clicks remain responsive; persistent shell controls remain stable while the route's own elements animate in.
- Reduced motion disables blur, depth scaling, and the window pass while preserving the route phase cleanup back to `idle`.

## 8) Validation gate for transition changes

The portfolio card/project handoff is a local overlay state machine, not a route-transition owner. It may coordinate the deck, project drawer, and temporary media bridge, but it must not mutate `<html data-abs-transition-phase>` or compete with `useShellRouteTransition`. Route change or unmount must abort the local handoff and remove its temporary bridge.

The protected-project gate is also local to Portfolio. It may use the established modal phase/depth helpers, but it must keep the live route mounted, retain only one pending project intent in `PortfolioScrollApp`, fully close before drawer handoff begins, and cancel on dismissal or route unmount. Successful access never performs a same-route navigation.

Run on preview or dev server (serially, not in parallel):

```bash
ABS_DEV_URL=http://localhost:8013 npm run audit:boot-overlay
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit ABS_TRANSITION_STRICT_RAF=1 ABS_TRANSITION_HARD_TIMEOUT_MS=300000 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:portfolio-gate
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:portfolio-gate
ABS_DEV_URL=http://localhost:8013 npm run certify:screens
```

## 9) PR acceptance checklist (transition-related work)
- [ ] Transition owner remains centralized in shell hook/FSM.
- [ ] No new direct orchestration class/dataset toggles in legacy modules.
- [ ] Child entrance mechanics remain in `entrance-sequence.js`; route and boot modules only stage, start, cancel, or settle a transaction.
- [ ] No `[data-route-enter]` animation writes `transform`; responsive positioning remains byte-stable throughout the transition.
- [ ] SPA bootstraps do not call boot-only reveal helpers during active route phases.
- [ ] Direct document loads hold `#abs-boot-overlay` until the route is visually ready.
- [ ] First readable Home → Portfolio preview frame has final deck geometry, title before card action, and no geometry snap afterward.
- [ ] Chromium/WebKit audits pass (normal + strict RAF).
- [ ] In-flight and settled checkpoint artifacts are generated.
- [ ] `certify:screens` passes.
