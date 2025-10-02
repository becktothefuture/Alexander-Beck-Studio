# Mode Specifications

Detailed specifications for each of the five simulation modes.

---

## Mode 1: Ball Pit 🎯

### Purpose
Classic gravity-based physics playground with satisfying collisions and mouse interaction.

### Physics Behavior (**Realistic Rubber Ball**)
- **Mass**: 120g (realistic bouncy ball weight - provides satisfying heft)
- **Gravity**: 1.15× Earth gravity (1960 px/s² × 1.15 - slightly enhanced for drama)
- **Restitution**: 0.80 (rubber balls return 75-85% of impact energy)
- **Air Drag**: 0.0045 (realistic air resistance for weighted feel)
- **Collisions**: Ball-to-ball (elastic with mass-aware response)
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
- Gravity multiplier (0.0 - 2.0x, realistic: 1.0-1.2x)
- Ball weight/mass (50-200g, realistic: 100-150g)
- Bounciness/restitution (0.0 - 1.0, realistic: 0.75-0.85)
- Air friction (0.000 - 0.010, realistic: 0.003-0.005)
- Emitter rate (0.01 - 0.1s)
- Repeller power & radius
- Ball softness (0-100)

---

## Mode 2: Flies to Light 🕊️

### Purpose
Realistic insect swarm simulation where balls mimic mosquitoes/gnats darting toward light (cursor).

### Physics Behavior (**Realistic Insect Flight**)
- **Speed**: 3.5× faster than original (insects are remarkably quick for their size)
- **Acceleration**: Very high (mosquitoes can accelerate at 50+ g's in bursts)
- **Attraction Power**: 5000 (strong pull toward cursor - insects dart aggressively to light)
- **Orbit Radius**: 180px (wider - insects don't cluster tightly)
- **Max Speed**: 2200 px/s × swarmSpeed (insects maintain high sustained velocity)
- **Gravity**: None (zero-G, insects fly in any direction)
- **Separation**: 120px radius (looser swarm - natural spacing)
- **Erratic Behavior**: 
  - 8% burst chance per frame (sudden random direction changes)
  - Strong constant jitter (insects never fly straight)
  - Chaotic orbital motion (unpredictable spiraling)
- **Damping**: 0.995 (minimal - insects maintain energy through wing beats)
- **Wall Bouncing**: Enabled to keep swarm in scene

### Spawning
- **Location**: Viewport center (idle swarm)
- **Method**: One-time initialization (60 flies)
- **Initial State**: Flies spawn in loose cluster with erratic movement patterns already active
- **Swarm Radius**: ~150px initial spread from center

### User Interaction
- **Mouse Cursor**: Acts as "light source" attracting swarm when mouse enters viewport
- **Keyboard**: Press `2` to activate mode
- **Idle Behavior**: When mouse is outside viewport, flies maintain realistic swarm behavior at center (darting, separation, erratic jitter)

### Visual Effects
- **Erratic Darting**: Sudden bursts and direction changes (like real insects)
- **No Collisions**: Balls pass through each other (performance optimization)
- **Chaotic Following**: Quick, unpredictable convergence on cursor
- **Natural Feel**: Mimics mosquito/gnat flight patterns accurately

### Canvas
- **Height**: 100svh (viewport-sized, no spawning above)
- **Viewport Top**: At y = 0 (canvas top = viewport top)

### Performance Characteristics
- **300 balls**: 60 FPS ✅
- **Better than Ball Pit**: No collision detection overhead
- **Bottleneck**: Attraction force calculations (O(n))

### Controls (Development Panel)
- Attraction power (100 - 8000, realistic insects: 4000-6000)
- Orbit radius (50 - 400px, realistic insects: 150-250)
- Swarm speed multiplier (0.2 - 5.0x, realistic insects: 2.5-4.0)

---

## Mode 3: Zero-G (Weightless Bounce) 🌌

### Purpose
Perpetual motion machine simulating realistic space physics with near-perfect energy conservation.

### Physics Behavior (**Realistic Space Physics**)
- **Initial Speed**: 250 px/s (slightly faster for visible perpetual motion)
- **Restitution**: 0.97 (very elastic, micro-imperfections like real objects)
- **Gravity**: None (zero-G - vacuum of space)
- **Air Drag**: 0.0001 (virtually zero - vacuum has minimal resistance)
- **Collisions**: Ball-to-ball (nearly perfect elastic)
- **Wall Bouncing**: All 4 walls with very high restitution (0.97)
- **Energy Conservation**: 97% retained per bounce - creates mesmerizing perpetual motion
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
- Initial speed (100 - 600 px/s, realistic space: 200-300)
- Bounce elasticity (0.8 - 1.0, realistic space: 0.95-0.98)
- Repeller power (0 - 800, subtle in zero-g)
- Repeller radius (50 - 300px)

---

## Mode 4: Pulse Grid 🎹

### Purpose
Choreographed rhythmic motion with synchronized pulsation patterns on a fixed grid.

### Physics Behavior
- **Gravity**: None (programmatic movement)
- **Collisions**: None (ghost through each other)
- **Movement**: Vertical jumping motion on fixed grid positions
- **Synchronization**: Configurable (0% = random, 100% = perfectly synchronized)
- **Jump Amplitude**: Configurable height (default: canvas height * 0.3)
- **Grid Layout**: Dynamic based on viewport size (~40 columns)

### Spawning
- **Location**: Distributed across entire viewport in grid formation
- **Method**: One-time initialization using Fisher-Yates shuffle for even distribution
- **Ball Count**: Configurable (default: 120 balls)
- **Initial State**: Balls at rest on grid with staggered jump times

### User Interaction
- **Mouse**: No direct interaction (autonomous choreography)
- **Keyboard**: Press `4` to activate mode
- **Reset**: Re-initializes grid with new random distribution

### Visual Effects
- **Rhythmic Pulsation**: Synchronized vertical jumps
- **Grid Precision**: Balls return to exact grid positions
- **Choreographed Beauty**: Emergent wave patterns from timing variations

### Canvas
- **Height**: 100svh (viewport-sized)
- **Viewport Top**: At y = 0

### Performance Characteristics
- **200+ balls**: 60 FPS ✅ (Excellent - no physics calculations)
- **Bottleneck**: None (simple programmatic motion)

### Controls (Development Panel)
- Ball count (20 - 300)
- Jump synchronicity (0% - 100%)
- Jump amplitude (10% - 80% of canvas height)
- Animation speed multiplier (0.2x - 3.0x)

---

## Mode 5: Vortex 🌀

### Purpose
Mesmerizing orbital mechanics simulation with dynamic gravity wells and 3D depth effects.

### Physics Behavior (**Orbital Mechanics**)
- **Gravity Wells**: Central well that follows mouse cursor (or stays centered when mouse outside)
- **Well Strength**: 5000 (configurable 1000-15000, creates stable orbital motion)
- **Orbit Decay**: 0.995 per frame (gradual energy loss creates spiral effect)
- **Initial Speed**: 180 px/s (orbital velocity calculated for stable circular motion)
- **Ball-to-Ball Collision**: None (performance optimization)
- **Wall Bouncing**: Yes (keeps balls contained)
- **Speed Coloring**: Disabled by default (balls maintain palette colors)

### Spawning
- **Location**: Circular ring around viewport center (15%-35% of canvas size)
- **Method**: One-time initialization with tangential velocity for stable orbits
- **Ball Count**: Configurable (default: 200 balls)
- **Initial Pattern**: Evenly distributed around ring with randomized radial positions
- **Orbital Velocity**: Calculated per-ball for circular orbit (v = sqrt(GM/r) with variation)

### User Interaction
- **Mouse Cursor**: Gravity well moves to cursor position when mouse enters canvas
- **Default Position**: Viewport center when mouse is outside canvas
- **Keyboard**: Press `5` to activate mode
- **Reset**: Re-initializes orbital ring with new random distribution

### Visual Effects
- **Orbital Motion**: Smooth spiraling trajectories around gravity well
- **3D Depth**: Speed-based perspective (faster = closer illusion)
- **Dynamic Center**: Vortex follows cursor creating interactive orbital patterns
- **Palette Colors**: Maintains theme colors (speed coloring disabled)

### Canvas
- **Height**: 100svh (viewport-sized)
- **Viewport Top**: At y = 0
- **Boundaries**: Walls enabled to contain orbital motion

### Performance Characteristics
- **200 balls**: 60 FPS ✅ (Excellent)
- **300 balls**: 58-60 FPS ✅
- **Bottleneck**: Gravity force calculations (O(n) per ball)
- **Optimization**: No collision detection, single gravity well

### Controls (Development Panel)
- Ball count (50 - 300)
- Well strength (1000 - 15000, affects orbital radius)
- Initial orbital speed (50 - 400 px/s)
- Orbit decay (0.98 - 1.0, higher = tighter spirals)
- Speed-based coloring toggle (disabled by default)

### Technical Notes
- **Inverse-Square Law**: Gravity force uses realistic F = G*M/r² calculation
- **Orbital Stability**: Initial velocities calculated for stable circular orbits
- **Dynamic Well**: Single gravity well updates position every frame based on mouse
- **Energy Conservation**: Minimal decay (99.5%) maintains long-term orbital motion

---

## Mode Comparison Matrix

| Feature | Ball Pit | Flies | Zero-G | Pulse Grid | Vortex |
|---------|----------|-------|---------|-----------|---------|
| **Gravity** | ✅ Yes | ❌ No | ❌ No | ❌ No | ⚡ Wells |
| **Ball-to-Ball Collision** | ✅ Yes | ❌ No | ✅ Yes | ❌ No | ❌ No |
| **Wall Collision** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| **Mouse Interaction** | Repeller | Attractor | Repeller | None | Gravity Well |
| **Spawning** | Continuous | One-time | One-time | One-time | One-time |
| **Canvas Height** | 150vh | 100svh | 100svh | 100svh | 100svh |
| **Energy Loss** | High (friction) | N/A | Minimal | N/A | Minimal (decay) |
| **Performance** | Good | Excellent | Good | Excellent | Excellent |

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

## Mode 5: Vortex Spiral 🌀

### Purpose
Mesmerizing orbital mechanics simulation where balls orbit around gravity wells, creating spiral galaxy patterns with mouse-controlled gravitational sculpting.

### Physics Behavior (**Orbital Mechanics**)
- **Gravity Wells**: Inverse-square gravitational attraction (F = GM/r²)
- **Central Well**: Fixed gravity well at canvas center (configurable strength)
- **Mouse Well**: Cursor creates temporary gravity well when over canvas
- **Orbital Velocity**: Balls maintain angular momentum, creating varied orbital paths
- **Orbital Decay**: Slight energy loss causes gradual spiral motion (positive=inward, negative=outward)
- **No World Gravity**: Only well-based gravitational forces apply
- **No Collisions**: Performance optimization (like Flies mode)
- **No Air Drag**: Minimal friction to preserve orbital motion

### Spawning
- **Location**: Circular ring around canvas center
- **Method**: One-time initialization (no continuous spawning)
- **Ball Count**: Default 200 balls (configurable 50-300)
- **Initial Velocity**: Tangential velocities for stable orbits with random variation
- **Distribution**: Evenly spaced angles with varied radial distances

### User Interaction
- **Mouse Gravity Well**: Cursor creates attractive force pulling nearby balls
- **Strength**: Configurable mouse well strength (0-10000)
- **Effect**: Balls curve toward mouse, can be captured into temporary orbits
- **No Clicking Required**: Passive attraction while mouse is over canvas
- **Keyboard**: Press `5` to activate mode

### Visual Effects
- **Speed-based coloring**: Dynamic color shift based on velocity (blue=slow, red=fast)
- **Mesmerizing patterns**: Emergent spiral and orbital behaviors
- **Figure-8 orbits**: Mouse well creates complex multi-body trajectories
- **Optional trails**: Motion blur effect (currently disabled by default)

### Canvas
- **Height**: 100svh (viewport-sized)
- **Viewport Top**: At y = 0 (standard 4-wall boundaries)
- **Edge Behavior**: Balls naturally stay near center due to gravity wells

### Performance Characteristics
- **200 balls**: 60 FPS ✅
- **250 balls**: 60 FPS ✅ 
- **300 balls**: 55-60 FPS ✅
- **Bottleneck**: Gravity force calculations O(n × w) where w = well count (typically 1-2)
- **Better than Ball Pit**: No collision detection overhead

### Controls (Development Panel)
- Central well strength (1000 - 15000, realistic: 4000-6000)
- Mouse well strength (0 - 10000, realistic: 2000-4000)
- Ball count (50 - 300)
- Initial speed (50 - 400 px/s, realistic: 150-250)
- Orbital decay (-0.001 to +0.001, positive=spiral in, negative=spiral out)
- Speed coloring (on/off - enables blue-to-red velocity gradient)

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Switch to Ball Pit |
| `2` | Switch to Flies |
| `3` | Switch to Zero-G |
| `4` | Switch to Pulse Grid |
| `5` | Switch to Vortex Spiral |
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

