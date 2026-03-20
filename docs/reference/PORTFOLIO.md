# Portfolio Runtime

The portfolio route is now a dedicated **project pit** rather than a slider. It reuses the shared wall frame, physics loop, and modal chrome, but swaps in a portfolio-only mode with oversized draggable project bodies and a fullscreen in-place project open transition.

## Entry Points

- `react-app/app/src/routes/portfolio/PortfolioRoute.jsx`
- `react-app/app/src/templates/portfolio-body.html`
- `react-app/app/src/legacy/modules/portfolio/app.js`

## Layer stacking (drawer above chrome)

**Authoritative doc:** **`docs/reference/LAYER-STACKING.md`**. Mount `#portfolioProjectView` into **`#portfolio-sheet-host`**. In `StudioShell.jsx`, **`#portfolio-sheet-host` is inside `#abs-scene` and comes after `.fade-content`**, with **`z-index` 220 / 260** when open, so the drawer and backdrop sit **above** the route header row and footer. **Do not** mount the host only inside `#bravia-balls` (cannot exceed `.fade-content`’s stacking).

## Project drawer scroll

Hero hint copy is **`(scroll please)`** (see `createProjectView()` in `app.js`). The drawer body scrolls with **native overflow** on **`.portfolio-project-view__scroll`** (no Lenis).

## Runtime Modules

- `react-app/app/src/legacy/modules/portfolio/app.js` bootstraps the route, loads project data, mounts the fullscreen project view, and handles drag/open behavior.
- `react-app/app/src/legacy/modules/portfolio/pit-mode.js` creates one body per project: alternating **circle** / **rounded rectangle**, distinct rect aspect presets, first project = **theme accent circle** (light fill in dark mode, dark fill in light). Convex hulls match `portfolio-body-geometry.js`; ball–ball contact uses SAT in `portfolio-pit-narrow-phase.js` (see `CONFIGURATION.md`). **Body diameter** scales with **√(inner pit width×height)** (same wall inset as physics), not `min(canvas)`, so silhouettes keep similar **relative** size on phone and desktop. Pit bodies are **solid fill** on canvas (hero imagery is for the open drawer only).
- `react-app/app/src/legacy/modules/portfolio/portfolio-config.js` normalizes the authored portfolio config and applies portfolio CSS vars.
- `react-app/app/src/legacy/modules/portfolio/panel/` exposes the dev panel for body sizing, labeling, and motion.

## Data And Assets

- `react-app/app/public/config/contents-portfolio.json` remains the source of truth for projects, detail copy, links, and media.
- `react-app/app/public/images/portfolio/` holds the hero/detail assets resolved by the portfolio runtime.

## Config Model

Authored config lives in `react-app/app/public/config/design-system.json -> portfolio` and flattens to `react-app/app/public/config/portfolio-config.json`.

The active portfolio runtime groups are:

- `cssVars`: page/header/hero presentation values
- `runtime.layout`: spawn spacing and header offsets
- `runtime.bodies`: min/max diameter fractions vs √(inner pit area), block geometry
- `runtime.labeling`: title fit bounds and block rotation range
- `runtime.motion`: drag/open timing and neighbor impulse
- `runtime.behavior`: passive mouse reaction toggle and reduced-motion timing
## Archived Slider

The previous slider implementation is archived and no longer used in the live route:

- `react-app/app/src/legacy/modules/portfolio/archive/slider-v1/app.js`
- `react-app/app/public/css/archive/portfolio-slider-v1.css`
- `docs/archive/portfolio-slider-v1.md`
