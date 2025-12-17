# Alexander Beck Studio Website

Minimal, high-speed kinetic canvas built with vanilla JS + Canvas 2D. Eleven simulations, a floating right-aligned panel, and a production build that keeps 60fps while staying privacy-first.

---

## What this site does
- Kinetic homepage: particles, walls, and light fields living inside `#bravia-balls` so the rest of the page stays untouched.
- Eleven simulations (core + experimental): Ball Pit, Flies, Zero-G, Water, Vortex, Ping Pong, Magnetic, Bubbles, Kaleidoscope, Critters, Ball Pit (Throws).
- Visual finesse: rubber wall wobble, browser-colored wall/frame, layered film grain, adaptive dark/light palettes, brand-logo micro-interactions, and an optional motion-respect path for `prefers-reduced-motion`.
- Interaction model: cursor can repel, attract, or reshape; touch maps to the same force fields; keyboard (`1–9`, `/`, `R`) for quick mode/panel/reset.
- Control surface: single master panel docked right with collapsible sections, always summonable via `/`, floating with 5vh inset.
- Privacy + perf: no external calls, localStorage only for panel chrome; spatial hashing + fixed timestep keep loops O(1) per entity.

---

## Quick start
```bash
npm install
npm run startup    # choose dev/preview/watch from menu
# or
npm run dev        # port 8001, instant reload
npm run preview    # port 8000, production bundle
npm run build      # produce public/js/bouncy-balls-embed.js
```

Open `http://localhost:8001` for dev or `http://localhost:8000` for the production bundle. Never edit `public/` by hand.

---

## Controls
| Key | Action |
| --- | --- |
| `1` | Ball Pit |
| `2` | Flies |
| `3` | Zero-G |
| `4` | Water |
| `5` | Vortex |
| `6` | Ping Pong |
| `7` | Magnetic |
| `8` | Bubbles |
| `9` | Kaleidoscope |
| `/` | Toggle panel |
| `R` | Reset simulation |

Critters + Ball Pit (Throws) are selectable from the panel.

---

## Feature roundup (at-a-glance)
- **Core features:** physics engine (fixed 120Hz), spatial hash collisions, mode controller, Canvas renderer, adaptive dark/light theme, palette-driven color system, master control panel, keyboard/touch input, runtime config loader, audio hooks (collision/ambient ready), password gates for CV/Portfolio/Contact, social/time widgets, brand micro-interactions.
- **Bonus behaviors:** wall wobble deformation, browser-colored wall/frame sync, layered film grain, cursor morph (ball-sized), noise overlays, mode-aware canvas height (150vh for Ball Pit, 100svh elsewhere), randomized startup mode, mobile-friendly footer link wrapping.
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
- **Constant-time hot paths**: spatial grid for collisions, minimal allocations per frame, dt capped for Safari/Chrome parity.
- **Scoped styles**: everything contained in `#bravia-balls`; CSS variables drive palette, wall, and grain; panel styles are confined to the dock.
- **Config-injected**: runtime config pulled from `config/default-config.json` (or inlined); localStorage optional and off for physics state by default.
- **Accessibility + privacy**: canvas labeled, keyboardable; no network calls beyond initial config fetch; respects reduced motion.
- **Workflow**: `npm run startup` menu for dev/watch/preview; `npm start` serves the built bundle on port 8000.

---

## Architecture snapshot
```
source/
  main.js            # bootstrap: config → layout vars → renderer → modes → UI
  css/               # base, panel, gates, sound panel
  modules/
    core/            # constants, global state
    physics/         # Ball class, collision, engine, spawn, wall state, text colliders
    rendering/       # renderer, loop, cursor, effects, theme
    modes/           # ball-pit, pit-throws, flies, weightless, water, vortex, ping-pong, magnetic, bubbles, kaleidoscope, critters, controller
    ui/              # panel dock, control registry, gates, toggles, brand interactions, time/social
    input/           # pointer tracking
    audio/           # sound engine + control registry
    utils/           # accessibility, logger, performance, storage
    visual/          # colors, dark-mode-v2 (active), mouse trail
public/              # generated bundle + css/images (do not edit)
docs/                # core, development, reference, operations
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
