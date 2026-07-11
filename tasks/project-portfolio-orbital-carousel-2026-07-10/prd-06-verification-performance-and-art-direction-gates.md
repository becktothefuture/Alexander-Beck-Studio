# PRD 06: Verification, Performance, And Art Direction Gates

## 1. Overview

The carousel is a high-visibility portfolio feature with motion, image/video readiness, route transitions, and detailed visual direction. Verification must include browser screenshots, motion/input checks, performance checks, and an art-direction review against the supplied references.

## 2. Goals

- Prevent visual drift from the Figma/reference intent.
- Verify desktop and mobile interaction paths.
- Verify Safari/WebKit compatibility for the open transition.
- Keep carousel baseline performant enough for future video thumbnails.
- Update audits to reflect the new carousel structure and dot dial.
- Move carousel-specific audit selector updates early enough that Phase 1 and Phase 5 gates are meaningful.

## 3. User Stories

### US-001: Browser Visual Proof

As the site owner, I can inspect screenshots and know the implementation matches the intended direction.

Acceptance criteria:

- [ ] Screenshots are generated for home, portfolio closed, portfolio active hover/focus, project open, and mobile portfolio.
- [ ] Screenshot states include closed/default, fractional mid-scroll, active hover/focus, opening in-flight where feasible, settled open hero, mobile closed, mobile open, light mode, and dark mode.
- [ ] Screenshots are inspected by the lead agent before claiming success.
- [ ] Art-direction notes cover proportions, type, card crop, CTA, dot dial, and light/dark modes.

### US-002: Interaction Proof

As a visitor, every expected input path works.

Acceptance criteria:

- [ ] Vertical wheel advances projects.
- [ ] Horizontal trackpad advances projects.
- [ ] Touch drag advances projects.
- [ ] Pointer drag advances projects.
- [ ] Keyboard previous/next/open works.
- [ ] Click inactive card centers it instead of opening immediately.
- [ ] Click active card opens it.

### US-003: Performance Proof

As a maintainer, I know the carousel is ready for future thumbnail video without architectural rework.

Acceptance criteria:

- [ ] DOM instance count is bounded.
- [ ] No per-frame layout reads are introduced in the carousel animation loop.
- [ ] Non-active videos stay paused when video fields are enabled.
- [ ] Static-image mode remains smooth in desktop and mobile browser checks.
- [ ] Carousel DOM/card/media instance count is unchanged after repeated loops.
- [ ] Active video assertions prove only one thumbnail video can play.
- [ ] Performance review includes a frame-time or trace artifact when practical, plus code inspection for animation-loop layout reads.

### US-004: Transition And Route Proof

As a maintainer, route and drawer contracts still pass.

Acceptance criteria:

- [ ] Portfolio gate audit passes.
- [ ] Portfolio drawer audit passes.
- [ ] Portfolio audits are updated before they are used as phase gates.
- [ ] An orbital carousel audit covers wheel X/Y, pointer drag, keyboard, inactive-card center, active-card open, bounded DOM count, active CTA visibility, and dot dial presence.
- [ ] Transition flows pass Chromium and WebKit.
- [ ] Strict RAF transition audits pass or failures are documented and fixed.
- [ ] Reduced-motion transition audits pass Chromium and WebKit.
- [ ] Boot overlay audit passes.
- [ ] Layer stacking remains aligned with `docs/reference/LAYER-STACKING.md`.

## 4. Functional Requirements

- FR-1: Update existing portfolio audits to query the new active card and dot dial selectors.
- FR-2: Add audit assertions that the active card has visible client/title/CTA and inactive cards do not show CTA.
- FR-3: Add or update assertions for bounded card instance count.
- FR-4: Add visual QA capture for mobile portfolio.
- FR-5: Record screenshots under `output/playwright/` or the repo's existing gitignored output path.
- FR-6: Include WebKit transition validation.
- FR-7: Include reduced-motion validation.
- FR-8: Update `docs/reference/PORTFOLIO.md` after implementation.
- FR-9: Add or update portfolio screenshot capture beyond `certify:screens` if the existing script does not cover active hover/focus, open project, mobile open, and in-flight/open-transition states.
- FR-10: Include config parity proof: dev live change, save, reload, build, preview, and confirmation.
- FR-11: Include WebKit strict RAF with `ABS_TRANSITION_HARD_TIMEOUT_MS=300000`.

## 5. Non-Goals

- No automated pixel-perfect Figma diff unless explicitly requested.
- No production deployment in this PRD packet unless the user later asks to publish.

## 6. Technical Considerations

- Existing commands include `certify:screens`, `audit:portfolio-gate`, `audit:portfolio-drawer`, `audit:portfolio-drawer:pointer`, and `audit:transition-flows`.
- Figma MCP context should be refreshed before final art-direction signoff if access is restored.
- Screenshots alone are not enough; inspect computed interaction state and visual output.

## 7. Validation

```bash
git diff --check
npm run check:site
npm run check:design-config
npm run build
npm run preview
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:boot-overlay
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-gate
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-drawer
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-drawer:pointer
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit ABS_TRANSITION_STRICT_RAF=1 ABS_TRANSITION_HARD_TIMEOUT_MS=300000 npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium ABS_TRANSITION_REDUCED_MOTION=1 npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit ABS_TRANSITION_REDUCED_MOTION=1 npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 npm run certify:screens
```

## 8. Success Metrics

- Carousel visually matches the supplied references at the level of composition, hierarchy, and interaction feel.
- All route/drawer/transition gates pass.
- No new performance bottleneck is visible in static-image mode.

## 9. Open Questions

- Recommended default: require user visual review after the first browser-verified implementation before tuning video thumbnails.
