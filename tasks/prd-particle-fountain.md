# PRD: Particle Fountain Simulation Mode

## Introduction

Create a new simulation mode where particles continuously emit from the bottom center of the viewport, rise upward with configurable spread and velocity, then shrink and fade out before being recycled back into the fountain. This mode emphasizes continuous particle emission with lifecycle management (shrink → fade → recycle), creating a visually striking fountain effect. Particles will have configurable lifetime, emission rate, spread angle, initial velocity, and fade/shrink timing.

## Goals

- Create a new "Particle Fountain" simulation mode accessible via mode switching
- Emit particles continuously from bottom center with configurable rate and spread
- Implement particle lifecycle: full size → shrink → fade out → recycle
- Recycle particles back to fountain source (no despawn, reuse existing balls)
- Provide configurable controls for emission rate, lifetime, velocity, spread, and timing
- Maintain 60 FPS performance with continuous emission and recycling
- Integrate seamlessly with existing mode system and rendering pipeline

## User Stories

### US-001: Add Particle Fountain mode constant and registration
**Description:** As a developer, I need the Particle Fountain mode registered in the mode system so it can be selected and initialized.

**Acceptance Criteria:**
- [ ] Add `PARTICLE_FOUNTAIN: 'particle-fountain'` to `MODES` object in `source/modules/core/constants.js`
- [ ] Add mode to `NARRATIVE_MODE_SEQUENCE` array (position to be determined, likely after bubbles or meteor-shower)
- [ ] Add mode entry to `NARRATIVE_CHAPTER_TITLES` with appropriate title (e.g., "PARTICLE FLOW")
- [ ] Import functions in `source/modules/modes/mode-controller.js`: `initializeParticleFountain`, `applyParticleFountainForces`, `updateParticleFountain`
- [ ] Register in `getForceApplicator()`: return `applyParticleFountainForces` when mode is `MODES.PARTICLE_FOUNTAIN`
- [ ] Register in `getModeUpdater()`: return `updateParticleFountain` when mode is `MODES.PARTICLE_FOUNTAIN`
- [ ] Add warmup frames case in `getWarmupFramesForMode()`: return `globals.particleFountainWarmupFrames ?? 10`
- [ ] Set gravity in `setMode()` when switching to Particle Fountain mode (disabled or upward)
- [ ] npm run build passes

### US-002: Create particle-fountain.js mode file
**Description:** As a developer, I need a new mode file following the existing pattern for Particle Fountain implementation.

**Acceptance Criteria:**
- [ ] Create `source/modules/modes/particle-fountain.js` with proper header comment (Swiss-grid box style)
- [ ] Import required modules: `getGlobals`, `clearBalls`, `getMobileAdjustedCount`, `Ball`, `pickRandomColorWithIndex`, `randomRadiusForMode`, `MODES`
- [ ] Export `initializeParticleFountain()` function (clears balls, initializes emission pool)
- [ ] Export `applyParticleFountainForces(ball, dt)` function (handles physics, lifecycle, recycling)
- [ ] Export `updateParticleFountain(dt)` function for emission timing and spawn logic
- [ ] Use module-level variable for emission timer: `let emissionTimer = 0`
- [ ] Follow existing mode file structure and code style (section headers with box-drawing characters)
- [ ] npm run build passes

### US-003: Implement continuous particle emission from bottom center
**Description:** As a user, I want particles to emit continuously from the bottom center of the viewport at a configurable rate.

**Acceptance Criteria:**
- [ ] Particles spawn from bottom center (x = canvas.width / 2, y = canvas.height - inset)
- [ ] Emission rate is configurable (particles per second, default 20-30)
- [ ] Emission timer tracks elapsed time using `dt` parameter in `updateParticleFountain(dt)`
- [ ] Spawn logic runs in `updateParticleFountain()` function (registered via `getModeUpdater()`)
- [ ] Initial particle pool is created during `initializeParticleFountain()` (pre-allocate for recycling)
- [ ] New particles are created from recycled pool or new balls if pool exhausted
- [ ] Use `randomRadiusForMode()` for ball sizing consistency
- [ ] Use `pickRandomColorWithIndex()` for colors, ensuring at least one of each color (0-7) in initial pool
- [ ] All positions and velocities are DPR-scaled
- [ ] npm run build passes

### US-004: Implement particle spread with configurable angle
**Description:** As a user, I want particles to spread outward from the fountain source with a configurable angle.

**Acceptance Criteria:**
- [ ] Particles have initial velocity with configurable spread angle (default 30-60 degrees from vertical)
- [ ] Spread angle is symmetric around vertical (e.g., 45° = ±22.5° from vertical)
- [ ] Initial velocity direction calculated as: `angle = (Math.random() - 0.5) * spreadAngle`
- [ ] Velocity magnitude is configurable (default 400-600 px/s, DPR-scaled)
- [ ] Vertical component (upward) is always positive: `vy = -velocity * Math.cos(angle)`
- [ ] Horizontal component: `vx = velocity * Math.sin(angle)`
- [ ] Velocity can have random variation (±10-20% for visual interest)
- [ ] npm run build passes

### US-005: Implement particle lifetime system
**Description:** As a user, I want particles to have a configurable lifetime before they start shrinking and fading.

**Acceptance Criteria:**
- [ ] Each particle tracks its age: `ball.age` (incremented in `Ball.step()` automatically)
- [ ] Lifetime is configurable per particle (default 2-4 seconds)
- [ ] Lifetime phases:
  1. **Active phase**: Full size, full opacity (age < lifetime * activeFraction, default 0.7)
  2. **Shrink phase**: Radius decreases (age between activeFraction and shrinkEndFraction, default 0.7-0.9)
  3. **Fade phase**: Alpha decreases, radius continues shrinking (age > shrinkEndFraction, default 0.9-1.0)
- [ ] Particle state stored on ball: `ball.lifetime`, `ball.startAge`, `ball.activeFraction`, `ball.shrinkEndFraction`
- [ ] Phase calculations use normalized age: `normalizedAge = (ball.age - ball.startAge) / ball.lifetime`
- [ ] npm run build passes

### US-006: Implement particle shrinking during decay phase
**Description:** As a user, I want particles to shrink smoothly as they approach the end of their lifetime.

**Acceptance Criteria:**
- [ ] Particle radius shrinks from `baseRadius` to `minRadius` (configurable, default 10-20% of base)
- [ ] Shrinking happens during shrink phase and continues through fade phase
- [ ] Radius interpolation: `currentRadius = baseRadius * (1 - shrinkProgress * (1 - minRadiusFraction))`
- [ ] `shrinkProgress` calculated as: `Math.max(0, Math.min(1, (normalizedAge - activeFraction) / (shrinkEndFraction - activeFraction)))`
- [ ] Smooth interpolation using easing (ease-out for natural decay)
- [ ] Update both `ball.r` and `ball.rBase` to maintain consistency
- [ ] Store `ball.baseRadius` at spawn for reference
- [ ] Min radius fraction is configurable (default 0.1-0.2, meaning 10-20% of original size)
- [ ] npm run build passes

### US-007: Implement particle alpha fading during decay phase
**Description:** As a user, I want particles to fade out smoothly as they shrink, creating a smooth disappearance effect.

**Acceptance Criteria:**
- [ ] Particle alpha starts at 1.0 and fades to 0.0 during fade phase
- [ ] Alpha interpolation: `alpha = 1 - fadeProgress` where `fadeProgress` is normalized fade phase
- [ ] Fade phase starts at `shrinkEndFraction` and completes at lifetime end (normalized age = 1.0)
- [ ] Alpha calculation: `ball.alpha = Math.max(0, Math.min(1, 1 - ((normalizedAge - shrinkEndFraction) / (1 - shrinkEndFraction))))`
- [ ] Alpha is set in `applyParticleFountainForces()` and used by renderer automatically (via `ball.alpha * filterOpacity`)
- [ ] Smooth fade using linear interpolation (no easing needed - fade should be consistent)
- [ ] Alpha reset to 1.0 when particle is recycled
- [ ] npm run build passes

### US-008: Implement particle recycling system
**Description:** As a user, I want particles to be recycled back into the fountain after they complete their lifecycle (no despawn, reuse balls).

**Acceptance Criteria:**
- [ ] Particles are recycled when `normalizedAge >= 1.0` (lifetime complete)
- [ ] Recycling function `recycleParticle(ball)` resets particle to bottom center with new properties
- [ ] Reset position: `ball.x = canvas.width / 2`, `ball.y = canvas.height - inset`
- [ ] Reset velocity: new random spread angle and magnitude based on config
- [ ] Reset radius: `ball.r = ball.baseRadius = randomRadiusForMode(...)`, `ball.rBase = ball.r`
- [ ] Reset alpha: `ball.alpha = 1.0`
- [ ] Reset age: `ball.age = 0`, `ball.startAge = 0`
- [ ] Assign new lifetime: `ball.lifetime = baseLifetime * (0.8 + Math.random() * 0.4)` (±20% variation)
- [ ] Optionally assign new color: `ball.color = pickRandomColor()`, `ball.distributionIndex = ...`
- [ ] Mark particle as active: `ball.isParticleFountain = true`
- [ ] Recycling happens in `applyParticleFountainForces()` when lifecycle completes
- [ ] npm run build passes

### US-009: Implement upward force with optional gravity override
**Description:** As a user, I want particles to rise upward naturally, with optional gravity or custom upward force.

**Acceptance Criteria:**
- [ ] Gravity is disabled when Particle Fountain mode is active (or reversed for upward motion)
- [ ] In `setMode()` when mode is `MODES.PARTICLE_FOUNTAIN`: set `globals.gravityMultiplier = 0.0` (or negative for reverse)
- [ ] Optional upward force can be applied in `applyParticleFountainForces()` (buoyancy-style, configurable)
- [ ] Upward force is optional and configurable (default: rely on initial velocity only, or add slight upward force)
- [ ] Particles naturally slow down due to drag (existing drag system in `Ball.step()`)
- [ ] Velocity can be adjusted during lifecycle if needed (e.g., reduce speed during fade phase)
- [ ] npm run build passes

### US-010: Add Particle Fountain configuration controls
**Description:** As a user, I want to adjust Particle Fountain parameters via the control panel.

**Acceptance Criteria:**
- [ ] Add `particleFountain` section to `CONTROL_SECTIONS` in `source/modules/ui/control-registry.js`
- [ ] Add controls following existing pattern:
  - `particleFountainEmissionRate`: range 5-100, default 25, format 'X particles/s', step 1
  - `particleFountainLifetime`: range 1.0-8.0s, default 3.0s, format 'X.Xs', step 0.1
  - `particleFountainInitialVelocity`: range 200-1200, default 500, format 'Xpx/s', step 50
  - `particleFountainSpreadAngle`: range 10-120, default 45, format 'X°', step 5
  - `particleFountainActiveFraction`: range 0.4-0.9, default 0.7, format 'X.X', step 0.05
  - `particleFountainShrinkEndFraction`: range 0.7-0.95, default 0.9, format 'X.X', step 0.05
  - `particleFountainMinRadiusFraction`: range 0.05-0.5, default 0.15, format 'X.X', step 0.05
  - `particleFountainUpwardForce`: range 0-800, default 0, format 'Xpx/s²', step 50 (optional buoyancy)
  - `particleFountainMaxParticles`: range 20-300, default 100, format 'X particles', step 10
  - `particleFountainWarmupFrames`: range 0-30, default 10, format 'X frames'
- [ ] Controls use proper `parse` functions (parseFloat for decimals, parseInt for integers)
- [ ] Controls are accessible in settings panel when Particle Fountain mode is active
- [ ] npm run build passes

### US-011: Add Particle Fountain state configuration
**Description:** As a developer, I need state variables for Particle Fountain configuration.

**Acceptance Criteria:**
- [ ] Add Particle Fountain config properties to `source/modules/core/state.js` defaults object:
  - `particleFountainEmissionRate: 25` (particles per second)
  - `particleFountainLifetime: 3.0` (seconds)
  - `particleFountainInitialVelocity: 500` (px/s)
  - `particleFountainSpreadAngle: 45` (degrees)
  - `particleFountainActiveFraction: 0.7` (fraction of lifetime at full size/opacity)
  - `particleFountainShrinkEndFraction: 0.9` (fraction of lifetime when shrinking ends, fade begins)
  - `particleFountainMinRadiusFraction: 0.15` (minimum radius as fraction of base radius)
  - `particleFountainUpwardForce: 0` (optional upward force in px/s², 0 = disabled)
  - `particleFountainMaxParticles: 100` (maximum active particles before throttling emission)
  - `particleFountainWarmupFrames: 10`
- [ ] Add config parsing in `initState()` function using `parseFloat()` for decimals, `parseInt()` for integers
- [ ] Add to `source/config/default-config.json` with same default values
- [ ] npm run build passes

### US-012: Implement particle pool management
**Description:** As a developer, I want efficient particle management with a pre-allocated pool for recycling.

**Acceptance Criteria:**
- [ ] Initial pool size matches `particleFountainMaxParticles` (or slightly larger for buffer)
- [ ] Pool is created in `initializeParticleFountain()` with all particles at bottom center (inactive)
- [ ] Particles are marked with `ball.isParticleFountain = true` for mode identification
- [ ] Particles start with `ball.age = ball.lifetime` (already "dead") so they're ready to recycle immediately
- [ ] Emission logic activates particles from pool rather than creating new balls
- [ ] If pool is exhausted, new particles can be created dynamically (shouldn't happen with proper max limit)
- [ ] Recycling reuses existing ball objects (no array manipulation, just property resets)
- [ ] npm run build passes

### US-013: Verify particle lifecycle rendering
**Description:** As a user, I want to see particles smoothly shrink and fade out before recycling.

**Acceptance Criteria:**
- [ ] Particles render at full size and opacity during active phase
- [ ] Particles smoothly shrink during shrink phase (radius decreases)
- [ ] Particles fade out during fade phase (alpha decreases to 0)
- [ ] Shrinking and fading are smooth (no jumps or stuttering)
- [ ] Particles recycle immediately when lifecycle completes (no visual artifacts)
- [ ] All particles maintain consistent behavior throughout their lifecycle
- [ ] Verify in browser - particles should create a smooth fountain effect
- [ ] npm run build passes

## Functional Requirements

- FR-1: Particle Fountain mode must be selectable via mode switching (settings panel or arrow keys)
- FR-2: Particles must emit continuously from bottom center of viewport
- FR-3: Emission rate must be configurable (particles per second, default 25)
- FR-4: Particles must have configurable spread angle (default 45°)
- FR-5: Particles must have configurable initial velocity (default 500 px/s)
- FR-6: Particles must have configurable lifetime (default 3.0s)
- FR-7: Particles must shrink from base radius to min radius during decay phase
- FR-8: Particles must fade from alpha 1.0 to 0.0 during fade phase
- FR-9: Particles must recycle (reuse) back to fountain source after lifecycle completes
- FR-10: Maximum particle count must be enforced (configurable, default 100)
- FR-11: All configuration parameters must be adjustable via control panel
- FR-12: Mode must maintain 60 FPS with continuous emission and recycling
- FR-13: Mode must integrate with existing rendering pipeline (alpha support already exists)
- FR-14: Particles must respect DPR scaling for consistent behavior across devices

## Non-Goals (Out of Scope)

- No ball-to-ball collisions (focus on fountain emission and lifecycle)
- No cursor interaction (particles emit independently)
- No wall collisions (particles can go off-screen, they'll recycle naturally)
- No sound effects specific to fountain mode (uses existing collision sounds if collisions enabled)
- No visual effects beyond shrink/fade (no trails, particles, etc.)
- No automatic mode switching or transitions
- No mobile-specific optimizations beyond existing system (mobile count reduction via `getMobileAdjustedCount()`)
- No collision detection with walls (particles are ephemeral, recycle before hitting walls)

## Design Considerations

- Mode should feel fluid and continuous (fountain effect)
- Particle lifecycle should be visually smooth (shrink → fade transitions)
- Emission should feel natural (random spread, velocity variation)
- Reuse ball objects efficiently (no despawn/spawn overhead)
- Particles should create a pleasing upward flow pattern
- Mode icon: ⛲ (fountain emoji) or 💫 (sparkles emoji)

## Technical Considerations

- Use `getMobileAdjustedCount()` for max particles to respect mobile limits
- Use `randomRadiusForMode(g, MODES.PARTICLE_FOUNTAIN)` for consistent sizing
- Use `pickRandomColorWithIndex()` ensuring initial pool has one of each color (0-7)
- Create balls with `new Ball(x, y, r, color)` during initialization
- Mark particles with `ball.isParticleFountain = true` for mode-specific handling
- Use `ball.age` (incremented automatically in `Ball.step()`) for lifetime tracking
- Set `ball.startAge = 0` at spawn for relative age calculation
- Alpha rendering uses existing `ball.alpha` property (handled automatically in renderer)
- Radius updates via `ball.r` and `ball.rBase` (both must be updated for consistency)
- Recycling resets ball properties (position, velocity, radius, alpha, age, lifetime)
- Emission timer uses `dt` accumulation in `updateParticleFountain(dt)` (frame-based, not wall-clock)
- Register `updateParticleFountain` via `getModeUpdater()` in `mode-controller.js`
- Gravity disabled in `setMode()` when mode is active: `globals.gravityMultiplier = 0.0`
- All positions, velocities, and distances must be DPR-scaled for consistent behavior
- Particle pool pre-allocation prevents per-frame allocations (performance optimization)
- Lifecycle phases use normalized age (0-1) for smooth interpolation

## Lifecycle Phase Details

### Phase 1: Active (0.0 - activeFraction, default 0.0 - 0.7)
- Full radius: `ball.r = ball.baseRadius`
- Full opacity: `ball.alpha = 1.0`
- Normal physics (velocity, drag, optional upward force)

### Phase 2: Shrink (activeFraction - shrinkEndFraction, default 0.7 - 0.9)
- Radius decreases: `ball.r = baseRadius * (1 - shrinkProgress * (1 - minRadiusFraction))`
- Full opacity: `ball.alpha = 1.0`
- Shrink progress: `shrinkProgress = (normalizedAge - activeFraction) / (shrinkEndFraction - activeFraction)`
- Smooth easing: use ease-out curve for natural decay

### Phase 3: Fade (shrinkEndFraction - 1.0, default 0.9 - 1.0)
- Radius continues to shrink: `ball.r = baseRadius * minRadiusFraction` (or continue shrinking)
- Opacity fades: `ball.alpha = 1 - fadeProgress`
- Fade progress: `fadeProgress = (normalizedAge - shrinkEndFraction) / (1 - shrinkEndFraction)`
- Linear interpolation (consistent fade rate)

### Phase 4: Recycle (normalizedAge >= 1.0)
- Particle is recycled immediately: `recycleParticle(ball)`
- Reset all properties and return to bottom center
- Assign new lifetime, velocity, color (optional)

## Success Metrics

- Particles emit continuously from bottom center at configurable rate
- Particles smoothly shrink and fade during lifecycle
- Particles recycle without visible artifacts (no pops or jumps)
- Simulation maintains 60 FPS with 100 active particles
- All configuration parameters work via control panel
- Mode integrates seamlessly with existing mode switching
- No performance degradation after extended running
- Particle pool efficiently reuses ball objects (no memory leaks)

## Open Questions

- Should particles have random color changes on recycle, or maintain color?
- Should upward force be applied (buoyancy-style) or rely solely on initial velocity?
- Should particles have collisions with each other (probably not, focus on fountain effect)?
- Should emission rate throttle if max particles reached, or just stop emitting?
- Should particles have slight horizontal drift during lifecycle (wind effect)?
- Should shrink/fade phases have configurable easing curves, or keep simple linear/ease-out?
