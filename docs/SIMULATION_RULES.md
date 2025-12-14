# Simulation Ground Rules & Design System

**Universal constraints and aesthetic principles governing all animation modes**

---

## Core Design Principles

### 1. Visual Minimalism
- **No gradients:** Solid fills only (CSS/canvas `fillStyle`)
- **No textures:** Pure mathematical forms (circles, no sprites)
- **No ornament:** Physics *is* the decoration
- **Shadow depth:** Single CSS `drop-shadow` filter on canvas element (adjustable offset/blur/opacity)
- **Color hierarchy:** Weighted distribution (50%/25%/15%/7.5%/2.5%/1%/1%/1%)

### 2. Color System Rules

#### Palette Structure
- **8 colors per theme** (indexed 0-7)
- **Light/dark variants** for each theme (time-based auto-switching 18:00→06:00)
- **CSS variable exposure:** `--ball-1` through `--ball-8` for page integration
- **Cursor color:** Fixed to Color 5 (highlight accent)

#### Current Palettes
1. **Industrial Teal** (default) - Cool grays + teal + warm accents
2. **Cobalt Spark** - Steel + electric blue + orange/magenta/gold
3. **Ember** - Charcoal + fire tones (red/orange/yellow)
4. **Mint** - Sage greens + earth neutrals
5. **Lilac** - Purple/pink spectrum + cool grays

#### Color Assignment
- **Weighted random:** Not uniform distribution—dominant colors appear 50% of time
- **Fixed cursor:** Always Color 5 regardless of palette
- **Mode inheritance:** All modes use current active palette

### 3. Physics Constants

#### Determinism
- **Fixed timestep:** 120Hz physics updates (`DT = 1/120`)
- **Accumulator pattern:** Handles variable frame rates (Safari 60fps, Chrome 120fps+)
- **Cross-browser consistency:** `dt` cap at 33ms prevents divergence

#### Universal Parameters
- **Gravity baseline:** 1960 px/s² (Earth-equivalent at canvas scale)
- **Ball mass baseline:** 19.8g (perceptual realism)
- **Softness range:** 0-100 (0=rigid billiards, 20=subtle, 100=gelatinous)
- **Size scale:** 0.1-6.0 multiplier (1.25 default)
- **Mobile responsive:** 40% size reduction below 768px viewport width

### 4. Viewport Boundaries

#### Canvas Dimensions
- **Standard modes:** 100svh (small viewport height)
- **Ball Pit exception:** 150vh container with 100svh visible crop (spawns balls above viewport)

#### Boundary Collisions
- **Ball Pit:** Balls collide with walls/floor (solid boundaries)
- **Flies:** No boundary collisions (endless space, respawns above on exit)
- **Zero-G:** Balls bounce off all edges (contained space)
- **Water:** Balls remain contained; mode adds drag + ripple dynamics

#### Collision Response
- **Restitution:** 0.0-1.0 (energy retention, 0.88 default)
- **Friction:** Air drag coefficient (0.003 default)
- **Positional correction:** 80% with 0.5px slop (prevents jitter)
- **Solver iterations:** 6 passes per physics step

### 5. Interaction Patterns

#### Mouse/Touch Input
- **Ball Pit:** Radial repulsion field (power/radius adjustable)
- **Flies:** Attraction point (swarm converges)
- **Zero-G:** Gentle perturbation (impulse on proximity)
- **Water:** No repeller by default (mode-specific motion + ripples)

#### Cursor Visualization
- **Always rendered:** Hollow circle at cursor position
- **Stroke only:** 2px width, Color 5 from palette
- **Radius:** Matches repeller/attractor field size
- **Touch devices:** Hidden (no cursor position)

### 6. Performance Guardrails

#### Ball Count Limits
- **Ball Pit:** 200 max (collision-heavy)
- **Flies:** 300 max (no collisions)
- **Zero-G:** 150 max (collision-heavy)
- **Water:** 300 max (drag + ripple updates)

#### Optimization Strategies
- **Spatial grid:** Broad-phase collision culling
- **Adaptive quality:** LOD system (planned, not yet implemented)
- **Shadow culling:** Canvas-level filter (GPU-accelerated)
- **requestAnimationFrame:** Vsync synchronization

### 7. Accessibility Requirements

#### Motion Sensitivity
- **`prefers-reduced-motion: reduce`:** Disable all animations gracefully
- **Alternative static state:** Show colored circles in grid formation

#### Screen Readers
- **ARIA labels:** Canvas element `aria-label="Interactive particle physics simulation"`
- **Live regions:** Mode changes announced via `aria-live="polite"`
- **Focus management:** Control panel keyboard navigable

#### Keyboard Controls
- **Mode switching:** Number keys 1-9
- **Reset:** R key
- **Panel toggle:** / key
- **Panel drag:** Mouse drag on header
- **Slider focus:** Tab navigation + arrow keys

---

## Kaleidoscope: Implementation Lessons (Performance + Feel)

- **Perceptual smoothness > “average FPS”**: avoid low-frequency “idle stepping” loops that update physics in bursts while rendering at 60fps (it reads as lag/jank).
- **Animate with envelopes**: drive most motion through a smoothed activity envelope (ramps up on recent pointer movement, decays to a tiny idle baseline) so idle stays calm and interaction feels organic.
- **Keep walls separate**: modes that are “pure mapping” should not participate in rubber-wall impact visuals; use simple bounds if containment is needed.

### 8. Configuration Persistence
Simulation settings persistence is disabled by default (`LOCALSTORAGE_ENABLED = false`).

Panel UI state (dock visibility/position/collapse) may persist via localStorage.

---

## Current Modes Analysis

### Mode 1: Ball Pit
**Strengths:** Visceral gravity feedback, satisfying collision sounds (implicit), repeller interaction
**Physics:** Gravity + elastic collisions + spatial grid + boundary walls
**Spawn:** All balls drop from above viewport simultaneously on mode entry
**Behavior:** Cascading avalanche → settling pile → occasional perturbations

### Mode 2: Flies
**Strengths:** Organic swarm behavior, emergent patterns, cursor attraction creates flow
**Physics:** Steering forces + orbit radius + no inter-ball collisions
**Spawn:** Continuous emission from top center (sweep pattern)
**Behavior:** Chaotic attraction → convergence near cursor → dispersion on exit

### Mode 3: Zero-G
**Strengths:** Clean elastic collisions, perpetual motion, contained system
**Physics:** No gravity + perfect restitution + boundary bounces
**Spawn:** Random positions with random velocities
**Behavior:** Billiard-like ricochets → rotational spin transfer → chaotic trajectories

### Mode 4: Water
**Strengths:** Dense, fluid-like motion, ripples, calm drift
**Physics:** Drag + mode-specific forces (no world gravity)
**Spawn:** Mode-specific initialization (high ball count)
**Behavior:** Slow drift → ripples on interactions → cohesive “swim” field

---

## New Mode Proposals

### Mode 5: Orbital Ballet 🪐

**Concept:** Multiple gravity wells create celestial mechanics — balls orbit attractors in stable/unstable trajectories, forming beautiful Kepler-esque patterns. Attractors slowly drift, causing orbital precession and occasional gravitational captures/escapes.

#### Physics Model
- **3-5 gravity wells:** Randomly positioned, varying mass (influences attraction strength)
- **Inverse square law:** F = G * (m1 * m2) / r² for each well
- **Orbital mechanics:** Balls achieve circular/elliptical orbits based on velocity
- **Well drift:** Attractors slowly move in Lissajous patterns (parametric curves)
- **Boundary:** Reflective walls (balls bounce if they escape attraction)

#### Visual Language
- **Attractor visualization:** Glowing cores (Color 5) with faint radial gradient pulses
- **Orbital trails:** Optional motion blur (subtle fade) showing trajectory paths
- **Velocity coloring:** Ball color intensity varies with speed (faster = brighter)
- **Capture events:** Brief scale pulse when ball enters stable orbit

#### Parameters
- `attractorCount`: 3-5 (number of gravity wells)
- `attractorMass`: 10000-50000 (attraction strength)
- `attractorDriftSpeed`: 0.1-1.0 (how fast wells move)
- `orbitStability`: 0.5-1.0 (higher = more circular orbits)
- `ballCount`: 100-150 (performance balanced)

#### Interaction
- **Cursor:** Creates temporary 6th attractor (strongest mass)
- **Click:** Spawns new ball at cursor with random velocity
- **Hold:** Increases attractor mass over time (stronger pull)

#### Unique Qualities
- **Never static:** Orbital precession means configurations never repeat
- **Educational:** Visualizes real physics concepts (Kepler's laws, three-body problem)
- **Meditative:** Smooth, flowing motion with no collisions (peaceful)
- **Surprising:** Occasional slingshot ejections create dramatic velocity changes

#### Technical Implementation
```javascript
// Pseudocode structure
const attractors = [
  { x, y, mass, driftPhase, driftFreq },
  // ... 2-4 more
];

function updateBall(ball) {
  // Sum gravitational forces from all attractors
  for (const attr of attractors) {
    const dx = attr.x - ball.x;
    const dy = attr.y - ball.y;
    const distSq = dx*dx + dy*dy;
    const force = (G * attr.mass * ball.m) / Math.max(distSq, MIN_DIST);
    const angle = Math.atan2(dy, dx);
    ball.fx += Math.cos(angle) * force;
    ball.fy += Math.sin(angle) * force;
  }
  
  // Update attractor positions (Lissajous drift)
  attr.x = centerX + radiusX * Math.sin(attr.driftPhase);
  attr.y = centerY + radiusY * Math.cos(attr.driftPhase * attr.driftFreq);
  attr.driftPhase += driftSpeed * dt;
}
```

---

### Mode 6: Kinetic Wave 〰️

**Concept:** Balls exist in a 2D grid formation but transmit kinetic energy to neighbors when disturbed. User clicks create epicenter ripples that propagate through the grid as wave interference patterns — combining, reflecting, and creating standing waves.

#### Physics Model
- **Spring lattice:** Each ball connected to 4-8 neighbors via virtual springs
- **Wave equation:** Classic 2D wave propagation (`∂²u/∂t² = c²∇²u`)
- **Damping:** Energy decay over time prevents infinite oscillation
- **Boundary modes:** Reflective (standing waves) or absorptive (no reflection)
- **Interference:** Overlapping waves add constructively/destructively

#### Visual Language
- **Grid arrangement:** Hexagonal or square lattice (tight spacing)
- **Amplitude → size:** Ball radius scales with displacement magnitude
- **Velocity → color:** Wavelength mapped to color spectrum (red=compression, blue=rarefaction)
- **Phase trails:** Subtle afterimage showing wave direction
- **Epicenter marker:** Expanding ring at click location

#### Parameters
- `gridSpacing`: 30-60px (determines wave resolution)
- `waveSpeed`: 500-2000 px/s (propagation velocity)
- `damping`: 0.85-0.99 (energy retention per frame)
- `springStiffness`: 0.1-1.0 (restoring force strength)
- `ballCount`: Based on grid density (typically 150-300)

#### Interaction
- **Click:** Creates impulse wave at click position (variable amplitude)
- **Drag:** Continuous wave source (moving epicenter)
- **Double-click:** Inverts phase at location (creates interference null)
- **Scroll:** Adjusts wave frequency in real-time

#### Unique Qualities
- **Hypnotic:** Mesmerizing interference patterns emerge from simple rules
- **Interactive causality:** User directly sees wave propagation and superposition
- **Educational:** Demonstrates Huygens principle, constructive/destructive interference
- **Emergent beauty:** Standing waves create mandala-like patterns

#### Technical Implementation
```javascript
// Pseudocode structure
class WaveBall extends Ball {
  constructor() {
    super();
    this.restX = x; // Equilibrium position
    this.restY = y;
    this.velocity = 0; // Displacement velocity
    this.displacement = 0; // Current offset from rest
    this.neighbors = []; // Connected balls
  }
}

function propagateWave(ball, dt) {
  // Calculate spring force from neighbors
  let forceX = 0, forceY = 0;
  for (const neighbor of ball.neighbors) {
    const dx = neighbor.x - ball.x;
    const dy = neighbor.y - ball.y;
    const dist = Math.hypot(dx, dy);
    const restDist = Math.hypot(neighbor.restX - ball.restX, neighbor.restY - ball.restY);
    const extension = dist - restDist;
    const force = SPRING_K * extension;
    forceX += (dx / dist) * force;
    forceY += (dy / dist) * force;
  }
  
  // Apply wave equation with damping
  ball.velocity += (forceX / ball.m) * dt;
  ball.velocity *= DAMPING;
  ball.displacement += ball.velocity * dt;
  
  // Update visual position (rest + displacement)
  ball.x = ball.restX + ball.displacement * Math.cos(ball.phase);
  ball.y = ball.restY + ball.displacement * Math.sin(ball.phase);
  
  // Map displacement to visual properties
  ball.r = BASE_RADIUS * (1 + Math.abs(ball.displacement) * 0.1);
  ball.color = velocityToColor(ball.velocity);
}

function createWaveImpulse(epicenterX, epicenterY, amplitude) {
  for (const ball of balls) {
    const dist = Math.hypot(ball.restX - epicenterX, ball.restY - epicenterY);
    // Gaussian falloff from epicenter
    const impact = amplitude * Math.exp(-dist * dist / (2 * RADIUS * RADIUS));
    ball.velocity += impact;
  }
}
```

#### Wave Modes Subset
- **Free oscillation:** No user input, self-sustaining standing waves
- **Pluck mode:** Single click creates decaying ripple
- **Continuous source:** Hold to create coherent wave train
- **Multi-source:** Multiple simultaneous epicenters create Moiré patterns

---

## Implementation Priority

### Immediate (Current Sprint)
- ✅ Four existing modes refined and optimized
- ✅ Dark mode with time-based switching
- ✅ Canvas shadow system
- ✅ Ball size uniformity

### Near-term (Next Quarter)
- 🎯 **Orbital Ballet** (Mode 5) - Leverage existing physics engine + gravity
- 🔧 Attractor system with drift
- 🔧 Orbital stability calculations
- 🔧 Cursor as temporary attractor

### Medium-term (6 months)
- 〰️ **Kinetic Wave** (Mode 6) - Requires spring lattice system
- 🔧 Grid connectivity graph
- 🔧 Wave equation solver
- 🔧 Interference visualization

### Long-term (Research)
- 🧪 WebGL migration for 1000+ particles
- 🧪 Audio-reactive variant (microphone input)
- 🧪 Multi-user collaborative canvas (WebSocket)
- 🧪 VR/AR spatial physics (WebXR)

---

## Quality Assurance Checklist

### Visual Consistency
- [ ] All modes use current active palette
- [ ] Cursor color fixed to Color 5
- [ ] Shadow settings apply uniformly
- [ ] Dark mode transitions smoothly (no flash)
- [ ] Ball sizes respect global scale setting

### Physics Determinism
- [ ] Same initial conditions → identical trajectories
- [ ] Fixed timestep prevents frame rate dependence
- [ ] Cross-browser consistency (Safari/Chrome/Firefox)
- [ ] Mobile behavior matches desktop (scaled appropriately)

### Performance Benchmarks
- [ ] 60 FPS sustained for 60 seconds
- [ ] No memory leaks (heap stable)
- [ ] CPU usage under 30% (single core)
- [ ] GPU compositing under 50ms per frame

### Accessibility Compliance
- [ ] Keyboard navigation functional
- [ ] Screen reader announcements accurate
- [ ] Motion sensitivity respected
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-31  
**Maintained By:** Alexander Beck Studio  
**Review Cycle:** Quarterly or per new mode addition

