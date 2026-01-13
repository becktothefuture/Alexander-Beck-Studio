# PRD: Mobile Performance Optimization Phase 2

## Status: ✅ COMPLETED

Implementation completed on 2026-01-13. All 6 optimizations implemented and verified on mobile viewport.

---

## Introduction

Following the successful Phase 1 mobile performance work (disabling wall deformation, fixing mode-switching leaks), this phase implements 6 additional optimizations to achieve stable 60 FPS on mobile devices. These optimizations target physics computation, rendering complexity, and unnecessary features on touch devices.

## Goals

- Reduce physics CPU load by 50% on mobile (120Hz → 60Hz)
- Reduce Kaleidoscope render calls by 50% (12 → 6 wedges)
- Eliminate unnecessary context state changes in Ball.draw()
- Disable mouse trail on touch devices (no benefit)
- Reduce corner repeller overhead (4 → 2 corners)
- Maintain visual quality that users won't notice degradation

## User Stories

### US-001: Lower physics Hz on mobile ✅
**Description:** As a mobile user, I want physics to run at 60Hz instead of 120Hz so the simulation uses less CPU.

**Acceptance Criteria:**
- [x] Add `PHYSICS_DT_MOBILE: 1/60` constant to constants.js
- [x] Engine.js uses mobile DT when `isMobile || isMobileViewport` is true
- [x] Physics still feels smooth (60Hz is sufficient for 60 FPS display)
- [x] npm run build passes

### US-002: Reduce corner repellers on mobile ✅
**Description:** As a mobile user, I want fewer corner collision checks so physics runs faster.

**Acceptance Criteria:**
- [x] On mobile, only check TOP-LEFT and TOP-RIGHT corners (indices 0, 1)
- [x] Bottom corners skipped (floor collision handles bottom edge)
- [x] Desktop still checks all 4 corners
- [x] npm run build passes

### US-003: Reduce Kaleidoscope wedges on mobile ✅
**Description:** As a mobile user, I want Kaleidoscope to render fewer wedges so it maintains 60 FPS.

**Acceptance Criteria:**
- [x] Add `kaleidoscopeWedgesMobile` state key (default: 6)
- [x] renderKaleidoscope() uses 6 wedges on mobile instead of 12
- [x] Pre-compute cos/sin lookup table for wedge angles (avoid trig in hot loop)
- [x] Desktop retains full wedge count from config
- [x] npm run build passes

### US-004: Increase Ball.draw() squash threshold ✅
**Description:** As a developer, I want to skip expensive context transforms for imperceptible squash amounts.

**Acceptance Criteria:**
- [x] Change squash threshold from 0.001 to 0.01 in Ball.draw()
- [x] Change squash threshold from 0.001 to 0.01 in engine.js render loop
- [x] Squash amounts below 0.01 use fast path (no save/translate/rotate/scale/restore)
- [x] npm run build passes

### US-005: Disable mouse trail on mobile ✅
**Description:** As a mobile user, I don't need mouse trails since I'm using touch, saving CPU cycles.

**Acceptance Criteria:**
- [x] detectResponsiveScale() sets `mouseTrailEnabled: false` on mobile
- [x] Mouse trail rendering completely skipped on mobile
- [x] Desktop mouse trail still works normally
- [x] npm run build passes

### US-006: Reduce collision iterations on mobile ✅
**Description:** As a mobile user, I want fewer collision solver iterations for faster physics.

**Acceptance Criteria:**
- [x] detectResponsiveScale() sets `physicsCollisionIterations: 4` on mobile (default is 10)
- [x] Collisions still resolve reasonably (4 iterations is sufficient for most cases)
- [x] Desktop retains 10 iterations
- [x] npm run build passes

### US-007: Validate mobile performance ✅
**Description:** As a developer, I need to verify all optimizations work correctly on mobile viewport.

**Acceptance Criteria:**
- [x] Use dev-browser skill to test on 375x667 mobile viewport
- [x] Switch through at least 3 modes including Kaleidoscope
- [x] Verify Kaleidoscope shows 6-wedge symmetry on mobile
- [x] No visual glitches or physics instability
- [x] npm run build passes

## Functional Requirements

- FR-1: Add `PHYSICS_DT_MOBILE` constant (1/60) to constants.js
- FR-2: Engine.js must select appropriate physics DT based on mobile detection
- FR-3: Corner repeller loop must check only 2 corners on mobile (top-left, top-right)
- FR-4: Kaleidoscope wedge count must be 6 on mobile, configurable on desktop
- FR-5: Ball.draw() squash threshold must be 0.01 (was 0.001)
- FR-6: Mouse trail must be disabled on mobile devices
- FR-7: Collision iterations must be 4 on mobile (was 10)
- FR-8: All mobile flags set in detectResponsiveScale() for single source of truth

## Non-Goals

- No dynamic quality adaptation based on FPS
- No user-facing performance toggle
- No changes to audio system
- No changes to color/visual appearance
- No iPad-specific optimizations (treat as mobile)

## Technical Considerations

### Files to Modify:
1. **source/modules/core/constants.js** - Add PHYSICS_DT_MOBILE
2. **source/modules/core/state.js** - Set mobile defaults in detectResponsiveScale()
3. **source/modules/physics/engine.js** - Use mobile DT, reduce corner repellers
4. **source/modules/physics/Ball.js** - Increase squash threshold
5. **source/modules/modes/kaleidoscope.js** - Reduce wedges, add trig lookup table

### Mobile Detection:
Uses existing `isMobile` and `isMobileViewport` flags in state.js, set during detectResponsiveScale().

### Performance Impact Estimates:
- Physics Hz: 50% fewer physics steps per frame
- Corner repellers: 50% fewer Math.hypot calls per ball per step
- Kaleidoscope: 50% fewer arc() calls in nested loop
- Squash threshold: Eliminates save/restore for ~90% of balls
- Mouse trail: Eliminates all trail rendering overhead

## Success Metrics

- Stable 60 FPS on mobile viewport (375x667)
- No visible physics instability (balls don't clip through walls)
- Kaleidoscope still looks good with 6 wedges
- Console logs confirm all optimizations active

## Open Questions

- None - all clarifying questions answered
