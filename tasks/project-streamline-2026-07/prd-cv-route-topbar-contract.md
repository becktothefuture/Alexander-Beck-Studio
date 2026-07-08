# PRD: CV Route Topbar Contract

## 1. Introduction/Overview

Align the CV/About route topbar with the documented route-topbar contract. Current docs say CV primary text actions belong in `route-topbar__center`, with right reserved for sound, but the implementation places the nav inside `route-topbar__left` beside the back button.

## 2. Goals

- Resolve code/doc drift for CV route chrome.
- Treat `COMPONENT-LIBRARY.md` and `SITE-STYLEGUIDE.md` as authoritative unless the user explicitly approves an exception.
- Preserve the shared `MainNavLink` / `.footer_link` and `.abs-icon-btn` button families.
- Avoid new text-button classes or absolute-center layouts.
- Verify the route visually on desktop and mobile.

## 3. User Stories

### US-001: Align CV topbar markup
**Description:** As a visitor, I want CV route navigation to behave consistently with the shared route chrome so the page feels like part of the same shell.

**Acceptance Criteria:**
- [ ] `CvRoute.jsx` moves CV primary text actions into `route-topbar__center` according to the canonical contract.
- [ ] Back remains an `.abs-icon-btn`.
- [ ] Text actions use `MainNavLink` inside `.ui-main-nav`.
- [ ] Sound remains in `#sound-toggle-slot`.
- [ ] Verify in browser using dev-browser skill on desktop and mobile.

### US-002: Add or update styleguide coverage
**Description:** As a developer, I want the styleguide to show the correct route topbar pattern so future route work copies the right structure.

**Acceptance Criteria:**
- [ ] `/styleguide.html` route-topbar example reflects the chosen CV/portfolio contract.
- [ ] `COMPONENT-LIBRARY.md` and `SITE-STYLEGUIDE.md` agree with the implementation.
- [ ] `npm run certify:screens` passes after visual changes.

## 4. Functional Requirements

- FR-1: CV route chrome must use only `MainNavLink` for text actions and `.abs-icon-btn` for glyph actions.
- FR-2: CV route chrome must not introduce alternate button classes.
- FR-3: Topbar layout must remain grid-based and in-flow.
- FR-4: The implementation and docs must describe the same ownership of left, center, and right columns.

## 5. Non-Goals

- No redesign of CV/About page content.
- No changes to portfolio drawer stacking.
- No changes to modal gating logic.

## 6. Design Considerations

- Keep the route topbar visually aligned with portfolio and styleguide.
- Preserve accessible labels for Back, Portfolio, Contact, and sound controls.
- Maintain mobile text fit and predictable tap targets.

## 7. Technical Considerations

- The likely default is to treat docs as authoritative and move CV text actions to the documented center position.
- If visual review shows the current left-cluster layout is intentionally better, update docs instead and record the exception.

## 8. Success Metrics

- CV topbar code and docs no longer disagree.
- Browser screenshots show no overlap or alignment drift across desktop/mobile.

## 9. Decisions

- Default implementation must align code to the current canonical docs.
