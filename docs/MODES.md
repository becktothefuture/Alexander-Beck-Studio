# Mode Specifications

Detailed specifications for each of the three simulation modes.

---

## Mode 1: Ball Pit 🎯

### Purpose
Classic gravity-based physics playground with satisfying collisions and mouse interaction.

### Physics Behavior
- **Gravity**: 1.1× Earth gravity (1960 px/s² × 1.1)
- **Collisions**: Ball-to-ball (elastic with restitution)
- **Wall Bouncing**: All 4 walls with friction
- **Ground Friction**: Rolling resistance when balls rest
- **Angular Momentum**: Balls spin based on tangential slip

### Spawning
- **Location**: Top 50vh (hidden above viewport)
- **Method**: Continuous emitter with sweep motion
- **Spawn Rate**: Configurable (default: every 33ms)
- **Initial Velocity**: Slight downward + horizontal sweep

### User Interaction
- **Mouse Repeller**: Pushes nearby balls away (configurable radius/power)
- **Keyboard**: Press `1` to activate mode
- **Reset**: Press `R` to clear and respawn

### Visual Effects
- **Squash/Stretch**: Deformation on impact (softness configurable 0-100)
- **Spin Indicators**: Removed for cleaner visuals
- **Motion Blur**: Optional trail effect

### Canvas
- **Height**: 150vh (allows spawning above viewport)
- **Viewport Top**: At y = h/3 (balls spawn in top third, hidden)

### Performance Characteristics
- **200 balls**: 60 FPS ✅
- **300 balls**: 55-60 FPS ✅
- **Bottleneck**: Collision detection (spatial hashing helps)

### Controls (Development Panel)
- Gravity multiplier (0.5 - 2.0x)
- Ball weight/mass (1.0 - 30.0 kg)
- Bounciness/restitution (0.5 - 1.0)
- Ground friction (0.0 - 0.01)
- Emitter rate (0.01 - 0.1s)
- Repeller power & radius
- Ball softness (0-100)

---

## Mode 2: Flies to Light 🕊️

### Purpose
Elegant swarm simulation where balls act like moths attracted to a light source (cursor).

### Physics Behavior
- **Gravity**: None (zero-G)
- **Attraction**: Strong pull toward mouse cursor
- **Orbit Mechanics**: Tangential force creates circling behavior
- **Separation**: Mild repulsion between balls (optional)
- **Wall Bouncing**: Enabled to keep balls in scene

### Spawning
- **Location**: Top emitter (visible part of canvas)
- **Method**: Continuous emission
- **Spawn Rate**: Same as Ball Pit
- **Initial Velocity**: Small downward

### User Interaction
- **Mouse Cursor**: Acts as "light source" attracting swarm
- **Keyboard**: Press `2` to activate mode
- **Idle Behavior**: Swarm circulates near last known cursor position

### Visual Effects
- **Organic Motion**: Smooth acceleration/deceleration
- **No Collisions**: Balls pass through each other (performance)
- **Fluid Following**: Graceful convergence on cursor

### Canvas
- **Height**: 100svh (viewport-sized, no spawning above)
- **Viewport Top**: At y = 0 (canvas top = viewport top)

### Performance Characteristics
- **300 balls**: 60 FPS ✅
- **Better than Ball Pit**: No collision detection overhead
- **Bottleneck**: Attraction force calculations (O(n))

### Controls (Development Panel)
- Attraction power (100 - 2000)
- Orbit radius (50 - 300 px)
- Swarm speed multiplier (0.2 - 2.0x)

---

## Mode 3: Zero-G (Weightless Bounce) 🌌

### Purpose
Perpetual motion machine with perfect elastic collisions in zero gravity.

### Physics Behavior
- **Gravity**: None (zero-G)
- **Collisions**: Ball-to-ball (perfect elastic)
- **Wall Bouncing**: All 4 walls with very high restitution (0.98)
- **Energy Conservation**: Minimal energy loss, near-perpetual motion
- **Top Wall**: Fixed at y = 0 (viewport edge) ✅

### Spawning
- **Location**: Even grid distribution across canvas
- **Method**: One-time initialization (no continuous spawning)
- **Ball Count**: Fixed (default: 80 balls)
- **Initial Velocity**: Random directions with controlled magnitude

### User Interaction
- **Mouse Repeller**: Subtle push effect (optional, configurable)
- **Keyboard**: Press `3` to activate mode
- **Reset**: Re-initializes with new random velocities

### Visual Effects
- **Mesmerizing Patterns**: Emergent behavior from collisions
- **Clean Bouncing**: Perfect reflections off walls
- **No Deformation**: Balls stay circular (elastic collisions)

### Canvas
- **Height**: 100svh (viewport-sized)
- **Viewport Top**: At y = 0 (perfect 4-wall bouncing)

### Performance Characteristics
- **150 balls**: 60 FPS ✅
- **200 balls**: 55-58 FPS ✅
- **Bottleneck**: Collision detection (many simultaneous collisions)

### Controls (Development Panel)
- Ball count (20 - 200)
- Initial speed (50 - 500 px/s)
- Bounce elasticity (0.7 - 1.0)
- Repeller power (0 - 800)
- Repeller radius (50 - 300 px)

---

## Mode Comparison Matrix

| Feature | Ball Pit | Flies | Zero-G |
|---------|----------|-------|---------|
| **Gravity** | ✅ Yes | ❌ No | ❌ No |
| **Ball-to-Ball Collision** | ✅ Yes | ❌ No | ✅ Yes |
| **Wall Collision** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Mouse Interaction** | Repeller | Attractor | Repeller (subtle) |
| **Spawning** | Continuous | Continuous | One-time |
| **Canvas Height** | 150vh | 100svh | 100svh |
| **Energy Loss** | High (friction) | N/A | Minimal |
| **Performance** | Good | Excellent | Good |

---

## Shared Features

### All Modes Include
- **8 Color Palettes**: Customizable via UI
- **Ball Size Control**: Global setting (default: 0.7)
- **Size Variation**: ±10% random variation
- **Cursor Ball**: Visual cursor indicator (hidden on mobile)
- **FPS Counter**: Development tool (removable in production)
- **Panel Toggle**: Press `/` to show/hide controls

### Physics Constants (Shared)
- **DPR**: Device pixel ratio (1-2x)
- **Physics Timestep**: 120Hz fixed (DT = 1/120)
- **Max Balls**: 300 (configurable)
- **Ball Sizes**: 0.3 - 1.5× base size

### Rendering (Shared)
- **Target FPS**: 60 (requestAnimationFrame)
- **Canvas**: 2D context with alpha
- **Anti-aliasing**: Enabled
- **Clear Method**: Full clear each frame (or fade for motion blur)

---

## Mode-Specific Optimizations

### Ball Pit
- Spatial hashing for collision detection
- Ground coupling for realistic rolling
- Squash amount scales with impact velocity

### Flies
- No collision detection (major performance gain)
- Simple vector math per ball
- Smooth interpolation for organic feel

### Zero-G
- High restitution minimizes energy calculations
- Fixed ball count (no spawning overhead)
- Smart grid initialization prevents overlap

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Switch to Ball Pit |
| `2` | Switch to Flies |
| `3` | Switch to Zero-G |
| `R` | Reset scene |
| `/` | Toggle control panel |

---

## Implementation Notes

### Canvas Height Logic
```javascript
// Ball Pit: 150vh (spawning space)
if (currentMode === MODES.PIT) {
  container.classList.add('mode-pit');
  heightMultiplier = 1.5;
  viewportTop = h / 3;
}
// Others: 100svh (viewport-sized)
else {
  heightMultiplier = 1.0;
  viewportTop = 0;
}
```

### Mode Switching
- Clears existing balls
- Resets emitter timer
- Adjusts canvas height
- Calls mode-specific init
- Updates UI controls

### Ball Spawning
```javascript
// Ball Pit & Flies: continuous emitter
if (currentMode !== MODES.WEIGHTLESS) {
  emitterTimer += dt;
  if (emitterTimer >= EMIT_INTERVAL) {
    spawnBall();
  }
}

// Zero-G: one-time grid init
if (currentMode === MODES.WEIGHTLESS) {
  initializeWeightlessScene();
}
```

---

## Future Enhancements (Potential)

### Per-Mode Features
1. **Ball Pit**: Text collision boundaries (ball avoidance)
2. **Flies**: Predator/prey dynamics (split swarm)
3. **Zero-G**: Gravity wells (orbital mechanics)

### Global Improvements
1. **WebGL Renderer**: 10x particle capacity
2. **Web Workers**: Offload physics calculations
3. **Touch Gestures**: Swipe to apply force
4. **Sound Effects**: Audio feedback on collisions

---

**See `ARCHITECTURE.md` for technical implementation details.**  
**See `PERFORMANCE.md` for optimization strategies.**

