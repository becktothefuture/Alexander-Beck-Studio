# PRD: Simulation Performance Optimization

## Introduction

The bouncy balls simulation suffers from significant performance degradation, especially on mobile devices and after repeated mode switching. This PRD addresses three critical issues:

1. **Wall deformation system** is computationally expensive (768 samples, 30Hz physics, complex path rendering) and runs on all devices including mobile
2. **Mode switching causes memory/performance leaks** - resources accumulate when switching between simulations
3. **No mobile-specific optimizations** despite existing `isMobile` detection infrastructure

The goal is to achieve stable 60 FPS on mobile by completely disabling wall deformation on mobile devices and implementing proper resource cleanup during mode transitions.

## Goals

- Achieve stable 60 FPS on mobile devices
- Completely disable wall deformation physics AND rendering on mobile
- Fix memory/performance leak when switching between modes
- Implement proper cleanup lifecycle for mode transitions
- Maintain current visual quality on desktop

## User Stories

### US-001: Add mobile wall deformation disable flag
**Description:** As a mobile user, I want wall deformation completely disabled so the simulation runs at 60 FPS.

**Acceptance Criteria:**
- [ ] Add `wallDeformationEnabled` flag to state.js (default: true on desktop, false on mobile)
- [ ] Flag is set during initialization based on `isMobile` or `isMobileViewport`
- [ ] Flag can be read by physics and rendering systems
- [ ] npm run build passes

### US-002: Skip wall physics on mobile
**Description:** As a developer, I need the wall physics system to be completely bypassed on mobile to save CPU cycles.

**Acceptance Criteria:**
- [ ] `wallState.step()` is not called when `wallDeformationEnabled` is false
- [ ] `wallState.clearPressureFrame()` and `resetStepBudgets()` are skipped on mobile
- [ ] No wall impact/pressure registration occurs on mobile (`registerWallImpactAtPoint`, `registerWallPressureAtPoint`)
- [ ] Physics loop in engine.js checks flag before any wall-related work
- [ ] npm run build passes

### US-003: Skip wall deformation rendering on mobile
**Description:** As a developer, I need wall rendering to draw a simple static rounded rectangle on mobile instead of the deformed path.

**Acceptance Criteria:**
- [ ] `drawWalls()` in wall-state.js checks `wallDeformationEnabled` flag
- [ ] When disabled, draw a simple static rounded-rect path (no deformation samples)
- [ ] No interpolation, smoothing, or sample iteration on mobile
- [ ] Wall still renders with correct color, inset, and corner radius
- [ ] npm run build passes

### US-004: Reset wallState on mode switch
**Description:** As a user switching modes, I want the simulation to maintain consistent performance without degradation.

**Acceptance Criteria:**
- [ ] `wallState.ringPhysics.reset()` is called at the start of `setMode()`
- [ ] `wallState.ringRender.reset()` is called at the start of `setMode()`
- [ ] Interpolation caches (`_renderSmPrev`, `_renderSmCurr`) are cleared
- [ ] `_impactsThisStep` and `_pressureEventsThisStep` counters are reset
- [ ] npm run build passes

### US-005: Clear physics accumulator on mode switch
**Description:** As a developer, I need physics timing state reset when switching modes to prevent frame spikes.

**Acceptance Criteria:**
- [ ] Physics accumulator (`acc` in engine.js) is reset to 0 on mode switch
- [ ] Export a `resetPhysicsAccumulator()` function from engine.js
- [ ] Call this function from `setMode()` in mode-controller.js
- [ ] npm run build passes

### US-006: Skip Ball.walls() wall effects on mobile
**Description:** As a developer, I need Ball.js to skip wall effect registration on mobile while keeping collision physics intact.

**Acceptance Criteria:**
- [ ] Ball.walls() checks `wallDeformationEnabled` before calling `registerWallImpactAtPoint`
- [ ] Ball.walls() checks `wallDeformationEnabled` before calling `registerWallPressureAtPoint`
- [ ] Wall collision physics (bounce, clamping) still works normally
- [ ] npm run build passes

### US-007: Clear adaptive throttle state on mode switch
**Description:** As a developer, I need the adaptive throttle system reset when switching modes so it doesn't carry stale FPS data.

**Acceptance Criteria:**
- [ ] `recentFrameTimes` array in loop.js is cleared on mode switch
- [ ] `adaptiveThrottleLevel` is reset to 0 on mode switch
- [ ] Export a `resetAdaptiveThrottle()` function from loop.js
- [ ] Call this function from `setMode()` in mode-controller.js
- [ ] npm run build passes

### US-008: Verify mobile performance improvement
**Description:** As a developer, I need to verify the optimizations achieve 60 FPS on mobile.

**Acceptance Criteria:**
- [ ] Test on mobile viewport (375x667) using dev-browser skill
- [ ] Switch through at least 5 different modes
- [ ] Confirm wall is rendered as static rounded rectangle (no wobble)
- [ ] No visible performance degradation after mode switches
- [ ] npm run build passes

## Functional Requirements

- FR-1: Add `wallDeformationEnabled` boolean to global state, defaulting to `!(isMobile || isMobileViewport)`
- FR-2: Wall physics (`wallState.step()`, impact/pressure registration) must be completely bypassed when `wallDeformationEnabled` is false
- FR-3: Wall rendering must use a simple static rounded-rect path when `wallDeformationEnabled` is false
- FR-4: `setMode()` must reset all wall state (deformations, velocities, pressure, caches)
- FR-5: `setMode()` must reset physics accumulator to prevent timing spikes
- FR-6: `setMode()` must reset adaptive throttle state
- FR-7: Ball-wall collision physics must continue working on mobile (only visual effects disabled)
- FR-8: Desktop behavior must remain unchanged (full wall deformation)

## Non-Goals

- No dynamic quality adaptation (user answered 3.C)
- No user-facing performance toggle
- No changes to ball physics or collision system
- No changes to audio system
- No refactoring of mode initialization logic beyond cleanup additions

## Technical Considerations

### Files to Modify:
1. **source/modules/core/state.js** - Add `wallDeformationEnabled` flag
2. **source/modules/physics/wall-state.js** - Add mobile fast-path in `drawWalls()`
3. **source/modules/physics/engine.js** - Guard wall physics calls, export reset function
4. **source/modules/modes/mode-controller.js** - Call cleanup functions in `setMode()`
5. **source/modules/physics/Ball.js** - Guard wall effect registration
6. **source/modules/rendering/loop.js** - Export throttle reset function

### Mobile Detection:
The codebase already has `isMobile` and `isMobileViewport` flags in state.js. Use these to set `wallDeformationEnabled` during initialization.

### Performance Impact:
- Wall physics: ~768 samples × 30Hz = 23,040 sample updates/second eliminated
- Wall rendering: ~768 path segments × 60fps = 46,080 lineTo calls/second eliminated
- Impact registration: Eliminates gaussian distribution calculations per ball-wall collision

## Success Metrics

- Stable 60 FPS on mobile devices (iPhone 12 equivalent or better)
- No FPS degradation after 10+ mode switches
- Wall still renders correctly (static rounded rectangle on mobile)
- Desktop visual quality unchanged (full deformation effects)

## Open Questions

- None - all clarifying questions answered
