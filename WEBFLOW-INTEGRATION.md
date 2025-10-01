# Webflow Integration Guide

Your bouncy balls system is **already fully compatible** with your Webflow export structure! ✅

---

## Your Current Structure (Perfect!)

### In `public/index.html` (lines 23-25):
```html
<div id="bravia-balls">
  <canvas id="c" aria-label="Bouncy balls" role="img" draggable="false"></canvas>
</div>
```

**This is exactly what the system expects!** ✅

---

## How It Works

### 1. **Canvas Detection**
The embed script automatically finds your canvas:
```javascript
const canvas = document.getElementById('c');
```

### 2. **Wrapper Structure**
Your wrapper `<div id="bravia-balls">` contains the canvas, which is the standard structure.

### 3. **Script Loading**
```html
<script src="js/bouncy-balls-embed.js" type="text/javascript"></script>
```
Loaded at the end of `<body>`, so DOM is ready ✅

---

## For Your New Webflow Export

When you export from Webflow, keep this **exact structure**:

### Option 1: Simple Canvas (Your Current Setup) ✅ **Recommended**
```html
<div id="bravia-balls">
  <canvas id="c" aria-label="Bouncy balls" role="img" draggable="false"></canvas>
</div>
```

### Option 2: With Custom Wrapper ID
If Webflow uses a different wrapper ID like `ball-simulation`:
```html
<div id="ball-simulation">
  <canvas id="c" aria-label="Bouncy balls" role="img" draggable="false"></canvas>
</div>
```

**Both work perfectly!** The script only needs the canvas with `id="c"`.

---

## CSS Integration

### Your Current CSS (from `bouncy-balls.css`):
```css
#bravia-balls {
  position: fixed;
  z-index: -1;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 150vh;
  overscroll-behavior: contain;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

#bravia-balls canvas {
  display: block;
  width: 100%;
  height: 150vh;
  position: absolute;
  bottom: 0;
  left: 0;
}
```

### If Webflow Changes Wrapper to `#ball-simulation`:
Just update the CSS selectors:
```css
#ball-simulation {
  position: fixed;
  z-index: -1;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 150vh;
  overscroll-behavior: contain;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

#ball-simulation canvas {
  display: block;
  width: 100%;
  height: 150vh;
  position: absolute;
  bottom: 0;
  left: 0;
}
```

---

## Integration Checklist

When you get your new Webflow export:

### ✅ Step 1: Add Canvas to Webflow
In Webflow Designer, add an **Embed** element with:
```html
<div id="bravia-balls">
  <canvas id="c" aria-label="Bouncy balls" role="img" draggable="false"></canvas>
</div>
```

Or use your preferred ID:
```html
<div id="ball-simulation">
  <canvas id="c" aria-label="Bouncy balls" role="img" draggable="false"></canvas>
</div>
```

### ✅ Step 2: Add CSS
Either:
1. Add `bouncy-balls.css` as a custom CSS file in Webflow
2. Or paste the CSS into Webflow's **Page Settings → Custom Code → Head Code**:
   ```html
   <style>
   #bravia-balls {
     position: fixed;
     z-index: -1;
     bottom: 0;
     left: 0;
     width: 100%;
     height: 150vh;
     overscroll-behavior: contain;
     -webkit-tap-highlight-color: transparent;
     user-select: none;
     -webkit-user-select: none;
     -webkit-touch-callout: none;
   }
   #bravia-balls canvas {
     display: block;
     width: 100%;
     height: 150vh;
     position: absolute;
     bottom: 0;
     left: 0;
   }
   </style>
   ```

### ✅ Step 3: Add Script
In Webflow **Page Settings → Custom Code → Before </body> tag**:
```html
<script src="https://your-domain.com/js/bouncy-balls-embed.js"></script>
```

Or for local development:
```html
<script src="js/bouncy-balls-embed.js"></script>
```

### ✅ Step 4: Export & Deploy
1. Export from Webflow
2. Copy `js/bouncy-balls-embed.js` to your export folder
3. Deploy!

---

## Current vs. New Export

### Your Current Setup (Works Perfectly!)
```
public/
├── index.html          # Has canvas + script
├── css/
│   ├── bouncy-balls.css
│   └── ... (Webflow CSS)
└── js/
    ├── bouncy-balls-embed.js  ← The magic!
    └── webflow.js
```

### After New Webflow Export
```
your-export/
├── index.html          # From Webflow (add canvas)
├── css/
│   ├── bouncy-balls.css  ← Copy from current
│   └── ... (Webflow CSS)
└── js/
    ├── bouncy-balls-embed.js  ← Copy from current (34.4 KB)
    └── webflow.js
```

**Just copy 2 files:**
1. `css/bouncy-balls.css`
2. `js/bouncy-balls-embed.js`

---

## Canvas ID Requirements

### ✅ Must Have:
```html
<canvas id="c" ... ></canvas>
```
The script **requires** `id="c"` to find the canvas.

### ✅ Recommended Attributes:
```html
<canvas 
  id="c" 
  aria-label="Bouncy balls" 
  role="img" 
  draggable="false"
></canvas>
```
- `aria-label` - Accessibility for screen readers
- `role="img"` - Semantic role for assistive tech
- `draggable="false"` - Prevents canvas drag on desktop

### ❌ Don't Change:
- Canvas ID must stay `id="c"`
- Canvas must be in the DOM when script runs

### ✅ Flexible:
- Wrapper ID can be anything (`bravia-balls`, `ball-simulation`, etc.)
- You can add extra classes or data attributes
- Canvas doesn't need inline styles (handled by CSS)

---

## Build Process

The build system automatically:
1. **Removes the control panel** (desktop UI for development)
2. **Applies your config** (from `current-config-2.json`)
3. **Minifies the code** (to 34.4 KB)
4. **Outputs** `public/js/bouncy-balls-embed.js`

### Current Configuration Applied:
```json
{
  "theme": "industrialTeal",
  "gravityMultiplier": 1.1,
  "ballScale": 0.7,
  "emitRate": 0.033,
  "maxBalls": 300,
  ...
}
```

---

## Testing Your Integration

### 1. Local Test (Current Setup)
```bash
# Open in browser
open public/index.html

# Or run a local server
npx serve public
```

### 2. After Webflow Export
```bash
# In your export folder
npx serve .
```

### 3. Verify It Works
- ✅ Balls appear behind content
- ✅ Balls respect text ("Alexander Beck Studio.")
- ✅ Mouse interaction works (repeller in Ball Pit mode)
- ✅ No console errors
- ✅ 60 FPS smooth performance

---

## Troubleshooting

### Problem: Balls don't appear
**Fix**: Check console for errors. Usually means:
- Canvas ID is wrong (must be `id="c"`)
- Script loaded before DOM ready (move to end of `<body>`)
- CSS missing (balls might be hidden)

### Problem: Balls appear on top of content
**Fix**: Check `z-index` in CSS:
```css
#bravia-balls {
  z-index: -1; /* Must be negative! */
}
```

### Problem: Performance issues
**Fix**: Already optimized! But if needed:
- Reduce `maxBalls` in config (currently 300)
- Reduce ball size scale (currently 0.7)
- Disable motion blur if extremely slow device

---

## Summary

### ✅ What You Have Now (Perfect!)
```html
<div id="bravia-balls">
  <canvas id="c" aria-label="Bouncy balls" role="img" draggable="false"></canvas>
</div>
```

### ✅ What Works with New Webflow Export
```html
<!-- Option 1: Same as current -->
<div id="bravia-balls">
  <canvas id="c" aria-label="Bouncy balls" role="img" draggable="false"></canvas>
</div>

<!-- Option 2: Your preferred ID -->
<div id="ball-simulation">
  <canvas id="c" aria-label="Bouncy balls" role="img" draggable="false"></canvas>
</div>

<!-- Option 3: Any wrapper with any classes -->
<div class="my-canvas-wrapper" id="whatever-you-want">
  <canvas id="c" aria-label="Bouncy balls" role="img" draggable="false"></canvas>
</div>
```

**As long as the canvas has `id="c"`, you're good!** 🎉

### The Only Requirement:
1. Canvas must have `id="c"`
2. Script loads after DOM (end of `<body>`)
3. CSS positions canvas correctly

**Your simple structure is perfect and will work with any Webflow export!** ✨

---

**Last Updated**: September 30, 2025  
**Bundle**: `bouncy-balls-embed.js` (34.4 KB)  
**Modes**: 3 (Ball Pit, Flies, Zero-G)  
**Status**: ✅ Production Ready

