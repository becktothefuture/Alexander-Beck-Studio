# PRD: Meteor Shower Simulation Mode

## Introduction

Create a new simulation mode where balls spawn from the top of the viewport at random intervals and fall with high velocity, creating dramatic wall deformations on impact. Balls despawn immediately after hitting the bottom wall, creating a continuous "meteor shower" effect. This mode emphasizes high-impact collisions with the wall system, using high-mass balls to create visually striking wall deformations.

## Goals

- Create a new "Meteor Shower" simulation mode accessible via mode switching
- Spawn balls from the top at random intervals with high initial velocity
- Use high-mass balls (5-10x normal) to create dramatic wall deformations
- Despawn balls immediately after hitting the bottom wall
- Provide configurable controls for spawn rate, velocity, mass, and other parameters
- Maintain 60 FPS performance with continuous spawning
- Integrate seamlessly with existing mode system and wall deformation

## User Stories

### US-001: Add Meteor Shower mode constant and registration
**Description:** As a developer, I need the Meteor Shower mode registered in the mode system so it can be selected and initialized.

**Acceptance Criteria:**
- [ ] Add `METEOR_SHOWER: 'meteor-shower'` to `MODES` object in `source/modules/core/constants.js`
- [ ] Add mode to `NARRATIVE_MODE_SEQUENCE` array (position to be determined, likely after weightless or ping-pong)
- [ ] Add mode entry to `NARRATIVE_CHAPTER_TITLES` with appropriate title (e.g., "METEOR IMPACT")
- [ ] Import functions in `source/modules/modes/mode-controller.js`: `initializeMeteorShower`, `applyMeteorShowerForces`, `updateMeteorShower`
- [ ] Register in `getModeForces()`: return `applyMeteorShowerForces` when mode is `MODES.METEOR_SHOWER`
- [ ] Register in `getModeUpdater()`: return `updateMeteorShower` when mode is `MODES.METEOR_SHOWER`
- [ ] Add warmup frames case in `getWarmupFramesForMode()`: return `globals.meteorShowerWarmupFrames ?? 10`
- [ ] Set gravity multiplier in `setMode()` when switching to Meteor Shower mode
- [ ] npm run build passes

### US-002: Create meteor-shower.js mode file
**Description:** As a developer, I need a new mode file following the existing pattern for Meteor Shower implementation.

**Acceptance Criteria:**
- [ ] Create `source/modules/modes/meteor-shower.js` with proper header comment (Swiss-grid box style)
- [ ] Import required modules: `getGlobals`, `clearBalls`, `getMobileAdjustedCount`, `Ball`, `pickRandomColorWithIndex`, `randomRadiusForMode`, `MODES`
- [ ] Export `initializeMeteorShower()` function (clears balls, initializes spawn timer)
- [ ] Export `applyMeteorShowerForces(ball, dt)` function (can be no-op if only gravity handles motion)
- [ ] Export `updateMeteorShower(dt)` function for spawn logic and despawn detection
- [ ] Use module-level variable for spawn timer: `let spawnTimer = 0`
- [ ] Follow existing mode file structure and code style (section headers with box-drawing characters)
- [ ] npm run build passes

### US-003: Implement ball spawning from top with random intervals
**Description:** As a user, I want balls to spawn from the top of the viewport at random intervals to create a natural meteor shower effect.

**Acceptance Criteria:**
- [ ] Balls spawn from random X positions at the top of the viewport (y = 0 + margin, accounting for wall inset)
- [ ] Spawn intervals are random between configurable min and max (default 0.3-1.2s)
- [ ] Spawn timer tracks elapsed time using `dt` parameter in `updateMeteorShower(dt)`
- [ ] Maximum active ball count is enforced using `getMobileAdjustedCount()` pattern
- [ ] Spawn logic runs in `updateMeteorShower()` function (registered via `getModeUpdater()`)
- [ ] Use `randomRadiusForMode()` for ball sizing consistency
- [ ] Use `pickRandomColorWithIndex()` for colors, ensuring at least one of each color (0-7) for first 8 balls
- [ ] All positions and velocities are DPR-scaled
- [ ] npm run build passes

### US-004: Set high initial velocity for falling balls
**Description:** As a user, I want balls to fall with high velocity to create dramatic impacts.

**Acceptance Criteria:**
- [ ] Newly spawned balls have high downward velocity (configurable, default 1000 px/s, DPR-scaled)
- [ ] Initial velocity can have slight random variation (±20% for visual interest)
- [ ] Velocity is DPR-scaled: `const v0 = (g.meteorShowerInitialVelocity || 1000) * DPR`
- [ ] Horizontal velocity component is minimal or zero (pure downward fall)
- [ ] Set `ball.vy = v0 * (0.8 + Math.random() * 0.4)` for variation
- [ ] Set `ball.vx = 0` or minimal random drift
- [ ] npm run build passes

### US-005: Apply high mass to balls for dramatic wall deformation
**Description:** As a user, I want balls to have high mass so they create dramatic wall deformations on impact.

**Acceptance Criteria:**
- [ ] All balls in Meteor Shower mode have mass 5-10x normal (configurable multiplier)
- [ ] Mass is set during ball creation: `ball.m = globals.MASS_BASELINE_KG * (g.meteorShowerMassMultiplier || 7.0)`
- [ ] Mass multiplier is configurable via control panel (default 7.0, range 3.0-12.0)
- [ ] Mass affects impact intensity calculations (existing `Ball.walls()` system handles this automatically)
- [ ] Mark balls with `ball.isMeteor = true` for mode-specific handling if needed
- [ ] npm run build passes

### US-006: Enable gravity for falling motion
**Description:** As a user, I want balls to fall naturally under gravity to create realistic meteor behavior.

**Acceptance Criteria:**
- [ ] Gravity is enabled when Meteor Shower mode is active
- [ ] Gravity multiplier is configurable (default 1.8x normal for faster falling)
- [ ] In `setMode()` when mode is `MODES.METEOR_SHOWER`: set `globals.gravityMultiplier = g.meteorShowerGravityMultiplier || 1.8`
- [ ] Ensure `globals.G` is non-zero (gravity enabled by default, multiplier adjusts strength)
- [ ] Balls accelerate downward naturally via existing gravity system in `Ball.step()`
- [ ] In `setMode()` when switching away: restore previous gravity multiplier
- [ ] npm run build passes

### US-007: Despawn balls after hitting bottom wall
**Description:** As a user, I want balls to disappear after hitting the bottom to maintain performance and visual clarity.

**Acceptance Criteria:**
- [ ] Balls are removed from `globals.balls` array when they hit the bottom wall
- [ ] Despawn detection happens in `updateMeteorShower()` by checking `ball.y > canvas.height - inset`
- [ ] Despawn occurs immediately on bottom wall contact (no bounce, no wall collision registration)
- [ ] Use efficient array removal: `globals.balls = globals.balls.filter(b => b.y <= canvas.height - inset)`
- [ ] Ball count stays within configured maximum (enforced by spawn logic)
- [ ] npm run build passes

### US-008: Add Meteor Shower configuration controls
**Description:** As a user, I want to adjust Meteor Shower parameters via the control panel.

**Acceptance Criteria:**
- [ ] Add `meteorShower` section to `CONTROL_SECTIONS` in `source/modules/ui/control-registry.js`
- [ ] Add controls following existing pattern:
  - `meteorShowerMaxBalls`: range 10-80, default 30, type 'range'
  - `meteorShowerSpawnMinInterval`: range 0.1-1.0s, default 0.3s, step 0.05, format 'X.XXs'
  - `meteorShowerSpawnMaxInterval`: range 0.5-3.0s, default 1.2s, step 0.1, format 'X.Xs'
  - `meteorShowerInitialVelocity`: range 400-2000, default 1000, format 'Xpx/s'
  - `meteorShowerMassMultiplier`: range 3.0-12.0, default 7.0, step 0.5, format 'X.Xx'
  - `meteorShowerGravityMultiplier`: range 0.5-3.0, default 1.8, step 0.1, format 'X.Xx'
  - `meteorShowerWarmupFrames`: range 0-30, default 10, format 'X frames'
- [ ] Controls use proper `parse` functions (parseFloat for decimals, parseInt for integers)
- [ ] Controls are accessible in settings panel when Meteor Shower mode is active
- [ ] npm run build passes

### US-009: Add Meteor Shower state configuration
**Description:** As a developer, I need state variables for Meteor Shower configuration.

**Acceptance Criteria:**
- [ ] Add Meteor Shower config properties to `source/modules/core/state.js` defaults object:
  - `meteorShowerMaxBalls: 30`
  - `meteorShowerSpawnMinInterval: 0.3` (seconds)
  - `meteorShowerSpawnMaxInterval: 1.2` (seconds)
  - `meteorShowerInitialVelocity: 1000` (px/s)
  - `meteorShowerMassMultiplier: 7.0`
  - `meteorShowerGravityMultiplier: 1.8`
  - `meteorShowerWarmupFrames: 10`
- [ ] Add config parsing in `initState()` function using `parseFloat()` for decimals, `parseInt()` for integers
- [ ] Add to `source/config/default-config.json` with same default values
- [ ] npm run build passes

### US-010: Verify dramatic wall deformation
**Description:** As a user, I want to see dramatic wall deformations when meteors hit the walls.

**Acceptance Criteria:**
- [ ] Wall deformations are significantly larger than normal modes
- [ ] Impact intensity scales with ball mass and velocity
- [ ] Multiple simultaneous impacts create cascading wall ripples
- [ ] Wall deformation settings may need adjustment (lower stiffness, higher max deform)
- [ ] Verify in browser - walls should visibly deform on meteor impacts
- [ ] npm run build passes

## Functional Requirements

- FR-1: Meteor Shower mode must be selectable via mode switching (settings panel or arrow keys)
- FR-2: Balls must spawn from the top of the viewport at random X positions
- FR-3: Spawn intervals must be random between configurable min and max values
- FR-4: Newly spawned balls must have high downward velocity (configurable, default 800-1200 px/s)
- FR-5: All balls must have mass 5-10x normal (configurable multiplier, default 7x)
- FR-6: Gravity must be enabled and stronger than normal (configurable multiplier, default 1.8x)
- FR-7: Balls must despawn immediately upon hitting the bottom wall
- FR-8: Maximum active ball count must be enforced (configurable, default 30)
- FR-9: Wall impacts must create dramatic deformations due to high mass and velocity
- FR-10: All configuration parameters must be adjustable via control panel
- FR-11: Mode must maintain 60 FPS with continuous spawning
- FR-12: Mode must integrate with existing wall deformation system

## Non-Goals (Out of Scope)

- No ball-to-ball collisions (focus on wall impacts only)
- No cursor interaction (meteors fall independently)
- No sound effects specific to meteor mode (uses existing collision sounds)
- No visual effects beyond wall deformation (no trails, particles, etc.)
- No automatic mode switching or transitions
- No mobile-specific optimizations beyond existing system

## Design Considerations

- Mode should feel dramatic and impactful
- Wall deformations should be the primary visual focus
- Spawn rate should create a steady stream without overwhelming the system
- Ball colors should use existing palette system
- Mode icon: ☄️ (meteor emoji)

## Technical Considerations

- Use `getMobileAdjustedCount()` for ball count to respect mobile limits
- Use `randomRadiusForMode(g, MODES.METEOR_SHOWER)` for consistent sizing
- Use `pickRandomColorWithIndex()` ensuring first 8 balls get one of each color (0-7)
- Create balls directly with `new Ball(x, y, r, color)` rather than `spawnBall()` (spawnBall adds initial kick velocity we don't want)
- Mass is set via `ball.m = globals.MASS_BASELINE_KG * multiplier` (affects existing impact calculations)
- Gravity is controlled via `globals.gravityMultiplier` and `globals.G` in `setMode()` function
- Wall deformation intensity is calculated automatically from ball mass and velocity in `Ball.walls()`
- Spawn timer should use `dt` accumulation in `updateMeteorShower(dt)` (frame-based, not wall-clock)
- Register `updateMeteorShower` via `getModeUpdater()` in `mode-controller.js`
- Despawn logic should efficiently remove balls using `filter()` (creates new array, acceptable for low-frequency operation)
- All positions, velocities, and distances must be DPR-scaled for consistent behavior
- Mark balls with `ball.isMeteor = true` if mode-specific handling is needed
- Wall deformation uses existing system - no mode-specific settings needed (high mass/velocity creates dramatic effect automatically)

## Success Metrics

- Balls spawn continuously from top at random intervals
- Wall deformations are visibly dramatic (2-3x larger than normal modes)
- Simulation maintains 60 FPS with 30 active balls
- All configuration parameters work via control panel
- Mode integrates seamlessly with existing mode switching
- No performance degradation after extended running

## Open Questions

- Should balls bounce off side walls before despawning, or despawn on any wall contact?
- Should spawn rate adapt based on performance (fewer meteors if FPS drops)?
- Should there be a "meteor size" variation (some larger/smaller meteors)?
- Should wall deformation settings be mode-specific or use global settings?
