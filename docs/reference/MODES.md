# Mode Specifications

Current mode system supports **multiple modes** (switchable via the Settings panel; narrative cycling is via Arrow keys).

---

## Mode List (Current)

1. **Ball Pit** (`pit`)
2. **Flies to Light** (`flies`)
3. **Zero Gravity** (`weightless`)
4. **Water Swimming** (`water`)
5. **Vortex Sheets** (`vortex`)
6. **Ping Pong** (`ping-pong`)
7. **Magnetic** (`magnetic`)
8. **Carbonated Bubbles** (`bubbles`)
9. **Kaleidoscope I** (`kaleidoscope-1`)
10. **Kaleidoscope II** (`kaleidoscope-2`)
11. **Kaleidoscope III** (`kaleidoscope-3`)
12. **Kaleidoscope** (`kaleidoscope`)
13. **Critters** (`critters`) — **default** (no keyboard shortcut yet)
14. **Ball Pit (Throws)** (`pit-throws`) — **no keyboard shortcut yet**
15. **Orbit 3D** (`orbit-3d`)
16. **Orbit 3D (Tight Swarm)** (`orbit-3d-2`)
17. **Crystal Lattice** (`lattice`)
18. **Neural Network** (`neural`)
19. **Parallax (Linear)** (`parallax-linear`)
20. **Parallax (Perspective)** (`parallax-perspective`)

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Toggle Settings panel dock |
| `R` | Reset current simulation |
| `←` (Left Arrow) | Previous simulation in narrative sequence |
| `→` (Right Arrow) | Next simulation in narrative sequence |

---

## Narrative Mode Sequence (Arrow Keys)

The arrow keys cycle through a fixed story order (looping). Think of it as chapters — each mode is a new lens on the same set of elements:

1. **Ball Pit** (`pit`) — **SOURCE MATERIAL**
2. **Flies to Light** (`flies`) — **SEEKING LIGHT**
3. **Crystal Lattice** (`lattice`) — **CRYSTAL FRAME**
4. **Carbonated Bubbles** (`bubbles`) — **SIGNAL NOISE**
5. **Ball Pit (Throws)** (`pit-throws`) — **ITERATION ENGINE**
6. **Magnetic** (`magnetic`) — **FORCE FIELDS**
7. **Water Swimming** (`water`) — **FLOW STATE**
8. **Ping Pong** (`ping-pong`) — **FEEDBACK LOOP**
9. **Neural Network** (`neural`) — **SYNAPTIC WEB**
10. **Vortex Sheets** (`vortex`) — **ORDERED CHAOS**
11. **Orbit 3D** (`orbit-3d`) — **AXIAL STORM**
12. **Zero Gravity** (`weightless`) — **ZERO GRAVITY**
13. **Parallax (Linear)** (`parallax-linear`) — **DEPTH DRIFT**
14. **Critters** (`critters`) — **LIVING MODELS**
15. **Orbit 3D (Tight Swarm)** (`orbit-3d-2`) — **ORBIT SWARM**
16. **Parallax (Perspective)** (`parallax-perspective`) — **PERSPECTIVE FIELD**
17. **Kaleidoscope I** (`kaleidoscope-1`) — **LANGUAGE SEED**
18. **Kaleidoscope II** (`kaleidoscope-2`) — **LANGUAGE FLOW**
19. **Kaleidoscope III** (`kaleidoscope-3`) — **LANGUAGE BLOOM**
20. **Kaleidoscope** (`kaleidoscope`) — **A NEW LANGUAGE**

---

## Mode Details

## Mode 15: Orbit 3D 🌪️ (Zero Gravity)

**Purpose:** Bodies orbit the mouse cursor in zero gravity with true depth scaling. Each body maintains stable orbital motion around the cursor as the center of gravity, creating a beautiful celestial dance.

- **Gravity:** Zero gravity (orbital mechanics only)
- **Collisions:** Disabled for clean orbital motion
- **Interaction:** Mouse cursor acts as the gravitational center
- **Depth:** True 3D depth effect through size scaling (0-1 depth range)
- **Motion model:** Tangential velocity for stable orbits + weak radial pull
- **Visual effect:** Depth oscillation creates dynamic size changes
- **Accessibility:** Respects `prefers-reduced-motion`
- **Settings (panel):**
  - `Body Count` (10-200) - number of orbiting bodies
  - `Gravity Pull` (1000-10000) - strength of radial attraction
  - `Orbital Speed` (50-300) - tangential velocity for orbits
  - `Depth Effect` (0-1.5) - size scaling strength
  - `Stability` (0.005-0.05) - velocity damping factor

## Mode 17: Crystal Lattice 💎

**Purpose:** "Crystallization" narrative. Balls are pulled towards a hexagonal grid, forming a solid structure out of chaos.
- **Gravity:** Disabled
- **Collisions:** Enabled
- **Interaction:** Repeller enabled (disrupts the lattice)
- **Forces:** Strong spring force towards nearest hex grid vertex.

## Mode 18: Neural Network 🧠

**Purpose:** "Connectivity" narrative. Balls wander gently and form transient clusters (connections expressed through motion only).
- **Gravity:** Disabled
- **Collisions:** Enabled
- **Interaction:** Repeller enabled
- **Visuals:** **No lines** — circle-only rendering.

## Simulation 11: Critters 🪲

**Purpose:** Ball-only “little creatures”: each critter is a single circle with step-like locomotion (stride pulses), turning inertia, edge avoidance, and local separation.  
**Default:** Active by default (for now).  
**Keyboard:** None (for now).

- **Population:** ~90 critters (configurable)
- **Motion:** Step cadence + staccato “start/stop” pulse (no floating drift)
- **Collisions:** Standard ball collisions (but with Critters-only low restitution + higher drag)
- **Interaction:** Cursor acts as a local attractor within a vw-defined radius

## Mode 1: Ball Pit 🎯

**Purpose:** Classic gravity-based physics playground with collisions and cursor repeller.

- **Gravity:** Enabled (via `gravityMultiplier`)
- **Collisions:** Ball-to-ball + wall collision
- **Interaction:** Cursor repeller enabled
- **Notes:** Includes sleep logic to reduce jitter when balls settle

## Mode 1b: Ball Pit (Throws) 🎯

**Purpose:** Ball Pit, but seeded by balls thrown in **color-by-color batches** from the **top-left/top-right** into the scene.

- **Gravity:** Enabled (via `gravityMultiplier`)
- **Collisions:** Ball-to-ball + wall collision
- **Interaction:** Cursor repeller enabled
- **Tuning:** See Ball Pit (Throws) keys in `CONFIGURATION.md`

---

## Mode 2: Flies to Light 🕊️

**Purpose:** Insect-like swarm behavior attracted to cursor "light".

- **Gravity:** Disabled
- **Collisions:** None (performance-friendly)
- **Interaction:** Cursor attractor behavior

---

## Mode 3: Zero Gravity 🌌

**Purpose:** Perpetual motion bounce with near-elastic walls and collisions.

- **Gravity:** Disabled
- **Collisions:** Ball-to-ball + wall collision
- **Interaction:** Cursor “explosion” repeller — balls are propelled outward from the mouse in all directions (Zero‑G stays gravity-free)
- **Settings (panel):**
  - `Cursor Blast Radius`
  - `Cursor Blast Power`
  - `Cursor Blast Falloff`

---

## Mode 4: Water Swimming 🌊

**Purpose:** Dense floating field with drag + ripple behavior.

- **Gravity:** Disabled
- **Collisions:** Wall collision; mode-specific forces + ripples
- **Interaction:** No repeller (default)

---

## Mode 5: Vortex Sheets 🌀

**Purpose:** Orbital flow field (swirl + radial pull) for sheet-like motion.

- **Gravity:** Disabled
- **Collisions:** Typically disabled for clarity/performance
- **Interaction:** Cursor influences the flow field (mode-specific)

---

## Mode 6: Ping Pong 🏓

**Purpose:** Side-to-side bounce with cursor acting as an obstacle.

- **Gravity:** Disabled
- **Collisions:** Wall collision
- **Interaction:** Cursor obstacle radius affects trajectories

---

## Mode 7: Magnetic 🧲

**Purpose:** Magnetic-style attraction/explosions with velocity limiting.

- **Gravity:** Disabled
- **Collisions:** Mode-specific forces + update loop
- **Interaction:** Cursor and periodic events influence the system

---

## Mode 8: Carbonated Bubbles 🫧

**Purpose:** Rising bubble field with wobble and gentle deflection around cursor.

- **Gravity:** Disabled (buoyancy-style rise forces)
- **Collisions:** Mode-specific deflection/rise logic
- **Interaction:** Cursor deflect radius

---

## Mode 9: Kaleidoscope 🪞
**Keyboard:** Press `9`

**Purpose:** Seamless mirror-wedge kaleidoscope rendering of the same circle-style balls, driven by mouse movement.

- **Gravity:** Disabled
- **Collisions:** Enabled (keeps circles from overlapping; spacing is mode-scoped)
- **Interaction:** Cursor changes the kaleidoscope *mapping* (pan/phase/flow), while the kaleidoscope center stays anchored to the viewport center
- **Render:** “Proper” kaleidoscope mapping (polar angle folding + optional mirroring) to avoid wedge seam gaps
- **Walls:** Kaleidoscope does **not** participate in the rubber wall / impact system (walls remain visually unaffected)
- **Settings (panel):**
  - `kaleidoscopeSegments` (wedges)
  - `kaleidoscopeMirror` (0/1)
  - `kaleidoscopeSwirlStrength`
  - `kaleidoscopeRadialPull`
  - `kaleidoscopeRotationFollow`
  - `kaleidoscopePanStrength`
  - `kaleidoscopeBallSpacing`
  - `kaleidoscopeEase`
  - `kaleidoscopeWander`
  - `kaleidoscopeIdleMotion` (idle baseline; default is intentionally tiny)
  - `kaleidoscopeMaxSpeed`

### Implementation Lessons (Kaleidoscope)
- **Avoid “bursty idle stepping”**: a low-frequency idle physics loop can look like lag even when FPS is high; prefer a consistent cadence and smooth envelopes.
- **Separate physics from mapping**: keep the simulation stable and use mouse-driven *mapping* changes (pan/phase) for the kaleidoscope “image shift”.
- **Use an activity envelope**: ramp forces in/out smoothly based on recent pointer movement so idle stays calm and interaction feels organic.
- **Mode-local overrides**: spacing/collisions/bounds behavior should be scoped to Kaleidoscope so other modes keep their identity.

---

## Related Docs

- [`CONFIGURATION.md`](./CONFIGURATION.md) — Runtime config keys (visual + physics)
- [`SOUND.md`](./SOUND.md) — Collision sound system
- [`BUILD-SYSTEM.md`](./BUILD-SYSTEM.md) — Production build and asset injection


