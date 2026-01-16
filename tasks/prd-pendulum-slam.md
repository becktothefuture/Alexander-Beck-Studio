# PRD: Pendulum Slam Simulation Mode

## Introduction

Create a new simulation mode featuring a massive "wrecking ball" composed of many small balls that act as a cohesive unit. The ball is anchored at the top center of the viewport and swings like a pendulum from side to side, creating dramatic wall deformations on impact. The mouse cursor can push the pendulum to either side, adding interactive control. This mode emphasizes high-impact collisions with the wall system, using the composite ball's high mass and velocity to create visually striking wall deformations.

## Goals

- Create a new "Pendulum Slam" simulation mode accessible via mode switching
- Form a composite ball from many small balls that act as a cohesive unit
- Anchor the pendulum at the top center of the viewport
- Implement pendulum physics with gravity and swing motion
- Enable mouse interaction to push the pendulum left or right
- Create dramatic wall deformations on impact
- Provide configurable controls for ball count, mass, length, and other parameters
- Maintain 60 FPS performance with the composite ball structure
- Integrate seamlessly with existing mode system and wall deformation

## User Stories

### US-001: Add Pendulum Slam mode constant and registration
**Description:** As a developer, I need the Pendulum Slam mode registered in the mode system so it can be selected and initialized.

**Acceptance Criteria:**
- [ ] Add `PENDULUM_SLAM: 'pendulum-slam'` to `MODES` object in `source/modules/core/constants.js`
- [ ] Add mode to `NARRATIVE_MODE_SEQUENCE` array (position to be determined)
- [ ] Add mode entry to `NARRATIVE_CHAPTER_TITLES` with appropriate title (e.g., "PENDULUM SLAM")
- [ ] Import functions in `source/modules/modes/mode-controller.js`: `initializePendulumSlam`, `applyPendulumSlamForces`, `updatePendulumSlam`
- [ ] Register in `getModeForces()`: return `applyPendulumSlamForces` when mode is `MODES.PENDULUM_SLAM`
- [ ] Register in `getModeUpdater()`: return `updatePendulumSlam` when mode is `MODES.PENDULUM_SLAM`
- [ ] Add warmup frames case in `getWarmupFramesForMode()`: return `globals.pendulumSlamWarmupFrames ?? 10`
- [ ] Enable gravity in `setMode()` when switching to Pendulum Slam mode
- [ ] npm run build passes

### US-002: Create pendulum-slam.js mode file
**Description:** As a developer, I need a new mode file following the existing pattern for Pendulum Slam implementation.

**Acceptance Criteria:**
- [ ] Create `source/modules/modes/pendulum-slam.js` with proper header comment (Swiss-grid box style)
- [ ] Import required modules: `getGlobals`, `clearBalls`, `getMobileAdjustedCount`, `Ball`, `pickRandomColorWithIndex`, `randomRadiusForMode`, `MODES`
- [ ] Export `initializePendulumSlam()` function (crears balls, creates composite pendulum)
- [ ] Export `applyPendulumSlamForces(ball, dt)` function (handles pendulum physics and mouse interaction)
- [ ] Export `updatePendulumSlam(dt)` function (handles pendulum constraint and cohesion)
- [ ] Use module-level variables for anchor point and pendulum state
- [ ] Follow existing mode file structure and code style (section headers with box-drawing characters)
- [ ] npm run build passes

### US-003: Create composite ball from many small balls
**Description:** As a user, I want to see a large composite ball made of many small balls that acts as a cohesive unit.

**Acceptance Criteria:**
- [ ] Balls are arranged in a circular/hexagonal pattern to form a composite ball
- [ ] Ball count is configurable (default 40-60 balls for the composite)
- [ ] Use `randomRadiusForMode()` for individual ball sizing
- [ ] Use `pickRandomColorWithIndex()` ensuring first 8 balls get one of each color (0-7)
- [ ] All balls are marked with `ball.isPendulum = true` for mode-specific handling
- [ ] Composite ball has a defined center point
- [ ] Balls are tightly packed but don't overlap initially
- [ ] All positions are DPR-scaled
- [ ] npm run build passes

### US-004: Anchor pendulum at top center
**Description:** As a user, I want the pendulum anchored at the top center of the viewport.

**Acceptance Criteria:**
- [ ] Anchor point is at `(canvas.width/2, topMargin)` where topMargin accounts for wall inset
- [ ] Anchor point is stored in module-level variable
- [ ] Pendulum length is configurable (default 60-80% of viewport height)
- [ ] Initial pendulum angle is configurable (default slight offset, e.g., 15-30 degrees)
- [ ] Anchor point is DPR-scaled
- [ ] npm run build passes

### US-005: Implement pendulum physics with gravity
**Description:** As a user, I want the pendulum to swing naturally under gravity like a real wrecking ball.

**Acceptance Criteria:**
- [ ] Pendulum swings under gravity (gravity enabled in mode)
- [ ] Angular velocity is calculated based on gravity and pendulum length
- [ ] Pendulum angle updates based on angular velocity
- [ ] Angular damping is configurable (default 0.995-0.998 for slight damping)
- [ ] Physics calculations use DPR-scaled values
- [ ] Pendulum maintains its length (constraint enforced)
- [ ] npm run build passes

### US-006: Apply cohesion forces to keep balls together
**Description:** As a user, I want the composite ball to stay together as a unit even when swinging.

**Acceptance Criteria:**
- [ ] Cohesion forces are applied between neighboring balls in the composite
- [ ] Cohesion strength is configurable (default strong enough to maintain shape)
- [ ] Forces are applied in `applyPendulumSlamForces()` function
- [ ] Cohesion prevents balls from separating during swing
- [ ] Cohesion is relaxed enough to allow some flexibility but maintains unit structure
- [ ] npm run build passes

### US-007: Enforce pendulum constraint (maintain length)
**Description:** As a user, I want the pendulum to maintain its length as it swings.

**Acceptance Criteria:**
- [ ] Pendulum constraint is enforced in `updatePendulumSlam()` function
- [ ] Center of mass of composite ball is calculated
- [ ] Distance from anchor to center of mass is maintained at pendulum length
- [ ] Balls are repositioned to maintain constraint while preserving relative positions
- [ ] Constraint is applied smoothly to avoid jitter
- [ ] npm run build passes

### US-008: Enable mouse interaction to push pendulum
**Description:** As a user, I want to push the pendulum left or right with my mouse cursor.

**Acceptance Criteria:**
- [ ] Mouse cursor applies force to the composite ball when within range
- [ ] Force direction is from cursor to center of composite ball
- [ ] Force strength is configurable (default moderate, enough to influence swing)
- [ ] Force has a maximum range (configurable cursor influence radius)
- [ ] Force is applied in `applyPendulumSlamForces()` function
- [ ] Mouse interaction feels responsive but doesn't break pendulum physics
- [ ] npm run build passes

### US-009: Set high mass for dramatic wall deformation
**Description:** As a user, I want the composite ball to have high mass so it creates dramatic wall deformations on impact.

**Acceptance Criteria:**
- [ ] All balls in Pendulum Slam mode have high mass (configurable multiplier, default 8-10x)
- [ ] Mass is set during ball creation: `ball.m = globals.MASS_BASELINE_KG * multiplier`
- [ ] Mass multiplier is configurable via control panel (default 9.0, range 5.0-15.0)
- [ ] Mass affects impact intensity calculations (existing `Ball.walls()` system handles this automatically)
- [ ] npm run build passes

### US-010: Add Pendulum Slam configuration controls
**Description:** As a user, I want to adjust Pendulum Slam parameters via the control panel.

**Acceptance Criteria:**
- [ ] Add `pendulumSlam` section to `CONTROL_SECTIONS` in `source/modules/ui/control-registry.js`
- [ ] Add controls following existing pattern:
  - `pendulumSlamBallCount`: range 20-100, default 50, type 'range'
  - `pendulumSlamLength`: range 0.3-0.9 (viewport height ratio), default 0.7, step 0.05, format 'XX%'
  - `pendulumSlamMassMultiplier`: range 5.0-15.0, default 9.0, step 0.5, format 'X.X×'
  - `pendulumSlamAngularDamping`: range 0.98-0.999, default 0.997, step 0.001, format 'X.XXX'
  - `pendulumSlamCohesionStrength`: range 1000-10000, default 5000, format 'Xpx/s²'
  - `pendulumSlamMouseStrength`: range 500-5000, default 2000, format 'Xpx/s²'
  - `pendulumSlamMouseRadius`: range 50-300, default 150, format 'Xpx'
  - `pendulumSlamWarmupFrames`: range 0-30, default 10, format 'X frames'
- [ ] Controls use proper `parse` functions (parseFloat for decimals, parseInt for integers)
- [ ] Controls are accessible in settings panel when Pendulum Slam mode is active
- [ ] npm run build passes

### US-011: Add Pendulum Slam state configuration
**Description:** As a developer, I need state variables for Pendulum Slam configuration.

**Acceptance Criteria:**
- [ ] Add Pendulum Slam config properties to `source/modules/core/state.js` defaults object:
  - `pendulumSlamBallCount: 50`
  - `pendulumSlamLength: 0.7` (viewport height ratio)
  - `pendulumSlamMassMultiplier: 9.0`
  - `pendulumSlamAngularDamping: 0.997`
  - `pendulumSlamCohesionStrength: 5000` (px/s²)
  - `pendulumSlamMouseStrength: 2000` (px/s²)
  - `pendulumSlamMouseRadius: 150` (px)
  - `pendulumSlamWarmupFrames: 10`
- [ ] Add config parsing in `initState()` function using `parseFloat()` for decimals, `parseInt()` for integers
- [ ] Add to `source/config/default-config.json` with same default values
- [ ] npm run build passes

### US-012: Verify dramatic wall deformation on impact
**Description:** As a user, I want to see dramatic wall deformations when the pendulum crashes into walls.

**Acceptance Criteria:**
- [ ] Wall deformations are significantly larger than normal modes
- [ ] Impact intensity scales with composite ball mass and velocity
- [ ] Multiple simultaneous impacts from composite ball create cascading wall ripples
- [ ] Wall deformation is visible and dramatic on each swing
- [ ] Verify in browser - walls should visibly deform on pendulum impacts
- [ ] npm run build passes

## Functional Requirements

- FR-1: Pendulum Slam mode must be selectable via mode switching (settings panel or arrow keys)
- FR-2: Composite ball must be formed from many small balls arranged in a cohesive pattern
- FR-3: Pendulum must be anchored at top center of viewport
- FR-4: Pendulum must swing naturally under gravity with configurable length
- FR-5: Cohesion forces must keep composite ball together as a unit
- FR-6: Pendulum constraint must maintain length from anchor to center of mass
- FR-7: Mouse cursor must be able to push pendulum left or right when within range
- FR-8: All balls must have high mass (configurable multiplier, default 9x)
- FR-9: Gravity must be enabled for pendulum physics
- FR-10: Wall impacts must create dramatic deformations due to high mass and velocity
- FR-11: All configuration parameters must be adjustable via control panel
- FR-12: Mode must maintain 60 FPS with composite ball structure
- FR-13: Mode must integrate with existing wall deformation system

## Non-Goals (Out of Scope)

- No ball-to-ball collisions within the composite (cohesion handles this)
- No visual string/rope rendering (invisible constraint)
- No sound effects specific to pendulum mode (uses existing collision sounds)
- No visual effects beyond wall deformation (no trails, particles, etc.)
- No automatic mode switching or transitions
- No mobile-specific optimizations beyond existing system
- No complex rope physics (simple distance constraint)

## Design Considerations

- Mode should feel weighty and impactful
- Wall deformations should be the primary visual focus
- Pendulum swing should feel natural and responsive to mouse interaction
- Composite ball should maintain its shape while allowing some flexibility
- Mode icon: 🔨 (hammer emoji) or ⚖️ (balance scale)

## Technical Considerations

- Use `getMobileAdjustedCount()` for ball count to respect mobile limits
- Use `randomRadiusForMode(g, MODES.PENDULUM_SLAM)` for consistent sizing
- Use `pickRandomColorWithIndex()` ensuring first 8 balls get one of each color (0-7)
- Create balls directly with `new Ball(x, y, r, color)`
- Mass is set via `ball.m = globals.MASS_BASELINE_KG * multiplier` (affects existing impact calculations)
- Gravity is controlled via `globals.gravityMultiplier` and `globals.G` in `setMode()` function
- Wall deformation intensity is calculated automatically from ball mass and velocity in `Ball.walls()`
- Pendulum physics: calculate center of mass, maintain distance from anchor, apply angular velocity
- Cohesion forces: apply spring-like forces between neighboring balls
- Mouse interaction: calculate distance from cursor to center of mass, apply force if within radius
- All positions, velocities, and distances must be DPR-scaled for consistent behavior
- Mark balls with `ball.isPendulum = true` for mode-specific handling
- Pendulum constraint: calculate center of mass, enforce distance from anchor, redistribute balls to maintain relative positions
- Wall deformation uses existing system - no mode-specific settings needed (high mass/velocity creates dramatic effect automatically)

## Success Metrics

- Composite ball maintains its shape while swinging
- Pendulum swings naturally under gravity
- Mouse interaction feels responsive and influences swing
- Wall deformations are dramatically larger than normal modes (2-3x)
- Simulation maintains 60 FPS with 50-ball composite
- All configuration parameters work via control panel
- Mode integrates seamlessly with existing mode switching
- No performance degradation after extended swinging

## Open Questions

- Should the composite ball have a fixed shape or allow some deformation during swing?
- Should mouse interaction affect angular velocity directly or apply force to center of mass?
- Should there be a maximum swing angle to prevent the pendulum from going upside down?
- Should cohesion strength vary based on distance from center of composite ball?
