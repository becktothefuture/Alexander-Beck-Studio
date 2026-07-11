# Implementation Prompt: Portfolio Orbital Carousel Fixes

Use this prompt to action the Portfolio orbital carousel fix packet end to end.

---

You are Codex working in `/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website`.

## Objective

Fix the current Portfolio orbital carousel defects documented in:

- `tasks/project-portfolio-orbital-carousel-fixes-2026-07-11/README.md`
- `tasks/project-portfolio-orbital-carousel-fixes-2026-07-11/design-audit-findings-2026-07-11.md`
- `tasks/project-portfolio-orbital-carousel-fixes-2026-07-11/action-sequence.md`
- `tasks/project-portfolio-orbital-carousel-fixes-2026-07-11/prd-01-non-overlap-responsive-carousel-geometry.md`
- `tasks/project-portfolio-orbital-carousel-fixes-2026-07-11/prd-02-dot-dial-carousel-track.md`
- `tasks/project-portfolio-orbital-carousel-fixes-2026-07-11/prd-03-smooth-scroll-and-drag-motion.md`
- `tasks/project-portfolio-orbital-carousel-fixes-2026-07-11/prd-04-pointer-press-cursor-and-open-intent.md`
- `tasks/project-portfolio-orbital-carousel-fixes-2026-07-11/prd-05-thumbnail-accent-gradient-contract.md`
- `tasks/project-portfolio-orbital-carousel-fixes-2026-07-11/prd-06-visual-qa-and-regression-gates.md`

The final result must be a visually verified, smooth, responsive carousel where cards do not overlap, dots move as a second carousel track, scroll and drag feel intentional, card press does not jump, the redundant `View Project` cursor is gone, and thumbnail accent gradients visibly reflect each project.

## Context To Read First

Read these before editing:

1. The full fix packet listed above.
2. The original carousel packet for baseline intent:
   - `tasks/project-portfolio-orbital-carousel-2026-07-10/README.md`
   - `tasks/project-portfolio-orbital-carousel-2026-07-10/action-sequence.md`
   - `tasks/project-portfolio-orbital-carousel-2026-07-10/figma-findings-2026-07-11.md`
3. The active implementation surfaces:
   - `react-app/app/src/legacy/modules/portfolio/app.js`
   - `react-app/app/public/css/portfolio.css`
   - `react-app/app/public/config/contents-portfolio.json`
   - `react-app/app/public/config/design-system.json`
   - `react-app/app/src/legacy/modules/portfolio/portfolio-config.js`
   - `react-app/app/src/legacy/modules/portfolio/panel/control-registry.js`

Start with:

```bash
git status --short --branch
```

Record unrelated dirty files and do not touch them.

## Non-Negotiable Requirements

- Cards must never visually overlap in the closed carousel at `2048x1152`, `1440x900`, `1024x768`, or `390x844`.
- Pointer down on the active card must not move its center by more than `2px`.
- The custom cursor must not show `View Project`; keep the normal dot/tap cursor treatment and the in-card `View` CTA.
- The dot dial must move with carousel progress as a second carousel track. Start with `dotParallaxRatio: 1`.
- A deliberate wheel or drag gesture must advance to the next/previous project instead of yanking partway and snapping back to the same card.
- Thumbnail accent gradients must be visibly project-colored while keeping title and CTA readable.
- Preserve the existing route shell, gate, project drawer, bottom dock, and shared wall/frame geometry unless the PRD explicitly requires a portfolio-local adjustment.
- Do not rewrite the site architecture, canvas system, route shell, or drawer model.
- Do not hand-edit generated config outputs. Update the canonical config and run the repo's flatten/build workflow.

## Implementation Order

Follow `action-sequence.md`.

### Phase 1: Stop Visual Breakage

Action:

- `prd-01-non-overlap-responsive-carousel-geometry.md`
- `prd-04-pointer-press-cursor-and-open-intent.md`

Implement:

- A responsive geometry solver or guard that ties card width, side scale, angle step, path radius, and visible pool count together.
- Hide/fade outer cards before overlap is allowed.
- Mobile-specific peeking rules that keep one dominant active card plus narrow neighbor peeks.
- Removal of perspective-affecting press transforms such as active-card `translateZ` on pointer down.
- Removal of the `View Project` cursor label behavior.

Exit checks:

- Browser geometry check shows no blocking overlap at all target viewports.
- Pointer-down rect delta is `<= 2px`.
- Hover screenshot shows no `View Project` cursor label.

### Phase 2: Rebuild Motion Surfaces

Action:

- `prd-02-dot-dial-carousel-track.md`
- `prd-03-smooth-scroll-and-drag-motion.md`

Implement:

- Moving dot math based on carousel progress, not fixed dot positions.
- Correct lower-arc dot orientation and responsive placement.
- A clear carousel input state machine: idle, wheel-active, drag-active, settling, drawer-open.
- Wheel intent accumulation so deliberate wheel gestures commit to a neighboring project.
- Drag movement that is direct, smooth, and never opens a project after crossing the drag threshold.

Exit checks:

- Individual dot coordinates change during wheel/drag/keyboard carousel movement.
- A deliberate wheel gesture advances the active project.
- A deliberate drag gesture advances the active project.
- No obvious snap-back/yank in browser interaction.

### Phase 3: Restore Art Direction

Action:

- `prd-05-thumbnail-accent-gradient-contract.md`

Implement:

- Stronger project-colored card veil/gradient treatment using existing `thumbnailAccent` values.
- Active and inactive accent strengths if needed.
- Contrast-safe text and CTA treatment across all six canonical projects.

Exit checks:

- Each project has a visibly distinct accent when active.
- Client, title, and CTA remain readable across every card.

### Phase 4: Verification And Regression Gates

Action:

- `prd-06-visual-qa-and-regression-gates.md`

Implement:

- A durable Playwright audit or equivalent browser QA script for:
  - no card overlap;
  - pointer-down center delta;
  - no `View Project` cursor label;
  - moving dot coordinates;
  - committed wheel/drag advancement.
- Store artifacts under `output/playwright/`.

Exit checks:

- New carousel QA passes.
- Existing portfolio and transition audits still pass.

## Technical Guidance

Likely implementation areas:

- Geometry and input:
  - `applyDeckTuning`
  - `getDeckPoseForOffset`
  - `updateDeckFromScroll`
  - `handleDeckWheel`
  - pointer handlers around deck and card gestures
- Dot dial:
  - `createDotDial`
  - `updateDotDial`
  - `.portfolio-carousel-dot-dial`
  - `.portfolio-carousel-dot`
- Press/cursor:
  - `handleCardPointerDown`
  - `handleCardPointerMove`
  - `handleCardPointerUp`
  - `.portfolio-project-card.is-pressing`
  - `.abs-cursor-project-hover`
- Accent gradients:
  - `resolveThumbnailAccent`
  - `getProjectCardTheme`
  - `applyProjectCardTheme`
  - `.portfolio-project-card__media-veil`
- Config:
  - `react-app/app/public/config/design-system.json`
  - `react-app/app/src/legacy/modules/portfolio/portfolio-config.js`
  - `react-app/app/src/legacy/modules/portfolio/panel/control-registry.js`

Keep animation-frame work compositor-only. Do not call `getBoundingClientRect`, `getComputedStyle`, or other layout-read APIs inside the carousel frame loop.

## Required Visual QA

Use real browser screenshots and inspect them before reporting success.

Capture at minimum:

- `2048x1152` closed carousel.
- `1440x900` closed carousel.
- `1024x768` closed carousel.
- `390x844` closed carousel.
- Desktop hover state over active card.
- Desktop pointer-down state over active card.
- Desktop after deliberate wheel gesture.
- Desktop after deliberate drag gesture.
- Mobile after deliberate drag gesture.
- Active cards for all six projects, or enough stepped screenshots to prove every accent gradient is readable.
- Project drawer open state to confirm no drawer regression.

Use the portfolio code `739284` when the gate is shown.

## Required Commands

Use the repo's existing commands and run audits against a production preview where required.

Minimum final command set:

```bash
git diff --check
npm run check:site
npm run check:design-config
npm run build
npm run preview
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-gate:quick
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-drawer
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-drawer:pointer
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:canvas-spa:quick
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows
```

Also run the new carousel-specific QA script created for PRD 06.

Run `npm run certify:screens` if the final visual changes affect certified screenshots. If it fails on known unrelated home/about dark near-blank thresholds, document the exact failures and still inspect the portfolio screenshots manually.

## Acceptance Criteria

The work is complete only when:

- All six PRDs are actioned or any intentionally deferred scope is explicitly listed.
- Cards do not overlap at the required viewport sizes.
- Dots move as a carousel track.
- Wheel and drag movement commit smoothly without yank/snap-back.
- Active card pointer down does not visually jump.
- The `View Project` cursor label is gone.
- Project accent gradients are visible and readable.
- Browser screenshots have been inspected.
- Relevant automated gates pass, with any unrelated known failures documented precisely.
- Final diff contains only intended files.

## Final Response Format

Report:

1. Files changed.
2. PRDs actioned, by phase.
3. Bugs found during QA and how they were fixed.
4. Verification commands and pass/fail results.
5. Screenshot/artifact paths inspected.
6. Remaining risks or follow-ups.

Do not commit or push unless the user explicitly asks for that in the same task.

