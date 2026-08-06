# Transition Orchestration Contract

Canonical engineering contract for route and modal transitions.

## 1) Single owner
- **Only** `useShellRouteTransition` may own transition sequencing.
- Canonical phase state lives on `<html data-abs-transition-phase>`.
- Allowed values:
  - `idle`
  - `modal-open`
  - `route-out`
  - `route-loading`
  - `route-in`

### Transaction core and side-effect boundaries

- `src/lib/motion/route-transition-transaction.js` is the deterministic, DOM-free transaction model. It owns legal phase order, generation identity, commit state, timing mode, latest-intent classification, cancellation reason, and the named settlement endpoints `restore-outgoing`, `preserve-covered-destination`, `settle-incoming`, and `discard-detached-content`.
- The hook remains the only phase publisher. The transaction core rejects stale or illegal progress but never writes DOM, React state, focus, history, animations, or accessibility state.
- `route-transition-surfaces.js` owns the one surface descriptor registry plus discovery, inert preservation, commit pinning, visibility, and restoration. Do not add a second list of surface selectors to the hook or a route runtime.
- `route-transition-loader-timing.js` owns the painted-cover timestamp, destination paint barriers, the 120ms adaptive spinner delay, and the spinner's abort-aware minimum hold after escalation. It does not own loader appearance or global phase.
- `route-transition-navigation.js` owns provisional history, final history writes, rollback, and focus settlement. A covered destination is provisional until route-in begins; covered retargets replace that provisional intent without writing an unseen browser entry. Browser Back/Forward has history mode `none`: the browser has already selected the entry, so normal transition settlement must not push or replace it.
- All driver state is created inside the hook transaction or hook lifetime. No active transaction, animation set, timer set, readiness waiter, or mutable driver state may be module-global.

## 2) Legacy role (execute, do not orchestrate)
- Legacy modules may execute visual effects (blur/depth/modal card/cursor behavior).
- Legacy modules must not own route/modal transition sequencing.
- Legacy modules must not directly set orchestration state outside the phase API.
- Legacy boot helpers may reveal direct loads only. They must no-op during every route phase.

## 3) Phase contract
- Entering a modal sets `modal-open`.
- Route transition starts with `route-out`.
- The opaque in-window cover and committed-route readiness barrier use `route-loading`.
- Destination reveal uses `route-in`.
- Settled state returns to `idle`.
- Optional return easing marker: `data-abs-transition-returning="active"`.
- `abs:route-ready` means the destination route is layout-settled enough to reveal, not merely mounted.
- Runtime-backed `abs:route-ready` events include a generation. Readiness consumers compare it with the authoritative module-local runtime snapshot and ignore stale events.
- Home readiness requires the current runtime snapshot, `data-abs-home-route-ready="true"`, and either a confirmed canvas-title draw or the restored three-line semantic title fallback. Canvas allocation alone is not readiness.
- First-load entrance choreography and SPA route choreography are separate systems. Direct-load helpers must not mutate route-in visibility.
- Normal route navigation is one shell-owned transaction: prewarm resolution and route-out run together, a theme-matched plate covers before provisional commit, readiness settles behind the cover, and route-in begins from the same boundary as loader departure and durable history commit. A superseded generation may never commit, reveal, focus, announce, or clean up a newer transaction.
- Optional route-local participants may implement `prepare`, `exit`, `restore`, `waitUntilReady`, `enter`, `cancel`, and `complete`. `restore` returns a retained outgoing route to a usable state after a pre-commit failure. Participants may prepare or animate local material, but they must never mutate the global phase.
- Both systems execute route-owned child reveals through `src/lib/motion/entrance-sequence.js`. Routes declare targets; boot and route owners decide when the shared executor may run.
- Supporting entrance targets fade with opacity only and never animate their layout `transform`; the removed low-radius blur added compositor work and visibly softened small copy in WebKit. The named `bookend-title` variant keeps the title container at settled geometry while internal glyphs appear in reading order through instant, luminance-ordered ball-palette colours and a `10%` left-to-right glyph transform. Title glyphs do not fade or blur. Each entrance transaction captures every bookend title's final colour and opacity once before staging and reuses that endpoint if React recollects the live glyphs before playback. This is one shared contract for Home, Portfolio, About Me, Contact, and Lab. The paired `bookend-description` variant measures rendered lines, animates each line as one text run, then restores the original text so kerning and responsive wrapping remain browser-owned. Positioned or centred containers retain their settled geometry for the complete transaction; expressive scale belongs to the route surface or simulation material layer. While the Home Canvas title is entering, viewport and orientation changes uniformly scale its measured glyph composition around the live semantic title centre. They do not restart its clock, alter its colour endpoint, or stretch one Canvas axis independently, so settlement has no geometry or tone handoff. DOM bookends follow the same rule: their containers remain live and centred, only internal glyph travel animates, and resize cannot restart the clock or change the captured paint endpoint.
- Each target releases its animation fill layer at its own authored endpoint. Endpoint styles remain stable for one painted frame, then the runner removes inline animation state; the final transaction cleanup only settles targets that are still pending. This prevents completed targets from retaining compositor layers until the slowest footer item finishes and avoids a single large cleanup spike.

### Simulation focus overlay ownership

- `useShellRouteTransition` is the sole owner of simulation handoff state through the exact lifecycle `idle → prepare → out → commit → prime → in → idle`. `src/lib/motion/simulation-switch-transaction.js` enforces legal progress, exact-once commit/publication, generation identity, and named failure settlement.
- The chooser may own `simulation-focus-modal-open` only while its dialog is mounted. Providers must not create a second global handoff or blur-suppression class.
- Selecting a different simulation dismisses the chooser and its backdrop immediately. The `out|commit|prime|in` handoff stays unobscured so the material scale-down/scale-up transition remains visible.
- Route-backed runtime preloading runs inside the transition transaction so load failure, history navigation, preemption, and unmount share the same cleanup path.
- Atmosphere replacement participates in the same transaction. Prepare reserves a generation without touching the outgoing source; commit unregisters the outgoing source and resets feedback exactly once; prime arms the target only after runtime readiness; and `in` may begin only after a generation-qualified target render frame and that generation's first atmosphere composite. A compositor fault may resolve the atmosphere leg as degraded, but it never substitutes for the real target frame.
- The coordinator mirrors each lifecycle phase through `setSimulationAtmosphereSwitchPhase(phase, transactionId)`. That marker never freezes prepare/out; the outgoing renderer and compositor remain synchronized until atomic commit. Home-mode → Home-mode prepare sets `reuseActiveDefinition: true`, preserving the mounted source owner while assigning a new logical generation. Route-backed → Home binds through the immutable transaction id, not by comparing the catalog id with `routeId: home`.
- Home bootstrap captures the frozen `runtimeContext.simulationSwitch` once. Daily renderers publish a one-shot real-frame signal from their draw boundary. Neither runtime may recover switch intent from URL, storage, title DOM, or diagnostic globals.
- A committed failure reserves a new rollback generation for the previous runtime and repeats `commit → prime → in`. Stale source registration, frame notification, and disposer calls are no-ops against a newer generation.
- Reduced motion uses the same phases and readiness barriers with zero-duration material transitions: out still settles at scale zero and in at scale one.
- Simulation handoff state must never paint a modal blur on Home or affect Portfolio, About Me, Contact, or another route if state becomes stale.
- Completion, failure, normal route navigation, `popstate`, and unmount all remove the simulation phase, settle or roll back the live atmosphere generation, restore shell surfaces, and dismiss the legacy backdrop. No bitmap snapshot is part of the handoff. The in-window layer is the only visible fade surface.

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
- Boot helpers must no-op during `route-out`, `route-loading`, and `route-in`; SPA route transitions remain owned by `useShellRouteTransition`.
- The localhost-only `?absBootHold=1` hook may hold the overlay for audits, then release through `window.__ABS_RELEASE_BOOT_OVERLAY__()`.

## 5) Forbidden ownership patterns
- Do not reintroduce direct orchestration ownership via:
  - `html.modal-active`
  - `html.modal-returning`
  - `data-abs-route-transition` / `data-abs-gate-transition`
  - `center-stage--modal-hidden`
  - `fade-out-up`
- These may exist for compatibility, but must not be the source of truth for sequencing.
- Do not call `forceBootVisible()` / legacy reveal helpers from SPA bootstraps while a route transition phase is active.
- Do not mutate `entrance-pre-transition`, `entrance-transitioning`, `entrance-complete`, or `ui-entered` during SPA route transitions.
- `legacy/modules/utils/page-nav.js` is fallback-only compatibility for hard document navigation, View Transitions API arrival/departure, bfcache restore, and pre-SPA modal routing state. It may close stale overlays before `pageswap` / `pagehide`, reveal content after a browser View Transition on `pagereveal`, and clear old session navigation flags. It must no-op phase normalization while `useShellRouteTransition` owns `data-abs-route-transition="active"`.

## 6) Surface grouping contract
- Route view ownership is intentionally two-slot: `simulationLayer` for page-owned wall/content, and `uiLayer` for page-owned chrome/actions. Optional `heroLayer` belongs to the route simulation/content side.
- The Button Bar is a stable shell control; route transitions must not animate, hide, recolour, or reposition it. Its dot may retarget to `pendingRouteId` while `aria-current` remains committed. A failed or superseded transition returns the dot to the committed route without creating another transition owner. The footer is Home-only content and remains absent on the other routes.
- The stable shell preserves one descriptor registry for every transition surface: wall, hero, chrome, route secondary content, Home footer, and simulation-focus controls. All hiding, inert management, animation, cancellation, restoration, and diagnostics derive from that registry.
- Stable wrappers expose `data-route-surface` and keyed route children expose `data-route-view`. The Home footer and simulation controls are first-class surfaces; neither may mount visibly before route-in.
- Route-in begins surface resolution and route-owned `[data-route-enter]` children from one coordinated loader-departure boundary. Child delays express hierarchy without serializing the entire surface reveal.
- `[data-route-enter]` accepts the named groups `identity`, `legend`, `context`, `action`, `footer`, and `control`; `data-route-enter-order` controls order inside a group. `bookend-title` and `bookend-description` select the shared title-lockup treatments. `data-route-enter-trigger="deferred"` reserves a lockup for a route-owned visibility trigger, as used by the About finale. The same declaration is used by direct-load and SPA profiles. Add these markers to route content instead of adding new shell selectors when a view needs child-level entrance motion.
- Route-out animates route-owned surfaces as a unit. It does not reverse or replay child staggers; any active child entrance is cancelled and settled before the destination transaction proceeds.
- After `abs:route-ready`, route-in must wait for a short paint barrier before preparing child entrances so destination refs, layout, and `[data-route-enter]` markers belong to the new route.
- Portfolio route-in prepares final deck geometry, restores hero + route UI together, then uses the shell-owned `abs:portfolio:reveal` boundary to start its local cards/dial reveal. Title and description retain the shared `identity` and `context` groups; card transforms remain Portfolio-owned.
- During Portfolio route-in the speed field may paint a deterministic static frame, but it must not schedule drift until the global phase returns to `idle`.
- Contact ripple and About point-field motion also remain static until the global phase returns to `idle`.
- First readable route-in frame must already have final geometry for the hero surface inside the inner wall.

## 7) In-window route loader

- `RouteTransitionLoader` is always mounted inside `#abs-scene` at layer 280. It owns the full studio-window input shield, live status, and optional spinner, including the area behind the overlapping Button Bar, route overlays, and Portfolio sheets. The Button Bar stays visually and interactively above it. The default backdrop remains the live `--studio-window-bg` plate.
- Home <-> Work uses the certified persistent-backplane handoff: `data-abs-route-loader-backdrop="preserve"` makes the loader visually transparent while the stable grain and in-window backplane remain continuously rendered. The loader still blocks route input and carries status/spinner state; registered route surfaces remain independently hidden. All other route pairs retain the opaque fallback until separately certified.
- The route loader and direct boot use the same `.abs-loader-spinner` primitive: eight explicit equal-sided elements with `aspect-ratio: 1`, `border-radius: 50%`, and circular clipping. `#abs-boot-spinner` remains unique to direct boot and fixed-light-on-black; direct boot retains its 750ms minimum, 640ms exit, and 2.4× bloom. SPA dots use `--text-primary` and therefore follow the manual in-window theme.
- SPA loading begins as a loader layer only. The readiness clock starts when the destination is provisionally committed. Readiness inside `spinnerDelayMs` (120ms by default) cancels escalation and creates no artificial loader minimum. Sustained waits show the spinner once; after it appears, `spinnerMinimumMs` (140ms by default) prevents a visual blink. A covered retarget reuses the current loader timing and spinner presence while resolving the correct backdrop mode for its new route pair.
- The remaining compact route profile stays in `shell.motion.routeTransition`: 130ms surface exit, 70ms spinner arrival, 160ms spinner departure capped at 1.45×, and a 220ms destination surface resolve. Opaque-fallback routes crossfade their warm plate immediately over 70ms; once a spinner has genuinely appeared, that plate keeps the more deliberate 40ms-delayed 160ms departure. Persistent-backplane routes retain only the spinner departure.
- Visited-route entrance compression is memory-only and resets on reload. Reduced motion keeps the same phase/readiness barriers, uses a static spinner only after the same genuine-wait threshold, removes the artificial spinner hold and spatial effects, and uses a 120ms opacity handoff.
- Registered route surfaces preserve their prior `inert` state while busy. The Button Bar and polite live status remain outside inert content. `aria-current` follows only the committed route; pending visual state is separate.

### Prewarm and cache boundaries

- Prewarming is preparation only. It may import a route module, fetch and normalize configuration/content, and decode readiness-critical first-view media. It must never mount an inactive route, start a canvas/particle loop, open a gate or drawer, play video, or publish a phase.
- `SiteApp` begins data-level preparation for Home, Portfolio, About Me, Contact, and Playground during direct boot without waiting for those jobs before revealing Home. After Home's essential work and direct overlay settle, eligible background time promotes all five routes to media-level readiness. Hover, focus, pointer-down, and touch intent promote the selected route through the same registry.
- The readiness registry key includes route content signature, viewport class, rounded DPR, manual theme, and canonical design-configuration revision. Route modules, normalized shell/runtime/Portfolio configuration, Home copy and active mode module, Portfolio data, and first-view decoded thumbnails are cached only for the current document. Failed promises are removed where retry can recover. Nothing is stored in local storage, session storage, cookies, or the design configuration.
- `saveData`, `slow-2g`, and `2g` connections skip speculative media decoding; data/module preparation and explicit intent remain allowed. Prewarm signals cancel only the caller's wait, not shared preparation needed by another route intent.
- Portfolio prewarming decodes only the centre, right one, left one, right two, and left two first-view sources. Project-detail media, lazy case-study assets, and video playback are not readiness dependencies.
- Home prewarming imports its route and active simulation-mode modules plus cached copy, but never allocates a canvas, initializes balls, or starts the render loop. Contact caches the design-system configuration; production About is immediately warm. Playground prewarming validates its catalogue and configuration without mounting the camera, dot renderer, video, or code runtimes.

## 8) Instrument Wake
- Bottom-tab route switches use the named Instrument Wake transition inside `useShellRouteTransition`; this remains part of the single route owner, not a second state machine.
- `<html data-abs-instrument-wake="out|in">` is an effect marker only. The canonical route phase remains `data-abs-transition-phase="route-out|route-loading|route-in|idle"`.
- Instrument Wake targets only registered route surfaces. It must not target `.fade-content` as a whole, `.button-bar` / legacy `.shell-bottom-band`, or modal layers.
- Timing comes from `shell.motion.routeTransition`; `data-abs-instrument-wake` remains an internal marker only.
- Child route entrances use the same named groups as the home post-boot entrance, but with a compact route cadence so bottom-tab clicks remain responsive; persistent shell controls remain stable while the route's own elements animate in.
- Reduced motion disables blur, depth scaling, and the window pass while preserving the route phase cleanup back to `idle`.

## 9) Validation gate for transition changes

The portfolio card/project handoff is a local overlay state machine, not a route-transition owner. It may coordinate the deck, project drawer, and temporary media bridge, but it must not mutate `<html data-abs-transition-phase>` or compete with `useShellRouteTransition`. Route change or unmount must abort the local handoff and remove its temporary bridge.

The protected-project gate is also local to Portfolio. It may use the established modal phase/depth helpers, but it must keep the live route mounted, retain only one pending project intent in `PortfolioScrollApp`, fully close before drawer handoff begins, and cancel on dismissal or route unmount. Successful access never performs a same-route navigation.

Run on preview or dev server (serially, not in parallel):

```bash
ABS_DEV_URL=http://localhost:8013 npm run audit:boot-overlay
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:route-title-contract
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:route-title-contract
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium ABS_TRANSITION_VIEWPORT=390x844 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium ABS_TRANSITION_REDUCED_MOTION=1 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium ABS_TRANSITION_STRESS=1 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium ABS_TRANSITION_DELAYED_READINESS=1 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium ABS_TRANSITION_PRELOAD_FAILURE=1 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium ABS_TRANSITION_CPU_THROTTLE_RATE=4 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium ABS_TRANSITION_SEQUENCE=about ABS_TRANSITION_READINESS_DELAY_MS=80 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium ABS_TRANSITION_SEQUENCE=about ABS_TRANSITION_READINESS_DELAY_MS=150 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium ABS_TRANSITION_SEQUENCE=about ABS_TRANSITION_READINESS_DELAY_MS=500 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 npm run audit:route-loader-spinner
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:portfolio-gate
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:portfolio-gate
ABS_DEV_URL=http://localhost:8013 npm run certify:screens
```

Run `npm run check:route-transitions` for the fast deterministic transaction suite before browser work. Transition trace JSON reports phase durations, loader-covered duration, readiness timing, first meaningful destination content, maximum frame interval, Long Task API entries where the browser supports them, and the recorder's own maximum/total per-frame sampling cost. Continuous computed-style recording is intentionally intrusive; treat its cadence as invariant evidence rather than an uninstrumented frame-rate benchmark. Use `ABS_TRANSITION_CPU_THROTTLE_RATE=4` for the constrained Chromium profile and compare like-for-like reports. Reduced-motion checks require the static spinner only when loading lasts long enough for its 80ms opacity establishment; they do not create an artificial hold for a fast cached route. The Portfolio carousel audit has a four-minute default process ceiling; override it with `ABS_PORTFOLIO_AUDIT_TIMEOUT_MS` only after inspecting the reported step and artifacts. Automated checks do not replace the documented follow-up on physical iPhone/Safari and Android/Chrome hardware.

## 10) PR acceptance checklist (transition-related work)
- [ ] Transition owner remains centralized in shell hook/FSM.
- [ ] No new direct orchestration class/dataset toggles in legacy modules.
- [ ] Child entrance mechanics remain in `entrance-sequence.js`; route and boot modules only stage, start, cancel, or settle a transaction.
- [ ] No `[data-route-enter]` animation writes `transform`; responsive positioning remains byte-stable throughout the transition.
- [ ] The shared route-title contract passes in Chromium and WebKit: Home, Portfolio, About Me, Contact, and Lab retain their centred live geometry, captured colour/opacity endpoint, and animation clock through desktop, short-landscape, and phone resizes, with no cleanup jump.
- [ ] SPA bootstraps do not call boot-only reveal helpers during active route phases.
- [ ] Direct document loads hold `#abs-boot-overlay` until the route is visually ready.
- [ ] First readable Home → Portfolio preview frame has final deck geometry, title before card action, and no geometry snap afterward.
- [ ] Continuous-RAF Chromium/WebKit audits pass, plus focused mobile, reduced-motion, rapid-intent, and delayed-readiness probes.
- [ ] Failure traces contain per-frame phase, effective opacity, loader geometry, readiness, inert/busy/current/pending, and focus state.
- [ ] `certify:screens` passes.
