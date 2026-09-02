# Alexander Beck Studio

An interactive portfolio built as a React/Vite shell around a live Canvas 2D simulation runtime.

## Start here

```bash
npm run install:all
npm run dev
```

Development runs at `http://127.0.0.1:8012`. The live component reference is `/styleguide.html`.

## Development and release workflow

```bash
npm run studio:dev       # local authoring + safe public phone URL
npm run studio:status    # servers, tunnel, Git, and production-sync state
npm run studio:stop      # stop the managed public development session
npm run studio:check     # canonical local production gate
npm run studio:publish   # verify and push committed main to trigger GitHub Pages
npm run github:cli -- run list --branch main  # optional workflow inspection
```

Both development servers watch the same working tree, so saved changes update localhost and the public phone URL through Vite HMR. Production remains commit-based and deploys only after a successful push to `origin/main`. See [`docs/deployment/DEVELOPMENT-AND-RELEASE.md`](docs/deployment/DEVELOPMENT-AND-RELEASE.md) for the safety boundary, URL lifetime, and optional stable Cloudflare hostname setup.

The default working rule is: **save to update development, commit to preserve work, and publish to update production**. Start with `npm run studio:status`, use `npm run studio:dev` whenever phone/public review is needed, and use `npm run studio:publish` only when the committed `main` branch is intentionally ready for `beck.fyi`.

Git operations use the system `git` binary and do not require GitHub CLI or Homebrew. When GitHub API or Actions inspection is useful, `npm run github:cli -- <args>` resolves `gh` from PATH or common Homebrew locations without relying on Codex Desktop inheriting an interactive shell PATH. The CLI remains optional; the wrapper reports how to proceed when it is absent.

## Design

[`PRODUCT.md`](PRODUCT.md) records the approved product purpose, visitor journey, non-goals, and open strategic questions. [`DESIGN.md`](DESIGN.md) is the design constitution for Home, Work, About, Contact, and the shared shell. It records the design thesis, cross-route rules, fluid responsive policy, intentional exceptions, and audit items that need verification. Exact authored values remain in `react-app/app/public/config/design-system.json`; component-level usage remains in `docs/reference/SITE-STYLEGUIDE.md` and `docs/reference/COMPONENT-LIBRARY.md`.

Codex UI work should use the repository skill [`design-system-ui`](.agents/skills/design-system-ui/SKILL.md), following [`AGENTS.md`](AGENTS.md). Start with `$design-system-ui` for an explicit invocation.

## Production

```bash
npm run check:site
npm run preview
```

The root build is canonical. It verifies shared production entry shells, flattens `design-system.json` into runtime configs, builds all Vite entries into `react-app/app/dist/`, and checks the About and Work publication boundaries. `npm run check:site` includes that build; `npm run studio:check` wraps the same gate. `npm run preview` serves the resulting production build on port 8013. A successful local build is not a deployment.

## Current structure

```text
react-app/app/
├── src/
│   ├── components/app/   SiteApp, StudioShell, Button Bar
│   ├── routes/           Home, Work (portfolio/playground), About, Contact, tools/labs
│   ├── entries/          Vite entry mounts
│   └── legacy/           active Canvas 2D and imperative route runtimes
├── public/
│   ├── config/           authored design/content JSON + generated configs
│   ├── css/              shared and route CSS
│   └── images/           production media
└── dist/                 generated production build
scripts/                  validation, flattening, audits, capture
docs/reference/           current contracts only
```

The `legacy/` name does not mean unused: it contains the active simulation engine and the reused Work case-study drawer/handoff runtime. The current Work spatial field lives in `src/routes/playground/`, with catalogue and presentation modules in `src/routes/portfolio/work/`. Historical source names do not imply separate public products.

## Routes

| Route | Production build | Development |
| --- | --- | --- |
| Home (`/index.html`, also `/`) | Interactive simulation wall, identity, expertise, and Daily Simulation | Same route plus local authoring tools |
| Work (`/portfolio.html`) | **Coming soon.** The full canvas is excluded at build time; URL parameters, browser storage, and case-study access grants cannot enable it. | Spatial catalogue with snippets, protected case studies, an in-window access gate, and a detail drawer |
| About (`/about.html`) | Canonical spatial narrative; its authoring panel remains excluded from production. | Same narrative plus local authoring controls |
| Contact (`/contact.html`) | Contact invitation, email-copy feedback, and LinkedIn | Same visitor-facing route |

These are the current source/build contracts, not a claim about the latest deployed site. Work remains held for a separate launch decision. `/playground.html` is a compatibility entry for Work. The persistent Button Bar owns primary navigation. Route top bars are utility/back surfaces only.

## Source of truth

- Route manifest and Button Bar labels: `react-app/app/src/lib/route-manifest.js` and `react-app/app/src/lib/routes.js`
- Shared shell: `react-app/app/src/components/app/StudioShell.jsx`
- Editorial copy: `react-app/app/public/config/contents-home.json` and `contents-portfolio.json`
- About narrative content and choreography: `react-app/app/public/config/contents-about.json`
- Authored design values: `react-app/app/public/config/design-system.json`
- Generated configs: `default-config.json`, `shell-config.json`, `portfolio-config.json`, `cv-config.json`

See `docs/reference/GENERATED-CONFIG.md` for the compatibility-output boundary.

## Verification

Verification has three layers. `npm run check:site` is the canonical source/configuration and production-build gate. It includes substantial Node test coverage through the built-in `node:test` runner, including the About narrative, geometry, and route/simulation transaction suites, plus app lint. There is no separate typecheck script. Focused Playwright audits supply the browser layer, including screen certification, Work canvas/gate/drawer, Canvas SPA stability, boot overlay, performance, and route transitions. Check the production gates on a production preview and the full Work experience on development; do not treat one as coverage of the other.

Current architecture and behavior are documented in:

- `PRODUCT.md`
- `DESIGN.md`
- `docs/reference/SYSTEM-ARCHITECTURE.md`
- `docs/reference/CONFIGURATION.md`
- `docs/reference/CANVAS-RUNTIME.md`
- `docs/reference/PORTFOLIO.md`
- `docs/reference/TRANSITION-ORCHESTRATION.md`
- `docs/reference/LAYER-STACKING.md`
- `docs/reference/PARITY-CONTRACT.md`
