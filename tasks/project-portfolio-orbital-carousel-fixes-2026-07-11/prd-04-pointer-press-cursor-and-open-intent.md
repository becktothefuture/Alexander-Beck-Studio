# PRD 04: Pointer Press, Cursor, And Open Intent

## 1. Introduction

Pointer down currently makes the active card jump because the press state applies a 3D transform under perspective. The custom cursor also shows a redundant `View Project` label even though the card has its own `View` CTA. This PRD removes those conflicting interaction treatments.

## 2. Goals

- Eliminate active-card jump on pointer down.
- Remove the custom `View Project` cursor label.
- Preserve a simple dot/tap cursor.
- Keep click-to-open, drag-to-move, and keyboard open behavior clear and separate.

## 3. User Stories

### US-001: Stable Pointer Down

**Description:** As a visitor, I want pressing a card to feel stable so the carousel does not look broken.

**Acceptance Criteria:**

- [ ] Pointer down on the active card changes the card center by no more than `2px`.
- [ ] Pointer down does not apply `translateZ` or perspective-affecting press transforms.
- [ ] Any press feedback is opacity, shadow, CTA, or subtle 2D-only treatment.
- [ ] Verify in browser using dev-browser skill.

### US-002: No Redundant Cursor Label

**Description:** As a visitor, I want one clear call to action, not a custom cursor label and a button competing.

**Acceptance Criteria:**

- [ ] Hovering the active card does not show cursor text `View Project`.
- [ ] The cursor remains the normal portfolio dot/tap cursor treatment.
- [ ] The active card CTA remains visible and legible.
- [ ] Verify in browser using dev-browser skill.

### US-003: Clear Open Intent

**Description:** As a visitor, I want click to open and drag to move without accidental cross-over.

**Acceptance Criteria:**

- [ ] A click/release on the settled active card opens the project.
- [ ] Dragging past threshold never opens the project.
- [ ] Clicking an inactive card centers it first and does not immediately open.
- [ ] Keyboard Enter/Space opens only the active settled card.
- [ ] Verify in browser using dev-browser skill.

## 4. Functional Requirements

- FR-1: Remove or disable `.portfolio-project-card.is-pressing` transforms that affect card position, especially `translateZ`.
- FR-2: Remove JS behavior that applies `abs-cursor-project-hover` and cursor label text for portfolio cards.
- FR-3: Keep cursor behavior compatible with gate, drawer, and route chrome states.
- FR-4: Keep card open origin measurement stable after pointer down.
- FR-5: Update pointer tests to measure before/during/after press card rects.

## 5. Non-Goals

- No redesign of the open drawer animation.
- No removal of the in-card `View` CTA.
- No new custom cursor style.

## 6. Design Considerations

- Press feedback can be as subtle as CTA contrast or shadow change.
- The carousel should feel object-stable; motion belongs to carousel movement, not click depression.

## 7. Technical Considerations

- Likely files: `react-app/app/public/css/portfolio.css`, `react-app/app/src/legacy/modules/portfolio/app.js`, shared cursor module only if portfolio-specific hooks live there.
- Watch for legacy cursor classes around `.abs-cursor-project-hover`.

## 8. Success Metrics

- Pointer-down rect audit passes at desktop and mobile.
- Hover screenshot shows no `View Project` cursor label.
- Existing drawer open audits continue to pass.

## 9. Open Questions

- Should the in-card button label change from `View` to `View Project` once the cursor label is removed? Recommended: keep `View` for compactness unless user requests otherwise.

