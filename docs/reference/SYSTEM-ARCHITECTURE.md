# System architecture

## Production pipeline

Every production HTML entry loads a small module from `src/entries/`. That module mounts one `SiteApp`; `SiteApp` resolves the route and renders one persistent `StudioShell` plus the route-owned view/runtime.

```text
HTML entry
  -> src/entries/*.jsx
  -> SiteApp
  -> StudioShell
     |-- physical window and frame
     |-- route view
     |-- Home-only footer
     |-- persistent ShellButtonBar and Utility Rail
     `-- overlay hosts
  -> optional route runtime bootstrap
```

There is no second static page/template pipeline.

## Primary routes

| Route | React owner | Runtime owner |
| --- | --- | --- |
| Home | `routes/home/HomeRoute.jsx` | `legacy/main.js` and simulation modules |
| Work | `routes/portfolio/PortfolioRoute.jsx`, `routes/playground/PlaygroundExperience.jsx` | React lifecycle plus the spatial camera/dot renderer; legacy Portfolio gate/drawer/handoff for case studies |
| About | `routes/about/AboutRoute.jsx` | React-owned Three.js point world; editor modules load only in development |
| Contact | `routes/contact/ContactRoute.jsx` | React-owned ripple renderer |

`src/lib/route-manifest.js` owns route IDs, canonical paths, aliases, shell applicability, document titles, and Button Bar metadata. The Button Bar has four routes in this order: Home, Work, About, Contact. `src/lib/routes.js` supplies normalized lookup and URL helpers. `SiteApp.jsx` keeps view/runtime imports explicit so bundler boundaries remain readable.

Work is canonical at `/portfolio.html`. `/portfolio`, `/playground.html`, and `/playground` resolve to it. The latter paths are compatibility aliases, not a separate public Lab. Standalone `/lab/*` development and simulation routes remain outside primary navigation.

`PortfolioRoute.jsx` renders the complete spatial Work experience only in development and the safe public development mirror. Its development runtime prewarms the unified catalogue and design configuration before the shell releases the route entrance. Production is held at `PortfolioComingSoon` through a build-time branch; no URL, access grant, or storage value lifts that hold, and production prewarming is a no-op.

Unknown same-origin paths return no internal match and fall through to normal browser navigation and host 404 handling.

### About environment boundary

`src/routes/about/AboutRoute.jsx` lazy-loads `routes/about-narrative-lab/AboutNarrativeLabExperience.jsx` for production and development playback. Both read accepted copy and choreography from the canonical About document. Local development stays in clean playback until `/` opens the whole-scene parameter panel; legacy `edit` query values are ignored. Production cannot load the parameter panel or Save client and waits for the first prepared point-world frame before releasing the direct-load overlay.

## Shared shell

`StudioShell.jsx` owns the physical frame, studio window, Home-only footer, Button Bar, Utility Rail, route loader, gate host, and project-sheet host. The Button Bar is the only primary route navigation. A route top bar may provide a back or local utility action but must not duplicate primary navigation.

The shell persists across SPA transitions. Route content inside the window may animate; the physical frame, Button Bar, Utility Rail, and outside wall remain materially continuous.

Work overlays are local presentation state, not route state:

- `PortfolioGateRoute` presents access friction while the Work world stays mounted.
- `WorkSnippetStage` expands one snippet and makes the background world inert.
- `WorkCaseStudyPresenter` coordinates the existing project drawer and geometry handoff.

These overlays do not publish shell route phases. The Button Bar remains above Work sheets and stages according to `LAYER-STACKING.md`.

## Active imperative runtime

`src/legacy/` contains active Canvas 2D and project-presentation code. Its directory name is historical. React owns mounting and lifecycle; imperative modules own simulation state, rendering, pointer mapping, and the established case-study drawer/handoff. Lifecycle bridges must be generation-safe so a cancelled bootstrap cannot tear down a newer route.

The Work spatial engine remains under `src/routes/playground/` for compatibility. React owns semantic content and presentation state; its camera and Canvas renderer keep high-frequency work outside React state. See `CANVAS-RUNTIME.md`, `PORTFOLIO.md`, `PLAYGROUND.md`, and `TRANSITION-ORCHESTRATION.md`.

## Data and configuration

- `contents-home.json`: Home, footer/social, Contact, and Work-gate editorial content.
- `contents-portfolio.json`: the only Work content source, containing full case studies and compact snippets.
- `contents-about.json`: canonical About content and choreography.
- `design-system.json`: the only authored design configuration.
- generated config JSON: compatibility outputs created by flattening; never hand-edited.

The historical `portfolio` configuration controls the retained drawer/handoff presentation. The historical `playground` configuration controls the Work field's placement, item sizing, dots, and camera response. Browser storage and `window.__*` state are runtime helpers or diagnostics only.

## Build

The root `npm run build` is canonical:

1. check production HTML entry shells against `index.html`;
2. flatten the authored design configuration;
3. run the multi-entry Vite build;
4. verify that development-only editors and Save clients did not enter production assets.

Direct app builds can bypass configuration flattening and are not release-equivalent. The root build also checks the compiled Work publication boundary: it must include the construction screen and must not emit a Work canvas or presenter chunk while the hold is active.

## Verification layers

- Source/configuration: `npm run check:site` plus the focused Work content and contract checks.
- Node: built-in `node:test` suites, including Work catalogue, placement, camera, depth-field, About, and route/simulation transactions.
- Browser: `audit:work-canvas`, transition/theme/frame audits, and `certify:screens` against the required development or production surface.

The canonical Work checks are `check:work-canvas` and `audit:work-canvas`. The old `check:playground` and `audit:playground` names are compatibility aliases only.
