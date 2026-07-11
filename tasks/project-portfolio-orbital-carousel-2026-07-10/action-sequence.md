# Action Sequence

## Phase 0: PRD Review And Baseline

Before implementation:

```bash
git status --short
npm run check:site
npm run build
```

Review this PRD packet with the swarm lanes listed in `README.md`. Resolve findings before code changes.

Exit gate:

```bash
git diff --check
```

## Phase 1: Carousel Geometry And Input Model

PRD:

- `prd-01-orbital-deck-geometry-and-input.md`
- Phase 1 also updates portfolio audits enough that later gates are meaningful.

Goals:

- Replace the vertical depth stack pose model with an orbital/circular pose model.
- Support wheel/trackpad `deltaX` and `deltaY`, touch drag, pointer drag, arrow keys, and click-to-center.
- Keep active project snapping gentle and integer-locked.
- Keep DOM bounded while visually repeating projects.
- Define and implement the virtual card identity contract.
- Define and implement the carousel input state machine.

Exit gate:

```bash
npm run build
ABS_DEV_URL=http://127.0.0.1:8012 npm run audit:portfolio-gate:quick
ABS_DEV_URL=http://127.0.0.1:8012 npm run audit:portfolio-drawer:pointer
```

## Phase 2: Visual Composition

PRD:

- `prd-02-card-visual-composition-and-responsive-layout.md`

Goals:

- Implement top title band, middle carousel band, and bottom dot dial band.
- Restyle cards to match the Figma/reference direction.
- Hide closed-card tags while preserving metadata.
- Show the `View` CTA only on the active card, stronger on hover/focus.
- Cover desktop and mobile proportions.

Exit gate:

```bash
npm run build
npm run certify:screens
```

## Phase 3: Content, Media, And Color Contract

PRD:

- `prd-03-content-media-and-thumbnail-color-contract.md`

Goals:

- Add or normalize metadata needed for thumbnail crop, accent color, and video-ready cards.
- Ensure static images are first-class and videos can replace them later without changing carousel architecture.
- Keep color blending deterministic and readable.

Exit gate:

```bash
npm run build
npm run check:design-config
```

## Phase 4: Carousel Configuration

PRD:

- `prd-04-carousel-configuration-and-dev-panel.md`

Goals:

- Add a new parent config category for Carousel.
- Expose desktop/mobile min/max and interpolated controls for radius, spacing, card size, dot density, dot radius, snap strength, and input sensitivity.
- Preserve live apply, save/export, and build flattening.

Exit gate:

```bash
npm run check:design-config
npm run build
```

Manual parity loop:

- Change one carousel control in dev.
- Save.
- Reload.
- Run `npm run build`.
- Run `npm run preview`.
- Confirm preview matches the saved value without panel interaction.

## Phase 5: Card-To-Project Open Transition

PRD:

- `prd-05-card-to-project-open-transition.md`

Goals:

- Make selected card expand toward the full project hero.
- Reveal the full uncropped project image in the drawer.
- Scale/reposition the project title so it feels inherited from the card.
- Preserve close behavior, drawer scroll, focus management, and Safari compatibility.

Exit gate:

```bash
npm run build
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-drawer
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-drawer:pointer
```

## Phase 6: Verification, Art Direction, And Release Gate

PRD:

- `prd-06-verification-performance-and-art-direction-gates.md`

Goals:

- Update audits for the new carousel and dot dial.
- Run desktop/mobile/browser visual QA.
- Run WebKit/Safari-relevant transition checks.
- Compare output to Figma/reference images and record screenshots.

Final gate:

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

Run `npm run preview` in a separate terminal and restart it after subsequent build-affecting changes.
