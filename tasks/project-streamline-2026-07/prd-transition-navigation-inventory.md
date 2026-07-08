# PRD: Transition Navigation Inventory

## 1. Introduction/Overview

Inventory route transition and navigation ownership before changing behavior. This read-only/no-op PRD protects the strict contract that `useShellRouteTransition` owns sequencing while legacy modules may execute visual effects.

## 2. Goals

- Map every route navigation listener and transition phase mutator.
- Classify each legacy binding as required, removable, or compatibility-only.
- Produce an implementation plan for narrow listener cleanup.
- Avoid behavior changes in this inventory PRD.

## 3. User Stories

### US-001: Inventory navigation bindings
**Description:** As a developer, I want a concrete list of navigation listeners so cleanup work does not miss hidden legacy ownership.

**Acceptance Criteria:**
- [ ] Search for `[data-nav-transition]`, `navigateWithTransition`, `trySpaNavigate`, transition phase setters, and route-ready dispatches.
- [ ] Record file, symbol, current behavior, and owner classification.
- [ ] Identify which bindings are direct-load helpers versus SPA route helpers.

### US-002: Classify cleanup candidates
**Description:** As a maintainer, I want each binding classified before edits so high-risk transition code is not changed blindly.

**Acceptance Criteria:**
- [ ] Each binding is marked required, removable, or compatibility-only.
- [ ] Each removable binding has a proposed verification command.
- [ ] Any uncertain binding is marked as requiring user/developer guidance before implementation.

## 4. Functional Requirements

- FR-1: This PRD must produce documentation or implementation notes only.
- FR-2: No runtime code changes are allowed in this PRD.
- FR-3: Findings must reference exact files and symbols.

## 5. Non-Goals

- No listener removal.
- No transition helper extraction.
- No visual behavior change.

## 6. Design Considerations

- Not a UI change.
- Preserve material presence and transition continuity by avoiding behavior edits.

## 7. Technical Considerations

- Use this inventory to scope `prd-transition-listener-cleanup.md`.
- Keep compatibility hooks until all consumers are known.

## 8. Success Metrics

- Cleanup work can be scoped from a concrete ownership map.
- No transition code is changed before ownership is understood.

## 9. Decisions

- No blocking decisions remain; this is a read-only inventory PRD.

## 10. Inventory Results

Completed: 2026-07-08

### SPA sequencing owner

| File | Symbol | Behavior | Classification |
| --- | --- | --- | --- |
| `react-app/app/src/hooks/useShellRouteTransition.js` | `navigate` / `transitionCurrentRoute` | Owns SPA route sequencing, sets `route-out` / `route-in`, waits for route readiness, handles queued navigation, popstate, gated redirects, and simulation-focus transitions. | required |
| `react-app/app/src/lib/spa-navigation.js` | `installSpaNavigationBridge` / `trySpaNavigate` | Exposes the React `navigate` callback to legacy modules so old click handlers hand off to the SPA owner before falling back to full-page navigation. | required |
| `react-app/app/src/lib/transition-phase.js` | transition phase helpers | Central API for `<html data-abs-transition-phase>`, legacy compatibility flags, modal phase sync, and dev ownership guard. | required |

### Legacy compatibility and direct-load helpers

| File | Symbol | Behavior | Classification |
| --- | --- | --- | --- |
| `react-app/app/src/legacy/modules/utils/page-nav.js` | `navigateWithTransition` | Sets short-lived navigation state, tries the SPA bridge first, and falls back to direct page navigation / departure animation when no bridge is installed. | compatibility-only |
| `react-app/app/src/routes/cv/cv-bootstrap.js` | `[data-nav-transition]` binding | Direct-load route bootstrap binds the CV back link to `navigateWithTransition` and removes the handler on cleanup. | compatibility-only |
| `react-app/app/src/legacy/modules/portfolio/app.js` | `[data-nav-transition]` binding | Direct-load route bootstrap binds the portfolio back link to `navigateWithTransition`; previous anonymous handler lacked explicit route cleanup. | removable cleanup target |
| `react-app/app/src/legacy/main.js` | `pageshow` handler and gate trigger prefetch | Home direct-load helper resets full-page transition state on bfcache restore and prefetches gated routes. | compatibility-only |
| `react-app/app/src/legacy/modules/visual/page-orchestrator.js` | `completeDirectBoot` / `forceBootVisible` | Direct-load boot reveal helpers no-op during `route-out` / `route-in` unless explicitly allowed. | required |

### Route readiness

| File | Symbol | Behavior | Classification |
| --- | --- | --- | --- |
| `react-app/app/src/hooks/useLegacyRouteRuntime.js` | `dispatchRouteReady` | Dispatches `abs:route-ready` after legacy route boot completes, after two RAFs. | required |
| `react-app/app/src/legacy/main.js` | `signalRouteReady('home')` | Signals home readiness when direct boot is blocked by shell route transition. | required |
| `react-app/app/src/legacy/modules/portfolio/app.js` | `signalRouteReady('portfolio')` | Signals portfolio readiness after deck/canvas readiness during shell transitions. | required |
| `react-app/app/src/routes/daily-focus/DailyFocusShellBridge.jsx` | `signalDailyFocusRouteReady` | Signals route-backed daily simulation readiness. | required |

### Phase mutation owners

| File | Symbol | Behavior | Classification |
| --- | --- | --- | --- |
| `react-app/app/src/hooks/useShellRouteTransition.js` | `setTransitionPhase(ROUTE_OUT/ROUTE_IN)` | Only runtime owner for SPA route phase sequencing. | required |
| `react-app/app/src/legacy/modules/ui/modal-overlay.js` | modal open/close phase calls | Modal state owner for `modal-open` and return animation state, not route sequencing. | required |
| `react-app/app/src/legacy/modules/utils/page-nav.js` | `closeOverlaysBeforeNavigation` | Clears modal/overlay phase only before full-page navigation when SPA handoff is unavailable. | compatibility-only |

### Cleanup Plan

- Keep `useShellRouteTransition` as the only SPA route sequencing owner.
- Keep `navigateWithTransition` and the SPA bridge because direct HTML loads still need full-page fallback behavior.
- Replace duplicated per-route `[data-nav-transition]` click binding with one shared `setupTransitionNavigationLinks()` helper.
- Use the shared helper in CV and portfolio bootstraps; portfolio gains explicit listener teardown.

Verification for the cleanup target:

```bash
npm run check:site
npm run certify:screens
ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-gate
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:transition-flows
```
