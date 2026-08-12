# About Director 4.0

About Director 4.0 is the local authoring product for the About narrative. The product version and
the document version are separate: the current canonical document is **schema v7**.

## Director 4.0 editor contract

- The command bar separates Director identity, transport, document actions, and Save state.
- The timeline opens in a compact all-lanes overview and fits the complete Story to the available
  width. It has minimized, compact, and expanded dock heights. Resizing the dock does not change
  zoom, scroll, selection, playhead, active segment, preview geometry, or authored timing.
- Desktop and tablet use a stage, docked contextual inspector, and bottom timeline. A wider
  discipline inspector keeps the viewfinder map and all six positions usable. Phone uses mutually
  exclusive Timeline and Inspector sheets.
- The timeline drawer is translucent, while each lane remains `95%` opaque. The preview remains
  visible without reducing key, segment, or label contrast.
- Scene buttons seek and centre Opening, Field, Grid, Disciplines, Editorial, Closing, Bust, and
  Finale. Lane headers are selectable, so lane access remains usable when the top lane tabs are
  hidden at narrower widths.
- Timeline dragging magnetically snaps to keys, scene boundaries, text envelopes, effect edges, and
  discipline viewfinder crossings. Hold `Alt` while dragging to bypass snapping. The active snap WU
  is drawn beside the guide.
- Camera Move, Look, and Lens sliders open in a local **Fine** range and retain exact numeric entry.
  **Full** exposes the registered safety range when a larger change is intentional.
- Preview profile and Point Field authoring scope are independent. Changing Desktop, Tablet, Mobile,
  orientation, or Reduced Motion never changes the Base/Tablet/Mobile authored override.
- Text blocks have structured add, edit, reorder, duplicate, and remove actions. Advanced source is a
  lossless escape hatch for unknown valid fields.
- Diagnostics identify severity, object or segment, property, and message. **Show** selects the
  relevant timeline item and focuses its inspector control.
- Save, recovery, conflict, and checkpoint state belong to the editor store. Editor layout, panel
  sizes, zoom, and selection never become canonical document fields.
- The schema-v7 Composer document, compiler, and sampler are the authoritative implementation.
  Renderers display one sampled frame and never create narrative timing or camera motion.

## What this system is

The About page is one authored scroll sequence played by three cooperating layers:

1. Native DOM text remains readable, selectable, responsive, and accessible.
2. One Three.js point-field runtime draws every procedural Form, including the final emergent form.
3. One world-unit playhead samples Camera, Visibility, Point Field, Text, and Motion at the same moment.

The creative toolkit is available only during local development:

```text
http://localhost:8012/about.html?edit=1
```

The normal lab URL and `/about.html` are playback-only. Production builds remove the editor module and Save endpoint strings.

## The authoring hierarchy

```text
About Narrative
└── Sequence
    ├── Camera
    │   ├── Move → absolute XYZ position keys
    │   ├── Look → pitch, yaw, and roll keys
    │   └── Lens → FOV keys
    ├── World
    │   ├── Visibility → whole-simulation opacity keys
    │   ├── Forms → reusable rest geometry and morph targets
    │   └── Effects → drift, ripples, assembly, yaw, and discipline reveal clips
    └── Content
        └── Text → travelling Titles and editorial Scroll blocks
```

- A **Sequence** is the complete scroll journey.
- A **Move key** sets only absolute camera Position XYZ at one Story WU.
- A **Look key** sets only pitch, yaw, and roll at one Story WU.
- A **Lens key** sets only FOV at one Story WU.
- A **Visibility key** fades the complete point simulation independently of camera and fog.
- A **Form state** is a reusable point-field definition referenced by stable keys.
- A **Point Field key** places a Form state at an absolute Story WU.
- A **transition segment** owns the parametric motion between two keys; hold regions retain a Form.
- A **Shape** is the rest arrangement of the fixed point pool.
- An **Effect clip** adds deterministic Story-time movement to a Form.
- A **Title** is a large travelling statement.
- An **editorial block** is native vertically scrolling prose, a list, or a detail.
- A **Discipline reveal** is one movable Motion clip that moves six existing points through one stable grid reading line without creating another Form or six ordinary title keyframes.

“Stage” is not part of the authored vocabulary.

The timeline draws segment duration, camera translation and angular velocity, whole-simulation
visibility, activity coverage, and discipline viewfinder-crossing markers. Empty activity longer than
`0.15 WU` is a production error. The discipline inspector provides a two-dimensional grid editor for
Desktop, Tablet, and Mobile. Anchors snap to real point cells, preserve collision spacing, support
exact X/Z entry and responsive inheritance, and can move one reveal pair together.

## The source of truth

All About copy, order, timing, camera keys, Forms, Effects, and interactions live in:

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
Visibility, Point Field, Text, and Motion objects all use absolute Story WU, so moving one lane never
silently retimes another. The profile resolver maps physical scroll distance to the same authored
Story WU without measuring DOM content into the creative timing model.

Moving or resizing Text never scales Camera, Visibility, Point Field, or Motion timing. If Text extends
beyond the current ending, the Story boundary grows and the other tracks hold their last authored
state. Moving Text earlier can remove only unused ending space; it never compresses another lane.

## One global playhead

The runtime has one `storyWU` value. Three sources can own it:

- **Scroll:** the page scrollbar is authoritative.
- **Timeline:** dragging the editor playhead is authoritative.
- **Playback:** the editor advances the playhead at a fixed rate.

Only one owner is active at a time. Scrubbing stops Lenis. Choosing **Follow scroll** resumes it without resetting the current page position. Wheel or touch input cancels playback.

The timeline is a dockable, development-only instrument grouped into Camera, World, and Content.
It exposes Move, Look, Lens, Visibility, Forms, Effects, and Text lanes. Its neutral charcoal palette
does not inherit route or website theme colours. The first and final Camera and Visibility boundaries remain protected. Left and Right arrow keys
jump to the previous or next timing point unless a text field or numeric control has focus.

The compiler converts `storyWU` into:

```text
Global Story WU
Camera position, rotation, and FOV
Whole-simulation visibility
One global distance-fog pair
From/To Form state plus transition progress
Text field envelopes
Interaction activation
```

The runtime samples this once per animation frame. No point-field adapter may start another RAF.

## Camera fundamentals

The camera has three complete, non-overlapping lanes:

- **Move** owns Position XYZ only.
- **Look** owns pitch, yaw, and roll only. Quaternion interpolation produces continuous orientation.
- **Lens** owns FOV only.

Move keys cannot contain rotation, targets, focus, orbit, or FOV. Look is defined from Story start to
Story end, so rotation never changes owner during playback. The renderer does not generate a target
or an extra camera rotation. Constant Move segments use linear interpolation and report translation
speed in WU/WU. Look and Lens have separate curves and velocity graphs.

The **Helicopter sweep** recipe writes ordinary Move, Look, and Lens keys. It introduces no special
runtime behaviour or hidden coupling. Linked selection can retime related keys explicitly.

### Visibility and global fog

Visibility is its own lane. Each key stores `atWU`, a `0–1` whole-simulation visibility value, and
outgoing easing. At exact zero the point object is not drawn, which lets the sequence pass through
true empty/editorial space and return at a new camera pose without using fog as a camera cut.

Distance fog is global Sequence state with one start and end distance. It remains editable, but it
is never stored or interpolated per Camera key. Camera movement, atmospheric depth, and whether the
simulation exists on screen are therefore three explicit, non-overlapping controls.

### Current camera choreography

- `0–5.35 WU`: establish the opener, travel through the turbulent field, pass the first editorial
  interval, and bridge directly into the calm grid.
- `3.465–6.865 WU`: fade the first field completely out as the first editorial unit becomes readable, perform the
  grid morph and Camera reposition while hidden, then return it beneath the next travelling title.
- `7.70–11.15 WU`: use one linear Move segment from `[-5, 3.14, -4.51]` to
  `[-5, 3.14, -1.75]` at exactly `0.8 WU/WU`, with fixed height and a fixed compact-layout
  lens. It is already moving before the orientation change starts and continues through the complete
  Discipline pass.
- `8.35–9.15 WU`: keep the backward flyover moving while Look pitches smoothly from `-2.3°` to
  `-90°`. Move velocity does not change.
- `9.15–11.15 WU`: continue that same backward path down the grid, reveal the three paired Discipline
  rows as their projected anchors enter the lower viewfinder, reconnect the final points, and fade the
  labels before the world hides. Grid restore begins at `10.35 WU`; the labels are below the visible
  threshold by `11.075 WU`, before the Move segment leaves the held composition.
- `10.85–14.15 WU`: fade the Discipline field completely out as the second editorial unit becomes readable and
  use the zero-visibility interval for the complete Camera reframe.
- `14.15–16.35 WU`: return to the centred surface and sustain the grid ripple beneath the three
  shorter closing-title beats.
- `16.35–17.95 WU`: hand the grid ripple to the emergent ripple while the fixed point pool gathers
  and builds the bust from its lower layers into the head.
- `17.45–20.00 WU`: bring in the final invitation during the bust resolve, then hold the complete
  lockup without a separate empty beat.

The same editorial copy leaves the viewport at slightly different WU values as line wrapping and
viewport height change. The responsive sequence audit records the single exit breath separately and
caps it at `0.7 WU`; every other inactive run retains the stricter `0.15 WU` limit. This keeps the grid
fully hidden behind readable editorial text without disguising the width-dependent clearance as motion.

## How Point Field states stay connected

Schema v7 stores one Point Field track with `stateDefinitions`, `keys`, and `segments`. Stable keys
reference reusable Form states. Segments own timing, easing, correspondence, and parametric transition
motion; hold regions retain the preceding Form without inventing another container. Camera,
Visibility, Point Field, Text, and Motion remain independent tracks.

Timing and easing edits do not regenerate geometry or correspondence. The compiler and runtime keep
one cumulative point identity through the complete key order, so forward, reverse, and direct seeking
sample the same transition. Responsive differences use the existing Base, Tablet, and Mobile override
contract rather than duplicate states.

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
- `radial-emergence-v1`: the finale mapping; it divides visible points into 64 equal-population bands so the grid points nearest the ripple centre feed the bust targets that cross the surface first, while spatial refinement remains local to each band
- `group-aware`: additionally preserves declared semantic groups such as the six discipline anchors

The current sequence uses local spatial correspondence for orb → complexity and complexity → grid,
then radial emergence correspondence for grid → bust so the material is consumed from the ripple
centre outwards in the same order that the bust clears the surface. Local mapping is approximate rather than a mathematically global
optimum: deterministic Morton ordering and bounded repair reduce aggregate and outlier travel without
an impractical 12,000-point exact solver.

Procedural Shape generation and correspondence are prepared cumulatively in a module Worker, never in the RAF loop. The mapped endpoint of A → B becomes the exact source ordering for B → C, keeping point colour, drift phase, presence, and semantic identity continuous across the complete story. Direct seeking compiles the same chain. A complete last-known-good pair stays installed while an edited sequence prepares or fails. Resolved immutable CPU Shape and sequence arrays remain in bounded document-scoped caches across renderer remounts; abort-scoped promises, mutable runtime wrappers, WebGL resources, and GPU state never enter those caches.

Select a Point Field segment and open its Advanced transition controls to compare the supported
correspondence modes. The inspector identifies the source and target Forms and reports Preparing,
Ready, last-valid fallback, or Failed. Saved JSON stores only authored parameters; generated
permutations and metrics remain runtime data.

## Current procedural Shapes

- `cluster-v1`: a spherical complexity cloud
- `turbulent-field-v1`: an uneven volumetric cloud assembled from weighted chunks, sparse pockets, loose particles, and an organic coordinate warp
- `calm-field-v1`: a wide horizontal clearing whose existing points also provide the six semantic discipline anchors
- `emergent-form-v1`: six woven currents that read together as one suspended spatial sculpture
- `discipline-grid-v1`: a frontal field with six semantic anchors
- `living-field-v1`: terrain designed for wave and colour modifiers

`bust-v1` is the canonical final Form. `orbital-system-v1` remains registered for legacy draft
compatibility but is not part of the canonical sequence.

Use the Point Field state inspector to change a Form. The change is one undoable transaction. While
a new Shape generates, the last-valid compiled plan and buffers remain visible.

## Effects and the Story clock

A Form supplies only rest geometry, material, and authored morph targets. The Effects lane owns all
scroll-driven behaviour, including ambient drift, swarm motion, group emphasis, ripples, living
waves, Bust assembly, and Bust yaw. Every effect clip declares its interval, parameters, and reduced
motion behaviour.

The Composer has one narrative clock: `story`, derived from `storyWU`. Scrubbing forwards or
backwards therefore produces the same frame. Renderers may evaluate the sampled values, but they do
not choose activation, easing, phase, or timing. Hover, focus, dragging, and throwing remain direct
event-driven interactions because they are not scroll narrative.

## Text editing

### Add another travelling title

1. Put the playhead where the new sentence should begin.
2. Use **Add** on the Text lane and choose **Title**.
3. Select the new Text field, edit its statement, and set its start, focus, and end WU.
4. Drag the complete field to retime it without changing its internal reading interval.

Clicking a clip selects and highlights it. Clicking a Camera/Visibility key, Point Field key, Text field,
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

Select **Discipline reveal** in the Motion lane. C remains one unchanged calm-field Form for the
complete grid and discipline sequence: the Motion clip owns grid isolation, background opacity, and
point emphasis. Full motion resolves each item from its projected anchor as it enters the lower
viewfinder; Reduced Motion steps at the same compiled crossing times without spatial travel.
The clip never owns camera, fog, or whole-system visibility.
**Grid restore duration** gently returns the grid to its full, unhighlighted circles near the clip end.
Reorder the six labels without remapping their stable point groups. Reposition their explicit Desktop,
Tablet, and Mobile anchors in the two-dimensional grid editor; production playback has no fallback grid.

The Discipline reveal stays authored in Motion, but the Text lane shows its complete interval as a
read-only flow reservation. This makes the occupied reading interval visible between the preceding
titles and the following editorial block without creating a second timing owner.

The clip is one draggable timing object. Six stable point groups resolve as three paired rows on
desktop and as the compact responsive composition on tablet and portrait mobile. Phone landscape and
short landscape use the shared viewport cover. The runtime projects each label from its point-group
anchor while the Camera continues its top-down travel, then restores the grid and fades the labels
before the Camera leaves. A selected cell starts as an ordinary grey grid point, grows at its anchored
reading position, and reconnects with the moving grid as its copy exits. Its previous material colour does
not affect the selection because the semantic group assigns the reveal colour. Their
palette is fixed to the Home simulation ball tokens by semantic group: `1 → --ball-1`,
`2 → --ball-4`, `3 → --ball-3`, `4 → --ball-7`, `5 → --ball-8`, `6 → --ball-6`.
After the final labels pass and the grid restoration completes, Visibility hides the complete simulation
for editorial copy. C returns in
full colour around the same transformed center. The story-clock ripple combines a primary radial
wave, harmonic, undertow, and center pulse while the titles cross the surface. It releases into E,
where each point first gathers onto the base-plane footprint of its eventual bust position. Height
thresholds then lift the lower layers, shoulders, neck, and head in order. The effect uses the material
itself—no helper rings, point-size pulse, or second camera rig.

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

Director reliability state is explicit:

- **Source:** loading, ready, read-only, or failed.
- **Draft:** revision, dirty state, and valid or invalid.
- **Preview:** saved, valid draft, last-valid fallback, or preparing candidate.
- **Save:** idle, saving, saved, failed, or conflict.
- **Recovery:** current, stale, expired, invalid, future, unreadable, or failed.

Save submits an immutable `{document, revision, baselineHash}` snapshot. A normalized server response
becomes the clean document only when no newer edit exists. If editing continues during Save, the new
hash advances the baseline while the current draft remains dirty. Recovery drafts save after a
debounce and on `pagehide`. A stale draft never applies automatically; the editor offers Recover as
unsaved copy, Export, or Discard.

A `409` conflict never overwrites or auto-merges local work. Director offers Export local, a stable-ID
comparison, a retry when the canonical fetch fails, and confirmed Reload. Checkpoints expose valid,
invalid, and future-editor entries instead of silently dropping protected data.

The router preserves `?edit=1`, and editor-originated writes do not trigger Vite's generic content reload. Save therefore keeps the same editor URL, selection, and playhead open.

Schema v7 is canonical. The persistence boundary owns migration from v6 and older documents, including recovery,
clipboard, checkpoint, import, and canonical-load paths. A migration that cannot preserve authored
meaning fails closed and retains the original value for recovery or export. Director never creates a
parallel v3 schema or compatibility adapter.

## Safeguards

Validation blocks Apply and Save for duplicate IDs, invalid extents, unsafe text, unknown Forms,
modifiers, or transitions, broken numeric values, invalid buffers, or a missing protected finale.

The last-known-good compiled plan continues to play while a draft is invalid. Runtime failure containment includes abortable Shape generation, cached valid buffers, resource disposal, theme-token updates outside the hot loop, WebGL context recovery, visibility pausing, legacy procedural-bust fallback, and accessible editorial content when WebGL is unavailable. Where Three.js supports it, shader preparation uses `compileAsync()` behind the existing readiness cover. The scene-ready signal still waits for the first final-size rendered narrative frame, with synchronous compilation retained as the compatibility and failure fallback.

The protected reduced-motion profile step-samples camera and visibility, removes continuous flight,
depth/blur travel, gathering motion, and ambient modifiers. It keeps stable text, settled Form
states, and the six labels only during their authored interval.

## Adding a new Shape generator

1. Add a registered Shape definition and bounded controls in `aboutNarrativeDefinitions.js`.
2. Add a deterministic generator in `aboutNarrativePointShapes.js`.
3. Return exact typed-array lengths, presence, size, attributes, and bounds.
4. Do not allocate or generate inside the RAF loop.
5. Add schema/compiler and density tests in `scripts/check-about-narrative.mjs`.
6. Verify Try, Apply, Cancel, incoming boundary, outgoing boundary, mobile, and reduced motion.

## Adding a future point-field adapter

A future adapter must use the shared renderer, scene, camera, resources, playhead, and RAF. It registers an ID and capabilities for Shapes, morphing, crossfade, interaction, reduced motion, renderer features, and resource cost. JSON can select registered IDs; it can never inject executable code.

An adapter must support preparation cancellation, explicit activation weight, deterministic `update(frame)`, and full disposal. It must not own the camera timeline, DOM text, persistence, or another animation loop.

## Verification

```bash
npm run check:about-narrative
npm run check:about-narrative-hardening
npm run audit:about-narrative
ABS_BROWSER=webkit npm run audit:about-narrative
npm run audit:about-narrative-runtime-soak
npm run check:site
npm run certify:about-narrative
```

The browser audit verifies exact-WU sampling, the direct Position/Rotation/FOV camera rig, global fog,
independent Visibility, editor/playback presence, typography roles, portal placement, protected
boundaries, keyframe navigation, discipline anchors and palette mapping, text edit/undo, WebGL
readiness, timeline collapse, and editor clearance above the persistent Button Bar.

The certification runtime-visual audit captures the full authored arc at 32 exact Story WU
checkpoints. It records Point Field and Visibility state and produces independent-review contact sheets for
desktop, mobile, and reduced motion. These contact sheets are required release evidence, not optional
debug output. Run certification from a clean isolated checkout so its source commit is exact.
