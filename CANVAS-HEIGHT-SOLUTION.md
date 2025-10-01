# Canvas Height Solution

## Current System (150vh with overflow)

### Current Setup:
- Canvas: **150vh tall** (1.5x viewport height)
- Visible: Bottom **100vh** (viewport)
- Hidden: Top **50vh** (above viewport, out of sight)
- Purpose: Balls spawn in the hidden 50vh area and fall into view

### How it works:
```
┌─────────────────┐
│   HIDDEN 50vh   │ ← Balls spawn here (out of sight)
│   ▼  ▼  ▼  ▼   │
├─────────────────┤ ← Viewport top edge (h/3)
│                 │
│  VISIBLE 100vh  │ ← User sees this
│                 │
└─────────────────┘ ← Ground (h)
```

---

## Proposed Solution (100svh with spawn offset)

### New Approach:
- Canvas: **100svh tall** (exactly viewport height)
- Spawn offset: Balls spawn **above canvas** (negative Y position)
- Same visual result, cleaner bounds

### How it would work:
```
    ▼  ▼  ▼  ▼       ← Balls spawn at y = -100px (above canvas)
┌─────────────────┐
│                 │ ← Canvas top (y = 0)
│                 │
│  VISIBLE 100svh │ ← User sees full canvas
│                 │
└─────────────────┘ ← Ground (y = canvas.height)
```

---

## Implementation Changes Needed

### 1. **CSS Changes**
```css
/* BEFORE (current) */
#bravia-balls {
  height: 150vh;
}
#bravia-balls canvas {
  height: 150vh;
}

/* AFTER (proposed) */
#bravia-balls {
  height: 100svh; /* or 100vh */
}
#bravia-balls canvas {
  height: 100svh; /* or 100vh */
}
```

### 2. **JavaScript Constants**
```javascript
// BEFORE (current)
const CONSTANTS = {
  CANVAS_HEIGHT_VH: 1.5,  // 150vh
  // ...
};

// AFTER (proposed)
const CONSTANTS = {
  CANVAS_HEIGHT_VH: 1.0,  // 100vh
  SPAWN_OFFSET_PX: 100,   // Spawn balls 100px above canvas
  // ...
};
```

### 3. **Resize Function**
```javascript
// BEFORE (current)
function resize() {
  const simHeight = window.innerHeight * 1.5;  // 150vh
  canvas.height = Math.floor(simHeight * DPR);
}

// AFTER (proposed)
function resize() {
  const simHeight = window.innerHeight;  // 100vh (or svh if available)
  canvas.height = Math.floor(simHeight * DPR);
}
```

### 4. **Spawn Point Function**
```javascript
// BEFORE (current)
function pickSpawnPoint() {
  const wCss = canvas.clientWidth;
  const hCss = canvas.clientHeight;  // 150vh in CSS pixels
  // ... calculate spawn point in top 50vh
  const y = yTopCss * DPR - (R_MAX + SPAWN_OFFSET);
  return { x, y };
}

// AFTER (proposed)
function pickSpawnPoint() {
  const wCss = canvas.clientWidth;
  const hCss = canvas.clientHeight;  // 100vh in CSS pixels
  // Spawn ABOVE canvas (negative Y)
  const spawnHeight = CONSTANTS.SPAWN_OFFSET_PX * DPR;  // e.g., 100px
  const y = -spawnHeight - R_MAX;  // Negative = above canvas
  return { x, y };
}
```

### 5. **Top Wall Collision**
```javascript
// BEFORE (current)
const viewportTop = h / 3;  // Top of visible viewport (150vh system)
if (this.y - this.r < viewportTop) {
  this.y = viewportTop + this.r;
  this.vy = -this.vy * rest;
}

// AFTER (proposed)
const viewportTop = 0;  // Canvas top IS viewport top (100vh system)
if (this.y - this.r < viewportTop) {
  this.y = viewportTop + this.r;
  this.vy = -this.vy * rest;
}
```

---

## Benefits of 100svh Approach

### ✅ Pros:
1. **Simpler mental model** - Canvas matches viewport 1:1
2. **No hidden overflow** - Entire canvas is visible
3. **Better mobile support** - `100svh` respects mobile browser UI
4. **Cleaner coordinates** - Top = 0, Bottom = height
5. **Easier debugging** - What you see is what's in the canvas

### ❌ Cons:
1. **Balls start visible** - Balls spawn above canvas, briefly in "limbo"
2. **No render culling benefit** - Can't skip rendering balls in hidden area

### Trade-off:
The visual result is **identical** - balls still appear to fall from above the viewport. The only difference is technical: they start at negative Y coordinates instead of in a hidden canvas area.

---

## Visual Comparison

### Current (150vh):
```
Ball spawns:  y = 500px (in hidden 50vh area)
Falls to:     y = 1000px (visible viewport)
Lands at:     y = 1500px (ground)
```

### Proposed (100svh):
```
Ball spawns:  y = -100px (above canvas, same visual position)
Falls to:     y = 500px (visible viewport)
Lands at:     y = 1000px (ground)
```

**User sees the exact same thing** - balls falling from above the viewport!

---

## Recommendation

### Use `100svh` if:
- ✅ You want simpler, cleaner code
- ✅ Mobile browser UI matters (address bar, etc.)
- ✅ You prefer 1:1 canvas/viewport mapping
- ✅ You're okay with balls starting at negative Y

### Keep `150vh` if:
- ✅ You want balls to be "in canvas" before being visible
- ✅ Current system is working perfectly (don't fix what ain't broke)
- ✅ You might add render culling for off-screen balls later

---

## My Recommendation: **Use 100svh** ✅

**Why:**
1. Modern best practice (svh handles mobile UI)
2. Simpler coordinate system
3. Identical visual result
4. Easier to understand and maintain
5. More flexible for future canvas size changes

**Implementation effort:** ~30 lines of code changes  
**Risk:** Very low (thoroughly testable)  
**Visual change:** None (identical to user)

---

## Code Changes Summary

If you want to switch to 100svh:

1. **CSS**: Change `150vh` → `100svh` (2 places)
2. **Constants**: Change `CANVAS_HEIGHT_VH: 1.5` → `1.0`
3. **Spawn**: Modify `pickSpawnPoint()` to use negative Y
4. **Collision**: Change `viewportTop = h / 3` → `viewportTop = 0`
5. **Test**: Verify all 3 modes work identically

Would you like me to implement this change? It's straightforward and will give you the clean 100svh canvas you want while keeping the current spawning behavior! 🚀

