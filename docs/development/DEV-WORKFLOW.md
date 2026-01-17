# Development Workflow Guide

## Quick Start

The simplest way to start developing:

```bash
npm run startup
```

This launches an interactive menu that guides you through all available development modes.

Note: The project no longer syncs external exports into `source/`. Dev and production both use the canonical `source/` layout/assets.

Portfolio + CV follow the same pattern:
- **Dev** (`npm run dev`): HTML loads ES modules directly (e.g. `modules/portfolio/app.js`, `modules/cv-init.js`)
- **Preview/Build** (`npm run preview` / `npm run build`): HTML loads bundled scripts (`dist/js/portfolio.js`, `dist/js/cv.js`) and the runtime config/text are **inlined into the HTML** (no config fetch, no `dist/modules/` module graph).

---

## Development Modes Overview

| Mode | Command | Ports | Rebuild Required? | Best For |
|------|---------|-------|------------------|----------|
| **Quick Dev** | `npm run dev` | 8001 | ❌ No (instant) | Rapid iteration, UI tweaks |
| **Build Preview** | `npm run preview` | 8000 | ✅ Yes (auto on start) | Testing production bundle |
| **Watch Mode** | `npm run startup` → 4 | 8001 | ⚡ Auto-rebuild | Dev + background build updates |
| **Manual Servers** | See below | 8000 + 8001 | Hybrid | Advanced workflows |

---

## Detailed Mode Explanations

### 1. Quick Dev Mode (Recommended for Daily Work)

**Command:**
```bash
npm run dev
# or via interactive menu:
npm run startup → option 1
```

**What it does:**
- Starts HTTP server on port 8001
- Serves `source/` directory directly
- Uses native ES modules (no bundling)
- **Visually identical to production** (uses same HTML structure)
- Changes reflect instantly on browser refresh (and live reload can auto-refresh if enabled)

**Visual indicator:**
- 🚀 **Green badge** in control panel: "DEV MODE — Instant Reload"

**Architecture:**
- `source/index.html` is the canonical HTML layout
- CSS lives in `source/css/**`
- Loads dev CSS modules individually
- Loads `main.js` as ES module

**Workflow:**
1. Edit any file in `source/`
2. Save file
3. Refresh browser (Cmd+R / Ctrl+R) — or let live reload refresh automatically
4. See changes immediately

**Best for:**
- CSS/style tweaks
- JavaScript logic changes
- Module refactoring
- Quick experimentation
- Full site testing (includes gates, footer, etc.)

---

### 2. Build Preview Mode

**Command:**
```bash
npm run preview
# or via interactive menu:
npm run startup → option 2
```

**What it does:**
- Runs production build (`npm run build`)
- Starts HTTP server on port 8000
- Serves `dist/` directory (bundled output)
- Tests minified/optimized code

**Visual indicator:**
- 📦 **Orange badge** in control panel: "PRODUCTION BUILD — Bundled"

**Workflow:**
1. Make changes in `source/`
2. Run `npm run build`
3. Refresh browser on port 8000
4. Verify production behavior

**Best for:**
- Final validation before deploy
- Performance testing (bundle size, load time)
- Catching bundler-specific issues
- Testing with actual production code

---

### 3. Watch Mode (Auto-rebuild)

**Command:**
```bash
npm run startup
# Choose option 4 (Watch Mode)
```

**What it does:**
- Starts dev server on port 8001 (instant feedback)
- Starts build preview server on port 8000 (production structure + bundle)
- Runs file watcher in background
- Auto-rebuilds `dist/` when `source/` changes
- Keeps both environments in sync
- Starts a local live reload server (port 8003) so the browser can auto-refresh

**Visual indicator:**
- 🚀 Green badge on port 8001 (dev)
- Terminal shows rebuild notifications

**Workflow:**
1. Edit files in `source/`
2. Save file
3. Port 8001: refresh → instant changes
4. Port 8000: refresh → see rebuilt version
5. Watcher automatically rebuilds in background

**Implementation note (reliability):**
- The watcher uses a small polling-based scanner (`scripts/build-watch.js`) to avoid silent fs-event failures on some Node versions.
- Tuning (optional): `ABS_WATCH_POLL_MS=350 ABS_WATCH_DEBOUNCE_MS=150 npm run watch`

**Best for:**
- When you need both instant dev feedback AND production build testing
- Comparing behavior between environments
- Catching build-specific issues early

**Note:** To view the rebuilt output, start preview server in separate terminal:
Watch Mode now starts both servers automatically (8001 + 8000).

---

### 4. Dual Server Mode (Manual)

**Command:**
```bash
# Terminal 1: Dev server
npm run start:source

# Terminal 2: Build preview (after building)
npm run build
npm start

# Or via interactive menu:
npm run startup → option 3
```

**What it does:**
- Runs both servers simultaneously
- Full control over each environment
- No automatic rebuilding

**Visual indicators:**
- Port 8001: 🚀 Green badge (DEV)
- Port 8000: 📦 Orange badge (PRODUCTION)

**Workflow:**
1. Open both URLs in separate browser tabs
2. Edit in `source/`
3. Port 8001: refresh → instant changes
4. Port 8000: rebuild → refresh → see production version
5. Compare side-by-side

**Best for:**
- Debugging environment-specific issues
- Visual comparison of dev vs production
- Advanced debugging workflows

---

## Environment Detection

The application automatically detects which environment it's running in:

### Detection Logic

**DEV Mode triggers when:**
- Port is 8001, OR
- Document contains `<script type="module" src="main.js">`

**PRODUCTION Mode otherwise:**
- Port 8000
- Bundled script (`app.js`)

### Console Output Policy

- **DEV**: structured bootstrap logs (to prove init order + timing)
- **PRODUCTION**: prints a small “tech visitor” banner (plus ASCII “BECK”), then silences `console.log/info/warn/debug` (while leaving `console.error` for real failures)

### Visual Indicators

**🚀 Green Badge (DEV):**
```
Background: Green gradient (#10b981 → #059669)
Text: "DEV MODE — Instant Reload"
```

**📦 Orange Badge (PRODUCTION):**
```
Background: Orange gradient (#f59e0b → #d97706)
Text: "PRODUCTION BUILD — Bundled"
```

The badge appears at the top of the control panel (press `/` to open).

---

## File Structure Reference

### Source Files (Edit These)
```
source/
├── main.js              → Entry point (ES module)
├── index.html           → Dev HTML (uses modules)
├── css/
│   ├── main.css         → Core styles
│   ├── panel.css        → Panel + dock + sound styles
│   └── ...
└── modules/
    ├── core/            → State, lifecycle
    ├── physics/         → Collision, forces
    ├── rendering/       → Canvas drawing
    ├── ui/              → Control panel, gates
    └── ...
```

### Build Output (Generated - Don't Edit)
```
dist/
├── index.html                    → Production HTML (from source/index.html)
├── js/
│   ├── app.js                   → Main bundled JS (Rollup output)
│   ├── shared.js                → Shared code chunk
│   ├── portfolio.js             → Portfolio JS bundle
│   └── cv.js                    → CV JS bundle
├── css/
│   ├── styles.css               → Concatenated styles
│   └── portfolio.css            → Portfolio styles
└── ...
```

---

## Common Workflows

### Daily Development
```bash
npm run startup
# Choose option 1 (Quick Dev)
# Visit http://localhost:8001
# Edit → Save → Refresh → Repeat
```

### Pre-deployment Testing
```bash
npm run preview
# Visit http://localhost:8000
# Test all features
# Check console for errors
# Verify performance
```

### Debugging Environment Differences
```bash
npm run startup
# Choose option 3 (Dual Mode)
# Open both URLs in separate tabs
# Compare behavior side-by-side
```

### Continuous Development + Build Testing
```bash
npm run startup
# Choose option 4 (Watch Mode)
# Terminal 2: npm start (optional)
# Work on port 8001, check port 8000 occasionally
```

---

## Troubleshooting

### Changes Not Showing on Port 8000?

**Cause:** Production build not updated  
**Fix:**
```bash
npm run build
# Then refresh browser
```

### Changes Not Showing on Port 8001?

**Cause:** Browser caching  
**Fix:**
```bash
# Hard refresh:
# Mac: Cmd + Shift + R
# Windows/Linux: Ctrl + Shift + R
```

### Wrong Environment Badge Showing?

**Cause:** Mixed port/script detection  
**Fix:**
- Port 8001 should always show green badge
- Port 8000 should always show orange badge
- If incorrect, check browser console for errors

### "Address Already in Use" Error?

**Cause:** Server already running on that port  
**Fix:**
```bash
# Find and kill process on port 8000:
lsof -ti:8000 | xargs kill -9

# Or for port 8001:
lsof -ti:8001 | xargs kill -9
```

### Build Fails?

**Cause:** Missing dependencies or corrupted node_modules  
**Fix:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## Performance Tips

### Instant Feedback Loop
For fastest iteration, use **Quick Dev Mode** (port 8001):
- No build overhead
- Native ES modules
- Instant browser refresh

### Optimize Build Time
If running watch mode, use dev build for faster rebuilds:
```bash
# Watch uses dev build by default (no minification)
npm run watch
```

### Reduce Bundle Size
Before deployment, always use production build:
```bash
NODE_ENV=production npm run build
# This enables Terser minification
```

---

## Advanced Techniques

### Custom Startup Modes

You can bypass the interactive menu:

```bash
# Direct commands
npm run dev           # Quick dev only
npm run live-reload   # Browser auto-refresh server (port 8003)
npm run preview       # Build + preview
npm start             # Build preview only (manual)
npm run start:source  # Dev server only (manual)
npm run watch         # File watcher only (manual)
```

### Parallel Development

Run multiple terminals for maximum flexibility:

```bash
# Terminal 1: Dev server
npm run start:source

# Terminal 2: Build preview
npm start

# Terminal 3: File watcher
npm run watch

# Terminal 4: Tests
npm run test:ui
```

### Browser Setup

For dual-mode development:
1. Open Chrome profile 1 → `localhost:8001` (dev)
2. Open Chrome profile 2 → `localhost:8000` (build)
3. Arrange windows side-by-side
4. Edit code and see both update

---

## Related Documentation

- [Project Overview](../core/PROJECT-OVERVIEW.md) - Architecture and design principles
- [Build System](../reference/BUILD-SYSTEM.md) - How Rollup bundling works
- [Architecture](ARCHITECTURE.md) - Code organization and modules
- [Deployment](../operations/DEPLOYMENT.md) - Publishing to production

---

## Summary

**Quick Reference Card:**

```
🚀 Start developing:        npm run startup
💨 Fastest iteration:       npm run dev (port 8001)
📦 Test production:         npm run preview (port 8000)
👁️  Auto-rebuild:           npm run startup → option 4
🔄 Side-by-side:           npm run startup → option 3
🏗️  Build only:             npm run build
❓ Help:                    npm run help
```

**Remember:**
- Green badge = Dev mode (instant changes)
- Orange badge = Production build (requires rebuild)
- Press `/` to toggle control panel
- Port 8001 = development, Port 8000 = production
