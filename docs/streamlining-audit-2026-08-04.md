# Streamlining audit — 2026-08-04

Status: complete locally

Production application: `react-app/app/`

Release action: none. This pass did not commit, push, or deploy.

## Goal and constraints

Reduce shipped weight and runtime overhead, remove obsolete material, strengthen module boundaries, and correct proven interaction defects without redesigning the frontend. The physical shell, route layouts, typography roles, palette language, and authored motion timings remained protected.

## Measured outcomes

| Measure | Before | After | Result |
| --- | ---: | ---: | --- |
| Public runtime assets | about 74 MiB | 25.6 MiB | about 65% smaller |
| Production `dist` | about 89 MiB | 33 MiB | about 63% smaller |
| Beach Ball Room renderer | 880 separate Sphere meshes | one batched `THREE.Points` draw | about 3.6× faster in the measured Chromium comparison; final mobile profile holds about 60 FPS |
| Home title reads during one entrance | about 1,284 | about 224–270 | unrelated shell mutations no longer wake the title plane |
| Release smoke errors | not a complete route-aware contract | 0 page, console, request, or resource errors | five direct routes plus four SPA round trips pass |

## Improvements completed

### Runtime and rendering

- Added one reusable 60/30 FPS cadence helper and applied it across active Canvas and WebGL runtimes.
- Removed duplicate timers and repeated per-frame layout reads in Flock, Repel, Concept, Cube, and related simulations.
- Cached Cube rotation, geometry, configuration, and fog inputs.
- Replaced Beach Ball Room's mesh-per-point renderer with one shader-backed point renderer.
- Added reusable Canvas display metrics so renderers do not allocate fresh geometry objects or query layout on every frame.
- Batched Flock paths, cached colours, and precomputed the flight band.
- Contained the footer clock so its second-by-second text update cannot invalidate surrounding layout.
- Stopped the Home title plane after its final glyph and limited its observer to real title, scene, font, theme, and geometry invalidations.

### Motion and transitions

- Removed the low-radius blur from supporting entrances after browser comparison proved that it softened small copy and caused WebKit stalls.
- Kept the existing opacity, order, duration, and layout contract.
- Released each completed entrance target at its own endpoint instead of retaining every compositor layer until the last footer item finished.
- Deferred inline-style cleanup for one painted frame to prevent an endpoint jump.
- Replaced per-glyph Web Animations timing on the Canvas-owned Home title with one timing animation while retaining the authored glyph sequence.
- Captured one stable title colour and opacity endpoint through React recollection and responsive resize.
- Fixed a held boot-overlay race that could leave reduced-motion Home copy invisible.

### Interaction and accessibility

- Restored native click and Enter selection in the About point-field lane.
- Prevented rapid About profile changes from racing a deferred WebGL context loss.
- Restored the fifth intended Home legibility field and tuned only the proven collision area.
- Added a paint-backed form of the existing Button Bar underline so WebKit mobile no longer clips keyboard focus.
- Moved Contact supporting copy to the shared opacity token.
- Verified the fixed 57.6 px custom cursor on all direct and SPA routes, overlays, real outer-shell bands, interactive targets, and the Lab drag surface.

### Payload and repository structure

- Removed unused root Lighthouse and Three.js dependencies. The application keeps its own required Three.js dependency.
- Deleted an unused tracked noise GIF and stale grunge documentation, tokens, and runtime state.
- Moved Figma exports, portfolio source pages, palette review images, and title-script review material from `public/` to `source-assets/`.
- Added a fail-closed public-runtime boundary check to stop source-only material returning to the shipped bundle.
- Moved Palette Lab CSS beside its route and lazy-loaded both the route experience and stylesheet.

### Audit reliability

- Screen certification now rejects hidden layout boxes and unsettled entrance states.
- Release smoke now selects route-appropriate focus targets and proves its own failure fixture.
- Transition audits check rendered endpoints, strict frame cadence, responsive title invariance, and current route contracts.
- About audits now use the current nine-field model, current profile controls, and current playhead labels.
- Portfolio pointer checks use a real active, hit-tested card.
- Atmosphere coverage sampling now uses resolution-aware, geometry-correct buckets.
- Cursor checks now probe real shell and empty Lab surfaces instead of rounded-corner voids or project controls.

## Browser proof

- Chromium and WebKit screen certification: 30 of 30 states per engine. Twenty balanced final screenshots were also inspected visually.
- Focus and contrast: 20 of 20 route/theme/viewport states per engine.
- Strict transition flows: 8 of 8 flows per engine.
- Transition stress: 736 frames per engine.
- Canvas SPA lifecycle: 16 round trips and 33 snapshots.
- Palette surface contract: 32 states.
- Home boot overlay: 30 Chromium states; 14 desktop, 14 tablet, and 14 mobile WebKit states.
- Portfolio deck, gate, carousel, drawer, pointer, and transition paths pass in both engines.
- About production, editor, interaction stack, and 1,000-transition soak pass in both engines.
- Contact ripple variants, Playground, modal, cursor, theme, frame, and wall contracts pass in both engines.
- Final `npm run studio:check` passes all source contracts, 404 About hardening tests, lint, generated-config parity, HTML/route validation, and the production build.

Primary evidence is under the ignored `output/playwright/` tree, including `runtime-performance/`, `screens-certification/`, `focus-contrast/`, `release-smoke/`, and `runtime-optimizations/entrance-filter-comparison/`.

## Retained opportunities

These are real seams, but changing them in this pass would add risk without proven user value:

- `SiteApp` remains 325.11 kB minified and 96.06 kB gzip. Route descriptors are the next credible lazy-registry boundary, but any split needs direct-load, SPA, focus, and transition parity proof.
- The shared Three.js chunk is 501.88 kB minified and 126.57 kB gzip. It is already route-lazy and does not load on ordinary routes; splitting the library itself would not reduce total transfer and may add requests.
- The current CSS ownership inventory still contains 390 deliberate main/Portfolio overlaps. Move them only in screenshot-certified ownership phases, not as a broad cleanup.
- Large active owners remain in `control-registry.js` (6,079 lines), Portfolio `app.js` (3,791 lines), and `useShellRouteTransition.js` (2,957 lines). Future extraction should follow characterized responsibility seams; line count alone is not a reason to refactor.
- Git history rewriting could reduce historical repository size, but it is destructive and outside this streamlining scope.

The active `src/legacy/` name remains historical but valid infrastructure. It was not renamed or deleted.
