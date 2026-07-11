# PRD 03: Smooth Scroll And Drag Motion

## 1. Introduction

The current wheel interaction can move the carousel partway and then snap back to the same project. This feels yanked rather than smooth. This PRD rebuilds the input model so scroll and drag gestures commit predictably and settle gracefully.

## 2. Goals

- Make wheel, trackpad, mouse drag, and touch drag feel smooth and continuous.
- Convert deliberate gestures into project advancement instead of snap-back.
- Keep small accidental gestures from opening or changing projects.
- Preserve keyboard and reduced-motion behavior.

## 3. User Stories

### US-001: Deliberate Scroll Advances Project

**Description:** As a visitor, I want a clear wheel or trackpad gesture to move to the next project without bouncing back.

**Acceptance Criteria:**

- [ ] A deliberate wheel gesture advances at least one project when input passes the configured threshold.
- [ ] Fractional movement follows input while the gesture is active.
- [ ] Settling chooses the intended next/previous project based on accumulated intent and velocity, not only nearest integer.
- [ ] Repeated wheel events do not create visible stutter or target reversal.
- [ ] Verify in browser using dev-browser skill.

### US-002: Drag Feels Direct

**Description:** As a visitor, I want dragging the carousel to move the deck without jump, accidental open, or stuck capture.

**Acceptance Criteria:**

- [ ] Drag over the threshold moves the carousel continuously.
- [ ] Releasing after a deliberate drag settles to the intended project.
- [ ] Dragging on the active card does not trigger the project open transition.
- [ ] Pointer cancel/lost capture clears state.
- [ ] Touch drag works on mobile viewport.
- [ ] Verify in browser using dev-browser skill.

## 4. Functional Requirements

- FR-1: Introduce an explicit input state machine: idle, wheel-active, drag-active, settling, drawer-open.
- FR-2: Accumulate wheel intent across a short time window before settling.
- FR-3: Use velocity or threshold logic to commit to next/previous when the gesture is intentional.
- FR-4: Avoid immediate nearest-integer snap-back for gestures that exceed the commit threshold.
- FR-5: Keep per-frame updates compositor-only.
- FR-6: Respect `prefers-reduced-motion`.
- FR-7: Ensure carousel wheel handling is disabled while the project drawer is open.
- FR-8: Add QA traces that sample active-card center over time and fail on large reversals after committed input.

## 5. Non-Goals

- No decorative physics engine.
- No momentum model with many hard-to-tune constants.
- No page-level native scroll replacement outside the portfolio carousel.

## 6. Design Considerations

- Motion should feel calm and precise, not springy.
- A good first target is a short eased settle with no overshoot.

## 7. Technical Considerations

- Likely methods: `handleDeckWheel`, `handleDeckPointerDown`, `handleDeckPointerMove`, `finishDeckPointer`, `setDeckPosition`, `stepDeckAnimation`, `scheduleDeckSettle`.
- Existing constants: `scrollPixelsPerProject`, `inputCapProjects`, `followSmoothing`, `settleIdleMs`, `settleStrength`.

## 8. Success Metrics

- No observed snap-back on deliberate wheel gestures.
- No visible jump during drag start/end.
- Interaction remains responsive in browser screenshots/traces on desktop and mobile.

## 9. Open Questions

- Should one wheel notch always equal one project on mouse wheels? Recommended: no; accumulate intent, but let strong gestures commit.

