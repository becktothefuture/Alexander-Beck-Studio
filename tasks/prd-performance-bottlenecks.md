# PRD: Performance Bottleneck Fixes

## Introduction

Fix three high-impact performance bottlenecks in the physics/rendering pipeline to achieve stable 60 FPS with up to 300 balls. These optimizations target per-frame memory allocations and redundant function calls—**without modifying the wall system** (wall-state.js is fragile and out of scope).

## Goals

- Eliminate per-frame garbage collection pauses from Map/array allocations
- Reduce redundant `getGlobals()` function call overhead
- Remove unnecessary O(n log n) sorting in collision detection
- Maintain stable 60 FPS across all 20 simulation modes
- Zero visual or behavioral changes to existing functionality

## User Stories

### US-001: Eliminate Per-Frame Map Allocation in Render

**Description:** As a user on a lower-powered device, I want smooth animation without GC pauses so the balls don't stutter.

**Acceptance Criteria:**
- [ ] No `new Map()` calls inside `render()` function
- [ ] No `[]` array literal allocations inside the color-batching loop
- [ ] Color batching still groups balls correctly (same render output)
- [ ] Function signature of `render()` unchanged
- [ ] `npm run build` succeeds

---

### US-002: Remove Collision Pair Sorting

**Description:** As a user with many balls on screen, I want physics to run efficiently so the simulation stays responsive.

**Acceptance Criteria:**
- [ ] `reusablePairs.sort()` call removed from `collectPairsSorted()`
- [ ] Ball-to-ball collisions still resolve without visible overlap
- [ ] No increase in collision "popping" or instability in Ball Pit mode
- [ ] Function signature of `collectPairsSorted()` unchanged
- [ ] `npm run build` succeeds

---

### US-003: Cache getGlobals() in Hot Paths

**Description:** As a user, I want maximum performance so the simulation runs smoothly even with 300 balls.

**Acceptance Criteria:**
- [ ] `getGlobals()` called at most once at the top of `updatePhysicsInternal()`
- [ ] `getGlobals()` called at most once at the top of `render()`
- [ ] `getGlobals()` called at most once at the top of `resolveCollisions()`
- [ ] `getGlobals()` called at most once at the top of `collectPairsSorted()`
- [ ] All existing function signatures unchanged (no new parameters)
- [ ] Cached globals passed via closure or module-level variable within each function
- [ ] `npm run build` succeeds

---

## Functional Requirements

- **FR-1:** Create module-level `colorBatchCache` object in engine.js with reusable Map and array pool
- **FR-2:** Add `resetColorBatchCache()` helper to clear Map and reset array pool index
- **FR-3:** Add `getColorArray()` helper to return pooled array or create new one if needed
- **FR-4:** Replace `new Map()` in render() with `colorBatchCache.map`
- **FR-5:** Replace `[]` array literals with `getColorArray()` calls
- **FR-6:** Remove the `.sort()` call on line 102 of collision.js
- **FR-7:** Hoist `const globals = getGlobals()` to top of each hot function
- **FR-8:** Replace all subsequent `getGlobals()` calls with the cached `globals` variable

## Non-Goals

- ❌ Modifying wall-state.js or any wall rendering code
- ❌ Changing physics behavior, collision response, or ball appearance
- ❌ Adding new function parameters or changing APIs
- ❌ Implementing medium-impact optimizations (sqrt caching, sleep wake checks)
- ❌ Memory profiling or FPS instrumentation (manual testing only)

## Technical Considerations

### Files to Modify

| File | Changes |
|------|---------|
| `source/modules/physics/engine.js` | US-001 (color batch cache), US-003 (cache globals in render, updatePhysicsInternal) |
| `source/modules/physics/collision.js` | US-002 (remove sort), US-003 (cache globals in resolveCollisions, collectPairsSorted) |

### Constraints

- Function signatures must remain unchanged for strict backward compatibility
- All changes must be internal implementation details only
- The wall system (wall-state.js) must not be touched

### Risk Areas

- **US-002 (sort removal):** Could theoretically affect collision convergence in edge cases. Requires visual verification across all modes, especially Ball Pit with 300 balls.

## Success Metrics

- All 20 simulation modes visually identical before/after
- No visible stuttering or GC pauses during steady-state animation
- Ball Pit mode with 300 balls maintains smooth animation

## Open Questions

- None. Scope is locked to the three high-impact bottlenecks with strict signature preservation.
