# PRD: Critters Realistic Behavior

## Introduction

Enhance the Critters simulation with realistic insect-like default behaviors. Currently, critters wander randomly with uniform motion. This update adds four biologically-inspired behaviors: stop-and-go foraging, directional memory, size-based speed scaling, and lightweight pheromone trail following. All implementations must be performant (O(1) per critter, no allocations in hot paths).

## Goals

- Make critters feel like real insects exploring a surface
- Add personality variation so each critter behaves uniquely
- Create emergent group behavior through pheromone trails without explicit flocking
- Maintain 60 FPS with 110+ critters
- Keep memory footprint minimal (~1KB for pheromone grid)
- Do NOT change maximum ball size

## User Stories

### US-001: Stop-and-go foraging behavior
**Description:** As a user, I want critters to pause and "investigate" spots like real insects foraging, so they feel alive rather than constantly moving.

**Acceptance Criteria:**
- [ ] Critters have personality-driven pause durations (0.2s-1.5s range)
- [ ] Some critters are "patient" (longer pauses), others "restless" (short pauses)
- [ ] Pauses look like investigation, not frozen/stuck
- [ ] After pause, critter darts to new location (slight speed burst)
- [ ] Panicked critters skip foraging pauses entirely
- [ ] `npm run build` passes

### US-002: Directional bias/memory
**Description:** As a user, I want critters to explore in loose paths rather than chaotic zigzags, so movement looks purposeful.

**Acceptance Criteria:**
- [ ] Each critter has a "preferred heading" that drifts slowly over time
- [ ] Wander behavior biases toward preferred heading (not locked to it)
- [ ] Preferred heading updates randomly but smoothly (not sudden jumps)
- [ ] Drift rate is personality-driven (some explore wide, some stay focused)
- [ ] Does not interfere with panic flee behavior
- [ ] `npm run build` passes

### US-003: Size-based speed scaling
**Description:** As a user, I want smaller critters to scuttle faster than larger ones, matching real insect behavior where small bugs move quicker relative to body size.

**Acceptance Criteria:**
- [ ] Speed and step frequency scale inversely with radius
- [ ] Smallest critters move ~1.5× faster than largest
- [ ] Scaling is smooth (not stepped)
- [ ] Formula: `speedMul = 1 + 0.5 * (1 - (r - rMin) / (rMax - rMin))`
- [ ] Does not affect maximum ball size (sizing system unchanged)
- [ ] `npm run build` passes

### US-004: Pheromone trail grid infrastructure
**Description:** As a developer, I need a lightweight spatial grid to store pheromone intensity so critters can follow trails.

**Acceptance Criteria:**
- [ ] 32×32 grid covering canvas (coarse resolution)
- [ ] Each cell stores a single float (0-1 intensity)
- [ ] Grid resets on mode init and canvas resize
- [ ] No per-frame allocations (pre-allocated Float32Array)
- [ ] Memory footprint ~4KB max (32×32×4 bytes)
- [ ] `npm run build` passes

### US-005: Pheromone deposit behavior
**Description:** As a user, I want critters to leave invisible "scent" as they move, creating trails over time.

**Acceptance Criteria:**
- [ ] Each critter deposits pheromone at current cell each frame
- [ ] Deposit amount is small (0.02-0.05 per frame at 60fps)
- [ ] Pheromone accumulates but caps at 1.0
- [ ] Grid decays globally each frame (exponential decay, ~3-5 second half-life)
- [ ] Decay is single loop over grid (O(n) where n=1024 cells)
- [ ] `npm run build` passes

### US-006: Pheromone trail following
**Description:** As a user, I want critters to weakly attract toward areas with pheromone trails, creating emergent path-following without explicit flocking.

**Acceptance Criteria:**
- [ ] Critter samples current cell + 4 neighbors (or 8 for more accuracy)
- [ ] Weak steering bias toward higher pheromone concentration
- [ ] Effect is subtle — light grouping, mostly independent wandering
- [ ] Trail following disabled/reduced during panic
- [ ] Lookup is O(1) per critter (just array index)
- [ ] `npm run build` passes

### US-007: Integration and tuning
**Description:** As a user, I want all behaviors to work together harmoniously for a cohesive realistic simulation.

**Acceptance Criteria:**
- [ ] All four behaviors active simultaneously
- [ ] No config changes required (sensible defaults)
- [ ] Panic behavior still works correctly (flee from mouse)
- [ ] Performance: 60 FPS with 110 critters on mid-range device
- [ ] No visible "highways" or strong clustering (subtle effect only)
- [ ] `npm run build` passes
- [ ] Manual visual verification in browser

## Functional Requirements

- FR-1: Add `_critterPatience` personality trait (0-1) controlling pause duration range
- FR-2: Add `_critterPreferredHeading` that drifts at personality-driven rate
- FR-3: Add `_critterDriftRate` personality trait controlling heading exploration width
- FR-4: Scale `speed` and `stepHz` by inverse radius factor (1.0-1.5× range)
- FR-5: Create `pheromoneGrid` as Float32Array(1024) in critters module
- FR-6: Add `depositPheromone(x, y, amount)` function
- FR-7: Add `decayPheromoneGrid(dt)` function called once per frame
- FR-8: Add `samplePheromoneGradient(x, y)` returning {dx, dy} toward higher concentration
- FR-9: Integrate pheromone steering into `applyCrittersForces` with low weight
- FR-10: Add post-pause speed burst (1.3× for 0.1s after pause ends)

## Non-Goals

- No visible pheromone trails (invisible infrastructure only)
- No config panel controls for new behaviors (hardcoded sensible defaults)
- No changes to ball sizing system or maximum radius
- No inter-critter communication beyond pheromone grid
- No performance impact >5% on physics loop

## Technical Considerations

- Pheromone grid stored as module-level Float32Array (no object allocation)
- Grid coordinates: `cellX = (x / canvasWidth * 32) | 0`, clamped to 0-31
- Decay: `grid[i] *= decayFactor` where decayFactor ≈ 0.997 per frame (60fps)
- Gradient sampling: compare cell[x,y] with neighbors, return normalized direction
- All new personality traits initialized in `initializeCritters()`
- Size scaling uses `globals.R_MIN` and `globals.R_MAX` for normalization

## Success Metrics

- Critters feel like real insects exploring a surface
- Subtle emergent paths visible over 10-20 seconds of observation
- No noticeable performance regression
- Panic flee behavior unchanged in responsiveness

## Open Questions

- None — all clarified via user input (1A, 2A, 3C, 4A)
