# PRD: Route Transition Quality and Performance Hardening

## Introduction

Strengthen the existing unified route-transition system across Home, Portfolio, About Me, and Contact without changing the frontend visual design.

The current system already prevents the original Home content flash and owns navigation through one shell-level transaction:

`idle → route-out → route-loading → route-in → idle`

It also preserves the physical shell and Button Bar, keeps incoming content hidden until readiness, supports route participants, handles rapid retargeting, and provides reduced-motion and accessibility behavior. Fresh transition analysis nevertheless identified four material opportunities:

1. Portfolio remains behind the opaque loader for too long, including on repeat visits where almost no network transfer occurs.
2. Home re-entry can produce occasional long main-thread tasks near the reveal boundary.
3. The transition coordinator is concentrated in one large React hook, making cancellation and failure behavior harder to test in isolation.
4. Browser audits provide strong end-to-end evidence but lack a deterministic transaction-test layer, and the reduced-motion audit incorrectly requires a fully established spinner during valid short waits.

This work will refactor and optimise the system simultaneously. It will preserve the current appearance and interaction design while improving internal ownership, repeat-route readiness, perceived latency, main-thread scheduling, bundle boundaries, and verification reliability.

## Confirmed Product Decisions

- Scope is the full improvement programme: architecture, Portfolio acceleration, Home long-task reduction, bundle/configuration work, deterministic tests, and audit repairs.
- Architecture refactoring and performance optimisation will be delivered together rather than as separate projects.
- Timing improvements are best-effort and evidence-driven. There are no brittle hard duration gates that fail solely because a particular machine is slower.
- Portfolio prewarming starts during eligible idle time and is reinforced by hover, focus, pointer-down, and touch intent.
- Prewarming may cache route modules, normalized configuration, content data, and decoded first-view Portfolio media in memory.
- The Portfolio route runtime or DOM tree will not remain persistently mounted while another route is active.
- Final certification includes Chromium and WebKit desktop, Chromium mobile, reduced motion, CPU-throttled coverage, and a physical-phone follow-up.
- The frontend visual design must not change.

## Goals

- Preserve the current route-transition composition, timing character, typography, palette, geometry, loader, spinner, stagger order, and persistent-shell behavior.
- Reduce time spent behind the opaque loader, especially on first and repeat Portfolio navigation.
- Make repeat Portfolio visits materially faster by reusing safe in-memory preparation work.
- Ensure the Portfolio center card becomes meaningful as early as readiness safely permits while preserving the existing center-right-left reveal order.
- Move Home simulation preparation away from the exposed route-in boundary and reduce re-entry long tasks.
- Split transition responsibilities into small modules with explicit contracts and one phase owner.
- Add deterministic coverage for phase ordering, cancellation, retargeting, failure, timeout, history, and stale completion behavior.
- Repair reduced-motion verification so a genuinely short wait does not require an artificial spinner hold.
- Reduce unnecessary initial or route-specific JavaScript and repeated configuration work where current architecture permits.
- Preserve accessibility, responsive behavior, reduced motion, browser history, gates, drawers, video lifecycle, and 60 FPS hot-path constraints.
- Produce before/after measurements and explain any target that cannot be improved safely without changing visual design.

## Baseline Evidence

The implementation must record a fresh baseline before optimisation and compare it with the final build. Current reference observations are:

- Standard phase order and visibility invariants pass in Chromium desktop, Chromium mobile, and WebKit.
- Stress retargeting, delayed readiness, and preload rejection pass.
- Home, About Me, and Contact generally become readable within roughly 270–510ms in instrumented flows and settle within roughly 0.66–1.23s.
- Portfolio takes roughly 2.1–2.4s to settle on first entry and roughly 2.2s on a repeat entry in lighter production probes.
- Repeat Portfolio entry transfers only about 13.5KB, indicating that most remaining delay is readiness/runtime/animation work rather than network transfer.
- First Portfolio entry transfers roughly 573KB across the route module, content, and first-view images.
- Home re-entry has shown occasional long tasks around 162–173ms in local headless observation.
- The primary production `SiteApp` chunk is roughly 1MB raw and 293KB gzip in the assessed build.

These values are diagnostic baselines, not universal guarantees. Final evaluation must compare like-for-like runs on the same machine and browser configuration.

## User Stories

### US-001: Extract a deterministic transition transaction core

**Description:** As a maintainer, I want route-transition state and cancellation rules expressed independently of React and the DOM so that complex navigation behavior can be verified without a full browser.

**Acceptance Criteria:**

- [ ] Define one explicit transaction model containing generation/id, source state, destination state, history mode, activation type, committed state, abort signal, timing mode, and settlement endpoint.
- [ ] Define legal transitions for `idle`, `route-out`, `route-loading`, and `route-in` in one module.
- [ ] The model rejects or safely ignores stale events from older generations.
- [ ] Latest-intent retargeting rules are represented explicitly for exit/loading and route-in.
- [ ] Repeated activation of the active or already-pending route remains a no-op.
- [ ] The React hook remains the shell integration layer and the only owner allowed to publish the global phase.
- [ ] No duplicate outgoing/incoming React route trees or canvas IDs are introduced.
- [ ] Deterministic tests cover normal completion, pre-commit failure, post-commit failure, readiness timeout, cancellation, retargeting, history navigation, and stale completion.
- [ ] `npm run check:site` passes.

### US-002: Separate transition side-effect drivers

**Description:** As a maintainer, I want DOM surfaces, animation ownership, readiness barriers, focus, and history handled through focused adapters so that cleanup is complete and responsibilities do not overlap.

**Acceptance Criteria:**

- [ ] Move surface discovery, inert preservation, busy state, visibility pinning, animation cancellation, and restoration behind one route-surface driver.
- [ ] Keep the complete route-surface descriptor registry as the only source for registered surface operations.
- [ ] Move loader timing and cover/departure coordination behind one focused driver or controller.
- [ ] Move history commit/rollback and focus settlement behind focused adapters without changing browser-visible behavior.
- [ ] Preserve one idempotent finalization path with named endpoints: restore outgoing, preserve covered destination, settle incoming, and discard detached content.
- [ ] No module-global transition timers, animations, or mutable transaction instances are introduced.
- [ ] Participant callbacks remain generation-scoped and cannot mutate the global transition phase.
- [ ] The current `data-route-surface`, `data-route-view`, `data-route-enter`, pending-route, and phase diagnostics remain available to audits.
- [ ] Existing unrelated legacy-runtime and route code is not reformatted or rewritten.
- [ ] `npm run check:site` passes.

### US-003: Add safe Portfolio prewarming

**Description:** As a visitor, I want Portfolio to be prepared before I select it so that navigation spends less time behind the loader without changing what the transition looks like.

**Acceptance Criteria:**

- [ ] After direct boot and essential Home work settle, eligible idle time may preload the Portfolio route module, content data, normalized configuration, and first-view media.
- [ ] Hover, keyboard focus, pointer-down, and touch intent on the Portfolio tab raise prewarming priority.
- [ ] Prewarming is deduplicated; concurrent callers share the same in-flight promises.
- [ ] Prewarming uses an in-memory cache that resets on document reload and is never persisted as user or design truth.
- [ ] Only first-view readiness-critical media is decoded: the center card and the nearest visible permanent card instances needed by the existing reveal.
- [ ] Lazy project-detail media and video playback are not prewarming dependencies.
- [ ] Prewarming never mounts a hidden Portfolio route tree or starts the Portfolio particle field, orbital loop, video, gate, drawer, or project runtime.
- [ ] Idle image prewarming is skipped or reduced when `navigator.connection.saveData` is enabled or the connection is reported as severely constrained; intent-driven preparation may still proceed.
- [ ] A prewarm failure does not affect current-route usability and is retried safely during real navigation.
- [ ] No new visual indicator, progress bar, tooltip, or frontend element is added.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using dev-browser skill.

### US-004: Shorten the Portfolio readiness critical path

**Description:** As a visitor, I want the Work view to become ready promptly while retaining its existing gentle center-out stagger and visual composition.

**Acceptance Criteria:**

- [ ] Portfolio readiness waits only for stable first-view geometry, active runtime prerequisites, a usable center card image or fallback, and the existing required paint frames.
- [ ] Offscreen card copies, video playback, project-detail assets, and non-visible media do not delay `route-in`.
- [ ] Previously decoded first-view media resolves readiness without redundant decode work.
- [ ] Normalized Portfolio configuration and content promises are reused safely during repeat visits.
- [ ] The existing stable reveal rank remains center, right one, left one, right two, left two.
- [ ] Orbital transforms remain exclusively owned by the Portfolio runtime.
- [ ] The current card opacity, media blur, title treatment, indicator design, and stagger direction remain visually unchanged unless a timing-only adjustment is required to remove an avoidable wait.
- [ ] If timing is adjusted, configuration remains under `portfolio.runtime.entrance` and the same visual endpoints are preserved.
- [ ] Completion continues to use actual visible-card/media animation promises plus a guarded timeout, not a fixed arbitrary completion timer.
- [ ] Gate success remains same-route behavior with no global loader or replayed route entrance.
- [ ] Leaving with a drawer or handoff open remains covered and settled without reversing the visible handoff under the loader.
- [ ] Before/after evidence reports first and repeat Portfolio phase durations and identifies how much improvement came from prewarming, readiness reduction, and entrance completion.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using dev-browser skill.

### US-005: Prepare Home before its reveal boundary

**Description:** As a visitor, I want returning Home to reveal without a visible hitch so the simulation and content feel continuous with the loader departure.

**Acceptance Criteria:**

- [ ] Home canvas sizing, title preparation, simulation selection, and first renderable frame complete behind the opaque loader whenever safely possible.
- [ ] Synchronous Home reinitialization is profiled and avoidable work is split, cached, or moved to existing worker/runtime preparation paths.
- [ ] No simulation hot path introduces per-frame object allocation, repeated DOM queries, or unbounded work.
- [ ] Loader departure does not begin until final Home geometry and the first usable simulation/title state are ready or the existing degraded fallback is selected.
- [ ] The existing Home title, ball material, legend, footer, social icons, London time, and simulation-focus controls retain their current appearance and entrance order.
- [ ] The direct-load Home boot sequence remains behaviorally separate from SPA route entry.
- [ ] Returning Home still avoids the original content flash in every recorded frame.
- [ ] Before/after profiling reports Home main-thread task time, long tasks, layout count, style-recalculation count, and frame gaps.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using dev-browser skill.

### US-006: Preserve smooth motion on constrained devices

**Description:** As a visitor on a lower-power device, I want the same transition design to remain fluid without receiving a redesigned or visually incompatible experience.

**Acceptance Criteria:**

- [ ] Existing motion continues to use bounded opacity, transform, and small blur values; no new backdrop filters or full-window effects are introduced.
- [ ] Transition-time `will-change` hints are applied only while needed and are removed after settlement or cancellation.
- [ ] Simulations, fields, videos, and route-local loops remain paused while covered unless their preparation is explicitly required for readiness.
- [ ] Any adaptive constrained-device path may remove blur but must preserve the same opacity endpoints, order, geometry, duration family, and content hierarchy.
- [ ] Reduced motion remains opacity-only with no artificial loader minimum, rotation, blur, scale, glyph/card stagger, media blur, or simulation bloom.
- [ ] A static spinner may appear only while reduced-motion navigation is genuinely waiting; a fast transition is not delayed merely to establish it visually.
- [ ] The persistent physical shell, Button Bar, outer frame, and loader bounds remain unchanged.
- [ ] CPU-throttled Chromium traces and mobile viewport traces are captured before and after the change.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using dev-browser skill.

### US-007: Reduce unnecessary loading and repeated configuration work

**Description:** As a visitor, I want route transitions to avoid downloading, parsing, or normalizing work that has already been completed so that repeat navigation feels immediate.

**Acceptance Criteria:**

- [ ] Audit the primary `SiteApp` chunk and identify secondary development/lab or route-only modules that can be safely code-split without changing production entry behavior.
- [ ] Route-transition code splitting does not delay current-route interaction or cause a new flash of unstyled content.
- [ ] Canonical design configuration remains `public/config/design-system.json`; generated files remain generated outputs.
- [ ] Normalized shell, Portfolio, and content configuration promises are cached at the narrowest safe in-memory scope.
- [ ] A repeat Portfolio transition does not refetch unchanged default configuration solely because the route remounted.
- [ ] Cache invalidation remains compatible with Vite development updates and canonical configuration reload/apply behavior.
- [ ] No browser storage is used as design truth.
- [ ] The final report lists raw and compressed chunk-size changes and route-specific network request/byte changes.
- [ ] Initial Home loading and direct boot do not regress materially in like-for-like measurements.
- [ ] `npm run check:site` passes.

### US-008: Add deterministic transition tests

**Description:** As a maintainer, I want fast deterministic tests for transaction behavior so that failures are caught before expensive browser certification.

**Acceptance Criteria:**

- [ ] Add a repository-native test command using the smallest testing dependency compatible with the current Vite/React setup, or Node's built-in test runner where sufficient.
- [ ] Tests use fake or injectable time and do not depend on real animation duration.
- [ ] Tests cover the complete legal phase order and reject illegal or stale phase advancement.
- [ ] Tests cover preload rejection before commit and verify outgoing-route restoration.
- [ ] Tests cover post-commit degraded fallback and unrecoverable destination mount rollback.
- [ ] Tests cover readiness timeout and confirm the loader, busy state, and inert state cannot remain stuck.
- [ ] Tests cover retargeting during exit/loading and during route-in.
- [ ] Tests cover popstate/history mode without duplicate history writes.
- [ ] Tests cover stale animation, timer, readiness, and participant completion after cancellation.
- [ ] Tests cover participant `prepare`, `exit`, `restore`, `waitUntilReady`, `enter`, `cancel`, and `complete` ordering.
- [ ] Tests cover repeated activation of active and pending routes as no-ops.
- [ ] The canonical local site gate runs these deterministic tests.
- [ ] `npm run check:site` passes.

### US-009: Repair and extend browser transition audits

**Description:** As a maintainer, I want browser audits to reflect the intended experience accurately so that both real regressions and valid fast paths are classified correctly.

**Acceptance Criteria:**

- [ ] The reduced-motion transition audit does not require a spinner to exceed an arbitrary visibility threshold when route-loading is shorter than the spinner establishment time.
- [ ] Reduced motion still asserts full loader coverage, correct route opacity, readiness before reveal, no artificial minimum hold, and complete settlement.
- [ ] Normal-motion audits continue to require the spinner punctuation and opaque plate behavior.
- [ ] Browser traces report phase durations, readiness milestones, loader-covered duration, first meaningful destination content, settlement, frame intervals, and long tasks.
- [ ] Portfolio traces distinguish module/content/media preparation, runtime readiness, route-in, and visible-card animation completion.
- [ ] Home traces expose first usable canvas frame and any long task overlapping loader departure.
- [ ] Latest-intent, back-navigation, delayed Portfolio readiness, preload failure, post-commit failure, timeout, and stale-completion scenarios are represented by deterministic or browser coverage as appropriate.
- [ ] The Portfolio carousel audit receives a bounded timeout and actionable diagnostics rather than running indefinitely under headless SwiftShader.
- [ ] Audit instrumentation overhead is documented and heavy continuous-RAF results are not misreported as uninstrumented cadence.
- [ ] `npm run check:site` passes.

### US-010: Certify unchanged visual design and interaction contracts

**Description:** As the site owner, I want proof that performance and architecture changes did not alter the frontend design or interaction language.

**Acceptance Criteria:**

- [ ] Compare Home, Portfolio, About Me, and Contact before/after screenshots at desktop and mobile sizes in light and dark themes.
- [ ] Confirm no change to route layout, typography, copy, colors, surface geometry, frame, Button Bar, cursor, loader design, spinner design, card design, or content order.
- [ ] Confirm the physical window, outside wall, exposed black band, and Button Bar do not animate with route content.
- [ ] Confirm the loader remains clipped to the studio window and stops above the Button Bar.
- [ ] Confirm Portfolio drawer, gate, card-to-drawer handoff, carousel input, and particle field appearance remain unchanged.
- [ ] Confirm Home title legibility and ball-material composition remain unchanged.
- [ ] Confirm About and Contact fields remain static until `idle` and resume through the existing lifecycle.
- [ ] Confirm keyboard focus, history focus, pending route state, `aria-current`, live status, inert state, and Button Bar operability remain correct.
- [ ] Verify Chromium and WebKit desktop serial transition flows.
- [ ] Verify Chromium mobile and reduced-motion flows.
- [ ] Run CPU-throttled Chromium coverage and document frame/long-task deltas.
- [ ] Perform a physical-phone follow-up after automated certification; record device/browser observations without blocking completion solely on unavailable hardware.
- [ ] `npm run studio:check` passes.
- [ ] Verify in browser using dev-browser skill.

### US-011: Update transition architecture documentation

**Description:** As a future maintainer, I want the final ownership and performance model documented so that subsequent work does not reintroduce duplicate transition systems or visual regressions.

**Acceptance Criteria:**

- [ ] Update `docs/reference/TRANSITION-ORCHESTRATION.md` with the extracted transaction core, side-effect drivers, prewarm lifecycle, cache boundaries, and settlement endpoints.
- [ ] Update `docs/reference/PORTFOLIO.md` with Portfolio prewarming and readiness-critical media rules.
- [ ] Update `docs/reference/CANVAS-RUNTIME.md` if Home runtime preparation or scheduling ownership changes.
- [ ] Document that prewarming never mounts a hidden route runtime or starts animation loops.
- [ ] Document that visual design is frozen for this programme and timing-only changes must preserve existing endpoints and hierarchy.
- [ ] Document how to run deterministic tests, serial browser audits, reduced-motion coverage, CPU-throttled profiling, and physical-phone follow-up.
- [ ] Remove obsolete comments and duplicate helpers only when their replacement is active and covered.
- [ ] `npm run check:site` passes.

## Functional Requirements

- FR-1: The shell must remain the sole owner of the global route-transition phase.
- FR-2: Every normal navigation must follow `idle → route-out → route-loading → route-in → idle`, including latest-intent retargeting and browser history where applicable.
- FR-3: The physical window, outside wall, frame, exposed band, and Button Bar must never enter or exit with route content.
- FR-4: All route-owned hide, inert, busy, animation, cancellation, restoration, and audit operations must derive from the route-surface descriptor registry.
- FR-5: Incoming route surfaces and entrance targets must remain hidden and inert until readiness and route-in staging are complete.
- FR-6: Every pre-commit frame must contain visible outgoing route content or a fully opaque loader covering the complete studio window above the Button Bar.
- FR-7: The loader, spinner, plate color, geometry, stacking, and reduced-motion appearance must remain visually unchanged.
- FR-8: The transaction core must ignore stale callbacks and prevent more than one history commit for a transaction.
- FR-9: Cancellation and finalization must be idempotent and must settle animations, timers, abort signals, participants, inert state, busy state, focus state, and diagnostic attributes.
- FR-10: Portfolio module, content, configuration, and first-view media preparation must be deduplicated and safely reusable within the current document lifetime.
- FR-11: Portfolio prewarming must never persist data to browser storage or mount/start the inactive route runtime.
- FR-12: Portfolio readiness must use the smallest set of assets and geometry required for a usable first view.
- FR-13: Portfolio reveal order and orbital transform ownership must remain unchanged.
- FR-14: Home must prepare its first usable canvas/title state while covered and must not expose partially initialized simulation content.
- FR-15: Route-local simulations, fields, and videos must remain paused during non-idle phases except for bounded preparation required by the incoming route.
- FR-16: Reduced motion must use the same transaction and readiness barriers without artificial minimum waiting.
- FR-17: The Button Bar must remain visible, focusable, operable, and semantically accurate throughout navigation.
- FR-18: Pointer navigation must not move focus; keyboard and history navigation must retain the existing guarded destination-heading focus behavior.
- FR-19: No visual design token, layout value, route copy, component hierarchy visible to users, or authored geometry may change unless required to preserve the existing rendering after internal refactoring.
- FR-20: Any timing-only modification must retain the current start/end visual states, route-specific ordering, and motion character.
- FR-21: The canonical design source must remain `react-app/app/public/config/design-system.json`; generated configs must not be hand-edited.
- FR-22: Reusable configuration values must continue to support live apply, canonical save, reload, flattening, build, and preview parity.
- FR-23: Deterministic transaction tests must run as part of the canonical local verification gate.
- FR-24: Browser transition audits must run serially in Chromium and WebKit when cadence or route orchestration changes.
- FR-25: Performance reports must distinguish network time, readiness time, animation time, main-thread task time, and audit overhead.

## Non-Goals

- No frontend visual redesign.
- No changes to typography, copy, palette, route composition, layout, spacing, card geometry, Button Bar, loader, spinner, cursor, wall, frame, or animation visual endpoints.
- No new loader treatment, skeleton screen, progress bar, route sound, haptic, transition overlay, or decorative effect.
- No duplicate incoming/outgoing React route trees, `TransitionGroup`, view-transition snapshots, or duplicate canvas IDs.
- No persistent hidden Portfolio React tree, particle field, orbital loop, gate, drawer, video runtime, or project runtime.
- No WebGL migration or rewrite of active Canvas 2D legacy infrastructure.
- No rewrite of Portfolio orbital transforms, carousel physics, particle design, drawer handoff, or gate behavior.
- No persistent browser-storage cache for route modules, content, decoded media, configuration, or visited-route state.
- No production deployment, commit, or push as part of implementation unless separately authorised.
- No unrelated About narrative, cursor, theme, frame, portfolio-content, or editor work.
- No hard pass/fail navigation-duration threshold that is sensitive to machine speed or network variance.

## Design Considerations

- Treat the current frontend as visually locked. The work is successful when visitors perceive the same designed transition with less waiting and fewer hitches.
- Preserve the compact mechanical-breath character: decisive exit, short black punctuation, coordinated loader departure, then identity, context, action, and support.
- Preserve the Portfolio center-out spatial reveal. Performance work must accelerate preparation rather than flattening the composition into a generic fade.
- Preserve Home's title, expertise labels, footer sequence, social icons, London time, simulation focus, and compact material bloom.
- Preserve Contact's early useful action and About's calmer entrance.
- Do not use a new visual device to disguise avoidable latency. Reduce the latency itself.
- A constrained-device fallback may remove expensive blur only when necessary, but it must not introduce a visibly different layout or transition concept.

## Technical Considerations

### Likely ownership areas

- `react-app/app/src/hooks/useShellRouteTransition.js`
- `react-app/app/src/lib/transition-phase.js`
- `react-app/app/src/lib/motion/route-transition-participants.js`
- `react-app/app/src/lib/motion/entrance-sequence.js`
- `react-app/app/src/components/app/StudioShell.jsx`
- `react-app/app/src/components/app/ShellButtonBar.jsx`
- `react-app/app/src/components/app/RouteTransitionLoader.jsx`
- `react-app/app/src/hooks/useLegacyRouteRuntime.js`
- `react-app/app/src/legacy/main.js`
- `react-app/app/src/legacy/modules/portfolio/app.js`
- `react-app/app/src/legacy/modules/portfolio/portfolio-config.js`
- `react-app/app/src/legacy/modules/visual/site-shell.js`
- `react-app/app/public/config/design-system.json`
- `scripts/audit-transition-flows.mjs`
- `scripts/audit-transition-gate-serial.mjs`
- `scripts/audit-portfolio-carousel.mjs`
- Focused transition/unit test files and package scripts to be introduced by implementation

### Architecture boundaries

- Prefer pure functions and injected effects for the transaction core.
- Keep React responsible for rendering the committed route and wiring the shell, not for encoding every asynchronous transition rule inline.
- Keep DOM animation through the Web Animations API and existing CSS where it already preserves compositor behavior.
- Keep route participants optional and generation-scoped.
- Keep caches document-scoped, deduplicated, abort-aware where appropriate, and safe to discard.
- Distinguish preload completion from destination readiness and entrance completion; do not collapse them into one ambiguous promise.
- Preserve the existing 4,500ms readiness ceiling and degraded fallback policy unless profiling proves a narrower route-specific ceiling is safer.

### Implementation sequence

Refactor and optimisation occur in the same programme, but integration must remain incremental:

1. Capture baseline reports and endpoint screenshots.
2. Introduce deterministic transaction tests around current behavior.
3. Extract the transaction model and effect adapters while keeping current output stable.
4. Add deduplicated prewarm/cache infrastructure.
5. Shorten Portfolio readiness and remove redundant repeated work.
6. Move/split Home re-entry preparation behind the loader.
7. Audit bundle boundaries and configuration caching.
8. Repair and extend browser audits.
9. Run final visual, accessibility, browser, reduced-motion, performance, and physical-phone follow-up certification.

Each step must leave the app runnable and must not depend on an unverified large-bang replacement.

### Performance measurement

- Use median and p95 values across repeated like-for-like runs; do not draw conclusions from one navigation.
- Record cold Portfolio separately from repeat Portfolio.
- Record first meaningful destination content separately from final transition settlement.
- Report request count and transferred bytes separately from decoded/resource-cache reuse.
- Record main-thread task time, script time, layout time, style recalculation, long tasks, and frame intervals.
- Mark continuous computed-style RAF recording as intrusive instrumentation and pair it with a lighter measurement.
- Best-effort aspirational outcomes include repeat Portfolio settlement approaching 1.2s, cold Portfolio settlement approaching 1.55s, and meaningful center-card content around 550ms, but these are not standalone failure gates.

## Verification Plan

Run targeted checks during each implementation step. Before declaring the programme complete, run:

```bash
npm run studio:status
npm run check:site
npm run studio:check
npm run build
```

Serve the fresh production build separately, then run:

```bash
ABS_BROWSER=chromium ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows
ABS_BROWSER=webkit ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows
ABS_BROWSER=chromium ABS_TRANSITION_VIEWPORT=390x844 npm run audit:transition-flows
ABS_BROWSER=chromium ABS_TRANSITION_REDUCED_MOTION=1 npm run audit:transition-flows
ABS_BROWSER=chromium ABS_TRANSITION_STRESS=1 npm run audit:transition-flows
ABS_BROWSER=chromium ABS_TRANSITION_DELAYED_READINESS=1 npm run audit:transition-flows
ABS_BROWSER=chromium ABS_TRANSITION_PRELOAD_FAILURE=1 npm run audit:transition-flows
npm run audit:transition-gate
npm run audit:boot-overlay
npm run audit:canvas-spa
npm run audit:portfolio-carousel
npm run audit:portfolio-gate
npm run audit:portfolio-drawer
npm run certify:screens
```

Also complete:

- A CPU-throttled Chromium transition profile covering the standard route sequence.
- Before/after endpoint screenshots for all routes in desktop/mobile and light/dark.
- Manual browser verification through the dev-browser skill.
- Physical-phone follow-up on at least one iPhone/Safari and one Android/Chrome device when available.
- Final diff inspection for unrelated changes, generated-config mistakes, visual drift, and stale duplicate helpers.

## Success Metrics

- All route transitions preserve exact phase ordering, coverage, readiness, inert, busy, history, and settlement invariants.
- No Home footer, social icon, label, title, or simulation-focus control appears before route-in.
- No route exposes a blank frame without outgoing content or a fully opaque loader.
- Repeat Portfolio navigation shows a material improvement in loader-covered and total settlement time in like-for-like median measurements.
- First Portfolio navigation shows a material improvement or a documented evidence-based reason why further reduction would compromise readiness or the locked design.
- Repeat Portfolio navigation reuses module/content/configuration/media preparation and avoids redundant fetch/decode work.
- Home re-entry shows fewer or shorter long tasks near loader departure, with no visual regression.
- Initial Home boot time, route accessibility, and current non-Portfolio transition timings do not regress materially.
- The reduced-motion audit passes without imposing an artificial spinner hold.
- Deterministic failure/cancellation tests pass and run within the canonical local gate.
- Chromium/WebKit desktop, Chromium mobile, reduced-motion, stress, delayed-readiness, preload-failure, Portfolio, canvas, boot, and screen-certification checks pass.
- Before/after visual inspection finds no frontend design change.
- Final implementation contains no redundant transition owner, duplicate route tree, unbounded RAF/timer, stale participant, or hand-edited generated configuration.

## Risks and Mitigations

- **Risk: simultaneous refactor and optimisation obscures regressions.** Mitigation: add behavior tests first, integrate incrementally, and compare each step with the baseline.
- **Risk: idle prewarming consumes unnecessary bandwidth.** Mitigation: constrain it to first-view assets, respect data-saving signals, deduplicate requests, and prioritise intent.
- **Risk: cached decoded media increases memory.** Mitigation: cache only readiness-critical images, keep document-scoped references bounded, and release obsolete/error entries.
- **Risk: code splitting moves latency from boot to navigation.** Mitigation: pair route-only chunks with controlled prewarming and compare both boot and route timing.
- **Risk: earlier Portfolio readiness reveals unstable geometry.** Mitigation: keep final-geometry and paint-frame barriers; reduce only redundant dependencies.
- **Risk: Home scheduling changes simulation determinism.** Mitigation: preserve runtime ownership and seeded state; move preparation timing without rewriting physics.
- **Risk: blur removal changes appearance.** Mitigation: use it only as a constrained-device fallback and certify endpoint/layout parity.
- **Risk: browser audit instrumentation creates false performance conclusions.** Mitigation: pair heavy invariant recording with lightweight timing and CPU metrics.
- **Risk: dirty worktree overlaps unrelated changes.** Mitigation: inspect status/diff before every integration step and avoid reverting or formatting unrelated files.

## Open Questions

- None blocking. Timing values are best-effort rather than hard gates; implementation must report before/after evidence and prioritise correctness and unchanged visual design over hitting an arbitrary duration on one machine.

