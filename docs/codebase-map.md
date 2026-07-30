# Codebase map

Last verified: 2026-07-30
Repository: Alexander Beck Studio Website
Production application: `react-app/app/`

## Purpose

This document is the persistent orientation map for the repository. It records the current runtime, module boundaries, data flow, state, persistence, integrations, and operational contracts. Read it before planning cross-cutting changes. Read the focused documents named in each section before changing a protected subsystem.

## Executive architecture

The production site is a static multi-page Vite build with a React single-page shell inside every page entry. React owns routing, the stable physical shell, route transitions, theme coordination, and lifecycle boundaries. Route content can be React-owned or can bootstrap an imperative runtime. The active Canvas 2D system remains under `src/legacy/`; its name is historical, not a deprecation signal.

```mermaid
flowchart TD
    Browser["Browser request"] --> Html["HTML entry"]
    Html --> Entry["src/entries/*.jsx"]
    Entry --> SiteApp["SiteApp"]
    SiteApp --> Router["Route definitions and transition state"]
    SiteApp --> Shell["StudioShell: stable wall, frame, Button Bar, overlays"]
    Router --> View["React route view"]
    Router --> Bridge["useLegacyRouteRuntime"]
    Bridge --> HomeRuntime["Home Canvas 2D runtime"]
    Bridge --> PortfolioRuntime["Portfolio orbital deck and drawer"]
    Bridge --> OtherRuntime["Route-specific imperative runtime"]
    Config["public/config authored JSON"] --> Virtual["Vite virtual content modules"]
    Config --> Fetch["Runtime fetch loaders"]
    Virtual --> View
    Fetch --> HomeRuntime
    Fetch --> PortfolioRuntime
    DevApi["Local Vite authoring APIs"] --> Config
    Scripts["Validation, build, browser audits"] --> SiteApp
    Scripts --> Config
    SiteApp --> Dist["Vite static dist"]
    Dist --> Pages["GitHub Pages / beck.fyi"]
```

## Primary technologies

| Technology | Purpose |
| --- | --- |
| Vite 7 | Multi-entry development and production build. |
| React 19 | Stable application shell, route views, and lifecycle ownership. |
| Canvas 2D | Home simulation, Portfolio effects, and route-specific visual systems. |
| Three.js | About narrative point world and selected spatial labs. |
| JavaScript ES modules | Production source, build tooling, validators, and audits. |
| CSS custom properties and JSON tokens | Design-system and runtime configuration. |
| Node test runner | Contract, schema, transition, geometry, and persistence tests. |
| Playwright | Browser, transition, Canvas, theme, and screenshot certification. |
| GitHub Actions and Pages | Static production build and deployment. |
| Cloudflare tunnel | Managed read-only public development preview. |

## Repository layout

| Path | Role | Notes |
| --- | --- | --- |
| `react-app/app/` | Production Vite/React application | Primary code, assets, configuration, and app-local scripts. |
| `react-app/app/src/components/app/` | Application and shared shell | `SiteApp`, `StudioShell`, and `ShellButtonBar` are central. |
| `react-app/app/src/hooks/` | Route/runtime lifecycle and transition orchestration | Includes the React-to-imperative ownership bridge. |
| `react-app/app/src/lib/` | Shared route, theme, motion, gate, and shell utilities | Prefer these contracts over route-local duplicates. |
| `react-app/app/src/routes/` | Route views and route-specific systems | Contains production routes and isolated labs. |
| `react-app/app/src/legacy/` | Active Canvas 2D and imperative runtime | Do not treat this directory as obsolete. |
| `react-app/app/public/config/` | Authored and generated runtime configuration | `design-system.json` is the canonical design source. |
| `react-app/app/public/css/` | Design tokens and production stylesheets | `main.css` and `portfolio.css` are current maintenance hotspots. |
| `react-app/app/public/` | Static assets and public files | Includes media, fonts, models, and generated runtime config. |
| `scripts/` | Repository checks, audits, Studio CLI, and release tooling | The canonical local gate is assembled here and in `package.json`. |
| `docs/` | Architecture, design, operational, research, and portfolio knowledge | Focused documents define protected contracts. |
| `.github/workflows/` | GitHub Pages deployment | `gh-pages.yml` runs the canonical site gate before deploy. |
| `tasks/` | Historical and active work packets | Planning evidence, not production runtime truth. |
| `output/`, `tmp/`, `.playwright-*` | Generated local artifacts | These paths are ignored; some historical files remain tracked. See `OPS-001` in the audit. |

## Application entry and route flow

1. A Vite HTML entry loads a small module under `src/entries/`.
2. The entry mounts `SiteApp` with the requested route identifier.
3. `SiteApp` resolves the route descriptor, design configuration, theme, shell state, and transition state.
4. `StudioShell` renders the stable physical shell and the active route scene.
5. The route descriptor supplies a React view and, where required, a lazy imperative runtime export.
6. `useLegacyRouteRuntime` gives that runtime an abort signal, generation guard, cleanup registry, and ready/failed lifecycle events.
7. `useShellRouteTransition` coordinates URL history, route surfaces, prewarming, readiness, failure recovery, focus settlement, and simulation switches.

```mermaid
sequenceDiagram
    participant U as User
    participant A as SiteApp
    participant T as Route transition
    participant S as StudioShell
    participant R as Route runtime

    U->>A: Select route in Button Bar
    A->>T: Request route transaction
    T->>R: Prewarm route/module/media
    T->>S: Preserve shell; transition route surface
    S->>R: Mount React view
    R->>R: Bootstrap with generation and AbortSignal
    R-->>T: abs:route-ready or abs:route-failed
    T->>A: Commit URL, focus, and settled state
```

### Primary routes

| Route | React view | Imperative/runtime owner | Current production behavior |
| --- | --- | --- | --- |
| Home | `src/routes/home/HomeRoute.jsx` | `src/legacy/main.js` | Canvas balls and visual title; semantic title remains in the DOM. |
| Portfolio | `src/routes/portfolio/PortfolioRoute.jsx` | `src/legacy/modules/portfolio/app.js` | Gate, orbital project deck, project handoff, and drawer. |
| About Me | `src/routes/about/AboutRoute.jsx` | None in production | Production renders `AboutComingSoon`; development can load the spatial narrative experience. |
| Contact | `src/routes/contact/ContactRoute.jsx` | React-owned simulation/content | Contact information and ripple interaction. |

The stable primary navigation is `ShellButtonBar` plus `src/lib/routes.js`. Route-local top bars are utilities, not a second primary navigation system.

### Additional routes and labs

`vite.config.js` builds the style guide, simulation launchpad, palette lab, About narrative lab, and multiple visual/interaction labs. These routes use the same shell descriptor system where practical. They are valid build outputs, but they are not all primary production navigation destinations.

Route metadata currently exists in several places:

- Vite HTML inputs;
- HTML entry files;
- `src/entries/` modules;
- `src/lib/routes.js`;
- `SiteApp` route descriptors;
- `StudioShell` route-scene metadata;
- the simulation catalog and validation scripts.

See `ARCH-001` in `codebase-audit.md` before adding or renaming a route.

## Stable shell ownership

`StudioShell` owns the elements that must not enter and exit with route content:

- the outside wall;
- the physical frame and exposed band;
- the studio window;
- the persistent Button Bar;
- global atmosphere and title planes;
- transition and route overlays;
- Portfolio sheet, quote, modal, and legacy host layers.

Do not move stable shell layers into a route view. Do not make them depend on a route theme token when the design constitution assigns them to the invariant outer shell. Read `DESIGN.md`, `LAYER-STACKING.md`, and `SYSTEM-ARCHITECTURE.md` before changing this layer.

## Runtime boundaries

### React-owned state

React owns:

- the active route descriptor;
- route transition state and transaction status;
- theme and shell configuration snapshots;
- route view mounting;
- route runtime generation and lifecycle status;
- stable shell controls, hosts, and accessibility boundaries.

### Imperative runtime state

The Canvas and Portfolio runtimes own high-frequency state outside React:

- physics bodies, velocities, collision structures, and fixed-step accumulation;
- Canvas backing stores and render-loop timing;
- pointer/gesture state;
- simulation mode state;
- portfolio orbital geometry, inertia, selection, and drawer handoff;
- pooled audio, particles, and other allocation-sensitive resources.

Do not move high-frequency physics or render state into React component state. The bridge is intentionally lifecycle-oriented instead of frame-oriented.

### Lifecycle bridge

`useLegacyRouteRuntime` provides:

- one generation number per mounted imperative runtime;
- an `AbortController` for cancellation;
- a cleanup registry executed in reverse order;
- a legacy capture scope as a safety net for older event/timer ownership;
- `abs:route-ready` and `abs:route-failed` events;
- document data attributes used by diagnostics and browser audits.

New imperative route runtimes should return or register an explicit cleanup function and should honor the abort signal. They must not rely only on the safety-net scope.

## Canvas 2D simulation system

Entry: `src/legacy/main.js`
Core state: `src/legacy/modules/core/state.js`
Render loop: `src/legacy/modules/rendering/loop.js`
Physics: `src/legacy/modules/physics/`
Modes: `src/legacy/modules/modes/`
Input: `src/legacy/modules/input/`
Rendering and atmosphere: `src/legacy/modules/rendering/`
Authoring controls: `src/legacy/modules/ui/`

The simulation runtime uses a bounded `requestAnimationFrame` loop and fixed-step physics accumulation. Hot paths deliberately reuse arrays, maps, typed buffers, option objects, and audio voices. Preserve allocation-free and O(1) assumptions where comments identify them. Read `CANVAS-RUNTIME.md` before changing runtime ownership, resizing, timing, physics, or diagnostics.

The public Daily Simulation system selects a cataloged simulation and loads its route-backed runtime while settling the public URL on clean Home. It is not a second independent simulation implementation.

## Portfolio system

Entry: `src/legacy/modules/portfolio/app.js`
View shell: `src/routes/portfolio/PortfolioRoute.jsx`
Content: `public/config/contents-portfolio.json`
Drawer: `src/legacy/modules/portfolio/project-drawer.js`
Selected-media handoff: `src/legacy/modules/portfolio/project-handoff.js`

The Portfolio system is an imperative interaction application hosted by the React shell. It controls orbital layout, drag/inertia input, cards, selection, entrance readiness, project-sheet handoff, and drawer interaction. The project sheet must stop above the stable Button Bar. Read `PORTFOLIO.md`, `TRANSITION-ORCHESTRATION.md`, and `LAYER-STACKING.md` before modifying it.

## About narrative authoring system

Canonical content: `public/config/contents-about.json`
Development route: `src/routes/about-narrative-lab/`
Local persistence API: `vite.dev-admin-plugin.js`

The About narrative system is a development-only spatial authoring and playback environment in the current production route contract. It includes:

- schema validation, normalization, and migrations;
- track compilation and runtime planning;
- worker-assisted preparation and correspondence;
- a Three.js point-world renderer;
- an editor and preview controls;
- optimistic save with ETag and `If-Match`;
- atomic file replacement and recovery/checkpoint state.

Old schema/compiler modules remain compatibility dependencies for migration. Do not remove them based on their names alone. Read `docs/reference/ABOUT-NARRATIVE-TOOLKIT.md` before changing schema, publication, editor, or runtime behavior.

## Configuration and content flow

### Authored sources

| Source | Ownership |
| --- | --- |
| `public/config/design-system.json` | Canonical authored design configuration. |
| `public/config/contents-home.json` | Home editorial and semantic content. |
| `public/config/contents-portfolio.json` | Portfolio project/card content. |
| `public/config/contents-about.json` | About narrative schema and authored track. |
| `src/data/simulationCatalog.js` and related config | Simulation route/catalog metadata. |

Home and About content are exposed to source modules through Vite virtual imports. Portfolio content is loaded at runtime. Development authoring APIs can write canonical JSON; the public development mirror blocks `/api/*` and `/@fs/*`.

### Generated configuration

Build scripts flatten the canonical design configuration into runtime-specific files. Generated files are outputs, not authoring sources. Never hand-edit them. Read `CONFIGURATION.md` and `GENERATED-CONFIG.md` before changing configuration shape or save/apply behavior.

A configurable value is complete only when these paths agree:

1. live application;
2. canonical save;
3. reload;
4. generated flattening;
5. production preview.

## Persistence

The production site has no database and no server-side user account system.

| Store | Use | Authority |
| --- | --- | --- |
| Static JSON in `public/config/` | Design and editorial configuration | Authoritative when documented as canonical. |
| `localStorage` | Theme, haptics preference, authoring-panel state, selected development settings, About recovery/checkpoints | Convenience state only. |
| `sessionStorage` | Route handoff, Daily Simulation retry/focus state, gate/session state | Tab-scoped convenience state only. |
| Cookies | Long-lived client-side gate acknowledgement | UX friction only; not authentication. |
| Local Vite API writes | Development authoring saves | Local development only; unavailable on the public mirror. |
| Git and GitHub Pages artifact | Production release | Production source and deployed static output. |

Browser storage must not become the design source of truth.

## Authentication and access control

There is no production authentication or authorization service. Client-side gates and invitation codes only delay access to static content that is already shipped to the browser. Do not use the gate system for secrets, personal data, or privileged operations.

The local authoring server is write-capable. It is intended for the local development origin. The managed public mirror is read-only and blocks authoring endpoints and filesystem access.

## External integrations

| Integration | Purpose | Runtime boundary |
| --- | --- | --- |
| GitHub Actions and Pages | Build and deploy the static site | Production delivery. |
| Cloudflare tunnel via Studio CLI | Share the read-only development mirror | Development review only. |
| Figma scripts/WebSocket tooling | Design-system and capture workflows | Local tooling; not core production runtime. |
| Google Fonts and bundled font assets | Typography | Production presentation. |
| Web Audio and haptics APIs | Simulation feedback | Optional browser capability. |
| Clipboard and browser storage APIs | Interaction and local preferences | Browser-only convenience. |
| Playwright | Certification, visual audit, and transition testing | Local/CI-capable test tooling. |

## Error and recovery strategy

- Route runtimes publish booting, ready, failed, and cancelled lifecycle states.
- Generation checks prevent stale async boot work from owning the current route.
- Abort signals and explicit cleanups stop in-flight work during route changes.
- Route transitions contain failure recovery and focus settlement paths.
- The Home runtime logs global errors and unhandled rejections for diagnostics.
- About authoring validates schemas, uses optimistic concurrency, writes atomically, and keeps browser recovery checkpoints.
- Optional browser capabilities degrade without becoming production authority.

Some active legacy modules intentionally catch errors to preserve the interactive surface. The broad lint exemption makes those cases harder to audit; see `MAINT-002`.

## Build, test, and release flow

```mermaid
flowchart LR
    Edit["Edit authored source"] --> Targeted["Targeted checks"]
    Targeted --> Gate["npm run studio:check / check:site"]
    Gate --> Build["Vite multi-entry build"]
    Build --> Preview["Local production preview"]
    Preview --> Audits["Relevant Playwright and screenshot audits"]
    Audits --> Commit["Explicit commit"]
    Commit --> Publish["Explicit studio:publish / push"]
    Publish --> Actions["GitHub Pages workflow"]
    Actions --> Verify["Workflow and beck.fyi verification"]
```

Primary commands:

- `npm run studio:status` — inspect managed runtimes and Git production-sync state.
- `npm run studio:check` — canonical local readiness gate.
- `npm run check:site` — tokens, entries, catalogs, lint, config parity, and build.
- `npm run certify:screens` — route/theme/viewport screenshot matrix.
- `npm run audit:canvas-spa` — Canvas backing-store and SPA route-generation checks.
- `npm run audit:transition-flows` — Chromium and WebKit route/project transitions.
- `npm run studio:dev` — local authoring plus read-only public development mirror.
- `npm run studio:publish` — explicit validated push of clean committed `main`.

The deploy workflow installs the app package and runs `npm run check:site`. Deep browser and screenshot audits are available but are not currently required by the deploy workflow. See `TEST-001`.

## Conventions and protected assumptions

- Use ES modules and explicit `.js` import extensions.
- Use PascalCase for classes/components, UPPER_SNAKE_CASE for constants, and camelCase otherwise.
- Use design tokens in CSS. Avoid `!important` and unrelated reformatting.
- Preserve reduced motion, responsive behavior, accessibility, and cleanup behavior.
- Keep physics-loop work bounded and allocation-free.
- Keep the stable shell outside route entry/exit animation.
- Keep the Button Bar as primary navigation.
- Keep the frame and exposed band opaque black across browser and site themes.
- Keep the custom cursor contract fixed.
- Express simulation forces through material motion or broad fields, not thin helper lines.
- Do not publish, push, or commit without explicit authorization.

## Known uncertainty and drift points

- Route metadata is duplicated across several registries and has a current shell-metadata mismatch for two lab routes.
- Production About behavior and parts of the prose documentation disagree.
- Browser-audit coverage is extensive but not part of the release workflow.
- Some tracked historical browser/dependency artifacts remain even though their paths are now ignored.
- Supporting-copy contrast needs rendered verification on the real atmosphere surface, not only static color arithmetic.
- The client-side gate can be mistaken for security unless its UX-only role stays explicit.

See `docs/codebase-audit.md` for evidence, issue IDs, priorities, and acceptance criteria.

## Documentation routing

| Change area | Read first |
| --- | --- |
| Production visual system | `DESIGN.md`, `SITE-STYLEGUIDE.md` |
| Application and shell | `SYSTEM-ARCHITECTURE.md`, `LAYER-STACKING.md` |
| Route transitions | `TRANSITION-ORCHESTRATION.md` |
| Canvas simulation | `CANVAS-RUNTIME.md` |
| Portfolio | `PORTFOLIO.md` |
| Config and authoring | `CONFIGURATION.md`, `GENERATED-CONFIG.md` |
| Cursor | `CUSTOM-CURSOR.md` |
| About narrative | `docs/reference/ABOUT-NARRATIVE-TOOLKIT.md` |
| Portfolio facts/copy | `docs/portfolio/router.yaml`, then the catalog and project records |
| Release and preview | `docs/deployment/`, `docs/development/DEV-WORKFLOW.md` |

## Roadmap use

Before creating a refactor roadmap:

1. select findings by permanent ID from `codebase-audit.md`;
2. preserve the protected architecture listed above;
3. define observable acceptance criteria before moving ownership boundaries;
4. separate repository hygiene, accessibility, route-registry, CSS, and orchestration work;
5. run the checks and browser matrices required by the affected contract.
