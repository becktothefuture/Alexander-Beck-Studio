# About narrative toolkit

The development About page uses one whole-scene parameter panel. Press `/` on
`/about.html` to open it. The retired Director editor is documented separately
below for schema and migration maintenance; its timeline and inspector do not
mount in the current page.

## Current page contract

`react-app/app/public/config/contents-about.json` is the canonical source for
copy, measured story pacing and durable website appearance controls.
`aboutSceneControlRegistry.js` in `src/routes/about-narrative-lab/` defines the
shared control labels, defaults, ranges and document operations used by the
panel. Live apply, canonical save, reload and reset use this same document.
Diagnostic quality selection is session-only. Blender owns geometry, placement,
camera path, physical alignment, visibility cues and the default viewing distance.

The development preview accepts a cached scene only when its source hash matches
the saved canonical `.blend` and its metadata, camera and point data pass bundle
integrity checks. Source hashes are reused while the file signature is unchanged.
A stale cache falls back to the validated canonical export. The panel reports
the active source, expected source, bundle identity and stale/exporting status.
The watcher verifies source identity before and after export, then publishes an
immutable complete bundle through an atomic pointer. A camera or point-data change
updates the bundle identity even when the Blender source hash is unchanged.

The current Rendering group includes **Show backfaces**. It maps to the existing
`globals.pointMaterial.backfaceRetention` value: off saves `0`, on saves `1`.
The vertex shader rejects rear-facing samples before drawing; CPU diagnostics use
that same normal threshold. Toggle changes use the panel's existing revert, save,
and reload path. Blender remains the geometry and camera source.

The canonical Blender file now contains `Finale Bust - Connected Reconstructed Surface`:
one connected mesh with 38,514 vertices and 77,024 triangles. It was reconstructed
with screened Poisson (depth 8, point weight 4, PyMeshLab 2025.7.post1) from the
existing 24,000 oriented samples in `models/napoleon-bust/napoleon-points-high.bin`.
It is a reconstruction, not a recovered original scan. The original CC BY 4.0
attribution remains in that asset's `meta.json` and in the Blender object metadata.
The old proxy mesh remains as an unused Blender datablock. The website samples
the connected surface using the quality budgets recorded in the canonical
`public/models/about-v2-edited-world/meta.json`; this guide does not duplicate
those budgets or the camera controls.

The current Blender choreography is `text-scene-symphony/v1`. It aligns the
content stages named `about.00` through `about.06` to semantic camera
intervals instead of equal-distance sections:

1. `about.00` holds the opener and first two titles over the opening field.
2. `about.01` keeps the opening field for Background and Experience.
3. `about.02` carries two titles through the shape-free round tunnel.
4. `about.03` provides the longer terrain clearing for Disciplines and
   Selected Clients.
5. `about.04` carries two titles through 26 square gates that grow from `1x`
   to `3.2x`.
6. `about.05` keeps the How I Work prose in the same passage after the gates
   have opened to at least `2x`.
7. `about.06` rises from below toward the upright bust and closed platform. Two
   closing subtitles precede the final invitation. The bust and platform occupy
   the upper viewport; the final title, description and actions sit below them.

The seven IDs above are semantic content stages. The export contains six active
models: `about.00`, `about.02`, `about.03`, `about.04`, `about.05` and `about.06`.
The opening field spans both opening stages. The 24-body `about.01` cluster is
retained in an excluded Blender collection and is not drawn or exported. Model
visibility follows the semantic cues rather than packed model ID order.

One sampled scroll position drives text, camera travel, scene visibility and
progress. Camera distance uses a monotone interpolation through measured story
anchors: gentle continuous travel during reading, faster travel through title
passages, and smooth changes in speed. It adds no independent camera lag; reverse
scrolling retraces the same path. The camera holds at the endpoint while the
separate ambient clock continues until pause or Reduced Motion stops it.

Every in-between title uses the same motion window, depth curve, colour entrance
and exit behavior as “I think in pictures.” Chapter allocation is separate from
title travel. Reading space extends the following gap rather than slowing the
second statement. Measured layout reserves at least half a viewport between a
completed pair and the incoming prose. The opening and final titles retain
explicit bookend variants. Typography changes trigger remeasurement so narrow,
short and enlarged-text layouts can expand without clipping.

The current About content uses exactly five typography roles: Body, Small Body,
Eyebrow, Main Title, and Inbetween Title. `--about-type-*` variables in
`about-narrative-lab.css` map them to the existing responsive size sources. All
reader-facing text uses weight 400. Body covers prose, role headings and role or
discipline descriptions; Small Body covers opening/ending support and contact
labels. Eyebrows use Geist and uppercase. Main Title is shared by the opening and
ending. The five sizes, their leading, text measures and spacing are adjustable
through the existing parameter panel.
The shared shell and development editor keep their own control typography.

Prose and descriptions snap between the configured opacity levels as scrolling
crosses each line's thresholds, including the exit. They do not interpolate an
opacity fade. Titles retain their quick palette-colour draw.

Experience entries have a date eyebrow, a regular body heading and a maximum of
two sentences (40 words) per role. A separate gap precedes Experience. The role
header reveals as one unit; description lines use the prose opacity steps so a
long entry does not dim before it has been read. Browser measurements reserve the
space needed for the descriptions. The measured page-length target is a baseline,
not a cap that clips reader content. Validate with `scripts/audit-about-typography.mjs`.

Rendering uses shared atmospheric-point, solid-surface and bust profiles. Point
population controls admission within the selected quality budget; coverage
controls the point footprint. Opaque cores, depth occlusion and backface culling
keep the platform closed-looking at oblique angles. The Home palette and layered
atmosphere remain shared. Viewing-distance overrides are resolved once per frame
for the whole journey; resetting the group restores Blender's defaults.

Ambient motion dispatches by authored behavior: rigid body rotation, coherent
terrain deformation or bounded bust rotation. Solid surfaces do not inherit
independent particle wobble. The bust turns ±8° over a 32-second cycle around its
grounded vertical axis. Its upright alignment and contact with the platform are
authored in Blender. The final layout measures text bounds to separate the
upper bust/platform composition from the invitation below.

## Historical Director contract — retired

The following Director sections retain the older editor and procedural-adapter
contracts for migration maintenance. They do not describe the current parameter
panel, Blender runtime, title pacing or finale. Current Blender authoring and
verification instructions resume under their named headings near the end.

About Director was the local authoring product for the canonical About narrative.
Its canonical document uses **schema v7**.

## Director 4.0 editor contract

- The command bar separates Director identity, transport, document actions, and Save state.
- The timeline opens in a compact all-lanes overview and fits the complete Story to the available
  width. It has minimized, compact, and expanded dock heights. Resizing the dock does not change
  zoom, scroll, selection, playhead, active segment, preview geometry, or authored timing.
- Text is the first, persistent **Story spine**. Compact editing always keeps it beside the selected
  animation lane, and its final publishable exit is the canonical page boundary.
- Desktop and tablet use a stage, docked contextual inspector, and bottom timeline. Phone uses
  mutually exclusive Timeline and Inspector sheets.
- The timeline drawer is translucent, while each lane remains `95%` opaque. The preview remains
  visible without reducing key, segment, or label contrast.
- Moment buttons are generated from the publishable Text spine. They seek and centre each authored
  Text focus, so the navigation cannot drift from the page's real editorial order.
- Timeline dragging magnetically snaps to keys, Text-moment boundaries, text envelopes, effect edges, and
  the final orbit boundaries. Hold `Alt` while dragging to bypass snapping. The active snap WU is
  drawn beside the guide.
- Camera Move, Look, and Lens sliders open in a local **Fine** range and retain exact numeric entry.
  **Full** exposes the registered safety range when a larger change is intentional.
- Preview profile and Point Field authoring scope are independent. Changing Desktop, Tablet, Mobile,
  orientation, or Reduced Motion never changes the Base/Tablet/Mobile authored override.
- Text blocks keep their authored order and timing. Their copy, structured content, layout, and
  presentation remain editable; adding, removing, duplicating, reordering, moving, or resizing the
  Story spine is intentionally unavailable in schema v7.
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
3. One world-unit playhead samples Camera, Point Field, Text, and Motion at the same moment.

The creative toolkit is available only during local development:

```text
http://localhost:8012/about.html?edit=1
```

Development `/about.html?edit=0` is playback-only. Production `/about.html` renders the centered
Coming Soon gate and does not expose the narrative or its authoring controls.

## The authoring hierarchy

```text
About Narrative
└── Sequence
    ├── Camera
    │   ├── Move → Text-moment-bound XYZ position keys
    │   ├── Look → pitch, yaw, and roll keys
    │   ├── Lens → FOV keys
    │   └── Orbit → one target-locked finale movement
    ├── Visuals
    │   └── Forms + effects
    │       ├── Form intervals → reusable rest geometry and morph targets
    │       └── Nested Effects → drift, ripples, and assembly clips
    ├── Visual settings
    │   └── Point style → global opacity and point size, without timeline timing
    └── Story
        └── Text spine → travelling Titles and editorial Scroll blocks
```

- A **Sequence** is the complete scroll journey.
- A **Move key** sets only camera Position XYZ at a named Text moment, phase, and offset.
- A **Look key** sets only pitch, yaw, and roll at a named Text moment, phase, and offset.
- A **Lens key** sets only FOV at a named Text moment, phase, and offset.
- A **Camera orbit** circles one Form anchor while keeping Look aimed at that anchor.
- **Point material** controls global point opacity and size. The canonical visibility boundary stays at `1` throughout the sequence.
- A **Form state** is a reusable point-field definition referenced by stable keys.
- A **Point Field key** places a Form state relative to a named Text moment.
- A **transition segment** owns the parametric motion between two keys; hold regions retain a Form.
- A **Shape** is the rest arrangement of the fixed point pool.
- An **Effect clip** adds deterministic Story-time movement to a Form.
- A **Title** is a large travelling statement.
- An **editorial block** is native vertically scrolling prose, a list, or a detail.
- A **discipline list** is one ordinary editorial Scroll block containing six labels and descriptions.

“Stage” is not part of the authored vocabulary.

Titles stay sharp throughout their active span; spatial travel provides their entrance and exit. In the canonical experience,
each Title also uses the shared bookend colour draw: letters appear in reading order through full-opacity
palette colours, then settle to the authored text colour. The effect never changes the Title's size,
placement, or Story timing, and Reduced Motion settles it immediately. Editorial blocks remain ordinary
solid document content with no per-line opacity timeline. This keeps copy edits structural and
predictable while the point field and camera animate around them.

The timeline draws segment duration, camera translation and angular velocity, the final orbit,
camera movement, and activity coverage. Empty activity longer than `0.15 WU` is a
production error. Discipline labels use the normal structured Text inspector; they have no projected
anchors or separate responsive positioning model.

## The source of truth

The sole authored About document lives in:

```text
react-app/app/public/config/contents-about.json
```

Development playback, Director Save, local recovery, and the build input all resolve this document.
The route ignores `version` parameters and there is no second About source or writable endpoint.

Other ownership stays separate:

- Shared color, typography, and shell geometry: `public/config/design-system.json`
- Contact and social destinations: `public/config/contents-home.json`
- Editable camera rail, scene geometry, model visibility, persistent motion and
  authored fog, density and draw-distance defaults:
  `source-assets/about-v2-blender-current/about-v2-track-working.blend`
- Semantic score normalization:
  `scripts/about-v2-blender/choreograph-text-scene-symphony.py`
- Shape algorithms and safe control ranges: `src/routes/about-narrative-lab/aboutNarrativeDefinitions.js` and `aboutNarrativePointShapes.js`
- Exported point buffers and camera metadata:
  `public/models/about-v2-edited-world/` after candidate review and promotion
- Generated buffers, caches, playhead state, undo history, drafts, and diagnostics: runtime only

## World units and scroll

`1 WU` means one current narrative viewport height. The inspector can reduce the preview width, but the fixed timeline is portalled above the studio window and never changes its height or authored timing.

The sequence saves one Story duration and one Scroll duration per responsive profile. The fixed Text
spine defines both values and therefore defines the page's editorial rhythm. The profile resolver
maps each semantic content interval to its matching Blender cue interval. This piecewise mapping gives
long prose its complete reading distance while preserving the intended camera passage. It does not
divide the rail into equal sections or infer creative timing from raw mesh bounds.

Schema-v7 Text timing is immutable in the Director: its order, enter, focus, exit, and final page
boundary cannot be moved. Camera, Form, and Effect objects store bindings to those Text moments and
may be repositioned by changing their bound phase or offset. Animation therefore happens around the
page structure; it never changes the structure or silently retimes the reader's journey.

## One global playhead

The runtime has one `storyWU` value. Three sources can own it:

- **Scroll:** the page scrollbar is authoritative.
- **Timeline:** dragging the editor playhead is authoritative.
- **Playback:** the editor advances the playhead at a fixed rate.

Only one owner is active at a time. Scrubbing stops Lenis. Choosing **Follow scroll** resumes it without resetting the current page position. Wheel or touch input cancels playback.

The timeline is a dockable, development-only instrument grouped into Story, Camera, and Visuals.
It exposes five temporal lanes: Text spine, Move, Look, Lens, and **Forms + effects**. A Form interval
owns every Effect nested inside it. Clicking the **Forms + effects** track header opens the complete
sequence inspector: Form start, end, and duration plus each Effect's timing, Text-moment bindings,
type, and parameters. Changing a Form boundary scales its nested Effects proportionally so they stay
inside their owner. Global **Point style** opens the material inspector without creating a false empty
lane. Its neutral charcoal palette
does not inherit route or website theme colours. The first and final Camera boundaries remain protected. Left and Right arrow keys
jump to the previous or next timing point unless a text field or numeric control has focus.

### Fixed Text moments own animation timing

Every Camera, Form, Visibility, Orbit, and Effect trigger stores a binding with `momentId`, `phase`
(`enter`, `focus`, or `exit`), and `offsetWU`. The runtime keeps resolved WU values as a fast playback
cache, but the binding is authoritative. Dragging an animation changes its nearest fixed Text-moment
binding instead of creating a loose absolute key.

Effects and Orbit also have an `endTrigger`. An Effect's `startWU` is only its soft attack lead; its
full-strength activation remains bound to Text. Responsive profiles may change geometry, but cannot
override Text, Camera, Form, Visibility, or Effect timing. Schema validation rejects missing bindings,
unknown moments, invalid phases, timing drift, and responsive timing overrides.

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

## The Long Assembly

The canonical experience is one fixed, dot-built architectural ride. It does not use a montage of
alternate simulations. Two protected Point Field keys reference the same
`long-assembly-corridor-v1` state, and their only segment is a linear hold. Camera travel reveals
permanent structures through fog; the geometry never morphs, dissolves, resets, or returns.

The route uses one shared Hermite centreline for both geometry and camera. Its main set pieces are:

1. Station and square threshold
2. Material-yard chicane
3. Three staggered hoops and the first aperture wall
4. Archive cut with repeating load gates
5. Roof release, diagonal bridge, and sunken court
6. Banked interchange with side hoops
7. Six rapid workshop gates
8. Climbing assembly hall
9. Pressure wall and a four-gate compression run
10. Exposed city run with hoops, blind walls, and towers
11. Terminal hall where the signal conduit becomes a living load path

The Story Stack owns track length. `materializeAboutNarrativeStoryLayout()` writes measured
`layout.durationWU` and five semantic anchors into the runtime-only Shape parameters. The shared
track mapper compresses or extends each local route span. Shorter or longer copy therefore changes
camera distance, landmark spacing, and repeated bay counts together without changing their order.
The canonical 22 WU route advances 18.5 world units per WU: about 407 world units, or roughly a
two-minute physical ride at 3.4 units per second. A short physical tail keeps the terminal present
beyond the final text frame.

Select **Camera travel** in Director to tune the steadicam response. **Track glide** controls
scroll easing, **Rotation look-ahead** changes the shared camera-and-gate sight line, and **Mouse pan
amount/response** control the small passive local look offset. These values save to
`contents-about.json` at `globals.scrollSmoothing`, `globals.camera`, and the Long Assembly
`shapeParameters`. The centreline, gate alignment, and local-pan composition remain code-owned so
reconnecting the controls cannot create a second camera path. Mouse pan is disabled for Reduced
Motion, hidden pages, touch/coarse pointers, and direct pointer manipulation.

Desktop and mobile retain the fixed 12,000/5,000 point budgets. Mobile narrows the corridor in X but
does not delete beats or change their order. Three bounded `living-wave-v1` windows test the system,
then activate the terminal. Reduced motion sets their weight to zero, removes camera roll, and cuts to
the previous semantic ride key while keeping the same world and reading order. Long Assembly world
rotation is locked at zero because the track owns orientation; responsive scale and offsets remain valid.

Distance fog is evaluated in camera space. Long Assembly uses a zero far-fog floor, so geometry beyond
the 22-unit reveal window is genuinely invisible and only appears as the camera reaches it. Select
**Camera travel** in Director to tune **Fog begins** and **Fully faded** with live sliders and exact
WU inputs. Both values save to `globals.camera` in `contents-about.json`; the start control
cannot cross the end control.

## Camera fundamentals

The camera has three complete, non-overlapping lanes:

- **Move** owns Position XYZ only.
- **Look** owns pitch, yaw, and roll only. Quaternion interpolation produces continuous orientation.
- **Lens** owns FOV only.

Move keys cannot contain rotation, targets, focus, or FOV. Look is defined from Story start to the
finale handoff. **Fluid** Move segments use continuous Hermite tangents through adjacent Move keys,
so passing a key does not stop or change direction abruptly. Constant Move segments remain linear.
Look and Lens retain their own curves and velocity graphs.

The Sequence may contain one final Camera orbit. It references a Form state, resolves that Form's
responsive world anchor, takes over position and look-at for its authored interval, and appears as a
band on the Move lane. A Move key and Look key share the orbit start WU so the handoff is continuous.
The orbit easing also sets the Move handoff tangent: an eased orbit starts and ends at rest, while a
linear orbit retains the matching angular tangent.
The **Continuous field flight** recipe writes the current flight keys and full orbit as one undoable edit.

### Continuous presence and global fog

Schema v7 retains start and end visibility keys for compatibility, but both are protected at `1` and
the Director does not expose a Visibility lane. Point material remains editable through the global
**Point style** action because it has no timeline timing.
Depth, camera position, Form presence, and fog create visual breathing room without blacking out or
repositioning the point world off-screen.

Distance fog is global Sequence state with one start and end distance. It remains editable, but it
is never stored or interpolated per Camera key. Camera movement, atmospheric depth, and whether the
simulation exists on screen are therefore three explicit, non-overlapping controls.

## How Point Field states stay connected

Schema v7 stores one Point Field track with `stateDefinitions`, `keys`, and `segments`. Stable keys
reference reusable Form states. Segments own timing, easing, correspondence, and parametric transition
motion; hold regions retain the preceding Form without inventing another container. Camera,
Point Field, Text, and Motion remain independent tracks.

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

Open **World sequence** to tune each Form's essential Transformation controls beside its Effects.
**Flow** is the canonical movement character: spatial neighbours follow broad deterministic ribbons,
with restrained stagger and no opacity crossfade. Advanced exposes correspondence, axes, seeds,
frequency, and floor-plane controls. The inspector identifies the source and target Forms and reports
Preparing, Ready, last-valid fallback, or Failed. Saved JSON stores only authored parameters;
generated permutations and metrics remain runtime data.

## Current procedural Shapes

- `cluster-v1`: a spherical complexity cloud
- `turbulent-field-v1`: an uneven volumetric cloud assembled from weighted chunks, sparse pockets, loose particles, and an organic coordinate warp
- `calm-field-v1`: the wide horizontal field used for the uninterrupted flyover
- `emergent-form-v1`: six woven currents that read together as one suspended spatial sculpture
- `discipline-grid-v1`: a frontal field with six semantic anchors
- `living-field-v1`: terrain designed for wave and colour modifiers

`bust-v1` is the canonical final Form. `orbital-system-v1` remains registered for legacy draft
compatibility but is not part of the canonical sequence.

Use the Point Field state inspector to change a Form. The change is one undoable transaction. While
a new Shape generates, the last-valid compiled plan and buffers remain visible.

## Forms, Effects, and the Story clock

A Form supplies rest geometry, material, and authored morph targets. Its sequence interval also owns
all nested scroll-driven Effects, including ambient drift, swarm motion, group emphasis, ripples,
living waves, Bust assembly, and Bust yaw. Every Effect declares its interval, parameters, and reduced
motion behaviour, but it is edited in the same **Forms + effects** lane and inspector as its owner.
The document keeps Form and Effect data normalized for runtime performance; that storage detail does
not create a second authoring timeline.

The Composer has one narrative clock: `story`, derived from `storyWU`. Scrubbing forwards or
backwards therefore produces the same frame. Renderers may evaluate the sampled values, but they do
not choose activation, easing, phase, or timing. Hover, focus, dragging, and throwing remain direct
event-driven interactions because they are not scroll narrative.

## Text editing

### Edit a travelling title

1. Select the existing Title in the fixed Text spine.
2. Edit its statement, description, layout, or presentation controls in the inspector.
3. Leave its disabled enter, focus, and exit values unchanged; they define the page rhythm.
4. Retime the surrounding Camera, Form, and Effect objects through their Moment phase and Fine
   offset controls.

Clicking a clip selects and highlights it. Clicking a Camera key, Point Field key, Text field,
or Motion activation marker also snaps the global playhead to that exact WU. Clicking a track name
opens that track's global controls without requiring an empty-canvas click.

A Title is a fixed duration bar with a brighter focus marker. Shared spatial-title readable window,
depth path, and blur remain Sequence controls; there is no owning Section that can silently crop or
reinterpret its timing.

The saved Text field owns its immutable timing. No second file or JavaScript array may retime it.

The DOM contains one semantic sentence per Title field. Visual Z depth and blur are presentation only. The Spatial-title wrapper owns one shared CSS perspective, while every title travels from the shared negative-Z entry depth to the shared positive-Z exit depth. Maximum blur changes sharpness only; it does not move the title.

The opening Title (`text-promise-main`, using preset `opener-v1`) is already sharp at `0 WU` and begins from **Spatial titles → Opener start Y**. It then continues moving toward the shared exit position. Later travelling titles continue to use the shared Start Y, dual-handle **Clear window**, depth path, and blur-in/blur-out behaviour.

In the canonical experience, entering any travelling Title or the finale replays the same five-colour glyph draw used by the
opening bookend. Leaving its Text moment cancels and settles the transaction; re-entering that moment
replays it. The draw uses the current simulation palette and does not add a second saved timing lane.

### Edit editorial prose

Select a Scroll block in the Text lane and edit its structured content. Paragraphs, highlights,
details, clients, discipline lists, and normal lists stay native DOM content. They are not converted
into hundreds of keyframes.

### Edit the six discipline labels

Select **Disciplines** in the Text lane. It is one standard Scroll block with block kind
`disciplines`. Reorder or edit the six label-and-description records with dedicated structured controls.
The labels always render as one native DOM column and inherit the normal responsive editorial layout.
There is no Motion clip, viewfinder, projected anchor, per-label world position, grid isolation,
background opacity, point scaling, or color remapping.

The colored grid remains an independent World layer beneath this block. Its palette and opacity do
not react to which label is visible. The camera's fluid Move path supplies the helicopter-like motion.
After the labels, the story-clock ripple combines a primary radial wave, harmonic, undertow, and
center pulse while the titles cross the surface. It releases into E, where each point first gathers
onto the base-plane footprint of its eventual bust position. Height
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

## Current Blender runtime

The Blender camera maps the shared scroll sample through the seven semantic score
intervals and then to cumulative distance along the exported rail. The mapping is
monotone, continuous and reversible, with smooth travel-rate changes; each text
beat can own a different physical span. Reading intervals receive slower travel
while the title passages carry faster movement. There is no subsequent camera
settling or pointer pan to detach the camera from the text. The endpoint is reached
at the native page end; there is no extra brake or stationary scroll tail. Model
visibility follows the same exported semantic cues.

The square-gate camera uses a close aim on the same Blender rail. Its continuous
world-X right-axis reference carries the frame through the vertical loop without
the former world-up flip. The original aim blends back after the passage; the rail,
point geometry, authored bank keys and FOV remain Blender-owned. The first gate
is fully admitted before entry. The camera export includes all 26 evaluated
apertures and the `37 Gate Growth` value, so validation can check every physical
crossing, the linear `1x` to `3.2x` aperture progression and approach framing,
plus full-quaternion change per physical distance rather than forward direction
alone.

Editorial text passes through the full viewport with discrete line-opacity steps. Narrative titles use their
authored viewport anchor without upper-half correction rules. Contact reveals on elapsed visible time
at partial invitation stops and does not require the endpoint. Ambient material motion remains
independent and pausable. Reduced Motion cuts between authored camera poses and keeps the same final
composition with zero ambient displacement. No source geometry or camera samples are regenerated during playback.

On About, fine-pointer desktop viewports remain accessible at short heights, including native 200%
page zoom. The short/mobile-landscape cover still applies to coarse-pointer devices. Other routes and
the wide/tall aspect safeguards retain their existing guard rules. Reduced-motion cuts share one
scene clock for camera pose, whole-model admission and fog; scrolling between cuts must not animate
a visibility handoff. Passage exits settle directly at the next authored reading pose, avoiding a
held view back into gates beside the prose. Invalid career-item arrays return diagnostics instead of throwing.

The Blender exporter supports optional per-model material scales through the object's
`abs_manifestation_spread_scale` and `abs_detail_bias_scale` properties. Missing properties retain
the existing look. Present values must be finite and bounded; all objects within a model must agree.
The runtime binds them once through a validated, model-owned motion-group range. They change only
fog admission and detail selection, never geometry, camera sampling, opacity, stage timing or the
resident point budget. The canonical reading composition uses tighter manifestation spread in the
opening fields and side banks, plus additional bank detail. Portals and square gates retain their
default materials. Whole instances and connected terrain are composed in Blender around the reading
column; there is no projected text mask. Portrait prose uses a 68vw measure without changing type size
or restricting its vertical reading window. The opening field rebuilds 2,400 signal and 2,800 nebula
seed points before the existing Geometry Nodes generators; this removes the former seed-cap bottleneck
while retaining the 135k/90k/30k master, desktop and mobile point budgets. Its introductory paragraph
is present at the first rendered opener pose rather than entering through the delayed bookend sequence.

The terrain uses source-authored coherent deformation. The final active geometry
is a closed platform and a connected upright bust; `director.finale-surface` is
the bust's retained stable export key, not a full-width ground plane. The bust's
bounded ±8° turn lasts 32 seconds and keeps its base grounded. Motion pause and
Reduced Motion freeze ambient effects. Use the current exporter and scene checks;
copying an old candidate camera or running superseded study scripts is not an
integration procedure.

Surfel admission uses opaque geometric scale rather than opacity. Route entry, depth fog and bounded
stage handoffs grow each circle from zero radius; exiting stages shrink before their visibility window
closes. Fully inactive stages return in the vertex shader before motion and matrix work, retaining the
stable shared buffers and two-draw-call renderer. About uses the existing reduced-resolution layered
atmosphere compositor for broad haze, so the fuller fog does not add a ray-marched volume or another
WebGL scene pass. The final bust/platform composition occupies the upper viewport;
measured title, description and action bounds define the separate space below.

The composition audit covers career text, client artwork, prose, titles and action contents. Its
intrusion test uses decoded normals, actual ambient/terminal displacement, shader LOD/admission and
projected circular radius. A separate maximum-radius envelope remains available as a conservative
diagnostic. Terminal clearance also projects the complete source-to-maximum-displacement segment for
every ending point, so a one-second sample cannot miss a pulse peak. Painted regions are batched into
one projection pass; this work never runs in the RAF loop.
Optional failure collection keeps later checkpoint evidence but still exits unsuccessfully. Reading
banks require height, population and depth on both sides of the copy. Finale checks
must verify an upright, grounded bust and a closed-looking platform with no
intersection with the final text or actions, over the complete turn cycle. Continuous
forward/reverse recordings and inspected frames remain required; occupancy alone is not visual approval.

## Adding a new Shape generator

1. Add a registered Shape definition and bounded controls in `aboutNarrativeDefinitions.js`.
2. Add a deterministic generator in `aboutNarrativePointShapes.js`.
3. Return exact typed-array lengths, presence, size, attributes, and bounds.
4. Do not allocate or generate inside the RAF loop.
5. Add schema/compiler and density tests in `scripts/check-about-narrative-main.mjs`.
6. Verify Try, Apply, Cancel, incoming boundary, outgoing boundary, mobile, and reduced motion.

## Adding a future point-field adapter

A future adapter must use the shared renderer, scene, camera, resources, playhead, and RAF. It registers an ID and capabilities for Shapes, morphing, crossfade, interaction, reduced motion, renderer features, and resource cost. JSON can select registered IDs; it can never inject executable code.

An adapter must support preparation cancellation, explicit activation weight, deterministic `update(frame)`, and full disposal. It must not own the camera timeline, DOM text, persistence, or another animation loop.

## Current Blender authoring order

Run any required topology, naming, palette, control or persistent-motion repair
first. Run
`scripts/about-v2-blender/choreograph-text-scene-symphony.py` last in the open
canonical Blender file. It deterministically restores its pre-score rail/finale
baseline and then reapplies the semantic markers, camera timing, model
visibility, gate growth and the frontal bust/platform finale. The script also invokes
`smooth-camera-drone-motion.py`; it does not save or export. Inspect the result,
then save the canonical `.blend` deliberately.

`equalize-scene-sections.py` is superseded as the final normalizer for this
scene and must not run after the choreography script. The older
`lengthen-opening-solid-bodies.py` and `compact-finale-approach.py` spacing
overrides must not run afterward either because they replace parts of the
semantic score. If a legacy rebuild still requires any of those steps,
`choreograph-text-scene-symphony.py` must follow them.

Export to an explicit candidate directory first:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
  source-assets/about-v2-blender-current/about-v2-track-working.blend \
  --python scripts/about-v2-blender/export-edited-about-v2-point-world.py -- \
  --candidate-output-dir output/about-v2-candidates/text-scene-symphony

node scripts/about-v2-blender/check-about-v2-edited-world.mjs \
  --asset-dir output/about-v2-candidates/text-scene-symphony \
  --source-blend source-assets/about-v2-blender-current/about-v2-track-working.blend
```

Only promote the candidate to
`react-app/app/public/models/about-v2-edited-world/` after the asset check and
visual review. Canonical export requires both `--output-dir` and
`--allow-canonical-output`. A valid candidate is not browser acceptance.

## Verification

```bash
npm run check:about-v2-assets
npm run check:about-narrative
npm run check:about-narrative-hardening
node scripts/audit-about-gate-passage.mjs
ABS_BROWSER=webkit node scripts/audit-about-gate-passage.mjs
npm run audit:about-narrative
ABS_BROWSER=webkit npm run audit:about-narrative
npm run audit:about-narrative-terminal-hold
ABS_BROWSER=webkit npm run audit:about-narrative-terminal-hold
npm run audit:about-narrative-runtime-soak
npm run check:site
npm run certify:about-narrative
```

The browser audit must verify all seven semantic text/scene beats, the opening
field across `about.00` and `about.01`, the shape-free round passage, terrain
reading clearance, every growing square-gate crossing, the prose interval after
the gates exceed `2x`, and the rise into the upright bust/platform finale. It also
verifies identical in-between-title travel per scroll distance, the half-viewport
title-to-prose clearance, exact-WU sampling, the held final camera with
continuous material motion, global fog, continuous visibility, typography roles,
portal placement, protected boundaries, WebGL readiness and editor clearance
above the persistent Button Bar.

The certification runtime-visual audit captures the full authored arc at 32 exact Story WU
checkpoints. It records Point Field and compatibility visibility state and produces independent-review contact sheets for
desktop, mobile, and reduced motion. Inspect those sheets and continuous
forward/reverse recordings before recording browser acceptance. They are release
evidence, not optional debug output. Run certification from a clean isolated
checkout so its source commit is exact.
