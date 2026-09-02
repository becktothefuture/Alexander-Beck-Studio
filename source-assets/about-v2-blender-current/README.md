# About V2 cinematic point world

`about-v2-track-working.blend` is the canonical source for the About page geometry,
camera, semantic visibility, palette roles and export metadata. Open it in Blender
4.3 or newer.

The accepted source SHA-256 is
`4ae8204542c4fe4dcb195dacef4f787f5204567aa76ea4b96f9be8d1cbf10253`.
The generated web bundle must record this tracked file and hash in `meta.json`.

## Scene overview

The source exports 191 objects across seven semantic models:

| Model | Physical span | Composition |
| --- | ---: | --- |
| `about.00` | 0–55 WU | Deep irregular opening field with calm copy volume |
| `about.01` | 55–111 WU | Triangles, squares, diamonds, pyramids, spheres and cubes |
| `about.02` | 111–226 WU | 28 round hoops on the curved camera path |
| `about.03` | 226–297 WU | Continuous flight floor and mountain range, with clients nested at 234–262 WU |
| `about.04` | 282–409 WU | 16 rounded-square gates |
| `about.05` | 408–478 WU | Method ground, fog and atmospheric depth |
| `about.06` | 478–503 WU | Shaping, thinking and a boundless terminal horizon |

Semantic visibility is resolved from the website journey map:

- `about.00`: `opening` to `inciting-question + 0.60 WU`;
- `about.01`: `inciting-question - 0.60 WU` to `portal-entry + 0.60 WU`;
- `about.02`: `portal-entry - 0.60 WU` to `portal-exit + 0.60 WU`;
- `about.03`: `portal-exit - 0.60 WU` to `gate-entry + 0.75 WU`;
- `about.04`: `gate-entry - 0.75 WU` to `gate-exit + 0.80 WU`;
- `about.05`: `gate-exit - 1.10 WU` to `split-lattice-entry - 0.45 WU`;
- `about.06`: `split-lattice-entry - 1.65 WU` to `terminal-hold + 1.00 WU`.

The runtime derives complementary entrance and exit handoffs from adjacent overlaps.
Inactive models have zero instance count, so passed gates no longer remain in the GPU
draw workload or reappear in the ending.

## Camera contract

- `ABS_CAMERA` uses a fixed 85 degree horizontal FOV.
- Frames 1–430 follow the equal-distance C2-continuous S-curve. Frames 431–901
  preserve the accepted late rail and constant cumulative arclength. The full moving
  track is 503.1467 WU, with a maximum step delta of 0.000015 WU.
- Frames 901–1001 are the stationary terminal hold.
- The camera and all 28 round hoops share the same curvature controls.
- The late rail is straight before the square gates. The camera crosses all 16 gate
  aperture planes in order and stays inside every opening.
- Maximum angular rate is 0.6904 degrees per WU and maximum measured roll is
  0.000004 degrees.
- Website coordinates map Blender `(x, y, z)` to site `(x, z, -y)`.

`ABS_PARAMETRIC_RIDE_PATH` documents the accepted path. The exported camera is the
baked authority. Use the camera curvature controls described below so the camera and
round hoops remain aligned.

## Live authoring controls

Select `ABS_AUTHORING_CONTROLS` in Blender. It exposes 31 live controls grouped by
scene purpose:

- opening width, depth, density and surfel size;
- shape-field width and depth plus body scale;
- camera lateral and vertical curvature with all 28 hoops;
- round-hoop radius and surfel size;
- floor and mountain width and relief;
- logo-atmosphere density and surfel size;
- square-gate density and surfel size;
- Method width, depth, height and density;
- finale width, depth, height and density.

The final refinement adds opening asymmetry, shape-path progression, floor/mountain
depth and density, Method bank spread and finale-surface overscan controls. They are
stored as `opening_asymmetry_scale`, `shape_path_progression`,
`floor_mountain_depth_scale`, `floor_mountain_density_scale`, `method_bank_spread`
and `finale_surface_overscan`.

The controls are non-destructive drivers. Their default value is `1.0` and reproduces
the accepted evaluated geometry and every camera matrix. The Blender Text Editor
contains `ABS_AUTHORING_GUIDE` with the same workflow and safe ranges.

Density controls change allocation weights inside the fixed profile budgets. They do
not regenerate topology or increase the total surfel count. Shape counts and gate
counts remain fixed; edit their individual Blender objects only when a topology
change is explicitly intended.

After any non-default edit, repeat desktop and mobile copy-clearance, viewport,
continuity, motion, gate and performance audits. A working Blender file alone does
not prove browser composition.

## Scene organisation

`ABS_AUTHORING_STAGES` contains named collections for the seven runtime stages and
their substages. `ABS_AUTHORING_RIGS` contains the live control rigs. The earlier
`ABS_B27_CONTROLS_ARCHIVE` object is inert and retained only for forensic context.
Eligible export meshes identify `ABS_AUTHORING_CONTROLS` as their parameter owner.

Historical third-party donor objects remain hidden and non-exporting inside the
source file for provenance. They are listed in `THIRD-PARTY-MODELS.md`. None of those
donor objects enters the current 191-object public point-world export.

## Point budgets

| Model | Mobile | Desktop | Master |
| --- | ---: | ---: | ---: |
| `about.00` | 2,000 | 5,000 | 7,500 |
| `about.01` | 2,000 | 5,000 | 7,500 |
| `about.02` | 2,000 | 6,000 | 9,000 |
| `about.03` | 10,000 | 30,000 | 45,000 |
| `about.04` | 3,000 | 8,000 | 12,000 |
| `about.05` | 5,000 | 16,000 | 24,000 |
| `about.06` | 6,000 | 20,000 | 30,000 |
| **Total** | **30,000** | **90,000** | **135,000** |

Mobile and desktop are deterministic nested prefixes of the master asset. The packed
surfel record remains 32 bytes. The exporter samples evaluated polygon surfaces and
honours object transforms, material palette roles, density weights, minimum profiles,
surfel scale, semantic visibility and the evaluated camera.

## Export and validation

Run from the repository root:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
  source-assets/about-v2-blender-current/about-v2-track-working.blend \
  --python scripts/about-v2-blender/export-edited-about-v2-point-world.py -- \
  --output-dir react-app/app/public/models/about-v2-edited-world \
  --allow-canonical-output

npm run check:about-v2-assets
npm run check:about-narrative
```

Then run the browser evidence gates:

```bash
npm run audit:about-recovery-viewport
npm run audit:about-particle-continuity
npm run audit:about-recovery-motion
npm run audit:about-recovery-logos
```

The asset checker rejects a stale source hash, wrong profile budget, missing semantic
binding, unresolved cue, changed FOV, irregular camera cadence, terminal drift,
incomplete round tunnel, incomplete square-gate passage or bounded finale.

The reusable control installer and mutation checker are:

- `scripts/about-v2-blender/install-about-v2-authoring-controls.py`
- `scripts/about-v2-blender/check-about-v2-authoring-controls.py`

The installer is idempotent, but the canonical file already contains the accepted
rig. Use it only when repairing a copy or validating a new source candidate.
