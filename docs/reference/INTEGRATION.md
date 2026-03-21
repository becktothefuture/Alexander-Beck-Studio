# Integration Guide

**Embedding the simulation in your website**

## Quick Integration

### Minimal Setup

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="css/styles.css">
  <link rel="modulepreload" href="js/shared.js">
</head>
<body>
  <div id="simulations">
    <canvas id="c" aria-label="Bouncy balls simulation" role="img"></canvas>
  </div>
  
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

**That's it!** The simulation auto-initializes.

## Embedding Integration

### Step 1: Prepare Files

Upload to your host/CMS:
- `app.js` + `shared.js` → Assets
- `styles.css` → Custom Code or Assets

### Step 2: Add HTML Structure

In your host/CMS, add an embed/HTML block:

```html
<div id="simulations" class="w-100">
  <canvas id="c" aria-label="Interactive bouncy balls" role="img"></canvas>
</div>
```

### Step 3: Link CSS

In Page Settings → Custom Code → Head:

```html
<link rel="stylesheet" href="https://your-cdn.com/styles.css">
<link rel="modulepreload" href="https://your-cdn.com/shared.js">
```

### Step 4: Link JavaScript

In Page Settings → Custom Code → Before </body>:

```html
<script type="module" src="https://your-cdn.com/app.js"></script>
```

### Step 5: Add Required CSS

The simulation needs this CSS for dynamic height:

```css
#simulations {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100svh; /* Default */
  z-index: 0;
}

#simulations.mode-pit {
  height: 150vh; /* Ball Pit override */
}

#simulations canvas {
  width: 100%;
  height: 100%;
  display: block;
}
```

## Configuration Options

### Default Settings

The simulation loads with sensible defaults:
- Mode: Ball Pit
- Color Palette: London weather chapter system (privacy-first London weather assessment, nearest chapter fallback)
- Ball Size: 0.7 (70% of base)
- Gravity: 1.1× Earth
- 60 FPS target

### Runtime Configuration

Settings load from `js/config.json` (copied from `source/config/default-config.json`).
localStorage persistence is disabled by default.

### Programmatic Control

Access global interface:

```javascript
// Check if loaded
if (window.SIMULATIONS) {
  // Change mode
  window.SIMULATIONS.setMode('flies'); // 'pit', 'flies', 'weightless'
  
  // Clear balls
  window.SIMULATIONS.reset();
  
  // Get current state
  console.log(window.SIMULATIONS.getCurrentMode());
  console.log(window.SIMULATIONS.getBallCount());
}
```

## Control Panel

### Toggle Panel

- **Keyboard:** Press `/` to show/hide
- **Default:** Hidden on page load
- **Persistent:** User preference saved

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Switch to Ball Pit mode |
| `2` | Switch to Flies mode |
| `3` | Switch to Zero-G mode |
| `R` | Reset simulation |
| `/` | Toggle control panel |

### Disable Panel (Optional)

Hide panel completely:

```css
#simulations .panel {
  display: none !important;
}
```

## Responsive Design

### Mobile Optimization

Automatic adjustments on mobile:
- Ball count reduced by 40%
- Ball size scaled to 60%
- Touch events supported
- No cursor ball on touch devices

### Viewport Units

Uses `svh` (small viewport height) for mobile:
- Respects mobile UI (address bar, etc.)
- Fallback to `vh` on older browsers

### Breakpoints

```css
/* Adjust for small screens */
@media (max-width: 768px) {
  #simulations {
    /* Custom mobile styles */
  }
}
```

## Performance Considerations

### Bundle Size
- JavaScript: 45.5 KB minified
- CSS: 9.9 KB
- Total: ~55 KB (~18 KB gzipped)

### Loading Strategy

**Lazy Load (Recommended):**
```javascript
// Load when visible
const observer = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'app.js';
    document.body.appendChild(script);
    observer.disconnect();
  }
});
observer.observe(document.getElementById('simulations'));
```

**Preload (Faster):**
```html
<link rel="modulepreload" href="js/shared.js">
<link rel="modulepreload" href="js/app.js">
<link rel="preload" href="css/styles.css" as="style">
```

### CDN Hosting

Upload to CDN for best performance:
- CloudFlare
- AWS CloudFront
- Netlify CDN
- Vercel Edge Network

## Accessibility

### ARIA Support

Canvas has proper roles:
```html
<canvas id="c" 
  role="img" 
  aria-label="Interactive bouncy balls physics simulation"
></canvas>
```

### Keyboard Accessible

All functionality available via keyboard:
- Mode switching (1, 2, 3, 4)
- Reset (R)
- Panel toggle (/)

### Reduced Motion

Respects `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  /* Simulation adapts automatically */
}
```

## Troubleshooting

### Simulation Not Loading

1. **Check Console:** Open browser DevTools
2. **Verify Files:** Ensure JS/CSS loaded (Network tab)
3. **Check Container:** `#simulations` must exist
4. **Canvas Support:** Verify browser supports Canvas 2D

### Performance Issues

1. **Check FPS:** Enable FPS counter in panel
2. **Reduce Balls:** Lower count in mode controls
3. **Disable Effects:** Turn off motion blur
4. **Check Browser:** Update to latest version

### Styling Conflicts

The simulation is scoped to `#simulations`:
- Styles won't leak to page
- Dark mode only affects container
- Safe for common hosts/CMS platforms.

If conflicts occur:
```css
/* Increase specificity */
#simulations.mode-pit {
  height: 150vh !important;
}
```

## Security

### Content Security Policy (CSP)

Allow inline scripts and styles:
```html
<meta http-equiv="Content-Security-Policy" 
  content="script-src 'self' 'unsafe-inline'; 
           style-src 'self' 'unsafe-inline';">
```

### Privacy

- No external API calls
- No tracking or analytics
- localStorage only for settings
- No cookies
- No user data collection

## Advanced Integration

### Custom Event Listeners

Listen to mode changes:
```javascript
document.addEventListener('bouncyBallsModeChange', (e) => {
  console.log('Mode changed to:', e.detail.mode);
});
```

### Custom Styling

Override CSS variables:
```css
#simulations {
  --shadow-opacity: 0.2;
  --background-color: #cecece;
}
```

### Multiple Instances

Not recommended, but possible:
```html
<div id="simulations-1"></div>
<div id="simulations-2"></div>

<script>
  // Initialize manually
  initBouncyBalls('simulations-1', config1);
  initBouncyBalls('simulations-2', config2);
</script>
```

## Examples

### Full Page Background

```css
#simulations {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1; /* Behind content */
}
```

### Hero Section

```css
#simulations {
  position: relative;
  height: 80vh;
  margin-bottom: 2rem;
}
```

### Sidebar Widget

```css
#simulations {
  width: 300px;
  height: 400px;
  border-radius: 8px;
  overflow: hidden;
}
```

---

**Next Steps:**
- See [CONFIGURATION.md](./CONFIGURATION.md) for detailed settings
- See [MODES.md](./MODES.md) for mode specifications
- See [../development/DEV-WORKFLOW.md](../development/DEV-WORKFLOW.md) for build/preview workflow

**Need Help?** Contact [alexander@beck.fyi](mailto:alexander@beck.fyi)
