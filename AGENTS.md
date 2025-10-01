# AGENTS.md
**AI Agent Instructions for Alexander Beck Studio Website Project**

This file provides context and instructions to help AI coding agents work effectively on the Alexander Beck Studio interactive physics demo project.

---

## 🎯 Project Overview

This is a **high-performance particle physics simulation** featuring bouncy balls with three distinct modes:
- **Ball Pit** - Gravity-based collisions with mouse repeller
- **Flies to Light** - Swarm behavior attracted to cursor  
- **Zero-G** - Weightless bouncing with perfect elastic collisions

**Core Constraints:**
- 60 FPS performance target (non-negotiable)
- Vanilla JavaScript (zero dependencies in core)
- Mobile responsive (60% ball scaling, touch support)
- Canvas 2D primary, WebGL optional acceleration
- 34.6 KB minified bundle size

---

## 📁 File Structure & Navigation

### **Development Files** (Always edit these):
```
source/
├── balls-source.html      # Full simulation with UI panel (EDIT THIS)
├── build.js               # Production build script
├── current-config.json    # Runtime configuration (auto-saved)
├── save-config.js         # Config persistence helper
├── webgl-renderer.js      # WebGL acceleration module
└── webgl-test.html        # WebGL testing harness
```

### **Production Files** (Generated, don't edit directly):
```
public/
├── index.html              # Webflow-integrated production page
├── js/
│   └── bouncy-balls-embed.js  # Minified build output (34.6 KB)
└── css/
    └── bouncy-balls.css       # Compiled styles
```

### **Documentation** (Read before making changes):
```
docs/
├── INDEX.md               # Documentation hub (START HERE)
├── ARCHITECTURE.md        # Technical deep dive
├── DEVELOPMENT.md         # Dev workflow guide
├── MODES.md              # Physics mode specifications
├── PERFORMANCE.md         # Optimization strategies
├── CANVAS-HEIGHT.md       # Dynamic canvas system
└── WEBFLOW-INTEGRATION.md # Embedding guide
```

**Key Rule:** Use `glob_file_search` to find files by name, `codebase_search` to understand concepts/features.

---

## 🏗️ Architecture Principles

### **Physics Engine:**
- **Fixed timestep**: 120Hz physics loop, independent of render rate
- **Spatial hashing**: O(n) collision detection vs O(n²) naive
- **Ball class**: Single entity with position, velocity, mass, color, squash, spin
- **Elastic collisions**: Conservation of momentum with angular effects
- **Mode-specific**: Pit uses collisions + gravity, Flies skips collisions, Zero-G has no gravity

### **Performance Constraints:**
- O(1) hot paths (collision checks, rendering)
- Spatial grid rebuilt each frame (faster than maintaining)
- No object pooling needed (<300 balls)
- Debounced events (resize: 150ms, autosave: 500ms)
- RequestAnimationFrame with frame time capping

### **Canvas System:**
- **Dynamic height**: Ball Pit = 150vh (spawning space), others = 100svh (33% optimization)
- **CSS-driven sizing**: `.mode-pit` class controls height
- **DPR handling**: Device pixel ratio scaling for sharpness
- **Coordinate spaces**: Physics (pixels) vs Render (DPR-scaled)

---

## 🔧 Development Workflow

### **Setup:**
```bash
npm install              # One-time setup
```

### **Development Cycle:**
```bash
# 1. Open development file in browser
open source/balls-source.html

# 2. Make changes to source/balls-source.html
# 3. Refresh browser to test
# 4. Tune parameters via control panel (/)
# 5. Click "Save Config" button in panel

# 6. Build production version
npm run build

# 7. Test production build
npm run dev              # Runs http-server on port 8000
# Visit http://localhost:8000/public/
```

### **Auto-Rebuild Workflow:**
```bash
npm run watch            # Auto-rebuild on source changes
npm start                # Serve in another terminal
```

### **Production Build Workflow:**
```bash
# When Webflow export updates:
npm run build-production       # Copies webflow-export/ → public/
npm run watch-production       # Auto-rebuild on Webflow changes
npm run dev-production         # Test production build
```

**Critical:** Always test in `source/balls-source.html` first, then build to production.

---

## 🧪 Testing Approach

### **Manual Testing Checklist:**
```
□ Open source/balls-source.html
□ Test all 3 modes (keys 1, 2, 3)
□ Verify 60 FPS in console (showFPS = true)
□ Test mouse/touch interaction
□ Test panel controls (key /)
□ Check mobile responsive (device emulation)
□ Verify no console errors
□ Test prefers-reduced-motion behavior
```

### **Performance Validation:**
```javascript
// In browser console:
// 1. Check FPS counter (should be ~60)
// 2. Run performance profile (Chrome DevTools)
// 3. Verify no frame drops during interaction
// 4. Check memory usage (should be stable)

// Performance targets:
// - 60 FPS sustained with 200 balls (Ball Pit)
// - 60 FPS sustained with 300 balls (Flies)
// - 60 FPS sustained with 150 balls (Zero-G)
```

### **Build Validation:**
```bash
npm run build
ls -lh public/js/bouncy-balls-embed.js  # Should be ~35KB

# Check minification worked:
grep "function Ball" public/js/bouncy-balls-embed.js  # Should be minified
```

### **Integration Testing:**
```bash
# Test production Webflow integration:
npm run dev-production
# 1. Visit http://localhost:8000/public/
# 2. Verify simulation loads
# 3. Check control panel appears
# 4. Test mode switching
# 5. Verify styles preserved
```

**Note:** No automated test suite yet. Manual testing is required for all changes.

---

## 🎨 Code Style & Patterns

### **Naming Conventions:**
```javascript
// Classes: PascalCase
class Ball {}

// Constants: UPPER_SNAKE_CASE
const PHYSICS_DT = 1/120;
const MODES = { PIT: 'pit', FLIES: 'flies', WEIGHTLESS: 'weightless' };

// Variables: camelCase
let currentMode = MODES.PIT;
let mouseX = 0;

// Functions: camelCase (descriptive verbs)
function updatePhysics(dt) {}
function setMode(mode) {}
```

### **Comment Style:**
Use Swiss-grid box headers for file sections:
```javascript
// ╔════════════════════════════════════════════════════════════════════╗
// ║                         SECTION NAME                               ║
// ╚════════════════════════════════════════════════════════════════════╝
```

### **Code Organization (in balls-source.html):**
```
1. Constants & Configuration
2. Mode Definitions
3. Ball Class
4. Physics Functions
5. Collision Detection
6. Rendering
7. Event Handlers
8. UI Panel
9. Initialization
```

### **Performance Patterns:**
```javascript
// ✅ Good: Minimal allocations in hot path
function updatePhysics(dt) {
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    ball.vy += gravity * dt;  // Reuse existing objects
  }
}

// ❌ Bad: Allocations in hot path
function updatePhysics(dt) {
  balls.forEach(ball => {  // Creates closure each frame
    const force = { x: 0, y: gravity * dt };  // Allocates object
    ball.applyForce(force);
  });
}

// ✅ Good: Early returns, minimal nesting
function checkCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (dist >= a.r + b.r) return;  // Early exit
  
  // Handle collision...
}

// ❌ Bad: Deep nesting
function checkCollision(a, b) {
  if (a && b) {
    const dx = b.x - a.x;
    if (dx !== 0) {
      const dy = b.y - a.y;
      if (dy !== 0) {
        // Deep nesting...
      }
    }
  }
}
```

---

## 🚀 Common Tasks

### **Adding a New Physics Mode:**
```bash
# 1. Add to MODES enum in source/balls-source.html
# 2. Create initXXXScene() function
# 3. Add mode logic in setMode() function
# 4. Add UI controls in control panel HTML
# 5. Add keyboard shortcut (keys 1-9)
# 6. Update MODE_DEFAULTS configuration
# 7. Document in docs/MODES.md
# 8. Test all mode transitions
# 9. Build and verify production
```

### **Adjusting Physics Parameters:**
```bash
# 1. Open source/balls-source.html in browser
# 2. Press / to open control panel
# 3. Adjust sliders in real-time
# 4. Click "Save Config" when satisfied
# 5. Commit source/current-config.json
# 6. Build production: npm run build
```

### **Optimizing Performance:**
```javascript
// 1. Identify bottleneck (Chrome DevTools Profiler)
// 2. Common hot paths:
//    - updatePhysics() loop
//    - Collision detection (buildSpatialHash)
//    - Rendering (Ball.draw)
// 3. Apply optimizations:
//    - Reduce calculations per frame
//    - Cache expensive operations
//    - Use lookup tables for math
//    - Minimize object allocations
// 4. Measure impact (FPS counter)
// 5. Document in docs/PERFORMANCE.md
```

### **Changing Canvas Height:**
```css
/* In public/css/bouncy-balls.css */
#bravia-balls.mode-pit {
  height: 150vh;  /* Adjust multiplier */
}
```

```javascript
// In source/balls-source.html
const CONSTANTS = {
  CANVAS_HEIGHT_VH_PIT: 1.5,  // Match CSS
  CANVAS_HEIGHT_VH_DEFAULT: 1.0,
};
```

### **Updating Color Palettes:**
```javascript
// In source/balls-source.html, find COLOR_PALETTES
const COLOR_PALETTES = {
  custom_name: {
    name: 'Display Name',
    colors: ['#HEX1', '#HEX2', '#HEX3', '#HEX4', '#HEX5'],
    psychology: 'Mood description for documentation'
  }
};

// Document in docs/COLOR-PALETTES.md
```

---

## ⚠️ Critical Constraints

### **Never Violate These:**
1. **No localStorage for user text** - Privacy-first approach
2. **60 FPS minimum** - If change drops FPS, revert or optimize
3. **O(1) hot paths** - Physics/render loops must be constant time per entity
4. **Mobile support** - Test on device emulation (60% ball scaling)
5. **Zero npm dependencies** - Core simulation is vanilla JS
6. **Accessibility** - Respect `prefers-reduced-motion` media query
7. **Build pipeline** - Always edit source, never edit public directly

### **Performance Guardrails:**
```javascript
// Maximum balls per mode:
const MAX_BALLS = {
  PIT: 200,        // Collisions + gravity
  FLIES: 300,      // No collisions
  WEIGHTLESS: 150  // Collisions, no gravity
};

// Physics timestep (fixed):
const PHYSICS_DT = 1/120;  // Never change without testing

// Frame time cap:
const dt = Math.min((now - then) / 1000, 0.1);  // Prevents spiral of death
```

---

## 🔍 Debugging Tips

### **Common Issues:**

**Issue:** FPS drops below 60
```javascript
// Solutions:
// 1. Check ball count: console.log(balls.length)
// 2. Profile physics loop (Chrome DevTools)
// 3. Verify spatial hashing is active (Ball Pit/Zero-G only)
// 4. Check for accidental O(n²) loops
// 5. Disable collision detection temporarily to isolate issue
```

**Issue:** Balls escaping canvas
```javascript
// Debug:
// 1. Check canvas size: console.log(w, h)
// 2. Verify wall collision logic in Ball.walls()
// 3. Check for tunneling (dt too large)
// 4. Ensure PHYSICS_DT is 1/120
```

**Issue:** Configuration not saving
```javascript
// Debug:
// 1. Check localStorage availability: typeof localStorage
// 2. Verify autoSaveSettings() is called on changes
// 3. Check browser console for errors
// 4. Try saveSettings() manually in console
// 5. Inspect localStorage: localStorage.getItem('bouncyBallsSettings')
```

**Issue:** Build output is broken
```bash
# Debug:
# 1. Check source file syntax: open source/balls-source.html
# 2. Verify config is valid JSON: cat source/current-config.json | python -m json.tool
# 3. Run build with verbose output: node source/build.js
# 4. Compare file sizes: ls -lh public/js/bouncy-balls-embed.js
# 5. Test minified output: open public/index.html
```

### **Development Tools:**
```javascript
// Enable in source/balls-source.html:
let showFPS = true;           // FPS counter
let showDebugInfo = true;     // Ball count, mode
let showSpatialGrid = true;   // Visualize collision grid

// Console commands:
setMode('pit');               // Switch modes
balls.length = 0;             // Clear all balls
console.log(currentConfig);   // View settings
saveSettings();               // Force save
loadSettings();               // Force load
```

---

## 📝 Configuration System

### **Configuration Files:**
```
source/current-config.json  # Runtime settings (auto-saved from panel)
```

### **Config Schema:**
```json
{
  "ballSize": 0.7,              // Multiplier (0.5-1.5)
  "ballWeight": 8.0,            // Mass in kg
  "colorPalette": "industrial_teal",
  "currentMode": "pit",         // pit | flies | weightless
  "gravity": 1.1,               // Multiplier (0-2)
  "bounciness": 0.85,           // Restitution (0-1)
  "groundFriction": 0.008,      // Friction coefficient
  "ballSoftness": 0.3,          // Squash amount (0-1)
  "emitInterval": 0.033,        // Spawn rate (seconds)
  "fliesAttraction": 800,       // Attraction force
  "fliesOrbitRadius": 120,      // Orbit distance (pixels)
  "weightlessCount": 80,        // Initial ball count
  "weightlessSpeed": 200        // Launch velocity
}
```

### **Config Workflow:**
```bash
# 1. Tune in UI panel (/) 
# 2. Click "Save Config" button
# 3. Config written to source/current-config.json
# 4. Commit config: git add source/current-config.json
# 5. Build applies config: npm run build
```

**Note:** Config panel as source of truth, no localStorage for values (just UI state).

---

## 🎭 Mode-Specific Behaviors

### **Ball Pit Mode:**
```javascript
// Characteristics:
// - Gravity: Pulls balls down
// - Collisions: Full ball-to-ball + wall detection
// - Canvas: 150vh (extra spawning space)
// - Spawning: Continuous emission from top
// - Mouse: Repeller force (pushes balls away)
// - Performance: 200 balls @ 60 FPS

// Key parameters:
gravity: 1.1              // Multiplier on CONSTANTS.GRAVITY
bounciness: 0.85          // Wall restitution
groundFriction: 0.008     // Rolling friction on floor
emitInterval: 0.033       // 30 balls/sec
```

### **Flies Mode:**
```javascript
// Characteristics:
// - Gravity: None
// - Collisions: DISABLED (performance optimization)
// - Canvas: 100svh
// - Behavior: Swarm attraction to cursor
// - Mouse: Attractor + orbit behavior
// - Performance: 300 balls @ 60 FPS

// Key parameters:
fliesAttraction: 800      // Attraction force magnitude
fliesOrbitRadius: 120     // Comfortable orbit distance
emitInterval: 0.025       // 40 balls/sec
```

### **Zero-G Mode:**
```javascript
// Characteristics:
// - Gravity: None
// - Collisions: Full detection (elastic)
// - Canvas: 100svh
// - Initialization: Grid layout with random velocities
// - Mouse: Repeller force
// - Performance: 150 balls @ 60 FPS

// Key parameters:
weightlessCount: 80       // Initial ball count (no spawning)
weightlessSpeed: 200      // Initial velocity magnitude
bounciness: 0.98          // Near-perfect elastic (low energy loss)
```

---

## 🔗 Integration Points

### **Webflow Integration:**
```html
<!-- In Webflow page: -->
<div id="bravia-balls">
  <canvas id="c" aria-label="Bouncy balls interactive demo" role="img"></canvas>
</div>
<script src="js/bouncy-balls-embed.js"></script>

<!-- Simulation auto-initializes on load -->
<!-- Control panel toggles with / key -->
```

### **WebGL Acceleration (Optional):**
```javascript
// Integrated via PixiJS (CDN loaded)
// Toggle in control panel: "Use WebGL"
// Benefits: 2.5× performance, 500+ balls possible
// Tradeoff: Larger bundle if bundled (currently CDN)
```

### **Accessibility:**
```javascript
// prefers-reduced-motion support:
// - Disables motion blur
// - Reduces ball count by 50%
// - Slows animation speed by 50%
// - Shows notice to user

// Implementation in source/balls-source.html
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReducedMotion) {
  // Apply accessibility adaptations
}
```

---

## 🚢 Deployment

### **Build for Production:**
```bash
npm run build-production
```

### **Output:**
```
public/                    # Deploy this folder
├── index.html            # Webflow + simulation integrated
├── css/                  # All styles preserved
├── images/               # Assets preserved
├── js/
│   ├── bouncy-balls-embed.js  # 34.6 KB minified
│   └── webflow.js             # Webflow scripts
└── build-info.json       # Build metadata
```

### **Deployment Checklist:**
```
□ Run npm run build-production
□ Test public/index.html locally
□ Verify all 3 modes work
□ Check control panel toggles with /
□ Test on mobile (responsive)
□ Verify no console errors
□ Check accessibility (reduced motion)
□ Deploy public/ folder to host
```

### **Hosting Options:**
- GitHub Pages (push public/)
- Netlify (drag & drop public/)
- Vercel (deploy public/ directory)
- Custom hosting (upload public/ contents)

---

## 📚 Documentation Navigation

### **For Understanding Codebase:**
1. Read `docs/INDEX.md` (documentation hub)
2. Read `docs/ARCHITECTURE.md` (technical details)
3. Read `docs/MODES.md` (physics specifications)
4. Explore `source/balls-source.html` (main implementation)

### **For Making Changes:**
1. Read `docs/DEVELOPMENT.md` (workflow guide)
2. Check `docs/PERFORMANCE.md` (optimization strategies)
3. Review relevant mode in `docs/MODES.md`
4. Modify `source/balls-source.html`

### **For Integration:**
1. Read `docs/WEBFLOW-INTEGRATION.md` (embedding guide)
2. Read `docs/BUILD-SYSTEM.md` (build process)
3. Review `build-production.js` (build script)

### **For AI Assistants:**
1. Read this file first (AGENTS.md)
2. Read `docs/EXECUTIVE-SUMMARY.md` (project overview)
3. Use semantic search for specific concepts
4. Reference documentation liberally in responses

---

## 🧠 AI Agent Reasoning Guidelines

### **Before Making Changes:**
1. **Search First**: Use `codebase_search` to understand existing implementation
2. **Read Docs**: Check relevant docs/ files for context
3. **Verify Constraints**: Ensure change won't violate performance/accessibility rules
4. **Test Plan**: Define how to validate the change works

### **Evidence-Based Reasoning:**
```
CLAIM: "Balls are spawned at the top of the canvas in Ball Pit mode"

EVIDENCE: 
[File: source/balls-source.html, Line: ~850]
CODE: `const ball = new Ball(Math.random() * w, -50, ...)`

SOURCE: Direct code inspection
CONFIDENCE: 95%
```

### **Performance Impact Assessment:**
```
CHANGE: Adding particle trails

PERFORMANCE ANALYSIS:
- Adds O(n) drawing per frame (n = trail segments)
- Estimated: 10 segments × 200 balls = 2000 draw calls
- Current: 200 draw calls
- Impact: 10× rendering cost
- Mitigation: Limit trail length, use fade instead of segments
- Testing: Measure FPS before/after with 200 balls

DECISION: Implement with 3-segment limit, measure FPS
```

### **Mode-Specific Context:**
Always check which mode(s) a change affects:
```javascript
// Ball Pit only:
if (currentMode === MODES.PIT) {
  // Gravity logic
}

// Flies only:
if (currentMode === MODES.FLIES) {
  // Swarm logic
}

// Zero-G only:
if (currentMode === MODES.WEIGHTLESS) {
  // Elastic collision logic
}

// All modes:
// Physics integration, rendering, etc.
```

---

## ⚡ Quick Reference

### **File Locations:**
| Task | File |
|------|------|
| Edit simulation | `source/balls-source.html` |
| Edit build process | `source/build.js` or `build-production.js` |
| Edit configuration | `source/current-config.json` |
| View production output | `public/js/bouncy-balls-embed.js` |
| Test production | `public/index.html` |

### **Key Commands:**
| Task | Command |
|------|---------|
| Development | `open source/balls-source.html` |
| Build | `npm run build` |
| Serve | `npm start` |
| Watch & rebuild | `npm run watch` |
| Production build | `npm run build-production` |

### **Browser Shortcuts:**
| Key | Action |
|-----|--------|
| `1` | Ball Pit mode |
| `2` | Flies mode |
| `3` | Zero-G mode |
| `/` | Toggle control panel |
| `R` | Reset simulation |

### **Performance Targets:**
| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| FPS | 60 | 55 (warning) |
| Bundle size | 35 KB | 50 KB (warning) |
| Memory | Stable | Growing (leak) |
| Ball count (Pit) | 200 | 250 (max) |
| Ball count (Flies) | 300 | 350 (max) |
| Ball count (Zero-G) | 150 | 200 (max) |

---

## 🎓 Learning Resources

### **Physics Concepts:**
- Fixed timestep: <https://gafferongames.com/post/fix_your_timestep/>
- Spatial hashing: <https://www.gamedev.net/tutorials/programming/general-and-gameplay-programming/spatial-hashing-r2697/>
- Elastic collisions: <https://en.wikipedia.org/wiki/Elastic_collision>

### **Canvas API:**
- MDN Canvas Tutorial: <https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial>
- Performance tips: <https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas>

### **Project-Specific:**
- All docs in `docs/` folder
- Inline comments in `source/balls-source.html`
- Git history for evolution context

---

## 🔄 Version Control

### **Commit Message Format:**
```bash
# Feature:
git commit -m "feat: add vortex physics mode"

# Fix:
git commit -m "fix: prevent balls escaping at high velocities"

# Performance:
git commit -m "perf: optimize spatial hashing for 300+ balls"

# Documentation:
git commit -m "docs: update MODES.md with new vortex mode"

# Build:
git commit -m "build: update minification settings"
```

### **Branching:**
```bash
git checkout -b feature/your-feature  # New feature
git checkout -b fix/bug-description   # Bug fix
git checkout -b perf/optimization     # Performance improvement
```

---

## 📞 Contact & Support

**Project Author:** Alexander Beck  
**Email:** [alexander@beck.fyi](mailto:alexander@beck.fyi)

**For AI Agents:**
- Prioritize evidence-based reasoning (cite files/lines)
- Read documentation before making changes
- Verify performance impact of changes
- Test manually (no automated tests yet)
- Ask clarifying questions if constraints unclear

---

**Built with physics, performance, and attention to detail** ⚛️  
*Last updated: October 1, 2025*

