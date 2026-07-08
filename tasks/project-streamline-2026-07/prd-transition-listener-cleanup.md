# PRD: Transition Listener Cleanup

## 1. Introduction/Overview

Remove or isolate duplicated legacy route navigation listeners after the inventory PRD identifies safe cleanup targets. This keeps transition sequencing centralized without changing the visual design.

## 2. Goals

- Keep `useShellRouteTransition` as the only sequencing owner.
- Remove or isolate legacy SPA navigation bindings that duplicate shell ownership.
- Preserve direct-load boot helper behavior.
- Prove route, modal, gate, portfolio, and Daily Simulation flows still work.

## 3. User Stories

### US-001: Remove safe duplicate listeners
**Description:** As a developer, I want safe duplicate listeners removed so transition ownership is easier to reason about.

**Acceptance Criteria:**
- [ ] Only bindings classified removable by `prd-transition-navigation-inventory.md` are changed.
- [ ] Legacy modules do not directly mutate transition phase state outside the approved API.
- [ ] Direct-load helpers still no-op during `route-out` and `route-in`.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using dev-browser skill across home -> portfolio -> CV -> home.

### US-002: Preserve route readiness behavior
**Description:** As a visitor, I want routes to reveal only when ready so transitions do not flash or snap.

**Acceptance Criteria:**
- [ ] `abs:route-ready` still fires after destination route readiness.
- [ ] Portfolio gate and project drawer flows still work.
- [ ] Daily route-backed focus selection still settles to clean home URL.

## 4. Functional Requirements

- FR-1: `useShellRouteTransition` remains the only route sequencing owner.
- FR-2: Listener cleanup must be limited to inventory-approved targets.
- FR-3: Compatibility-only bindings must remain with comments if still needed.
- FR-4: Browser transition audits must pass.

## 5. Non-Goals

- No hook helper extraction.
- No visual transition redesign.
- No boot shell HTML consolidation.

## 6. Design Considerations

- Preserve current route transition feel.
- Restore primary UI as whole readable groups.

## 7. Technical Considerations

- Run audits serially with preview server already running.
- Treat WebKit strict RAF failures carefully; do not weaken thresholds without evidence.

## 8. Success Metrics

- Fewer duplicated navigation listeners.
- Transition ownership is easier to explain.
- Chromium and WebKit audits pass.

## 9. Decisions

- No additional planning decision is required after inventory is complete.

## 10. Implementation Notes

Actioned: 2026-07-08

- Added `setupTransitionNavigationLinks()` in `react-app/app/src/legacy/modules/utils/page-nav.js`.
- Reused the shared binder in `react-app/app/src/routes/cv/cv-bootstrap.js`.
- Reused the shared binder in `react-app/app/src/legacy/modules/portfolio/app.js`.
- Portfolio now tears down `[data-nav-transition]` click handlers during route cleanup instead of leaving anonymous listeners behind.
- `useShellRouteTransition` remains the only SPA route sequencing owner.
- Direct-load fallback behavior remains in `navigateWithTransition`.

Verification:

```bash
npm run lint --prefix react-app/app
npm run check:site
npm run certify:screens
ABS_DEV_URL=http://localhost:8013 npm run audit:boot-overlay
ABS_DEV_URL=http://localhost:8013 npm run audit:canvas-spa
ABS_DEV_URL=http://localhost:8013 npm run audit:daily-focus-boundary
ABS_DEV_URL=http://localhost:8013 npm run audit:simulation-focus
ABS_DEV_URL=http://localhost:8013 npm run audit:simulation-focus:stress
ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-gate
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit ABS_TRANSITION_STRICT_RAF=1 ABS_TRANSITION_HARD_TIMEOUT_MS=300000 npm run audit:transition-flows
```

Targeted back-link smoke also passed for direct `/portfolio.html?portfolio=739284` and `/cv.html?cv=482916` loads: both back links returned to `/index.html`, settled to transition phase `idle`, and had `#app-frame` visible.
