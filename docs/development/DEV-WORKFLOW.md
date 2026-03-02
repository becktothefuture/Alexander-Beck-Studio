# Development Workflow Guide

## Quick Start

**First-time setup:**
```bash
npm run install:all
```

**Daily development:**
```bash
npm run dev
```
This starts **both** the React app (port 8012) and the HTML site (port 8001) via a single command.

Alternatively, use the interactive menu:
```bash
npm run startup
```
Choose option 1 for Dev (both), or option 2 (React only) / 3 (HTML only) for a single pipeline.

**Primary surface:** React app at `react-app/app/` (Vite). The HTML site is isolated in `html-site/` for reference/fallback.

---

## Development Modes Overview

| Mode | Command | Ports | Best For |
|------|---------|-------|----------|
| **Dev (both)** | `npm run dev` | 8012 (React), 8001 (HTML) | Daily dev with both surfaces |
| **React only** | `npm run dev:react` | 8012 | React app work only |
| **HTML only** | `npm run dev:html` | 8001 | Isolated HTML site (html-site/) |
| **Build (React)** | `npm run build` | — | Production minified build |
| **Build dev (React)** | `npm run build:dev` | — | Unminified + sourcemaps |
| **Preview (React)** | `npm run preview` | 8013 | Serve React build |
| **HTML build** | `npm run html:build` | — | Build html-site to html-site/dist/ |

---

## Detailed Mode Explanations

### 1. Dev (both) — Recommended for Daily Work

**Command:**
```bash
npm run dev
# or: npm run startup → option 1
```

**What it does:**
- Starts **React** dev server on port 8012 (Vite HMR)
- Starts **HTML** dev server on port 8001 (serves `html-site/source/`)
- Single process via `concurrently`; Ctrl+C stops both

**Workflow:**
1. Edit `react-app/app/src/` or `react-app/app/public/` for React
2. Edit `html-site/source/` for the isolated HTML site
3. React: hot reload; HTML: refresh browser

**Best for:** Daily development with both surfaces available.

---

### 2. React only

**Command:** `npm run dev:react` or `npm run startup` → option 2

**What it does:** Vite dev server for `react-app/app/` on port 8012. No HTML pipeline.

---

### 3. HTML only

**Command:** `npm run dev:html` or `npm run startup` → option 3

**What it does:** Serves `html-site/source/` on port 8001. Uses the isolated HTML pipeline (see `html-site/README.md`).

---

### 4. Install all

**Command:** `npm run install:all` or `npm run startup` → option 4

**What it does:** Installs dependencies for root, `react-app/app`, and `html-site`. Run once after clone or when adding deps.

---

### 5. Build only (React)

**Command:** `npm run build` or `npm run startup` → option 5

**What it does:** Production minified build to `react-app/app/dist/`. Use `npm run build:dev` for unminified + sourcemaps. Use `npm run preview` to serve the build on port 8013.

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

### React app (primary)
- **Edit:** `react-app/app/src/`, `react-app/app/public/`
- **Build output:** `react-app/app/dist/` (Vite)

### HTML site (isolated)
- **Edit:** `html-site/source/` (main.js, index.html, css/, modules/, config/)
- **Build output:** `html-site/dist/` (Rollup)

---

## Common Workflows

### Daily Development
```bash
npm run startup
# Choose option 1 (Dev both) or 2 (React only) / 3 (HTML only)
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
npm run test
```

### Browser Setup

For dual-mode development:
1. Open Chrome profile 1 → `localhost:8001` (dev)
2. Open Chrome profile 2 → `localhost:8000` (build)
3. Arrange windows side-by-side
4. Edit code and see both update

---

## Related Documentation

- [README](../../README.md) - Project overview and architecture snapshot
- [Configuration Reference](../reference/CONFIGURATION.md) - Runtime configuration keys
- [Mode Reference](../reference/MODES.md) - Active simulation modes and sequence
- [Integration Guide](../reference/INTEGRATION.md) - Embedding and host integration

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
