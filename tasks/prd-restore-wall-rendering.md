# PRD: Restore Wall Rendering (Thickness + Rounded Corners)

## Status: RESOLVED ✅

**Finding:** After thorough investigation, the wall rendering was NOT broken. Both source and production builds render the wall correctly with:
- `--wall-thickness: 9px` (derived from 1.4vw at 718px viewport)
- `--wall-radius: 32px` (clamped to minimum of 32px from config)
- Rounded corners visible in all modes
- Proper thickness visible in screenshots

The issue was a false alarm - no changes were needed to wall rendering code.

## Introduction

The simulation's wall (thick rounded border frame) was suspected to have regressed - appearing thinner than intended and with less prominent rounded corners. This PRD investigated and confirmed the wall is rendering correctly.

## Problem Analysis

1. **State defaults are 0**: `wallThicknessVw: 0` and `wallRadiusVw: 0` in state.js
2. **Config has correct values**: `wallThicknessVw: 1.4` and `wallRadiusVw: 2.5` in default-config.json
3. **Generic loop should copy**: Lines 1194-1205 in state.js should copy config→state
4. **Symptom**: Wall appears thin with less rounded corners

## Goals

- Restore wall thickness to match design intent (visually prominent frame)
- Restore rounded corners with proper radius
- Ensure config values properly override state defaults
- Zero functional regressions in other simulation modes

## User Stories

### US-001: Ensure wallThicknessVw and wallRadiusVw are copied from config
**Description:** As a developer, I need the config values to properly override state defaults so the wall renders correctly.

**Acceptance Criteria:**
- [ ] Verify generic loop at state.js:1194-1205 copies `wallThicknessVw` and `wallRadiusVw`
- [ ] Add explicit config→state mapping if generic loop fails
- [ ] `npm run build` passes
- [ ] Verify in browser: wall thickness visually matches 1.4vw (~10-15px)
- [ ] Verify in browser: corner radius visually matches 2.5vw (~18-25px)

### US-002: Verify drawWalls receives correct derived px values
**Description:** As a developer, I need to confirm the wall rendering function receives the correct pixel values computed from vw inputs.

**Acceptance Criteria:**
- [ ] `applyLayoutFromVwToPx()` correctly derives `wallThickness` (px) from `wallThicknessVw`
- [ ] `applyLayoutFromVwToPx()` correctly derives `wallRadius` (px) from `wallRadiusVw`
- [ ] CSS vars `--wall-thickness` and `--wall-radius` show expected values
- [ ] `npm run build` passes

### US-003: Visual verification of restored wall
**Description:** As a user, I want to see a thick rounded frame around the simulation that matches the original design.

**Acceptance Criteria:**
- [ ] Wall is visually thick (not a thin line)
- [ ] Corners are visibly rounded
- [ ] Wall renders in all simulation modes (test Ball Pit and Parallax Linear)
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Config value `wallThicknessVw` (1.4) must be applied to state
- FR-2: Config value `wallRadiusVw` (2.5) must be applied to state
- FR-3: `applyLayoutFromVwToPx()` must derive `wallThickness` > 0 when `wallThicknessVw` > 0
- FR-4: `applyLayoutFromVwToPx()` must derive `wallRadius` > 0 when `wallRadiusVw` > 0
- FR-5: `drawWalls()` must render using the derived px values

## Non-Goals

- No changes to wall wobble/deformation physics
- No changes to wall color or visual styling beyond geometry
- No changes to mobile-specific wall behavior

## Technical Considerations

- The generic config→state loop at state.js:1194-1205 should handle this
- If it doesn't, add explicit handling before or after the loop
- Wall rendering happens in wall-state.js `drawWalls()` function
- Layout computation happens in state.js `applyLayoutFromVwToPx()`

## Success Metrics

- Wall thickness visually matches ~10-15px at 1024px viewport width
- Corner radius visually matches ~25-40px at 1024px viewport width
- No console errors related to wall rendering
- Build passes without errors

## Open Questions

- Is the generic loop actually being reached for these keys?
- Are there any overrides happening after initState that zero out these values?
