# PRD: Route And Tab State Foundation

## 1. Introduction

Create the navigation foundation for a persistent bottom shell tab system. The foundation must define route targets, active tab state, pending gated route state, SPA navigation behavior, and accessibility before any visual or geometry work lands.

Dependency: `prd-contact-route-promotion.md` must be complete first so `/contact.html` exists before the dock points at it.

## 2. Goals

- Add a shell-owned route tab model for Home, Contact, Portfolio, and About Me.
- Define active tab state for normal routes, gated requests, dismissed gates, granted gates, direct loads, and browser back/forward.
- Keep `useShellRouteTransition` as the single transition owner.
- Avoid breaking existing portfolio/CV gate friction.

## 3. User Stories

### US-001: Define bottom tab route targets

**Description:** As a visitor, I want four clear bottom tabs so I can move between Home, Contact, Portfolio, and About Me.

**Acceptance Criteria:**
- [ ] Home tab targets `/index.html`.
- [ ] Contact tab targets `/contact.html`.
- [ ] Portfolio tab targets `/portfolio.html`.
- [ ] About Me tab targets `/cv.html` and displays `About Me`.
- [ ] Route hrefs are produced through existing route helpers or equivalent canonical route source.
- [ ] Contact route already exists from PRD 1; this PRD must not create a partial Contact route.
- [ ] `npm run check:site` passes.

### US-002: Define active and pending tab state

**Description:** As a visitor, I want the tab I am using to remain visually clear even when Portfolio/About access is gated.

**Acceptance Criteria:**
- [ ] The active-state matrix is documented in code comments or packet docs before implementation.
- [ ] Current resolved route marks exactly one tab active.
- [ ] The implementation uses an explicit `pendingGateId` or equivalent transient state; it does not derive pending state only from `routeState.requestedRouteId`.
- [ ] Gate open sets pending state for Portfolio/About.
- [ ] Gate dismiss clears pending state and restores the resolved route active tab.
- [ ] Gate success clears pending state and transitions to the target route active tab.
- [ ] Popstate/route settle clears stale pending state.
- [ ] Unauthenticated Portfolio request shows Portfolio as pending while the Portfolio gate is open.
- [ ] Unauthenticated About Me request shows About Me as pending while the About gate is open.
- [ ] Dismissing a gate restores the resolved route's active tab.
- [ ] Entering a correct gate code transitions to the target route and marks that target active.
- [ ] Browser back/forward updates active state without stale pending tabs.

### US-003: Create shell-owned dock navigation behavior

**Description:** As a developer, I need bottom tab navigation to use the shell route transition system instead of page-local listeners.

**Acceptance Criteria:**
- [ ] The dock does not depend on route runtimes attaching `data-nav-transition` handlers.
- [ ] Internal route navigation uses the SPA navigation bridge or a shell-owned transition callback.
- [ ] Gated Portfolio/About navigation preserves existing gate request behavior.
- [ ] Gate modal close/dismiss emits or calls a shell-observable state reset.
- [ ] External/social links remain unaffected.
- [ ] Reduced motion still reaches the correct route state.

### US-005: Define dock mount and transition ownership

**Description:** As a developer, I need the dock mounted in the shell layer where stacking and route transitions are predictable.

**Acceptance Criteria:**
- [ ] The dock mounts inside `.fade-content.ui-layer`, in the footer transition surface with `SiteFooter` or an explicitly documented sibling under the same z-index 200 UI layer.
- [ ] `#portfolio-sheet-host` remains above the dock at z-index 220/260.
- [ ] The dock participates in existing route/modal UI transition behavior unless explicitly documented otherwise.
- [ ] The dock remains pointer-transparent outside actual controls, matching shell UI behavior.

### US-004: Establish accessibility semantics

**Description:** As a keyboard or screen-reader user, I want the dock to communicate route state correctly.

**Acceptance Criteria:**
- [ ] The dock has a nav landmark with an accessible label.
- [ ] The current page tab uses `aria-current="page"`.
- [ ] Pending gated tab state has accessible text or state that does not falsely claim the route loaded.
- [ ] Home icon-only tab has a visible tooltip or accessible label.
- [ ] Keyboard tab order is predictable and does not trap focus.

## 4. Functional Requirements

- FR-1: The system must expose a single route-tab descriptor list for Home, Contact, Portfolio, and About Me.
- FR-2: The system must compute a display route from resolved route state plus pending gate state.
- FR-3: The system must support shell-owned route navigation from the bottom dock.
- FR-4: The system must preserve existing Portfolio/About gate access behavior.
- FR-5: The system must make one and only one route tab active or pending-active at a time.
- FR-6: The system must define a shell-observable event/state reset path for gate dismiss and route settle.
- FR-7: The dock must mount in a documented UI layer that does not violate portfolio drawer stacking.

## 5. Non-Goals

- No bottom frame geometry changes in this PRD.
- No final visual tab styling in this PRD.
- No removal of `#main-links` in this PRD.
- No removal of top bars in this PRD.

## 6. Design Considerations

- The dock is shared shell chrome.
- Primary nav belongs in the dock; top bars retain only local utilities in later PRDs.
- Active state must be visible without relying on motion alone.

## 7. Technical Considerations

- Relevant files: `routes.js`, `SiteApp.jsx`, `StudioShell.jsx`, `access-gates.js`, `useShellRouteTransition.js`, `spa-navigation.js`.
- Avoid a state model that only uses `routeState.route.id`; gated redirects make that insufficient.
- Keep modal/gate state compatibility until PRD 5 migrates legacy triggers.

## 8. Success Metrics

- Route tab state is correct across direct load, SPA navigation, gated request, gate dismissal, gate success, and browser back/forward.
- `check:site` passes after the foundation lands.

## 9. Resolved Decisions

- Pending gated state uses the same physical selected seat as active plus a subtle pending/access affordance, but does not use `aria-current="page"` until the route loads.
- While gate modals are open, the dock remains in the normal UI layer and follows existing modal-open shell treatment; pending state remains in DOM and is reset on dismiss/success.
