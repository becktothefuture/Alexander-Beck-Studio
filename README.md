# Alexander Beck Studio Website

Minimal, high-speed kinetic canvas built with vanilla JS + Canvas 2D. A **curated, panel-free production experience** (narrative mode cycling) plus a **full dev control surface** on port 8001 — all tuned for 60fps and privacy-first defaults.

---

## What this site does
- **Kinetic homepage:** Particles, walls, and light fields living inside `#bravia-balls` container — rest of page stays untouched.
- **16 simulation modes** across 7 categories (gravity, swarm/flow, elastic, fluid, optical, parallax, 3D point-cloud) — see `docs/reference/MODES.md` for complete specifications.
- **Visual systems:** 
  - Rubber wall wobble (10 material presets: rubber, pudding, trampoline, jelly, stiff, steel, latex, memory foam, hydraulic, gel sheet)
  - Browser-colored wall/frame sync (meta tag harmony)
  - Procedural film grain (no external assets)
  - Adaptive dark/light palettes with auto/manual theme switching
  - Entrance animation system (wall + element transitions)
  - Brand logo micro-interactions (ball-space yield, cursor scaling)
  - Mouse cursor trail with palette-driven colors
- **Interaction model:** Cursor repel/attract/reshape forces; touch parity; keyboard narrative cycling (arrow keys) + reset (`R`).
- **Dev control surface:** Master panel (port **8001** only) with collapsible sections, real-time tuning, wall/sound/color presets.
- **Privacy + performance:** No external calls; localStorage for settings only (no user text); spatial hashing + fixed 120Hz timestep = O(1) per entity.
- **Mobile fidelity:** Responsive scaling (60% balls), touch support, canvas-level rounded-corner clipping (prevents "corner bleed" on iOS).

---

## Quick start
```bash
npm install
npm run startup    # choose dev/preview/watch from menu
# or
npm run dev        # port 8001, instant reload
npm run preview    # port 8000, production bundle
npm run build      # produce public/js/bouncy-balls-embed.js + public/js/portfolio-bundle.js
```

Open `http://localhost:8001` for dev or `http://localhost:8000` for the production bundle. Never edit `public/` by hand.

---

## Controls
| Key | Action |
| --- | --- |
| `→` | Next simulation (narrative sequence) |
| `←` | Previous simulation (narrative sequence) |
| `/` | Toggle panel dock (**dev / port 8001**) |
| `R` | Reset simulation |

Direct `1–9` mode hotkeys are intentionally disabled; switch via Arrow keys (narrative) or the dev panel.  
See `docs/reference/MODES.md` for the authoritative mode list + narrative ordering.

---

## Mobile tuning notes
- **Click depth**: on mobile viewports the scene “press” depth is boosted via `sceneImpactMobileMulFactor` (default `1.5x`) on top of `sceneImpactMul`. This is exposed in the dev panel under **Scene → Mobile Depth ×**.
- **Rounded corners**: canvas rendering is clipped to the rounded frame radius (cached per-resize) so modes with non-rounded bounds (e.g. Kaleidoscope) never “peek” past corners on iOS.

---

## Systems Overview

### Physics Engine
- **Fixed timestep:** 120Hz physics (DT = 1/120s)
- **Spatial hashing:** O(n) collision detection with grid optimization
- **Sleep system:** Ball Pit modes use Box2D-inspired sleep for jitter reduction
- **Wall collision:** Rounded-rectangle bounds with rubber deformation feedback
- **Performance:** Optimized allocations, reusable buffers, sleeping ball skip

### Visual Systems
- **Dark mode:** Auto (system + time heuristic), light, dark with localStorage persistence
- **Color system:** 8-slot palette with weighted distribution (AI Integration 75%, Frontend Dev 10%, etc.)
- **Wall wobble:** 10 material presets with per-sample physics (stiffness, damping, sigma blur)
- **Noise/grain:** Procedural texture generation (no external GIF), CSS animation, theme-aware opacity
- **Entrance animation:** Coordinated wall + element transitions with perspective + scale
- **Chrome harmony:** Browser UI color sync via meta tags (frame color → address bar)
- **Cursor system:** Palette-driven dot + canvas trail, auto-contrast selection

### Audio System
- **Collision SFX:** Synthesized pebble/crystal sounds (no external audio files)
- **Sound presets:** Pebbles, crystals, glass, wood, soft, digital
- **Velocity mapping:** Pitch, brightness, decay scaled by impact intensity
- **Reverb + filtering:** Convolution reverb, bandpass filters, stereo panning

### UI Chrome
- **Gates:** CV, Portfolio, Contact overlays with password protection
- **Legend:** Interactive color legend with discipline labels
- **Panel dock:** Collapsible dev panel (port 8001 only) with preset management
- **Social icons:** Apple, X (Twitter), LinkedIn with hover effects
- **Time display:** Live clock with timezone
- **Theme toggle:** Auto/Light/Dark switching
- **Sound toggle:** Global audio enable/disable

### 20 Simulation Modes
- **Gravity:** Ball Pit, Ball Pit (Throws)
- **Swarm/Flow:** Flies, Vortex, Magnetic, Critters
- **Elastic:** Zero-G (Weightless), Ping Pong
- **Fluid:** Water, Bubbles
- **Optical:** Kaleidoscope, Kaleidoscope I, Kaleidoscope II, Kaleidoscope III
- **Orbital:** Orbit 3D, Orbit 3D (Tight Swarm)
- **Lattice:** Crystal Lattice, Neural Network
- **Parallax:** Parallax Linear, Parallax Perspective

See `docs/reference/MODES.md` for physics specifications and narrative sequence.

---

## How it is built (why it works this way)
- **Source-first**: all edits in `source/`; build emits `public/js/bouncy-balls-embed.js`. Exported HTML/CSS assets are composed at build-time and are never hand-edited post-build.
- **Portfolio mirrors the same pattern**: `source/portfolio.html` loads the shared chrome plus `modules/portfolio/app.js`; build emits `public/js/portfolio-bundle.js`, `public/css/portfolio.css`, and copies `config/portfolio-*.json`.
- **Constant-time hot paths**: spatial grid for collisions, minimal allocations per frame, dt capped for Safari/Chrome parity.
- **Scoped styles**: everything contained in `#bravia-balls`; CSS variables drive palette, wall, and grain; panel styles are confined to the dock.
- **Config-injected**: runtime config pulled from `config/default-config.json` (or inlined); localStorage optional and off for physics state by default.
- **Accessibility + privacy**: canvas labeled, keyboardable; no network calls beyond initial config fetch; respects reduced motion.
- **Workflow**: `npm run startup` menu for dev/watch/preview; `npm start` serves the built bundle on port 8000; `npm run start:source` serves `source/` on port 8001.

---

## Architecture snapshot
```
source/
  main.js            # bootstrap: config → layout vars → renderer → modes → UI
  css/               # base styles, panel, gates, tokens, portfolio
    main.css         # core site styles + gates
    panel.css        # panel dock + sound controls
    tokens.css       # design token definitions
    portfolio.css    # portfolio carousel styling
  images/portfolio/  # portfolio covers, slides, videos (dev + prod)
  modules/
    core/            # constants (MODES, narrative sequence), state management
    physics/         # Ball.js, collision.js, engine.js, spawn.js, wall-state.js, text-colliders.js
    rendering/       # renderer.js, loop.js, cursor.js, effects.js, theme.js
  modes/           # 16 mode files:
                    #   ball-pit, pit-throws, flies, weightless, water, vortex,
                    #   ping-pong, magnetic, bubbles, kaleidoscope, critters,
                    #   neural, parallax-linear, 3d-sphere, 3d-cube, starfield-3d
                    #   + mode-controller.js
    ui/              # 27 files:
                     #   panel-dock, panel-html, control-registry, controls, keyboard,
                     #   cv-gate, portfolio-gate, contact-gate, gate-overlay,
                     #   legend-colors, legend-interactive,
                     #   brand-logo-*, social-icons, time-display,
                     #   sound-toggle, theme-toggle, scene-*, link-*, apply-text
    portfolio/       # app.js, portfolio-config.js, cylinder-background.js, panel/
    input/           # pointer.js (mouse/touch), overscroll-lock.js
    audio/           # sound-engine.js, sound-control-registry.js
    utils/           # accessibility, logger, performance, storage, runtime-config, 
                     #   text-loader, font-loader, ball-sizing, config-sync, tokens
    visual/          # colors.js, dark-mode-v2.js, mouse-trail.js,
                     #   chrome-harmony.js, entrance-animation.js,
                     #   noise-system.js, wall-frame.js
  config/            # default-config.json (420 lines), text.json, 
                     #   portfolio-config.json, portfolio-data.json
  portfolio.html     # gated portfolio page
public/              # generated bundle + css/images (never edit directly)
docs/
  development/       # DEV-WORKFLOW.md, CONFIG-SYNC-*.md
  reference/         # MODES.md, CONFIGURATION.md, INTEGRATION.md, PORTFOLIO.md
```

---

## Integration (embed)
```html
<link rel="stylesheet" href="css/bouncy-balls.css">
<div id="bravia-balls">
  <canvas id="c" aria-label="Interactive bouncy balls physics simulation"></canvas>
</div>
<script src="js/bouncy-balls-embed.js"></script>
```
See `docs/reference/INTEGRATION.md` for host-page notes and `docs/reference/CONFIGURATION.md` for tunables.

## Docs to know
- Dev workflow: `docs/development/DEV-WORKFLOW.md`
- Config + tunables: `docs/reference/CONFIGURATION.md`
- Integration snippet: `docs/reference/INTEGRATION.md`
- Portfolio specifics: `docs/reference/PORTFOLIO.md`
- Mode list: `docs/reference/MODES.md`

### Portfolio experience (gated)
- Entry: `source/portfolio.html` (same chrome as index, gated via `portfolio-gate.js`).
- Runtime: `modules/portfolio/app.js` loads `config/portfolio-config.json` + `config/portfolio-data.json`, and assets under `images/portfolio/`.
- To edit portfolio content: update `config/portfolio-data.json` and drop new media into `images/portfolio/` (keep paths matching the JSON).
- Build output: `public/js/portfolio-bundle.js`, `public/css/portfolio.css`, `public/config/portfolio-config.json`, `public/config/portfolio-data.json`.

---

## Performance + compatibility
- 60fps target with 200–300 entities depending on mode.
- Tested on Chrome/Edge 120+, Firefox 121+, Safari 17+, iOS 15+, Android 12+.
- Prefers-reduced-motion respected; dynamic canvas height to cut pixel cost per mode.

---

## Contributing
1. `npm run dev` (8001) or `npm run preview` (8000).
2. Edit `source/` only; never hand-edit `public/`.
3. Keep O(1) hot paths, preserve 60fps, and scope styles to `#bravia-balls`.
4. Follow conventional commits (`feat:`, `fix:`, `perf:`, etc.).

---

MIT License — see `LICENSE`.
