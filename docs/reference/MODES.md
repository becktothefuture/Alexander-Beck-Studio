# Mode Specifications

Source of truth for mode IDs and narrative order:
- `react-app/app/src/legacy/modules/core/constants.js`
- `react-app/app/src/legacy/modules/modes/mode-controller.js`
- `react-app/app/src/data/simulationCatalog.json`

---

## Runtime Summary

- Public simulation IDs and narrative ordering are defined by the mode constants and catalog together.
- `18` modes are in the narrative cycle (`NARRATIVE_MODE_SEQUENCE`).
- The circular Daily Simulation switcher and live selection are derived from the catalog `daily-rotation` stage; the current catalog contains `13` Daily simulations.
- Daily Simulation selection uses the catalog `daily-rotation` stage as an eligibility pool. Each full page reload randomly selects an entry other than the last visible simulation, so the simulation always changes instead of following a calendar rotation.
- `flock-of-birds` and `repel-room` are route-backed daily entries: they appear in the narrative sequence and open dedicated renderers instead of the legacy ball-physics mode runner.
- `rift-rings` is archived. Its direct lab route remains available, but it is not part of Daily Simulation or the narrative sequence.
- `aperture-bloom` remains a route-backed collection/narrative entry, but it is not part of the live daily selection.
- `elastic-center`, `napoleon-point-cloud`, and `beach-ball-room` are collection entries with `includeInNarrative: false`; they are not in the Daily Simulation switcher or live narrative cycle.

## Lab-Only Route Candidates

These pages are review surfaces, not registered narrative modes. Do not add them to Daily Simulation or Extended rotation without explicit approval and a full promotion pass.

- Confluence Bridges — `confluence-bridges`, `/lab/confluence-bridges.html`, concept-lab registry entry with `enabledInRotation: false`; weighted circle discipline hubs build and stretch circle bridges under pointer movement and drag.
- Impression — `napoleon-point-cloud`, `/lab/napoleon-point-cloud.html`, collection lab route; flat circle point-cloud reading of a classical bust face.
- Spatial Scan — `spatial-scan`, `/lab/spatial-scan.html`, concept-lab registry entry with `enabledInRotation: false`; scan-derived point-cloud route with a baked Blender camera path and flat site-circle rendering.

---

## Registered Mode IDs

| Mode | ID | Runtime status |
| --- | --- | --- |
| Foundation | `pit` | Active |
| Attention | `flies` | Active |
| Weightless Drift | `weightless` | Active |
| Flow | `water` | Active |
| Magnetic | `magnetic` | Active daily |
| Refraction | `kaleidoscope-3` | Active |
| Multiplicity | `kaleidoscope-rift` | Active |
| Depth | `rift-rings` | Archived lab route |
| Critter Swarm | `critters` | Active |
| Continuity | `3d-sphere` | Active |
| Scaffold | `3d-cube` | Active |
| Perspective | `starfield-3d` | Active |
| Elastic Loom | `elastic-center` | Collection only |
| Convergence | `flock-of-birds` | Route-backed daily/lab |
| Tension | `repel-room` | Route-backed daily/lab (`wall-repel` remains a legacy URL/config alias) |
| Aperture Bloom | `aperture-bloom` | Route-backed collection/lab |
| Cohesion | `flubber-blob` | Active |
| Pressure Field | `pressure-crucible` | Active |
| Fountain A | `particle-fountain` | Active |
| Cadence | `particle-fountain-b` | Active daily |
| Impression | `napoleon-point-cloud` | Route-backed collection/lab |
| Beach Ball Room | `beach-ball-room` | Route-backed collection/lab |

---

## Narrative Sequence (Arrow Keys)

### Featured Tier (shown first)

1. `pit` — FOUNDATION
2. `flies` — ATTENTION
3. `3d-cube` — SCAFFOLD
4. `water` — FLOW
5. `repel-room` — TENSION
6. `3d-sphere` — CONTINUITY
7. `flock-of-birds` — CONVERGENCE
8. `flubber-blob` — COHESION
9. `kaleidoscope-3` — REFRACTION
10. `magnetic` — MAGNETIC
11. `starfield-3d` — PERSPECTIVE
12. `kaleidoscope-rift` — MULTIPLICITY
13. `particle-fountain-b` — CADENCE

### Daily simulation sound map

Sound follows a visible physical event and stays silent during idle animation. `pit`, `water`, and `magnetic` use collision sound; `flies` uses only meaningful wall impact; `repel-room` uses pressure; `3d-sphere` maps user spin and its short inertial coast to Scroll Crystal; `flubber-blob` uses aggregated soft-body impact; and `particle-fountain-b` keeps its phrase cues. `3d-cube`, `flock-of-birds`, `kaleidoscope-3`, `starfield-3d`, and `kaleidoscope-rift` are silent.

### Extended Tier (shown after Featured)

14. `aperture-bloom` — APERTURE BLOOM
15. `weightless` — WEIGHTLESS DRIFT
16. `critters` — CRITTER SWARM
17. `pressure-crucible` — PRESSURE FIELD
18. `particle-fountain` — FOUNTAIN A

Loop order is `Featured -> Extended -> Featured`.

---

## Keyboard & Pointer Shortcuts

| Key/Action | Function |
| --- | --- |
| `/` | Toggle Settings panel dock |
| `R` | Reset current simulation |
| `←` | Previous simulation in narrative sequence |
| `→` | Next simulation in narrative sequence |
| Right-click | Previous simulation (same as `←`) |

## Pointer And Title Depth Rules

- Shared pointer input is mouse, trackpad, pen, and touch aware. The first valid input sample inside the canvas must seed mode-local smoothing or velocity state immediately; modes must not ease from offscreen, center, or idle-anchor state.
- Depth-plane title layering is active for `3d-sphere` and `3d-cube`. Both split particles around the fixed title plane at normalized z `0.5`, with some circles behind the title and others in front.
- The visible home title/subtitle are canvas-rendered from the semantic `#hero-title` source. No-depth modes draw the title before the normal ball pass, preserving the old title-behind-simulation relationship. Do not change the title's CSS x/y position to solve scene alignment; align the simulation/depth scene to the existing title center instead.

---

## Behavior Snapshot (Runnable Modes)

- `pit`: gravity + collisions + cursor repeller.
- `flies`: swarm attractor behavior with lightweight motion.
- `weightless`: zero-gravity bounce with cursor blast-style interaction.
- `water`: dense drag/ripple motion field.
- `magnetic`: attraction/repel dynamics with velocity limiting.
- `kaleidoscope-3`: mirrored wedge render with center-pointer fill, edge-pointer opening, and a short pointer-motion mapping impulse. Gesture distance is normalized to the viewport so desktop mouse movement and mobile touch drag produce the same shear, pan, and depth response; mobile keeps fewer source bodies while retaining a dense mirrored wedge read.
- `kaleidoscope-rift`: three phase families form a breathing polar lattice with deliberate gaps; pointer/touch movement shears rings and opens a radial rift while the families counter-rotate.
- `rift-rings`: route-backed Depth field with tighter in-frame concentric bands, one shared production body radius, whole-ring counter-rotation, stronger pointer/touch radial travel, and center-depth fog.
- `critters`: locomotion-based critter behavior and local separation.
- `3d-sphere`: dense breathing spherical point cloud with rotating depth layers and trackball response.
- `3d-cube`: Scaffold’s breathing, rotating, and pointer-tumbled 3D cube point cloud, with a face lattice, perspective scaling, and depth fog.
- `starfield-3d`: denser depth-projected field with larger far-depth circles, recycle, pointer/touch camera pan, and shared distance fog.
- `elastic-center`: Collection-only Elastic Loom; a palette-bead lattice with invisible spring links, single-pointer drag, release waves, subtle hover pressure, and normal wall containment.
- `flock-of-birds`: route-backed distant flock with weighted center-biased motion, no wall collisions, mouse avoidance, and a safe sky band above the ground.
- `repel-room`: route-backed Tension with heavy palette balls launched through a bounded room, strong room-edge repulsion, mobile-bounded DPR/count, and mouse repulsion without visible cursor rings. Legacy `wall-repel` links resolve to this canonical mode.
- `aperture-bloom`: route-backed radial circle aperture with symmetric ring spacing, pointer-opened breathing gaps, normal round circles, and the central brand/link area reserved.
- `napoleon-point-cloud`: route-backed Impression surface-sampled classical bust-face point cloud with the title layered through the dot field, 5k point amount, 14% density, 23.4 dot size, 0.72x mouse rotation, and auto rotation on.
- `beach-ball-room`: Collection-only route-backed Beach Ball Room circle-built beach ball with room-scale wall physics, softened room-line treatment, calmer rebound, and controls hidden unless `controls=1`.
- `flubber-blob`: two independent soft silicone-gel bodies built from fixed-size hard-circle beads. Each body has its own persistent gel links; the bodies collide with one another, rebound from the studio walls, and can be dragged separately without visible detach/reattach behavior.
- `pressure-crucible`: Extended-tier experiment. Custom-rendered polarity field with small palette-colored bead samples arranged as a filled swarm cloud. Cursor proximity and speed define a live dipole that bends, splits, and wakes the particles; idle motion stays subtle through local swarm drift rather than a ring orbit.
- `particle-fountain`: centred continuous emitter that aims toward the pointer within a 30-degree left/right sweep.
- `particle-fountain-b`: three widely spaced park-fountain nozzles alternate slower solos, crossing arches, travelling beats, and intentional rests.

---

## Related Docs

- [`SIMULATION-DESIGN-GUIDELINES.md`](./SIMULATION-DESIGN-GUIDELINES.md) — Design, material, avoid-list, and promotion gate for new simulations
- [`CONFIGURATION.md`](./CONFIGURATION.md) — Runtime config keys and ranges
- [`../development/DEV-WORKFLOW.md`](../development/DEV-WORKFLOW.md) — Dev/build workflow
