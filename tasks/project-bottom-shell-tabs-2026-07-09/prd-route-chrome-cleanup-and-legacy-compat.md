# PRD: Route Chrome Cleanup And Legacy Compatibility

## 1. Introduction

After the bottom dock, Contact route, geometry, and visual system are working, remove duplicated route navigation and migrate legacy trigger/readiness dependencies without breaking gates, sound, back behavior, or route transitions.

## 2. Goals

- Retire home visual `#main-links` from the center.
- Preserve or migrate legacy trigger IDs used by Contact, Portfolio, and CV/About gates.
- Update home readiness logic so it does not depend on removed visual links.
- Keep route top bars only where local utilities remain useful.
- Preserve Portfolio drawer stacking and gate flows.

## 3. User Stories

### US-001: Remove duplicate home center nav

**Description:** As a visitor, I want the primary navigation to live in the bottom shell, not duplicated near the hero.

**Acceptance Criteria:**
- [ ] Home no longer displays center `Contact`, `Portfolio`, and `About Me` buttons.
- [ ] Home route readiness no longer requires visible `#main-links .footer_link`.
- [ ] Entrance/transition animations still complete on Home.
- [ ] No invisible focusable duplicate nav remains.
- [ ] `audit:boot-overlay` passes.
- [ ] `certify:screens`, `audit:transition-flows`, `audit-modal-unified-behavior`, and simulation-focus audits are updated if they still assert `#main-links`.

### US-002: Preserve gate trigger compatibility

**Description:** As a developer, I need existing gate modules to continue working while trigger ownership moves to the dock.

**Acceptance Criteria:**
- [ ] Portfolio gate can open from the bottom dock when access is missing.
- [ ] About/CV gate can open from the bottom dock when access is missing.
- [ ] Correct gate code navigates to the target route.
- [ ] Existing modal DOM remains functional where retained.
- [ ] Legacy trigger IDs are either moved to dock controls or replaced by explicit code paths.

### US-003: Clean route-local duplicate navigation

**Description:** As a visitor, I want route chrome to be consistent and not show duplicate primary nav in both top and bottom positions.

**Acceptance Criteria:**
- [ ] Portfolio/CV top bars remove primary text navigation superseded by the bottom dock.
- [ ] Back controls remain where required.
- [ ] Sound slot remains available where required.
- [ ] Route top bars still follow `COMPONENT-LIBRARY.md`.
- [ ] Portfolio drawer still covers header/footer while open.

### US-004: Verify transitions after cleanup

**Description:** As a developer, I need cleanup to preserve route transition ownership.

**Acceptance Criteria:**
- [ ] Normal Chromium transition audit passes.
- [ ] Normal WebKit transition audit passes.
- [ ] Strict Chromium transition audit passes if route transition behavior changed.
- [ ] Strict WebKit transition audit passes if route transition behavior changed.
- [ ] Browser back/forward updates dock state and route content correctly.
- [ ] Validation scripts no longer require removed center nav or Contact modal selectors unless those elements remain intentional compatibility hooks.

## 4. Functional Requirements

- FR-1: Migrate or remove `#main-links` dependencies intentionally.
- FR-2: Migrate modal/gate trigger behavior to shell dock ownership.
- FR-3: Keep route topbar structure for local utilities.
- FR-4: Remove duplicated primary text nav only after replacement behavior is verified.
- FR-5: Preserve portfolio drawer layering.
- FR-6: Update validation scripts in the same PRD that removes or changes the selectors they assert.

## 5. Non-Goals

- No new route creation in this PRD.
- No bottom geometry changes in this PRD.
- No visual redesign beyond cleanup adjustments.

## 6. Design Considerations

- The bottom dock is the primary nav.
- Top bars become local utility chrome, not a second primary nav.
- Do not leave invisible interactive duplicates in the tab order.

## 7. Technical Considerations

- Relevant files: `HomeRoute.jsx`, `PortfolioRoute.jsx`, `CvRoute.jsx`, `useShellRouteTransition.js`, modal controllers, `main.css`, `portfolio.css`.
- Existing CSS and entrance animation selectors reference `#main-links`; update or retire them with care.
- Keep compatibility aliases only when necessary and document them.

## 8. Success Metrics

- No duplicate primary navigation appears.
- Gates, contact, sound, back, portfolio drawer, and transitions all continue working.
- Full route audits pass.

## 9. Resolved Decisions

- Prefer explicit shell/gate APIs over invisible focusable compatibility hooks.
- Non-focusable hidden compatibility hooks are allowed only if a legacy module still needs them and the PRD documents why.
- Portfolio route should keep local utility chrome only; primary text navigation belongs to the bottom dock.
