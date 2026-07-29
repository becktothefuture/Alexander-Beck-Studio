# PRD: Global Simulation Palette System

## Introduction/Overview

Production ball renderers currently reach the time-of-day palette through several paths: legacy globals, CSS variables, route themes, and renderer-local fallbacks. Those paths can disagree during route changes, tab resume, and three-hour palette boundaries. This feature creates one shell-owned controller that publishes a complete immutable snapshot and becomes the only production authority for palette timing, colours, and material-role distribution.

This PRD is the dependency for the Home, Work, About, and Contact integration PRDs. View integrations may adapt the snapshot to their renderer, but may not redefine its schedule, palette catalogue, fallback, roles, or weights.

## Goals

- Publish exactly one valid snapshot per visitor-local period at 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, and 21:00.
- Give all mounted production consumers the same `paletteId`, `periodId`, `generation`, `effectiveAt`, eight sRGB colours, and six material roles.
- Reconcile stale tabs on `pageshow`, visible `visibilitychange`, and window focus before route content is revealed.
- Eliminate production route clocks, palette overrides, and duplicated material defaults.
- Preserve 60 FPS renderer hot paths by making palette work event-driven and allocation-free per frame.

## User Stories

### US-001: Define and validate the shared contract
**Description:** As a developer, I want one pure palette contract so that every renderer interprets colours and material roles identically.

**Acceptance Criteria:**
- [ ] The immutable snapshot contains `paletteId`, `periodId`, `generation`, `effectiveAt`, `nextBoundaryAt`, eight `colors`, and six `distribution` rows.
- [ ] Every distribution row contains stable `roleId`, `label`, `colorIndex`, and positive `weight` values.
- [ ] Invalid palettes or distributions resolve atomically to the one shared fallback.
- [ ] The fallback is byte-equivalent to `public/config/design-system.json` for role IDs, labels, indices, and weights.
- [ ] `npm run check:simulation-palette-contract` passes.

### US-002: Publish one shell-owned palette generation
**Description:** As a visitor, I want every visible ball surface to change together so that the site feels like one coherent system.

**Acceptance Criteria:**
- [ ] The shared shell starts one controller and one boundary timer.
- [ ] A complete snapshot is validated before CSS, diagnostics, legacy globals, or subscribers change.
- [ ] Subscribers receive the current snapshot immediately and exactly once per committed generation.
- [ ] `--ball-1` through `--ball-8`, root diagnostics, legacy globals, and `bb:paletteChanged` carry the same committed generation.
- [ ] No mixed generation remains after two animation frames.
- [ ] Verify in browser using dev-browser skill.

### US-003: Reconcile time after lifecycle interruptions
**Description:** As a returning visitor, I want a suspended tab to show the current palette before it becomes useful so that stale colours never flash.

**Acceptance Criteria:**
- [ ] The controller reconciles on `pageshow`, visible `visibilitychange`, and focus.
- [ ] Delayed timers and midnight rollover commit the currently resolved period, not every missed period.
- [ ] Local DST changes schedule the next real local boundary correctly.
- [ ] Direct loads and SPA navigation read the current snapshot before route readiness exits.
- [ ] Verify in browser using dev-browser skill.

### US-004: Provide safe diagnostics and certification controls
**Description:** As a developer, I want observable palette state and controlled clocks so that synchronization failures can be reproduced without creating production overrides.

**Acceptance Criteria:**
- [ ] Production exposes a read-only frozen diagnostic snapshot.
- [ ] Fake clocks and forced reconciliation are available only in development and certification builds.
- [ ] URL parameters and route configuration cannot select a production palette.
- [ ] Static enforcement rejects unregistered production consumers and direct route imports of the time resolver.

## Functional Requirements

1. FR-1: `londonPalettes.js` remains the palette catalogue and `timeOfDayPalette.js` remains a pure visitor-local schedule.
2. FR-2: `simulationPaletteContract.js` owns pure validation, normalization, weighted selection, and deterministic sequence helpers.
3. FR-3: One runtime controller combines the scheduled palette and canonical distribution into a deeply frozen snapshot.
4. FR-4: The controller exposes `getSimulationPaletteSnapshot()` and `subscribeSimulationPalette(listener)`.
5. FR-5: A React hook exposes the controller through `useSyncExternalStore`.
6. FR-6: `selectSimulationMaterialRole(sample, snapshot)` returns a stable role row, and `createSimulationMaterialSequence(count, options, snapshot)` returns deterministic role assignments.
7. FR-7: Subscription registration immediately invokes the listener with the current snapshot; later commits notify synchronously once per generation.
8. FR-8: The controller projects a commit to eight CSS variables, root datasets, the legacy adapter, and a compatibility event in one JavaScript task.
9. FR-9: `bb:paletteChanged` contains the committed snapshot and cannot request or override selection.
10. FR-10: The controller owns one boundary timer and lifecycle reconciliation listeners.
11. FR-11: Palette commits do not depend on site light/dark theme; each authored palette uses one sRGB colour array.
12. FR-12: Production diagnostics are read-only; test clock injection is build-gated.
13. FR-13: The atmosphere consumes current route material and derives ambient fallback from the active snapshot.
14. FR-14: Invalid input cannot publish partial CSS variables or a partial generation.

## Non-Goals

- Cross-tab messaging or `BroadcastChannel` synchronization.
- Palette crossfades, route-specific delays, or intermediate colours.
- Redesigning shell colours, route accents, project cards, typography, physics, density, motion, or interactions.
- Making Palette Lab or browser storage a production authority.
- Migrating development-only labs and demos unless needed to keep shared modules buildable.

## Design Considerations

- Palette changes are instantaneous and atomic.
- All Canvas, CSS, and Three.js outputs use sRGB.
- Route choreography and intentional About monochrome passages remain authored exceptions; bespoke chromatic colours are not.

## Technical Considerations

- Use a single module-level store with explicit start/stop ownership from `SiteApp`.
- Keep schedule resolution pure and clock-injectable for tests.
- Use stable role IDs rather than raw colours for persistent body/material assignment.
- Preserve the compatibility event only while legacy consumers migrate.
- Avoid per-frame allocation and geometry regeneration on palette commits.

## Success Metrics

- 100% of registered production consumers report the same snapshot generation in the runtime matrix.
- Zero direct time-resolver imports or local distribution defaults in production renderers.
- Zero palette commits that recreate route runtimes, physics bodies, point buffers, particles, or rings.
- All contract, schedule, browser, visual, and Studio gates pass in supported Chromium and WebKit runs.

## Open Questions

- Resolved: synchronization is per tab; separate tabs independently reconcile local time.
- Resolved: updates are atomic with no crossfade.
- Resolved: all production Daily modes are in scope; labs and demos are excluded.
- Resolved: the six authored roles and their weights are global; route geometry may order assignments differently.
