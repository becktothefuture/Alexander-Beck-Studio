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
| About Me | `routes/about/AboutRoute.jsx` + shared About narrative components | React-owned Three.js point world |
| Contact | `routes/contact/ContactRoute.jsx` | none |

`src/lib/routes.js` owns canonical paths, aliases, Button Bar labels, and ARIA labels. `SiteApp.jsx` owns route descriptors and document titles.

## Shared shell

`StudioShell.jsx` owns the physical frame, studio window, Home-only footer surface, Button Bar, and overlay mount points. The Button Bar is the only primary route navigation. A route top bar may provide a back or local utility action but must not duplicate primary navigation.

The shell is persistent across SPA transitions. Route content inside the window may animate; the frame and Button Bar must remain materially continuous.

## Active imperative runtime

`src/legacy/` contains active Canvas 2D and route code. React owns mounting and lifecycle; imperative modules own simulation state, rendering, pointer mapping, and the current Portfolio deck/drawer runtime. Lifecycle bridges must be generation-safe so a cancelled bootstrap cannot tear down a newer route.

See `CANVAS-RUNTIME.md` and `TRANSITION-ORCHESTRATION.md`.

## Data and configuration

- `contents-home.json`: Home, footer/social, Contact, and Portfolio-gate editorial content
- `contents-about.json`: About copy, Section order, WU extents, Camera keys, World Shapes/modifiers, and interactions
- `contents-portfolio.json`: project cards, detail copy, and media
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
