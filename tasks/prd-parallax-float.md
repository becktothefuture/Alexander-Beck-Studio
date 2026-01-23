# PRD: Parallax Float Simulation

## Introduction

Add a new "Parallax Float" simulation mode that is a **variant of Parallax Linear** with two key differences:
1. Particles have randomized positions (offset from perfect grid)
2. Each particle has continuous levitation/floating animation (independent of mouse)

The mouse interaction (camera pan/parallax effect) must remain **identical** to Parallax Linear.

## Goals

- Create a dreamy, organic version of the geometric Parallax Linear mode
- Maintain 60 FPS performance
- Keep mouse parallax behavior exactly the same
- Add smooth, continuous per-particle floating animation

## User Stories

### US-001: Copy Parallax Linear as base
**Description:** As a developer, I need an exact working copy of parallax-linear before making modifications.

**Acceptance Criteria:**
- [ ] Create `source/modules/modes/parallax-float.js` as exact copy of `parallax-linear.js`
- [ ] Rename functions to `initializeParallaxFloat` and `applyParallaxFloatForces`
- [ ] Add `PARALLAX_FLOAT: 'parallax-float'` to constants.js MODES object
- [ ] Add to NARRATIVE_MODE_SEQUENCE in constants.js (after PARALLAX_LINEAR)
- [ ] Add NARRATIVE_CHAPTER_TITLES entry
- [ ] `npm run build` passes

### US-002: Wire mode into controller
**Description:** As a developer, I need the new mode properly wired so the force applicator is called.

**Acceptance Criteria:**
- [ ] Import `initializeParallaxFloat, applyParallaxFloatForces` in mode-controller.js
- [ ] Add `else if (mode === MODES.PARALLAX_FLOAT)` block in `setMode()` calling `initializeParallaxFloat()`
- [ ] Add `else if (globals.currentMode === MODES.PARALLAX_FLOAT)` block in `getForceApplicator()` returning `applyParallaxFloatForces`
- [ ] Add warmup frames case in `getWarmupFramesForMode()`
- [ ] Switching to Parallax Float mode renders dots that respond to mouse parallax
- [ ] `npm run build` passes
- [ ] Verify in browser using dev-browser skill

### US-003: Add random position offsets
**Description:** As a user, I want particles positioned with organic randomness rather than a perfect grid.

**Acceptance Criteria:**
- [ ] In `initializeParallaxFloat`, add random offset to x3d, y3d, z3d positions
- [ ] Offset amount configurable via `parallaxFloatRandomize` (0-1, default 0.5)
- [ ] Offset scales with grid step size for proportional distribution
- [ ] Keep using `ball._parallax3D` structure (x, y, z, baseScale)
- [ ] Keep `ball._isParallax = true` for physics bypass
- [ ] `npm run build` passes
- [ ] Verify in browser: dots appear scattered, not grid-aligned

### US-004: Add continuous levitation animation
**Description:** As a user, I want each particle to gently float up/down/sideways continuously.

**Acceptance Criteria:**
- [ ] Add levitation properties to `_parallax3D`: `phaseX, phaseY, freqX, freqY, ampX, ampY`
- [ ] Each particle gets unique random phase and frequency
- [ ] In `applyParallaxFloatForces`, advance phase using dt
- [ ] Calculate sine-wave drift and add to base x3d/y3d BEFORE projection
- [ ] Drift is subtle (8-24px amplitude in 3D space)
- [ ] Frequency is slow (0.1-0.3 Hz)
- [ ] Mouse parallax still works identically to parallax-linear
- [ ] `npm run build` passes
- [ ] Verify in browser: particles visibly drift even when mouse is stationary

### US-005: Add control panel section
**Description:** As a user, I want to adjust Float-specific parameters.

**Acceptance Criteria:**
- [ ] Add `parallaxFloat` section to control-registry.js
- [ ] Include controls: randomize amount, levitation amplitude, levitation speed
- [ ] Add PARALLAX_FLOAT_PRESETS to constants.js (copy from PARALLAX_LINEAR_PRESETS, add float params)
- [ ] `npm run build` passes

## Functional Requirements

- FR-1: Parallax Float must use identical `_parallax3D` structure as Parallax Linear
- FR-2: Parallax Float must be wired into mode-controller.js `getForceApplicator()`
- FR-3: Random offsets apply once at initialization, not every frame
- FR-4: Levitation phase advances every frame using dt for smooth animation
- FR-5: Mouse parallax projection math identical to Parallax Linear

## Non-Goals

- No new rendering system (uses existing ball renderer)
- No physics integration (uses `_isParallax = true` bypass)
- No audio reactivity
- No interaction beyond existing mouse parallax

## Technical Considerations

- Copy parallax-linear.js exactly first, then modify incrementally
- Keep property names identical (`_parallax3D`, `_isParallax`) for compatibility
- The force applicator is what makes balls move — must be wired in getForceApplicator()
- Levitation drift is added to 3D position before projection, not after

## Success Metrics

- Simulation renders on first try
- Particles float smoothly at 60 FPS
- Mouse parallax feels identical to Parallax Linear
- Particles appear organically scattered (not grid-aligned)

## Open Questions

- Should Float be in production rotation or disabled initially? (Start disabled for testing)
