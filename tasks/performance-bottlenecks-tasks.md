# Performance Bottleneck Tasks

Parent: **Performance Bottleneck Fixes**
PRD: [prd-performance-bottlenecks.md](./prd-performance-bottlenecks.md)

---

## Task Status Legend
- `[ ]` Open (not started)
- `[~]` In Progress  
- `[x]` Completed
- `[!]` Blocked

---

## TASK-001: Eliminate Per-Frame Map Allocation in Render
**Status:** `[x]` Completed  
**Depends On:** None  
**Files:** `source/modules/physics/engine.js`

**Description:**
Create a module-level color batch cache to eliminate per-frame Map and array allocations in the `render()` function.

**What to do:**
1. Add module-level `colorBatchCache` object at top of engine.js with:
   - `map`: A reusable Map instance
   - `arrays`: Pool of reusable arrays
   - `arrayIndex`: Counter for array pool
2. Add `getColorArray()` helper that returns pooled array or creates new one
3. Add `resetColorBatchCache()` helper to clear map and reset array index
4. Replace `const ballsByColor = new Map()` with `resetColorBatchCache(); const ballsByColor = colorBatchCache.map`
5. Replace `ballsByColor.set(color, [])` with `ballsByColor.set(color, getColorArray())`

**Acceptance Criteria:**
- [ ] No `new Map()` calls inside `render()` function
- [ ] No `[]` array literal allocations inside the color-batching loop
- [ ] Color batching still groups balls correctly (same render output)
- [ ] Function signature of `render()` unchanged
- [ ] `npm run build` succeeds

---

## TASK-002: Remove Collision Pair Sorting
**Status:** `[x]` Completed  
**Depends On:** None  
**Files:** `source/modules/physics/collision.js`

**Description:**
Remove the O(n log n) sort on collision pairs that runs every physics step. The sort prioritizes larger overlaps but isn't strictly necessary for convergence.

**What to do:**
1. Locate line 102 in collision.js: `reusablePairs.sort((a, b) => b.overlap - a.overlap);`
2. Remove or comment out this line
3. Optionally rename function from `collectPairsSorted` to `collectPairs` (but keep export name for compatibility)

**Acceptance Criteria:**
- [ ] Sort call removed from `collectPairsSorted()`
- [ ] Ball-to-ball collisions still resolve without visible overlap
- [ ] No increase in collision "popping" or instability in Ball Pit mode
- [ ] Function signature unchanged
- [ ] `npm run build` succeeds

---

## TASK-003: Cache getGlobals() in engine.js
**Status:** `[x]` Completed (already optimized)  
**Depends On:** None  
**Files:** `source/modules/physics/engine.js`

**Description:**
Hoist `getGlobals()` calls to the top of hot functions in engine.js and use the cached value throughout.

**What to do:**
1. In `updatePhysicsInternal()`:
   - Keep existing `const globals = getGlobals()` at top (line 47)
   - Verify no other `getGlobals()` calls exist in this function
2. In `render()`:
   - Add `const globals = getGlobals()` at top (after null checks)
   - Replace `globals.xxx` lookups that currently call `getGlobals()` with cached value

**Acceptance Criteria:**
- [ ] `getGlobals()` called at most once at the top of `updatePhysicsInternal()`
- [ ] `getGlobals()` called at most once at the top of `render()`
- [ ] Function signatures unchanged
- [ ] `npm run build` succeeds

---

## TASK-004: Cache getGlobals() in collision.js
**Status:** `[x]` Completed (already optimized)  
**Depends On:** None  
**Files:** `source/modules/physics/collision.js`

**Description:**
Hoist `getGlobals()` calls to the top of hot functions in collision.js and use the cached value throughout.

**What to do:**
1. In `collectPairsSorted()`:
   - Keep existing `const globals = getGlobals()` at top (line 15)
   - Verify no other `getGlobals()` calls exist in this function
2. In `resolveCollisions()`:
   - Keep existing `const globals = getGlobals()` at top (line 107)
   - Verify no other `getGlobals()` calls exist in this function
3. In `resolveCollisionsCustom()`:
   - Add `const globals = getGlobals()` at top if not present
   - Replace all subsequent calls with cached value

**Acceptance Criteria:**
- [ ] `getGlobals()` called at most once at the top of `resolveCollisions()`
- [ ] `getGlobals()` called at most once at the top of `collectPairsSorted()`
- [ ] `getGlobals()` called at most once at the top of `resolveCollisionsCustom()`
- [ ] Function signatures unchanged
- [ ] `npm run build` succeeds

---

## Summary

| Task | Title | Status | Depends On |
|------|-------|--------|------------|
| TASK-001 | Eliminate Per-Frame Map Allocation | ✅ Completed | - |
| TASK-002 | Remove Collision Pair Sorting | ✅ Completed | - |
| TASK-003 | Cache getGlobals() in engine.js | ✅ Already optimized | - |
| TASK-004 | Cache getGlobals() in collision.js | ✅ Already optimized | - |

**🎉 All tasks complete!**
