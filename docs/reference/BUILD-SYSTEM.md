# Build System Reference

## Overview

The Alexander Beck Studio website uses a **single-source production build system** that transforms the canonical `source/` HTML/CSS/JS and runtime config into a fully integrated, optimized static site.

**Source of Truth:**
- `source/index.html` - Canonical HTML layout
- `source/css/**` - Canonical styles (including normalize)
- `source/main.js` - Modular entry point (ES modules under `source/modules/**`)
- `source/images/**` - Favicons + static assets (including `realistic_noise.gif`)
- `source/config/default-config.json` - Runtime configuration defaults
- `source/config/text.json` - **All user-facing copy** (single source of truth)

**Output:**
- `public/` - Complete production-ready site (fully generated, never edit directly)

---

## Quick Commands

### Production Build (Modular-only)
```bash
npm run build
```
**Generates:** Complete site in `public/` directory  
**Process:** source → public (static assets) + Rollup bundle + asset injection  
**Time:** ~3-4 seconds  
**Output Size:** ~48KB minified JS + 7.6KB CSS

### Development Build
```bash
npm run build:dev  # Development build with source maps (faster, no minification)
```

### Live Development (Auto-Rebuild)
```bash
# Terminal 1: Watch for changes and auto-rebuild
npm run watch

# Terminal 2: Serve the built site
npm start              # http://localhost:8000
```
**Watches:** `source/**/*`  
**Triggers:** Rebuilds `public/` on every file save  
**Workflow:** Save file → wait 2s → refresh browser (Cmd+R)

### Visual-Parity Dev

Dev and production share the same canonical `source/index.html` and `source/css/**`. The production build composes assets into `public/`.

### Help
```bash
npm run help
```
Shows all available build commands with descriptions.

---

## What Happens During Build

### Step-by-Step Process

**1. Prepare `public/`**
- Deletes existing `public/` directory
- Copies required static assets from `source/` (images, fonts, standalone pages)

**2. Bundle Modules**
```
source/main.js → Rollup → public/js/bouncy-balls-embed.js
```
- Bundles JS via Rollup
- Bundles CSS from `source/css/` into `public/css/bouncy-balls.css` (includes normalize + main + gates; panel assets are excluded in production)
- Copies runtime config into production output (see “Runtime Configuration Details”)

**3. Runtime Configuration**
```
source/config/default-config.json → public/js/config.json
```
Loaded via fetch in `main.js` with cache-busting in dev

**3b. Runtime Text (Single Source of Truth)**
```
source/config/text.json → public/js/text.json
```
- **Dev:** fetched once at startup via `loadRuntimeText()` (`source/modules/utils/text-loader.js`)
- **Prod:** **inlined + minified** into `public/index.html` as `window.__TEXT__` (zero fetch, no pop-in)

**Example:**
```javascript
// Before: let gravityMultiplierPit = 1.0;
// After:  let gravityMultiplierPit = 1.05; (from config)
```

**4. Minify JavaScript**
- Rollup terser plugin with 3-pass compression

**5. Integrate into HTML**
```
public/index.html [placeholder] → [full simulation]
```
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

`source/config/text.json` is copied to:
- `public/js/text.json`
- `public/config/text.json`

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

### Terser Configuration (v2 - Optimized)

**Compression Settings:**
- **3 passes** - Multiple optimization rounds for maximum compression
- **ECMAScript 2020 target** - Modern syntax (arrow functions, spread, etc.)
- **Dead code elimination** - Removes unreachable code
- **Console policy** - Keeps all console statements (runtime handles verbosity)
- **Debugger removal** - Strips `debugger` statements
- **Function inlining** - Inlines single-use functions (level 2)
- **Variable collapsing** - Collapses single-use variables
- **Pure functions** - Annotates Math/Object/Array methods as side-effect-free
- **Property hoisting** - Hoists property access for smaller output
- **Sequence optimization** - Uses comma sequences where safe
- **Unsafe optimizations** - Aggressive arrow/method/regexp optimizations

**Mangling:**
- **Top-level mangling** - Renames function/variable names
- **Safari 10 compatibility** - Avoids known Safari bugs
- **Private property mangling** - Mangles properties starting with `_`

**Output:**
- **No comments** - Removes all documentation
- **Compact format** - Minimal whitespace
- **IIFE wrapping** - Safe for inclusion anywhere

### CSS Minification

The build now minifies CSS (previously only concatenated):
- Removes comments
- Collapses whitespace
- Removes unnecessary semicolons
- Optimizes selectors

### Bundle Sizes

| Asset | Raw | Minified | Gzipped |
|-------|-----|----------|---------|
| JS | ~400KB | ~240KB | ~62KB |
| CSS | ~70KB | ~36KB | ~7KB |
| **Total** | ~470KB | ~276KB | **~69KB** |

**Note:** Gzipped sizes represent actual network transfer (what users download).

---

## File Structure

### Before Build

```
/
├── source/                  # ← Development files
│   ├── index.html           # ← Canonical HTML
│   ├── main.js              # ← Entry point
│   ├── images/**
│   ├── css/**
│   ├── config/default-config.json
│   └── modules/**
└── build-production.js      # ← Build script
```

### After Build

```
/
├── public/                  # ← Generated (don't edit!)
│   ├── index.html           # Bundled + config inlined
│   ├── css/
│   │   └── bouncy-balls.css # Bundled CSS (includes normalize + site styles)
│   ├── js/
│   │   └── bouncy-balls-embed.js  # Minified simulation
│   └── images/              # Static assets from source/images
```

---

## Troubleshooting

### Build Fails: "Assets not injected"

**Cause:** HTML template changed or build injection failed  
**Fix:** Ensure the build is using `source/index.html` and that it injects `bravia-balls-css` and `bravia-balls-js`.

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

1. **Clean output + copy static assets:**
   ```bash
   rm -rf public/
   npm run build
   ```

2. **Inject Assets:**
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

