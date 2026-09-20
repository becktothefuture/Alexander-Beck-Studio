# About surface world

`about-surface-world.blend` is the editable surface master. It contains ordinary
meshes, a live camera rail and supported ambient motion. Browser code generates
the circles. There are no authored ball centres, ball instances, circle-preview
node groups, density controls or radius controls in this file.

The previous `about-rollercoaster-reset` source is retained unchanged for recovery.
Do not run the builder over this master to make routine edits.

## Open and edit

Open with **Auto Run Python Scripts** enabled for the camera and motion drivers.
The file opens in solid material colours, looking through `FlightCamera` at the
start. **Space** plays or stops the camera journey. Scrub the bottom timeline to
inspect a particular view; named `About:` markers identify the chapters.
**Numpad 0** toggles camera view; orbit to inspect the whole arrangement.
An overall perspective render is supplied with the source proof.

| Item | Edit |
| --- | --- |
| `FlightRail` | Edit 23 smooth Bézier controls. This single path drives the camera, surface bends, gates and final wall. |
| `FlightCamera` | Keep the H70 lens and live constraint. The browser uses the same saved camera with a portrait vertical cap. |
| `A · …`, `B · …` | Simple hollow walls, round hoops and square/diamond frames. Static surfaces use the shared `Follow FlightRail` binding; moving gates use fixed path anchors. |
| `Opening · floor lane …` | Four adjacent simple floor strips below a straight, level camera. Keep the opening free of walls and gates. |
| `Canopy · … ribbon`, `Method · … ribbon` | Paired upright panels beside the camera route. Keep the central passage clear for prose. |
| `… floor release` | Simple strips following the camera route below the lens. They rise into the title/travel sections and create open floor passages. |
| Rotating controller empties | `amplitude` (radians), `period` (seconds), and `phase` (radians) control the shared ambient equation. Keep their quaternion drivers. Transform the child mesh to change its shape. |
| `Final wall` | One complete four-corner quad attached to the path endpoint. Its subdivision and wave modifiers are preview-only; the exporter reads its base quad and current world orientation. |
| `About World Controls` | Custom Properties: journey progress, ambient clock, reference playback and duration. Circle size, density and visibility belong to the browser. |

### Change the journey

Select **FlightRail**, press **Tab**, and move a control with **G**. Adjust its
handles to shape the bend; keep handle type **Aligned** for a smooth join.
Use **Ctrl+T** to change the bank. Keep the final two controls and their handles
in a straight line for a straight arrival. Press **Tab** to return to Object
Mode, then **Space** to preview the flight.

Keep the spline's **Tilt Interpolation** at **Linear**. This makes Blender's
camera constraint and surface binding use the same bank. The Bézier handles
still make the path smooth; the exporter checks this bank setting.

Surfaces follow the path immediately, without exporting or running a rebuild.
Their positions use a percentage of the whole path, so lengthening a bend keeps
the scenery attached to its section of the journey. The browser receives the
changed path and surfaces after saving and exporting.

Static surface meshes are stored in unrolled coordinates: X is the journey
position from 0 to 360, Y is the side offset and Z is the height. Their shared
modifier bends them into place. Keep that modifier and the binding transforms;
edit the rail to reshape the route. Moving gates retain their own local shape
and ambient rotation. Review the complete camera flight after major edits:
crossing or tightly folded path sections can still make scenery overlap.

### Floor opening and steady flight

The camera travels straight and level for the first 15% of the journey. Four
adjacent floor lanes sit 4.2 WU below it, from before the start to the first tunnel.
A short ramp meets the tunnel floor.
The first non-floor objects sit at the tunnel threshold. The shared distance
corridor reveals them as the camera approaches; there are no visibility switches.

The 23 aligned controls describe two broad sweeps, a gentle descent and rise,
and a straight final approach. The current rail has zero tilt for a stable
horizon. Keep the first three controls and their handles collinear and level;
keep the final two collinear. The camera follows the native rail tangent, so
Blender previews the same orientation that the browser receives.

The source now allocates 23.7 baseline viewport lengths. The retained 1.75 title
scale makes this 28.5 before measured copy adds any required reading space.
Travel-only gaps and excess prose budgets are shorter; title holds are unchanged.
The browser adds a critically damped scroll glide (95% response in about 600 ms).
Slow frames keep this easing rather than snapping the camera to the target.

### Assign colours through materials

Select a mesh and assign exactly one material in its material slot. All faces use
that slot. Both **Data-linked** and **Object-linked** material assignments export.

- `About · Palette role 1` through `6` map to current site palette slots 0–5.
- `About · All colours` has `about_palette_role=6`. Its magenta solid-preview
  colour is an authoring marker. The browser distributes the six site roles;
  magenta is not a seventh website colour. Both Canopy ribbons around the
  disciplines section use this All colours material.
- Reassign the actual material. There is no duplicated per-object palette field.

The browser owns circle spacing and uses 50% of Home's shared ball size, matched at an
8-world-unit reference plane with perspective scaling. The About panel's four
visibility controls fade both ends of one camera-depth corridor. All surfaces,
including the final wall, share these settings; there are no Blender fog controls.
Visibility saves to `design-system.json` and does not change this source or density.

### Preview motion

The saved scene starts in timeline mode at frame 1. Press **Space** with the
pointer over the viewport or timeline. Frames **1–5401** cover the 180-second
reference journey at 30 fps, including the final hold. Both camera travel and
the supported moving objects use this clock. Browser scroll controls progress;
the reference duration is a convenient preview, not a forced reading speed.

With `referenceMode=0`, `progress` selects the camera pose and `ambientSeconds`
selects the moving-world phase. Progress 0.97–1 holds the final pose. With
`referenceMode=1`, the 30 fps timeline advances both clocks over
`referenceSeconds`; first set progress and ambient seconds to zero.

Solid Blender colours show the editable surfaces. The browser adds the actual
camera-facing gradient circles, density and the shared near/far visibility
corridor. The final wall uses exactly the same visibility rule as the tunnels
and galleries. Visibility does not depend on chapter or animation time.

The exporter checks the actual rotating controllers at several nonzero times.
Missing drivers, added actions and altered-rate equations fail export. The final
wall's simple evaluated wave follows the same equation as browser circles.

## Save and export

From the repository root, after saving the master:

```sh
/Applications/Blender.app/Contents/MacOS/Blender \
  --background --factory-startup --enable-autoexec --python-exit-code 1 \
  --python scripts/about-rollercoaster/export-surfaces.py -- \
  --source source-assets/about-surface-world/about-surface-world.blend \
  --output react-app/app/public/models/about-rollercoaster-world \
  --report output/about-surfaces-20260919/source/export-report.json
```

The saved source exports `geometry.json`, `camera.json` and `meta.json`. The
publisher validates the complete v2 bundle and saved source hash before replacing
the destination, with the manifest last. This updates development assets; it
does not deploy the website.

For an isolated review, use an output directory below `output/`. The same
publisher validates it. `--staging-only` is reserved for isolated proof copies
whose source path is not the canonical master; it cannot write a public bundle.

### Export limits

- Each object needs one material with integer `about_palette_role` 0–6.
- Meshes need real faces and no loose point vertices. Nonplanar or concave quads
  export as triangles. Planar convex quads stay quads.
- Retain the shared `Follow FlightRail` modifier on bound static surfaces.
  The exporter reads its evaluated geometry. Apply other modelling modifiers
  before export. The final wall's preview subdivision and wave are excluded
  from its base-surface export.
- Keep path carriers at unit scale with their fixed Follow Path constraint.
  Moving surfaces retain their local geometry and supported rotation drivers.
- The final wall follows the endpoint carrier. Keep its transform rigid;
  nonuniform scale cannot preserve the shared single-wavelength equation.
  Its four base vertices remain editable, with a complete rectangle and
  the All colours material.
- Direct mesh animation, shape keys and undeclared animated parents are rejected.

## Evidence

`output/about-surfaces-20260919/source/` contains the saved/reopened source report,
actual solid-camera stills, overall perspective, isolated v2 bundle and authoring
proofs. The material proof saves a separate copy with an **Object-linked** material
override, reopens and exports it, and confirms that only that object's palette
role changes. That proof predates the Bézier path conversion.

`output/about-bezier-binding-20260919/` contains the conversion recovery file,
48-control fit measurements, native path-frame checks and binding/export audits.

Browser reading clearance, generated density, responsive views and final
presentation are reviewed separately from these solid authoring views.
