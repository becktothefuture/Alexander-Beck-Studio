# PRD 01: Non-Overlap Responsive Carousel Geometry

## 1. Introduction

The portfolio carousel currently overlaps cards at desktop, tablet, and mobile sizes. This PRD makes non-overlap a first-class geometry contract rather than a best-effort visual tuning target.

## 2. Goals

- Ensure cards never overlap in the closed carousel at supported viewport sizes.
- Preserve the orbital carousel direction: one dominant active card, clear adjacent cards, and edge peeks where space allows.
- Increase perceived spacing across the deck.
- Keep the active card centered and visually stable.

## 3. User Stories

### US-001: No Card Overlap

**Description:** As a visitor, I want the portfolio cards to sit in a clean orbital arrangement so the design feels intentional and premium.

**Acceptance Criteria:**

- [ ] No two visible card bounding boxes overlap by more than `4px` on either axis at `2048x1152`, `1440x900`, `1024x768`, and `390x844`.
- [ ] Side cards may be clipped by the portfolio wall edge, but they must not collide with the active card.
- [ ] The active card remains horizontally centered when settled.
- [ ] Verify in browser using dev-browser skill.

### US-002: Responsive Card Count And Peek Rules

**Description:** As a visitor on smaller screens, I want one main card with controlled side peeks rather than a crowded row of full cards.

**Acceptance Criteria:**

- [ ] Desktop can show active card plus meaningful left/right neighbors when spacing permits.
- [ ] Tablet reduces visible side-card count or scale before overlap occurs.
- [ ] Mobile shows the active card plus narrow side peeks only.
- [ ] The number of visible cards is derived from viewport/card geometry, not hard-coded desktop assumptions.
- [ ] Verify in browser using dev-browser skill.

## 4. Functional Requirements

- FR-1: Add a layout calculation that enforces a minimum visual gap between cards.
- FR-2: Card width, side scale, angle step, path radius, and visible pool count must be solved together per viewport.
- FR-3: If the viewport cannot fit the configured number of cards, hide or fade outer cards before allowing overlap.
- FR-4: Mobile-specific card sizing must preserve bottom dock clearance and dot-dial clearance.
- FR-5: Card clipping at the wall edge is allowed only for edge peeks, not for the active card.
- FR-6: Add a browser-side geometry assertion for overlap in the QA script from PRD 06.

## 5. Non-Goals

- No redesign of the project drawer.
- No change to project content order.
- No return to the old vertical stack layout.

## 6. Design Considerations

- Increase spacing first; reduce side-card scale/count second.
- Maintain the current refined card shape and image-first direction.
- The active card should feel calmer than the side cards: centered, upright, and not compressed.

## 7. Technical Considerations

- Likely files: `react-app/app/src/legacy/modules/portfolio/app.js`, `react-app/app/public/css/portfolio.css`, `react-app/app/public/config/design-system.json`, generated portfolio config after flattening.
- Existing relevant settings: `pathRadiusPx`, `mobilePathRadiusPx`, `angleStepDeg`, `mobileAngleStepDeg`, `sideScale`, `farScale`, and card width/height settings. Card instances are a permanent project-bound ring; pool-size controls are intentionally retired.

## 8. Success Metrics

- Zero blocking overlap findings in automated geometry audit.
- Visual screenshots read as spacious on desktop and mobile.
- No new route-shell or drawer regression.

## 9. Open Questions

- Should mobile prefer a larger active card with tiny peeks, or a slightly smaller active card with clearer neighbors? Recommended default: larger active card with tiny peeks.
