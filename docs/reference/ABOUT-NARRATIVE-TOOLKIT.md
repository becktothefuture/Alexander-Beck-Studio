# About Narrative creative toolkit

## What this system is

The About page is one authored scroll sequence played by three cooperating layers:

1. Native DOM text remains readable, selectable, responsive, and accessible.
2. One Three.js point-field runtime draws every procedural World, including the final emergent form.
3. One world-unit playhead samples Camera, Visibility, World, Text, and Motion at the same moment.

The creative toolkit is available only during local development:

```text
http://localhost:8012/lab/about-narrative.html?edit=1
```

The normal lab URL and `/about.html` are playback-only. Production builds remove the editor module and Save endpoint strings.

## The authoring hierarchy

```text
About Narrative
└── Sequence
    ├── Camera track → absolute Camera keys
    ├── Visibility track → whole-simulation opacity keys
    ├── World track → Shape + modifier stack
    ├── Text track → travelling Titles and editorial Scroll blocks
    └── Motion track → discipline reveal and gathering-pulse clips
```

- A **Sequence** is the complete scroll journey.
- A **Camera key** sets an absolute Position XYZ, Rotation XYZ, and lens at one Story WU.
- A **Visibility key** fades the complete point simulation independently of camera and fog.
- A **World** is a registered Three.js system placed at a fixed point in 3D space.
- A **Shape** is the rest arrangement of the fixed point pool.
- A **modifier** adds deterministic or ambient movement to a Shape.
- A **Title** is a large travelling statement.
- An **editorial block** is native vertically scrolling prose, a list, or a detail.
- A **Discipline reveal** is one movable Motion clip that isolates six existing points and projects their labels from exact Three.js anchors without creating another World or six ordinary title keyframes.

“Stage” is not part of the authored vocabulary.

## The source of truth

All About copy, order, timing, camera keys, Shapes, modifiers, and interactions live in:

```text
react-app/app/public/config/contents-about.json
```

The editor and public playback read that same document. There is no second JavaScript copy of the prose.

Other ownership stays separate:

- Shared color, typography, and shell geometry: `public/config/design-system.json`
- Contact and social destinations: `public/config/contents-home.json`
- Shape algorithms and safe control ranges: `src/routes/about-narrative-lab/aboutNarrativeDefinitions.js` and `aboutNarrativePointShapes.js`
- Generated buffers, caches, playhead state, undo history, drafts, and diagnostics: runtime only

## World units and scroll

`1 WU` means one current narrative viewport height. The inspector can reduce the preview width, but the fixed timeline is portalled above the studio window and never changes its height or authored timing.

The sequence saves one Story duration and one Scroll duration per responsive profile. Camera,
Visibility, World, Text, and Motion objects all use absolute Story WU, so moving one lane never
silently retimes another. The profile resolver maps physical scroll distance to the same authored
Story WU without measuring DOM content into the creative timing model.

## One global playhead

The runtime has one `storyWU` value. Three sources can own it:

- **Scroll:** the page scrollbar is authoritative.
- **Timeline:** dragging the editor playhead is authoritative.
- **Playback:** the editor advances the playhead at a fixed rate.

Only one owner is active at a time. Scrubbing stops Lenis. Choosing **Follow scroll** resumes it without resetting the current page position. Wheel or touch input cancels playback.

The timeline is a collapsible, development-only overlay with five independent lanes: Camera,
Visibility, World, Text, and Motion. Its palette does not inherit route or website theme colours.
The first and final Camera and Visibility boundaries remain protected. Left and Right arrow keys
jump to the previous or next timing point unless a text field or numeric control has focus.

The compiler converts `storyWU` into:

```text
Global Story WU
Camera position, rotation, and FOV
Whole-simulation visibility
One global distance-fog pair
From/To World plus transition progress
Text field envelopes
Interaction activation
```

The runtime samples this once per animation frame. No World adapter may start another RAF.

## Camera fundamentals

The camera is one absolute six-axis rig. There is no authored frame origin, aim target, depth
offset, orbit, look-at, or secondary roll/dolly layer underneath it. Rotation Z is the rig's direct
roll axis, not an additional positioning system.

### Editable Camera keys

A Camera key stores:

- Global Story WU (`atWU`)
- Absolute Position X, Y, and Z in world units
- Rotation X, Y, and Z in degrees
- FOV
- A travel curve into the next key

Rotation uses Three.js `YXZ` Euler order at authored keys and quaternion interpolation during playback. This avoids sudden flips while keeping the inspector understandable as X/Y/Z degrees. Position and FOV interpolate directly between keys. The renderer applies the sampled absolute position and quaternion without a secondary look-at, orbit, or rail adjustment.

Adding a Camera key at the playhead samples the published pose first, so insertion does not create a jump. Migrated support keys are ordinary absolute keys that approximate the former path closely without retaining its offset/target machinery.

### Camera travel easing

Selecting a Camera key opens its **Travel easing** graph. It controls the outgoing segment: the move from the selected key to the next key, never the segment that arrived at it. The two horizontal Bezier handles shape departure and arrival for position, rotation, and lens.

- **Out / acceleration** controls how long the shot holds before it gathers speed.
- **In / deceleration** controls how early the shot starts settling into the following composition.
- Linear travel is also supported and is used by the baked migration path where it best preserves the previous motion.

The curve can be dragged directly, adjusted with arrow keys, entered numerically, or set from Balanced, Cinematic, and Measured presets. The final Camera key has no outgoing segment, so its curve is disabled.

### Camera rig controls

The open **Camera rig** folder contains exactly seven paired slider/exact-value controls:

- **Position X**, **Position Y**, and **Position Z** move the camera in world space.
- **Rotation X**, **Rotation Y**, and **Rotation Z** rotate around the camera itself at the centre of the viewport, like a first-person video-game camera.
- **Field of view** widens or tightens the lens.

Travel easing remains in a separate collapsed folder. Slider gestures live-apply as one undoable
edit, while the adjacent number field supports precise entry. The protected first and final keys
cannot move in time or be deleted, but their pose remains editable.

### Visibility and global fog

Visibility is its own lane. Each key stores `atWU`, a `0–1` whole-simulation visibility value, and
outgoing easing. At exact zero the point object is not drawn, which lets the sequence pass through
true empty/editorial space and return at a new camera pose without using fog as a camera cut.

Distance fog is global Sequence state with one start and end distance. It remains editable, but it
is never stored or interpolated per Camera key. Camera movement, atmospheric depth, and whether the
simulation exists on screen are therefore three explicit, non-overlapping controls.

### Current camera choreography

- `0–3.15 WU`: establish the orb above the opener, fly through its threshold, enter the turbulent
  field, and continue forward as the complexity scatters.
- `3.15–6.98 WU`: the simulation fades completely out, crosses the empty interval, and returns as a
  floor plane while the camera pitches toward a true `-90°` bird's-eye view.
- `6.98–8.39 WU`: hold the bird's-eye composition while the six disciplines isolate and label.
- `8.39–11.61 WU`: hide the simulation during editorial copy, reposition unseen, then return to the
  same grid in full colour and exact face-on alignment.
- `11.81–13.28 WU`: keep `-90°` pitch and zoom straight out as one gathering front activates from
  the grid center.
- `13.28–15.2 WU`: resolve the lifted floor into one suspended woven form, leave the overhead view,
  and make one continuous oblique camera pass through the form.
- `15.2–16.35 WU`: set whole-simulation Visibility to zero and hold the invitation and actions in
  clean centered space.

## How Worlds stay connected

Each World object owns an absolute `startWU`, registered adapter ID, Shape ID, deterministic seed,
fixed transform, entry distance, transition window, correspondence mode, and modifier stack. Its end
is derived from the next World's start; no authored Section container or duplicate boundary is needed.

The World is placed once on its own world-placement rail:

```text
World Z = worldRail origin - anchorWU × unitsPerWU - entryDistanceWU
```

This rail belongs to World anchoring only; it does not modify the authored camera. The World does not remain attached to the camera.

Camera, World, Text, and Motion are independent tracks. Replacing a middle Shape preserves camera keys, text, World placement, and motion unless a capability check says the replacement is incompatible.

## The point pool

The point-field adapter keeps one GPU pool:

- Desktop: 12,000 points
- Mobile/coarse pointer: 5,000 points

Every Shape generator must return exact-length typed arrays for position, presence, size, attributes, and bounds. Outputs are checked for non-finite coordinates and invalid values before installation.

Density does not resize the GPU pool. Sparse Shapes set some point presence to zero and collapse inactive points onto deterministic active anchors. This gives dense → sparse → dense morphs a stable origin instead of popping points in from unrelated coordinates.

Correspondence modes are:

- `index-v1`: exact compatibility with the approved sequence
- `stable-seed`: the same canonical seeded pool, suitable for new procedural Shapes
- `spatial-nearest-v1`: the editor's **Local travel (approx.)** mode; it matches visible points in world space, protects semantic anchors, and accepts only a visibility-aware improvement over the compatible baseline
- `spatial-nearest-v2`: the production local-travel mapping with deterministic continuity across the full fixed point pool
- `group-aware`: additionally preserves declared semantic groups such as the six discipline anchors

The current sequence uses local spatial correspondence for orb → complexity and complexity → grid,
then local spatial correspondence again for grid → emergent form so each fixed-pool point travels
toward one woven destination. Local mapping is approximate rather than a mathematically global
optimum: deterministic Morton ordering and bounded repair reduce aggregate and outlier travel without
an impractical 12,000-point exact solver.

Procedural Shape generation and correspondence are prepared cumulatively in a module Worker, never in the RAF loop. The mapped endpoint of A → B becomes the exact source ordering for B → C, keeping point colour, drift phase, presence, and semantic identity continuous across the complete story. Direct seeking compiles the same chain. A complete last-known-good pair stays installed while an edited sequence prepares or fails.

Select a World clip and open **Transition in → Correspondence** to compare Index order, Stable seed, Local travel, and Group aware. The inspector identifies the source and target Shapes and reports Preparing, Ready, Baseline fallback, or Failed. Saved JSON stores only the registered mode; generated permutations and metrics remain runtime data.

## Current procedural Shapes

- `cluster-v1`: a spherical complexity cloud
- `turbulent-field-v1`: an uneven volumetric cloud assembled from weighted chunks, sparse pockets, loose particles, and an organic coordinate warp
- `calm-field-v1`: a wide horizontal clearing whose existing points also provide the six semantic discipline anchors
- `emergent-form-v1`: six woven currents that read together as one suspended spatial sculpture
- `discipline-grid-v1`: a frontal field with six semantic anchors
- `living-field-v1`: terrain designed for wave and colour modifiers

`orbital-system-v1` and `bust-v1` remain registered for legacy draft compatibility but are not part of
the canonical sequence.

Use **World → Replace Shape → Try** to preview a replacement at the same playhead. **Apply** is one undoable transaction. **Cancel** restores the active compiled plan. While a new Shape generates, the last valid buffers remain visible.

## Modifiers and clocks

A Shape supplies rest positions. Its ordered modifier stack supplies behaviour:

- Ambient drift
- Swarm life: independent 3D motion driven by the Sequence-level **Shared turbulence** profile. The cluster and turbulent field use the same full-strength profile; each World exposes only a local strength multiplier, allowing the same motion to taper smoothly into the calm field.
- Group emphasis
- Living wave
- Living colour
- Ambient drift on the resolved emergent form

Modifiers can be enabled, reordered, and parameterised. Shared turbulence range, speed, irregularity, individuality, and axis spread are edited once under **Sequence → Shared turbulence**. The World-level **Swarm life → Local strength** control changes intensity without creating a second motion profile. Each registered modifier declares safe ranges, units, cost, and reduced-motion behaviour.

Two clocks keep editing reproducible:

- `story`: derived from `storyWU`, deterministic when scrubbing backwards
- `ambient`: wall-clock motion during live playback
- `mixed`: authored state plus a bounded ambient layer

Disable **Live ambient** to freeze ambient movement while comparing frames. The canonical ending has
no pointer-owned sculpture rotation: camera movement, World morphing, and global Visibility carry the
complete final beat.

## Text editing

### Add another travelling title

1. Put the playhead where the new sentence should begin.
2. Use **Add** on the Text lane and choose **Title**.
3. Select the new Text field, edit its statement, and set its start, focus, and end WU.
4. Drag the complete field to retime it without changing its internal reading interval.

Clicking a clip selects and highlights it. Clicking a Camera/Visibility key, World start, Text field,
or Motion activation marker also snaps the global playhead to that exact WU. Clicking a track name
opens that track's global controls without requiring an empty-canvas click.

A Title is an absolute duration bar with a brighter focus marker. Dragging the bar moves its complete
start/focus/end envelope. Shared spatial-title duration, readable window, depth path, and blur remain
Sequence controls; there is no owning Section that can silently crop or reinterpret its timing.

The saved Text field owns its absolute timing. No second file or JavaScript array needs editing.

The DOM contains one semantic sentence per Title field. Visual Z depth and blur are presentation only. The Spatial-title wrapper owns one shared CSS perspective, while every title travels from the shared negative-Z entry depth to the shared positive-Z exit depth. Maximum blur changes sharpness only; it does not move the title.

The opening Title (`text-promise-main`, using preset `opener-v1`) is already sharp at `0 WU` and begins from **Spatial titles → Opener start Y**. It then continues moving toward the shared exit position. Later travelling titles continue to use the shared Start Y, dual-handle **Clear window**, depth path, and blur-in/blur-out behaviour.

### Edit editorial prose

Select a Scroll block in the Text lane and edit its structured content. Paragraphs, highlights,
details, clients, discipline lists, and normal lists stay native DOM content. They are not converted
into hundreds of keyframes.

### Edit the six-discipline reveal

Select **Discipline reveal** in the Motion lane. C remains one unchanged calm-field World for the
complete grid and discipline sequence: the Motion clip owns label activation, grid isolation,
background opacity, point emphasis, and the label hold. It never owns camera, fog, or whole-system
visibility. **Grid restore duration** gently returns the grid to its full, unhighlighted circles near
the clip end. Reorder the six labels without remapping their stable point groups.

The clip is one draggable timing object. The native DOM labels project from their corresponding
Three.js points and pack inside the viewport on desktop, portrait mobile, and short landscape. Their
palette is fixed to the Home simulation ball tokens by semantic group: `1 → --ball-1`,
`2 → --ball-4`, `3 → --ball-3`, `4 → --ball-7`, `5 → --ball-8`, `6 → --ball-6`.
After the labels restore, Visibility hides the complete simulation for editorial copy. C returns in
full colour at the centered top-down camera. The Gathering pulse Motion expands once from that
transformed center, lifting the floor and drawing points inward so the activation remains legible from
a true bird's-eye view. The pulse hands the fixed point pool into the emergent World; it does not
repeat as a sine wave, create helper rings, or alter point size to fake the effect.

## History, comparison, and checkpoints

- Every mutation is a named undoable command.
- Reorder, Shape replacement, import, restore, reseed, and camera recipe application are atomic.
- Consecutive slider and typing changes coalesce into useful history steps.
- Auto-key starts off every session. Scrubbing never creates data.
- **After / Before** compares the current draft with the saved baseline at the same WU using the same renderer.
- A Checkpoint stores a named local document snapshot, source hash, timestamp, and playhead. Checkpoints never enter production JSON.
- Import and Export remain available even when Save is blocked.

## Save, conflicts, and recovery

The local editor loads the canonical document with a SHA-256 hash. Save sends that hash through `If-Match`.

The development server:

1. Accepts only the fixed About config path.
2. Requires a same-origin JSON request and editor header.
3. Rejects bodies above 1 MiB.
4. Serialises concurrent writes through a per-file queue.
5. Migrates, normalises, and validates the candidate.
6. Writes, flushes, and atomically renames a same-directory temporary file.
7. Returns the new hash.

Status meanings:

- **Draft:** valid unsaved edits exist.
- **Saving:** a snapshot is being written; editing can continue.
- **Saved:** the exact sent snapshot is now the baseline.
- **Save failed:** work remains local and can be retried or exported.
- **Source changed:** another writer changed the file; Save returns 409 rather than overwriting it.

Edits made while Save is in flight remain dirty after the response. Recovery drafts save after a debounce and on `pagehide`. A stale draft never applies automatically; the editor offers Recover as unsaved copy, Export, or Discard.

The router preserves `?edit=1`, and editor-originated writes do not trigger Vite's generic content reload. Save therefore keeps the same editor URL, selection, and playhead open.

Schema v5 deliberately has one global fog pair. Legacy v3/v4 sources migrate automatically only
when every Camera key and responsive override agrees with that pair. A source with genuinely
divergent per-key fog cannot be converted losslessly, so migration fails closed with a
`camera-fog-migration-divergence` diagnostic and preserves the exact original as a recovery/export
payload. The editor never averages or silently drops those authored fog changes; resolve them into
one intentional global pair before importing the document as v5.

## Safeguards

Validation blocks Apply and Save for duplicate IDs, invalid extents, unsafe text, unknown adapters/Shapes/modifiers, broken numeric values, unsupported transitions, invalid buffers, or a missing protected final World and publishable finale.

The last-known-good compiled plan continues to play while a draft is invalid. Runtime failure containment includes abortable Shape generation, cached valid buffers, resource disposal, theme-token updates outside the hot loop, WebGL context recovery, visibility pausing, legacy procedural-bust fallback, and accessible editorial content when WebGL is unavailable.

The protected reduced-motion profile step-samples camera and visibility, removes continuous flight,
depth/blur travel, gathering motion, and ambient modifiers. It keeps stable text, settled World
states, and the six labels only during their authored interval.

## Adding a new Shape generator

1. Add a registered Shape definition and bounded controls in `aboutNarrativeDefinitions.js`.
2. Add a deterministic generator in `aboutNarrativePointShapes.js`.
3. Return exact typed-array lengths, presence, size, attributes, and bounds.
4. Do not allocate or generate inside the RAF loop.
5. Add schema/compiler and density tests in `scripts/check-about-narrative.mjs`.
6. Verify Try, Apply, Cancel, incoming boundary, outgoing boundary, mobile, and reduced motion.

## Adding a future World adapter

A future adapter must use the shared renderer, scene, camera, resources, playhead, and RAF. It registers an ID and capabilities for Shapes, morphing, crossfade, interaction, reduced motion, renderer features, and resource cost. JSON can select registered IDs; it can never inject executable code.

An adapter must support preparation cancellation, explicit activation weight, deterministic `update(frame)`, and full disposal. It must not own the camera timeline, DOM text, persistence, or another animation loop.

## Verification

```bash
npm run check:about-narrative
npm run audit:about-narrative
ABS_BROWSER=webkit npm run audit:about-narrative
npm run check:site
```

The browser audit verifies exact-WU sampling, the direct Position/Rotation/FOV camera rig, global fog,
independent Visibility, editor/playback presence, typography roles, portal placement, protected
boundaries, keyframe navigation, discipline anchors and palette mapping, text edit/undo, WebGL
readiness, timeline collapse, and editor clearance above the persistent Button Bar.

The certification runtime-visual audit captures the full authored arc at 32 exact Story WU
checkpoints. It records World and Visibility state and produces independent-review contact sheets for
desktop, mobile, and reduced motion. These contact sheets are required release evidence, not optional
debug output.
