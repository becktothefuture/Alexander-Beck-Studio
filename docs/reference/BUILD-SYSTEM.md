# Build System Reference

## Overview

The Alexander Beck Studio website uses a **single-source production build system** that transforms Webflow export templates and custom simulation code into a fully integrated, optimized static site.

**Source of Truth:**
- `webflow-export/` - Pristine Webflow export (HTML/CSS/assets)
- `source/balls-source.html` - Unminified simulation source code
- `source/current-config.json` - Runtime configuration values

**Output:**
- `public/` - Complete production-ready site (fully generated, never edit directly)

---

## Quick Commands

### Production Build (Most Common)
```bash
npm run build
```
**Generates:** Complete site in `public/` directory  
**Process:** Webflow export + simulation integration + minification  
**Time:** ~2-3 seconds  
**Output Size:** ~48KB minified JS + 7.6KB CSS

### Standalone Embed Build (Advanced)
```bash
npm run build:embed-only
```
**Generates:** Only `public/js/bouncy-balls-embed.js`  
**Use Case:** Embedding simulation in external sites  
**Note:** Doesn't include Webflow integration

### Auto-Rebuild on Changes
```bash
npm run watch
```
**Watches:** `source/**/*` and `webflow-export/**/*`  
**Triggers:** `npm run build` on any file change  
**Perfect for:** Development workflow

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

**2. Extract Simulation Components**
```
source/balls-source.html → [HTML, CSS, JS]
```
- Extracts `<div id="bravia-balls">` container (full structure)
- Extracts `<style>` tag contents
- Extracts `<script>` tag contents
- Removes FPS counter (production override)

**3. Hardcode Configuration Values**
```
source/current-config.json → JavaScript variables
```
Maps config keys to JS variables:
- `gravityMultiplier` → `gravityMultiplierPit`
- `ballMass` → `ballMassKg`
- `repelRadius`, `repelPower`, `repelSoftness` → corresponding vars
- Plus 10+ more mappings

**Example:**
```javascript
// Before: let gravityMultiplierPit = 1.0;
// After:  let gravityMultiplierPit = 1.05; (from config)
```

**4. Minify JavaScript**
```
JavaScript (160.4KB) → Terser → (48.1KB, 70% reduction)
```
- 3-pass compression
- Dead code elimination
- Variable mangling (preserves critical names)
- Preamble comment with build timestamp

**5. Integrate into Webflow HTML**
```
public/index.html [placeholder] → [full simulation]
```
- Finds: `<div id="bravia-balls" class="ball-simulation w-embed">`
- Replaces with: Full simulation container (HTML structure)
- Injects CSS into `<head>` as `<style id="bravia-balls-css">`
- Injects minified JS before `</body>` as `<script id="bravia-balls-js">`

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

## Configuration Injection Details

### Config Mapping Table

| Config Key | JavaScript Variable | Type | Example |
|------------|-------------------|------|---------|
| `gravityMultiplier` | `gravityMultiplierPit` | number | 1.05 |
| `ballMass` | `ballMassKg` | number | 91 |
| `ballScale` | `sizeScale` | number | 1.0 |
| `ballVariation` | `sizeVariation` | number | 0 |
| `repelRadius` | `repelRadius` | number | 710 |
| `repelPower` | `repelPower` | number | 250000 |
| `repelSoftness` | `repelSoft` | number | 4 |
| `cursorColorIndex` | `cursorBallIndex` | number | 4 |
| `enableLOD` | `enableLOD` | boolean | true |
| `vortexSpeedColorEnabled` | `vortexSpeedColorEnabled` | boolean | false |

### How It Works

1. Build script reads `source/current-config.json`
2. For each config key, finds corresponding JS variable
3. Uses regex to locate variable declaration in source code
4. Replaces value in-place (preserves `let`/`const` declaration)
5. Reports which values were applied and which were skipped

**Example Build Output:**
```
⚙️  Step 3: Hardcoding config values...
   Applied 10 config values:
   ✓ gravityMultiplier → gravityMultiplierPit
   ✓ ballMass → ballMassKg
   ✓ repelRadius → repelRadius
   ...
   ⚠️  Skipped (not found): gravityMultiplierFlies, restitution, friction
```

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
│   ├── balls-source.html    # ← Edit this (simulation code)
│   └── current-config.json  # ← Edit this (settings)
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

### Build Fails: "Could not find #bravia-balls container"

**Cause:** `source/balls-source.html` missing or corrupted  
**Fix:** Restore from git or verify file contains `<div id="bravia-balls">`

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

### Config Values Not Applied

**Symptom:** Changed `current-config.json` but simulation unchanged

**Debug Steps:**
1. Check build output for "Applied X config values"
2. Look for "Skipped (not found)" warnings
3. Verify config key matches mapping table above
4. Confirm JS variable exists in `source/balls-source.html`

**Example:**
```
⚠️  Skipped (not found): myCustomValue
```
→ Add mapping in `build-production.js` `configMap` object

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

2. **Extract Simulation:**
   ```javascript
   // Extract HTML, CSS, JS from source/balls-source.html
   // (See build-production.js functions for details)
   ```

3. **Apply Config:**
   ```javascript
   // Regex replace config values in JS code
   ```

4. **Minify:**
   ```bash
   npx terser input.js -o output.js --compress --mangle
   ```

5. **Integrate:**
   ```javascript
   // Replace placeholder in public/index.html
   // Inject CSS/JS
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
| Pulse Grid | 120 | 60 | ✅ Excellent |

---

## Related Documentation

- **[Development Guide](../development/DEVELOPMENT-GUIDE.md)** - Workflow and debugging
- **[Architecture](../development/ARCHITECTURE.md)** - Technical deep dive
- **[Configuration](CONFIGURATION.md)** - All config parameters
- **[Deployment](../operations/DEPLOYMENT.md)** - Production deployment

---

**Last Updated:** 2025-10-02  
**Build Script Version:** 2.0 (Consolidated)

