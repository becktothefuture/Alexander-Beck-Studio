# About V2 live-scene mutation checklist

- Status: superseded pre-mutation handoff; implementation completed 2026-08-29
- Source: `source-assets/about-v2-blender-current/about-v2-track-working.blend`
- Blender: 4.3 or newer
- Rule: do not run the current scene builder against the canonical source

This checklist records the brief used for the completed lens-free split-lattice
mutation. Its unchecked items are historical planning state, not active instructions.
The current operational source is
`source-assets/about-v2-blender-current/README.md`; the retired seven-stage builder
must not be run. No commit, publication, or deployment was part of this mutation.

## Completion record

- Canonical source hash: `1a57df93e0eaaec20c28e268583d7d043f8039e92af70d441dc16dd6fc156ebe`.
- Route: 17 points, `1313.977173 WU`, one non-cyclic spline, `65°` horizontal FOV.
- World: six models across seven export objects; no lens object or collection.
- Gate: route progress `0.64–0.80`, 32 gates, one architectural turn with a restrained
  `0° / -6° / 8° / -4° / 0°` camera bank that exits level.
- Finale: one split lattice with a `180 WU` central reading nave; it clears before
  the invitation.
- Camera: locks at journey progress `0.91` and remains byte-stable through frame 3600.
- Export: 30,000 mobile, 90,000 desktop, 135,000 master surfels; zero semantic
  fallbacks; source/export hash parity passed.
- Browser proof: Chromium and WebKit keep at most one active model and zero surfel
  centres inside protected copy across desktop, mobile and reduced motion.

## 0. Recovery and authority

- [ ] Confirm the open file is the canonical saved source and that no other Blender
  instance owns an unsaved version.
- [ ] Record the current source hash. The observed 2026-08-29 baseline is
  `cac7cc413abd481b582c3df5e1c566cb68569b7bd8eb1a778a5aea734f335b8f`.
- [ ] Use Blender **Save Copy** to create a dated
  `about-v2-track-working.pre-cinematic-finale-YYYYMMDD-HHMMSS.blend` backup.
- [ ] Keep the canonical file open after Save Copy; do not change its working path.
- [ ] Confirm `ABS_PARAMETRIC_RIDE_PATH`, `ABS_CAMERA`,
  `ABS_CAMERA_PATH_FOLLOWER`, `ABS_CAMERA_ROLL_DRIVER`,
  `ABS_CAMERA_LOOKAHEAD_FOLLOWER`, and `ABS_CAMERA_LOOKAHEAD_TARGET` exist.

## 1. Reconcile the real 17-point route

- [ ] Read and record every spline point's coordinate, left/right handle, handle type
  and tilt before changing geometry.
- [ ] Confirm the route has exactly 17 control points and one non-cyclic Bezier spline.
- [ ] Confirm every point tilt is zero and the curve uses `Z_UP`.
- [ ] Measure evaluated curve length from the saved scene; the observed baseline is
  approximately `1313.977 WU`.
- [ ] Replace stale 29-point values in `abs_control_anchors`,
  `abs_progress_contract`, `abs_edit_workflow`, and embedded
  `ABOUT_PARAMETRIC_WORLD_README` content with values derived from the final route.
- [ ] Keep horizontal FOV at exactly `65 degrees`.
- [ ] Treat the currently saved `17.73 m` look-ahead as the tuning baseline. Record the
  final value rather than restoring the older `55 m` value automatically.

## 2. Shorten the gate chapter

- [ ] On `GN_SQUARE_LOOP` → `ABS_PARAMETRIC_EFFECT`, set the path range to start
  within `0.63–0.65` and end within `0.79–0.81`; begin review at `0.64–0.80`.
- [ ] Set **Instance Count** to `32` for the first review. The allowed range is `30–32`.
- [ ] Set **Roll per Shape** to `360 / (count - 1)`. For 32 gates this is
  `11.612903 degrees`.
- [ ] Mirror the resolved count, range, scales and twist on
  `ABS_SQUARE_ROLLERCOASTER_CONTROLS` and `GN_SQUARE_LOOP` custom properties.
- [ ] Move the five square-roll keys to the resolved entry, quarter, half,
  three-quarter and exit progress values. For `0.64–0.80`, review frames are
  approximately `2304`, `2448`, `2592`, `2736`, and `2880` at 30 fps over frames
  1–3600.
- [ ] Keep roll values `0`, `90`, `180`, `270`, and `360` degrees.
- [ ] Confirm wrapped roll error at exit is at most `0.25 degrees` and no roll changes
  after gate exit.
- [ ] Leave `0.015–0.03` normalized route progress clear between the final gate and
  the first lattice strand.

## 3. Make the existing lattice the finale

- [ ] Extend `GN_RESPONSIVE_LATTICE` through the final route section; do not duplicate
  it or create another finale object.
- [ ] Begin tuning within these envelopes:
  - corridor width `22–30 WU`;
  - columns `26–34`;
  - rows `34–46`;
  - strand keep `0.55–0.72`;
  - strand thickness `0.18–0.24`;
  - arrival wave amplitude `2–4 WU`, resolving to `0` at camera lock.
- [ ] Open the lattice into two asymmetrical peripheral banks while preserving one
  unobstructed central reading nave.
- [ ] Check the same camera pose at desktop and portrait aspect ratios before accepting
  the bank width. Both banks must remain visible.
- [ ] Update lattice stage range, anchor, semantics, density, component count and
  motion-subgroup properties from the final evaluated object.

## 4. Remove the lens ending

- [ ] Remove the object `GN_LENS_CHAMBER`.
- [ ] Remove the guide `ABS_LENS_PATH_ANCHOR`.
- [ ] Remove the collection `ABOUT_STAGE_06_LENS` after confirming it contains no
  unrelated data.
- [ ] Remove unused `GN_LENS_CHAMBER_ANCHOR_MESH` and `ABS_GN_LENS_CHAMBER`
  datablocks only after checking their user counts.
- [ ] Remove `about.06` lens export semantics. Do not retain a hidden or zero-area
  dummy export object.
- [ ] A stage-six timeline marker may remain as a camera-only inspection cue. Replace
  `ABS_STAGE_06_LENS_CENTRE` with a neutral terminal cue if retained.

## 5. Author the real terminal hold

- [ ] Add timeline marker `ABS_CAMERA_LOCK` at normalized progress `0.90–0.93`.
- [ ] Make `ABS_CAMERA_ROLL_DRIVER.abs_path_progress` reach `1.0` at the lock frame and
  remain `1.0` through frame `3600`.
- [ ] Preserve linear forward travel before the lock and a constant segment after it.
- [ ] Keep the roll at its level `360-degree` equivalent through the stationary tail.
- [ ] Confirm the look-ahead target and its extension produce a stable final tangent.
- [ ] Compare every exported camera sample from lock to end:
  - position drift at most `0.0001 WU`;
  - quaternion angular drift at most `0.01 degrees`;
  - FOV drift `0`;
  - roll drift `0`.
- [ ] Leave the final `8–12%` of the 3,600-sample track stationary.

## 6. Saved-scene readback

- [ ] Save only after the gate, lattice, lens-removal and lock values have been read
  back from Blender.
- [ ] Reopen the saved file and repeat the route count, object topology, gate controls,
  roll keys, lock marker, camera tail, FOV and look-ahead checks.
- [ ] Confirm the scene is not dirty after the final save.
- [ ] Record the new source hash.

## 7. Reapply the narrow refinement on a candidate copy

The old `build-parametric-narrative-world.py` remains only as fail-closed recovery
archaeology. It intentionally throws before mutation because its implementation would
restore the removed seven-stage lens world. Reapply the current contract only through
the narrow refinement script and validate a candidate before canonical promotion:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
  source-assets/about-v2-blender-current/about-v2-track-working.blend \
  --python scripts/about-v2-blender/refine-about-v2-stage-separation.py -- \
  --output-blend output/about-v2-stage-separated-candidate/about-v2-stage-separated.blend \
  --overwrite-output
```

- Validate the candidate export with
  `check-about-v2-edited-world.mjs --asset-dir <candidate-assets>`.
- Promote only after route hash/count/length, stage ranges, topology, gate values,
  roll keys, visibility cues, and the stationary camera hold all match the contract.

## 8. Candidate export and validation

- [ ] Export the saved canonical source to a candidate asset directory:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
  source-assets/about-v2-blender-current/about-v2-track-working.blend \
  --python scripts/about-v2-blender/export-edited-about-v2-point-world.py -- \
  --candidate-output-dir output/about-v2-cinematic-candidate/assets

node scripts/about-v2-blender/check-about-v2-edited-world.mjs \
  --asset-dir output/about-v2-cinematic-candidate/assets
```

- [ ] Confirm 30,000 mobile, 90,000 desktop and 135,000 master surfels.
- [ ] Inspect per-object allocations after lens removal; fixed totals must not
  over-densify an unrelated stage.
- [ ] Promote `meta.json`, `camera-track.json` and `surfels.bin` together only after
  structural, visual, responsive and performance approval.

## Stop conditions

Stop without saving or promoting if any of these occur:

- the open file has unsaved edits from another owner;
- route point count changes accidentally;
- inherited tilt or roll remains after gate exit;
- lens data is still exported;
- the lattice duplicates rather than replaces the finale;
- any post-lock camera sample moves;
- the source hash in candidate metadata differs from the saved source;
- desktop or mobile loses either lattice bank or the central reading nave.
