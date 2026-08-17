# About V2 Blender handoff

This package is the previous About V2 Blender handoff. The current website source of truth is `source-assets/about-v2-blender-current/about-v2-track-working.blend`.

## Open the working scene

Open `about-v2-track-working.blend` directly, or use **File > Append** to bring its collections into another Blender file.

- `ABS_CAMERA` is the animated website camera.
- `ABS_CAMERA_PATH` is the camera-position guide curve.
- Frames `1–3600` play at `30 fps`, for a total duration of `120 seconds`.
- One website world unit is one Blender metre.
- Website coordinates map to Blender as `X, -Z, Y`.

Use the timeline markers to jump between the main narrative sections. Select `ABS_CAMERA`, switch the viewport to camera view, and play the timeline to test the ride.

The camera path is a non-rendering guide. It is not track geometry. The package intentionally contains no bottom rails, deck, sleepers, conduit, or ground supports.

## Collections

- `01_SIGNAL` — opening point and initial alignment.
- `02_HOOPS` — mixed-colour circular hoop corridor.
- `03_YARD` — curved spatial transition and structural moments.
- `04_LOOP` — long roll and camera-aligned rectangular gates.
- `05_IGNITION` — activation transition.
- `06_LIVING` — animated-system proxy geometry.
- `07_TERMINAL_BUST` — the terminal Napoleon point bust.
- `ABS_CAMERA_RIG` — animated camera.
- `ABS_GUIDES` — non-rendering camera-path guide.

The edited solids are sampled into the website's point system. Blender materials are deliberately ignored: balanced material groups resolve through the same live time-of-day palette as the Home simulation.

The `Plane` object is an ocean intent marker, not the shipped surface mesh. The website creates a camera-aware point ocean from that terminal direction, then animates it with layered directional waves and horizontal chop. It extends beyond the visible fog boundary and has no visible side or back edge.

## Exchange model

`about-v2-track-reference.glb`, `about-v2-scene-source.json`, and this folder's `.blend` are retained as historical reconstruction inputs. They do not contain Alexander's latest Blender edits.

When returning the cleaned model to the website, export only the intended environment meshes as a GLB. Keep the camera if its revised movement should also replace the website path. Do not apply destructive mesh joins until the narrative collections and material groups are approved, because those groups provide the clearest mapping back to the website stages.

## Export the edited scene to the website

From the repository root:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
  source-assets/about-v2-blender-current/about-v2-track-working.blend \
  --python scripts/about-v2-blender/export-edited-about-v2-point-world.py -- \
  --output-dir react-app/app/public/models/about-v2-edited-world

node scripts/about-v2-blender/check-about-v2-edited-world.mjs
```

Do not run `build-about-v2-blender-scene.py` over the edited working file. That script rebuilds the original procedural bootstrap and would replace the manual Blender edits.

The exporter centres the `06_LIVING` finale collection on the final website camera key and anchors the ocean beyond that same key. At runtime, the ocean shifts with the measured Story Stack endpoint, so shorter or longer copy still reveals it only during the closing beat. This keeps the manually edited Blender geometry authoritative while preventing an older Blender camera endpoint from moving the website finale. The website editor exposes ocean height, wave height, speed, chop, point size, and reveal delay. Geometry changes still belong in Blender; regenerate the point assets after each approved scene edit.

## Bust attribution

The terminal point bust derives from **The bust of Napoleon Bonaparte**, supplied by Virtual Museums of Małopolska / National Museum in Kraków, inventory MNK XII-A-810, under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). See `scripts/README-napoleon-asset.md` for the source record.
