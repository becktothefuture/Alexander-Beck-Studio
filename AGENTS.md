# AGENTS.md

## Project reality

- The production site is the Vite/React app in `react-app/app/`.
- Every production entry mounts `SiteApp`, which renders `StudioShell` and a route descriptor.
- Public route labels are Home, Work, About, and Contact. The persistent `ShellButtonBar` is the primary navigation; `portfolio` remains an internal route/source name.
- The Canvas 2D simulation runtime in `src/legacy/` is active infrastructure. Its directory name is historical; do not delete or rewrite it merely for modernization.
- The canonical authored design source is `react-app/app/public/config/design-system.json`. Generated runtime configs are never hand-edited.

## Agent skills

### Product UI and design system

- Before changing product UI, read `PRODUCT.md` and `DESIGN.md`, then use `.agents/skills/design-system-ui/SKILL.md` (`$design-system-ui`). This is the repository workflow for the existing website; generic frontend-design guidance must not replace its approved direction.
- Inspect and reuse the existing components, semantic tokens, and focused reference before adding a pattern. New tokens, components, variants, radii, breakpoints, or interactions require approval unless the current request already covers them.
- After an approved design-system change is implemented in its authoritative source, update the affected design guidance. Do not present a proposed behavior as implemented.

### Issue tracker

Issues and specifications are tracked in this repository's GitHub Issues. See `docs/agents/issue-tracker.md`.

### Domain docs

This repository uses a single-context domain-documentation layout. See `docs/agents/domain.md`.

## Commands

- `npm run install:all` — install root and app dependencies
- `npm run dev` — Vite development server on port 8012
- `npm run studio:dev` — local Vite plus a safe hot-reloading public mirror and Cloudflare tunnel
- `npm run studio:status` — local/public runtime state plus Git production-sync state
- `npm run studio:stop` — stop only the processes managed by `studio:dev`
- `npm run studio:check` — canonical local site gate
- `npm run studio:publish` — validate and explicitly push clean committed `main` to trigger GitHub Pages
- `npm run github:cli -- <args>` — optional GitHub CLI wrapper that resolves PATH and common Homebrew locations
- `npm run build` — entry-shell parity check, config flattening, then the Vite production build
- `npm run preview` — serve the production build on port 8013
- `npm run check:site` — canonical local gate: tokens, HTML entries, simulation catalog, lint, config parity, and build
- `npm run certify:screens` — Home, Portfolio, About Me, and Contact across desktop/mobile and light/dark
- `npm run audit:canvas-spa` — backing-store and route-generation checks across SPA hops
- `npm run audit:theme-wall-invariance` — outer-shell invariance plus inner-window theme switching
- `npm run audit:palette-surface-contract` — palette accents plus shell/window token ownership
- `npm run audit:outer-wall-frame` — browser-scheme × site-theme frame/window matrix
- `npm run audit:theme-consistency` — theme persistence, routes, tabs, and independent browser harmony
- `npm run audit:portfolio-gate` — current in-window Portfolio gate flow
- `npm run audit:work-canvas` — current Work spatial catalogue and interaction contracts
- `npm run audit:portfolio-carousel` — compatibility alias for `audit:work-canvas`
- `npm run audit:portfolio-drawer` — Portfolio project drawer
- `npm run audit:transition-flows` — route and project transitions; run serially in Chromium and WebKit

## Development, public preview, and production policy

- Begin relevant development work with `npm run studio:status`. Use its result to reuse existing processes and understand the working tree before acting.
- The normal authoring surface is `http://localhost:8012`. It retains the write-capable development editor and configuration APIs.
- When the user requests phone testing, a public preview, or a shared development URL, run `npm run studio:dev`. It starts or reuses local authoring plus the read-only public mirror on port 8014 and prints the current Cloudflare URL.
- Saved files update both development surfaces through Vite HMR. Saving, building, starting a tunnel, and making a local commit never update production.
- Treat the public mirror as review-only. Do not weaken its `/api/*` or `/@fs/*` blocks, filesystem restriction, or disabled authoring controls.
- Reuse an active managed session. Do not run duplicate tunnel processes, and do not stop an existing session merely because an agent task has finished.
- Run `npm run studio:stop` only when the user asks, when a session was explicitly started as disposable validation, or when cleaning up a failed managed start. A pre-existing local Vite process is not owned by the Studio CLI and must remain running.
- Run targeted checks during implementation and `npm run studio:check` before calling a milestone production-ready. The publish command repeats this gate.
- A request for a “public dev link”, “phone preview”, or “shared preview” means the development mirror. A request to update “production”, “beck.fyi”, or push/sync committed `main` means the GitHub Pages path. If the word “live” is ambiguous, ask which destination the user means.
- Never run `npm run studio:publish`, `npm run studio:publish -- --yes`, `git push`, or another deployment action without explicit user authorization for that production-changing action. Never infer authorization from a successful build, an existing commit, or a request for a public development link.
- Git commit and push use `git` directly and must never be blocked on GitHub CLI availability. `gh` is optional and only supports GitHub API, authentication diagnostics, PRs, and workflow verification. Invoke it through `npm run github:cli -- <args>` so Codex does not depend on the desktop process PATH or a specific package manager.
- Homebrew is not a project dependency. The GitHub CLI wrapper checks PATH plus standard Apple Silicon Homebrew, Intel Homebrew, and Linuxbrew locations; it also accepts the explicit `ABS_GITHUB_CLI_BIN` override.
- `studio:publish` never creates commits. Continue to commit only when explicitly asked, review the exact diff first, and never include unrelated changes.
- After an authorized production push, report the workflow as triggered. Verify the GitHub Pages workflow and deployed site before claiming production is updated.
- Durable rule: save to update development, commit to preserve work, publish to update production.

## Architecture and ownership

Paths beginning with `src/` or `public/` below are relative to `react-app/app/`; other paths are repository-relative.

- Entry: `react-app/app/src/entries/*.jsx`
- App/router: `src/components/app/SiteApp.jsx`
- Shared shell: `src/components/app/StudioShell.jsx`
- Primary navigation: `src/components/app/ShellButtonBar.jsx` + `src/lib/routes.js`
- Route views: `src/routes/`
- Home simulation runtime: `src/legacy/main.js` and `src/legacy/modules/`
- Work spatial field: `src/routes/playground/`; catalogue and presentation: `src/routes/portfolio/work/`
- Work case-study drawer/handoff: `src/legacy/modules/portfolio/`
- Editorial content: `public/config/contents-home.json` and `contents-portfolio.json`
- Design config: `public/config/design-system.json`
- Product intent and visitor journey: `PRODUCT.md`
- Production design constitution: `DESIGN.md`
- Live component reference: `/styleguide.html` and `docs/reference/COMPONENT-LIBRARY.md`

Read the focused reference under `docs/reference/` for the affected contract: `SYSTEM-ARCHITECTURE.md`, `SITE-STYLEGUIDE.md`, `CANVAS-RUNTIME.md`, `PORTFOLIO.md`, `TRANSITION-ORCHESTRATION.md`, `LAYER-STACKING.md`, `CONFIGURATION.md`, or `CUSTOM-CURSOR.md`. Check the production/development route boundaries in `README.md`; a UI task does not authorize changing a launch gate or preview policy.

## Implementation rules

- Use ES modules with explicit `.js` extensions.
- Match existing naming: PascalCase classes/components, UPPER_SNAKE_CASE constants, camelCase functions/variables.
- Use design tokens in CSS; avoid unrelated reformatting and `!important`.
- Preserve accessibility, responsive behavior, reduced motion, and 60 FPS hot paths.
- Keep physics-loop work allocation-free and bounded.
- Do not hand-edit generated configs or treat browser storage as design truth.
- A configurable value is complete only when live apply, canonical save, reload, flattening, and preview agree.
- Primary route controls belong in the Button Bar. Route top bars are optional utility/back strips, not a second navigation system.

## Portfolio knowledge source of truth

- Before extracting portfolio sources, answering project-fact questions, running interviews, or drafting case-study copy, read `docs/portfolio/router.yaml` and select the narrowest intent.
- Resolve the project through `docs/portfolio/catalog.json`, then read `docs/portfolio/sources/index.json` and `docs/portfolio/projects/<project-id>.json`.
- Raw supplied files are evidence; extracted notes and old portfolio copy enter as candidate claims. Only confirmed, source-linked claims may be treated as settled facts in final copy.
- Preserve contradictions and missing information. Do not silently promote polished wording, Figma copy, or the current website configuration into factual authority.
- American Heart Association is on hold. Sources may be indexed, but no final-copy draft or outcome claim may be created until the hold is explicitly removed.
- After portfolio-knowledge writes, run `npm run verify:portfolio-knowledge`.

## Locked visual contracts

- The physical window, outer frame, Button Bar, and outside-window shell do not enter/exit with route content.
- Work project sheets cover route content to the studio-window boundary behind the overlapping Button Bar; the bar remains above them and receives input. See `docs/reference/LAYER-STACKING.md`.
- Portfolio detail handoff animates the selected media geometry into the drawer hero; preserve reversal and reduced-motion behavior.
- The home canvas owns balls plus the visual title path; semantic DOM copy remains for accessibility.
- Instrument Serif is reserved for route-entry headlines through the headline tokens. Keep navigation, descriptions, Portfolio cards, and project-detail titles in Geist; do not spread the serif through inheritance or use it as a general heading font.
- Instrument Serif's fine strokes are less tolerant of sustained simulation occlusion. Preserve title legibility by tuning material density, placement, and motion—not by adding outlines, shadows, or a background plate to the title.
- Do not add thin helper rings/lines to simulation visuals. Express forces through material motion or broad tonal fields.
- Preserve wall/frame color separation and do not alter wall geometry, radii, shadow plates, or shell colors without explicit scope.
- Manual light/dark theme affects the studio-window interior only: `--studio-window-bg`, `--frame-inner-surface`, in-window finish, route content, simulations, gates, and overlays. Never alias those surfaces to `--abs-wall-base`.
- The exposed band and physical frame are invariant opaque black (`#000000`) across browser families, browser/OS schemes, site themes, and display gamuts. Preserve `chromeHarmonyMode: auto` only as a compatibility sentinel; no production path may approximate browser chrome or change the frame away from black.
- The Button Bar belongs to the stable outer shell. Do not derive its ink/material from `--text-primary` or `--text-muted`, and verify all four route tabs remain legible and selected correctly in both site themes.
- The custom cursor is one fixed 57.6px adaptive neutral lens across every production route, outer-shell surface, Button Bar, gate, drawer, and modal. Its only interactive state resolves to 20px (`scale(0.3472222)`) with `opacity: 0.72`; it never switches colour, size family, or overlay-specific form. Lab keeps the resting lens over its keyboard-focusable drag surface and uses the smaller state for nested project items and other true actions.
- Quote puck behavior includes the current air-hockey-style drag/throw response. Do not describe it as drag-only.
- Public Daily Simulation state settles on the clean Home URL.

## Verification

Run the checks proportional to the change, then inspect the final diff. At minimum:

```bash
npm run check:site
```

For visual or routing work, build first, run preview separately, then run the relevant Playwright audits. Transition work requires Chromium and WebKit serial runs; use strict RAF mode when cadence changed. Generated screenshots live under the gitignored `output/playwright/` tree.

Theme/frame work requires the palette-surface, wall-invariance, outer-frame, and theme-consistency audits. Run wall invariance, outer frame, and theme consistency with `ABS_BROWSER=chromium` and `ABS_BROWSER=webkit`, then inspect Home, Portfolio, About Me, and Contact in light/dark at desktop and mobile sizes. A green state-propagation audit is insufficient if window contrast or exposed-frame pixels are wrong.

Do not claim parity from a green build alone. State which routes, viewports, browsers, screenshots, and runtime audits were checked. Do not commit unless explicitly asked.
