# About V2 parametric Blender world

Open `about-v2-track-working.blend` in Blender 4.3 or newer. This file is the
authoritative source for the About V2 geometry, camera path, camera banking, stage
boundaries, palette roles and export semantics.

The scene is a six-stage, lens-free narrative world on one saved 17-point route. It
remains directly editable in Blender through a small set of labelled Geometry Nodes
controls. `scripts/about-v2-blender/refine-about-v2-stage-separation.py` records the
restoration from the verified pre-cinematic backup into a separate candidate.
The older full seven-stage builder is retired because it recreates the removed lens.

## Start here

1. Select `ABS_WORLD_CONTROLS`. Its **Camera Horizontal FOV** property drives the
   camera lens. The authored value is a constant **65 degrees**. **Camera Steadycam
   Look Ahead** controls how far ahead the camera aims; the exported website value is
   `17.73 m`.
2. Select `ABS_PARAMETRIC_RIDE_PATH`, enter Edit Mode, and move one of its 17 aligned
   Bezier anchors or handles when you want to reshape the ride.
3. Select the `GN_…` object for a stage, then open **Modifiers → Geometry Nodes** to
   change its labelled inputs.
4. Select `ABS_CAMERA_ROLL_DRIVER` and use the Graph Editor only when you want to
   change the restrained square-gate bank. `ABS_CAMERA_PATH_FOLLOWER` owns the
   camera position, while `ABS_CAMERA_LOOKAHEAD_FOLLOWER` and
   `ABS_CAMERA_LOOKAHEAD_TARGET` supply the general steadycam aim. The square passage
   uses `ABS_CAMERA_GATE_AIM`; **Camera Lead Gates** on the square controller sets its
   lead as a fraction of gate spacing. The child hierarchy is
   `ABS_CAMERA_PATH_FOLLOWER → ABS_CAMERA_ROLL_DRIVER → ABS_CAMERA`.
5. Do not key `ABS_CAMERA` transforms or lens. Do not add tilt to the ride-path points.
6. Save the `.blend`, export the website assets, and check desktop and mobile frames.

The Blender Text Editor also contains `ABOUT_PARAMETRIC_WORLD_README`.

## Camera contract

- `ABS_PARAMETRIC_RIDE_PATH` is the `1,313.977 m` authoritative rail.
- The editable source has 17 aligned Bezier anchors and a curve resolution of 128.
  Blender evaluates the smooth arc-length path without exposing hundreds of sampled
  points. The path uses `Z_UP`, and every anchor tilt is zero.
- `ABS_CAMERA_ROLL_DRIVER.abs_path_progress` reaches route progress `0.80` at the
  short gate exit, reaches the route endpoint at journey progress `0.91`, and holds
  that endpoint unchanged through frame `3600`.
- `ABS_CAMERA_PATH_FOLLOWER` follows the rail for position only. Outside the square
  passage it aims towards `ABS_CAMERA_LOOKAHEAD_TARGET` with the existing global
  look-ahead setting. That aim uses a neutral world-up reference.
- `ABS_CAMERA_GATE_AIM` follows the same rail one third of a gate spacing ahead
  (about `5.39 m` on the current rail). Its fixed world-X reference supplies camera
  right continuously through the aerial loop. The camera can climb through the
  vertical tangent without the former sudden world-up horizon turn. This is a live
  Follow Path and Track To rig, not a second rail or a baked rotation animation.
  `ABS_CAMERA_GATE_AIM_BLEND` blends in over timeline progress `0.60–0.632`, remains
  fully active through `0.81`, and restores the original aim by `0.842`.
- `ABS_CAMERA_LOOKAHEAD_TARGET` extends `10 m` beyond its follower. The extension keeps
  the final view stable after both followers reach the route endpoint. The original
  landscape aim is retained. The previous upward composition offset was removed
  because it pushed the foreground out of the mobile frame.
- `ABS_CAMERA_FINALE_AIM` is a fixed vanishing point `140 m` beyond the final camera
  position. `ABS_CAMERA_PATH_FOLLOWER` blends its viewing direction toward this point
  between timeline progress `0.80` and the retimed lattice entry at `0.833`. The
  descending camera therefore looks through both lattice banks, rather than pitching
  into the immediate rail tangent. This blend affects aim only, not position or roll.
- The roll driver is the zeroed child of the position follower, and the camera is the
  zeroed child of the roll driver. This keeps authored banking in the evaluated and
  exported camera matrix without allowing it to change the steadycam aim.
- `ABS_CAMERA_ROLL_DRIVER.abs_roll_degrees` has four restrained round-tunnel bank
  keys (`0`, `-8`, `8`, `0`) and five restrained square-gate keys (`0`, `-6`, `8`,
  `-4`, `0`). The square architecture still performs one complete twist, but the
  camera follows the loop continuously and returns to a level finale.
- `ABS_WORLD_CONTROLS.camera_horizontal_fov` drives the lens. It is 65 degrees at
  every frame; there is no lens animation.
- The path is invisible. No rails, sleepers or other bottom-track geometry are
  exported.
- Website coordinates map from Blender as `X, Z, -Y`.

To reshape the route, edit `ABS_PARAMETRIC_RIDE_PATH` in Edit Mode. Its
`abs_control_anchors` custom property maps each control-point index to a narrative
label. Keep the handles aligned and point tilt at zero. All path-bound geometry and
both aim targets follow this curve live. The website resamples the exported camera
by cumulative physical distance, so unequal source-frame speeds cannot change the
camera-distance-per-scroll ratio. Moving a gate range also requires checking its
aim-blend interval and every aperture; do not assume shared path ownership proves framing.

**Camera Steadycam Look Ahead** on `ABS_WORLD_CONTROLS` controls the general aim.
The square passage instead uses **Camera Lead Gates**. A distant aim can skip over
an approaching opening even when the camera position crosses its centre. Verify
both the physical crossing and the viewing direction after tuning either control.
Neither control changes the rail, the `65°` FOV, or the authored bank keys.

## Six editable stages

| Stage | Path range | Approx. length | Generator |
| --- | --- | ---: | --- |
| Quiet field and aperture | 0.000–0.095 | 125 m | `GN_SIGNAL_FIELD`, `GN_SIGNAL_APERTURE` |
| Irregular nebula | 0.075–0.165 | 118 m | `GN_NEBULA_FIELD` |
| Round portals | 0.180–0.280 | 131 m | `GN_ROUND_PORTALS` |
| Mountain terrain | 0.310–0.610 | 394 m | `GN_RIBBON_CANYON` |
| Short square-gate bank | 0.640–0.800 | 210 m | `GN_SQUARE_LOOP` |
| Split-lattice finale | 0.860–1.000 | 184 m rail section | `GN_RESPONSIVE_LATTICE` |

Physical gaps separate the chapters. Runtime visibility follows each structure's
physical camera cue, with bounded handoffs. The square bank starts `0.55 story WU`
before `gate-entry`, retaining its `0.18 WU` reveal interval. This lets the first
opening appear before the camera enters it; it does not change the geometry or
delay travel. The existing tall lattice remains through the closing invitation.

Text owns the page length and uses the full viewport, including in portrait.
Semantic text cues do not accelerate or slow the camera. Equal native scroll
distances produce equal physical camera travel through every passage and the
invitation. The camera stops wherever scrolling stops and reaches the unchanged
endpoint only at the native page end, with no separate settling or finale brake.

Do not substitute physical `ABS_STAGE_03` or `ABS_STAGE_05` markers for the semantic
`ABS_TERRAIN_THESIS` and `ABS_SPLIT_LATTICE_ENTRY` reading cues. The browser verifies
both export files against their metadata hashes and rejects an incompatible cue
bundle instead of giving missing or inverted windows an unlimited lifetime.

The camera export includes each evaluated square aperture's centre, axes, inner
size and depth. `npm run check:about-v2-assets` checks all three planes of all
14 openings, close-approach framing and complete quaternion change per physical
distance. `node scripts/audit-about-gate-passage.mjs` checks the rendered camera,
early visibility, reversal and stopped scrolling across desktop and phone sizes.
Set `ABS_BROWSER=webkit` for the second browser. After a source edit, save and reopen
the scene in a fresh process before export; newly added driver relations must be
evaluated from the saved file.

The terrain's narrative range still ends at `0.610`, but its final full geometry row
stops at `0.604`. The small trim keeps the wide landscape above `375 m` long while
leaving a measured physical gap before the first aerial square gate.

### Quiet field and nebula

The two field objects share `ABS_GN_NARRATIVE_POINT_FIELD`. Their useful controls are:

- **Start / End on Path**: longitudinal extent;
- **Particle Count**: active Blender dot bodies;
- **Field Radius** and **Corridor Radius**: breadth and camera clearance;
- **Vertical Scale**: flatten or stretch the field without changing its corridor;
- **Dot Radius**: preview-body size;
- **Cluster Strength** and **Erosion**: even field versus irregular islands;
- **Longitudinal Jitter**: breaks regular spacing along the rail.

`GN_SIGNAL_APERTURE` and `GN_ROUND_PORTALS` reuse the shared path repeater. Use
**Start / End on Path**, **Instance Count**, **Start / End Scale**, and the profile
variant collection. Each portal is one colour; the sequence cycles through all six
palette roles. The aperture and all 36 original round portals are centred on the camera rail.
Do not translate their complete objects away from the rail to protect copy: that
produces empty views and clipped edge fragments. Use their open centres, scale, and
bounded semantic visibility windows instead.

The website's normal fog end is `150 WU`. The old `70 WU` range hid most of the
wide point fields and landscape before they could enter the camera frame. Fog still
reveals whole dots; adjacent stages remain hidden by their own visibility windows.

### Mountain terrain

Select `GN_RIBBON_CANYON`. The default surface starts nearly flat, becomes hilly, and
then becomes mountainous. The camera stays low over the flat and hilly sections, then
climbs like an aircraft across the late mountain section and its empty transition into
the aerial square loop.

The first controls to change are:

- **Flat End**: how long the opening remains calm;
- **Hill Height** and **Hill Scale**: early relief and hill width;
- **Mountain Start**, **Mountain Height**, and **Mountain Scale**: onset, relief and
  detail of the mountainous exit;
- **Wall Lift**: raises the outer ribbons into a stronger valley;
- **Interaction**: cross-ribbon wave influence;
- **Terrain Seed**: reproducible terrain character;
- **Camera Clearance**: vertical distance between rail and floor;
- **Protected Corridor**: calm normalized half-width beneath the rail;
- **Centre Relief**: how much hill and mountain elevation remains under the camera;
- **Density Fade In / Out**: website-dot density at each end without narrowing the mesh;
- **Canyon Width**: total span of the one connected, six-palette terrain surface.

The Geometry Nodes tree writes `abs_density_weight` onto the evaluated surface. The
website exporter samples against that live attribute, so changing either density-fade
control changes the exported dots while the terrain footprint remains broad and free
of triangular or straight-cut corners.

### Square loop and camera bank

`GN_SQUARE_LOOP` controls the gate range, count, taper and architectural twist. Its 14
square gates each use one palette role and complete one full architectural turn. The
matching camera bank remains a separate sparse control, so the architecture can twist
while the reading horizon stays calm.

The visible gate chapter starts at route progress `0.64` and ends at `0.80`. The five
sparse bank keys sit at `0.64`, `0.68`, `0.72`, `0.76`, and `0.80`, resolving through
`0°`, `-6°`, `8°`, `-4°`, and `0°` before the empty connector into the split lattice.

Select `ABS_CAMERA_ROLL_DRIVER`, open the Graph Editor, and expand **Camera Roll**.
The final five keys control the square-gate camera bank: entry, left bank, right bank,
settle and level exit. Keep them at `0`, `-6`, `8`, `-4` and `0`. The gate instances
own the complete architectural twist. The first four keys control the small
round-tunnel corner bank. Translation remains controlled by only the two **Rail
Travel** keys before the final acceleration and stationary hold.

If you change the square-loop stage range, update its five sparse roll keys and
semantic transition markers together in Blender, save a candidate copy and export
it. The recorded recovery script is not a blanket modifier for a newly edited scene.

### Responsive lattice

`GN_RESPONSIVE_LATTICE` is the multicolour kinetic field. Use:

- **Lattice Width / Depth** and **Columns Across / Rows Deep** for its extent and
  density;
- **Corridor Width** for camera safety;
- **Strand Keep** for stable empty windows through the field;
- **Strand Thickness** and **Height Min / Max** for mass;
- **Wave Amplitude / Length / Speed** and **Response Delay** for motion;
- **Position Jitter** to loosen the grid.

Set **Wave Amplitude** to zero for a reduced-motion preview. The `50 m` central
corridor divides the original full-height lattice into two banks. The approximately
`167 × 230 m` field is anchored at route progress `0.99`, leaving a physical gap
after the gates. Original 41-column/58-row density, 15–90 m heights and 0.82 strand
retention are preserved; there is no widening far taper or flattened bank profile.
The camera enters the lattice after the gates and it remains through the method,
both closing titles and the invitation. A monotone terminal arrival in the website
journey reaches zero speed at the source camera lock (`0.91`). Ambient motion also
stops there. No finale halo or replacement object is added.

Every exported generator also has **Custom Properties → Website Circle Radius**
(`abs_surfel_radius_scale`). This controls the baked circle radius for that model on
the website without changing its Blender mesh. Save and re-export after changing it.

## Scene organisation and recovery

`ABS_NARRATIVE_WORLD` contains only the six live `ABOUT_STAGE_…` collections,
`ABS_NARRATIVE_GUIDES`, and their shared modules. Superseded scene objects and the
old `99_…` archive collections are removed. The exporter now refuses to run if they
return. The recoverable pre-rebuild file is:

`backups/about-v2-track-working.pre-parametric-narrative-20260823.blend`

The saved scene before the camera-framing repair is preserved separately:

`backups/about-v2-track-working.pre-camera-framing-20260830.blend`

The pre-contact-sheet-refinement backup is:

`backups/about-v2-track-working.pre-retime-cleanup-20260824.blend`

The exact pre-cinematic-refinement source is:

`backups/about-v2-track-working.pre-cinematic-implementation-20260829-135523.blend`

The exact source before the final cross-browser portal-clearance adjustment is:

`backups/about-v2-track-working.pre-webkit-clearance-20260829-2200.blend`

Create and validate a candidate before replacing the canonical source:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
  source-assets/about-v2-blender-current/backups/about-v2-track-working.pre-cinematic-implementation-20260829-135523.blend \
  --python scripts/about-v2-blender/refine-about-v2-stage-separation.py -- \
  --restore-scene-identity \
  --output-blend output/about-v2-stage-separated-candidate/about-v2-restored-review.blend
```

The obsolete `build-parametric-narrative-world.py` is deliberately fail-closed. Keep
normal design changes in the live modifier controls. The sparse-scene refinement
mode is also retired; the recovery flag requires the exact recorded backup hash.
Never run a blanket refinement against an edited canonical scene.

## Export to the website

From the repository root:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
  source-assets/about-v2-blender-current/about-v2-track-working.blend \
  --python scripts/about-v2-blender/export-edited-about-v2-point-world.py -- \
  --output-dir react-app/app/public/models/about-v2-edited-world --allow-canonical-output

node scripts/about-v2-blender/check-about-v2-edited-world.mjs
```

The exporter samples evaluated triangle surfaces, not Blender vertices. Generated
instances are realised before output, and every stage carries explicit object, model,
role, density, motion, reveal, component and palette semantics. The progressive packed
profiles are 30,000 mobile, 90,000 desktop and 135,000 master surfels.

The website resolves the six Blender palette roles through the current shared
simulation colour scheme. It uses the evaluated camera track and the 65-degree
horizontal projection, retains both sides of the authored surfaces, then adds runtime
fog, complete-circle reveal and coherent stage motion. The Blender file remains the
source of geometry and camera truth.

For a full visual sequence after export:

```bash
ABS_CONTACT_SHEET_PHASE=my-review \
ABS_CONTACT_SHEET_VIEWPORT=desktop \
ABS_CONTACT_SHEET_SEQUENCES=page \
npm exec -- node scripts/capture-about-narrative-contact-sheets.mjs
```
