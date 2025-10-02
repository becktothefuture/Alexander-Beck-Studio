# Development Guide

## Quick Start

### Prerequisites
- Node.js 16+
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Text editor

### Installation
```bash
git clone <repository>
cd alexander-beck-studio-website
npm install
```

---

## Development Workflow

### 1. Open Development Version
```bash
# Option A: Direct file access
open source/balls-source.html

# Option B: Local server
npm start  # Opens http://localhost:8000
```

### 2. Edit Source
**Primary file**: `source/balls-source.html`
- Self-contained HTML with inline CSS and JavaScript
- Full UI control panel with live parameter tuning
- Three physics modes with instant switching

**Structure**:
- Lines 1-435: CSS styles
- Lines 436-726: HTML markup
- Lines 727-2485: JavaScript logic

### 3. Test Changes
- **Refresh browser** to see updates (Cmd+R / Ctrl+R)
- **Hard refresh** for cache busting (Cmd+Shift+R / Ctrl+Shift+R)
- Use control panel to tune parameters live
- Press `/` to toggle panel visibility
- Press `R` to reset simulation

### 4. Test All Modes
- **Ball Pit** (`1` key): Gravity physics with collisions
- **Flies** (`2` key): Swarm attraction to cursor
- **Zero-G** (`3` key): Weightless bouncing

### 5. Save Configuration
1. Tune parameters to desired values
2. Click **"Save Config"** button in panel
3. Config written to `source/current-config.json`
4. Config is applied during next build

### 6. Build for Production
```bash
npm run build
```

**Output**: `public/js/bouncy-balls-embed.js` (34.6 KB minified)

**Process**:
1. Reads `source/balls-source.html`
2. Applies `source/current-config.json` settings
3. Minifies with Terser
4. Outputs to `public/js/`

---

## Code Organization

### File Structure
```
source/balls-source.html
├── Styles (lines 7-435)
│   ├── Base styles
│   ├── Canvas setup  
│   ├── Control panel UI
│   └── Mode-specific styles
│
├── HTML (lines 436-726)
│   ├── Canvas element
│   ├── Control panel structure
│   └── Mode controls
│
└── JavaScript (lines 727-2551)
    ├── Constants & config
    ├── Physics engine
    ├── Collision detection
    ├── Rendering loop
    ├── Mode system
    ├── Event handlers
    └── Initialization
```

### Key Functions

#### Physics Update
```javascript
function step(dt) {
  // Update position
  this.x += this.vx * dt;
  this.y += this.vy * dt;
  
  // Apply gravity
  this.vy += G * gravityScale * dt;
  
  // Apply damping
  this.vx *= dampingFactor;
  this.vy *= dampingFactor;
}
```

#### Collision Detection
```javascript
function handleCollisions(iterations = 6) {
  const pairs = findCollisionPairs();
  for (let iter = 0; iter < iterations; iter++) {
    for (const pair of pairs) {
      resolveCollision(pair);
    }
  }
}
```

#### Mode Switching
```javascript
function setMode(mode) {
  currentMode = mode;
  // Update physics parameters
  // Clear/setup mode-specific state
  // Update UI
}
```

## Testing

### Manual Testing Checklist
- [ ] All five modes work correctly (keys 1-5)
- [ ] Keyboard shortcuts respond
- [ ] Control panel updates live
- [ ] Performance stays above 50 FPS
- [ ] Mobile touch events work
- [ ] No memory leaks over time

### Browser Testing
Test on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Mobile Safari
- Chrome Android

### Performance Testing
1. Open DevTools Performance tab
2. Start recording
3. Run simulation for 60 seconds
4. Check for:
   - Consistent frame rate
   - No memory growth
   - Efficient paint regions

## Debugging

### Common Issues

#### Low Frame Rate
**Symptoms**: FPS below 50, stuttering
**Solutions**:
- Reduce ball count (check mode-specific controls)
- Disable motion blur (expensive)
- Check console for errors
- Profile with Chrome DevTools

#### Collision Jitter
**Symptoms**: Balls vibrating, overlapping
**Solutions**:
- Restitution too high (should be 0.7-0.95)
- Check for NaN velocities (`console.log`)
- Spatial hash may need tuning
- Verify fixed timestep is working

#### Mode Not Working
**Symptoms**: Mode switch does nothing
**Solutions**:
- Check `currentMode` variable
- Verify `setMode()` was called
- Inspect balls array (should clear on switch)
- Check canvas height class toggle

#### Top Wall Not Colliding (Zero-G)
**Symptoms**: Balls pass through top
**Solutions**:
- Verify `viewportTop = 0` for Zero-G
- Check canvas height is 100svh (not 150vh)
- Inspect `Ball.walls()` logic

### Debug Tools

#### Browser Console
```javascript
// Access internals
window.DEBUG = {
  balls: balls,
  mode: currentMode,
  fps: renderFPS,
  mouse: { x: mouseX, y: mouseY },
  canvas: { w: w, h: h }
};

// Inspect specific ball
console.log(balls[0]);

// Force mode
setMode('pit'); // or 'flies', 'weightless'

// Spawn single ball
balls.push(new Ball(w/2, h/3, 0, 0, 30, ballColors[0], 8));
```

#### Chrome DevTools Performance
1. Open **Performance** tab
2. Click **Record**
3. Run simulation for 10-20 seconds
4. Click **Stop**
5. Look for:
   - Long yellow bars (scripting)
   - Purple bars (rendering)
   - Drops below 60 FPS

---

## Deployment

### Build Process
```bash
npm run build
```

**What Happens**:
1. `build.js` reads `source/balls-source.html`
2. Applies configuration from `source/current-config.json`
3. Minifies JavaScript with Terser (mangle names, compress)
4. Outputs to `public/js/bouncy-balls-embed.js`

**Result**: 34.6 KB (minified), ~12 KB (gzipped)

### Production Integration
```html
<!-- Minimal HTML structure -->
<div id="bravia-balls">
  <canvas id="c" aria-label="Bouncy balls" role="img" draggable="false"></canvas>
</div>

<!-- Include script -->
<script src="js/bouncy-balls-embed.js"></script>
```

**See `WEBFLOW-INTEGRATION.md` for detailed embedding guide.**

### Performance Tips

#### Server Configuration
- **Gzip/Brotli**: Enable compression (12 KB gzipped)
- **Caching**: Set long cache headers (1 year)
- **CDN**: Use for global distribution
- **HTTP/2**: Serve over HTTP/2 for multiplexing

#### Lazy Loading
```html
<!-- Load only when visible -->
<script>
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      const script = document.createElement('script');
      script.src = 'js/bouncy-balls-embed.js';
      document.body.appendChild(script);
      observer.disconnect();
    }
  });
  observer.observe(document.getElementById('bravia-balls'));
</script>
```

#### Mobile Optimization
- Default ball counts are mobile-friendly
- Touch events supported automatically
- `svh` units respect mobile UI
- Consider reducing balls on slow devices

---

## Advanced Development

### Adding a New Mode

1. **Define Mode**
```javascript
const MODES = {
  PIT: 'pit',
  FLIES: 'flies',
  WEIGHTLESS: 'weightless',
  YOUR_MODE: 'yourmode', // Add here
};
```

2. **Add UI Controls**
```html
<div class="mode-controls" id="yourmode-controls">
  <label>Your Parameter: <input type="range" id="yourParam"></label>
</div>
```

3. **Add Mode Logic**
```javascript
function setMode(mode) {
  // ... existing code
  if (mode === MODES.YOUR_MODE) {
    // Your initialization
  }
}
```

4. **Add Keyboard Shortcut**
```javascript
if (e.key === '4') setMode(MODES.YOUR_MODE);
```

5. **Document in `MODES.md`**

### Custom Forces
```javascript
// In updatePhysics() loop
for (let ball of balls) {
  // Example: Wind
  ball.vx += windStrength * dt;
  
  // Example: Vortex
  const dx = vortexX - ball.x;
  const dy = vortexY - ball.y;
  const angle = Math.atan2(dy, dx) + Math.PI/2;
  ball.vx += Math.cos(angle) * vortexPower * dt;
  ball.vy += Math.sin(angle) * vortexPower * dt;
}
```

### Custom Rendering
```javascript
// In Ball.prototype.draw()
ctx.save();

// Your custom drawing
if (customEffect) {
  ctx.shadowBlur = 10;
  ctx.shadowColor = this.color;
}

ctx.beginPath();
ctx.arc(0, 0, this.r, 0, Math.PI * 2);
ctx.fill();

ctx.restore();
```

---

## Documentation Standards

### When to Update Docs

**Always update** when:
- Adding/removing modes
- Changing keyboard shortcuts
- Modifying build process
- Changing file structure
- Adding configuration options

**Update these files**:
- `OVERVIEW.md` - High-level changes
- `MODES.md` - Mode-specific details
- `ARCHITECTURE.md` - Technical changes
- `DEVELOPMENT.md` - Workflow changes

### Doc Format
- Use clear headers (`##`, `###`)
- Include code examples
- Provide screenshots for UI (if needed)
- Keep language concise and factual
- Use emoji sparingly for visual structure

---

## Contributing

### Code Style
- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Required
- **Names**: camelCase for variables, PascalCase for classes
- **Comments**: Explain "why", not "what"

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes
# ... edit files ...

# Test thoroughly
open source/balls-source.html

# Commit
git add .
git commit -m "feat: your feature description"

# Build and test production
npm run build
# Test public/index.html

# Push
git push origin feature/your-feature
```

### Commit Messages
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `perf:` Performance improvement
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Build/config changes

---

## Resources

### Documentation
- `OVERVIEW.md` - System overview
- `MODES.md` - Mode specifications
- `ARCHITECTURE.md` - Technical architecture
- `PERFORMANCE.md` - Benchmarks & optimization
- `CANVAS-HEIGHT.md` - Dynamic canvas system
- `WEBFLOW-INTEGRATION.md` - Embedding guide

### External Resources
- [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Game Loop Patterns](https://gameprogrammingpatterns.com/game-loop.html)
- [Physics Engine Design](https://www.toptal.com/game/video-game-physics-part-i-an-introduction-to-rigid-body-dynamics)

---

**Ready to build? Run `npm run build` and ship it!** 🚀
