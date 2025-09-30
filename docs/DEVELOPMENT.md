# Development Guide

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Modern web browser

### Installation
```bash
git clone <repository>
cd alexander-beck-studio-website
npm install
```

### Development Workflow

#### 1. Start Development Server
```bash
npm start
# Opens http://localhost:8000
```

#### 2. Edit Source File
Main development file: `source/balls-source.html`
- Self-contained HTML with inline styles and scripts
- Control panel for real-time parameter tuning
- Three physics modes with keyboard shortcuts (1, 2, 3)

#### 3. Test Changes
- Refresh browser to see updates
- Use control panel to tune parameters
- Press '/' to toggle panel visibility
- Press 'R' to reset simulation

#### 4. Save Configuration
1. Tune parameters in control panel
2. Click "Save Config" button
3. Config saved to `source/current-config.json`

#### 5. Build for Production
```bash
npm run build
# Creates public/js/bouncy-balls-embed.js
```

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
- [ ] All three modes work correctly
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

**Low Frame Rate**
- Reduce MAX_BALLS
- Increase EMIT_INTERVAL  
- Disable trail effects
- Check for console errors

**Collision Jitter**
- Increase collision iterations
- Tune restitution coefficient
- Check for NaN values
- Verify timestep stability

**Mode Not Working**
- Check gravity settings
- Verify force calculations
- Inspect mode state variables
- Look for event handler conflicts

### Debug Helpers
```javascript
// Add to console for debugging
window.DEBUG = {
  balls: balls,
  currentMode: currentMode,
  fps: renderFPS,
  mousePos: { x: mouseX, y: mouseY }
};
```

## Deployment

### Build Process
1. Configuration is baked into minified output
2. UI controls are preserved (not stripped)
3. Terser minification with mangle
4. Self-executing bundle created

### Integration
```html
<!-- Minimal integration -->
<div id="bravia-balls">
  <canvas id="c"></canvas>
</div>
<script src="js/bouncy-balls-embed.js"></script>
```

### Performance Tips
- Serve with gzip compression
- Use CDN for global distribution
- Enable browser caching
- Consider lazy loading for below-fold usage
