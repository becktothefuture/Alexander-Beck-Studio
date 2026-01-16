# PRD: Impact Chain Simulation Mode

## Introduction

Create a new simulation mode where balls spawn sequentially and trigger a chain reaction of impacts around the perimeter. Each ball spawns at a specific point, accelerates toward a wall, and upon impact, triggers the next ball to spawn and accelerate. This creates a visible "chain" of impacts that travels around the viewport perimeter, creating cascading wall deformations. The chain can loop continuously or reset after completing a full circuit.

## Goals

- Create a new "Impact Chain" simulation mode accessible via mode switching
- Spawn balls sequentially that trigger the next ball in the chain
- Create a visible chain reaction of impacts traveling around the perimeter
- Use high-mass balls to create dramatic wall deformations
- Provide configurable controls for chain speed, mass, spacing, and other parameters
- Maintain 60 FPS performance with sequential ball spawning
- Integrate seamlessly with existing mode system and wall deformation

## User Stories

### US-001: Add Impact Chain mode constant and registration
**Description:** As a developer, I need the Impact Chain mode registered in the mode system so it can be selected and initialized.

**Acceptance Criteria:**
- [ ] Add `IMPACT_CHAIN: 'impact-chain'` to `MODES` object in `source/modules/core/constants.js`
- [ ] Add mode to `NARRATIVE_MODE_SEQUENCE` array (position to be determined)
- [ ] Add mode entry to `NARRATIVE_CHAPTER_TITLES` with appropriate title (e.g., "IMPACT CHAIN")
- [ ] Import functions in `source/modules/modes/mode-controller.js`: `initializeImpactChain`, `applyImpactChainForces`, `updateImpactChain`
- [ ] Register in `getModeForces()`: return `applyImpactChainForces` when mode is `MODES.IMPACT_CHAIN`
- [ ] Register in `getModeUpdater()`: return `updateImpactChain` when mode is `MODES.IMPACT_CHAIN`
- [ ] Add warmup frames case in `getWarmupFramesForMode()`: return `globals.impactChainWarmupFrames ?? 10`
- [ ] Disable gravity in `setMode()` when switching to Impact Chain mode (balls move in straight lines)
- [ ] npm run build passes

### US-002: Create impact-chain.js mode file
**Description:** As a developer, I need a new mode file following the existing pattern for Impact Chain implementation.

**Acceptance Criteria:**
- [ ] Create `source/modules/modes/impact-chain.js` with proper header comment (Swiss-grid box style)
- [ ] Import required modules: `getGlobals`, `clearBalls`, `getMobileAdjustedCount`, `Ball`, `pickRandomColorWithIndex`, `randomRadiusForMode`, `MODES`
- [ ] Export `initializeImpactChain()` function (clears balls, initializes chain state)
- [ ] Export `applyImpactChainForces(ball, dt)` function (can be no-op, balls move in straight lines)
- [ ] Export `updateImpactChain(dt)` function (handles chain spawning and triggering)
- [ ] Use module-level variables for chain state: current position, direction, next spawn timer
- [ ] Follow existing mode file structure and code style (section headers with box-drawing characters)
- [ ] npm run build passes

### US-003: Implement sequential ball spawning around perimeter
**Description:** As a user, I want balls to spawn sequentially at points around the viewport perimeter.

**Acceptance Criteria:**
- [ ] Balls spawn at configurable points around the perimeter (top, right, bottom, left)
- [ ] Spawn points are evenly distributed around the perimeter
- [ ] Spawn sequence follows perimeter order (e.g., top → right → bottom → left → repeat)
- [ ] Spawn interval is configurable (default based on chain speed and perimeter distance)
- [ ] Use `randomRadiusForMode()` for ball sizing
- [ ] Use `pickRandomColorWithIndex()` for colors
- [ ] All balls are marked with `ball.isImpactChain = true` for mode-specific handling
- [ ] All positions are DPR-scaled
- [ ] npm run build passes

### US-004: Calculate direction toward target wall
**Description:** As a user, I want each ball to move directly toward the wall it will impact.

**Acceptance Criteria:**
- [ ] Direction is calculated from spawn point to target wall (perpendicular to wall)
- [ ] Velocity is set to move ball directly toward target wall
- [ ] Velocity magnitude is configurable (default high enough to reach wall quickly)
- [ ] Direction is calculated in `updateImpactChain()` when spawning new ball
- [ ] All calculations are DPR-scaled
- [ ] npm run build passes

### US-005: Detect wall impact and trigger next ball
**Description:** As a user, I want each wall impact to trigger the next ball in the chain to spawn.

**Acceptance Criteria:**
- [ ] Wall impact is detected when ball reaches wall (position check)
- [ ] Impact detection happens in `updateImpactChain()` function
- [ ] Upon impact, next ball in chain is triggered to spawn
- [ ] Chain position advances to next point around perimeter
- [ ] Spawn timer is reset to trigger immediate spawn
- [ ] Chain can loop continuously or reset after full circuit
- [ ] npm run build passes

### US-006: Set high mass for dramatic wall deformation
**Description:** As a user, I want balls to have high mass so they create dramatic wall deformations on impact.

**Acceptance Criteria:**
- [ ] All balls in Impact Chain mode have high mass (configurable multiplier, default 8-10x)
- [ ] Mass is set during ball creation: `ball.m = globals.MASS_BASELINE_KG * multiplier`
- [ ] Mass multiplier is configurable via control panel (default 9.0, range 5.0-15.0)
- [ ] Mass affects impact intensity calculations (existing `Ball.walls()` system handles this automatically)
- [ ] npm run build passes

### US-007: Despawn balls after impact
**Description:** As a user, I want balls to despawn after hitting the wall to keep the chain clean and maintain performance.

**Acceptance Criteria:**
- [ ] Balls are removed from `globals.balls` array after wall impact
- [ ] Despawn happens in `updateImpactChain()` after impact detection
- [ ] Despawn occurs immediately on wall contact
- [ ] Only one ball is active at a time (or configurable max active)
- [ ] npm run build passes

### US-008: Add Impact Chain configuration controls
**Description:** As a user, I want to adjust Impact Chain parameters via the control panel.

**Acceptance Criteria:**
- [ ] Add `impactChain` section to `CONTROL_SECTIONS` in `source/modules/ui/control-registry.js`
- [ ] Add controls following existing pattern:
  - `impactChainBallSpeed`: range 500-3000, default 1500, format 'Xpx/s'
  - `impactChainMassMultiplier`: range 5.0-15.0, default 9.0, step 0.5, format 'X.X×'
  - `impactChainSpawnDelay`: range 0.1-2.0s, default 0.5s, step 0.05, format 'X.XXs'
  - `impactChainLoop`: type 'toggle', default true, format 'On/Off'
  - `impactChainWarmupFrames`: range 0-30, default 10, format 'X frames'
- [ ] Controls use proper `parse` functions (parseFloat for decimals, parseInt for integers)
- [ ] Controls are accessible in settings panel when Impact Chain mode is active
- [ ] npm run build passes

### US-009: Add Impact Chain state configuration
**Description:** As a developer, I need state variables for Impact Chain configuration.

**Acceptance Criteria:**
- [ ] Add Impact Chain config properties to `source/modules/core/state.js` defaults object:
  - `impactChainBallSpeed: 1500` (px/s)
  - `impactChainMassMultiplier: 9.0`
  - `impactChainSpawnDelay: 0.5` (seconds)
  - `impactChainLoop: true`
  - `impactChainWarmupFrames: 10`
- [ ] Add config parsing in `initState()` function using `parseFloat()` for decimals, `parseInt()` for integers, `Boolean()` for toggle
- [ ] Add to `source/config/default-config.json` with same default values
- [ ] npm run build passes

### US-010: Verify cascading wall impacts
**Description:** As a user, I want to see dramatic cascading wall deformations as the chain travels around the perimeter.

**Acceptance Criteria:**
- [ ] Wall impacts are visible and dramatic
- [ ] Chain reaction is visible as impacts travel around perimeter
- [ ] Each impact creates visible wall deformation
- [ ] Chain loops smoothly or resets cleanly
- [ ] Verify in browser - walls should show dramatic cascading deformations
- [ ] npm run build passes

## Functional Requirements

- FR-1: Impact Chain mode must be selectable via mode switching (settings panel or arrow keys)
- FR-2: Balls must spawn sequentially at points around the viewport perimeter
- FR-3: Each ball must move directly toward its target wall
- FR-4: Wall impacts must trigger the next ball in the chain to spawn
- FR-5: All balls must have high mass (configurable multiplier, default 9x)
- FR-6: Gravity must be disabled (balls move in straight lines)
- FR-7: Balls must despawn after wall impact
- FR-8: Chain must travel around perimeter in order (top → right → bottom → left)
- FR-9: Chain must loop continuously or reset after full circuit (configurable)
- FR-10: Wall impacts must create dramatic deformations due to high mass and velocity
- FR-11: All configuration parameters must be adjustable via control panel
- FR-12: Mode must maintain 60 FPS with sequential ball spawning
- FR-13: Mode must integrate with existing wall deformation system

## Non-Goals (Out of Scope)

- No ball-to-ball collisions (only one active ball at a time)
- No cursor interaction (chain is automatic)
- No sound effects specific to impact chain mode (uses existing collision sounds)
- No visual effects beyond wall deformation (no trails, particles, etc.)
- No automatic mode switching or transitions
- No mobile-specific optimizations beyond existing system
- No complex chain branching or multiple simultaneous chains

## Design Considerations

- Mode should feel rhythmic and cascading
- Wall deformations should be the primary visual focus
- Chain should create a visible "wave" of impacts around the perimeter
- Spawn timing should create smooth chain progression
- Mode icon: ⛓️ (chain emoji) or 🔗 (link emoji)

## Technical Considerations

- Use `getMobileAdjustedCount()` for spawn point count if needed
- Use `randomRadiusForMode(g, MODES.IMPACT_CHAIN)` for consistent sizing
- Use `pickRandomColorWithIndex()` for colors
- Create balls directly with `new Ball(x, y, r, color)`
- Mass is set via `ball.m = globals.MASS_BASELINE_KG * multiplier` (affects existing impact calculations)
- Gravity is disabled in `setMode()` when switching to Impact Chain mode
- Wall deformation intensity is calculated automatically from ball mass and velocity in `Ball.walls()`
- Chain state: track current position around perimeter, direction, next spawn timer
- Spawn points: calculate evenly around perimeter (top, right, bottom, left edges)
- Direction calculation: perpendicular from spawn point to target wall
- Impact detection: check if ball position has reached wall boundary
- All positions, velocities, and distances must be DPR-scaled for consistent behavior
- Mark balls with `ball.isImpactChain = true` for mode-specific handling
- Wall deformation uses existing system - no mode-specific settings needed (high mass/velocity creates dramatic effect automatically)

## Success Metrics

- Chain reaction is visible as impacts travel around perimeter
- Wall impacts are dramatically larger than normal modes (2-3x)
- Chain loops smoothly or resets cleanly
- Simulation maintains 60 FPS with sequential spawning
- All configuration parameters work via control panel
- Mode integrates seamlessly with existing mode switching
- No performance degradation after multiple chain cycles

## Open Questions

- Should the chain always move in the same direction (clockwise) or be configurable?
- Should there be a maximum number of active balls (currently one at a time)?
- Should spawn delay be based on distance to next point or fixed interval?
- Should the chain start immediately or wait for user interaction?
