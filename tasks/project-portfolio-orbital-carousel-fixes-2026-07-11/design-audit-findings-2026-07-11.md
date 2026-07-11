# Design Audit Findings: Portfolio Orbital Carousel

Date: 2026-07-11

## Audit Setup

- Preview URL: `http://127.0.0.1:8013/portfolio.html`
- Access code used: `739284`
- Viewports checked:
  - Desktop wide: `2048x1152`
  - Desktop: `1440x900`
  - Tablet: `1024x768`
  - Mobile: `390x844`
- Artifacts: `output/playwright/portfolio-carousel-design-audit-2026-07-11/`

## Summary

The current carousel direction is right, but the implementation is not release-quality. Cards overlap at every tested viewport, the dot dial is visually inverted and acts as a static indicator rather than a moving carousel, wheel input often moves fractionally then snaps back to the same project, card press state causes a large perspective jump, the custom "View Project" cursor competes with the in-card CTA, and the thumbnail accent gradient is too weak to read as project-colored.

## Findings

### F-001: Cards Overlap Across Viewports

Severity: High

Evidence:

- Desktop wide audit found `8` card-overlap pairs.
- Desktop audit found `6` card-overlap pairs.
- Tablet audit found `4` card-overlap pairs.
- Mobile audit found `2` card-overlap pairs.
- Example desktop overlap: `chapter-2` and `chapter-5` overlap by about `112px` horizontally and `368px` vertically.

Observed result:

- Side cards collide with each other and sometimes with the active card.
- Mobile cards are too wide for the available orbital spacing, so the deck reads cramped rather than intentional.

Likely causes:

- Current orbit uses `pathRadiusPx`, `angleStepDeg`, `sideScale`, and card width independently, with no minimum separation solver.
- Mobile/desktop interpolation keeps large cards while reducing available horizontal room.
- The virtual pool shows more visible cards than the viewport can support without collision.

### F-002: Dot Dial Faces The Wrong Way And Does Not Travel

Severity: High

Evidence:

- Dot coordinates are fixed per index in `updateDotDial()`.
- During wheel movement, dot `10` had `dx: 0`, `dy: 0`; only opacity/active-dot selection changed.
- Brightest dot jumps between fixed positions instead of the dot train translating like a second carousel.

Observed result:

- Dots read like a static upside-down/incorrectly oriented arc.
- They do not move with the carousel and do not create the parallax/secondary-carousel behavior requested.

Likely causes:

- `updateDotDial()` calculates each dot angle from `index / dotCount`, not from `index - progress`.
- The visual active state changes by opacity/scale, but dot positions are not offset by carousel progress.
- Dot arc uses `y = -radius * (1 - cos(angle))`, which places the arc opposite to the intended lower carousel path.

### F-003: Scroll Movement Feels Janky And Often Snaps Back

Severity: High

Evidence:

- A wheel gesture over the deck moved the active card fractionally and then settled back to the same active project.
- Desktop active-card center moved from `720px` to about `663px`, then eased back toward center without advancing.
- Mobile active-card center moved from `195px` to about `146px`, then eased back.

Observed result:

- Scrolling feels like a yank because a strong gesture can move the deck partway then reverse to the same project.
- A visitor expects scroll intent to advance to the next project, not bounce back unless the gesture is tiny.

Likely causes:

- `inputCapProjects` caps a single wheel event at `0.32` projects.
- Settle chooses the nearest integer, so most single gestures are rounded back to the current project.
- There is no accumulated wheel intent/velocity threshold that commits to the next project.

### F-004: Pointer Down Makes The Active Card Jump

Severity: Critical

Evidence:

- Desktop active card center moved from `(720, 552)` to about `(881, 786)` on pointer down.
- Mobile active card center moved from `(195, 489)` to a different projected position by about `135px x 198px`.
- The CSS press state sets `--portfolio-card-press-y: 4px`, `--portfolio-card-press-z: -24px`, and `--portfolio-card-press-scale: 0.985` under a perspective transform.

Observed result:

- Clicking or starting a drag on the card makes it jump out of position.
- This makes the carousel feel broken and undermines confidence in the open transition.

Likely causes:

- `.portfolio-project-card.is-pressing` applies 3D press transforms inside the same transform stack as the orbital pose.
- Under perspective, the press `translateZ` projects into a large apparent screen-position shift.

### F-005: "View Project" Cursor Is Redundant

Severity: Medium

Evidence:

- Hovering the active card adds `#custom-cursor.abs-cursor-project-hover` with text `View Project`.
- The active card already has an in-card `View` CTA.

Observed result:

- The custom label competes with the card UI and creates a second call to action.
- User requested keeping the dot cursor and relying on the in-card view button.

Likely causes:

- Portfolio-specific cursor hover state remains from the older interaction model.

### F-006: Thumbnail Accent Gradient Is Too Weak

Severity: Medium

Evidence:

- Content includes `thumbnailAccent` per project.
- Runtime sets `--portfolio-card-accent`.
- CSS veil uses the accent at only part of the top gradient and mixes it heavily with dark blue/black, making the result look generic dark rather than project-colored.

Observed result:

- Cards do not clearly pick up the project thumbnail color.
- The active and inactive cards read as the same dark overlay treatment.

Likely causes:

- Accent is technically present but visually suppressed by low mix percentages and dark fixed color stops.
- There is no screenshot/assertion that compares rendered card gradient against the expected project accent.

## Recommended PRD Split

1. Geometry: make card non-overlap a hard responsive contract.
2. Dot dial: rebuild it as a second moving carousel track.
3. Motion/input: smooth scroll, commit intent, and drag behavior.
4. Pointer/cursor/open intent: remove press jump and redundant cursor label.
5. Accent gradient: make thumbnail accents visible and testable.
6. QA gates: add browser checks for these exact regressions.

