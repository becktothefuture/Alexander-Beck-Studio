# About V2 cinematic point world

`about-v2-track-working.blend` is the canonical editable source for the About
page camera, geometry, object visibility, persistent scene motion and authored
fog, density and draw-distance defaults. Open it in Blender 4.3 or newer.
`react-app/app/public/config/contents-about.json` owns the editorial content,
page timing and optional browser-side visual overrides. The shared
`aboutSceneControlRegistry.js` in `src/routes/about-narrative-lab/` supplies the
panel's labels, defaults, ranges and document operations. It does not introduce
another configuration store. The two authored sources meet
through the `about.00` through `about.06` stage IDs and semantic camera cues
exported in `meta.json`.

The generated bundle must record the canonical `.blend` path and its current
SHA-256. Do not maintain a second hand-authored hash in this guide.

## Current semantic score

The rail is one continuous editable Bezier path. The score maps seven content
stage IDs to semantic beats, not equal-distance camera sections:

1. `about.00` — opener and the first two titles over the opening field.
2. `about.01` — Background and Experience continue through the same opening
   field. The field therefore spans both opening beats.
3. `about.02` — the two next titles travel through a shape-free round tunnel.
4. `about.03` — Disciplines and Selected Clients read over the longer terrain
   clearing.
5. `about.04` — the next two titles travel through the square-gate tunnel. Its
   26 apertures grow linearly from `1x` to `3.2x`.
6. `about.05` — the How I Work prose reads once the same square passage has
   opened to at least twice its starting aperture.
7. `about.06` — the camera rises from below into a frontal view of the upright
   bust on its closed platform. Two closing subtitles lead to the final
   invitation. The bust and platform sit in the upper viewport, with the final
   title, description and actions in a separate space below.

Visual density falls before each reading beat and rises through the travel beats.
The round tunnel contains no solid bodies. All 24 bodies remain in an excluded
Blender collection and are omitted from the active export. The bundle therefore
contains six models: `about.00`, `about.02`, `about.03`, `about.04`, `about.05`
and `about.06`; their packed numeric IDs are contiguous. The seven semantic
content-stage IDs remain intact. Visibility cues, rather than model ID order,
decide where each model appears. `director.finale-surface` remains the stable
export key for the bust, not a full-width ground plane.

`Scene Camera` follows `Camera Path` from frame 1 to the camera lock at frame
901, then holds through frame 1001 while authored material motion continues.
Website coordinates map Blender `(x, y, z)` to site `(x, z, -y)`.
The website maps its shared scroll sample to physical rail distance through a
monotone paced interpolation: slower travel during measured reading intervals
and faster travel through title passages. It adds no separate camera lag, and
reverse scrolling retraces the same path. Ambient animation uses a separate
pausable clock so it can continue when scrolling stops.

In-between titles share one motion window and depth curve; chapter allocation
extends the following gap rather than slowing the second title. The measured
layout reserves at least half a viewport before prose enters. The five text roles
remain Body, Small Body, Eyebrow, Main Title and Inbetween Title. Reader-facing
text has no bold formatting, and prose lines snap between opacity levels on
entry and exit. Text size and spacing changes trigger layout remeasurement.

## Blender navigation and controls

The Outliner contains one `ABOUT SCENE` root with nine numbered collections:

1. `00 CONTROLS`
2. `01 CAMERA`
3. `02 OPENING`
4. `03 SOLID BODIES`
5. `04 ROUND TUNNEL`
6. `05 LANDSCAPE`
7. `06 SQUARE GATES`
8. `07 HORIZON`
9. `08 FINALE`

Visible names are for people. The exporter locates critical objects through
their stable `abs_system_id` and `abs_object_id` properties. Machine metadata in
`Internal Export Data` does not need manual editing.

Select `About Controls` for all public scene controls. Its numbered properties
cover Camera + Fog, Opening Field, Solid Bodies, Round Tunnel, Landscape, Square
Gates and Bust Finale. The current score sets these key values:

- Opening Field: `1.66%` to `43%`
- Solid Bodies controls remain available for the excluded source collection;
  they do not add bodies to the website.
- Round Tunnel: `45.5%` to `54%`
- Landscape: `56%` to `71%`
- Square Gates: `73%` to `90%`, `Gate Count` at `26`
- `37 Gate Growth`: `3.2`

The Opening Field and Landscape start/end controls translate or resize their
occupied rail ranges. `24 Mountain Height` controls the broad terrain and
`25 Mountain Detail` controls its smaller peaks. `18 Ring Count` and `28 Gate
Count` change complete generated apertures. `32 Twist` applies the progressive
square-passage roll, and `37 Gate Growth` opens successive square gates without
introducing a second tunnel object.

Edit the ten points of `Camera Path` in Edit Mode to change the route shape.
`smooth-camera-drone-motion.py` supplies the look-ahead steering and continuous
finale flight. The synchronized score script invokes that camera work itself.

`author-persistent-world-motion.py` authors rigid body rotation, coherent terrain
deformation and bounded bust rotation. The bust turns ±8° over a 32-second cycle
around its grounded vertical axis, preserving its upright silhouette and contact
with the platform. The runtime dispatches these behaviors through one ambient
motion system; solid surfaces do not inherit independent particle wobble. Motion
pause and Reduced Motion freeze ambient effects.

## Safe script order

For the current scene, run only the repair, topology, palette or motion scripts
needed for the change. Then run this script last:

```text
scripts/about-v2-blender/choreograph-text-scene-symphony.py
```

The choreography script is deterministic and idempotent. It restores its saved
pre-score rail/finale baseline, reapplies the semantic markers, rail timing,
visibility ranges, 26-gate growth and the frontal finale, and calls the current smooth
camera routine. It does not save or export. Inspect the result in Blender, then
save the canonical `.blend` deliberately.

`equalize-scene-sections.py` is superseded as the final normalizer for this
scene. Never run it after the choreography script. Do not run the former spacing
overrides `lengthen-opening-solid-bodies.py` or
`compact-finale-approach.py` afterward either; they overwrite parts of the
synchronized score. When a full legacy rebuild is unavoidable, complete its
topology, naming, parameter and persistent-motion steps first, then apply
`choreograph-text-scene-symphony.py` as the final scene normalizer.

## Palette and point sampling

Every export object uses `abs_palette_mode`. The default is `mixed`;
`authored-faces` preserves deliberate face assignments on the solid forms. Use
`single` with `abs_palette_role` only for an intentional one-role override.
`abs_palette_seed` keeps mixed assignments stable. The exporter records semantic
roles, and the browser resolves those roles through the active Home palette.

Resolve the current Blender preview swatches from the website source with:

```bash
node scripts/about-v2-blender/resolve-home-palette-preview.mjs
```

`apply-semantic-palette-system.py` reapplies export-facing role metadata and
material slots. It does not save the file. `Opening Field`, curved geometry and
volumetric geometry use deterministic surface blue-noise sampling. The closed
platform retains authored face roles; its active palette mix omits the Steel
role so a background-coloured sector does not appear as a hole.

Shared atmospheric-point, solid-surface and bust profiles separate population
admission from point coverage. Opaque point cores, depth occlusion and backface
culling preserve closed surfaces. The website control panel can adjust those
profiles without changing Blender geometry or rebuilding it per frame. Viewing
distance inherits Blender's camera fog until an explicit website override is
enabled. That override applies throughout the journey; reset restores Blender's
values. The Home palette and layered atmosphere remain shared.

## Candidate-first export and validation

For normal live development, keep Blender and
`http://localhost:8012/about.html` open, then run:

```bash
npm run studio:about-blender
```

The watcher exports each settled save into a temporary candidate and validates
the complete bundle. The source file must have the same identity before and
after export. A changed source discards that result and queues the newer save.
Publication installs an immutable bundle, then atomically replaces the cache
pointer. Source, camera, point-data and metadata hashes identify each version;
files from different versions cannot be combined across browser requests.

The development resolver accepts a cache only when it matches the saved
canonical source and passes integrity checks. It hashes the `.blend` only when
the file signature changes. Stale or invalid cache data falls back to the
validated canonical bundle under
`react-app/app/public/models/about-v2-edited-world/`. The panel shows the active
source, expected source, bundle identity and stale/exporting state. During an
export, the last valid scene remains visible. The About page swaps complete
bundles at the current scroll position while its editorial state remains mounted.
This watcher does not replace canonical browser assets.

For a reviewable manual candidate, run from the repository root:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
  source-assets/about-v2-blender-current/about-v2-track-working.blend \
  --python scripts/about-v2-blender/export-edited-about-v2-point-world.py -- \
  --candidate-output-dir output/about-v2-candidates/text-scene-symphony

node scripts/about-v2-blender/check-about-v2-edited-world.mjs \
  --asset-dir output/about-v2-candidates/text-scene-symphony \
  --source-blend source-assets/about-v2-blender-current/about-v2-track-working.blend
```

Inspect the candidate through the development page across the complete forward
and reverse journey, desktop and mobile, before replacing canonical assets.
Check all seven text/scene beats, every square-gate crossing, reading clearings,
the approach from below, the bust's complete bounded turn, separation from final
text/actions, motion pause and Reduced Motion. A successful export or
asset check is not browser acceptance.

After the candidate is accepted, promote by exporting explicitly to the
canonical directory and run the complete checks:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
  source-assets/about-v2-blender-current/about-v2-track-working.blend \
  --python scripts/about-v2-blender/export-edited-about-v2-point-world.py -- \
  --output-dir react-app/app/public/models/about-v2-edited-world \
  --allow-canonical-output

npm run check:about-v2-assets
npm run check:about-narrative
node --test scripts/check-about-blender-preview.mjs
node scripts/audit-about-gate-passage.mjs
ABS_BROWSER=webkit node scripts/audit-about-gate-passage.mjs
npm run audit:about-narrative
ABS_BROWSER=webkit npm run audit:about-narrative
npm run check:site
npm run certify:about-narrative
```

Review the generated desktop, mobile and Reduced Motion contact sheets. Do not
report browser acceptance until those frames and the continuous forward/reverse
recordings have been inspected.

## Active scene tools

- `choreograph-text-scene-symphony.py` owns the current semantic score.
- `watch-about-v2-blend.mjs` connects saved source changes to development.
- `export-edited-about-v2-point-world.py` creates candidate or canonical bundles.
- `check-about-v2-edited-world.mjs` validates a selected bundle and source.
- `author-persistent-world-motion.py` authors body, terrain and bust motion.
- `parameterize-passage-families.py` owns round and square generated passages.
- `parameterize-opening-landscape-ranges.py` owns opening/terrain range controls.
- `parameterize-landscape-appearance.py` owns mountain form controls.
- `apply-semantic-palette-system.py` owns export-facing palette metadata.
- `simplify-scene-names.py` restores the readable hierarchy after a legacy
  rebuild.

The Blender Text Editor also contains `README - About Scene` as a quick guide.
