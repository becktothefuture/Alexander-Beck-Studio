# Simulation Proposals (Built on Current System)

Short briefs for five new modes, each designed to slot into the existing architecture (`modes/*.js`, `mode-controller.js`, `physics/engine.js`, `rendering/renderer.js`, `ui/control-registry.js`, `config/default-config.json`).

---

## 1) Aurora Sheets
- **Concept:** Vertical ribbon wavefronts responding to “wind” from cursor movement; flowing color gradients reminiscent of aurora curtains.
- **Forces:** Add a mode-local wind field driven by pointer velocity (low-pass filtered) plus a vertical sine offset; light drag to avoid runaway speeds.
- **Collisions:** Keep wall bounds; disable ball-to-ball collisions for density/perf (like Flies).
- **Rendering:** Reuse ball sprites; apply hue shift per y-position and slight stretch along wind direction (use existing squash hooks).
- **Config hooks:** `auroraWindStrength`, `auroraDrag`, `auroraWaveHz`, `auroraHueShift`.
- **Implementation sketch:** Mode file registers a per-frame force that adds wind vector + vertical oscillation to each particle; set `checkBallCollisions=false`; use `effects` tinting for gradient.

## 2) Electrostatic Lattice
- **Concept:** Charged particles attracted to a hex lattice; occasional “discharge” pulses that push neighbors.
- **Forces:** Compute nearest lattice node (precomputed grid) and apply springy attraction; add rare radial impulses (timer-based) to simulate discharges.
- **Collisions:** Optional soft separation (low restitution) to prevent overlaps; grid removes need for heavy collision checks.
- **Rendering:** Color-coded charges; subtle glow via existing canvas shadow; momentary flash on discharge.
- **Config hooks:** `latticeSpacing`, `latticeAttract`, `latticeDamp`, `latticeDischargeInterval`, `latticeDischargeStrength`.
- **Implementation sketch:** Mode init builds lattice points; each step pulls particles toward their nearest point; on interval, pick a node and push nearby particles outward; reuse `wall-state` for bounds.

## 3) Sand Ripples
- **Concept:** Granular flow that forms dunes/ripples; cursor acts as a rake/brush carving channels.
- **Forces:** Gravity + friction along the x-axis is near-zero; introduce directional “wind” to one side; cursor injects lateral force within a brush radius.
- **Collisions:** Keep collisions on with slightly higher friction and low restitution to settle quickly.
- **Rendering:** Smaller radii; earth-tone palette; use existing squash for “packed” look on impact; optional low motion blur for trail.
- **Config hooks:** `sandWind`, `sandBrushRadius`, `sandBrushStrength`, `sandRestitution`, `sandFriction`.
- **Implementation sketch:** Mode sets ground-parallel wind and brush forces; tweak `ballSpacing` to be tighter; use standard collision response with higher friction.

## 4) Lens Warp
- **Concept:** Particles follow curved light paths around a moving focal point, like gravitational lensing.
- **Forces:** Attractive force to a lens center plus perpendicular tangential component (orbit); strength falls off with distance; cursor repositions the lens.
- **Collisions:** Keep wall bounds; disable inter-particle collisions for perf (optional soft separation).
- **Rendering:** Slight radial scale based on proximity to lens; color shift toward center; optional background warp not needed—keep to particles for speed.
- **Config hooks:** `lensPull`, `lensOrbit`, `lensFalloff`, `lensCenterLag`.
- **Implementation sketch:** Mode tracks a lens point that eases toward cursor; per particle, add radial pull + tangential swirl; set `checkBallCollisions=false`; reuse custom cursor sizing.

## 5) Bloom Flock
- **Concept:** Flocking dots that periodically “bloom” into petal bursts before collapsing back to flocking.
- **Forces:** Start from Boids-like separation/align/cohesion (reuse critters patterns); overlay a timed bloom pulse that pushes agents outward, then a gentle cohesion pull inward.
- **Collisions:** Soft separation only; no heavy collision grid needed.
- **Rendering:** Alternate between dot and petal-esque stretched render (use squash + rotation); palette shift during bloom window.
- **Config hooks:** `bloomInterval`, `bloomStrength`, `bloomDuration`, `flockCohesion`, `flockSeparation`, `flockAlign`.
- **Implementation sketch:** Mode timer triggers bloom phase: increase outward force + stretch rendering; after duration, restore base flock forces; reuse critters steering utilities if available or implement local neighbor scan with limited radius.

---

Implementation pattern (applies to all)
1. Add constants to `core/constants.js` and panel controls via `ui/control-registry.js` if exposed.  
2. Create a new mode file in `source/modules/modes/`, export `init`, `step`, `render` (if custom), and register in `mode-controller.js` with a new enum + optional keyboard shortcut.  
3. Add defaults to `source/config/default-config.json`; document keys in `docs/reference/CONFIGURATION.md` and `docs/reference/MODES.md`.  
4. Respect panel docking and pointer ignore rules; ensure styles stay within `#bravia-balls`.  
5. Keep hot paths O(1): avoid per-frame allocations; disable collisions when not needed; reuse spatial hash only if required.  
6. Test in dev (8001) and preview (8000); honor `prefers-reduced-motion` if adding heavy visuals.

