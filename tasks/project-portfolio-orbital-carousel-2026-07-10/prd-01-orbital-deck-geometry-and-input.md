# PRD 01: Orbital Deck Geometry And Input

## 1. Overview

Replace the current front-card-plus-depth-stack deck with an orbital carousel. Projects repeat around an implied circular path, so the center card is the active project while neighboring cards sit along the same circular circumference and peek from the sides. The carousel must advance from horizontal scroll, vertical scroll, touch drag, pointer drag, keyboard, and click-to-center.

## 2. Goals

- Render a bounded, visually infinite carousel from the project list.
- Keep the middle position locked to exactly one active project after motion settles.
- Allow both horizontal and vertical input to move the same carousel.
- Avoid scroll jacking: input should produce responsive carousel motion, not trapped dead scroll.
- Keep transforms compositor-friendly and avoid per-frame layout reads.
- Preserve correct project identity, focus, open target, and video target even when visual card instances are virtual/repeated.

## 3. User Stories

### US-001: Infinite Circular Project Layout

As a visitor, I see project cards arranged around a large circular path so the portfolio feels like a rotating dial.

Acceptance criteria:

- [ ] Desktop shows one centered active card, two clear side cards, and edge peeks where space allows.
- [ ] Mobile shows one dominant active card with adjacent peeks.
- [ ] The visual sequence repeats the project set without visible start/end.
- [ ] DOM instance count is bounded and does not grow with scroll duration.
- [ ] Each rendered visual instance maps to a canonical project via `data-project-index` and `data-project-id`.
- [ ] Only one active instance is focusable and opens the project; duplicate instances are inert or `aria-hidden`.
- [ ] Verify in browser using dev-browser skill.

### US-002: Multi-Axis Scroll And Drag

As a visitor, I can move the carousel naturally with vertical wheel, horizontal trackpad, touch drag, or pointer drag.

Acceptance criteria:

- [ ] Wheel/trackpad `deltaX` advances the carousel.
- [ ] Wheel/trackpad `deltaY` advances the carousel.
- [ ] Diagonal trackpad gestures resolve predictably using the stronger axis or configured combined intent.
- [ ] Browser `deltaMode` is normalized.
- [ ] Touch drag and pointer drag advance the carousel on both axes using a consistent signed direction.
- [ ] A drag over the threshold does not accidentally open a project.
- [ ] Pointer cancel/lost capture settles or restores without a stuck dragging state.
- [ ] Route chrome and drawer scroll surfaces keep their own native input behavior.
- [ ] Arrow keys move previous/next and keep focus accessible.
- [ ] Verify in browser using dev-browser skill.

### US-003: Gentle Center Snap

As a visitor, the carousel gently settles with a project centered after I stop scrolling or dragging.

Acceptance criteria:

- [ ] Fractional movement follows input during active gestures.
- [ ] Idle settling targets the nearest integer project index.
- [ ] Settling can be tuned through config.
- [ ] Reduced motion jumps or quickly settles without decorative movement.
- [ ] Active project announcements remain polite and not noisy.

## 4. Functional Requirements

- FR-1: Represent carousel position as a continuous project index.
- FR-2: Use modulo arithmetic to map card instances to project data.
- FR-3: Render enough card instances to fill desktop and mobile peeks, but keep the count bounded.
- FR-4: Calculate card pose from circular angle/radius values, not from the current vertical depth stack.
- FR-5: Active card must be the card nearest the center slot when settled.
- FR-6: Side cards must rotate and translate along a common circular path.
- FR-7: Input must support `deltaX`, `deltaY`, pointer drag, touch drag, keyboard, and click-to-center.
- FR-8: Prevent native page scroll only while the portfolio carousel is the intended input target and can respond.
- FR-9: Existing video play policy must continue to play only the active card video when videos are later enabled.
- FR-10: Keep `prefers-reduced-motion` behavior.
- FR-11: Use a bounded virtual card pool with a configurable max instance count; initial target is 9 to 13 instances on desktop and 5 to 7 on mobile.
- FR-12: Maintain one canonical semantic active card for focus/open/audit behavior even if visual duplicates exist.
- FR-13: Opening a project must use the canonical project index from the active instance, never the visual pool index.
- FR-14: No carousel animation frame may call `getBoundingClientRect`, `getComputedStyle`, or other layout-read APIs; geometry reads are allowed only during setup/resize/open handoff.
- FR-15: Repeatedly looping the carousel must not increase event listeners, DOM nodes, media nodes, or timers.
- FR-16: Reduced motion must avoid decorative orbit settling and settle/open within a short direct timing cap.

## 4.1 Input State Machine

- Idle: no pointer/scroll gesture is active; carousel may settle to nearest project.
- Wheel intent: normalize `deltaX`/`deltaY`/`deltaMode`, choose the stronger axis unless configured otherwise, apply capped fractional movement, then schedule settle.
- Drag intent: after movement crosses the drag threshold, pointer/touch owns carousel motion until release/cancel; card click/open is suppressed for that gesture.
- Click inactive card: center that project and announce it; do not open it immediately.
- Click active settled card: open the project.
- Keyboard: arrow keys move by one project; Enter/Space opens only the active settled project.
- Drawer open: carousel input is disabled and native drawer scrolling is preserved.
- Route chrome/bottom tabs: input must not be intercepted by the carousel.

## 5. Non-Goals

- No new project detail content.
- No native browser scroll-snap page.
- No unbounded cloned DOM list.
- No WebGL or canvas rewrite for cards.

## 6. Technical Considerations

- Current implementation to replace/adapt: `PortfolioScrollApp` in `react-app/app/src/legacy/modules/portfolio/app.js`.
- Current methods most likely affected: `renderProjectDeck`, `applyDeckTuning`, `getDeckPoseForPosition`, `handleDeckWheel`, pointer handlers, `updateDeckFromScroll`.
- Existing archived slider may inform interaction feel but should not be restored wholesale.
- The active route uses CSS transforms and WAAPI already; continue that pattern.

## 7. Validation

```bash
npm run build
ABS_DEV_URL=http://127.0.0.1:8012 npm run audit:portfolio-gate:quick
```

Manual/browser checks:

- Desktop trackpad horizontal.
- Desktop wheel vertical.
- Mobile touch drag.
- Keyboard previous/next/open.
- Reduced motion.

## 8. Success Metrics

- Carousel always settles with one centered active project.
- No visible start/end after at least three full loops.
- Carousel DOM/card/media instance count remains unchanged after at least three full loops.
- Animation loop uses transform/opacity/filter writes only and avoids layout reads.
- Static-image mode sustains target smoothness in browser QA: no obvious long frame clusters, no stuck input, no runaway timers.

## 9. Open Questions

- Recommended default: use the stronger absolute input axis per event, with a diagonal fallback based on combined intent.
- Recommended default: render 9 to 13 card instances depending on viewport width, not repeated full project arrays.
