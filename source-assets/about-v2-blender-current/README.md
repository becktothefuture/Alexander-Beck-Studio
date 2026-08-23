# About V2 current Blender editing scene

Open `about-v2-track-working.blend` in Blender 4.3 or newer.

This manually edited `.blend` is the source of truth for the About V2 website world. It began as a non-destructive reconstruction of Alexander's previous scene; later edits in this file now own the shipped environment geometry.

## Camera

- `ABS_CAMERA` is the source of the resolved desktop website ride.
- `ABS_CAMERA_PATH` is a non-rendering 721-point editing guide.
- `ABS_PARAMETRIC_RIDE_PATH` is the authoritative curve used by the camera and both repeating effects.
- The ride path uses Blender's `Z-Up` twist method. This keeps its neutral horizon level instead of accumulating bank through the route and tilting the final camera.
- `ABS_CAMERA_ROLL_DRIVER.abs_path_progress` is the single animated `0-1` travel value. Two linear keys drive the camera's Follow Path offset from frame `1` to `3600`.
- `ABS_CAMERA_ROLL_DRIVER.abs_roll_degrees` has three Bezier keys: level at the first square gate, `32` degrees at the last square gate, and level again before the forest.
- `ABS_CAMERA` has no keyed location, quaternion, or lens channels. The rail owns position and pitch/yaw; the separate roll controller adds local Z rotation.
- The camera path is intentionally invisible. No rails, sleepers, floor line, or other bottom-track geometry appears beneath it at any point in the journey.
- Frames `1-3600` run at `30 fps`, giving a two-minute ride.
- The camera travels 373.734 metres and keeps a constant 85-degree horizontal field of view.
- The website converts that horizontal field of view for each viewport aspect ratio, so compact windows keep the same Blender framing instead of leaving the path. Very narrow portrait views cap the vertical field of view at 115 degrees, balancing authored horizontal composition with readable model scale.
- Website coordinates map to Blender as `X, -Z, Y`.
- Timeline markers jump to the eight story sections and the sparse roll-control points.

## Finale

The previous ocean/end field and the later valley landscape are removed.
`GN_PARAMETRIC_FOREST` widens the final column field around the camera corridor,
then ends near Blender Y=322.3. The camera continues from that edge into an
18-metre track-free clearing. Beyond it, `07_FINALE_WORKBENCH` forms a recognisable point-cloud
workshop around the centred closing text: a monumental trestle table, a pulled-back
stool, an open laptop on the left side of the tabletop, a compact framed landscape
in the upper-left negative space, and an oversized articulated task lamp whose shade
points down and left toward the work surface. The workbench fog reveal begins only
after the camera has cleared the forest.

## Scene collections

- `01_SIGNAL` - reserved for the future Blender-authored first moment; the previous floor arrow has been removed.
- `02_HOOPS` - mixed-colour circular hoop corridor; its nearest opening hoop has been removed so the replacement first moment has room before the circles begin.
- `03_YARD` - authored geometric transition.
- `04_LOOP` - long roll and camera-aligned rectangular gates.
- `05_IGNITION` - activation transition.
- `06_LIVING` - final retained authored structures and the parametric column forest.
- `07_FINALE_WORKBENCH` - the table, stool, open laptop, framed picture, and downward-facing task lamp.
- `99_REMOVED_BOTTOM_TRACK_BACKUP` - hidden, non-rendering, non-exporting recovery geometry for the removed rails and buffers.
- `ABS_CAMERA_RIG` - animated camera.
- `ABS_GUIDES` - non-rendering path and camera-roll controls.

### Floating model replacements

The five temporary floating cubes have been replaced with imported models in
`ABS_FLOATING_MODELS`:

- `FLOATING_CRT_MONITOR` replaces `Cube`.
- `FLOATING_CURSOR_3D` replaces `Cube.001`.
- `FLOATING_MOBILE_PHONE` replaces `Cube.002`.
- `FLOATING_MOUSE_WITH_CABLE` replaces `Cube.003`.
- `FLOATING_PENCIL` replaces `Cube.004`.

Move, rotate, or scale these five root empties rather than their nested mesh objects.
Each model was centred on its previous cube and scaled to roughly match that cube's
world-space envelope. The original cubes remain in the hidden
`99_FLOATING_CUBE_BACKUP` collection with website export disabled.

`IMPORTED_FLOATING_MODEL_CREDITS` in Blender's Text Editor records the supplied source
details. All five models are licensed under CC BY 4.0. Four imports include separate
Sketchfab licence files; `generic_mobile_phone.glb` records its author, source URL, and
CC BY 4.0 licence in the glTF `asset.extras` metadata. The durable attribution record is
[`THIRD-PARTY-MODELS.md`](./THIRD-PARTY-MODELS.md), and the website repeats it in the
finale. The imported texture images are packed into the `.blend` so the editing file
remains self-contained. The website point-cloud export uses the evaluated mesh geometry
rather than these textures.

### Parametric path effects

The opening hoops and square-gate loop are active Geometry Nodes generators rather
than fixed repeated topology:

- `GN_HOOP_TUNNEL` in `02_HOOPS`
- `GN_GATE_TUNNEL` in `04_LOOP`

Select either object and use its Geometry Nodes modifier inputs. `Start on Path (0-1)`
and `End on Path (0-1)` choose the part of the route using the same normalized progress
as the camera. `Instance Count` controls the distribution. `Start Scale` and `End Scale`
create a smooth taper. The opening circles currently taper from `1.0` to `0.35`.

`GN_GATE_TUNNEL` also exposes `Start Roll (degrees)` and `Roll per Shape (degrees)`.
The sequence is deterministic; the unused random-roll branch has been removed. The
current `4` degrees per shape across `17` squares produces `64` degrees of total roll.
Both wrappers use `ABS_GN_PATH_REPEATER`. Its four labelled frames explain path
trimming, distribution and taper, roll, and export.

`ABS_PARAMETRIC_RIDE_PATH` is the authoritative 721-point travel path. Its `Z-Up`
twist method provides a stable neutral horizon. `ABS_CAMERA`
follows it with `ABS_FOLLOW_RIDE_PATH`. The hidden `ABS_CAMERA_ROLL_DRIVER` owns two
linear travel keys and drives the Follow Path offset. `ABS_SQUARE_TUNNEL_ROLL` copies
the controller's local Z rotation after the path has supplied pitch and yaw. Run
`scripts/about-v2-blender/simplify-about-v2-camera-rig.py` after changing the square
tunnel's path range, count, or roll values. It rebuilds only three roll keys from those
modifier inputs. Set `GN_GATE_TUNNEL.abs_camera_roll_influence` between `0` and `1`
when you want to reduce the added roll.

`00_PARAMETRIC_MODULES` holds the reusable hoop profile and six gate material variants.
The hoop proxy has `96` vertices and each square proxy has `16`; they are deliberately
simple because the website converts the evaluated result into point-cloud geometry.
The previous fixed hoop and square-gate topology has been removed after evaluated
geometry verification. Do not remove the final `Realize Instances` node: the website
exporter samples evaluated mesh geometry. The historical
`parameterize-path-tunnels.py` migration is guarded and must not be rerun on this file.

Open Blender's Text Editor and select `PARAMETRIC_PATH_EFFECTS_README` for the same
control guide inside the `.blend` file.

There is no bust, deck, conduit, ground-support, rail, sleeper, floor line, or other
bottom-track geometry in the exported reconstruction. The removed rail and buffer
meshes remain only as recovery objects inside `99_REMOVED_BOTTOM_TRACK_BACKUP`; that
collection is hidden in the viewport and render and is explicitly excluded from the
website exporter. Do not restore it without a new explicit direction.

## Export to the website

From the repository root:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
  source-assets/about-v2-blender-current/about-v2-track-working.blend \
  --python scripts/about-v2-blender/export-edited-about-v2-point-world.py -- \
  --output-dir react-app/app/public/models/about-v2-edited-world

node scripts/about-v2-blender/check-about-v2-edited-world.mjs
```

Every exported mesh carries stable Blender semantics: object and model IDs, role,
density group, motion group, reveal group, component policy, and material palette
role. Multi-mesh props such as the mouse, cursor, and workplace therefore remain one
recognisable model without inferring meaning from mesh islands or traversal order.

The exporter samples evaluated triangle surfaces with one world-space density rule.
Its progressive Poisson-style sequence avoids the old vertex clustering while small
semantic materials and meaningful connected components retain exact anchor samples.
There is no general per-object quota: authored models, paths, and workplace surfaces
share one area-proportional density unless a feature needs an anchor to stay present.
The forest is an environmental field rather than a recognition model, so it uses a
separate lower density weight and cannot consume nearly the whole fixed profile. The
packed `surfels.bin`
contains stable position, normal, radius, seed, model, part, palette, motion, and
feature data. The current profiles are 20,000 mobile, 60,000 desktop, and 90,000
master surfels. The runtime scales each Blender object's nested profile radius by that
object's own square root master-to-profile count ratio. This keeps physical surface
coverage consistent at every quality tier without letting a large model sibling or
the forest overfill small props. Protected connected-component anchors keep meaningful
bezels, cables, controls, and other authored sub-parts present in every profile.

The scene can own the three export budgets through its Custom Properties:
`abs_surfel_mobile_budget`, `abs_surfel_desktop_budget`, and
`abs_surfel_master_budget`. The command-line flags remain optional overrides. Keep
`abs_point_density` at `1` for equal world-space density; use
`abs_feature_priority` only for a deliberate recognition boost on thin or important
objects. `abs_preserve_min_px` marks an object as non-droppable at adaptive runtime
detail levels.

Timeline markers are exported as sparse `journeyCues` in `camera-track.json`. Use
them for named beats such as the gate-tunnel roll and the final level horizon. The
website still reads the evaluated camera samples for smooth travel; the editable
Blender rig remains the camera source of truth.

The website renders the selected profile in two ordered passes that share one geometry
and one set of GPU buffers. The opaque circle interior owns depth; only the antialiased
rim uses multisample coverage. There is no triangle proxy to slice billboards into
crescents, and faint fragments cannot punch holes through later circles. Distance fog
uses each packed surfel seed to reveal complete coloured circles as a progressively
denser population. A short scale ramp supplies the arrival motion without shrinking
coloured bodies into pale sub-pixel coverage. Living motion translates the complete
authored scene coherently instead of oscillating individual points through one another.
Packed Blender normals cull rear-facing surface samples by default, so dense props read
as authored shells instead of transparent volumes; the `/` panel can reveal those back
surfaces when a more cloud-like look is wanted.

Palette roles resolve through the shared simulation palette. Do not introduce a
separate scene-specific colour override.

The exporter writes `surfels.bin`, `meta.json`, and `camera-track.json`. The website
samples the Blender camera track and horizontal projection directly, including the
square-gate tunnel, so a camera or roll edit returns to the development renderer on
export. The export preserves the manually edited `.blend`; do not run the procedural
scene builder when returning an edited scene to the website.

## Camera roll

Select `ABS_CAMERA_ROLL_DRIVER`, then edit **Camera Roll (degrees)** in the Graph
Editor. The whole camera rig has five authored key points: two for rail travel and
three for roll. Timeline markers identify the gate entrance, last gate, and horizon
return. The default roll profile is 0° at the first gate, 32° at the last gate, and
0° before the forest. Constant extrapolation keeps the camera level before and after
those three points, so endpoint roll keys are unnecessary. The property drives the
Empty's local Z rotation; `ABS_CAMERA` copies that rotation after following
`ABS_PARAMETRIC_RIDE_PATH`. Do not key `ABS_CAMERA` transforms directly and do not
change the path's twist method back to `Minimum`; that mode accumulates bank through
the non-planar route and leaves the final horizon tilted.

The website exporter still evaluates the resolved rig on every frame and writes those
samples to `camera-track.json`. That dense file is a runtime playback cache, not an
editable Blender action. The simplification script deliberately does not save the
open `.blend`; review the ride first, then save the Blender file manually when the
rest of the open scene is ready to be preserved.

## Historical reconstruction

The procedural bootstrap, its ocean-era JSON export, and its checker were removed
from the active workflow because they could overwrite the manually edited scene.
The original reconstruction artifacts remain read-only in the sibling
`source-assets/about-v2-blender/` archive. Use only the export workflow above to
return Blender edits to the website.
