# Work canvas engine

## Naming boundary

`src/routes/playground/` and the `playground` design-config namespace are historical internal names for the spatial engine now used by Work. They are retained to avoid a risky simultaneous source, import, generated-config, and persistence migration.

There is no public Lab route or Lab Button Bar tab. `/playground.html` and `/playground` are compatibility aliases for `/portfolio.html`; they render Work and select the Work tab. `PlaygroundRoute.jsx` and `PlaygroundComingSoon.jsx` are obsolete public-route wrappers and must not be restored.

Use **Work** in user-facing copy, accessibility labels, documentation, and audit output. Use `playground` only when referring to the internal source/config contract.

## Engine ownership

| Concern | Source |
| --- | --- |
| Work composition and React lifecycle | `PlaygroundExperience.jsx` with `experience="work"` |
| Authored spatial defaults and normalization | `config/playgroundConfig.js` |
| Development control schema and save path | `config/playgroundPanel.js` |
| Camera and input | `spatial/cameraController.js`, `spatial/cameraMath.js` |
| Placement and world copies | `spatial/placement.js`, `spatial/world.js`, `spatial/copyCoverage.js` |
| Responsive and project-depth projection | `spatial/responsiveProfile.js`, `spatial/projectDepth.js` |
| Three-layer dot field | `spatial/dotFieldRenderer.js` |
| Media runtimes | `media/` |
| Unified Work adapter | `../portfolio/work/workCatalog.js` |

React owns catalogue loading, semantic markup, selection, overlay state, focus, history, and disposal. The camera and Canvas renderer own high-frequency motion outside React state.

## Placement contract

Placement is deterministic. It uses the catalogue, item identity, placement order, preferred span, optional case-study anchor, layout preset, spacing, responsive projection, snippet depth, and `layoutSeed`. Salon chooses one quantized repeat area from the complete depth-adjusted footprints plus clearance, targeting 64% occupancy of those padded areas. Authored world minima still apply. If packing fails, it grows both dimensions in bounded 12.5% steps and rebuilds the entire field, for at most eight attempts. The renderer uses exactly that accepted period; it never adds a blank border around boundary-crossing projects.

The first valid case-study anchor preserves the opening hero. Other anchors are preferences: keep one when its coverage score is within 15% of the best candidate. Place larger remaining footprints before smaller ones so snippets fill the holes. Each item tests at most 512 seeded quarter-cell candidates across the whole period, including its edges. A coverage grid capped at 24 × 24 samples scores the reduction in empty-space distance to media and the protected title. The hard depth-aware clearance check always takes priority over that score. Nearest wrapped centres check opposite edges and corners without allocating nine obstacle copies; period minima also protect each item's own copies.

Minimum clearance follows the image diagonal, not a fixed one-cell gap. Packing includes complete captions, depth-adjusted footprints, and the maximum relative travel visible in the current viewport. Equal-depth neighbours need only their ordinary gutter; cross-depth neighbours reserve extra horizontal and vertical clearance. The title's safe area uses settled layout dimensions converted to world units, including on mobile. No frame-time collision solver, reseeding, hiding, or displacement is permitted during pan.

The authored world is finite and grid-quantized. Visual copies provide unbounded exploration without cloning semantic content or media ownership. Salon favours even coverage over strict append stability: a catalogue edit can recompose existing positions even when the quantized period stays the same. The accepted layout stays fixed during panning. Changing content, geometry, preset, or seed requires complete desktop/mobile field review. The older non-periodic presets retain their append-only placement policy.

`node scripts/audit-work-repeat.mjs` checks projected desktop/mobile coverage in both themes, including repeat boundaries and corners. The default density gate requires seam mean image coverage of at least 80% of interior coverage, at least 2.5% visible image area plus one meaningful project (unless the title dominates), no empty disk larger than 85% of the reference image diagonal, and no sampled point farther from content than 80% of that diagonal. These sampled checks complement the exhaustive pairwise clearance tests; they are not a continuous density proof. Run again with `ABS_BROWSER=webkit`. Review captions visually after copy edits: footprints still use conservative line estimates, not live font shaping.

Do not regenerate the seed during routine content editing. Use **Generate new seed** only for a deliberate full-field recomposition, review the complete field, and save it through the canonical design-configuration flow.

## Camera and input

- Pointer/touch drag pans directly; release uses filtered velocity and bounded momentum.
- Wheel and trackpad input ease toward a logical target.
- Arrow keys and WASD pan when the world owns focus.
- World keyboard focus uses a compact, viewport-fixed WASD cue. It remains visible after panning away from the title and never outlines the studio-window perimeter.
- Roving item navigation chooses the nearest item in the requested direction and uses `camera.animateTo()` to centre it.
- `Home` recentres the title.
- Ctrl-wheel and Command-wheel remain browser zoom; the route adds no application zoom.
- Pointer work is frame-coalesced, and camera plus foreground/dot layers consume the same committed sample before paint.
- `animateTo()` is cancellable. New user input, a superseding item, route teardown, or unmount must stop stale centering work. `setEnabled(false, { preserveAnimation: true })` locks background input while allowing a selected item's intentional centering to finish during expansion.

Narrow viewports use one derived responsive profile. It scales the same world, keeps input direct, preserves readable captions, and does not create a second saved mobile configuration.

Image size uses the diagonal of the usable canvas viewport, in CSS pixels. Composition exposes **Viewport share**, **Mobile min diagonal**, and **Desktop max diagonal**. The primary reference is `clamp(484px, viewportDiagonal × 0.36, 576px)` at the authored defaults. Existing case-study variation and smaller snippet proportions derive from that reference; every media axis uses the same scale. The narrow-width and short-height fit safeguards may reduce a case study further. These are preview sizes, not open-stage or drawer sizes.

The diagonal is computed only on viewport resize or configuration change. Both width and height participate, including height-only resize. Packing uses the same final image geometry as rendering, and Layout grid changes composition without multiplying image size. The former Item scale slider is superseded by the diagonal controls; its stored value remains a compatibility baseline. Caption legibility, touch targets, image ratios, dot geometry, and motion durations are not diagonal-scaled.

One `playground-world` compositor transform moves the foreground and one additional transform offsets the snippet plane. Both use the same camera sample. The projection moves each footprint centre at its plane's speed while preserving image and caption dimensions; it does not require a second camera or a CSS 3D context through the rounded window clip. Case studies and the title stay in front. Snippets move more slowly, and Reduced Motion puts both project planes at foreground speed.

Semantic item transforms and title offsets update only when their nearest repeated period changes (or the spatial model is rebuilt). Do not restore inherited per-frame camera CSS variables or rewrite all tile transforms on every drag frame. Copy coverage includes the deeper plane's wider visible world area. Exact-tap inverse projection, keyboard centering, pinning, and decorative copy visibility use the same depth model. The two presentation wrappers retain one semantic list with one item per logical project.

## Depth field

The Work background consists of three seeded coloured dot layers with base parallax factors `0.16`, `0.34`, and `0.58`, plus per-point depth variation. Colours come from the shared palette controller, not another authored palette. The authored dot opacity is 1: the nearest layer is 100% opaque, the middle layer 52%, and the far layer 34%. The Dot opacity control sets the nearest-layer opacity; the other layers fade relative to it. Opacity does not change dot size, density, or placement. The renderer:

- caps the combined visible dot count at 1,800;
- anchors sampling phase and stride to world coordinates, independent of camera movement;
- selects cells with a stable density hash and offsets each point within its cell and depth layer using grid randomness;
- uses an independent 72px projected base grid; changing dot controls must not rebuild project placement;
- calibrates CSS axes independently so dots remain circular at fractional sizes and high DPR;
- redraws on camera, size, DPR, or theme changes;
- sleeps when the field is unchanged;
- does not react to hover;
- freezes the depth field for Reduced Motion, without ambient drift.

Do not replace the depth field with thousands of DOM nodes, a continuously drifting background, a CSS box-shadow texture, or an unbounded full-world Canvas draw. The parallax response should be felt during navigation without competing with the work.

## Authoring controls

The docked and detached development panels use one schema. Open the normal panel with the settings launcher; Shift-click opens the detached host. Controls are grouped under Composition, Dot field, Motion, Actions, and Diagnostics.

The canonical `playground` namespace owns deterministic layout, item scale/variation, dot appearance, wheel response, and drag momentum. `dotDensity` and `dotRandomness` range from zero to one in steps of 0.01; the initial values are 0.58 and 0.65. Zero randomness aligns the depth grids; one randomizes position within each cell including depth. Density zero draws no dots; one retains all sampled cells within the same bounded budget. The existing Layout grid control belongs under Composition because it changes project geometry, not dot density. Live changes are provisional. **Save design configuration** sends a normalized snapshot through the existing canonical authoring flow; when the write-capable endpoint is unavailable, it downloads JSON. Diagnostics and `window.__ABS_PLAYGROUND_CONFIG__` are output/helpers, never authored truth.

**Save Work Settings** reads fresh canonical JSON and changes only the normalized `playground` namespace. It preserves all other scopes instead of capturing unrelated runtime globals. `node scripts/audit-work-controls.mjs --save` is an opt-in local write audit: it checks the payload before writing, exercises live apply/save/reload, and restores the original values. Run it serially with other work because canonical writes trigger HMR.

The panel name and internal namespace may remain `playground` until a separately approved migration can prove live apply, canonical save, reload, flattening, preview, and backwards compatibility. Do not hand-edit generated configuration files.

The diagonal clamp uses `itemDiagonalViewportRatio` (20–60%, step 1%), `itemDiagonalMinPx` (320–520px, step 4px), and `itemDiagonalMaxPx` (520–720px, step 4px). Their non-crossing ranges keep saved clamps valid. Diagnostics show the usable viewport diagonal and resolved image reference without persisting derived values. The existing compact panel shell, dock, and detached host are unchanged.

Motion owns **Snippet depth** (`snippetDepth`, 0–20%, step 1%). It specifies how much slower snippets move than case studies; zero keeps a single apparent plane. Its authored default is in `design-system.json`. The existing **Project spacing** control remains the composition lever. Clearance budgets, frame translations, repeat coverage, and fit safeguards are derived implementation policy, not extra knobs. Depth never changes the image-size clamp or dot appearance.

## Media boundary

Snippet image, video, and local-code previews keep the established poster-first ownership. Only the selected logical item may own active video or code. A video reveals after its first presented frame and stops when ownership ends. Code previews use bounded local `srcDoc` renderers with `sandbox="allow-scripts"`; do not add remote embeds or `allow-same-origin`.

The idle field may run at most one visible video and one visible code preview. Selecting any project suspends those background runtimes, leaving their poster geometry mounted. The expanded snippet is then the sole playback owner; background previews reactivate when the presentation closes. Do not run a second instance of the selected code demo behind its overlay. A viewport or control change that rebuilds the camera must preserve the open presentation's background-input lock.

The old asset-only `PlaygroundLightbox` remains compatibility code while Work uses `WorkSnippetStage`. Do not reintroduce a pop-in lightbox as the public opening behavior.

## Verification

Run from the repository root:

```bash
npm run check:work-canvas
ABS_BROWSER=chromium npm run audit:work-canvas
ABS_BROWSER=webkit npm run audit:work-canvas
ABS_BROWSER=chromium node scripts/audit-work-depth.mjs
ABS_BROWSER=webkit node scripts/audit-work-depth.mjs
node scripts/audit-work-controls.mjs --save --build
ABS_PERF_LABEL=current node scripts/audit-work-performance.mjs
```

The `check:playground` and `audit:playground` commands are compatibility aliases for the Work checks. The canonical browser audit must prove route aliases, four-tab navigation, hierarchy, input/wrapping, deterministic depth layers, bounded/sleeping renderer, input-to-next-paint and render-tail ceilings, overlapping centering/expansion, protected gate behavior, full-window case-study drawer, snippet aspect ratios, URL/Back, focus return, mobile, themes, Reduced Motion, and error-free cleanup. `scripts/audit-work-refinements.mjs` covers repeated-world selection, all represented media aspect ratios, responsive boundary sizes, and live dot controls.

The performance audit owns a disposable browser and continuously samples only that process tree and the existing development servers. It warms twelve distinct projects, then measures repeated opens/closes, three drag runs per viewport, idle dot draws, retained heap, DOM/media ownership, and teardown. Chromium reports main-thread/style/layout costs; both browsers report frame intervals. Forced garbage collection is confined to untimed retention checkpoints. Do not interpret headless frame intervals as a hardware-independent 60 FPS certification. Locator waits must not retain detached media through unused ElementHandles.
