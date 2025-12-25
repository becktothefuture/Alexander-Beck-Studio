# Ringbound Portfolio Flicker Analysis

## What We've Tried (Ruled Out)

### ✅ Fixed (Keep These Improvements)
1. **Removed `isolation: isolate`** from `.page-front` - This was breaking `preserve-3d` per MDN spec
2. **Removed `contain: layout style paint`** from `.notebook--transitioning` - Was flattening 3D context
3. **Removed `backface-visibility: hidden`** from parent containers (`.notebook`, `.notebook-inner`) - Was causing entire scene to vanish
4. **Fixed `.page-back` translateZ direction** - Changed from `-1.5px` to `+1.5px` after rotation (correct per MDN cube pattern)
5. **Increased Z-separation** - Front/back faces now at `±1.5px` (was `±1px`)
6. **JS-controlled face visibility** - Replaced unreliable CSS `backface-visibility` with explicit `visibility`/`opacity` toggles
7. **Replaced `display: none/block`** with `visibility: hidden/visible` + `opacity` - Avoids layout recalculation
8. **Batched visibility updates** - Inline style updates in same function as transforms
9. **Shifted `.page-content` to `translateZ(2px)`** - Content now sits above page faces

### ❌ Not the Root Cause
- Z-offset micro-adjustments (`0.001px` per page)
- Shadow lookup table optimization
- Ring update throttling
- Background blur overlay
- CSS transitions on transform (only on zoom, not page flip)

---

## What We Haven't Looked At (By Relevance)

### 🔴 CRITICAL - High Likelihood

#### 1. **Perspective Distance Precision Issue**
**Current:** `perspective: 13000px`  
**Problem:** When zoomed in (scale 1.1x), the effective perspective becomes ~11,818px. At this distance:
- Depth buffer precision is limited
- Small Z differences (1.5px) become indistinguishable
- Browser may round/quantize Z values causing flicker

**MDN Insight:** Perspective creates a "frustum" - objects too close together relative to perspective distance can z-fight.

**Investigation Needed:**
- Check if flicker only happens when zoomed (confirms perspective precision issue)
- Test with lower perspective (e.g., 5000px) when zoomed
- Consider dynamic perspective adjustment based on zoom level

#### 2. **CSS Transition on `.page` Element**
**Current:** `.page { transition: opacity 150ms, filter 100ms }`  
**Problem:** Even though we're not transitioning `transform`, the transition property might be interfering with rapid transform updates during flip.

**Investigation Needed:**
- Remove transition entirely from `.page` element
- Apply transitions only to specific properties that need them (opacity fade, not transform)

#### 3. **`filter` Property on `.page` Element**
**Current:** `.page { filter: var(--motion-blur-filter, none) }`  
**MDN Finding:** `filter: (non-none)` **forces `transform-style: flat`** even if `preserve-3d` is set!

**Critical:** If `--motion-blur-filter` is ever set to a non-none value, it flattens the entire 3D hierarchy.

**Investigation Needed:**
- Check if motion blur filter is ever applied during flip
- Move filter to a separate element that doesn't need 3D
- Or ensure filter is always `none` during flip

#### 4. **`overflow: visible` on Multiple 3D Containers**
**Current:** `.page`, `.notebook-inner`, `.notebook` all have `overflow: visible`  
**MDN Finding:** `overflow: (non-visible)` forces `transform-style: flat`, but `visible` should be safe.

**However:** Multiple nested `overflow: visible` containers might cause compositing issues.

**Investigation Needed:**
- Check if any parent has `overflow: hidden` or `overflow: auto`
- Verify compositing layers aren't being flattened

#### 5. **`will-change` Property Timing**
**Current:** `.page { will-change: transform, filter, opacity }`  
**Problem:** `will-change` creates a new compositing layer. If updated frequently, it can cause layer thrashing.

**Investigation Needed:**
- Remove `will-change` from `.page` (let browser decide)
- Or only set it when page is actively flipping

#### 6. **Transform Origin on Rotating Element**
**Current:** `.page { transform-origin: 50% 0% 0 }` (top edge)  
**Problem:** When zoomed, the transform origin calculation might shift, causing slight position jitter.

**Investigation Needed:**
- Verify transform-origin is stable during zoom
- Consider using `calc()` to account for zoom scale

### 🟡 MEDIUM - Worth Investigating

#### 7. **Multiple `transform-style: preserve-3d` Nesting**
**Current:** `.notebook`, `.notebook-inner`, `.page`, `.page-front` all have `preserve-3d`  
**Problem:** Deep nesting might cause browser to flatten intermediate layers.

**Investigation Needed:**
- Simplify nesting - only `.notebook` needs `preserve-3d`
- Children inherit automatically

#### 8. **CSS Custom Properties in Transform**
**Current:** `transform: translateZ(calc(5px + var(--page-z-offset, 0px)))`  
**Problem:** `calc()` in transforms might cause recalculation delays.

**Investigation Needed:**
- Pre-calculate Z values in JS, set directly
- Avoid `calc()` in hot path transforms

#### 9. **`backface-visibility: visible` on `.page`**
**Current:** `.page { backface-visibility: visible }`  
**Problem:** This might be causing both faces to render simultaneously even with visibility toggles.

**Investigation Needed:**
- Set `backface-visibility: hidden` on `.page` (not children)
- Let JS visibility control handle face switching

#### 10. **Render Loop Timing**
**Current:** Render called from scroll engine, potentially multiple times per frame  
**Problem:** Multiple DOM updates in same frame might cause intermediate states.

**Investigation Needed:**
- Ensure render only happens once per `requestAnimationFrame`
- Batch all DOM updates together

### 🟢 LOW - Unlikely but Possible

#### 11. **GPU Memory/Compositing Layer Limits**
- Too many compositing layers when zoomed
- Browser might be dropping layers causing flicker

#### 12. **Browser-Specific Depth Buffer Precision**
- Different browsers handle depth precision differently
- Safari might have different precision than Chrome

#### 13. **Subpixel Rendering**
- Fractional scroll positions might cause subpixel transform values
- Browser rounding might cause jitter

---

## Recommended Investigation Order

1. **Remove `filter` from `.page`** (or ensure it's always `none` during flip)
2. **Remove `transition` from `.page`** (or exclude `transform` from transition)
3. **Test perspective precision** - Lower perspective when zoomed, or adjust dynamically
4. **Simplify `transform-style` nesting** - Only on root container
5. **Pre-calculate Z values** - Avoid `calc()` in transforms
6. **Set `backface-visibility: hidden`** on `.page` element itself

---

## MDN Key Findings

From context7 research:

1. **Properties that force `transform-style: flat`:**
   - `isolation: isolate` ✅ Fixed
   - `opacity: < 1` ⚠️ Check if any page has opacity < 1
   - `filter: (non-none)` 🔴 **CRITICAL - Check `.page { filter }`**
   - `overflow: (non-visible)` ✅ Safe (we use `visible`)
   - `contain: paint` ✅ Fixed

2. **Perspective precision:** Large perspective values reduce depth buffer precision for nearby objects.

3. **Transform order matters:** `rotateX(180deg) translateZ(X)` - after rotation, local +Z points away from camera.

