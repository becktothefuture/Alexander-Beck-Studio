# PRD: Transition Compatibility Boundary

## 1. Introduction/Overview

`useShellRouteTransition` is the documented owner of SPA route transition sequencing, but legacy page navigation utilities still mutate transition and entrance state for hard-navigation compatibility. This PRD narrows, documents, or removes compatibility paths so transition ownership is easier to reason about.

## 2. Goals

- Keep SPA transition sequencing owned by `useShellRouteTransition`.
- Preserve hard-navigation and browser bfcache compatibility.
- Remove or isolate global mutations that are no longer needed.
- Document the compatibility boundary.

## 3. User Stories

### US-001: Inventory compatibility mutations
**Description:** As a developer, I want every non-SPA transition mutation listed so I can tell compatibility fallback from active ownership.

**Acceptance Criteria:**
- [ ] `page-nav.js` global listeners are documented by purpose.
- [ ] Each mutation is classified as required, removable, or fallback-only.
- [ ] No behavior changes are made before classification.

### US-002: Reduce SPA-overlapping mutations
**Description:** As a maintainer, I want legacy utilities to avoid changing SPA transition phase so route animations have one owner.

**Acceptance Criteria:**
- [ ] Fallback-only code does not run during SPA route transitions.
- [ ] Global listeners no-op when `useShellRouteTransition` owns the active phase.
- [ ] Existing hard-navigation back links continue to work.

### US-003: Verify transition behavior
**Description:** As a user, I want route transitions to remain smooth and reliable after compatibility cleanup.

**Acceptance Criteria:**
- [ ] Home to portfolio to home transition passes in Chromium and WebKit.
- [ ] Home to CV to home transition passes in Chromium and WebKit.
- [ ] Strict RAF transition audits pass when timing behavior changes.
- [ ] **Verify in browser using dev-browser skill** with visible route transitions.

## 4. Functional Requirements

- FR-1: Do not change modal/gate behavior except where needed to preserve transition ownership.
- FR-2: Preserve bfcache restore handling.
- FR-3: Preserve direct hard-navigation fallback for route topbar back links.
- FR-4: Update transition docs when compatibility code remains.

## 5. Non-Goals

- No visual redesign of route transitions.
- No change to transition durations unless required by a bug.
- No rewrite of `useShellRouteTransition`.

## 6. Design Considerations

Material presence rules still apply: primary UI should return as whole objects/groups without decorative delay.

## 7. Technical Considerations

Run transition audits serially. Watch for Safari/WebKit timing regressions.

## 8. Success Metrics

- Transition ownership is easier to explain from code and docs.
- Browser transition audits remain green.

## 9. Open Questions

- Are any View Transitions API paths still valuable, or should they be archived as historical compatibility?
