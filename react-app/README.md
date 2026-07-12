# React application

This folder contains the React application for the Alexander Beck Studio Website. It is the only supported surface for development and deployment.

## Structure
- `app/` — multi-entry Vite/React application
- `app/src/legacy/` — active Canvas 2D and imperative route runtimes
- `app/public/` — CSS, config, images, fonts, video (served at root)

## Run

From **repo root** (recommended):

```bash
npm run install:all   # first-time
npm run dev           # React on 8012
npm run dev:react     # Same as npm run dev
npm run build         # Production build → app/dist/
npm run build:dev     # Unminified + sourcemaps
npm run preview       # Serve build (port 8013)
```

From `react-app/app`:

```bash
npm install
npm run dev           # Vite on port 8012
npm run build
npm run build:dev
```

## Routes
- `http://localhost:8012/`
- `http://localhost:8012/portfolio.html`
- `http://localhost:8012/about.html`
- `http://localhost:8012/contact.html`

## Architecture
- Every entry mounts `SiteApp`, which renders `StudioShell` and a route descriptor.
- React owns the shell and route lifecycle; the active imperative runtime owns Canvas simulations and the Portfolio deck/drawer.
- The Portfolio gate is client-side presentation, not secure authentication.

## Config & assets
- Config: `app/public/config/` (default-config.json, portfolio-config.json, etc.)
