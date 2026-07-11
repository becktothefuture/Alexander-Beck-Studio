# PRD 06: Visual QA And Regression Gates

## 1. Introduction

The current issues are visual and interaction regressions that command-only checks did not catch. This PRD defines the QA gates needed before publishing carousel fixes.

## 2. Goals

- Add repeatable checks for card overlap, dot movement, pointer jump, cursor label removal, and scroll advancement.
- Capture screenshots at representative desktop, tablet, and mobile viewports.
- Keep QA artifacts under `output/playwright/`.
- Preserve existing portfolio gate, drawer, canvas, and transition audits.

## 3. User Stories

### US-001: Geometry Regression Check

**Description:** As an implementer, I want an automated browser check to catch card overlap before review.

**Acceptance Criteria:**

- [ ] Browser QA measures visible `.portfolio-project-card` rects at required viewports.
- [ ] The check fails if visible cards overlap beyond the accepted tolerance.
- [ ] The check saves screenshots for failure review.
- [ ] Verify in browser using dev-browser skill.

### US-002: Interaction Regression Check

**Description:** As an implementer, I want automated checks for the exact interaction defects found in audit.

**Acceptance Criteria:**

- [ ] Pointer-down rect delta is measured and fails above `2px`.
- [ ] Hover state fails if cursor text contains `View Project`.
- [ ] Wheel/drag trace verifies a committed gesture advances the carousel.
- [ ] Dot-position trace verifies individual dot coordinates change during movement.
- [ ] Verify in browser using dev-browser skill.

### US-003: Visual Evidence Pack

**Description:** As a reviewer, I want screenshots that make it easy to judge whether the design feels fixed.

**Acceptance Criteria:**

- [ ] Capture desktop wide, desktop, tablet, and mobile closed states.
- [ ] Capture hover state without cursor label.
- [ ] Capture one mid-motion or after-scroll state showing moved cards and dots.
- [ ] Capture project drawer open state to prove no regression.
- [ ] Store artifacts in `output/playwright/portfolio-carousel-fixes-qa-*`.

## 4. Functional Requirements

- FR-1: Add or update a Playwright audit script for carousel design QA.
- FR-2: Run against preview build, not only Vite dev.
- FR-3: Keep existing audits passing: portfolio gate, drawer, drawer pointer, canvas SPA, transition flows.
- FR-4: If `npm run certify:screens` still fails on unrelated home/about dark false positives, document the exact failures and confirm portfolio screenshots pass visual inspection.
- FR-5: Include reduced-motion coverage for carousel movement and project open behavior.

## 5. Non-Goals

- No pixel-perfect snapshot testing.
- No screenshot artifact commit.
- No replacement for human visual inspection.

## 6. Design Considerations

- Screenshots should be inspected before claiming success.
- QA should include both still composition and interaction traces.

## 7. Technical Considerations

- Existing scripts to preserve: `audit:portfolio-gate:quick`, `audit:portfolio-drawer`, `audit:portfolio-drawer:pointer`, `audit:canvas-spa:quick`, `audit:transition-flows`, `certify:screens`.
- New script can live under `scripts/` if it becomes durable; scratch probes stay under `output/playwright/` or `tmp/`.

## 8. Success Metrics

- All new carousel regression checks pass.
- Existing portfolio and transition audits pass.
- Reviewer can inspect artifact screenshots and see no overlap, no cursor label, moving dots, and smooth carousel state.

## 9. Open Questions

- Should the new carousel QA become part of `npm run check:site`? Recommended: add as a named audit first, then promote after it is stable.

