# Fancy Mode

**Status: retained development experiment — do not publish.** Alexander closed
the experiment on 13 September 2026 and asked to keep it in the development
state. Keep both studies, their controls, palettes and saved presets available
locally and on the managed development mirror. This is not an approved style
for the live website. See [ADR-008](../architecture-decisions.md#adr-008--retain-fancy-mode-in-development-only).

Fancy Mode is an isolated material study at `/lab/fancy-mode.html`. It embeds the
actual Home shell and its existing Pit, Kaleidoscope (Refraction), and Flock
(Convergence) runtimes. It is not in Daily Simulation rotation. No production
design configuration or physics settings are changed.

The separate [Fancy Studio study](FANCY-HOME.md) extends this material to all ten
Home simulations and the other three views with a 15 px grid, four simple
pattern variations and restrained trails.
The original three-mode study keeps its starting settings.

## Graphic rules

The supplied reference uses a regular grid, clear gutters, connected areas of
colour, and several simple figures within each cell. This study translates that
grammar into moving material:

| Rule | Implemented behaviour |
| --- | --- |
| Scale | 9 CSS px cells on desktop; 7 px at 600 px and below. Tune allows 6–24 px. |
| Figures | Six simple expertise patterns: squares, open rings, half-split discs, three parallel bars, crosses, and four-dot cells. Four variations change corners, angle or weight. Discs are the only secondary figure. |
| Correspondence | Each particle carries its actual distribution role into the field. The strongest contributing particle owns both the cell's pattern and pigment. The legend draws the same atlas glyphs. |
| Continuity | Expertise identity follows the moving material. A stable 16% subset of grid cells can blend through discs; coherent spatial bands control their emphasis and the roles revealed in empty space. There are no random per-frame shape choices. |
| Particle coverage | Actual projected bodies deposit into a fixed grid. A small support kernel joins adjacent bodies without changing their collision radii. |
| Movement | Changes in local density resolve transitional discs into their expertise pattern; a short decay leaves a soft wake made only of small figures. |
| Input | Hover, pen and touch launch travelling activation waves by default. Touch/pen, mouse and the opening ripple have independent switches. At most eight waves exist; the default lifetime is 4.8 seconds. There is no drawn force-ring overlay. |
| Stillness | Expertise patterns remain legible as activation falls. Only the limited transitional subset can soften into discs. Marks revealed in empty space disappear. |
| Colour | Automatic follows the Studio time-of-day palette. The private panel can also pin one of its four palettes and link patterns to it. Chromatic colours stay the same on black and white; neutral pigment reverses to keep visible contrast. Coloured roles have no added white decoration; only the split disc uses a second pigment. |
| Reading | A broad, rounded reduction in cell coverage protects the measured title. The legend, introduction and footer use soft CSS shadows capped at 80% opacity, without solid fills or duplicate particle clearing. Artwork only removes the visible title and supporting copy, and restores full coverage. |
| Normal mode | The graphic override detaches. The original cached sphere material and atmospheric field return without reseeding the simulation. |
| Reduced motion | No travelling ripples or temporal wakes. The underlying simulation retains its own reduced-motion policy. Material and theme changes repaint the static result. |

### Six expertise patterns

| Expertise | Primary pattern |
| --- | --- |
| Product Design | Square |
| Experience Design | Open ring |
| Art Direction | Half-split disc |
| Motion & 3D | Three parallel bars; two in Bold |
| Creative Engineering | Cross |
| Parametric Systems | Four dots |

`fancyPatterns.js` owns this mapping and the shared glyph atlas. Role identity is
independent of colour: a palette change or two roles sharing a pigment cannot
swap their patterns. Pit passes the body's `distributionIndex`; Kaleidoscope
passes it through each replica; Flock passes its `materialRoleIndex`. Empty-space
waves use these same six roles. The palette's authored role weights are retained.

The legend's marks are 1.4 times the existing dot size so the internal details
remain readable. Its native buttons, labels, details and keyboard controls stay
in place. Long labels wrap within their column at phone widths. Normal mode
hides the glyphs and restores the original dots and size.
Choosing a single shape in Tune applies it to both the field and all six legend
marks. **By expertise** restores the six-pattern correspondence.

## Source and performance

- Vite includes both Fancy HTML entries only in development or certification
  mode. The four native entry modules use the same build-time condition for
  the Fancy bootstrap, so production also omits the renderer and controls.
  `npm run check:fancy-publication` checks the built files and is part of the
  canonical build. Use a development server for the study audits; the ordinary
  production preview intentionally cannot open these experiments.
- `react-app/app/src/routes/fancy-mode/` owns the page, controls, grid, glyph atlas
  and scoped preview bridge.
- `simulation-presentation.js` is a document-local optional hook. The normal
  engine, Kaleidoscope replicas and Flock only pass their final body positions
  through it when explicitly active.
- The demo entry embeds `/index.html` with a labelled same-origin frame. The
  child loads the Fancy module only in that frame. An ordinary Home URL does not
  activate it, even if the query includes `fancyLab=1`.
- Theme choices are preview-only and do not write the normal site's preference.
  The exposed frame and Button Bar remain owned by the shared shell.
- Fancy renders flat cached glyphs and disables the diffuse atmosphere. It does
  not draw the sphere gradients and then cover them with another canvas.
- Typed buffers are reused, the grid budget is about 24,000 cells, and glyphs are
  baked only on palette/theme/family changes. Legend glyphs repaint on setup, palette,
  theme or configuration changes, not in the per-frame draw loop. Most cells
  draw one cached sprite; only transitional cells can draw two. Physics and
  particle counts are unchanged.
  The grid adds its own CPU cost; removing cached sphere shading is not a claim
  that the complete Fancy renderer is faster on every device.

## Configuration panel

The Tune panel lets Alexander change the Fancy Mode material, compare all three
simulations, and keep a setup for later review. By expertise is the default shape
setting. Particle physics, palette ownership, shell geometry, the cell budget,
the eight-wave cap and input sampling limits are hardcoded by design.

The 24 controls use one schema in
`react-app/app/src/routes/fancy-mode/fancyConfig.js`. All are config keys with a
single live apply path. Numeric controls are bounded sliders, pattern choices are
selects, and switches are checkboxes.

The existing shape value `-1` now means By expertise, replacing Mixed. Earlier
links with that value, or with no shape override, open the updated six-pattern
material. Single-shape values `0`–`6` and all other saved settings are unchanged.

| Group | Control | Original default | Range or options / visible effect |
| --- | --- | --- | --- |
| Material | Cell size | Auto: 9 px desktop, 7 px phone | 6–24 px; grid spacing. Reset restores Auto. |
| Material | Cell fill | 100% | 50–100%; size of marks within cells. |
| Material | Coverage | 1.45× | 0.85–2.2×; spread around each actual particle. |
| Material | Opacity | 100% | 25–100%; pigment strength. |
| Material | Adapt to simulation | Off | Optional coverage, minimum footprint and trail profiles for all ten Home simulations. |
| Patterns | Colour mode | Automatic | Visitor-local schedule or Bow, Silvertown, Rye and Turmeric. Private preview selection only. |
| Patterns | Follow colours | Off | Pair each palette with a variation. On in the full Studio study. |
| Patterns | Pattern family | Geometric | Geometric, Rounded, Diagonal or Bold; all retain the same six roles. A manual choice turns Follow colours off. |
| Patterns | Grid alignment | 100% | 0–100%; a bounded shift towards the moving bodies at lower values. |
| Patterns | Copy protection | 80% | 0–80%; one soft Home shadow per legend, introduction and footer group, with visible particles underneath. Other views reduce nearby material. |
| Patterns | Shapes | By expertise | Six matched legend patterns, or discs, squares, crosses, rings, split discs, stripes, four dots for every role. |
| Patterns | Pattern scale | 1× | 0.5–2×; band size in transitions and empty-space waves. |
| Patterns | Richness | 85% | 20–140%; pattern emphasis within the limited transitional cells. |
| Patterns | Wake duration | 1× | 0–3×; duration of the trailing material. Zero removes the wake. |
| Patterns | Motion response | 1× | 0–2×; activation from particle movement. |
| Patterns | Title clearance | 90% | 0–100%; quiet space behind the title. Low values can reduce readability. |
| Ripples | Touch ripples | On | Touch and pen taps/drags. Disabling also removes their active waves. |
| Ripples | Mouse ripples | On | Mouse hover/click waves, independent of touch. |
| Ripples | Opening ripple | On | Single introduction wave on simulation load. |
| Ripples | Strength | 1× | 0–2×; wave activation. |
| Ripples | Speed | 185 px/s | 80–360 px/s; outward travel. |
| Ripples | Width | 64 px | 24–128 px; active band width. |
| Ripples | Lifespan | 4.8 s | 1–8 s; wave duration and fade. |
| Ripples | Empty space | 32% | 0–70%; marks revealed away from particles. |

Make a ripple remains available when input ripples are off, provided Strength
is above zero. Zero strength removes active waves and avoids new allocations. Reduced motion
disables every ripple source. Artwork only remains in Patterns. Reset restores
the material defaults and adaptive cell size while retaining the current
simulation, background and Normal/Fancy selection.
Auto cell size follows the simulation canvas width; the panel shows the actual
resolved size, including after a resize.

The panel uses the existing 23rem tool width and panel radii, with 44px touch rows,
three accordion folders, one scrolling content area and fixed header/actions.
The width is clamped to the viewport on phones. Short landscape screens use the
available viewport height. Folder headers stay visible as their content scrolls.
Closing by button or Escape returns keyboard focus to Tune. No detached host was
requested or added.

### Ownership and round-trip

| Concern | Primary evidence location | Responsibility |
| --- | --- | --- |
| Control declarations and authored defaults | `src/routes/fancy-mode/fancyConfig.js` | One schema supplies the renderer, panel, URL parsing and serialization. Paths in this table are app-relative. |
| Panel mount | `src/routes/fancy-mode/FancyModeLab.jsx` | Parent owns settings and the labelled same-origin simulation frame. |
| Panel shell, rows and fixed geometry | `src/routes/fancy-mode/fancy-mode.css` | Scoped panel tokens follow the existing tool shell; they do not style the embedded website. |
| Live apply | `src/routes/fancy-mode/fancyPreview.js` | Validates settings and configures the current field without reloading physics. |
| Material rendering | `src/routes/fancy-mode/fancyField.js` | Consumes each key in grid, pigment, pattern, wake or ripple rendering. |
| Expertise patterns and legend | `src/routes/fancy-mode/fancyPatterns.js` | One role map and atlas supply the field and the six native legend swatches. |
| Save/export | `src/routes/fancy-mode/FancyConfigPanel.jsx` | Copy link and JSON export preserve the full setup. The export contains both settings and a URL that reopens them. |
| Reload and switch | `src/routes/fancy-mode/fancyConfig.js` | URL restores validated settings, including false and zero values; simulation switching carries all settings forward. |
| Build/preview | `vite.config.js` and the four native entry modules | Development and certification use the same schema and defaults. Production excludes both entries and the Fancy bootstrap. No generated compatibility config needs flattening. |

The URL is the current editable preset; the schema is the authored baseline.
Exported JSON is a portable record, not a write to production configuration. No
settings depend on browser storage or an authoring API, so the same controls work
on the read-only public mirror. Malformed values fall back to defaults, unknown
keys are discarded and numeric values are clamped before reaching the renderer.

## Run and verify

```bash
npm run studio:dev
npm run studio:check
npm run check:fancy-publication
node scripts/audit-fancy-mode.mjs
ABS_BROWSER=webkit node scripts/audit-fancy-mode.mjs
```

The audit defaults to `http://localhost:8012`. Set `ABS_FANCY_URL` to a different
origin to test the safe public mirror. Captures and JSON results are written to
`output/playwright/fancy-mode/`.

Open the tunnel origin followed by
`/lab/fancy-mode.html?mode=pit&finish=fancy&ground=black`. Choose a simulation,
switch the material or background, and open Tune for the 24 controls, a
keyboard-accessible ripple, Artwork only, Copy link and Export settings.
Controls are carried in the URL.
The temporary tunnel requires the computer and managed Studio session to remain
online. It does not publish to beck.fyi.

## Verification record — 12 September 2026

- `npm run studio:check` passed, including the site's lint, tests, configuration
  checks and production build.
- The Fancy audit passed in Chromium and WebKit at 1440 × 1000 and 390 × 844.
  All three simulations were inspected on black and white. The audit also checks
  touch and mouse ripples, keyboard controls, Normal/Fancy switching, reduced
  motion, title visibility, and isolation from the ordinary Home entry.
- The complete Fancy audit passed through the public tunnel in Chromium at both
  sizes. Public DNS resolved the hostname and the page returned HTTP 200. This
  Mac's default DNS did not resolve the new hostname, so the public browser check
  used a process-local resolver mapping to the address returned by public DNS.
  No system DNS setting was changed. The public mirror's `/api/*` and `/@fs/*`
  guards returned HTTP 404.
- The palette-surface audit passed. Wall invariance and theme consistency passed
  in Chromium and WebKit across the normal site routes.
- The broader outer-frame audit failed on ordinary Home in both browsers: its
  expected black sample returned RGB 16,16,16 in Chromium and 15,15,15 in WebKit.
  Shared frame styling was outside this change and was not edited. This finding
  remains open; the demo is not a production-release certification.

Screenshots, audit results and logs are in `output/playwright/fancy-mode/`.
Physical handset performance and touch feel remain for device review; emulation
does not establish those results. No commit, push or production deployment was
made.

## Configuration verification — 13 September 2026

- `npm run studio:check` passed after the panel changes.
- All 18 controls were changed through real inputs in Chromium and WebKit, at
  1440 × 1000 and 390 × 844. Every resulting value reached the renderer and
  survived JSON export, URL reload and switching between all three simulations.
- The full expanded audit passed through the public tunnel with the Mac's normal
  DNS resolver. Clipboard copy was checked in Chromium; export was checked in
  both browsers. The public mirror still uses no write-capable authoring API.
- Touch and mouse gates were checked independently, including removal of active
  waves, disabled opening waves and manual ripples while both input gates were
  off. Reduced motion, Normal/Fancy switching, reset, Artwork only and Escape
  focus restoration passed.
- The fixed panel, all folder headers and the scrolling control area fit at
  320 × 568, 600 × 844, 601 × 844 and 844 × 390. Black and white panel captures
  were inspected. The Auto cell readout was also checked against the live field
  at widths 600, 601 and 1440.
- Zero and false preset values round-trip without reverting to defaults.
  Malformed and out-of-range URL settings are rejected or clamped.

Evidence is under `output/playwright/fancy-mode/config-*`. The edited surface is
the Fancy Mode folder, its audit script and this guide. Existing production
rendering hooks and the shared site shell required no further changes. The
earlier ordinary-site outer-frame finding remains outside this panel work.

## Pattern correspondence verification — 13 September 2026

- `npm run studio:check` passed after the final rendering and legend changes,
  including lint, unit/configuration checks and the production build.
- The expanded Fancy audit passed against the built preview in WebKit and the
  public mirror in Chromium. Each run recorded 21 result states and no browser
  errors. The three simulations were checked on black and white at 1440 × 1000
  and 390 × 844, with screenshots inspected and pointer interaction exercised.
- The audit inspects actual field draw calls: every primary shape/pigment pair
  matches its legend entry, and the six legend bitmaps match the field's atlas
  exactly. Primary patterns dominate the occasional disc transitions.
- A live time-of-day palette change updated the glyph colours while retaining
  all six expertise patterns and the current Fancy settings.
- Native legend click and keyboard details passed. Normal restored round
  colour dots; single-shape overrides updated both the legend and field; reset
  restored By expertise. All 18 controls, URL/export/reload, simulation switching,
  independent input gates and reduced motion passed again.
- Narrow labels stay within the legend column at 320 and 600 px. Panel checks
  also passed at 601 px and in 844 × 390 landscape. A quiet material region
  behind the legend keeps the key readable as particles cross it; Artwork only
  restores full material coverage.

The changes are in `src/routes/fancy-mode/`, the optional role arguments in the
Kaleidoscope and Flock render hooks, `scripts/audit-fancy-mode.mjs`, and this guide
plus `docs/reference/CANVAS-RUNTIME.md`. Evidence is under
`output/playwright/fancy-mode/legend-*`. The validation-only preview on port 8013
was stopped; the existing managed authoring server and public tunnel remain
running. Physical handset performance still requires device review. No commit
or production deployment was made.

## Non-About release boundary — 15 September 2026

The retained study source is now committed with Home, Work and Contact adapters.
The About entry and renderer integrations remain with the separate About work.
Until that work is released, the About slot uses its existing presentation.
Fancy pages and assets remain excluded from production builds.
