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
9. **Kaleidoscope** (`kaleidoscope-3`)
10. **Critters** (`critters`) — **default** (no keyboard shortcut yet)
11. **Meteor Shower** (`meteor-shower`)
12. **Elastic Center** (`elastic-center`)
17. **3D Sphere** (`3d-sphere`)
18. **3D Cube** (`3d-cube`)
20. **Neural Network** (`neural`)
21. **Parallax (Linear)** (`parallax-linear`)
23. **3D Starfield** (`starfield-3d`)

---

## Keyboard & Mouse Shortcuts

| Key/Action | Function |
|------------|----------|
| `/` | Toggle Settings panel dock |
| `R` | Reset current simulation |
| `←` (Left Arrow) | Previous simulation in narrative sequence |
| `→` (Right Arrow) | Next simulation in narrative sequence |
| Right-click | Previous simulation (same as Left Arrow) |

---

## Narrative Mode Sequence (Arrow Keys)

The arrow keys cycle through a fixed story order (looping). Think of it as chapters — each mode is a new lens on the same set of elements:

1. **Ball Pit** (`pit`) — **SOURCE MATERIAL**
2. **Flies to Light** (`flies`) — **IDEA SPARK**
3. **3D Cube** (`3d-cube`) — **3D FRAME**
4. **Carbonated Bubbles** (`bubbles`) — **NOISE SIGNAL**
5. **Magnetic** (`magnetic`) — **DESIGN FORCES**
6. **Water Swimming** (`water`) — **USER FLOW**
7. **Ping Pong** (`ping-pong`) — **FEEDBACK CYCLE**
8. **Neural Network** (`neural`) — **CONNECTION MAP**
9. **Meteor Shower** (`meteor-shower`) — **METEOR IMPACT**
10. **3D Sphere** (`3d-sphere`) — **3D SHELL**
11. **Zero Gravity** (`weightless`) — **OPEN SPACE**
12. **Parallax (Linear)** (`parallax-linear`) — **PERSPECTIVE SHIFT**
13. **Critters** (`critters`) — **BEHAVIOR MODEL**
14. **Elastic Center** (`elastic-center`) — **ELASTIC CENTER**
15. **Vortex Sheets** (`vortex`) — **EMERGENT ORDER**
16. **Kaleidoscope** (`kaleidoscope-3`) — **VOCAB BLOOM**
17. **3D Starfield** (`starfield-3d`) — **DEPTH FIELD**

---

## Mode Details

## Mode 17: 3D Sphere 🌐

**Purpose:** Rotating sphere point cloud. Hollow spherical point cloud (surface-only) that rotates with cursor movement and gently tumbles. Camera-locked like 3D Cube. Dots always face the viewer and scale with depth.

- **Gravity:** Disabled
- **Collisions:** Ball-to-ball collisions disabled; sphere stays centered (camera-locked)
- **Physics:** None—pure rotation-based animation
- **Interaction:** Mouse dragging OVER the sphere spins it (like pushing a globe with your finger); idle drift when mouse is away
- **Depth:** Perspective projection with per-dot depth scaling
- **Distribution:** Fibonacci sphere (uniform surface sampling)
- **Settings (panel):**
  - `Radius` (5-40 vw) — sphere radius
  - `Point Count` (30-600) — surface density
  - `Focal Length` (80-2000 px) — perspective strength
  - `Dot Size` (0.2-4×) — relative dot radius
  - `Idle Rotation` (0-1 rad/s) — baseline spin
  - `Spin Sensitivity` (0-10) — how much mouse dragging spins the sphere
  - `Tumble Damping` (0.8-0.99) — decay of spin impulse

## Mode 18: 3D Cube 🧊

**Purpose:** A 3D cube made of points (edges + optional face grids) that rotates with cursor motion and gently tumbles at idle.

- **Gravity:** Disabled
- **Collisions:** Ball-to-ball collisions disabled; cube stays centered (camera-locked)
- **Interaction:** Cursor offsets yaw/pitch; cursor motion adds tumble impulse; idle drift present
- **Depth:** Perspective projection with per-dot depth scaling
- **Distribution:** Edge lattice (12 edges) plus optional face grids
- **Settings (panel):**
  - `Size` (10-50 vw) — cube edge length
  - `Edge Density` (2-30) — points per edge
  - `Face Grid` (0-10) — subdivisions per face (0 = edges only)
  - `Idle Rotation` (0-1 rad/s) — baseline spin
  - `Cursor Influence` (0-4) — sensitivity to mouse offset
  - `Tumble Speed` (0-10) — impulse from mouse movement
  - `Tumble Damping` (0.8-0.99) — decay of tumble impulse
  - `Focal Length` (80-2000 px) — perspective strength
  - `Dot Size` (0.2-4×) — relative dot radius

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
- **Spawn:** Recycles always from below the viewport with a 0→1 scale-in; initial fill is height-distributed with staggered scale-in to avoid clumping
- **Top edge:** Instant pop (no fade) and immediate recycle back to the bottom

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
  - `kaleidoscopeIdleDrift` (subtle per-ball drift to keep the scene alive; honors prefers-reduced-motion)
  - `kaleidoscopeMaxSpeed`

### Implementation Lessons (Kaleidoscope)
- **Avoid “bursty idle stepping”**: a low-frequency idle physics loop can look like lag even when FPS is high; prefer a consistent cadence and smooth envelopes.
- **Separate physics from mapping**: keep the simulation stable and use mouse-driven *mapping* changes (pan/phase) for the kaleidoscope “image shift”.
- **Use an activity envelope**: ramp forces in/out smoothly based on recent pointer movement so idle stays calm and interaction feels organic.
- **Mode-local overrides**: spacing/collisions/bounds behavior should be scoped to Kaleidoscope so other modes keep their identity.

---

## Mode 23: 3D Starfield ✨

**Purpose:** Depth-projected starfield with parallax and recycled points. Dots start tiny in the distance, grow toward standard ball size as they approach the camera, then recycle back to depth to maintain density.

- **Gravity:** Disabled
- **Collisions:** Disabled; pooled points with no physics collisions
- **Interaction:** None; cursor is ignored (no parallax/offset)
- **Depth:** Perspective projection with configurable near/far planes and focal length
- **Extent:** Star positions use `starfieldSpanX`/`starfieldSpanY` multiplied by 4× along X/Y for a wider field
- **Idle:** Subtle twinkle/drift when idle; respects `prefers-reduced-motion`
- **Settings (panel):**
  - `starfieldCount`
  - `starfieldSpanX`, `starfieldSpanY`
  - `starfieldZNear`, `starfieldZFar`
  - `starfieldFocalLength`
  - `starfieldParallaxStrength` (currently ignored; cursor influence disabled)
  - `starfieldSpeed`
  - `starfieldDotSizeMul` (capped at normal ball size)
  - `starfieldIdleJitter`
  - `starfield3dWarmupFrames`

---

## Related Docs

- [`CONFIGURATION.md`](./CONFIGURATION.md) — Runtime config keys (visual + physics)
- [`SOUND.md`](./SOUND.md) — Collision sound system
- [`BUILD-SYSTEM.md`](./BUILD-SYSTEM.md) — Production build and asset injection


