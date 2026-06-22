# Mode Specifications

Source of truth for mode IDs and narrative order:
- `source/modules/core/constants.js`
- `source/modules/modes/mode-controller.js`

---

## Runtime Summary

- `24` mode IDs are registered in `MODES`, including the portfolio route's `portfolio-pit`.
- `22` modes are in the narrative cycle (`NARRATIVE_MODE_SEQUENCE`).
- Daily mode selection uses the Featured tier only; Extended modes are optional explorations.
- `parallax-linear` remains a registered mode ID for compatibility, but user mode switching redirects it to the first narrative mode.
- `flock-of-birds`, `wall-repel`, `aperture-bloom`, `pressure-mosaic`, and `mineral-growth` are route-backed daily entries: they appear in the narrative sequence and open dedicated renderers instead of the legacy ball-physics mode runner.

---

## Registered Mode IDs

| Mode | ID | Runtime status |
| --- | --- | --- |
| Ball Pit | `pit` | Active |
| Portfolio Pit | `portfolio-pit` | Portfolio route only |
| Flies to Light | `flies` | Active |
| Zero Gravity | `weightless` | Active |
| Water Swimming | `water` | Active |
| Magnetic | `magnetic` | Active |
| Carbonated Bubbles | `bubbles` | Active |
| Kaleidoscope | `kaleidoscope-3` | Active |
| Critters | `critters` | Active |
| Parallax (Linear) | `parallax-linear` | Disabled redirect |
| Parallax (Float) | `parallax-float` | Active |
| 3D Sphere | `3d-sphere` | Active |
| 3D Cube | `3d-cube` | Active |
| 3D Starfield | `starfield-3d` | Active |
| Tension Loom | `elastic-center` | Active |
| Flock of Birds | `flock-of-birds` | Route-backed daily/lab |
| Repel Room | `wall-repel` | Route-backed daily/lab |
| Aperture Bloom | `aperture-bloom` | Route-backed daily/lab |
| Pressure Mosaic | `pressure-mosaic` | Route-backed daily/lab |
| Mineral Growth | `mineral-growth` | Route-backed daily/lab |
| Flubber Blob | `flubber-blob` | Active |
| Weave Field | `weave-field` | Active |
| Polarity Flux | `pressure-crucible` | Active |
| Particle Fountain | `particle-fountain` | Active |

---

## Narrative Sequence (Arrow Keys)

### Featured Tier (shown first)

1. `pit` — SOURCE MATERIAL
2. `flies` — IDEA SPARK
3. `3d-cube` — 3D FRAME
4. `water` — USER FLOW
5. `wall-repel` — REPEL ROOM
6. `aperture-bloom` — APERTURE BLOOM
7. `3d-sphere` — 3D SHELL
8. `pressure-mosaic` — PRESSURE MOSAIC
9. `flock-of-birds` — FLIGHT FIELD
10. `flubber-blob` — COHESION FIELD
11. `weave-field` — WEAVE FIELD
12. `mineral-growth` — LIVING SYSTEM
13. `elastic-center` — TENSION LOOM
14. `kaleidoscope-3` — VOCAB BLOOM

### Extended Tier (shown after Featured)

15. `bubbles` — NOISE SIGNAL
16. `magnetic` — DESIGN FORCES
17. `weightless` — OPEN SPACE
18. `critters` — BEHAVIOR MODEL
19. `starfield-3d` — DEPTH FIELD
20. `parallax-float` — ORGANIC DRIFT
21. `pressure-crucible` — POLARITY FLUX
22. `particle-fountain` — PARTICLE FLOW

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

---

## Behavior Snapshot (Active Modes)

- `pit`: gravity + collisions + cursor repeller.
- `flies`: swarm attractor behavior with lightweight motion.
- `weightless`: zero-gravity bounce with cursor blast-style interaction.
- `water`: dense drag/ripple motion field.
- `magnetic`: attraction/repel dynamics with velocity limiting.
- `bubbles`: buoyant rise + wobble + recycle.
- `kaleidoscope-3`: mirrored wedge render with mode-local bounds/render path.
- `critters`: locomotion-based critter behavior and local separation.
- `parallax-float`: layered depth field with levitation/parallax response.
- `3d-sphere`: rotating spherical point cloud.
- `3d-cube`: rotating/tumbling cube point cloud.
- `starfield-3d`: depth-projected starfield with recycle.
- `elastic-center`: Tension Loom; a palette-bead lattice with invisible spring links, single-pointer drag, release waves, subtle hover pressure, and normal wall containment.
- `flock-of-birds`: route-backed distant flock with weighted center-biased motion, no wall collisions, mouse avoidance, and a safe sky band above the ground.
- `wall-repel`: route-backed Repel Room with heavy palette balls launched through a bounded room, strong wall repulsion, mobile-bounded DPR/count, and mouse repulsion without visible cursor rings.
- `aperture-bloom`: route-backed radial circle aperture with symmetric ring spacing, pointer-opened breathing gaps, normal round circles, and the central brand/link area reserved.
- `pressure-mosaic`: route-backed packed circle mosaic with pointer pressure gaps, normal round circles, and the central brand/link area reserved.
- `mineral-growth`: route-backed terrarium thicket with edge-rooted pebble branches and leaflet clusters, deterministic seed support, no visible overlap, mobile-collapsed controls, and daily mode panel hidden by `daily=1`.
- `flubber-blob`: fixed-size hard circles simulated as embedded beads in a soft silicone-gel raft with persistent gel links, hard 2D contacts, passive hover-only cursor pressure/wake, lossy wall rebound, and no visible detach/reattach behavior.
- `weave-field`: perpendicular discipline streams that progressively cross into a loose woven lattice, with cursor/touch repulsion opening temporary gaps, shared wall/collision containment, and a compact portrait/mobile weave with fewer lanes and softer motion.
- `pressure-crucible`: Extended-tier experiment, not a daily candidate. Custom-rendered polarity field with small palette-colored bead samples arranged as a filled swarm cloud. Cursor proximity and speed define a live dipole that bends, splits, and wakes the particles; idle motion stays subtle through local swarm drift rather than a ring orbit.
- `particle-fountain`: continuous emitter with gravity/drag shaping.

---

## Related Docs

- [`SIMULATION-DESIGN-GUIDELINES.md`](./SIMULATION-DESIGN-GUIDELINES.md) — Design, material, avoid-list, and promotion gate for new simulations
- [`CONFIGURATION.md`](./CONFIGURATION.md) — Runtime config keys and ranges
- [`INTEGRATION.md`](./INTEGRATION.md) — Embedding and host-page integration
- [`../development/DEV-WORKFLOW.md`](../development/DEV-WORKFLOW.md) — Dev/build workflow
