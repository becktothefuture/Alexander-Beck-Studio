# Portfolio Runtime

The portfolio route is a wall-contained **vertical project rail**. It reuses the shared wall frame and route chrome, but the visible project UI is DOM-driven: native vertical scrolling, center snap, project cards with media thumbnails, and a full wall-contained project detail surface.

## Entry Points

- `react-app/app/src/routes/portfolio/PortfolioRoute.jsx`
- `react-app/app/src/templates/portfolio-body.html`
- `react-app/app/src/legacy/modules/portfolio/app.js`

## Layer stacking (drawer above chrome)

**Authoritative doc:** **`docs/reference/LAYER-STACKING.md`**. Mount `#portfolioProjectView` into **`#portfolio-sheet-host`**. In `StudioShell.jsx`, **`#portfolio-sheet-host` is inside `#abs-scene` and comes after `.fade-content`**, with **`z-index` 220 / 260** when open, so the drawer and backdrop sit **above** the route header row and footer. **Do not** mount the host only inside `#simulations` (cannot exceed `.fade-content`’s stacking).

## Project drawer scroll

Hero hint copy is **`(scroll please)`** (see `createProjectView()` in `app.js`). The drawer body scrolls with **native overflow** on **`.portfolio-project-view__scroll`** (no Lenis).

## Runtime Modules

- `react-app/app/src/legacy/modules/portfolio/app.js` bootstraps the route, loads project data, mounts the full project view, renders the scroll rail, controls media autoplay/fallbacks, and handles card open/close behavior.
- `react-app/app/src/legacy/modules/portfolio/pit-mode.js` remains for archived/compatibility physics helpers. The visible portfolio route should not expose project balls.
- `react-app/app/src/legacy/modules/portfolio/portfolio-config.js` normalizes the authored portfolio config and applies portfolio CSS vars.
- `react-app/app/src/legacy/modules/portfolio/panel/` exposes the dev panel for body sizing, labeling, and motion.

## Data And Assets

- `react-app/app/public/config/contents-portfolio.json` remains the source of truth for projects, detail copy, links, tags, and media.
- `react-app/app/public/images/portfolio/` holds the hero/detail assets resolved by the portfolio runtime.

Card media selection uses `thumbnailVideo` / `video` only when explicitly present. Otherwise the card falls back to the project `image`. Detail content videos inside `contentBlocks` are not reused as card thumbnails because they may be generic or too dark for the rail preview.

## Config Model

Authored config lives in `react-app/app/public/config/design-system.json -> portfolio` and flattens to `react-app/app/public/config/portfolio-config.json`.

The active portfolio runtime groups are:

- `cssVars`: page/header/hero presentation values
- `runtime.layout`: spawn spacing and header offsets
- `runtime.bodies`: min/max diameter fractions vs √(inner pit area), block geometry
- `runtime.labeling`: title fit bounds and block rotation range
- `runtime.motion`: drag/open timing and neighbor impulse
- `runtime.behavior`: passive mouse reaction toggle and reduced-motion timing

## Scroll Rail Contract

- Desktop should show roughly two full project cards plus a partial third.
- Mobile should show one focused card plus a visible next-card peek.
- Cards use explicit per-project material colors set in `portfolio/app.js` and CSS variables in `portfolio.css`; do not rely only on the global palette for card contrast.
- Native scroll snap is required. Cards should snap to the center region of the wall.
- Open project views mount in `#portfolio-sheet-host`, cover route chrome, and must remove the host's `aria-hidden` while open.

## Archived Slider

The previous slider implementation is archived and no longer used in the live route:

- `react-app/app/src/legacy/modules/portfolio/archive/slider-v1/app.js`
- `react-app/app/public/css/archive/portfolio-slider-v1.css`
- `docs/archive/portfolio-slider-v1.md`
