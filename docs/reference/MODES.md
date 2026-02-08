# Mode Specifications

Source of truth for mode IDs and narrative order:
- `source/modules/core/constants.js`
- `source/modules/modes/mode-controller.js`

---

## Runtime Summary

- `15` mode IDs are registered in `MODES`.
- `14` modes are in the narrative cycle (`NARRATIVE_MODE_SEQUENCE`).
- `parallax-linear` remains a registered mode ID for compatibility, but user mode switching redirects it to the first narrative mode.

---

## Registered Mode IDs

| Mode | ID | Runtime status |
| --- | --- | --- |
| Ball Pit | `pit` | Active |
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
| Particle Fountain | `particle-fountain` | Active |

---

## Narrative Sequence (Arrow Keys)

### Featured Tier (shown first)

1. `pit` — SOURCE MATERIAL
2. `flies` — IDEA SPARK
3. `3d-cube` — 3D FRAME
4. `water` — USER FLOW
5. `3d-sphere` — 3D SHELL
6. `elastic-center` — ELASTIC CENTER
7. `kaleidoscope-3` — VOCAB BLOOM

### Extended Tier (shown after Featured)

8. `bubbles` — NOISE SIGNAL
9. `magnetic` — DESIGN FORCES
10. `weightless` — OPEN SPACE
11. `critters` — BEHAVIOR MODEL
12. `starfield-3d` — DEPTH FIELD
13. `parallax-float` — ORGANIC DRIFT
14. `particle-fountain` — PARTICLE FLOW

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
- `particle-fountain`: continuous emitter with gravity/drag shaping.

---

## Related Docs

- [`CONFIGURATION.md`](./CONFIGURATION.md) — Runtime config keys and ranges
- [`INTEGRATION.md`](./INTEGRATION.md) — Embedding and host-page integration
- [`../development/DEV-WORKFLOW.md`](../development/DEV-WORKFLOW.md) — Dev/build workflow
