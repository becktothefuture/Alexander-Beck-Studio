# About V2 current Blender editing scene

Open `about-v2-track-working.blend` in Blender 4.3 or newer.

This manually edited `.blend` is the source of truth for the About V2 website world. It began as a non-destructive reconstruction of Alexander's previous scene; later edits in this file now own the shipped environment geometry.

## Camera

- `ABS_CAMERA` contains the current resolved desktop website ride.
- `ABS_CAMERA_PATH` is a non-rendering 721-point editing guide.
- Frames `1-3600` run at `30 fps`, giving a two-minute ride.
- The camera travels 373.734 metres and keeps a constant 85-degree field of view.
- Website coordinates map to Blender as `X, -Z, Y`.
- The five existing timeline markers jump to the major story sections.

## Ocean

- `07_OCEAN/ABS_OCEAN_SURFACE` is an editable 97 x 129 mesh.
- The surface begins at website Z `-401`, ends at `-721`, and widens from 36 to 320 metres.
- All six material slots use the current Home simulation colour tokens.
- `ABS_OCEAN_SWELL`, `ABS_OCEAN_CROSS_WAVE`, and `ABS_OCEAN_HORIZONTAL_CHOP` are lightweight live modifiers.
- The three `ABS_OCEAN_FLOW_*` empties control wave direction over the timeline.
- `ABS_EMAIL_CLICK_RIPPLE` represents the website's large contact-click wave. It is disabled by default; enable its viewport/render toggles to preview it.
- Ocean custom properties retain the website fog, splash, height, speed, amplitude, and chop values for reference.

The website renders the ocean as animated coloured points emerging from fog. The Blender mesh is the editable spatial and motion reference, not a pixel-identical WebGL material.

## Scene collections

- `01_SIGNAL` - opening point and alignment.
- `02_HOOPS` - mixed-colour circular hoop corridor.
- `03_YARD` - authored geometric transition.
- `04_LOOP` - long roll and camera-aligned rectangular gates.
- `05_IGNITION` - activation transition.
- `06_LIVING` - final authored structures before the ocean.
- `07_OCEAN` - terminal animated water field.
- `ABS_CAMERA_RIG` - animated camera.
- `ABS_GUIDES` - non-rendering camera path and ocean controls.

There is no bust, floor track, deck, rail, sleeper, conduit, or ground-support geometry in this reconstruction.

## Export to the website

From the repository root:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
  source-assets/about-v2-blender-current/about-v2-track-working.blend \
  --python scripts/about-v2-blender/export-edited-about-v2-point-world.py -- \
  --output-dir react-app/app/public/models/about-v2-edited-world

node scripts/about-v2-blender/check-about-v2-edited-world.mjs
```

The exporter samples the authored meshes into balanced six-colour point assets. It preserves the manually edited `.blend`; do not run the procedural scene builder when returning an edited scene to the website.

## Historical reconstruction

`about-v2-scene-source.json` and `build-about-v2-blender-scene.py` created the first reconstruction in this folder. Do not run that builder over the manually edited working file. It would replace the current authored geometry. Use the export workflow above to return Blender edits to the website.
