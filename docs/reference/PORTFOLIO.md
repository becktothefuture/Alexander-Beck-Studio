# Portfolio Runtime

**Scope:** The gated portfolio experience that mirrors the site chrome but runs its own carousel + detail view.

**Paths:** Use `react-app/app/public/config/`, `react-app/app/public/images/portfolio/`, and `react-app/app/src/legacy/modules/portfolio/`.

## Entry points
- `react-app/app/portfolio.html` – shared page shell that sets the first-paint wall/browser tokens before the React entry mounts.
- `react-app/app/src/entries/portfolio.jsx` – page entry that mounts the shared frame and boots the legacy portfolio runtime.
- `react-app/app/src/legacy/modules/ui/portfolio-gate.js` – gate overlay on the index page that prefetches the portfolio bundle + a lead slide.

## Runtime modules
- `react-app/app/src/legacy/modules/portfolio/app.js` – bootstraps the carousel, resolves assets via `window.PORTFOLIO_BASE`, and mounts the detail overlay.
- `react-app/app/src/legacy/modules/portfolio/portfolio-config.js` – normalizes tunables and applies CSS vars (card sizing, physics, motion) distinct from the index wall config.
- `react-app/app/src/legacy/modules/portfolio/panel/` – dev/build tuning panel (mirrors index dock behavior).

## Data + assets
- `react-app/app/public/config/portfolio-config.json` – carousel/runtime tuning.
- `react-app/app/public/config/contents-portfolio.json` – project list (cover, gallery, content blocks, links, takeaways) consumed by `PortfolioApp`.
- `react-app/app/public/images/portfolio/` – covers, pages, and detail media.

### Editing the content
- Update `react-app/app/public/config/contents-portfolio.json` for copy/links/takeaways.
- Add or replace media in `react-app/app/public/images/portfolio/` and point paths in the JSON to the matching files.

## Build outputs
- HTML + JS + assets: `react-app/app/dist/` via Vite multi-entry build.
