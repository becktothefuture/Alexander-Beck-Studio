# About Director — retired

> The About Director no longer mounts on the development About page. Press `/` on
> `/about.html` to open the replacement whole-scene parameter panel. The material
> below is retained only as historical schema and migration documentation; its
> editor routes, shortcuts, panels, and workflow are not current product behavior.

About Director is the local authoring product for the canonical About narrative. The current
canonical document is **schema v7**.

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
- Shape algorithms and safe control ranges: `src/routes/about-narrative-lab/aboutNarrativeDefinitions.js` and `aboutNarrativePointShapes.js`
- Generated buffers, caches, playhead state, undo history, drafts, and diagnostics: runtime only

## World units and scroll

`1 WU` means one current narrative viewport height. The inspector can reduce the preview width, but the fixed timeline is portalled above the studio window and never changes its height or authored timing.

The sequence saves one Story duration and one Scroll duration per responsive profile. The fixed Text
spine defines both values and therefore defines the page's editorial rhythm. The profile resolver
maps physical scroll distance to that authored Story WU without measuring DOM content into the
creative timing model.

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

The Blender camera maps native scroll position to cumulative distance along the exported rail.
Equal scroll distances produce equal physical travel, including during the invitation and in reverse.
Text cues do not retime the camera. Native scrolling, zero camera settling and zero pointer pan keep
camera position tied to scrolling without a second motion clock. The authored endpoint is reached
at the native page end; there is no extra brake or stationary scroll tail. Model visibility follows
physical distance cues rather than the old editorial timings.

The square-gate camera uses a close aim on the same Blender rail. Its continuous
world-X right-axis reference carries the frame through the vertical loop without
the former world-up flip. The original aim blends back after the passage; the rail,
point geometry, nine authored bank keys and FOV stay unchanged. The first gate is
fully admitted before entry. The camera export includes the evaluated apertures,
so validation checks all 14 physical crossings and their approach framing, plus
full-quaternion change per physical distance rather than forward direction alone.

Editorial text passes through the full viewport with only an edge feather. Narrative titles use their
authored viewport anchor without upper-half correction rules. Contact reveals on elapsed visible time
at partial invitation stops and does not require the endpoint. Ambient material motion remains
independent and pausable. Reduced Motion cuts between authored camera poses and keeps the same final
composition with zero ambient displacement. No source geometry or camera samples are regenerated during playback.

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

The browser audit verifies exact-WU sampling, the Position/Rotation/FOV camera lanes, the held final camera with continuous material motion, global fog,
continuous visibility, editor/playback presence, typography roles, portal placement, protected
boundaries, keyframe navigation, native discipline labels, uninterrupted palette, text edit/undo, WebGL
readiness, timeline collapse, and editor clearance above the persistent Button Bar.

The certification runtime-visual audit captures the full authored arc at 32 exact Story WU
checkpoints. It records Point Field and compatibility visibility state and produces independent-review contact sheets for
desktop, mobile, and reduced motion. These contact sheets are required release evidence, not optional
debug output. Run certification from a clean isolated checkout so its source commit is exact.
