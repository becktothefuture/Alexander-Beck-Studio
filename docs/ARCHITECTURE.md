# Architecture Documentation

## System Overview

The bouncy balls simulation is a high-performance particle physics system built with vanilla JavaScript and Canvas API.

## Core Components

### Physics Engine

```javascript
class Ball {
  // Position and velocity
  x, y, vx, vy
  
  // Physical properties
  r     // radius
  m     // mass
  color // hex color
  
  // Advanced physics
  omega              // angular velocity
  squash            // deformation amount
  squashNormalAngle // deformation direction
}
```

### Collision Detection

**Spatial Hashing Algorithm**
- Grid-based broad phase
- O(n) average case complexity
- Cell size: 2 * maxRadius

**Collision Response**
- Elastic collisions with restitution
- Angular momentum conservation
- Squash deformation on impact

### Rendering Pipeline

1. **Clear/Fade** - Trail effect via partial clear
2. **Draw Walls** - Optional rounded corners
3. **Draw Balls** - With squash deformation
4. **Draw Cursor** - Mode-specific visualization

### Performance Optimizations

- Fixed timestep physics (120Hz)
- Render on demand (60 FPS target)
- Automatic quality scaling for mobile
- Efficient memory pooling (no GC pressure)

## Mode System

Three distinct physics modes:

### Ball Pit (Mode 1)
- Gravity: 1.1x Earth
- Wall bouncing with friction
- Optional cursor repeller
- Continuous top emitter

### Flies to Light (Mode 2)
- Zero gravity
- Strong cursor attraction
- Swarm behavior with jitter
- Orbital motion dynamics
- Continuous top emitter

### Weightless (Mode 3 / Zero-G)
- Zero gravity
- Perfect elastic wall collisions (all 4 walls)
- Ball-to-ball collisions enabled
- Even grid distribution at init
- Perpetual motion

## Configuration System

### Build-Time Configuration
```javascript
const CONFIG = {
  gravityMultiplier: 1.1,
  restitution: 0.88,
  friction: 0.003,
  ballMass: 11.2,
  // ... more settings
};
```

### Runtime Controls
- Development panel for real-time tuning
- Save/load configuration system
- Preset templates for quick setup

## Integration

### Webflow Embed
```html
<div id="bravia-balls">
  <canvas id="c"></canvas>
</div>
<script src="js/bouncy-balls-embed.js"></script>
```

### Responsive Handling
- Canvas scales to device pixel ratio
- Touch events for mobile interaction
- Automatic performance throttling

## Future Enhancements

### WebGL Renderer
- 10x particle capacity
- GPU-accelerated physics
- Advanced visual effects

### Web Workers
- Offload physics calculations
- Maintain 60 FPS with 10k+ particles
- Better battery efficiency

### WebAssembly
- Near-native collision detection
- Complex fluid dynamics
- Real-time soft body physics
