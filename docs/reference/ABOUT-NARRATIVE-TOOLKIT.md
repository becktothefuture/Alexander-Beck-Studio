# About Narrative creative toolkit

## What this system is

The About page is one authored scroll sequence played by three cooperating layers:

1. Native DOM text remains readable, selectable, responsive, and accessible.
2. One Three.js point-field runtime draws every procedural World and the final bust.
3. One world-unit playhead samples Camera, World, Text, and Interaction at the same moment.

The creative toolkit is available only during local development:

```text
http://localhost:8012/lab/about-narrative.html?edit=1
```

The normal lab URL and `/about.html` are playback-only. Production builds remove the editor module and Save endpoint strings.

## The authoring hierarchy

```text
About Narrative
└── Sequence
    ├── Section
    │   ├── Camera track → Camera keys
    │   ├── World track → Shape + modifier stack
    │   ├── Text track → travelling Cues or editorial blocks
    │   └── Interaction track
    └── Section …
```

- A **Sequence** is the complete scroll journey.
- A **Section** is a reorderable unit of the story.
- A **Camera key** adds framing, aim, lens, or roll to continuous forward travel.
- A **World** is a registered Three.js system placed at a fixed point in 3D space.
- A **Shape** is the rest arrangement of the fixed point pool.
- A **modifier** adds deterministic or ambient movement to a Shape.
- A **Cue** is a large travelling statement.
- An **editorial block** is native vertically scrolling prose, a list, or a detail.

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

`1 WU` means one current narrative viewport height. The editor reduces the preview to make room for its timeline and inspector, then updates the pixel value of one WU so authored timing does not stretch.

Each Section saves `extentWU` and `mobileExtentWU`:

- A pinned spatial Section has about `extentWU - 1` usable travel WU because one viewport remains visible while it is pinned.
- An editorial Section treats its authored extent as a minimum. Natural content can make the resolved extent larger.
- Global start and end values are compiled from order and resolved extents. They are never authored twice.

The editor context bar shows both authored and resolved extent.

## One global playhead

The runtime has one `storyWU` value. Three sources can own it:

- **Scroll:** the page scrollbar is authoritative.
- **Timeline:** dragging the editor playhead is authoritative.
- **Playback:** the editor advances the playhead at a fixed rate.

Only one owner is active at a time. Scrubbing stops Lenis. Choosing **Follow scroll** resumes it without resetting the current page position. Wheel or touch input cancels playback.

The compiler converts `storyWU` into:

```text
Section index
Section-local 0…1 progress
Camera position, aim, FOV, and roll
From/To World plus transition progress
Text Cue envelopes
Interaction activation
```

The runtime samples this once per animation frame. No World adapter may start another RAF.

## Camera fundamentals

The camera has a protected base dolly and editable shot offsets.

### Base dolly

The default camera is:

```text
z = startZ - storyWU × cadence
```

At the default cadence, one story WU moves the camera one camera-distance WU forward. This is why the camera keeps advancing through editorial and spatial Sections with the same cadence.

### Editable Camera keys

A Camera key stores:

- Position inside its Section (`at`, from 0 to 1)
- X, Y, and forward offset
- Look-at offset
- FOV
- Roll
- Easing into the next key

The editor interpolates aim and lens independently from the protected base dolly. Orientation is resolved by Three.js look-at math rather than interpolating authored Euler rotations.

Use **Set camera key** to make a change permanent. Camera recipes—Push, Glide, Orbit, Reveal, and Resolve—create normal visible keys that can be edited or deleted.

**Camera View** shows the published camera. **Director View** temporarily orbits, tilts, and zooms around the sampled target without writing keys. Resetting or leaving Director View restores the published framing.

The editor-only **Path** overlay shows Section boundaries, fixed World anchors, the current playhead, and the constant-cadence path. It never appears in production.

## How Worlds stay connected

Every Section has either:

- `world.mode: "set"`: introduce a World clip, or
- `world.mode: "continue"`: keep the previous World unchanged.

A World clip owns a registered adapter ID, Shape ID, deterministic seed, fixed transform, entry distance, transition window, correspondence mode, modifier stack, and interaction settings.

The World is placed once in world space:

```text
World Z = camera Z at Section entry - entryDistanceWU
```

The camera then moves toward and through it. The World does not remain attached to the camera.

Camera, World, Text, and Interaction are independent tracks. Replacing a middle Shape preserves Section timing, camera keys, text, World placement, and interaction unless a capability check says the replacement is incompatible.

## The point pool

The point-field adapter keeps one GPU pool:

- Desktop: 12,000 points
- Mobile/coarse pointer: 5,000 points

Every Shape generator must return exact-length typed arrays for position, presence, size, attributes, and bounds. Outputs are checked for non-finite coordinates and invalid values before installation.

Density does not resize the GPU pool. Sparse Shapes set some point presence to zero and collapse inactive points onto deterministic active anchors. This gives dense → sparse → dense morphs a stable origin instead of popping points in from unrelated coordinates.

Correspondence modes are:

- `index-v1`: exact compatibility with the approved sequence
- `stable-seed`: the same canonical seeded pool, suitable for new procedural Shapes
- `group-aware`: additionally preserves declared semantic groups such as the six discipline anchors

Correspondence is applied only when Shape buffers change, never in the RAF loop.

## Current procedural Shapes

- `cluster-v1`: a spherical complexity cloud
- `calm-field-v1`: a wide horizontal clearing
- `discipline-grid-v1`: a frontal field with six semantic anchors
- `living-field-v1`: terrain designed for wave and colour modifiers
- `bust-v1`: the loaded point bust, with a procedural fallback if its asset fails

Use **World → Replace Shape → Try** to preview a replacement at the same playhead. **Apply** is one undoable transaction. **Cancel** restores the active compiled plan. While a new Shape generates, the last valid buffers remain visible.

## Modifiers and clocks

A Shape supplies rest positions. Its ordered modifier stack supplies behaviour:

- Ambient drift
- Group emphasis
- Living wave
- Living colour
- Bust yaw

Modifiers can be enabled, reordered, and parameterised. Each registered modifier declares safe ranges, units, cost, and reduced-motion behaviour.

Two clocks keep editing reproducible:

- `story`: derived from `storyWU`, deterministic when scrubbing backwards
- `ambient`: wall-clock motion during live playback
- `mixed`: authored state plus a bounded ambient layer

Disable **Live ambient** to freeze ambient movement while comparing frames.

## Text editing

### Add another travelling title

1. Select a spatial Section in the Sections lane.
2. Put the playhead where the new sentence should be most readable.
3. In the inspector choose **Add text cue at playhead**.
4. Select the new Text clip in the Text lane.
5. Edit the statement and its Enter, Hold, and Exit handles.

The saved Cue is in the same Section object as its timing. No second file or JavaScript array needs editing.

The DOM contains one semantic sentence per Cue. Visual depth, blur, and scale are presentation only.

### Edit editorial prose

Select an editorial Section, then edit its blocks under **Editorial content**. Paragraphs, highlights, details, clients, discipline lists, and normal lists stay native DOM content. They are not converted into hundreds of keyframes.

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

## Safeguards

Validation blocks Apply and Save for duplicate IDs, invalid extents, unsafe text, unknown adapters/Shapes/modifiers, broken numeric values, unsupported transitions, invalid buffers, or a missing final bust contract.

The last-known-good compiled plan continues to play while a draft is invalid. Runtime failure containment includes abortable Shape generation, cached valid buffers, resource disposal, theme-token updates outside the hot loop, WebGL context recovery, visibility pausing, procedural bust fallback, and accessible editorial content when WebGL is unavailable.

The protected reduced-motion profile removes continuous flight, depth/blur travel, ambient modifiers, and automatic bust rotation. It keeps stable text, settled World states, and manual keyboard/pointer bust rotation.

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

The browser audit verifies exact-WU sampling, constant cadence, editor/playback presence, text edit and undo, WebGL readiness in Chromium, and editor clearance above the persistent Button Bar at desktop and mobile sizes.
