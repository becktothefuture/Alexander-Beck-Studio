# Portfolio Runtime

**Scope:** The gated portfolio experience that mirrors the site chrome but runs its own carousel + detail view.

## Entry points
- `source/portfolio.html` – shares normalize/main/panel CSS plus `css/portfolio.css`, sets `window.PORTFOLIO_BASE`, and loads `modules/portfolio/app.js`.
- `source/modules/ui/portfolio-gate.js` – gate overlay on the index page that prefetches the portfolio bundle + a lead slide.

## Runtime modules
- `source/modules/portfolio/app.js` – bootstraps the carousel, resolves assets via `window.PORTFOLIO_BASE`, and mounts the detail overlay.
- `source/modules/portfolio/portfolio-config.js` – normalizes tunables and applies CSS vars (card sizing, physics, motion) distinct from the index wall config.
- `source/modules/portfolio/panel/` – dev/build tuning panel (mirrors index dock behavior).

## Data + assets
- `source/config/portfolio-config.json` – carousel/runtime tuning (copied/minified to `public/config/portfolio-config.json` and `public/js/portfolio-config.json`).
- `source/config/portfolio-data.json` – project list (cover, gallery, content blocks, links, takeaways) consumed by `PortfolioApp`.
- `source/images/portfolio/` – covers, pages, and detail media (copied to `public/images/portfolio/`).

### Editing the content
- Update `source/config/portfolio-data.json` for copy/links/takeaways.
- Add or replace media in `source/images/portfolio/` and point paths in the JSON to the matching files.

## Build outputs
- JS: `public/js/portfolio-bundle.js` (Rollup)
- CSS: `public/css/portfolio.css` (copied/minified)
- Config/Data: `public/config/portfolio-config.json`, `public/config/portfolio-data.json`

## Dev vs prod paths
- Dev: `portfolio.html` pulls `modules/portfolio/app.js` directly.
- Prod: `portfolio.html` gets rewritten to load `js/portfolio-bundle.js` with cache-busted query params.
