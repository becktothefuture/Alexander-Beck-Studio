# Alexander Beck Studio Website

Minimal, high-speed kinetic canvas built with vanilla JS + Canvas 2D. A **curated, panel-free production experience** (narrative mode cycling) plus a **full dev control surface** on port 8001 — all tuned for 60fps and privacy-first defaults.

---

## What this site does
- Kinetic homepage: particles, walls, and light fields living inside `#bravia-balls` so the rest of the page stays untouched.
- Multiple simulations (core + experimental), documented in `docs/reference/MODES.md` (Ball Pit, Flies, Zero‑G, Water, Vortex, Ping Pong, Magnetic, Bubbles, Kaleidoscope variants, Critters, Orbit 3D variants, Lattice, Neural, Parallax variants, Ball Pit (Throws), and more).
- Visual finesse: rubber wall wobble, browser-colored wall/frame, layered film grain, adaptive dark/light palettes, brand-logo micro-interactions, and an optional motion-respect path for `prefers-reduced-motion`.
- Interaction model: cursor can repel/attract/reshape; touch maps to the same forces; keyboard for **narrative cycling + reset** (see below).
- Dev control surface: a single master panel docked right with collapsible sections (port **8001** dev only).
- Privacy + perf: no external calls; localStorage only for settings (no user text); spatial hashing + fixed timestep keep loops O(1) per entity.
- Mobile fidelity: responsive scaling + **canvas-level rounded-corner clipping** (prevents “corner bleed” in non-wall modes like Kaleidoscope on iOS).

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

## Feature roundup (at-a-glance)
- **Core features:** physics engine (fixed 120Hz), spatial hash collisions, mode controller, Canvas renderer, adaptive dark/light theme, palette-driven color system, master control panel, keyboard/touch input, runtime config loader, audio hooks (collision/ambient ready), password gates for CV/Portfolio/Contact, social/time widgets, brand micro-interactions.
- **Bonus behaviors:** wall wobble deformation, browser-colored wall/frame sync, layered film grain, cursor morph (ball-sized), noise overlays, mode-aware canvas height (150vh for Ball Pit, 100svh elsewhere), randomized startup mode, mobile-friendly footer link wrapping, iOS-safe rounded-corner canvas clipping.
- **Links & gates:** CV gate, Portfolio gate, Contact gate overlays; social icons normalized at runtime; sound/theme toggles in corners; panel lives on the right and can be minimized and reopened with `/`.
- **Visual finesse features:** rubber wall wobble, browser-tinted frame, grain stack (`.noise`, `.noise-2`, `.noise-3`), brand logo yield-to-crowd, cursor-synchronized halo.
- **Simulations:** 
  - Gravity: Ball Pit, Ball Pit (Throws)
  - Swarm/flow: Flies, Vortex, Magnetic, Critters
  - Elastic: Zero-G, Ping Pong
  - Fluid-ish: Water, Bubbles
  - Optical: Kaleidoscope

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
  css/               # base, panel, gates, sound panel
    portfolio.css    # portfolio carousel styling (shares chrome with index)
  images/portfolio/  # portfolio covers, slides, and videos (shared by both dev/prod)
  modules/
    core/            # constants, global state
    physics/         # Ball class, collision, engine, spawn, wall state, text colliders
    rendering/       # renderer, loop, cursor, effects, theme
    modes/           # ball-pit, pit-throws, flies, weightless, water, vortex, ping-pong, magnetic, bubbles, kaleidoscope, critters, controller
    ui/              # panel dock, control registry, gates, toggles, brand interactions, time/social
    portfolio/       # portfolio carousel entry + panel (mirrors the index chrome)
    input/           # pointer tracking
    audio/           # sound engine + control registry
    utils/           # accessibility, logger, performance, storage
    visual/          # colors, dark-mode-v2 (active), mouse trail
  config/            # default-config.json, text.json, portfolio-config.json, portfolio-data.json
  portfolio.html     # gated portfolio page that consumes modules/portfolio/app.js
public/              # generated bundle + css/images (do not edit)
docs/                # lean docs: dev workflow + reference (config, integration, modes, portfolio)
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
