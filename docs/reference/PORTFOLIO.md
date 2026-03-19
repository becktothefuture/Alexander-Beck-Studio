# Portfolio Runtime

The portfolio route is now a dedicated **project pit** rather than a slider. It reuses the shared wall frame, physics loop, and modal chrome, but swaps in a portfolio-only mode with oversized draggable project bodies and a fullscreen in-place project open transition.

## Entry Points

- `react-app/app/src/routes/portfolio/PortfolioRoute.jsx`
- `react-app/app/src/templates/portfolio-body.html`
- `react-app/app/src/legacy/modules/portfolio/app.js`

## Runtime Modules

- `react-app/app/src/legacy/modules/portfolio/app.js` bootstraps the route, loads project data, mounts the fullscreen project view, and handles drag/open behavior.
- `react-app/app/src/legacy/modules/portfolio/pit-mode.js` creates one body per project and renders the alternating circle/block skins with fitted titles.
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
- `runtime.bodies`: circle/block size and block width/radius
- `runtime.labeling`: title fit bounds and block rotation range
- `runtime.motion`: drag/open timing and neighbor impulse
- `runtime.behavior`: passive mouse reaction toggle and reduced-motion timing
- `runtime.pitChrome`: canvas disc rim (highlight/shadow peaks, rim scale vs ball radius, arc span) — independent of Studio “Light Edge” on DOM chrome; dev panel section **Project pit rim**

## Archived Slider

The previous slider implementation is archived and no longer used in the live route:

- `react-app/app/src/legacy/modules/portfolio/archive/slider-v1/app.js`
- `react-app/app/public/css/archive/portfolio-slider-v1.css`
- `docs/archive/portfolio-slider-v1.md`
