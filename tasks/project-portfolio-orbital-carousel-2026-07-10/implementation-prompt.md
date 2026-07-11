# Implementation Prompt: Portfolio Orbital Carousel

Use this prompt to action the PRD packet end to end.

---

You are Codex working in `/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website`.

## Goal

Implement the Portfolio Orbital Carousel PRD packet exactly, preserving the site shell and producing a browser-verified portfolio experience that matches the current Figma direction.

Primary packet:

- `tasks/project-portfolio-orbital-carousel-2026-07-10/README.md`
- `tasks/project-portfolio-orbital-carousel-2026-07-10/action-sequence.md`
- `tasks/project-portfolio-orbital-carousel-2026-07-10/progress-log.md`
- `tasks/project-portfolio-orbital-carousel-2026-07-10/figma-findings-2026-07-11.md`
- `tasks/project-portfolio-orbital-carousel-2026-07-10/prd-01-orbital-deck-geometry-and-input.md`
- `tasks/project-portfolio-orbital-carousel-2026-07-10/prd-02-card-visual-composition-and-responsive-layout.md`
- `tasks/project-portfolio-orbital-carousel-2026-07-10/prd-03-content-media-and-thumbnail-color-contract.md`
- `tasks/project-portfolio-orbital-carousel-2026-07-10/prd-04-carousel-configuration-and-dev-panel.md`
- `tasks/project-portfolio-orbital-carousel-2026-07-10/prd-05-card-to-project-open-transition.md`
- `tasks/project-portfolio-orbital-carousel-2026-07-10/prd-06-verification-performance-and-art-direction-gates.md`

## Non-Negotiable Product Decision

The bottom dock/buttons must always stay visible. Project detail opens inside the portfolio window. Do not implement a project overlay that covers the dock.

Use Figma node `293:983` for the open-detail containment behavior, not the older site contract where `#portfolio-sheet-host` covered all route chrome. Preserve focus trapping and project-detail scroll, but keep the dock visible and clickable unless a modal/state explicitly requires otherwise.

## Figma References

Use the current Figma nodes recorded in `figma-findings-2026-07-11.md`:

- `293:850` - active card component.
- `304:2504` - desktop closed carousel composition.
- `304:3048` - expansion storyboard.
- `293:983` - desktop open/detail mock.

Do not use stale node `293:910`.

Local reference screenshots:

- `tasks/project-portfolio-orbital-carousel-2026-07-10/references/figma-active-card-293-850.png`
- `tasks/project-portfolio-orbital-carousel-2026-07-10/references/figma-current-closed-304-2504.png`
- `tasks/project-portfolio-orbital-carousel-2026-07-10/references/figma-current-open-293-983.png`
- `tasks/project-portfolio-orbital-carousel-2026-07-10/references/figma-preview-expansion-304-3048.png`

If Figma MCP works, refresh those nodes before editing. If Figma MCP is blocked, proceed from the local references and record the limitation in `progress-log.md`.

## Existing Architecture To Respect

Primary files likely involved:

- `react-app/app/src/legacy/modules/portfolio/app.js`
- `react-app/app/public/css/portfolio.css`
- `react-app/app/src/legacy/modules/portfolio/project-drawer.js`
- `react-app/app/src/legacy/modules/portfolio/portfolio-config.js`
- `react-app/app/src/legacy/modules/portfolio/panel/control-registry.js`
- `react-app/app/public/config/contents-portfolio.json`
- `react-app/app/public/config/design-system.json`
- `docs/reference/PORTFOLIO.md`
- Portfolio audit scripts under `scripts/`

Keep `contents-portfolio.json` as source of truth. Keep tags in data but do not render closed-card tag chips. Use static thumbnails first, but keep the model video-ready.

Persist new carousel controls under `portfolio.runtime.carousel`; read legacy `runtime.deck` only as compatibility fallback. Do not hand-author generated config outputs; use the config/build workflow.

## Execution Rules

1. Start with `git status --short`. Note unrelated dirty files and do not touch them.
2. Read every PRD in the packet before editing.
3. Use `figma-findings-2026-07-11.md` as the design source and `action-sequence.md` as the dependency order.
4. Work phase by phase. Update `progress-log.md` before and after each phase.
5. Do not batch everything blindly. Complete one phase, run its exit gate, inspect output, then proceed.
6. Use subagents only for bounded read-only review, risk review, or final QA review. The lead agent owns integration.
7. Preserve existing shell/window geometry and bottom dock visibility.
8. Avoid broad refactors, Tailwind installation, new UI libraries, or a simulation/canvas rewrite.
9. After implementation, update `docs/reference/PORTFOLIO.md` with the new carousel/open-detail contract.

## Implementation Requirements

### Phase 1: Orbital Geometry And Input

Implement PRD 01.

Required behavior:

- Replace current vertical/depth-stack pose with orbital/circular layout.
- Position cards on a large offscreen circle, matching `304:2504`.
- Use a bounded virtual card pool; do not create unbounded DOM clones.
- Every visual instance must map to canonical `data-project-index` and `data-project-id`.
- Only one active instance is focusable and opens the project.
- Support vertical wheel, horizontal trackpad, diagonal trackpad, touch drag, pointer drag, keyboard, inactive-card click-to-center, and active-card click-to-open.
- Normalize wheel `deltaMode`.
- Keep route chrome/dock and project-detail scroll from being intercepted by carousel input.
- Avoid layout reads inside animation frames.

Update audits early so phase gates are meaningful.

### Phase 2: Visual Composition

Implement PRD 02.

Match the Figma card and scene:

- Card base: `316 x 461`, radius `24`.
- Top gradient: about `221.589px`, `#010813` to transparent.
- Text: left `20`, top `23`, width `290`, gap `12`.
- Client: Geist SemiBold `15px`, `20.531px` line-height, `0.3px` tracking.
- Title: Geist Medium `29px`, `32px` line-height.
- CTA: bottom-centered `View`, `244 x 38`, bottom `15`, radius `12`.
- Inactive cards do not show CTA.
- Card dots form a shallow circular lower arc, not a flat row.
- Desktop closed view should read like `figma-current-closed-304-2504.png`.
- Mobile should show one dominant card plus peeking neighbors.

Do not alter wall/frame colors or shell geometry unless explicitly required for this portfolio window.

### Phase 3: Content, Media, Color

Implement PRD 03.

Required:

- Add/normalize optional `thumbnailAccent`, `thumbnailPosition`, `thumbnailFocalPoint`, and `thumbnailVideo` support.
- Use authored thumbnail accent first; deterministic fallback second.
- Keep static image path first.
- Do not attach/load inactive virtual-instance video sources.
- Reduced motion disables autoplaying thumbnail video.

### Phase 4: Carousel Configuration

Implement PRD 04.

Required:

- Add Carousel parent category in portfolio controls.
- Persist to `portfolio.runtime.carousel`.
- Include responsive controls for radius/path radius, card spacing, card size, side rotation, dot dial radius, dot density, input sensitivity, settle/snap strength, visible instance count/coverage.
- Live apply, save to `design-system.json`, reload, build, preview parity must all work.

### Phase 5: Card-To-Project Open Transition

Implement PRD 05 with the clarified dock behavior.

Required:

- Project detail opens inside the portfolio window and does not cover the bottom dock/buttons.
- Use transform-based FLIP handoff; do not animate `left`, `top`, `width`, or `height` in the hot animation.
- Use one-time rect reads before animation.
- Transition choreography:
  1. Active card press/release.
  2. Source lock.
  3. Card expands toward full-window card state like `304:2963`.
  4. Thumbnail crop gives way to fuller project image.
  5. Title/client handoff into open hero.
  6. Open detail becomes interactive inside the window while dock remains visible.
- Preserve Escape close, close button, focus restore, native detail scroll, and reduced motion.

### Phase 6: Verification And Art Direction

Implement PRD 06.

Required screenshots/states:

- Closed/default desktop.
- Fractional mid-scroll.
- Active hover/focus.
- Opening in-flight if practical.
- Settled open detail with dock visible.
- Mobile closed.
- Mobile open with dock visible.
- Light mode.
- Dark mode.

Inspect screenshots yourself before claiming success. Do not rely only on green commands.

## Required Gates

Run the phase gates from `action-sequence.md`. Final gate must include:

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

If an existing audit assumes the old drawer covering the dock, update the audit to assert the new contract: project detail open inside the window, dock visible.

## Final Output Required

Report:

1. Files changed.
2. Phase-by-phase summary.
3. Verification commands and results.
4. Screenshots/artifacts inspected.
5. Remaining risks or follow-ups.

Do not commit unless explicitly asked.
