# Mode Specifications

Source of truth for mode IDs and narrative order:
- `react-app/app/src/legacy/modules/core/constants.js`
- `react-app/app/src/legacy/modules/modes/mode-controller.js`
- `react-app/app/src/data/simulationCatalog.json`

---

## Runtime Summary

- `26` mode IDs are registered in `MODES`, including the portfolio route's `portfolio-pit`.
- `23` modes are in the narrative cycle (`NARRATIVE_MODE_SEQUENCE`).
- The Daily Simulation chooser and live daily selection are derived from the catalog `daily-rotation` stage; the current catalog contains `16` Daily simulations.
- Daily Simulation selection uses the catalog `daily-rotation` stage, anchored by `dailyRotation.anchorDate` / `dailyRotation.anchorSimulationId` in `react-app/app/src/data/simulationCatalog.json`. Current anchor: `2026-06-27` resolves to `pit`.
- `flock-of-birds`, `wall-repel`, `mineral-growth`, `napoleon-point-cloud`, and `rift-rings` are route-backed daily entries: they appear in the narrative sequence and open dedicated renderers instead of the legacy ball-physics mode runner.
- `aperture-bloom` remains a route-backed collection/narrative entry, but it is not part of the live daily selection.
- `elastic-center` and `beach-ball-room` are collection entries with `includeInNarrative: false`; they are not in the Daily Simulation chooser or live narrative cycle.

## Lab-Only Route Candidates

These pages are review surfaces, not registered narrative modes. Do not add them to Daily Simulation or Extended rotation without explicit approval and a full promotion pass.

- Confluence Bridges — `confluence-bridges`, `/lab/confluence-bridges.html`, concept-lab registry entry with `enabledInRotation: false`; weighted circle discipline hubs build and stretch circle bridges under pointer movement and drag.
- Spatial Scan — `spatial-scan`, `/lab/spatial-scan.html`, concept-lab registry entry with `enabledInRotation: false`; scan-derived point-cloud route with a baked Blender camera path and flat site-circle rendering.

---

## Registered Mode IDs

| Mode | ID | Runtime status |
| --- | --- | --- |
| Ball Field | `pit` | Active |
| Portfolio Pit | `portfolio-pit` | Portfolio route only |
| Light Swarm | `flies` | Active |
| Weightless Drift | `weightless` | Active |
| Water Flow | `water` | Active |
| Magnetic Field | `magnetic` | Active |
| Bubble Lift | `bubbles` | Active |
| Kaleido Bloom | `kaleidoscope-3` | Active |
| Kaleido Rift | `kaleidoscope-rift` | Active |
| Depth Rings | `rift-rings` | Route-backed daily/lab |
| Critter Swarm | `critters` | Active |
| Parallax Drift | `parallax-float` | Active |
| Sphere Orbit | `3d-sphere` | Active |
| Cube Frame | `3d-cube` | Active |
| Star Field | `starfield-3d` | Active |
| Elastic Loom | `elastic-center` | Collection only |
| Flock Drift | `flock-of-birds` | Route-backed daily/lab |
| Repel Room | `wall-repel` | Route-backed daily/lab |
| Aperture Bloom | `aperture-bloom` | Route-backed collection/lab |
| Mineral Bloom | `mineral-growth` | Route-backed daily/lab |
| Soft Blob | `flubber-blob` | Active |
| Weave Field | `weave-field` | Active |
| Pressure Field | `pressure-crucible` | Active |
| Particle Fountain | `particle-fountain` | Active |
| Bust Cloud | `napoleon-point-cloud` | Route-backed daily/lab |
| Beach Ball Room | `beach-ball-room` | Route-backed collection/lab |

---

## Narrative Sequence (Arrow Keys)

### Featured Tier (shown first)

1. `pit` — BALL FIELD
2. `flies` — LIGHT SWARM
3. `3d-cube` — CUBE FRAME
4. `water` — WATER FLOW
5. `wall-repel` — REPEL ROOM
6. `3d-sphere` — SPHERE ORBIT
7. `napoleon-point-cloud` — BUST CLOUD
8. `flock-of-birds` — FLOCK DRIFT
9. `flubber-blob` — SOFT BLOB
10. `weave-field` — WEAVE FIELD
11. `mineral-growth` — MINERAL BLOOM
12. `kaleidoscope-3` — KALEIDO BLOOM
13. `bubbles` — BUBBLE LIFT
14. `starfield-3d` — STAR FIELD
15. `kaleidoscope-rift` — KALEIDO RIFT
16. `rift-rings` — DEPTH RINGS

### Extended Tier (shown after Featured)

17. `aperture-bloom` — APERTURE BLOOM
18. `magnetic` — MAGNETIC FIELD
19. `weightless` — WEIGHTLESS DRIFT
20. `critters` — CRITTER SWARM
21. `parallax-float` — PARALLAX DRIFT
22. `pressure-crucible` — PRESSURE FIELD
23. `particle-fountain` — PARTICLE FOUNTAIN

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
- Depth-plane title layering is active for `3d-sphere`, `3d-cube`, and `parallax-float`. These modes split particles around the fixed title plane at normalized z `0.5`, with some balls behind and some in front.
- The visible home title/subtitle are canvas-rendered from the semantic `#hero-title` source. No-depth modes draw the title before the normal ball pass, preserving the old title-behind-simulation relationship. Do not change the title's CSS x/y position to solve scene alignment; align the simulation/depth scene to the existing title center instead.

---

## Behavior Snapshot (Runnable Modes)

- `pit`: gravity + collisions + cursor repeller.
- `flies`: swarm attractor behavior with lightweight motion.
- `weightless`: zero-gravity bounce with cursor blast-style interaction.
- `water`: dense drag/ripple motion field.
- `magnetic`: attraction/repel dynamics with velocity limiting.
- `bubbles`: full-height drink-like nucleation from lower sources, terminal rise, pointer/touch wake deflection, surface dissolve, and recycle.
- `kaleidoscope-3`: mirrored wedge render with center-pointer fill, edge-pointer opening, and mode-local bounds/render path.
- `kaleidoscope-rift`: one-wedge polar lattice mirrored into counter-rotating petals; pointer/touch movement shears rings and opens a radial rift instead of folding the full source field.
- `rift-rings`: route-backed Depth Rings concentric-circle field with symmetric ring bands, whole-ring counter-rotation, stronger pointer/touch radial travel, and center-depth fog that makes the innermost ring almost disappear.
- `critters`: locomotion-based critter behavior and local separation.
- `parallax-float`: layered depth field with levitation/parallax response.
- `3d-sphere`: rotating spherical point cloud.
- `3d-cube`: rotating/tumbling cube point cloud.
- `starfield-3d`: depth-projected starfield with recycle, pointer/touch camera pan, and shared distance fog.
- `elastic-center`: Collection-only Elastic Loom; a palette-bead lattice with invisible spring links, single-pointer drag, release waves, subtle hover pressure, and normal wall containment.
- `flock-of-birds`: route-backed distant flock with weighted center-biased motion, no wall collisions, mouse avoidance, and a safe sky band above the ground.
- `wall-repel`: route-backed Repel Room with heavy palette balls launched through a bounded room, strong wall repulsion, mobile-bounded DPR/count, and mouse repulsion without visible cursor rings.
- `aperture-bloom`: route-backed radial circle aperture with symmetric ring spacing, pointer-opened breathing gaps, normal round circles, and the central brand/link area reserved.
- `mineral-growth`: route-backed terrarium thicket with edge-rooted pebble branches and leaflet clusters, deterministic seed support, no visible overlap, and mobile-collapsed controls.
- `napoleon-point-cloud`: route-backed Bust Cloud surface-sampled classical bust-face point cloud with the title layered through the dot field, 5k point amount, 14% density, 23.4 dot size, 0.72x mouse rotation, and auto rotation on.
- `beach-ball-room`: Collection-only route-backed Beach Ball Room circle-built beach ball with room-scale wall physics, softened room-line treatment, calmer rebound, and controls hidden unless `controls=1`.
- `flubber-blob`: fixed-size hard circles simulated as embedded beads in a soft silicone-gel raft with persistent gel links, hard 2D contacts, passive hover-only cursor pressure/wake, lossy wall rebound, and no visible detach/reattach behavior.
- `weave-field`: perpendicular discipline streams that progressively cross into a loose woven lattice, with cursor/touch repulsion opening temporary gaps, shared wall/collision containment, and a compact portrait/mobile weave with fewer lanes and softer motion.
- `pressure-crucible`: Extended-tier experiment, not a daily candidate. Custom-rendered polarity field with small palette-colored bead samples arranged as a filled swarm cloud. Cursor proximity and speed define a live dipole that bends, splits, and wakes the particles; idle motion stays subtle through local swarm drift rather than a ring orbit.
- `particle-fountain`: continuous emitter with gravity/drag shaping.

---

## Related Docs

- [`SIMULATION-DESIGN-GUIDELINES.md`](./SIMULATION-DESIGN-GUIDELINES.md) — Design, material, avoid-list, and promotion gate for new simulations
- [`CONFIGURATION.md`](./CONFIGURATION.md) — Runtime config keys and ranges
- [`INTEGRATION.md`](./INTEGRATION.md) — Historical standalone embed guidance
- [`../development/DEV-WORKFLOW.md`](../development/DEV-WORKFLOW.md) — Dev/build workflow
