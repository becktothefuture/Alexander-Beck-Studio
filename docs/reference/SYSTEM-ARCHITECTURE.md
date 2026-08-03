# System architecture

## Production pipeline

Every production HTML entry loads a small entry module from `src/entries/`. That module mounts one `SiteApp`; `SiteApp` resolves the route and renders one `StudioShell` plus the route-owned view/runtime.

```text
HTML entry
  → src/entries/*.jsx
  → SiteApp
  → StudioShell
     ├── physical window and frame
     ├── route view
     ├── Home-only footer
     ├── persistent ShellButtonBar
     └── overlay hosts
  → optional route runtime bootstrap
```

There is no second static page/template pipeline.

## Route families

| Route | React owner | Imperative/runtime owner |
|---|---|---|
| Home | `routes/home/HomeRoute.jsx` | `legacy/main.js` + simulation modules |
| Portfolio | `routes/portfolio/PortfolioRoute.jsx` | `legacy/modules/portfolio/app.js`, drawer, handoff |
| About Me | `routes/about/AboutRoute.jsx` + `routes/about/AboutComingSoon.jsx` | none in production; React-owned Three.js point world in development only |
| Contact | `routes/contact/ContactRoute.jsx` | none |
| Playground | `routes/playground/PlaygroundRoute.jsx` + `PlaygroundExperience.jsx` | React lifecycle with imperative camera and Canvas 2D dot renderer under `routes/playground/spatial/` |

`src/lib/route-manifest.js` is the source-readable owner for route IDs, canonical paths, aliases, shared-shell versus standalone applicability, document titles, and Button Bar metadata. `src/lib/routes.js` provides normalized lookup and URL helpers from that manifest. `SiteApp.jsx` keeps view/runtime imports explicit so bundler boundaries remain readable. Unknown same-origin paths return no internal route match and fall through to normal browser navigation and the host's 404 handling.

### About environment boundary

`src/routes/about/AboutRoute.jsx` branches on the development/certification boundary. Production renders `AboutComingSoon` and does not mount the spatial narrative. Local development `/about.html` lazy-loads `routes/about-narrative-lab/AboutNarrativeLabExperience.jsx`, reads the accepted copy directly from the canonical About document, and opens the editor by default. `?edit=0` keeps a playback-only audit surface. A future public narrative launch is separate product work, not part of the current architecture contract.

## Shared shell

`StudioShell.jsx` owns the physical frame, studio window, Home-only footer surface, Button Bar, and overlay mount points. The Button Bar is the only primary route navigation. A route top bar may provide a back or local utility action but must not duplicate primary navigation.

The shell is persistent across SPA transitions. Route content inside the window may animate; the frame and Button Bar must remain materially continuous.

## Active imperative runtime

`src/legacy/` contains active Canvas 2D and route code. React owns mounting and lifecycle; imperative modules own simulation state, rendering, pointer mapping, and the current Portfolio deck/drawer runtime. Lifecycle bridges must be generation-safe so a cancelled bootstrap cannot tear down a newer route.

See `CANVAS-RUNTIME.md` and `TRANSITION-ORCHESTRATION.md`.

## Data and configuration

- `contents-home.json`: Home, footer/social, Contact, and Portfolio-gate editorial content
- `contents-about.json`: canonical content and choreography for the development-only About narrative and editor
- `contents-portfolio.json`: project cards, detail copy, and media
- `contents-playground.json`: Playground catalogue labels, local media references, stable placement order, and grid spans
- `design-system.json`: only authored design configuration
- generated config JSON: runtime compatibility outputs created by flattening

Browser storage and `window.__*` state are runtime helpers only.

## Build

The root `npm run build` is canonical:

1. check production HTML entry shells against `index.html`;
2. flatten the authored design config;
3. run the multi-entry Vite build.
4. verify that the development-only About editor and Save client did not enter production assets.

Direct app builds can bypass configuration flattening and are not release-equivalent.

## Verification layers

- Source and configuration checks: the validation, lint, config-parity, and production-build stages in root `npm run check:site`.
- Node tests: built-in `node:test` suites, including the About narrative, geometry, and route/simulation transaction checks run by `npm run check:site`.
- Browser checks: focused Playwright audits and `npm run certify:screens`, run against a current development server or fresh production preview as required by each script.

## Playground boundary

Playground is a primary shared-shell route, not the standalone Loader Playground lab. Its semantic content, active media ownership, and dialog live under `src/routes/playground/media/`. Its placement, unbounded logical camera, toroidal copy coverage, and dot renderer live under `src/routes/playground/spatial/`. React owns loading, selection, accessibility, and disposal; high-frequency camera and Canvas work stays outside React state. See [`PLAYGROUND.md`](PLAYGROUND.md).
