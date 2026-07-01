# System Architecture

This site is a React/Vite shell wrapped around an intentionally preserved Canvas 2D runtime. The frontend experience is the product, so architecture work starts from parity: the same routes, content, boot overlay, transitions, canvas feel, modal behavior, portfolio drawer stacking, generated config semantics, and GitHub Pages deployment.

## Responsibility Split

### React and Vite shell

The current supported app pipeline is `react-app/app/`.

React owns:

- public page structure for the Vite HTML entries;
- route resolution and gated route redirects;
- shared route slots and shell chrome;
- top bars, footer, modal hosts, and the portfolio sheet host;
- route transition orchestration through `useShellRouteTransition`;
- page composition for home, portfolio, CV, styleguide, simulations, and lab routes.

Vite owns:

- local dev serving on port `8012`;
- production bundling into `react-app/app/dist/`;
- multi-entry HTML builds for the public routes;
- virtual JSON content modules for selected route copy;
- local dev/admin middleware for configuration and simulation tooling.

### Canvas 2D runtime

`react-app/app/src/legacy/` owns the imperative simulation runtime. The `legacy` name describes history and integration style, not a broken or disposable subsystem.

The Canvas runtime owns:

- simulation state;
- mode lifecycle;
- physics and collision behavior;
- renderer setup, canvas sizing, and DPR handling;
- pointer-driven material behavior;
- render loop timing and adaptive throttling;
- portfolio runtime internals where still used;
- runtime DOM enhancements that are coupled to the simulation engine.

Do not rewrite this runtime in React DOM, SVG, WebGL, Three.js, or another animation library as a modernization exercise. The boundary can become clearer over time, but the rendered and physical feel must stay intact.

### Config pipeline

The authored design/config source is:

- `react-app/app/public/config/design-system.json`

Generated compatibility/runtime outputs are:

- `react-app/app/public/config/default-config.json`
- `react-app/app/public/config/shell-config.json`
- `react-app/app/public/config/portfolio-config.json`
- `react-app/app/public/config/cv-config.json`

`scripts/lib/flatten-design-config.mjs` derives the generated files from `design-system.json`. `npm run check:design-config` verifies the generated files without writing. The root command `npm run build` is the canonical production build because it runs `flatten:design-config` before the Vite app build. Running `npm run build --prefix react-app/app` is a lower-level Vite build and can bypass config flattening. See `GENERATED-CONFIG.md` for the generated-file contract.

## Boot Flow

The public HTML entries are Vite inputs under `react-app/app/`. The production inputs include the main shell pages (`index.html`, `portfolio.html`, `cv.html`, `styleguide.html`, `palette-lab.html`), `simulations.html`, `explain-it-like-im.html`, and the `/lab/*.html` simulation entries.

The boot-overlay shell entries (`index.html`, `portfolio.html`, `cv.html`, `styleguide.html`, and `palette-lab.html`) use the full first-paint boot contract:

1. The HTML document starts with `data-abs-boot-state="booting"` and hides `#root`.
2. Critical inline CSS and the early theme/chrome script paint the browser chrome and boot overlay before React loads.
3. The entry module, such as `src/entries/index.jsx`, mounts `SiteApp` into `#root`.
4. React renders the selected route view into `StudioShell` unless the route is standalone.
5. `useLegacyRouteRuntime` imports the route runtime module and calls its boot export.
6. The runtime composes the canvas/DOM behavior and dispatches `abs:route-ready` after the route is ready enough to reveal.
7. Direct-load boot helpers in the runtime complete the boot overlay release.

Simpler standalone/dashboard/lab entries such as `simulations.html`, `explain-it-like-im.html`, and `/lab/*.html` mount React into a plain `#root` without the heavy boot overlay. Their simpler boot shape is also intentional; do not add the boot overlay there unless the route is being deliberately migrated into the full shell contract and parity is verified.

The boot overlay and early theme/chrome script are first-paint infrastructure. Treat them as parity-sensitive.

## Routing And Shell Composition

`react-app/app/src/lib/routes.js` defines route IDs, canonical paths, aliases, and gated routes. Portfolio and CV are gated through `access-gates.js`.

`SiteApp.jsx` maps each route ID to:

- a React route view function;
- a runtime descriptor containing `loadModule` and `exportName`.

`useShellRouteTransition` is the only owner of SPA route transition sequencing. It resolves route state, handles gated redirects, manages transition phases on `<html data-abs-transition-phase>`, and waits for route readiness before reveal.

`StudioShell.jsx` provides the shared scene:

- `#simulations` for the wall/canvas route surface;
- shell wall and hero slots;
- `.fade-content` for header, main content, and footer;
- modal hosts;
- `#portfolio-sheet-host` as a sibling above `.fade-content`;
- `#quote-viewport-host`.

The portfolio drawer must remain mounted through `#portfolio-sheet-host` so it can stack above header and footer. `docs/reference/LAYER-STACKING.md` is canonical for this z-order contract.

## Route Families

- Home (`/`, `/index.html`) uses the shared shell with the main Canvas 2D runtime from `legacy/main.js`.
- Portfolio (`/portfolio.html`) uses the shared shell, portfolio route view, invite gate, deck/detail DOM, and portfolio runtime module.
- CV (`/cv.html`) uses the shared shell, invite gate, CV content route, and CV bootstrap.
- Styleguide (`/styleguide.html`) is a shell-managed component-library route without the dev panel dock.
- Simulations (`/simulations.html`) is the catalog/admin launchpad for simulation review and promotion.
- Lab routes (`/lab/*.html`) are shell-managed simulation surfaces. Some are promoted into daily rotation; others remain lab-only with `enabledInRotation: false` or catalog stage boundaries.

## Config And Content

Runtime config loads from public config files in `react-app/app/public/config/`. The compatibility files are generated from `design-system.json` for older runtime loaders and route-specific normalizers.

Route content is also public JSON:

- `contents-home.json`
- `contents-portfolio.json`
- `contents-cv.json`

Vite's virtual content plugin turns selected content files into importable modules for React route views. Public JSON still ships for runtime modules that fetch it directly.

## Simulation Catalogue

`react-app/app/src/data/simulationCatalog.json` is the catalog for simulation inventory, daily rotation, collection entries, automation candidates, hidden entries, launch paths, and review status.

`simulationCatalog.js` derives immutable runtime helpers such as daily-rotation IDs, extended narrative IDs, and route-backed daily hrefs. The core mode constants import these derived arrays so narrative order follows the catalog.

Do not change mode IDs, mode order, launch paths, daily rotation behavior, or promotion state without a dedicated parity pass.

## Deployment

GitHub Pages deployment is defined in `.github/workflows/gh-pages.yml`.

The workflow installs dependencies for `react-app/app`, runs token and lint checks, validates HTML fragments, flattens the design config, builds the React app, verifies `react-app/app/dist/`, uploads that dist folder as a Pages artifact, and deploys it.

The deployment target remains GitHub Pages. Do not change the target or publish a different output directory without an explicit deployment migration.

## Do Not Change Lightly

These systems are parity-sensitive:

- boot overlay and early theme/chrome script in HTML entries;
- `StudioShell` structure and stacking;
- `useShellRouteTransition` and the transition phase contract;
- `#portfolio-sheet-host` placement and z-index behavior;
- Canvas renderer setup, resizing, and DPR handling;
- render loop timing and adaptive throttling;
- physics engine, collision behavior, and mode constants;
- generated config files and flattening semantics;
- GitHub Pages workflow and `react-app/app/dist/` deployment;
- public route paths and gated route behavior.

If a refactor touches any of these, state how parity was verified and run the relevant checks from `PARITY-CONTRACT.md`.
