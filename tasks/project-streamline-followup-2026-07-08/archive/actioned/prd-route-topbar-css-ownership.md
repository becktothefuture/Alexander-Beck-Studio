# PRD: Route Topbar CSS Ownership

## 1. Introduction/Overview

The route topbar structure is now aligned across portfolio, CV, styleguide, and palette-lab, but CSS ownership is split between shared `main.css` and route-specific `portfolio.css`. This PRD centralizes shared topbar layout/responsive behavior while preserving portfolio-only detail/deck rules.

## 2. Goals

- Keep one shared owner for route topbar layout.
- Prevent CV and portfolio route topbars from drifting.
- Preserve portfolio-specific drawer/deck behavior.
- Keep mobile layout stable.

## 3. User Stories

### US-001: Identify shared versus portfolio-only topbar rules
**Description:** As a developer, I want topbar CSS classified so I know which file owns each behavior.

**Acceptance Criteria:**
- [ ] Shared layout, grid, spacing, and mobile behavior are identified.
- [ ] Portfolio-only reveal/deck/drawer behavior is identified.
- [ ] Comments or docs reflect the ownership decision.

### US-002: Move shared topbar CSS to shared owner
**Description:** As a maintainer, I want shared route topbar behavior in one place so adding a route does not require copying portfolio CSS.

**Acceptance Criteria:**
- [ ] Shared route topbar layout lives in `main.css` or another documented shared CSS file.
- [ ] `portfolio.css` contains only portfolio-specific route topbar overrides.
- [ ] No duplicate conflicting mobile topbar layout rules remain.

### US-003: Verify responsive topbars
**Description:** As a user, I want route topbars to remain readable and aligned on desktop and mobile.

**Acceptance Criteria:**
- [ ] Home navigation remains unchanged.
- [ ] Portfolio topbar is aligned on desktop and mobile.
- [ ] CV topbar is aligned on desktop and mobile.
- [ ] Styleguide examples remain aligned.
- [ ] **Verify in browser using dev-browser skill** across desktop and mobile.

## 4. Functional Requirements

- FR-1: Preserve the documented route topbar DOM contract.
- FR-2: Preserve sound slot placement.
- FR-3: Preserve back button icon treatment.
- FR-4: Preserve portfolio drawer above route chrome.

## 5. Non-Goals

- No new topbar component.
- No visual redesign.
- No footer changes.

## 6. Design Considerations

Route topbar has the same standing as the footer and must match `COMPONENT-LIBRARY.md` and `SITE-STYLEGUIDE.md`.

## 7. Technical Considerations

CSS changes are visually sensitive. Use screenshot certification plus targeted browser checks around mobile widths.

## 8. Success Metrics

- Route topbar behavior is easier to maintain.
- No visible regression in home, portfolio, CV, or styleguide.

## 9. Open Questions

- Should route topbar rules stay in `main.css`, or should a dedicated shared shell CSS file be introduced later?
