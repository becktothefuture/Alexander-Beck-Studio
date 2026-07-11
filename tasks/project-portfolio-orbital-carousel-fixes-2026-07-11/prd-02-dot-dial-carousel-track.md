# PRD 02: Dot Dial Carousel Track

## 1. Introduction

The current dot dial is a static arc where only opacity and scale change. The requested behavior is a second carousel: the dots should move with the cards, initially at the same speed, with room to tune parallax later.

## 2. Goals

- Reorient the dot dial so it reads as the lower arc of the carousel.
- Move dot positions continuously with carousel progress.
- Keep dot motion synchronized with card carousel motion by default.
- Preserve accessibility by keeping dots decorative unless a later PRD makes them interactive.

## 3. User Stories

### US-001: Moving Dot Carousel

**Description:** As a visitor, I want the dots under the deck to travel with the carousel so they feel connected to the card movement.

**Acceptance Criteria:**

- [ ] During wheel, drag, and keyboard movement, individual dot positions change continuously.
- [ ] The dot train moves in the same signed direction as the card carousel by default.
- [ ] The current active dot does not jump between fixed positions while the rest of the dial stays still.
- [ ] Verify in browser using dev-browser skill.

### US-002: Correct Lower-Arc Orientation

**Description:** As a visitor, I want the dot dial to sit under the cards and face the same orbital direction as the carousel.

**Acceptance Criteria:**

- [ ] Dots form a lower arc under the active card, not an inverted or misplaced arc.
- [ ] Dots do not collide with the bottom dock or card CTA.
- [ ] Mobile dot placement remains visible without crowding route tabs.
- [ ] Verify in browser using dev-browser skill.

## 4. Functional Requirements

- FR-1: Compute each dot angle from `(dotIndex - carouselProgress * dotCount)` or equivalent moving-phase math.
- FR-2: Add a configurable `dotParallaxRatio`, default `1`.
- FR-3: Add a configurable `dotArcDirection` or normalize the current math so positive carousel movement produces expected dot movement.
- FR-4: Keep `dotDensity`, `dotActiveScale`, and radius controls compatible.
- FR-5: Dot motion must use transform writes only.
- FR-6: Reduced motion may snap dots directly to the settled position.

## 5. Non-Goals

- No clickable dot navigation in this pass.
- No labels or tooltips on dots.
- No new pagination component outside the existing carousel stage.

## 6. Design Considerations

- Dots should feel like a quiet secondary orbital track, not a dominant pagination bar.
- The dot arc should echo the card orbit but can be smaller and flatter for readability.

## 7. Technical Considerations

- Main method: `updateDotDial()` in `react-app/app/src/legacy/modules/portfolio/app.js`.
- Main styles: `.portfolio-carousel-dot-dial` and `.portfolio-carousel-dot` in `react-app/app/public/css/portfolio.css`.
- Config should live under `portfolio.runtime.carousel`.

## 8. Success Metrics

- Browser trace shows dot coordinates changing during carousel movement.
- Dot placement passes visual review at desktop, tablet, and mobile sizes.

## 9. Open Questions

- After the synced version lands, should dots move slower than cards? Recommended future experiment: `dotParallaxRatio` around `0.65`.

