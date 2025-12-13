# Mode Specifications

Current mode system supports **8 modes** (switchable via keyboard shortcuts and the Settings panel).

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

**Purpose:** Insect-like swarm behavior attracted to cursor “light”.

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

## Notes: “Pulse Grid”

Some grid/pulse-related parameters exist in state (e.g. `gridBallCount`, `pulseInterval`), but **Pulse Grid is not currently a selectable mode** in the runtime mode controller.

If/when Pulse Grid returns, this document should be updated alongside:
- `source/modules/core/constants.js` (mode list)
- `source/modules/modes/mode-controller.js` (initialization + force/update hooks)
- `source/modules/ui/keyboard.js` (keyboard mapping)

---

## Related Docs

- [`CONFIGURATION.md`](./CONFIGURATION.md) — Runtime config keys (visual + physics)
- [`SOUND.md`](./SOUND.md) — Collision sound system
- [`BUILD-SYSTEM.md`](./BUILD-SYSTEM.md) — Production build and asset injection


