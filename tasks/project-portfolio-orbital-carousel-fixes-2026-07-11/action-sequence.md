# Action Sequence

## Phase 0: Review Checkpoint

Review this packet before implementation. Confirm whether to action all PRDs or split the work into separate agent lanes.

Recommended lane split:

- Lane A: geometry and responsive layout.
- Lane B: dots and carousel motion.
- Lane C: pointer/cursor/open intent.
- Lane D: accent gradient and visual QA.

## Phase 1: Stop The Visual Breakage

PRDs:

- `prd-01-non-overlap-responsive-carousel-geometry.md`
- `prd-04-pointer-press-cursor-and-open-intent.md`

Exit criteria:

- Cards do not overlap at `2048x1152`, `1440x900`, `1024x768`, and `390x844`.
- Pointer down on the active card changes center position by no more than `2px`.
- The custom cursor does not show `View Project`.

## Phase 2: Rebuild Carousel Motion Surfaces

PRDs:

- `prd-02-dot-dial-carousel-track.md`
- `prd-03-smooth-scroll-and-drag-motion.md`

Exit criteria:

- Dot positions move with carousel progress.
- A deliberate wheel or drag gesture advances to the next project without snapping back to the same card.
- Movement is smooth under repeated wheel, trackpad-like, mouse-drag, and touch-drag input.

## Phase 3: Restore Art Direction

PRD:

- `prd-05-thumbnail-accent-gradient-contract.md`

Exit criteria:

- The top veil/gradient visibly reflects each project accent while keeping title contrast.
- The active CTA remains legible on every project card.

## Phase 4: Verification And Handoff

PRD:

- `prd-06-visual-qa-and-regression-gates.md`

Required verification:

```bash
git diff --check
npm run check:site
npm run check:design-config
npm run build
npm run preview
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-gate:quick
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-drawer
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-drawer:pointer
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows
```

Manual/visual evidence:

- Capture and inspect desktop, tablet, and mobile screenshots.
- Capture at least one hover state and one drag/scroll state.
- Capture a short interaction trace or frame sequence proving smooth motion and moving dots.

