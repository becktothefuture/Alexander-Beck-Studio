# PRD: Chain Reaction / Explosion Mode Simulation

## Introduction

Create a new simulation mode where balls start clustered in the center of the viewport, then periodically explode outward at high velocity, creating cascading wall impacts. Balls bounce between walls creating chain reactions of impacts, with each explosion creating dramatic wall deformations. This mode emphasizes synchronized impact waves and sustained wall wobble from multiple simultaneous collisions.

## Goals

- Create a new "Chain Reaction" simulation mode accessible via mode switching
- Start with balls clustered in center of viewport
- Trigger automatic periodic explosions that push balls outward
- Use high-mass balls (5-10x normal) to create dramatic wall deformations
- Balls bounce between walls creating cascading impacts
- Provide configurable controls for explosion timing, strength, mass, and other parameters
- Maintain 60 FPS performance with multiple bouncing balls
- Integrate seamlessly with existing mode system and wall deformation

## User Stories

### US-001: Add Chain Reaction mode constant and registration
**Description:** As a developer, I need the Chain Reaction mode registered in the mode system so it can be selected and initialized.

**Acceptance Criteria:**
- [ ] Add `CHAIN_REACTION: 'chain-reaction'` to `MODES` object in `source/modules/core/constants.js`
- [ ] Add mode to `NARRATIVE_MODE_SEQUENCE` array (position to be determined, likely after vortex or critters)
- [ ] Add mode entry to `NARRATIVE_CHAPTER_TITLES` with appropriate title (e.g., "CHAIN REACTION")
- [ ] Import functions in `source/modules/modes/mode-controller.js`: `initializeChainReaction`, `applyChainReactionForces`, `updateChainReaction`
- [ ] Register in `getModeForces()`: return `applyChainReactionForces` when mode is `MODES.CHAIN_REACTION`
- [ ] Register in `getModeUpdater()`: return `updateChainReaction` when mode is `MODES.CHAIN_REACTION`
- [ ] Add warmup frames case in `getWarmupFramesForMode()`: return `globals.chainReactionWarmupFrames ?? 10`
- [ ] Disable gravity in `setMode()` when switching to Chain Reaction mode (set `gravityMultiplier = 0.0`, `G = 0`)
- [ ] npm run build passes

### US-002: Create chain-reaction.js mode file
**Description:** As a developer, I need a new mode file following the existing pattern for Chain Reaction implementation.

**Acceptance Criteria:**
- [ ] Create `source/modules/modes/chain-reaction.js` with proper header comment (Swiss-grid box style)
- [ ] Import required modules: `getGlobals`, `clearBalls`, `getMobileAdjustedCount`, `Ball`, `pickRandomColorWithIndex`, `randomRadiusForMode`, `MODES`
- [ ] Export `initializeChainReaction()` function (clears balls, creates center cluster)
- [ ] Export `applyChainReactionForces(ball, dt)` function (handles light damping if needed, can be no-op)
- [ ] Export `updateChainReaction(dt)` function (handles explosion timing and force application)
- [ ] Use module-level variable for explosion timer: `let explosionTimer = 0`
- [ ] Follow existing mode file structure and code style (section headers with box-drawing characters)
- [ ] npm run build passes

### US-003: Initialize balls in center cluster
**Description:** As a user, I want balls to start clustered in the center of the viewport ready for explosion.

**Acceptance Criteria:**
- [ ] Balls spawn in a tight cluster at viewport center (canvas.width/2, canvas.height/2)
- [ ] Cluster uses hexagonal close-packing or random tight arrangement within small radius
- [ ] Initial velocities are zero (`ball.vx = 0`, `ball.vy = 0`, `ball.omega = 0`)
- [ ] Ball count uses `getMobileAdjustedCount()` pattern (default 50, mobile-adjusted)
- [ ] Use `randomRadiusForMode(g, MODES.CHAIN_REACTION)` for sizing
- [ ] Use `pickRandomColorWithIndex()` ensuring first 8 balls get one of each color (0-7)
- [ ] Cluster radius is ~2-3x average ball radius to prevent overlap
- [ ] All positions are DPR-scaled
- [ ] Mark balls with `ball.isChainReaction = true` for mode-specific handling
- [ ] npm run build passes

### US-004: Implement automatic periodic explosions
**Description:** As a user, I want explosions to happen automatically at regular intervals to create continuous impact waves.

**Acceptance Criteria:**
- [ ] Explosion timer tracks elapsed time using `dt` accumulation in `updateChainReaction(dt)`
- [ ] Store timer in module-level variable: `let explosionTimer = 0`
- [ ] Explosions trigger at configurable interval (default 4.0 seconds)
- [ ] Explosion applies outward radial force to all balls in `updateChainReaction()`
- [ ] Force magnitude is configurable (default 6500 px/s², strong enough to reach walls)
- [ ] Explosion timer resets to 0 after each explosion
- [ ] Register `updateChainReaction` via `getModeUpdater()` in `mode-controller.js`
- [ ] npm run build passes

### US-005: Apply explosion force to all balls
**Description:** As a user, I want explosions to push all balls outward from center with high velocity.

**Acceptance Criteria:**
- [ ] Explosion calculates direction from center to each ball: `dx = ball.x - centerX`, `dy = ball.y - centerY`
- [ ] Normalize direction: `const dist = Math.max(0.1, Math.sqrt(dx*dx + dy*dy))`, `const nx = dx/dist`, `const ny = dy/dist`
- [ ] Force magnitude is configurable (default 6500 px/s², DPR-scaled)
- [ ] Force is applied as velocity impulse: `ball.vx += nx * strength * dt`, `ball.vy += ny * strength * dt`
- [ ] Force can have slight random variation (±10% for visual interest)
- [ ] Explosion happens in `updateChainReaction()` when timer exceeds interval
- [ ] Apply to all balls in `globals.balls` array
- [ ] All calculations are DPR-scaled
- [ ] npm run build passes

### US-006: Set high mass to balls for dramatic wall deformation
**Description:** As a user, I want balls to have high mass so they create dramatic wall deformations on impact.

**Acceptance Criteria:**
- [ ] All balls in Chain Reaction mode have mass 5-10x normal (configurable multiplier)
- [ ] Mass is set during ball creation: `ball.m = globals.MASS_BASELINE_KG * (g.chainReactionMassMultiplier || 7.0)`
- [ ] Mass multiplier is configurable via control panel (default 7.0, range 3.0-12.0)
- [ ] Mass affects impact intensity calculations (existing `Ball.walls()` system handles this automatically)
- [ ] npm run build passes

### US-007: Enable wall bouncing for cascading impacts
**Description:** As a user, I want balls to bounce between walls creating chain reactions of impacts.

**Acceptance Criteria:**
- [ ] Wall collisions are enabled (standard bounce physics via `Ball.walls()`)
- [ ] Restitution is configurable via `globals.chainReactionRestitution` (default 0.8, range 0.3-1.0)
- [ ] Restitution is applied in `Ball.walls()` using custom rest parameter: `ball.walls(w, h, dt, g.chainReactionRestitution)`
- [ ] Balls bounce off all walls (top, bottom, left, right) using existing collision system
- [ ] Each wall impact creates wall deformation (automatic via existing `registerWallImpactAtPoint()`)
- [ ] Multiple balls can impact walls simultaneously creating cascading effects
- [ ] npm run build passes

### US-008: Disable gravity for free bouncing
**Description:** As a user, I want balls to bounce freely without gravity pulling them down.

**Acceptance Criteria:**
- [ ] Gravity is disabled when Chain Reaction mode is active
- [ ] In `setMode()` when mode is `MODES.CHAIN_REACTION`: set `globals.gravityMultiplier = 0.0` and `globals.G = 0`
- [ ] In `setMode()` when switching away: restore previous gravity values
- [ ] Balls maintain velocity after explosions (no downward pull from gravity)
- [ ] `applyChainReactionForces()` can be no-op or handle light damping only
- [ ] npm run build passes

### US-009: Add Chain Reaction configuration controls
**Description:** As a user, I want to adjust Chain Reaction parameters via the control panel.

**Acceptance Criteria:**
- [ ] Add `chainReaction` section to `CONTROL_SECTIONS` in `source/modules/ui/control-registry.js`
- [ ] Add controls following existing pattern:
  - `chainReactionBallCount`: range 20-100, default 50, type 'range'
  - `chainReactionExplosionInterval`: range 1.0-10.0s, default 4.0s, step 0.1, format 'X.Xs'
  - `chainReactionExplosionStrength`: range 2000-15000, default 6500, format 'Xpx/s²'
  - `chainReactionMassMultiplier`: range 3.0-12.0, default 7.0, step 0.5, format 'X.Xx'
  - `chainReactionRestitution`: range 0.3-1.0, default 0.8, step 0.05, format 'X.XX'
  - `chainReactionWarmupFrames`: range 0-30, default 10, format 'X frames'
- [ ] Controls use proper `parse` functions (parseFloat for decimals, parseInt for integers)
- [ ] Controls are accessible in settings panel when Chain Reaction mode is active
- [ ] npm run build passes

### US-010: Add Chain Reaction state configuration
**Description:** As a developer, I need state variables for Chain Reaction configuration.

**Acceptance Criteria:**
- [ ] Add Chain Reaction config properties to `source/modules/core/state.js` defaults object:
  - `chainReactionBallCount: 50`
  - `chainReactionExplosionInterval: 4.0` (seconds)
  - `chainReactionExplosionStrength: 6500` (px/s²)
  - `chainReactionMassMultiplier: 7.0`
  - `chainReactionRestitution: 0.8`
  - `chainReactionWarmupFrames: 10`
- [ ] Add config parsing in `initState()` function using `parseFloat()` for decimals, `parseInt()` for integers
- [ ] Add to `source/config/default-config.json` with same default values
- [ ] npm run build passes

### US-011: Verify cascading wall impacts
**Description:** As a user, I want to see dramatic cascading wall deformations from multiple simultaneous impacts.

**Acceptance Criteria:**
- [ ] Multiple balls impact walls simultaneously after explosion
- [ ] Wall deformations overlap and create rippling effects
- [ ] Impact waves are visible as balls bounce between walls
- [ ] Wall deformation persists and creates sustained wobble
- [ ] Verify in browser - walls should show dramatic cascading deformations
- [ ] npm run build passes

## Functional Requirements

- FR-1: Chain Reaction mode must be selectable via mode switching (settings panel or arrow keys)
- FR-2: Balls must start clustered in center of viewport with zero velocity
- FR-3: Automatic explosions must occur at configurable intervals (default 3-5 seconds)
- FR-4: Explosions must apply radial outward force to all balls from center
- FR-5: Explosion force magnitude must be configurable (default 5000-8000 px/s²)
- FR-6: All balls must have mass 5-10x normal (configurable multiplier, default 7x)
- FR-7: Gravity must be disabled (balls bounce freely)
- FR-8: Wall collisions must be enabled with configurable restitution (default 0.8)
- FR-9: Balls must bounce between walls creating cascading impacts
- FR-10: Wall impacts must create dramatic deformations due to high mass and velocity
- FR-11: All configuration parameters must be adjustable via control panel
- FR-12: Mode must maintain 60 FPS with 50 bouncing balls
- FR-13: Mode must integrate with existing wall deformation system

## Non-Goals (Out of Scope)

- No ball-to-ball collisions (focus on wall impacts only)
- No cursor interaction (explosions are automatic only)
- No manual explosion trigger (automatic only)
- No sound effects specific to chain reaction mode (uses existing collision sounds)
- No visual effects beyond wall deformation (no explosion particles, trails, etc.)
- No automatic mode switching or transitions
- No ball recycling or respawning (balls persist after explosion)
- No mobile-specific optimizations beyond existing system

## Design Considerations

- Mode should feel explosive and energetic
- Wall deformations should be the primary visual focus
- Explosion timing should create rhythmic impact waves
- Ball colors should use existing palette system
- Mode icon: 💣 (bomb emoji) or ⚡ (lightning bolt)

## Technical Considerations

- Use `getMobileAdjustedCount()` for ball count to respect mobile limits
- Use `randomRadiusForMode(g, MODES.CHAIN_REACTION)` for consistent sizing
- Use `pickRandomColorWithIndex()` ensuring first 8 balls get one of each color (0-7)
- Create balls directly with `new Ball(x, y, r, color)` rather than `spawnBall()` (spawnBall adds initial kick velocity we don't want)
- Mass is set via `ball.m = globals.MASS_BASELINE_KG * multiplier` (affects existing impact calculations)
- Explosion force applied as velocity impulse: `ball.vx += nx * strength * dt`, `ball.vy += ny * strength * dt`
- Explosion timer should use `dt` accumulation in `updateChainReaction(dt)` (frame-based, not wall-clock)
- Register `updateChainReaction` via `getModeUpdater()` in `mode-controller.js`
- Center point is `(canvas.width/2, canvas.height/2)` (DPR-scaled canvas dimensions)
- Radial force direction: `dx = ball.x - centerX`, `dy = ball.y - centerY`, normalize to `nx, ny`
- Wall deformation intensity is calculated automatically from ball mass and velocity in `Ball.walls()`
- Multiple simultaneous impacts will create overlapping wall deformations (existing system handles this)
- Consider very light damping (0.995-0.998) in `applyChainReactionForces()` to prevent infinite bouncing
- Gravity disabled in `setMode()` when switching to Chain Reaction mode
- All positions, velocities, and distances must be DPR-scaled for consistent behavior
- Mark balls with `ball.isChainReaction = true` if mode-specific handling is needed
- Wall deformation uses existing system - no mode-specific settings needed (high mass/velocity creates dramatic effect automatically)

## Success Metrics

- Balls start clustered in center and explode outward periodically
- Explosions create visible impact waves on walls
- Wall deformations are dramatically larger than normal modes (2-3x)
- Cascading impacts are visible as balls bounce between walls
- Simulation maintains 60 FPS with 50 bouncing balls
- All configuration parameters work via control panel
- Mode integrates seamlessly with existing mode switching
- No performance degradation after multiple explosion cycles

## Open Questions

- Should explosion strength vary randomly for visual interest?
- Should there be a "cooldown" period after explosion before balls can explode again?
- Should balls slow down over time (damping) or bounce forever?
- Should wall deformation settings be mode-specific or use global settings?
- Should explosion direction have slight randomness or be perfectly radial?
