# Build System Reference

## Overview

The Alexander Beck Studio website uses a **single-source production build system** that transforms Webflow export templates and custom simulation code into a fully integrated, optimized static site.

**Source of Truth:**
- `webflow-export/` - Pristine Webflow export (HTML/CSS/assets)
- `source/main.js` - Modular entry point (ES modules under `source/modules/**`)
- `source/config/default-config.json` - Runtime configuration defaults

**Output:**
- `public/` - Complete production-ready site (fully generated, never edit directly)

---

## Quick Commands

### Production Build (Modular-only)
```bash
npm run build
```
**Generates:** Complete site in `public/` directory  
**Process:** Webflow copy + Rollup bundle + asset injection  
**Time:** ~3-4 seconds  
**Output Size:** ~48KB minified JS + 7.6KB CSS

### Modular Build (Dev)
```bash
npm run build:modules:dev  # Development with source maps
```

### Live Development (Auto-Rebuild)
```bash
# Terminal 1: Watch for changes and auto-rebuild
npm run watch

# Terminal 2: Serve the built site
npm start              # http://localhost:8000
```
**Watches:** `source/**/*` and `webflow-export/**/*`  
**Triggers:** Rebuilds `public/` on every file save  
**Workflow:** Save file → wait 2s → refresh browser (Cmd+R)

### Help
```bash
npm run help
```
Shows all available build commands with descriptions.

---

## What Happens During Build

### Step-by-Step Process

**1. Clean Slate Copy**
```
webflow-export/ → public/
```
- Deletes existing `public/` directory
- Copies entire Webflow export (preserves structure exactly)
- Result: Pristine Webflow site in `public/`

**2. Bundle Modules**
```
source/main.js → Rollup → public/js/bouncy-balls-embed.js
```
- Bundles JS via Rollup
- Bundles CSS from `source/css/` into `public/css/bouncy-balls.css` (includes panel + dock + sound + gates)
- Copies runtime config into production output (see “Runtime Configuration Details”)

**3. Runtime Configuration**
```
source/config/default-config.json → public/js/config.json
```
Loaded via fetch in `main.js` with cache-busting in dev

**Example:**
```javascript
// Before: let gravityMultiplierPit = 1.0;
// After:  let gravityMultiplierPit = 1.05; (from config)
```

**4. Minify JavaScript**
- Rollup terser plugin with 3-pass compression

**5. Integrate into Webflow HTML**
```
public/index.html [placeholder] → [full simulation]
```
- Finds: `<div id="bravia-balls" class="ball-simulation w-embed">`
- Replaces with: Full simulation container (HTML structure)
- Injects CSS `<link id="bravia-balls-css">`
- Injects JS `<script id="bravia-balls-js" src="js/bouncy-balls-embed.js">`
- Wraps the content layer in `#fade-content` and injects a blocking `<style id="fade-blocking">` to prevent FOUC

**6. Create Standalone Files**
```
Generates:
- public/js/bouncy-balls-embed.js (minified, for external use)
- public/css/bouncy-balls.css (scoped styles)
```

**7. Validate Build Output**
Checks:
- ✓ `public/index.html` exists and >10KB
- ✓ `public/js/bouncy-balls-embed.js` exists
- ✓ `public/css/bouncy-balls.css` exists
- ✓ CSS injected with correct ID
- ✓ JS injected with correct ID
- ✓ Placeholder replaced (no `.ball-simulation.w-embed` class remains)

**If any check fails:** Build aborts with detailed error report

---

## Runtime Configuration Details

### Build-time copy targets

`source/config/default-config.json` is copied to:
- `public/js/config.json`
- `public/config/default-config.json`

### Runtime load order

At runtime, `source/main.js` attempts to fetch (in order):
1. `config/default-config.json`
2. `js/config.json`
3. `../public/js/config.json`

### Where values are applied

- **Simulation state**: `source/modules/core/state.js` (`initState(config)`) maps the JSON keys into runtime globals used by physics and interaction.
- **Visual system**: `source/main.js` applies CSS variables (noise sizing/opacity, wall geometry, inner shadow, content padding) from the config.

---

## Minification Strategy

### Terser Configuration

**Compression Settings:**
- **3 passes** - Multiple optimization rounds
- **Dead code elimination** - Removes unreachable code
- **Console preservation** - Keeps `console.log` for debugging
- **Debugger removal** - Strips `debugger` statements
- **Unsafe optimizations** - Aggressive math/method optimizations

**Mangling:**
- **Top-level mangling** - Renames function/variable names
- **Safari 10 compatibility** - Avoids known Safari bugs

**Output:**
- **No comments** - Removes all documentation
- **Build preamble** - Adds timestamp header
- **70% size reduction** - 160KB → 48KB

### Why Terser?

- Industry standard for JavaScript minification
- Excellent compression ratio
- Source map support (not currently enabled)
- Active maintenance and bug fixes

---

## File Structure

### Before Build

```
/
├── webflow-export/          # ← Webflow template (pristine)
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── images/
├── source/                  # ← Development files
│   ├── index.html           # ← Dev page (modules)
│   ├── main.js              # ← Entry point
│   ├── config/default-config.json
│   └── modules/**
└── build-production.js      # ← Build script
```

### After Build

```
/
├── public/                  # ← Generated (don't edit!)
│   ├── index.html           # Webflow + simulation integrated
│   ├── css/
│   │   ├── (Webflow CSS files)
│   │   └── bouncy-balls.css # Standalone simulation styles
│   ├── js/
│   │   ├── (Webflow JS files)
│   │   └── bouncy-balls-embed.js  # Minified simulation
│   └── images/              # (Webflow assets)
```

---

## Troubleshooting

### Build Fails: "Assets not injected"

**Cause:** Webflow template diverged from expected placeholder  
**Fix:** Ensure `<div id="bravia-balls" ...>` exists in `public/index.html`

### Build Fails: Validation Error

**Cause:** Build completed but output invalid  
**Check:**
```bash
ls -lh public/index.html  # Should be >10KB
ls -lh public/js/bouncy-balls-embed.js  # Should exist
```

**Common Issues:**
- Placeholder not replaced → Check regex in `build-production.js`
- CSS/JS not injected → Check file contains expected IDs

### Config Not Loading

**Symptom:** Defaults differ from expected

**Debug Steps:**
1. Ensure `public/js/config.json` exists
2. Network tab: `GET js/config.json` status 200
3. CORS or CSP not blocking fetch

### Config Not Applied

**Symptom:** Changed `default-config.json` but simulation unchanged

**Debug Steps:**
1. Ensure `public/js/config.json` was copied
2. Check Network tab for successful fetch
3. Verify JSON structure matches expected keys

### Public Output Doesn't Update

**Cause:** Browser caching old files  
**Fix:**
```bash
# Hard refresh in browser
# Chrome/Firefox: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
# Safari: Cmd+Option+R

# Or clear cache:
npm run build && npm start  # Rebuild and restart server
```

### Watch Mode Not Triggering

**Cause:** File watcher not detecting changes  
**Fix:**
```bash
# Kill existing watch process
pkill -f chokidar

# Restart watch
npm run watch
```

---

## Advanced Usage

### Manual Build Steps (For Understanding)

1. **Copy Webflow Export:**
   ```bash
   rm -rf public/
   cp -r webflow-export/ public/
   ```

2. **Bundle Modules:** (handled automatically by build script)
   ```bash
   # rollup is invoked by build script
   npm run build
   ```

3. **Inject Assets:**
   ```javascript
   // Build script replaces placeholder and injects link/script tags
   ```

### Custom Build Scripts

**Want to modify the build process?**

1. Copy `build-production.js` to `build-custom.js`
2. Modify as needed
3. Add to `package.json`:
   ```json
   "build:custom": "node build-custom.js"
   ```

**Common Customizations:**
- Change minification settings (Terser options)
- Add source maps for debugging
- Include/exclude specific config values
- Add post-build hooks (e.g., deploy script)

---

## Performance Metrics

### Build Performance

| Metric | Value | Notes |
|--------|-------|-------|
| Build Time | 2-3 seconds | On modern hardware |
| Input Size | ~160KB | Unminified JS |
| Output Size | ~48KB | Minified JS (70% reduction) |
| CSS Size | ~7.6KB | Scoped simulation styles |
| Total Assets | ~56KB | JS + CSS combined |

### Runtime Performance

| Mode | Balls | FPS | Status |
|------|-------|-----|--------|
| Ball Pit | 200+ | 60 | ✅ Excellent |
| Flies | 300+ | 60 | ✅ Excellent |
| Zero-G | 150+ | 60 | ✅ Excellent |
| Water | 300 | 60 | ✅ Excellent |

---

## Related Documentation

- **[Development Guide](../development/DEVELOPMENT-GUIDE.md)** - Workflow and debugging
- **[Architecture](../development/ARCHITECTURE.md)** - Technical deep dive
- **[Configuration](CONFIGURATION.md)** - All config parameters
- **[Deployment](../operations/DEPLOYMENT.md)** - Production deployment

---

**Last Updated:** 2025-10-02  
**Build Script Version:** 2.0 (Consolidated)

