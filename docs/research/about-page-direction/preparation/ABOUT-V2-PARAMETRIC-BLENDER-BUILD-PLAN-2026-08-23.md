# About V2 parametric Blender build plan

Date: 23 August 2026
Status: implementation blueprint for the authoritative About V2 `.blend`

This plan translates the
[`About V2 narrative world plan`](./ABOUT-V2-NARRATIVE-WORLD-PLAN-2026-08-23.md)
into an editable Blender system. Blender owns geometry, camera travel, camera roll,
stage boundaries and export semantics. The website remains a renderer of the evaluated
Blender result.

## Build principles

1. One authoritative ride path controls the camera, signal ring, round portals, ribbon
   canyon and square gates.
2. Each narrative stage has one obvious generator object. Select it and use the labelled
   Geometry Nodes panels; do not search through individual repeated meshes.
3. Adjacent stages use 2% rail gaps so generated geometry never collides; fog carries
   continuity through the breathing space.
4. All generated geometry is realised before output because the surfel exporter samples
   the evaluated mesh.
5. Each generated object carries explicit stage, palette, density, motion and reveal
   semantics. No runtime meaning is inferred from object order.
6. The scene keeps one hidden, non-exporting recovery collection for the pre-narrative
   geometry. The build does not delete the user's previous scene.

## Contact-sheet refinement: ten implemented improvements

The 29-frame desktop contact sheet was captured before and after the refinement with
identical story positions. It led to these ten changes:

1. Extend the opening and use fog to bridge its short spatial gap before the nebula.
2. Increase the opening population and aperture scale so the first threshold is legible.
3. Add **Vertical Scale**, more depth jitter and less erosion to turn the nebula from a
   flat knot into an irregular volume.
4. Increase round-portal count, scale, sampling priority and spacing so they read as a
   passage rather than one distant ring.
5. Replace six full-length canyon colour stripes with deterministic broad colour
   territories that change along and across the valley.
6. Increase canyon clearance and the calm centre while delaying the mountainous relief,
   keeping copy readable without making the landscape flat.
7. Increase square-gate scale, count and feature priority so the complete rotating loop
   survives every website quality tier.
8. Add **Strand Keep**, widen the lattice corridor and reduce strand mass so the kinetic
   field contains stable breathing windows.
9. Reduce lens ribs, extend lens depth and add **Radius Ripple / Ripple Count** so the
   donut crossing is clear without ending in a perfectly regular stack of circles.
10. Add per-object **Website Circle Radius** in Blender, retain both sides of exported
    surfaces, and use a 1.2 fog curve so complete coloured circles emerge without model
    segments disappearing.

Evidence is written to
`output/playwright/about-narrative-contact-sheets/parametric-audit-before` and
`output/playwright/about-narrative-contact-sheets/parametric-audit-after`.

## Master scale and camera

| Setting | Default | Authority | Notes |
| --- | ---: | --- | --- |
| Ride length | approximately 900 m | `ABS_PARAMETRIC_RIDE_PATH` | The current 373.7 m path is expanded around its first point without changing its overall route shape. |
| Frame range | 1–3600 | `ABS_CAMERA_ROLL_DRIVER` | Two linear travel keys remain sufficient. |
| Horizontal FOV | **65°** | `ABS_WORLD_CONTROLS.Camera Horizontal FOV` | One driver sets the camera lens. There is no lens animation. |
| Path horizon | Z-Up | `ABS_PARAMETRIC_RIDE_PATH` | Prevents unintended accumulated bank and a tilted ending. |
| Authored roll | one turn plus corner bank | `ABS_CAMERA_ROLL_DRIVER.Camera Roll` | Three round-tunnel bank keys lead into five square-gate roll keys. A value of 360° is visually level at the exit. |

The narrower 65° field of view makes proximity more dramatic and reveals less geometry
at once. Every stage therefore needs a wider mobile-safe camera corridor than the current
85° build.

## Stage ranges

The ranges are normalized positions on the shared ride path. Each chapter has a 0.020
gap before the next one so generated tunnels do not intersect adjacent scenes.

| Stage | Path range | Approximate length | Generator |
| --- | --- | ---: | --- |
| 00 Quiet field | 0.000–0.090 | 79 m | `GN_SIGNAL_FIELD` and `GN_SIGNAL_APERTURE` |
| 01 Nebula | 0.110–0.205 | 83 m | `GN_NEBULA_FIELD` |
| 02 Round portals | 0.225–0.355 | 114 m | `GN_ROUND_PORTALS` |
| 03 Ribbon canyon | 0.375–0.615 | 210 m | `GN_RIBBON_CANYON` |
| 04 Square loop | 0.635–0.775 | 122 m | `GN_SQUARE_LOOP` |
| 05 Responsive lattice | 0.795–0.905 | 96 m | `GN_RESPONSIVE_LATTICE` |
| 06 Lens | 0.925–1.000 | 66 m to the chamber centre | `GN_LENS_CHAMBER` |

## Blender organisation

```text
ABS_NARRATIVE_WORLD
├── ABOUT_STAGE_00_SEED
│   ├── GN_SIGNAL_FIELD
│   └── GN_SIGNAL_APERTURE
├── ABOUT_STAGE_01_NEBULA
│   └── GN_NEBULA_FIELD
├── ABOUT_STAGE_02_ROUND_PORTALS
│   └── GN_ROUND_PORTALS
├── ABOUT_STAGE_03_RIBBON_CANYON
│   └── GN_RIBBON_CANYON
├── ABOUT_STAGE_04_SQUARE_LOOP
│   └── GN_SQUARE_LOOP
├── ABOUT_STAGE_05_RESPONSIVE_LATTICE
│   └── GN_RESPONSIVE_LATTICE
├── ABOUT_STAGE_06_LENS
│   └── GN_LENS_CHAMBER
├── ABS_NARRATIVE_GUIDES
│   ├── ABS_WORLD_CONTROLS
│   └── ABS_STAGE_ANCHOR_00 … ABS_STAGE_ANCHOR_06
└── 99_PRE_NARRATIVE_WORLD_BACKUP
```

`ABS_WORLD_CONTROLS` is the first object to select. It owns the global FOV and points
to the in-file documentation. Stage-specific geometry stays on the corresponding
generator modifier so the relationship between a control and its result remains clear.

## Stage 00 — quiet field and aperture

`GN_SIGNAL_FIELD` creates a low-density volume around the opening camera section.
`GN_SIGNAL_APERTURE` uses the shared path repeater with one circular profile.

| Control | Default | Useful range | Effect |
| --- | ---: | ---: | --- |
| Start / End | 0.000 / 0.090 | within its stage gap | Section of the rail populated by the quiet field. |
| Particle Count | 420 | 120–900 | Number of low-poly dot bodies before surfel sampling. |
| Field Radius | 30 m | 14–50 m | Overall opening breadth. |
| Clear Corridor | 6.5 m | 5–12 m | Protected reading and camera space. |
| Vertical Scale | 0.82 | 0.4–1.6 | Flattens or stretches the field without changing the rail corridor. |
| Dot Radius | 0.34 m | 0.15–0.60 m | Blender preview body size; website surfel size remains separately tunable. |
| Aperture Scale | 0.90 | 0.35–1.30 | Size of the initial dotted ring. |
| Aperture Start / End | 0.082 / 0.084 | 0.050–0.110 | Where the camera enters the ring. Keep the values close together for one aperture. |

The field already contains all six palette roles. The aperture is a protected feature
with a higher anchor priority so its outline survives every export profile.

## Stage 01 — irregular nebula

`GN_NEBULA_FIELD` uses the same low-poly dot source but increases count, depth and
clustering. It leaves an off-axis protected passage towards the first round portal.

| Control | Default | Useful range | Effect |
| --- | ---: | ---: | --- |
| Start / End | 0.110 / 0.205 | within its stage gap | Longitudinal reach on the shared rail. |
| Particle Count | 1500 | 500–2200 | Visual density before surfel sampling. |
| Field Radius | 52 m | 24–75 m | Maximum cross-section. |
| Corridor Radius | 7 m | 5–14 m | Empty camera passage. |
| Vertical Scale | 1.25 | 0.5–2 | Turns the halo into a deeper, less planar volume. |
| Cluster Strength | 0.52 | 0–1 | Moves an even field into uneven islands. |
| Erosion | 0.20 | 0–0.75 | Removes points from low-noise regions and creates pockets. |
| Longitudinal Jitter | 14 m | 0–20 m | Softens regular spacing along the rail. |

The signal field and nebula are separated by a short rail gap. Their dots use the same
six palette roles and motion group family, while fog bridges the gap without allowing
their generated geometry to collide.

## Stage 02 — round portals

`GN_ROUND_PORTALS` reuses `ABS_GN_PATH_REPEATER` and the existing low-poly hoop module.

| Control | Default | Useful range | Effect |
| --- | ---: | ---: | --- |
| Start / End | 0.225 / 0.355 | within its stage gap | Fits the corridor between the nebula and canyon. |
| Portal Count | 36 | 18–48 | Controls rhythm and spacing. |
| Start Scale | 0.78 | 0.35–1.4 | First threshold size. |
| End Scale | 1.18 | 0.6–1.8 | Opens the corridor before it becomes ribbon surfaces. |

Each portal is one colour. Material variants cycle through the six discipline roles;
individual hoops are never internally confetti-coloured.

## Stage 03 — ribbon canyon

`GN_RIBBON_CANYON` starts from six normalized grid strips. Geometry Nodes expands the
strips to the requested width and length, grows terrain displacement along the route,
raises the outer ribbons and preserves the six material roles.

| Control | Default | Useful range | Effect |
| --- | ---: | ---: | --- |
| Start / End | 0.375 / 0.615 | within its stage gap | Section of the ride path used by the canyon. |
| Canyon Width | 84 m | 40–130 m | Total span of all six interacting ribbons. |
| Camera Clearance | 13.5 m | 3–30 m | Drops the floor below the rail so the camera flies over it. |
| Protected Corridor | 0.18 | 0.01–0.55 | Normalized half-width kept calm directly below the camera. |
| Flat End | 0.36 | 0–0.50 | Fraction of the canyon that remains exactly flat. |
| Hill Height | 7.5 m | 0–16 m | Early broad undulation. |
| Hill Scale | 1.15 | 0.2–8 | Normalized frequency of the broad hills. Lower values make wider forms. |
| Mountain Start | 0.72 | 0.20–0.95 | Where larger terrain begins to dominate. |
| Mountain Height | 22 m | 0–40 m | Late-stage relief. |
| Mountain Scale | 3.7 | 0.5–12 | Normalized mountain detail frequency. Lower values make wider forms. |
| Wall Lift | 16 m | 0–35 m | Raises outer ribbons to create a navigable valley. |
| Interaction | 0.40 | 0–1 | How strongly neighbouring ribbons cross and affect each other's silhouette. |
| Terrain Seed | 3117 | 0–99999 | Reproducible terrain character. |

This directly provides the requested flat-to-hilly-to-mountainous progression. `Flat
End`, `Mountain Start`, `Hill Height` and `Mountain Height` are the four controls to use
first. `Camera Clearance` and `Protected Corridor` make the safety relationship
explicit without cutting a visibly cylindrical hole through the scene.

## Stage 04 — square loop

`GN_SQUARE_LOOP` reuses the shared path repeater and six existing square material
variants.

| Control | Default | Useful range | Effect |
| --- | ---: | ---: | --- |
| Start / End | 0.635 / 0.775 | within its stage gap | Fits the loop between canyon and lattice. |
| Gate Count | 30 | 16–40 | Length and rhythm. |
| Start / End Scale | 1.15 / 0.90 | 0.4–1.6 | Maintains close but safe passes at 65° FOV. |
| Total Gate Twist | 360° | 90–720° | Rotation of the frames across the section. |
| Camera Roll Influence | 1 | 0–1 | Scales the camera's matching authored roll. |

The camera has five roll keys across this interval: 0°, 90°, 180°, 270° and 360°.
Translation still uses only the two rail-travel keys. The camera is visually level after
the section because 360° is equivalent to 0° without creating a reverse unwind.

## Stage 05 — responsive lattice

`GN_RESPONSIVE_LATTICE` extends the current forest method into a long multicolour field.
It generates a grid, removes a safe corridor, instances one low-poly strand source,
realises the result and assigns six palette roles by stable strand index.

| Control | Default | Useful range | Effect |
| --- | ---: | ---: | --- |
| Lattice Width | 100 m | 50–160 m | Side-to-side extent. |
| Lattice Depth | 88 m | 40–180 m | Keeps the lattice inside its separated chapter. |
| Columns Across | 27 | 15–55 | Cross-route density. |
| Rows Deep | 38 | 20–80 | Longitudinal density. |
| Corridor Width | 18 m | 7–30 m | Safe camera gap at 65° FOV. |
| Strand Keep | 0.68 | 0.35–1 | Opens stable breathing windows without shortening the chapter. |
| Strand Thickness | 0.52 m | 0.25–1.8 m | Visual mass. |
| Height Min / Max | 9 / 32 m | 4–60 m | Base height range. |
| Wave Amplitude | 8 m | 0–20 m | Vertical kinetic energy. |
| Wave Length | 42 m | 12–100 m | Distance between motion crests. |
| Wave Speed | 0.26 | 0–1 | Blender preview animation speed. |
| Response Delay | 0.14 | 0–0.8 | Delay between neighbouring strands. |
| Position Jitter | 2.6 m | 0–4 m | Breaks the visible grid without invading the corridor. |

Reduced-motion preview sets `Wave Amplitude` to zero while preserving colour and
composition.

## Stage 06 — lens chamber

`GN_LENS_CHAMBER` generates a sequence of coloured elliptical ribs around the final
camera position. Radius grows towards the centre, creating a hollow chamber rather than
another tunnel the camera exits.

| Control | Default | Useful range | Effect |
| --- | ---: | ---: | --- |
| Chamber Depth | 120 m | 70–180 m | Extent behind and beyond the final camera. |
| Rib Count | 20 | 12–40 | Surface density and rhythm. |
| Centre Radius | 34 m | 22–65 m | Size of the final clearing. |
| End Radius | 24 m | 12–32 m | Minimum aperture that keeps the finale CTA clear. |
| Vertical Aspect | 0.82 | 0.45–1.2 | Makes the volume lens-shaped rather than spherical. |
| Rib Thickness | 0.42 m | 0.2–1.4 m | Strength of the final outline. |
| Twist | 72° | 0–180° | Coordinates the six colour currents. |
| Radius Ripple / Count | 0.18 / 4 | 0–0.35 / 1–6 | Forms restrained concentric ripples while preserving the button clearing. |
| Pulse | 0.04 | 0–0.25 | Restrained breathing motion in Blender preview. |

The path ends at the chamber centre. The camera does not leave it. This is the test that
separates an arrival from one more portal.

## How to modify the scene

1. Open `source-assets/about-v2-blender-current/about-v2-track-working.blend`.
2. Select `ABS_WORLD_CONTROLS` first. Set **Camera Horizontal FOV** only if the intended
   contract changes; the requested default is 65°.
3. Select the stage generator whose name begins `GN_`.
4. Open **Modifiers → Geometry Nodes**. The field uses **Path and Population / Field
   Form**; the canyon uses **Path and Footprint / Terrain Progression**; the lattice
   uses **Footprint and Density / Strand Form / Preview Motion**; and the lens uses
   **Lens Form / Motion**.
5. Change one high-level control at a time. Start with length/width, then form, then
   density, then motion.
6. Use timeline markers `ABS_STAGE_00` through `ABS_STAGE_06` to jump the camera to the
   relevant chapter.
7. Edit `ABS_CAMERA_ROLL_DRIVER → Camera Roll` in the Graph Editor for authored roll.
   Do not key `ABS_CAMERA` transforms or lens.
8. Save the `.blend`, export the surfel world, and inspect desktop and mobile browser
   frames. A Blender viewport change is not yet a website change.

The Blender Text Editor contains `ABOUT_PARAMETRIC_WORLD_README` with the same short
instructions and a list of the seven generators.

## Validation gates

1. The evaluated ride path is at least 850 metres long.
2. `ABS_CAMERA` reports a constant 65° horizontal field of view at the first, middle and
   final frame.
3. Only two rail-travel keys and eight intentional roll keys exist on the camera rig:
   three for the round-tunnel bank and five for the square-tunnel revolution.
4. The signal aperture, round portals and square gates are centred on the evaluated path.
5. The canyon is almost flat at entry, visibly hilly by its middle and mountainous near
   its exit when using the defaults.
6. The lattice is multicolour at every tested frame and its corridor stays clear.
7. The final camera is level and located inside the lens chamber.
8. Every active stage generator evaluates to non-empty mesh geometry and carries the
   complete export semantic contract.
9. The focused Blender exporter check and About narrative tests pass before the browser
   asset is treated as current.
