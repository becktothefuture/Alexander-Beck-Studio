# Work canvas: an evenly populated repeat

Status: implemented and verified in development. The production publication hold and authored configuration are unchanged. No commit or publish was made.

## Implementation record

- Salon now packs one content-sized, quantized period. Every growth attempt starts again with all projects; the renderer consumes the exact accepted period without adding an outside margin.
- Centres may sit anywhere in that period. Depth-aware wrapped distances protect opposite edges, corners, the title, captions, and each project's own repeated copies.
- A bounded coverage score distributes existing media into empty areas. Larger footprints go first and snippets fill the remaining spaces. No filler items, new media owners, or per-frame placement work were added.
- The first case-study anchor is retained when clear. Other anchors stay when their coverage score is within 15% of the best candidate. Treating all old anchors as fixed kept too many large cards near the centre in the first browser pass, so this preference is deliberately soft.
- Catalogue changes may recompose Salon even when the period does not grow. This density-first trade-off is documented and tested. Panning leaves all accepted placements unchanged.
- Caption footprints retain the existing conservative line estimates. The rendered browser audit checks the actual complete buttons and captions; font-shaped caption measurement remains a possible follow-up for future copy changes.

### Verified coverage

The current full-period browser sweep uses 144 camera centres per viewport/theme, plus eight positions just before and after multiple positive and negative wraps. Chromium and WebKit both pass at 1440 × 900 and 390 × 844, in light and dark: 1,216 rendered camera positions in total. No sampled seam view is empty; minimum image coverage at a seam is about 14%.

| Viewport | Mean seam image area | Mean interior image area | Largest sampled seam empty disk |
| --- | --- | --- | --- |
| 1440 × 900 | 25.2% | 19.5% | 440px |
| 390 × 844 | 25.5% | 19.7% | 288px |

The density audit now enforces both image coverage and an empty-space ceiling: no sampled empty disk may exceed 85% of the reference preview diagonal, and no sampled point may be farther from content than 80% of that diagonal. The title remains an intentional content area, not a hole to fill. These are sampled regression limits, not a proof of constant density at every possible camera position.

The unit suite checks 54 viewport/depth/size/seed density combinations. Independent projected-rectangle scrutiny also passed 432 layout/viewport/depth/size/seed combinations, with no clearance failure or exhausted layout. A local timing sample over the 54 density configurations averaged about 21ms per layout, with a 48ms maximum; this is layout-time work, not camera-frame work or a device-independent performance guarantee.

Evidence: `output/playwright/work-repeat/2026-08-30T21-41-10-615Z-chromium/`, `output/playwright/work-repeat/2026-08-30T21-43-46-298Z-webkit/`, and `output/playwright/work-canvas-explainer/spacing-scrutiny.json`.

### Interaction and performance checks

The full Work interaction audit passed in Chromium and WebKit: protected access, actual project-source handoff, desktop/mobile opening and closing, keyboard navigation, hover, and reduced motion. Evidence: `output/playwright/work-canvas/2026-08-30T21-45-33-466Z-chromium/` and `2026-08-30T21-46-33-841Z-webkit/`.

The separate stress runs opened all 12 sampled projects twice per viewport/engine (48 measured cycles plus 48 warm-up cycles). Page-element counts did not grow; Chromium listener counts stayed level or fell. Retained Chromium heap grew by 0.36MB on desktop and 0.24MB on mobile after warm-up. WebKit does not expose equivalent heap/listener metrics. Neither engine redrew the dot canvas during the two-second idle checks, and all owned browser processes exited. The local development server remains running.

These are bounded stability checks, not a 60fps certification. Chromium's automated desktop pan p95 was 77–92ms, mobile 17–17.5ms; WebKit was 22–24ms desktop and 23–24ms mobile. The headless desktop cadence limitation remains visible and should not be hidden behind the passing lifecycle checks. No new work was added to the pan loop. Evidence: `output/playwright/work-performance/2026-08-30T21-47-55-037Z-chromium-repeat-final/` and `2026-08-30T21-51-23-067Z-webkit-repeat-final/`.

`npm run studio:check` passed, including the 54 Work unit tests, lint, configuration parity, and production build. `npm run audit:work-publication` passed 18 direct, alias, query, SPA, and history checks in Chromium against the production preview: all remained Coming Soon. Evidence: `output/playwright/work-publication/2026-08-30T21-55-10-224Z-chromium/`. The temporary production preview and owned audit browsers were closed; authoring remains at `http://localhost:8012/portfolio.html`, with no public mirror or tunnel started.

### Changed files

- `react-app/app/src/routes/playground/spatial/placement.js`
- `react-app/app/src/routes/playground/spatial/world.js`
- `react-app/app/src/routes/playground/spatial/spatial.test.js`
- `react-app/app/src/routes/playground/playgroundContracts.test.js`
- `scripts/audit-work-repeat.mjs`
- `package.json`
- `docs/reference/PLAYGROUND.md`
- `docs/reference/PORTFOLIO.md`
- This implementation record.

### Re-run implementation checks

```sh
npm run check:work-canvas
npm run audit:work-repeat
ABS_BROWSER=webkit npm run audit:work-repeat
npm run audit:work-canvas
ABS_BROWSER=webkit npm run audit:work-canvas
npm run studio:check
```

## Goal

Make the repeat boundaries feel like any other part of the Work field. Keep the irregular composition, image-size hierarchy, complete captions, protected title, minimum project clearance, and existing depth motion. Even coverage does not mean identical gaps or a rigid grid.

## What the current check found

The existing layout protects minimum clearance, including cross-depth movement and neighbours across a repeat boundary. That does not put an upper limit on empty space. Two nearby projects can satisfy a nearest-neighbour test while a large area beside them stays empty.

The source has two causes worth addressing together:

- `spatial/placement.js` keeps candidate footprints inside an inset rectangle. It searches a larger rectangle when later projects do not fit, without redistributing the earlier projects through that larger area.
- `spatial/world.js` then chooses a centred repeat period from the largest tested period and padded content extents. Unused borders become adjacent when the layout repeats.

A fresh Chromium diagnostic sampled 36 camera centres at each viewport, including 11 centres on a horizontal or vertical repeat boundary. A 32 CSS px sample grid measured the rendered button and title rectangles. These are approximate content-coverage measurements, not exact image-pixel coverage or a proof over every camera position.

| Viewport | Mean seam coverage | Mean interior coverage | Other observation |
| --- | --- | --- | --- |
| 1440 × 900 | 9.1% | 23.2% | Largest sampled empty circle at a seam: about 812px diameter |
| 390 × 844 | 7.5% | 30.8% | Three sampled seam views had no visible projects |

The browser emitted no page errors. This review confirms a density problem, not a failure of the minimum-clearance calculation.

Evidence: `output/playwright/repeat-seam-strategy/report.json`, `desktop-worst-seam.png`, and `mobile-worst-seam.png`.

## Proposed implementation

### 1. Choose a repeat area, then pack the whole area

Choose a candidate repeat width and height from the catalogue's complete footprints and the intended density. Use one fixed period for each packing attempt. If an attempt cannot fit, grow the period a small amount and repeat the complete packing attempt. Do not enlarge the final period around a few late outliers without checking its density again.

Use the existing project-size controls. Do not enlarge images, shrink their protected gutter, or change the background dots to conceal empty space.

### 2. Treat opposite edges as neighbours

Place project centres throughout the repeat area, including near its boundaries. A complete project may cross a logical boundary; the existing neighbouring copies supply the continuation. Do not add a margin around each repeated tile.

Check each candidate against wrapped neighbours on all four sides and all four corners, including its own repeated copies. Reuse the depth-aware rectangle-clearance calculation. A collision across an edge is still a collision.

### 3. Fill holes with the existing smaller projects

Keep the case studies as the main composition anchors where their positions remain valid. Use a deterministic, bounded search to distribute snippets into underfilled areas. Score the largest empty patches as well as the local gutter. Try moving existing snippets before considering any additional repeated content; extra catalogue entries or locally duplicated filler are not part of this strategy.

Use actual image-and-caption geometry. The current caption-height estimate is adequate for the checked copy, but measuring captions once after fonts and widths settle would make future copy changes safer. Never measure captions in the drag loop.

### 4. Validate the projected scene, not just the flat layout

The two project planes move at different speeds. A good-looking static plan can still produce a sparse view later in the drag. Evaluate representative camera positions through one complete horizontal and vertical period, including seams and corners, using the same projection as the renderer.

Maintain two distinct checks:

- Minimum clearance: projects, captions, and the protected title do not collide.
- Maximum empty space: no accidental blank corridors or unusually sparse repeat boundaries.

Use a coarse coverage score during bounded layout search. Use rendered browser measurements and screenshots for final acceptance. The existing minimum-gap formula must remain a hard constraint; density is never allowed to override it.

### 5. Keep the result stable and cheap to move

Do placement and coverage work only when layout inputs change. Use stable project IDs and a fixed seed. Cache the accepted model. Panning continues to use the current shared camera, two project-plane transforms, and redraw-on-change dot canvas. No frame-time packing, random regeneration, spring repulsion, or hide/show corrections.

Preserve one semantic item and one media owner per logical project. Edge copies must keep correct click-source geometry, focus, and opening transitions.

This change deliberately recomposes the field once. Long-term strict append stability and unrestricted density rebalancing are different promises: new content should fill available holes first; a necessary period change requires an explicit layout rebuild. The implementation must document that trade-off rather than claim that every old position always remains unchanged.

## Acceptance checks

At the approved default settings:

- No project-empty mobile views outside the protected title area.
- Seam coverage should be comparable to interior coverage. Start with a provisional mean seam/interior ratio of at least 80%, then confirm visually.
- Check meaningful visible image area as well as item count. A one-pixel card fragment must not pass the density check.
- Set a maximum empty-patch target relative to the preview size after inspecting the first candidate. Do not use mean density alone: it can hide a single large hole.
- Inspect long horizontal, vertical, and diagonal drags across multiple repeats, in desktop/mobile Chromium and WebKit, both themes.
- Check minimum/default/maximum snippet depth, image clamps, representative seeds, and reduced motion. Minimum clearance is mandatory throughout; density targets must be evaluated separately at each supported density setting.
- Re-test actual repeat selection, project open/close, resize, text wrapping, 44px targets, catalogue growth, and media ownership.
- Bound candidate counts and layout time. No new per-frame work, growing DOM/media counts, or idle dot redraws.
- Keep production Work at Coming Soon. No publish is part of this strategy.

## Likely code boundaries

- Packing and period: `react-app/app/src/routes/playground/spatial/placement.js`, `world.js`.
- Shared footprint and projection inputs: `responsiveProfile.js`, `projectDepth.js`, and `PlaygroundExperience.jsx` only where needed.
- Copy support: verify `copyCoverage.js`; change it only if boundary-crossing footprints expose a coverage defect.
- Regression checks: `playgroundContracts.test.js`, `spatial/spatial.test.js`, and the Work browser audits. Add explicit empty-space coverage checks; nearest-neighbour distance alone is insufficient.

## Re-run the current baseline

```sh
node output/playwright/repeat-seam-strategy/measure.mjs
npm run check:work-canvas
```

The baseline diagnostic is read-only against the site, owns its disposable browser, and does not save configuration or publish anything.
