# Mode Specifications

Current mode system supports **9 modes** (switchable via keyboard shortcuts and the Settings panel).

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
9. **Kaleidoscope** (`kaleidoscope`)

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Ball Pit |
| `2` | Flies to Light |
| `3` | Zero Gravity |
| `4` | Water Swimming |
| `5` | Vortex Sheets |
| `6` | Ping Pong |
| `7` | Magnetic |
| `8` | Carbonated Bubbles |
| `9` | Kaleidoscope |
| `/` | Toggle Settings panel dock |

---

## Mode Details

## Mode 1: Ball Pit 🎯

**Purpose:** Classic gravity-based physics playground with collisions and cursor repeller.

- **Gravity:** Enabled (via `gravityMultiplier`)
- **Collisions:** Ball-to-ball + wall collision
- **Interaction:** Cursor repeller enabled
- **Notes:** Includes sleep logic to reduce jitter when balls settle

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
- **Interaction:** No repeller (default)

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

**Purpose:** Mirror-wedge kaleidoscope rendering of the same circle-style balls, driven by mouse movement.

- **Gravity:** Disabled
- **Collisions:** None (performance-friendly; enables high wedge counts)
- **Interaction:** Cursor controls kaleidoscope center + rotation behavior
- **Render:** Balls are drawn into mirrored wedge segments; rubber walls remain normal (not kaleidoscoped)
- **Settings (panel):**
  - `kaleidoscopeSegments` (wedges)
  - `kaleidoscopeMirror` (0/1)
  - `kaleidoscopeSwirlStrength`
  - `kaleidoscopeRadialPull`
  - `kaleidoscopeRotationFollow`
  - `kaleidoscopePanStrength`
  - `kaleidoscopeMaxSpeed`

---

## Related Docs

- [`CONFIGURATION.md`](./CONFIGURATION.md) — Runtime config keys (visual + physics)
- [`SOUND.md`](./SOUND.md) — Collision sound system
- [`BUILD-SYSTEM.md`](./BUILD-SYSTEM.md) — Production build and asset injection


