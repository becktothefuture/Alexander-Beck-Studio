# Fancy Studio study

**Status: retained development experiment — do not publish (13 September 2026).**
Both this study and `/lab/fancy-mode.html` remain saved in the development
source with their current settings and four simple pattern variations.
Production builds exclude their HTML pages, controls and rendering code.
See [ADR-008](../architecture-decisions.md#adr-008--retain-fancy-mode-in-development-only).

Open `/lab/fancy-home.html` on the managed public development mirror. This is a
separate entry, with no production route, Button Bar tab, palette edit or
design-system configuration change. It embeds the actual Studio shell: Home
with all ten chooser simulations, Work, About and Contact. Use the native Button
Bar to move between views. Work and About remain subject to their existing
build-time publication holds; the managed development mirror shows their full
experiences. The wider lab simulation collection is outside this study.

## Design decision

The original balls explain individual motion more clearly. The patterned field
has a more distinctive identity for a practice that combines design and systems.
This study takes a restrained middle position: simple geometry, some continuity
within the grid, recognisable expertise patterns and short trails. It does not
draw both treatments at once.

The selected preset uses **15 CSS pixels on desktop and mobile**, 100% cell fill,
85% coverage, 100% grid alignment, pattern scale 2, richness 1.4, wake 0.3 and
motion response 2. Per-simulation adaptation and Follow colours start on.
Touch, mouse and opening ripple switches are on, but **strength is zero**:
no waves are allocated or drawn until Strength increases. Width is 76 px and
lifespan is 8 seconds.
Particles retain their original interaction. Home uses one background-matched,
soft shadow behind each legend, introduction and footer group. Copy protection
controls these shadows from 0–80% opacity; mobile has no solid fill, and the
particle renderer no longer clears the same areas underneath them. Hover and
focus only change text emphasis. Work and Contact use bounded copy clearance;
measured titles retain 90% clearance. About retains its native editorial focus
treatment. Older links with copy protection above 80% clamp to the new limit.

Use the mode button to compare original balls. Tune has four restrained
variations: Geometric, Rounded, Diagonal and Bold. They change corners, angle
and weight across the same six marks: square, ring, split disc, bars, cross and
four dots. Each mark uses one palette pigment; only the split disc uses two.
There are no white centres, alternating white bars or checkerboard details.
Most cells always use their expertise pattern;
a stable subset of roughly 16% can blend through a disc.

## The colours

The Studio's four existing palettes are unchanged: Bow Worn Signal, Silvertown
Cobalt Voltage, Rye After Closing and Rye After Closing Turmeric. The existing
time-of-day schedule chooses the palette by default. Colour mode can pin any
of the four in this private study, including Normal comparison. Follow colours
pairs each palette with a pattern variation. Selecting Pattern family manually
turns that link off; switching it on restores the current pairing. The panel
shows all eight colour swatches and the six actual glyphs for every pairing.
The panel and compact label identify the current palette, family and active
time slot, or state that the colours are manually pinned. Times use the
visitor's device timezone, as on the ordinary site.

| Palette | Linked variation | Local time slots |
| --- | --- | --- |
| Bow / Worn Signal | Geometric | 00:00–02:59 and 12:00–14:59 |
| Silvertown / Cobalt Voltage | Rounded | 03:00–05:59 and 15:00–17:59 |
| Rye / After Closing | Diagonal | 06:00–08:59 and 18:00–20:59 |
| Rye / Turmeric | Bold | 09:00–11:59 and 21:00–23:59 |

All six expertise roles retain their
authored distribution and pigment indexes. Only neutral ink reverses between
black and white. The legend and field copy the same glyph atlas.

## Rendering, in plain language

1. The same invisible particles move according to each simulation's rules.
2. A grid looks at nearby particles. A cell's strongest contributor supplies
   its expertise colour and pattern. Overlapping bodies build coverage.
3. The renderer stamps a prepared shape into the cell. Coverage changes its
   size and opacity. A short memory lets it fade after a body leaves.
4. With grid alignment below 100%, the mark shifts slightly towards the nearby
   bodies. It remains attached to its cell, so movement feels continuous while
   the grid stays readable.

The particles are numbers in memory, not hundreds of HTML elements. One particle
Canvas draws the field; the Home title and shell retain their own existing
layers. There is no sphere-gradient layer underneath the shapes. Optional
ripples change cell activation and can reveal patterns in empty space.

## Per-simulation choices

These profiles change presentation only. They do not change particle counts,
collision sizes, forces, role assignment or reduced-motion policy. The values
multiply the shared Coverage and Wake controls. Minimum support is a lower
bound in cell widths, which keeps tiny bodies visible between grid samples.

| Home name / runtime | Coverage | Wake | Minimum support | Purpose |
| --- | --- | --- | --- | --- |
| Foundation / Pit | 1 | 0.8 | 0.95 | A connected pile with readable settling. |
| Attention / Flies | 1.12 | 0.55 | 1.05 | Keep small fast bodies visible. |
| Flow / Water | 1.05 | 0.9 | 1 | Connect flow; skip the old visual ripple overlay. |
| Tension / Repel Room | 0.95 | 0.6 | 1 | Keep push and rebound distinct. |
| Convergence / Flock | 1 | 0.65 | 1 | Keep gaps between moving neighbours. |
| Cohesion / Flubber | 0.78 | 0.5 | 0.95 | Limit overlap in the dense bodies. |
| Refraction / Kaleidoscope | 0.82 | 0.55 | 0.95 | Accumulate projected copies in one grid. |
| Magnetic | 0.9 | 0.7 | 0.95 | Keep clusters and their gaps legible. |
| Multiplicity / Rift | 0.82 | 0.55 | 0.95 | Preserve the repeated structure with short trails. |
| Cadence / Fountain B | 1.12 | 0.4 | 1.05 | Keep droplets visible and their arcs distinct. |

## The other views

- **Work:** its existing depth dots feed the same Canvas grid. The field follows
  the camera, clears space around the title and description, and returns to
  idle after its wake settles. Project cards, media and interactions are intact.
- **Contact:** the ring renderer feeds each bead's position, radius, opacity
  and explicit expertise role to the grid. It retains the native quiet centre,
  rotation and contact feedback. Fancy skips creating sphere sprites.
- **About:** the existing depth-tested 3D scene draws flat role identifiers into
  a small WebGL render target. Two grid-sized history buffers smooth arrivals,
  departures and ripples. A full-screen shader stamps the same cached atlas.
  No scene pixels or projected point arrays cross back into JavaScript. The
  minimum point footprint prevents tiny distant points falling between cells;
  turn off Adapt to simulation to compare the authored footprint. Shapes,
  family, colour, cell size, fill, coverage, opacity, pattern scale, richness,
  wake, motion response and ripples apply live. The small within-cell movement
  follows sampled motion energy rather than a CPU particle centroid. Authored
  camera, forms, depth, visibility windows and reduced motion stay in place.

## Performance decisions

- Prepare the flat glyph sheet only when palette, background or family changes.
- Use reusable typed arrays and bounded local particle sampling. The grid has
  an approximately 24,000-cell ceiling; ripples have an eight-wave ceiling.
- Draw one glyph for most visible cells, at most two for the transitional subset.
- Cache the title and non-Home copy clearance mask until layout or settings
  change. Geometry is measured through ResizeObserver; Work also refreshes the
  moving title mask when its camera changes, never during idle frames.
- Skip sphere material drawing and subsequent material prewarming while Fancy
  is active. Skip the diffuse atmosphere and the old Water ripple drawing.
- Keep one field for all kaleidoscope replicas, avoiding repeated full images.
- Preserve the runtime's existing canvas sizing, culling, visibility handling
  and reduced-motion policy. Fancy adds no independent animation loop.

The 15 px grid uses about 28% as many cells as an uncapped 8 px grid at the same
viewport size. This is a cell-count comparison, not a measured frame-time gain.
The adaptive cell ceiling still bounds large windows. About uses three small
GPU render targets, one existing WebGL context and no readback. Its visible-cell
count is deliberately omitted from diagnostics to avoid an expensive readback.

The original sphere material already uses cached images. Fancy adds grid
sampling, so removing gradients alone does not prove a faster overall frame.
The audit records field CPU submission time and browser animation-frame cadence
separately, including an original-ball comparison. These are desktop browser
measurements; mobile emulation does not establish physical handset performance.

## Source ownership and controls

The shared panel now has 24 controls. [Fancy Mode](FANCY-MODE.md) documents the
schema and existing controls. The Home study starts with its own authored preset;
the earlier three-simulation study retains its original defaults.

| Concern | Authoritative file, relative to `react-app/app/` |
| --- | --- |
| Standalone entry | `lab/fancy-home.html`, `src/entries/fancy-home.jsx` |
| View persistence, Home chooser and comparison controls | `src/routes/fancy-mode/FancyModeLab.jsx` |
| Novice explanation | `src/routes/fancy-mode/FancyStudyNotes.jsx` |
| Control schema, both presets, URL parsing | `src/routes/fancy-mode/fancyConfig.js` |
| View paths | `src/routes/fancy-mode/fancyRoutes.js` |
| About GPU grid and history | `src/routes/fancy-mode/fancyGpuRenderer.js` |
| Per-simulation profiles | `src/routes/fancy-mode/fancySimulationProfiles.js` |
| Grid, motion, clearance and timing | `src/routes/fancy-mode/fancyField.js` |
| Six roles and four simple pattern families | `src/routes/fancy-mode/fancyPatterns.js` |
| Palette/family pairings and schedule labels | `src/routes/fancy-mode/fancyStyles.js`, `FancyStyleGuide.jsx` |
| Document-local palette selection through the native publisher | `src/palette/simulationPaletteController.js` |
| Preview isolation, live apply and layout measurement | `src/routes/fancy-mode/fancyPreview.js` |
| Work depth dots | `src/routes/playground/spatial/dotFieldRenderer.js` |
| Contact bead field | `src/routes/contact/contactRippleRenderer.js` |
| About role encoding and GPU adapter | `src/routes/about-narrative-lab/aboutBlenderPointScene.js` |
| Home selection through native navigation | `src/lib/spa-navigation.js`, `src/legacy/modules/rendering/simulation-presentation.js` |
| Entry bootstrap | `src/entries/index.jsx`, `about.jsx`, `portfolio.jsx`, `contact.jsx` |
| Optional custom body feeds | `src/legacy/modules/modes/kaleidoscope.js`, `src/legacy/modules/modes/flubber-blob.js`, `src/routes/repel-room/repelRoomRenderer.js` |
| Shared material prewarming and Water overlay bypass | `src/legacy/modules/physics/engine.js` |

Panel changes apply immediately and stay in the parent URL. The iframe gets all
values needed relative to its baseline. This distinction preserves explicit
zero/false values and Geometric selection when reopening a Home-study link.
Copy link, JSON export, reload and switching simulations preserve the setup.
A `view=work|about|contact` parameter reopens the selected native page. The
labelled iframe carries the complete live preset through full document loads;
all four entry modules initialize the bridge only inside an approved lab parent.
The document-local presentation also keeps the chosen Home simulation on native
Home navigation, including Normal comparison. Ordinary navigation has no override.
A normal top-level page cannot enable it through query parameters.
The palette controller reads a preview selection only from this installed
presentation hook. It continues publishing the canonical pigment arrays to
every native renderer; the production palette source and schedule are unchanged.
Reset returns to this study's preset while retaining the simulation, background
and Normal/Fancy choice. Graphic settings never save to browser storage or
production config. The Home simulation choice uses the existing per-page
session selection API, so the native reload rotation cannot replace it after
the router cleans the Home URL.

## Verify

```bash
npm run studio:dev
npm run studio:check
npm run check:fancy-publication
ABS_FANCY_STUDY=home node scripts/audit-fancy-mode.mjs
ABS_BROWSER=webkit ABS_FANCY_STUDY=home node scripts/audit-fancy-mode.mjs
ABS_CHROMIUM_CHANNEL=chrome ABS_FANCY_URL=http://localhost:8012 node scripts/audit-fancy-site.mjs
ABS_BROWSER=webkit ABS_FANCY_URL=http://localhost:8012 node scripts/audit-fancy-site.mjs
ABS_CHROMIUM_CHANNEL=chrome node scripts/audit-fancy-styles.mjs
ABS_BROWSER=webkit node scripts/audit-fancy-styles.mjs
```

Run these studies against development, not the regular production preview.
The latter now excludes Fancy Mode. Earlier built-preview evidence below is
historical and predates the decision to retain the experiment in development.
Run browsers serially for useful performance readings. The website audit reuses
the About graphics harness; `ABS_CHROMIUM_CHANNEL=chrome` uses installed Chrome
with native GPU acceleration. Its default Chromium fallback uses software
WebGL for portability, so do not compare those timings with hardware results.
The Home audit checks all ten simulations on black and white at 1440 × 1000 and
390 × 844, matching actual atlas
draws to legend bitmaps. It also checks original-ball comparison, live controls,
export, reload, input gates, palette refresh, reduced motion, narrow panel fit
and normal-Home isolation. Results and screenshots go to
`output/playwright/fancy-home/`. Set `ABS_FANCY_URL` to the tunnel origin to check
the public mirror. The website audit checks native navigation across all four
views, shared settings, parent and iframe reloads, black/white, Normal comparison,
Work dragging and idle rendering, About's GPU patterns, touch input, reduced
motion and ordinary-route isolation. Its evidence goes to
`output/playwright/fancy-site/`. The tunnel requires the managed Studio session
to stay online.

The style audit checks all four pairings on desktop/mobile and black/white,
manual and automatic colour selection, time labels, export/reload, zero-strength
waves and the absence of added white decoration on coloured roles.
Evidence goes to `output/playwright/fancy-styles/`.

## Current verification — 15 px preset and simple variations, 13 September 2026

- `npm run studio:check` passed, including lint, repository tests, palette and
  configuration contracts, the production build and publication-hold checks.
- Chrome and WebKit passed all four palette/pattern pairings on black and white
  at 1440 × 1000 and 390 × 844. The style audit checked actual legend pixels:
  coloured roles contained no added white accents. Manual selection, automatic
  time changes, pinned families, export/reload and zero-strength waves passed.
  Evidence: `output/playwright/fancy-styles/`.
- The final built-preview style run also checked that unlinking colours keeps
  the visible family and that all five Home copy groups remain transparent,
  with shadows at no more than 80%, through every palette and ground change.
- The built preview passed panel-fit checks at 320 × 568, 600 × 844, 601 × 844
  and 844 × 390, retaining 44 px rows, scrolling content, keyboard access,
  study-note focus restoration and ordinary-Home isolation.
  Evidence: `output/playwright/fancy-home/styles-built/`.
- The public Chrome audit passed all four native views, black/white, palette
  changes, Normal comparison and reloads on desktop and mobile. A network
  change interrupted the first phone load; the phone-only retry completed
  with no browser errors, including reduced motion and ordinary-route isolation.
  Evidence: `output/playwright/fancy-site/styles-chrome/` and
  `output/playwright/fancy-site/styles-chrome-mobile/`.
- WebKit passed the same public checks across all four views and both sizes.
  Its last phone check was restarted after a development hot reload; the
  phone-only run completed with 12 records and no browser errors.
  Evidence: `output/playwright/fancy-site/styles-webkit/` and
  `output/playwright/fancy-site/styles-webkit-mobile/`.
- Screenshots were inspected for the four variations, the palette guide,
  native views and narrow layouts. These are desktop browser and phone-layout
  emulation checks; physical handset performance is not measured.

## Earlier verification — 8 px preset, 13 September 2026

- Follow-up shadow correction: Chrome and WebKit passed 16 black/white states
  at widths 390, 600, 601 and 1440 px. Every Home group had a transparent fill
  and a blurred field at no more than 80% opacity, including hover/focus.
  Touch ripples remained visible behind the copy. Copy protection applied at
  0%, 40% and 80%, survived reload, and clamped older 95% links. Normal comparison
  passed too. Screenshots were inspected; there were no browser errors.
  Evidence: `output/playwright/fancy-opacity/`. The public mirror was separately
  inspected with the selected preset and all five resolved shadow styles.
- `npm run studio:check` passed, including lint, repository tests, configuration
  checks, build and the existing About/Work production publication holds.
- The Home audit passed all ten simulations on desktop and mobile, in both
  grounds: 70 records and no browser errors. It also verified all 22 controls,
  atlas/legend correspondence, export, reload, palette updates and input gates.
  Evidence: `output/playwright/fancy-home/selected-preset/`.
- The public website audit passed in installed Chrome with native GPU
  acceleration: 21 records and no browser errors. It used 1440 × 1000 at DPR 1
  and 390 × 844 at DPR 2, with touch enabled for mobile. All four views retained
  the exact preset through native navigation and both kinds of reload.
- WebKit passed the same complete public website audit: 21 records and no
  browser errors, including both viewports, reduced motion, touch ripples and
  the final Home round trip. Desktop and mobile screenshots were also inspected.
  Evidence: `output/playwright/fancy-site/public-webkit/`.
- Custom Geometric/Stripes settings survived Contact → About; resetting and
  returning Home retained Pit. A separate regression check deliberately set
  the native session to Fountain before clicking Home and confirmed that the
  study's selected Pit still won.
- Chrome's short 61-frame samples had a 95th-percentile animation-frame interval
  of at most 16.8 ms. Smoothed Fancy CPU submission cost was 0.48–1.78 ms on
  desktop and 0.52–0.64 ms in mobile emulation on this Mac. These figures exclude
  GPU completion time and do not establish physical-phone performance.
- Work stopped scheduling draws after camera movement and the visual wake
  settled. About used the GPU grid; switching to Normal stopped tile draws on
  every route. Ordinary top-level Home, Work, About and Contact did not activate
  Fancy from query flags alone.
- Desktop and mobile screenshots were visually inspected in both grounds,
  including Work after a drag, Contact's text clearance and several About
  reading/scene positions. Evidence: `output/playwright/fancy-site/public-chrome/`.
- No commit or production publication was made. The managed public development
  mirror is the review surface; physical handset feel and sustained thermal or
  battery performance remain for device testing.

## Earlier verification — 16 px Home-only version, 13 September 2026

These results describe the earlier Home-only preset.

- `npm run studio:check` passed after the final UI change, including lint, the
  repository tests, configuration checks and the production build.
- WebKit passed the complete 40-state simulation/theme/viewport matrix and the
  configuration, palette, reduced-motion and isolation checks (69 result records,
  no browser errors). A focused follow-up passed after widening the mobile
  simulation selector: all names fit at 320, 600, 601 and 844 px, and the study
  notes scroll, close with Escape and restore focus.
- Chromium passed the complete audit through the existing public tunnel: 70
  result records and no browser errors. All 22 controls applied, exported,
  reloaded and survived switching simulations. Primary shape/pigment pairs and
  legend bitmaps matched the real drawing calls. Pattern dominance is measured
  using opacity-weighted stamp area, so faint transitional dots are not counted
  as equal to full primary marks in small clusters.
- Screenshots were inspected for all ten simulations on desktop and mobile,
  with black/white comparisons. Material was reduced behind small copy and the
  footer, and the mobile selector was widened after visual inspection.
- WebKit's measured field CPU time ranged from about 0.14–1.50 ms; Chromium on
  the public mirror ranged from about 0.08–1.03 ms. These ranges are smoothed
  field submission measurements from short sessions on this Mac, not complete
  frame timings or physical-phone benchmarks. Per-mode readings are in each
  `results.json` under `final-webkit/` and `final-public-chromium/`.
- The public entry returned HTTP 200 with normal DNS. The mirror's authoring API
  and filesystem paths remained blocked with HTTP 404. Production was not
  published, and no commit was made.
- The original three-mode study retained its 9 px desktop grid, Geometric
  family and original settings in a separate smoke check; Normal comparison
  worked in Pit, Kaleidoscope and Flock. The disposable preview on port 8013 was
  stopped after validation; the managed authoring server and public tunnel remain
  running.

The temporary link is the managed tunnel origin followed by
`/lab/fancy-home.html?mode=pit&finish=fancy&ground=black`. Physical handset feel
and sustained thermal/battery performance remain for device review.
