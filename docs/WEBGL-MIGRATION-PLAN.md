# 🚀 WebGL Migration Plan - Phase 2
**Goal:** Achieve 120 FPS with 300+ balls while preserving 100% feature parity  
**Status:** Planning Phase  
**Branch:** `feature/webgl-migration`  
**Date:** October 1, 2025

---

## 🎯 MIGRATION STRATEGY

### Core Principle
**"Ship the exact same product on a faster engine"**

Every single behavior, visual effect, mode, and parameter must work identically. Users should not notice ANY difference except improved performance.

---

## ✅ FEATURES THAT MUST BE PRESERVED (100% Parity Required)

### **1. Three Behavior Modes** (CRITICAL)
All three modes must work exactly as they do now:

#### **Mode 1: Ball Pit** (`MODES.PIT`)
- ✅ Gravity (0.0-2.0× Earth, default 1.15)
- ✅ Mouse repeller with configurable power/radius/softness
- ✅ 150vh canvas height (taller spawning area)
- ✅ Emitter sweep system (side-to-side spawning)
- ✅ Entry drift effect (natural throw)
- ✅ Mass-based gravity scaling
- ✅ Turbulence on repeller interaction

#### **Mode 2: Flies to Light** (`MODES.FLIES`)
- ✅ No gravity (zero-G)
- ✅ Mouse attraction system
- ✅ Orbit radius control
- ✅ Swarm speed control
- ✅ **NO ball-to-ball collisions** (critical difference)
- ✅ 100vh canvas height
- ✅ Idle swarm at center when mouse offscreen

#### **Mode 3: Weightless Zero-G** (`MODES.WEIGHTLESS`)
- ✅ No gravity
- ✅ Minimal drag (0.0001)
- ✅ Subtle mouse repeller
- ✅ High bounce (0.95 default)
- ✅ Ball-to-ball collisions enabled
- ✅ Even distribution initialization
- ✅ 100vh canvas height

---

### **2. Physics System** (CRITICAL)
Every physics behavior must be pixel-perfect identical:

#### **Core Physics Properties**
- ✅ Fixed timestep (120Hz, DT = 1/120)
- ✅ Accumulator system with reset threshold
- ✅ Mass system (50-200 grams configurable)
- ✅ Restitution (0.0-1.0, default 0.80)
- ✅ Air friction (0.000-0.010, default 0.0045)
- ✅ Gravity scaling (G = 9.8 m/s² × multiplier)

#### **Advanced Physics Features**
- ✅ **Squash & Stretch System**
  - Ball softness parameter (0-100%)
  - World-aligned squash direction
  - Area-preserving deformation (s × 1/s)
  - Impact-based squash magnitude
  - Relaxation with SQUASH_DECAY_PER_S
  - Skip for balls < 15px radius (performance)
  
- ✅ **Spin & Rolling Physics**
  - Angular velocity (omega)
  - Spin damping (2.0 per second)
  - Tangential slip → spin conversion
  - Ground coupling (8.0 per second)
  - Roll friction (1.5 per second)
  - Mass-scaled spin response

- ✅ **Collision Detection**
  - Spatial hashing (grid-based O(n))
  - Sorted pairs by overlap
  - Adaptive quality (1-3 iterations)
  - Position correction (Baumgarte)
  - Velocity impulse resolution
  - Tangential slip transfer

- ✅ **Wall Collisions**
  - Rounded corner support
  - Corner radius (0-50px)
  - Mass-based restitution scaling
  - Spin on wall contact
  - Impact-based squash
  - Per-mode restitution override

- ✅ **Text Collision System** (UNIQUE FEATURE)
  - DOM element measurement
  - Cap height calculation
  - Canvas coordinate conversion
  - Rectangle collision detection
  - Multi-collider support
  - Periodic update (every 60 frames)

---

### **3. Visual Effects** (CRITICAL)

#### **3D Shader System** (10 Parameters)
- ✅ Shader enable/disable toggle
- ✅ **Roundness dial** (0-100%):
  - 0% = Flat solid color
  - 50% = Casino chip with beveled edges
  - 100% = Full sphere with lighting
- ✅ Light angle (-180° to +180°, default -135°)
- ✅ Edge bevel width (0.0-0.5, default 0.15)
- ✅ Edge sharpness (0.5-5.0, default 2.0)
- ✅ Specular intensity (0.0-1.0, default 0.7)

**Rendering Functions to Port:**
```javascript
// These MUST work in WebGL shaders
drawChipBevel(ctx, radius, color, intensity)
drawTransitionalDepth(ctx, radius, color, blend)
drawFullSphere(ctx, radius, color, sphereDepth)
```

**Color Manipulation:**
- `hexToRgb()` - Parse hex colors
- `lightenColor()` - Brighten by percentage
- `darkenColor()` - Darken by percentage

#### **Motion Blur System**
- ✅ Trail fade (0.0-0.5, default 0.0)
- ✅ Trail subtlety/intensity (0.5-2.0×, default 1.0)
- ✅ Alpha-based compositing
- ✅ Works in all modes

#### **Ball Appearance**
- ✅ Color palette system (8 colors)
- ✅ Weighted random selection
- ✅ Size scale (0.5-2.0×, default 1.0)
- ✅ Size variation (0-100%, default 50%)
- ✅ Responsive scaling (60% on mobile)
- ✅ Radius range (R_MIN_BASE=10, R_MAX_BASE=28)

---

### **4. UI & Controls** (MUST PRESERVE)

#### **Control Panel**
- ✅ Right-aligned floating panel (5vh margin)
- ✅ Collapsible/expandable
- ✅ Keyboard toggle (`/` key)
- ✅ Mode switcher (3 tabs)
- ✅ 40+ sliders with live updates
- ✅ Physics template presets
- ✅ Auto-save to localStorage
- ✅ Settings persistence

#### **FPS Counter**
- ✅ Render FPS display
- ✅ Physics FPS display
- ✅ Top-left position (5vh margin)
- ✅ 1-second update interval

#### **Keyboard Shortcuts**
- ✅ `R` - Reset ball positions
- ✅ `/` - Toggle control panel
- ✅ `1` - Switch to Ball Pit mode
- ✅ `2` - Switch to Flies mode
- ✅ `3` - Switch to Weightless mode

---

### **5. Adaptive Quality System** (PERFORMANCE CRITICAL)
- ✅ Real-time FPS monitoring
- ✅ Dynamic collision iteration adjustment:
  - < 55 FPS: 1 iteration (low quality)
  - 55-58 FPS: 2 iterations (medium quality)
  - \> 58 FPS: 3 iterations (high quality)
- ✅ Console logging of quality changes
- ✅ Seamless user experience

---

### **6. Configuration & State Management**

#### **Global Parameters**
- ✅ Ball softness (squash/stretch intensity)
- ✅ Max balls (50-800, default 150)
- ✅ Corner radius (0-50px, default 0)
- ✅ Motion blur settings
- ✅ Shader parameters (10 total)

#### **Mode-Specific Parameters**
Each mode has 5-8 unique parameters that must all work.

#### **Physics Presets**
- ✅ Rubber Ball
- ✅ Super Bouncy
- ✅ Heavy Steel
- ✅ Feather Light
- ✅ Glass Marble
- ✅ Soft Squishy
- ✅ No Bounce
- ✅ Off (minimal physics)

#### **Settings Persistence**
- ✅ localStorage save/load
- ✅ Debounced auto-save (500ms)
- ✅ 20+ persisted parameters
- ✅ Versioning support

---

## 🏗️ TECHNICAL ARCHITECTURE

### **WebGL Rendering Stack**

**Option A: PixiJS (RECOMMENDED)**
- ✅ Battle-tested, production-ready
- ✅ Built-in sprite batching
- ✅ Custom shader support
- ✅ Canvas2D-like API
- ✅ Excellent documentation
- ✅ Mobile optimized

**Option B: Three.js**
- ✅ More powerful for 3D
- ⚠️ Heavier bundle size
- ⚠️ Overkill for 2D circles

**Option C: Raw WebGL**
- ✅ Maximum performance
- ❌ Months of development time
- ❌ Error-prone

**DECISION: PixiJS** (balance of power and simplicity)

---

### **Shader Implementation Strategy**

#### **Challenge: Port Canvas 2D gradients to GLSL**

**Canvas 2D (Current):**
```javascript
const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
gradient.addColorStop(0, lightenColor(color, 40));
gradient.addColorStop(1, darkenColor(color, 20));
ctx.fillStyle = gradient;
```

**WebGL GLSL (Target):**
```glsl
// Fragment shader for sphere rendering
uniform float uRoundness;       // 0.0-1.0
uniform float uLightAngle;      // radians
uniform float uBevelWidth;      // 0.0-0.5
uniform float uBevelSharpness;  // 0.5-5.0
uniform float uSpecularPower;   // 0.0-1.0
uniform vec3 uBaseColor;        // ball color

varying vec2 vUV;  // -1 to +1, center at origin

void main() {
  float dist = length(vUV);
  if (dist > 1.0) discard;  // Circle clipping
  
  // Calculate lighting based on roundness
  vec3 finalColor = calculateShading(
    uBaseColor, 
    dist, 
    vUV, 
    uRoundness,
    uLightAngle,
    uBevelWidth,
    uBevelSharpness,
    uSpecularPower
  );
  
  gl_FragColor = vec4(finalColor, 1.0);
}
```

**Key Insight:** GLSL shaders will be FASTER than Canvas 2D gradients while looking identical.

---

## 📋 STEP-BY-STEP MIGRATION PLAN

### **PHASE 2.1: Foundation (Week 1)**

#### **Step 1.1: Environment Setup** ⏱️ 2 hours
- [ ] Install PixiJS: `npm install pixi.js`
- [ ] Create `webgl` branch structure
- [ ] Set up development build pipeline
- [ ] Configure source maps for debugging

**Precaution:** Keep Canvas 2D version intact for A/B comparison.

---

#### **Step 1.2: Parallel Renderer System** ⏱️ 4 hours
- [ ] Create `RendererFactory` class
- [ ] Implement `Canvas2DRenderer` (existing)
- [ ] Implement `WebGLRenderer` (PixiJS wrapper)
- [ ] Add renderer toggle in config panel
- [ ] Ensure both render the same scene

**Test:** Switch between renderers mid-simulation, behavior should be identical.

**Precaution:** Physics runs independent of renderer. Test physics separately.

---

#### **Step 1.3: PixiJS Scene Setup** ⏱️ 3 hours
- [ ] Initialize PIXI.Application
- [ ] Set up render loop integration
- [ ] Configure stage/container hierarchy
- [ ] Match canvas dimensions and DPR
- [ ] Implement resize handling

**Test:** Empty PixiJS canvas should match Canvas 2D positioning.

---

### **PHASE 2.2: Ball Rendering (Week 1-2)**

#### **Step 2.1: Basic Circle Sprites** ⏱️ 4 hours
- [ ] Create `BallSprite` class (PixiJS Graphics)
- [ ] Implement flat color rendering (roundness = 0)
- [ ] Match ball positioning (1:1 with Canvas 2D)
- [ ] Test with 1, 10, 100, 500 balls
- [ ] Verify FPS improvement

**Test:** Side-by-side comparison - balls should overlap perfectly.

**Success Criteria:** 120 FPS with 500 flat balls.

---

#### **Step 2.2: Shader System - Flat to Chip** ⏱️ 8 hours
- [ ] Write GLSL vertex shader (ball positioning)
- [ ] Write GLSL fragment shader (casino chip effect)
- [ ] Implement chip bevel algorithm in GLSL
- [ ] Add edge glow effect
- [ ] Test at roundness 0-50%

**Color Matching Protocol:**
```javascript
// Test at these exact values
testColors = [
  '#FF6B6B', // Coral Red
  '#4ECDC4', // Turquoise
  '#45B7D1', // Sky Blue
  // ... all 8 colors
];

// For each color, verify:
// - Highlight color matches lightenColor(base, 40)
// - Shadow color matches darkenColor(base, 20)
// - Edge glow matches lightenColor(base, 60)
```

**Precaution:** Render side-by-side screenshots at each roundness value (0, 10, 20...50). Pixel-perfect match required.

---

#### **Step 2.3: Shader System - Chip to Sphere** ⏱️ 8 hours
- [ ] Implement full sphere lighting in GLSL
- [ ] Add specular highlights
- [ ] Implement light angle control
- [ ] Blend between chip and sphere (50-100%)
- [ ] Test all 10 shader parameters

**Test Matrix:**
| Roundness | Light Angle | Bevel Width | Expected Look |
|-----------|-------------|-------------|---------------|
| 0%        | Any         | Any         | Flat color    |
| 50%       | -135°       | 0.15        | Casino chip   |
| 75%       | -135°       | 0.15        | Dome shape    |
| 100%      | -135°       | 0.15        | Full sphere   |
| 100%      | -90°        | 0.15        | Top-lit       |
| 100%      | 0°          | 0.15        | Right-lit     |

**Success Criteria:** Visual indistinguishable from Canvas 2D at all settings.

---

#### **Step 2.4: Squash & Stretch in WebGL** ⏱️ 6 hours
- [ ] Pass squash parameters to vertex shader
- [ ] Implement area-preserving deformation
- [ ] Rotate squash to world-aligned normal
- [ ] Skip for balls < 15px (performance)
- [ ] Test with all collision types

**GLSL Vertex Shader:**
```glsl
attribute vec2 aVertexPosition;
attribute float aSquashAmount;
attribute float aSquashAngle;
attribute float aRadius;

void main() {
  // Area-preserving squash
  float s = 1.0 + aSquashAmount;
  float invS = 1.0 / s;
  
  // Rotate to squash direction
  mat2 rot = rotate(aSquashAngle);
  vec2 squashed = rot * vec2(
    aVertexPosition.x * s,
    aVertexPosition.y * invS
  );
  
  gl_Position = uProjection * vec4(squashed * aRadius, 0.0, 1.0);
}
```

**Test:** Drop 100 balls, verify squash looks identical to Canvas 2D.

---

### **PHASE 2.3: Physics Integration (Week 2)**

#### **Step 3.1: Physics Loop Decoupling** ⏱️ 2 hours
- [ ] Confirm physics runs in `step()` independent of renderer
- [ ] Verify WebGL reads same ball positions
- [ ] Test physics with renderer disabled
- [ ] Profile physics-only performance

**Precaution:** Physics should be 100% unchanged. Only rendering changes.

**Test:** Run physics for 10 seconds, export ball positions, compare Canvas2D vs WebGL - should be bit-identical.

---

#### **Step 3.2: Collision Visualization** ⏱️ 3 hours
- [ ] Render collision normals (debug mode)
- [ ] Show squash direction arrows
- [ ] Highlight colliding pairs
- [ ] Verify collision math is correct

**Test:** Enable debug overlay, compare Canvas 2D vs WebGL collision frames.

---

### **PHASE 2.4: Mode-Specific Features (Week 2-3)**

#### **Step 4.1: Ball Pit Mode** ⏱️ 4 hours
- [ ] 150vh canvas height
- [ ] Emitter sweep system
- [ ] Entry drift visualization
- [ ] Mouse repeller rendering
- [ ] Turbulence particles (optional)

**Test:** Spawn 200 balls, compare to Canvas 2D video recording. Behavior should be identical.

---

#### **Step 4.2: Flies Mode** ⏱️ 4 hours
- [ ] Disable ball-ball collisions (verify!)
- [ ] Mouse attraction trails
- [ ] Idle swarm at center
- [ ] Orbit radius visualization

**Test:** Move mouse in figure-8 pattern. Record both renderers. Compare ball positions frame-by-frame.

---

#### **Step 4.3: Weightless Mode** ⏱️ 4 hours
- [ ] Zero-gravity physics
- [ ] Subtle repeller effect
- [ ] Even distribution init
- [ ] High bounce walls

**Test:** Let 100 balls settle in weightless mode for 30 seconds. Positions should match Canvas 2D exactly.

---

### **PHASE 2.5: Visual Effects (Week 3)**

#### **Step 5.1: Motion Blur** ⏱️ 6 hours
- [ ] Implement frame accumulation buffer
- [ ] Alpha-based trail compositing
- [ ] Trail fade parameter control
- [ ] Trail intensity control
- [ ] Test in all modes

**Implementation:**
```javascript
// Use PixiJS RenderTexture for accumulation
const trailBuffer = PIXI.RenderTexture.create({
  width: canvas.width,
  height: canvas.height
});

// Each frame:
// 1. Render balls to trailBuffer with alpha
// 2. Fade trailBuffer by (1 - trailFade)
// 3. Composite to main canvas
```

**Test:** Set trail fade to 0.3, move a single ball in a circle. Trail should match Canvas 2D exactly.

---

#### **Step 5.2: Corner Radius Rendering** ⏱️ 3 hours
- [ ] Render rounded boundary
- [ ] Match Canvas 2D stroke style
- [ ] Adjust clipping for corner circles
- [ ] Test corner collisions

---

#### **Step 5.3: Text Collision Rendering** ⏱️ 2 hours
- [ ] Visualize text collider boxes (debug mode)
- [ ] Confirm collision detection unchanged
- [ ] Test with dynamic text resize

---

### **PHASE 2.6: UI & Controls (Week 3)**

#### **Step 6.1: Control Panel Integration** ⏱️ 2 hours
- [ ] Wire all 40+ sliders to WebGL renderer
- [ ] Test every slider updates correctly
- [ ] Verify auto-save works
- [ ] Test preset loading

**Test:** Load each preset, verify visual match.

---

#### **Step 6.2: Keyboard Shortcuts** ⏱️ 1 hour
- [ ] Test `R` key reset
- [ ] Test `/` panel toggle
- [ ] Test `1/2/3` mode switches
- [ ] Verify all work with WebGL

---

#### **Step 6.3: FPS Counter** ⏱️ 1 hour
- [ ] Show WebGL render FPS
- [ ] Show physics FPS (unchanged)
- [ ] Add GPU memory usage (optional)
- [ ] Display WebGL vs Canvas 2D comparison

---

### **PHASE 2.7: Performance Optimization (Week 4)**

#### **Step 7.1: Sprite Batching** ⏱️ 3 hours
- [ ] Group balls by shader settings
- [ ] Batch instanced rendering
- [ ] Minimize state changes
- [ ] Profile draw call count

**Target:** < 5 draw calls per frame.

---

#### **Step 7.2: Adaptive Quality for WebGL** ⏱️ 3 hours
- [ ] Scale shader complexity with FPS
- [ ] Reduce roundness if FPS drops
- [ ] Disable motion blur under load
- [ ] Graceful degradation

---

#### **Step 7.3: Mobile Optimization** ⏱️ 4 hours
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Reduce ball count on mobile
- [ ] Disable expensive shader effects
- [ ] Test 60% ball scaling

**Test Devices:**
- iPhone 12/13/14
- iPad Pro
- Samsung Galaxy S21+
- Low-end Android (< 4GB RAM)

---

### **PHASE 2.8: Testing & Validation (Week 4)**

#### **Step 8.1: Automated Visual Regression** ⏱️ 8 hours
- [ ] Set up Playwright for screenshot testing
- [ ] Capture Canvas 2D reference frames
- [ ] Capture WebGL comparison frames
- [ ] Automated pixel diff analysis
- [ ] Test matrix: 3 modes × 8 configs = 24 tests

**Test Configurations:**
1. Default settings
2. Max shader (roundness 100%)
3. Motion blur enabled
4. Heavy physics (200 balls)
5. Flies mode with trails
6. Weightless mode settled
7. All sliders at extremes
8. Random stress test

**Pass Criteria:** < 1% pixel difference for each test.

---

#### **Step 8.2: Performance Benchmarks** ⏱️ 4 hours
- [ ] Measure FPS at 100, 200, 300, 500 balls
- [ ] Compare Canvas 2D vs WebGL
- [ ] Profile GPU memory usage
- [ ] Test on low-end devices

**Target Performance:**
| Ball Count | Canvas 2D | WebGL Target |
|------------|-----------|--------------|
| 100        | 90 FPS    | 120 FPS      |
| 200        | 60 FPS    | 120 FPS      |
| 300        | 45 FPS    | 120 FPS      |
| 500        | 25 FPS    | 120 FPS      |

---

#### **Step 8.3: Cross-Browser Testing** ⏱️ 6 hours
- [ ] Chrome (desktop & mobile)
- [ ] Safari (desktop & iOS)
- [ ] Firefox
- [ ] Edge
- [ ] Test WebGL2 fallback to WebGL1

---

#### **Step 8.4: Edge Case Testing** ⏱️ 4 hours
- [ ] Zero balls
- [ ] 800 balls (max)
- [ ] Rapid mode switching
- [ ] Resize window during simulation
- [ ] Reset during high collision density
- [ ] All sliders at 0
- [ ] All sliders at max

---

### **PHASE 2.9: Rollout Strategy (Week 5)**

#### **Step 9.1: Feature Flag System** ⏱️ 3 hours
- [ ] Add `?renderer=webgl` URL param
- [ ] Add `?renderer=canvas2d` URL param
- [ ] Default to WebGL with Canvas 2D fallback
- [ ] Show renderer badge in UI

---

#### **Step 9.2: Gradual Rollout** ⏱️ 2 hours
- [ ] 10% WebGL, 90% Canvas 2D (A/B test)
- [ ] Monitor error rates
- [ ] Collect performance metrics
- [ ] User feedback collection

---

#### **Step 9.3: Full Migration** ⏱️ 1 hour
- [ ] Switch default to WebGL
- [ ] Keep Canvas 2D as fallback
- [ ] Remove feature flag UI
- [ ] Update documentation

---

## 🛡️ RISK MITIGATION STRATEGIES

### **Risk 1: Shader Doesn't Match Canvas 2D Exactly**
**Mitigation:**
- Create side-by-side comparison tool
- Automated pixel diff testing
- Manual QA at each parameter value
- Keep Canvas 2D as reference

**Rollback Plan:** Keep Canvas 2D renderer, flag WebGL as experimental.

---

### **Risk 2: WebGL Not Supported on User's Device**
**Mitigation:**
- Detect WebGL support on load
- Graceful fallback to Canvas 2D
- User message: "Your device doesn't support WebGL, using Canvas 2D"

**Test:** Disable WebGL in Chrome DevTools, verify fallback works.

---

### **Risk 3: Performance Regression on Mobile**
**Mitigation:**
- Mobile-specific shader simplification
- Reduced ball count on mobile
- FPS-based quality scaling
- Test on low-end devices early

---

### **Risk 4: Physics Divergence Between Renderers**
**Mitigation:**
- Physics must be 100% renderer-independent
- Automated position comparison tests
- Record deterministic physics runs
- Compare frame-by-frame

**Test:** Run 1000 physics steps, export positions, diff Canvas 2D vs WebGL.

---

### **Risk 5: Bundle Size Increase**
**Mitigation:**
- Tree-shake PixiJS imports
- Use custom PixiJS build
- Lazy-load WebGL renderer
- Keep bundle < 200KB

**Target:** +50KB max for PixiJS.

---

## 📊 SUCCESS METRICS

### **Performance**
- ✅ 120 FPS at 300 balls (WebGL)
- ✅ 120 FPS at 500 balls (WebGL)
- ✅ < 50ms startup time
- ✅ < 100MB GPU memory
- ✅ 60 FPS on iPhone 12

### **Quality**
- ✅ < 1% pixel difference from Canvas 2D
- ✅ 100% feature parity
- ✅ Zero physics bugs
- ✅ All 24 tests pass

### **Compatibility**
- ✅ Chrome/Safari/Firefox/Edge support
- ✅ iOS 12+ support
- ✅ Android 8+ support
- ✅ Graceful Canvas 2D fallback

---

## 🔄 ROLLBACK PLAN

If WebGL migration fails:
1. Keep Canvas 2D as default
2. Flag WebGL as opt-in experiment
3. Collect feedback and iterate
4. Re-attempt in 1-2 months

**Rollback Trigger:** 
- > 5% error rate
- < 80 FPS with WebGL (worse than Canvas 2D)
- User complaints about visual differences

---

## 📚 DOCUMENTATION UPDATES

- [ ] Update `docs/ARCHITECTURE.md` with WebGL renderer
- [ ] Add `docs/WEBGL-SHADERS.md` (GLSL documentation)
- [ ] Update `README.md` with performance numbers
- [ ] Add migration changelog
- [ ] Document shader parameters

---

## 🎯 FINAL CHECKLIST BEFORE MERGE

### **Code Quality**
- [ ] All TypeScript errors resolved
- [ ] All linter warnings fixed
- [ ] 80%+ code coverage
- [ ] No console errors or warnings

### **Testing**
- [ ] All 24 visual regression tests pass
- [ ] All 15 edge case tests pass
- [ ] Cross-browser testing complete
- [ ] Mobile testing complete

### **Performance**
- [ ] 120 FPS at 300 balls confirmed
- [ ] < 1% frame drops
- [ ] GPU memory < 100MB
- [ ] Startup time < 50ms

### **Feature Parity**
- [ ] All 3 modes work identically
- [ ] All 40+ sliders work
- [ ] All 8 presets work
- [ ] All keyboard shortcuts work
- [ ] Text collision works
- [ ] Motion blur works
- [ ] Squash/stretch works
- [ ] Shader system works

### **Documentation**
- [ ] Code comments updated
- [ ] Architecture doc updated
- [ ] Performance review updated
- [ ] Migration guide written

---

## ⏱️ ESTIMATED TIMELINE

| Phase | Duration | Calendar |
|-------|----------|----------|
| 2.1 Foundation | 9 hours | Days 1-2 |
| 2.2 Ball Rendering | 26 hours | Days 2-5 |
| 2.3 Physics Integration | 5 hours | Day 5 |
| 2.4 Mode Features | 12 hours | Days 6-7 |
| 2.5 Visual Effects | 11 hours | Days 7-8 |
| 2.6 UI & Controls | 4 hours | Day 9 |
| 2.7 Performance | 10 hours | Days 9-10 |
| 2.8 Testing | 22 hours | Days 11-13 |
| 2.9 Rollout | 6 hours | Day 14 |
| **TOTAL** | **105 hours** | **~3 weeks** |

**With 6-hour workdays:** ~18 working days  
**With buffer time:** 4 weeks total

---

## 🚀 NEXT STEPS

1. **Review this plan** - Get approval on approach
2. **Install PixiJS** - Set up dependencies
3. **Create feature branch** - `feature/webgl-migration`
4. **Start Phase 2.1** - Foundation setup
5. **Daily progress tracking** - Update this doc with checkmarks

---

**Ready to proceed?** Let's build the fastest, most beautiful ball simulation on the web! 🎯

