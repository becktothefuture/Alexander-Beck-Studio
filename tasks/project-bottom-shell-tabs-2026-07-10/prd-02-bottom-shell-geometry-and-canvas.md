# PRD 02: Bottom Shell Geometry And Canvas

## 1. Overview

Create an expanded bottom shell band outside the inner window so the bottom tabs do not sit inside the canvas/content area. Preserve the inner wall as the authoritative canvas, physics, cursor, and page-content rect.

## 2. Goals

- Define separate inner window and bottom shell band geometry.
- Keep the canvas and physics bounds inside the inner window.
- Preserve rounded corner collision behavior.
- Keep page content visually centered within the inner window.
- Preserve portfolio drawer z-order and geometry.

## 3. User Stories

### US-001: Clear Bottom Band

As a visitor, I see the bottom tabs sitting in the expanded bottom wall, outside the main window.

Acceptance criteria:

- [ ] Tabs do not overlap the canvas or route content.
- [ ] Bottom band has enough height on mobile and desktop.
- [ ] Inner window remains visibly separated from browser/site frame.
- [ ] Safe-area insets are respected.
- [ ] Verify in browser using dev-browser skill.

### US-002: Stable Simulation Bounds

As a visitor, the simulation still feels physically correct after the window changes.

Acceptance criteria:

- [ ] Canvas buffer matches the inner window rect and device pixel ratio.
- [ ] Ball collisions respect the visible rounded wall.
- [ ] Custom cursor simulation hit testing matches the inner window.
- [ ] No balls or route content disappear behind the tabs.
- [ ] Verify in browser using dev-browser skill.

## 4. Functional Requirements

- FR-1: Add directional shell geometry tokens for the bottom band.
- FR-2: Keep `#simulations` as the inner window unless a deliberate migration updates every consumer.
- FR-3: Update content padding and route surface offsets for the new bottom band.
- FR-4: Retune title and simulation switcher vertical alignment on Home.
- FR-5: Define footer/social/time/edge-caption relationship to the bottom band.
- FR-6: Preserve `#portfolio-sheet-host` above route chrome and tabs.
- FR-7: Use the term `window` in new docs/comments for the inner wall content area while preserving existing compatibility IDs such as `#simulations`.
- FR-8: Keep canvas backing-store audits passing after the window height changes.
- FR-9: Preserve rounded-corner collision behavior by updating every consumer of wall/canvas geometry together.
- FR-10: Ensure mobile safe-area variables do not place tabs behind browser chrome or home indicator areas.

## 5. Non-Goals

- No physics engine rewrite.
- No change to simulation visual concepts.
- No Portfolio drawer redesign.

## 6. Technical Considerations

Affected files likely include:

- `tokens.css`
- `main.css`
- `portfolio.css`
- `design-system.json`
- `state.js`
- `renderer.js`
- `Ball.js`
- `engine.js`
- `wall-state.js`
- `frame-geometry.js`
- `cursor.js`
- `portfolio/app.js`
- `portfolio/pit-mode.js`

Do not hand-edit generated config outputs.

Current implementation facts:

- `renderer.js` sizes `#c` from `#simulations.clientWidth/clientHeight`.
- `Ball.js#getInteriorWallViolation` uses canvas width/height and rounded-rect collision math.
- `cursor.js#isMouseInSimulation` uses `#simulations.getBoundingClientRect()`.
- `portfolio.css #portfolio-sheet-host` currently follows inner-wall geometry and must remain above route chrome.

## 7. Validation

```bash
npm run build
npm run check:design-config
ABS_DEV_URL=http://127.0.0.1:8012 npm run audit:canvas-spa:quick
```

Visual checks:

- Home desktop and mobile.
- Portfolio locked and unlocked.
- About and Contact centered content.
- Portfolio drawer open.

## 8. Success Metrics

- Canvas backing store matches the visible window geometry at tested desktop and mobile DPR values.
- Bottom tabs do not overlap route content, canvas title, simulation switcher, footer/meta, or safe-area controls.
- Portfolio drawer still appears above the shell and bottom tabs.

## 9. Open Questions

- None. Recommended default: primary route tabs live in the bottom band; existing social/time/edge-caption composition remains anchored to the inner window unless implementation proves there is an overlap that requires a targeted adjustment.
