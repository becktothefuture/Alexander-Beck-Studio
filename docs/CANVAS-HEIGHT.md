# Dynamic Canvas Height System

## Implementation Summary

The canvas uses **mode-specific heights** to optimize performance and enable proper physics behavior:
- **Ball Pit**: 150vh (spawning space above viewport)
- **Flies & Zero-G**: 100svh (viewport-sized, efficient)

---

## Why Dynamic Heights?

### The Problem
Ball Pit mode needs balls to spawn **above the visible viewport** for a polished "falling into view" effect. Other modes don't need this extra space.

### The Solution
Use CSS classes to dynamically adjust canvas height based on active mode.

---

## Technical Implementation

### CSS
```css
/* Default for most modes */
#bravia-balls {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100svh; /* Mobile-friendly viewport height */
}

/* Ball Pit mode override */
#bravia-balls.mode-pit {
  height: 150vh; /* Extra 50vh above viewport */
}

/* Canvas matches parent */
#bravia-balls canvas {
  width: 100%;
  height: 100%; /* Inherits from parent */
}
```

### JavaScript
```javascript
const CONSTANTS = {
  CANVAS_HEIGHT_VH_PIT: 1.5,     // 150vh for Ball Pit
  CANVAS_HEIGHT_VH_DEFAULT: 1.0, // 100vh for others
};

function setMode(mode) {
  currentMode = mode;
  
  // Update container CSS class
  container.className = '';
  if (currentMode === MODES.PIT) {
    container.classList.add('mode-pit');
  }
  
  // Resize canvas to match
  resize();
  // ... rest of mode setup
}

function resize() {
  const heightMultiplier = (currentMode === MODES.PIT) 
    ? CONSTANTS.CANVAS_HEIGHT_VH_PIT 
    : CONSTANTS.CANVAS_HEIGHT_VH_DEFAULT;
    
  const simHeight = window.innerHeight * heightMultiplier;
  canvas.width = Math.floor(window.innerWidth * DPR);
  canvas.height = Math.floor(simHeight * DPR);
}
```

---

## Coordinate Systems

### Ball Pit Mode (150vh)
```
                    ← Canvas top (y = 0)
┌─────────────────┐
│   SPAWN AREA    │ ← Balls spawn here (hidden)
│   ▼  ▼  ▼  ▼   │
├─────────────────┤ ← Viewport top (y = h/3)
│                 │
│  VISIBLE AREA   │ ← User sees this
│                 │
└─────────────────┘ ← Ground (y = h)
```

**Key Points**:
- Canvas: 0 to h (150vh in pixels)
- Viewport: h/3 to h (bottom 100vh visible)
- Spawn area: 0 to h/3 (top 50vh hidden)
- Top wall collision: `viewportTop = h / 3`

### Flies & Zero-G Modes (100svh)
```
┌─────────────────┐ ← Canvas top & viewport top (y = 0)
│                 │
│  VISIBLE AREA   │ ← Entire canvas visible
│                 │
└─────────────────┘ ← Ground (y = h)
```

**Key Points**:
- Canvas: 0 to h (100svh in pixels)
- Viewport: 0 to h (entire canvas visible)
- 1:1 mapping (simpler coordinates)
- Top wall collision: `viewportTop = 0`

---

## Top Wall Collision Logic

```javascript
// In Ball.walls() method
const viewportTop = (currentMode === MODES.PIT) 
  ? (h / 3)  // Ball Pit: viewport top at 1/3 of canvas
  : 0;       // Others: viewport top at canvas top

if (this.y - this.r < viewportTop) {
  this.y = viewportTop + this.r;
  this.vy = -this.vy * rest;
  // ... impact effects
}
```

---

## Benefits by Mode

### Ball Pit (150vh)
- ✅ Balls spawn above viewport (hidden)
- ✅ Smooth "falling into view" experience
- ✅ Professional spawning behavior
- ✅ Maintains classic physics playground feel

### Flies (100svh)
- ✅ Canvas = viewport (1:1 mapping)
- ✅ 33% smaller canvas (less pixels to render)
- ✅ Cleaner coordinate system
- ✅ Mobile-friendly (`svh` respects browser UI)
- ✅ No wasted hidden space

### Zero-G (100svh)
- ✅ Canvas = viewport (1:1 mapping)
- ✅ Perfect 4-wall collisions
- ✅ Top wall at exact viewport edge
- ✅ 33% smaller canvas
- ✅ Simpler physics boundaries

---

## Performance Impact

### Canvas Size Reduction
- **Ball Pit**: 150vh (1.5 × viewport height)
- **Flies**: 100svh (1.0 × viewport height) → **33% smaller**
- **Zero-G**: 100svh (1.0 × viewport height) → **33% smaller**

### Rendering Performance
For a 1920×1080 viewport:
- **Ball Pit**: 1920 × 1620 = 3,110,400 pixels
- **Flies**: 1920 × 1080 = 2,073,600 pixels (33% fewer)
- **Zero-G**: 1920 × 1080 = 2,073,600 pixels (33% fewer)

**Result**: Flies and Zero-G modes render 33% fewer pixels per frame!

---

## Mobile Considerations

### Why `100svh` Instead of `100vh`?

**`100svh` (Small Viewport Height)**:
- ✅ Accounts for mobile browser UI (address bar, toolbar)
- ✅ Stable on mobile (doesn't resize when scrolling)
- ✅ Better UX on iOS Safari and Chrome mobile
- ✅ Canvas size stays consistent

**`100vh` (Viewport Height)**:
- ❌ Unstable on mobile (changes with UI visibility)
- ❌ Can cause canvas to resize during scroll
- ❌ iOS Safari includes hidden toolbar in calculation

**For Ball Pit, we use `150vh`**:
- The 50vh spawning space is worth the minor mobile quirk
- Mobile users typically don't resize browser UI frequently
- The visual benefit (spawning above) outweighs the small caveat

---

## Mode Switching Behavior

### What Happens
1. User presses `2` (Flies mode)
2. `setMode('flies')` is called
3. Container class cleared (removes `.mode-pit`)
4. Canvas instantly resizes from 150vh → 100svh
5. Balls array cleared
6. New balls spawn in smaller canvas
7. Physics updates with new viewport boundaries

### Transition
- **No CSS animation** (removed for performance)
- **Instant resize** (mode switches are instant events)
- **Clean state** (balls cleared, physics reset)
- **Smooth experience** (60 FPS maintained)

---

## Implementation Checklist

### ✅ CSS
- [x] Default height: `100svh`
- [x] `.mode-pit` class: `150vh`
- [x] Canvas: `height: 100%` (matches parent)
- [x] No transition (instant is better)

### ✅ JavaScript
- [x] Constants for both heights
- [x] `setMode()` toggles container class
- [x] `resize()` calculates height per mode
- [x] Top wall collision adapts to mode
- [x] Container element reference

### ✅ Physics
- [x] Viewport top at `h/3` for Ball Pit
- [x] Viewport top at `0` for others
- [x] Wall collisions work correctly
- [x] Spawn points adjusted per mode

---

## Testing Verification

### Ball Pit
- ✅ Balls spawn above viewport (not visible initially)
- ✅ Balls fall into view naturally
- ✅ Top wall collision at viewport edge (not canvas top)
- ✅ Canvas is 150vh tall

### Flies
- ✅ Canvas exactly matches viewport
- ✅ No extra space at top
- ✅ Top wall collision at canvas top (y=0)
- ✅ Canvas is 100svh tall

### Zero-G
- ✅ Canvas exactly matches viewport
- ✅ Top wall collision at exact viewport edge
- ✅ Balls bounce perfectly off all 4 walls
- ✅ Canvas is 100svh tall

---

## Alternative Approaches Considered

### ❌ Single 150vh Canvas for All Modes
**Why Not**: Wastes 33% of pixels for Flies and Zero-G modes.

### ❌ Spawn at Negative Y Coordinates
**Why Not**: More complex, breaks coordinate system assumptions, harder to debug.

### ❌ 100vh for All + Spawn Delay
**Why Not**: Balls would appear instantly at top of viewport (not polished).

### ✅ Dynamic Height (Chosen Solution)
**Why Yes**: 
- Best of both worlds
- Optimal performance per mode
- Clean coordinates
- Professional spawning
- Simple to understand

---

## Future Enhancements

### Potential Improvements
1. **Per-mode DPR**: Higher pixel ratio for simpler modes
2. **Adaptive canvas**: Adjust height based on actual ball positions
3. **Offscreen culling**: Don't render balls outside viewport
4. **WebGL mode**: Leverage GPU for larger canvases

### Not Recommended
- ❌ Animated transitions (performance cost, no UX benefit)
- ❌ Dynamic resizing during gameplay (causes jank)
- ❌ Multiple canvases per mode (complexity)

---

## Summary

The dynamic canvas height system is a **clever optimization** that:
- Enables proper Ball Pit spawning behavior (150vh)
- Optimizes Flies and Zero-G performance (100svh, 33% smaller)
- Uses simple CSS class toggling (clean implementation)
- Has zero visual compromises (best of both worlds)

**Impact**: Better performance for 2/3 modes with perfect spawning for Ball Pit.

---

**See `MODES.md` for mode-specific details.**  
**See `PERFORMANCE.md` for overall optimization strategies.**
