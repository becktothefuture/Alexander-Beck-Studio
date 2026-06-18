# Mode Specifications

Source of truth for mode IDs and narrative order:
- `source/modules/core/constants.js`
- `source/modules/modes/mode-controller.js`

---

## Runtime Summary

- `20` mode IDs are registered in `MODES`, including the portfolio route's `portfolio-pit`.
- `18` modes are in the narrative cycle (`NARRATIVE_MODE_SEQUENCE`).
- Daily mode selection uses the Featured tier only; Extended modes are optional explorations.
- `parallax-linear` remains a registered mode ID for compatibility, but user mode switching redirects it to the first narrative mode.
- `flock-of-birds` is a route-backed daily entry: it appears in the narrative sequence and opens the dedicated flock renderer instead of the legacy ball-physics mode runner.

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
| Elastic Center | `elastic-center` | Active |
| Flock of Birds | `flock-of-birds` | Route-backed daily/lab |
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
5. `3d-sphere` — 3D SHELL
6. `flock-of-birds` — FLIGHT FIELD
7. `flubber-blob` — COHESION FIELD
8. `weave-field` — WEAVE FIELD
9. `elastic-center` — ELASTIC CENTER
10. `kaleidoscope-3` — VOCAB BLOOM

### Extended Tier (shown after Featured)

11. `bubbles` — NOISE SIGNAL
12. `magnetic` — DESIGN FORCES
13. `weightless` — OPEN SPACE
14. `critters` — BEHAVIOR MODEL
15. `starfield-3d` — DEPTH FIELD
16. `parallax-float` — ORGANIC DRIFT
17. `pressure-crucible` — POLARITY FLUX
18. `particle-fountain` — PARTICLE FLOW

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
- `elastic-center`: spring-like ring structure with cursor repulsion.
- `flock-of-birds`: route-backed distant flock with weighted center-biased motion, no wall collisions, mouse avoidance, and a safe sky band above the ground.
- `flubber-blob`: fixed-size hard circles simulated as embedded beads in a soft silicone-gel raft with persistent gel links, hard 2D contacts, passive hover-only cursor pressure/wake, lossy wall rebound, and no visible detach/reattach behavior.
- `weave-field`: perpendicular discipline streams that progressively cross into a loose woven lattice, with cursor/touch repulsion opening temporary gaps, shared wall/collision containment, and a compact portrait/mobile weave with fewer lanes and softer motion.
- `pressure-crucible`: Extended-tier experiment, not a daily candidate. Custom-rendered polarity field with small palette-colored bead samples arranged as a filled swarm cloud. Cursor proximity and speed define a live dipole that bends, splits, and wakes the particles; idle motion stays subtle through local swarm drift rather than a ring orbit.
- `particle-fountain`: continuous emitter with gravity/drag shaping.

---

## Related Docs

- [`CONFIGURATION.md`](./CONFIGURATION.md) — Runtime config keys and ranges
- [`INTEGRATION.md`](./INTEGRATION.md) — Embedding and host-page integration
- [`../development/DEV-WORKFLOW.md`](../development/DEV-WORKFLOW.md) — Dev/build workflow
