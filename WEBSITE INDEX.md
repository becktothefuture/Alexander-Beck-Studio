# WEBSITE INDEX

Compact map of the project: what every folder/file is for, how the pieces fit, and which artifacts look deprecated.

---

## High-level map
- **Purpose:** Kinetic homepage with 11 simulations, right-docked control panel, privacy-first runtime, 60fps target.
- **Edit here:** `source/` only.  
- **Build output:** `public/` (generated).  
- **Docs:** `docs/` (authoritative specs).  
- **Tests:** `tests/` (Playwright smoke).  
- **Exports/archives:** `playwright-report/` (artifacts, not served).  
- **Scripts:** `scripts/`, `build-production.js`, `rollup.config.mjs` (helpers/tooling).

---

## Folder-by-folder

### Root
- `build-production.js` – production build helper/wrapper.
- `rollup.config.mjs` – bundling config for `source/` → `public/`.
- `package.json` / `package-lock.json` – dependencies and npm scripts.
- `README.md` – high-level overview (updated).
- `WEBSITE INDEX.md` – this file.
- `AI-AGENT-GUIDE.md` – instructions for AI operators.

### source/ (authoritative code)
- `index.html` – dev/demo entry page.
- `main.js` – bootstrap: load config → set layout vars → renderer → modes → UI → loop → randomized startup mode.
- `config/default-config.json` – runtime physics/visual defaults copied into build.
- `css/` – styles scoped to the simulation/panel:
- `normalize.css` (base reset), `main.css` (site + gates), `panel.css` (panel, dock, sound controls).
- `fonts/` – Tabler icons for UI glyphs.
- `modules/`
  - **core/** `constants.js`, `state.js` (mode registry, globals, layout vars).
  - **physics/** `Ball.js`, `collision.js`, `engine.js`, `spawn.js`, `text-colliders.js`, `wall-state.js` (collision grid, wall wobble).
  - **rendering/** `renderer.js` (canvas, resize), `loop.js` (fixed timestep + render), `cursor.js`, `effects.js`, `theme.js`.
  - **modes/** `mode-controller.js` plus per-mode implementations: `ball-pit.js`, `pit-throws.js`, `flies.js`, `weightless.js` (Zero-G), `water.js`, `vortex.js`, `ping-pong.js`, `magnetic.js`, `bubbles.js`, `kaleidoscope.js`, `critters.js`.
  - **ui/** panel + controls: `panel-dock.js`, `panel-html.js`, `control-registry.js`, `controls.js`, `build-controls.js`, `layout-panel.js`, `sound-panel.js`; brand/UI chrome: `brand-logo-*`, `gate-overlay.js`, `cv-gate.js`, `portfolio-gate.js`, `contact-gate.js`, `time-display.js`, `sound-toggle.js`, `theme-toggle.js`, `social-icons.js`, `keyboard.js`, `controls.js`, `control-registry.js`.
  - **input/** `pointer.js` (mouse/touch), keyboard handled in `ui/keyboard.js`.
  - **audio/** `sound-engine.js`, `sound-control-registry.js` (collision/ambient hooks).
  - **utils/** `logger.js`, `performance.js`, `storage.js` (localStorage off by default for physics), `accessibility.js`.
  - **visual/** `colors.js`, `dark-mode-v2.js` (dark-mode implementation), `mouse-trail.js`, `chrome-harmony.js`, `entrance-animation.js`, `noise-system.js`, `wall-frame.js`.
  - **ui/html helpers**: `panel-controller.js`, `panel-dock.js` create the right-floating, collapsible panel (summoned by `/`).
- (Removed) legacy export asset copies (no longer used).

### public/ (generated; do not edit)
- `index.html`, `css/`, `js/bouncy-balls-embed.js`, `images/`, `fonts/`. Served by `npm start` / `npm run preview`.

### docs/ (source of truth)
- `core/` (PROJECT-OVERVIEW, QUICK-START), `development/` (ARCHITECTURE, DEV-WORKFLOW, DEVELOPMENT-GUIDE, OPTIMIZATION-SUMMARY, FIGMA setup), `reference/` (MODES, CONFIGURATION, BUILD-SYSTEM, INTEGRATION, SOUND), `operations/` (DEPLOYMENT, PROJECT-ASSESSMENT), `SIMULATION_RULES.md`, `DOCUMENTATION-INDEX.md`, `DOCUMENTATION-PRINCIPLE.md`.

### scripts/
- Automation/support: `dev-startup.js`, `check-figma-mcp-status.js`, `setup-figma-mcp-config.js`, `figma-websocket-server.js`, `execute-figma-rebuild.txt` (Figma rebuild instructions).

### tests/ and reports
- `tests/top-elements.spec.js` – Playwright smoke.
- `playwright-report/` – artifacts from runs (images, videos, HTML).

### (Removed) legacy export snapshots

### test-results/
- Output folder for test runs (empty/auxiliary).

---

## Simulation catalogue (current code)
- Gravity: `ball-pit`, `pit-throws`.
- Swarm/flow: `flies`, `vortex`, `magnetic`, `critters`.
- Elastic: `weightless` (Zero-G), `ping-pong`.
- Fluid-ish: `water`, `bubbles`.
- Optical: `kaleidoscope`.
- Modes 1–9 mapped to keys; Critters and Ball Pit (Throws) via panel.

---

## Behaviors & UI affordances
- Right-floating panel dock (`/`), collapsible sections, single scroll container, right inset ~5vh.
- Cursor forces (repel/attract), custom cursor sized to balls, touch parity.
- Wall wobble & browser-colored frame (visual finesse), layered film grain (`.noise`, `.noise-2`, `.noise-3`).
- Randomized startup mode per session, mode-aware canvas height (150vh pit; 100svh others).
- Gates: CV/Portfolio/Contact overlays; social/time widgets; sound/theme corner toggles.
- Accessibility: canvas role + aria-label, respects `prefers-reduced-motion`.

---

## Deprecated / Removed
- ~~`source/modules/visual/dark-mode.js`~~ – **REMOVED** (replaced by `dark-mode-v2.js`).
- ~~`source/index-annotated.html`~~ – **REMOVED** (documentation file, not used in runtime).

## Test Artifacts (not committed)
- `playwright-report/` zips/webms/pngs – test artifacts; keep out of commits if not needed.
- `test-results/` – Playwright test output (auxiliary).

---

## Notes on generated vs editable
- Edit only `source/` and `docs/`.
- `public/` is produced by `npm run build` (or `build-production.js`), then served via `npm start`/`npm run preview`.
- Config copies from `source/config/default-config.json` into `public/js/config.json` during build; runtime also looks for `config/default-config.json` at the server root.

---

## Quick dev workflow
1. `npm run startup` → choose dev/preview/watch.
2. Work in `source/`.
3. `/` toggles the panel; keys `1–9`, `R` for modes/reset.
4. `npm run build` before publishing; `npm start` to serve built bundle on port 8000.

---

## Cleanup Status
- ✅ **Completed**: Removed deprecated `dark-mode.js` and `index-annotated.html`.
- ✅ **Verified**: No broken imports or references.
- 📝 **Note**: Keep test artifacts (`playwright-report/`, `test-results/`) out of release packages.
