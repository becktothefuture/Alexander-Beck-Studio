# AGENTS.md

## Commands
- `npm run install:all` — One-time: install root + react-app/app
- `npm run startup` — Interactive menu: React dev, Install all, Build, Exit
- `npm run dev` — React app dev server on 8012
- `npm run dev:react` — React app dev server only (port 8012, Vite HMR)
- `npm run build` — Canonical production build: flattens design config, then builds → `react-app/app/dist/`
- `npm run build:dev` — React unminified build + sourcemaps
- `npm run preview` — Serve React build (port 8013)
- `npm run start` — Alias for preview
- `npm run certify:screens` — Screenshot certification for home, portfolio, and CV (writes to `output/playwright/screens-certification/`, gitignored)
- `npm run audit:canvas-spa` — Playwright: **polls until** `#c` buffer matches layout×DPR after each hop (`ABS_SPA_ROUNDS`, `ABS_CANVAS_WAIT_MS`, `ABS_DEV_URL`, `ABS_AUDIT_QUIET=1` optional)
- `npm run audit:canvas-spa:quick` — 2 round-trips, one-line PASS (POSIX env; Windows: set vars then `node scripts/audit-canvas-spa.mjs`)
- `npm run audit:portfolio-gate` — Playwright: home → portfolio modal `1234` → pit; asserts `#c` buffer vs CSS×DPR and non-empty `.portfolio-project-label__text` (`ABS_DEV_URL` = origin e.g. `http://127.0.0.1:8013` or preview; run `npm run preview` in another shell first)
- `npm run validate:html-fragments` — Validate partial HTML templates
- No automated tests; manual testing required (all 20 modes, 60 FPS, mobile)

## Architecture
- **Primary surface:** React app at `react-app/app/` (Vite, multi-entry: index, portfolio, cv, styleguide)
- **Component library (live):** `/styleguide.html` — see `docs/reference/COMPONENT-LIBRARY.md`
- **Edit** `react-app/app/src/` and `react-app/app/public/` (CSS, config, images)
- Entry: `react-app/app/src/entries/*.jsx` → pages + legacy bridge
- Legacy runtime: `react-app/app/src/legacy/` (modules, main.js, cv-init, etc.) — no imports from repo root
- **Canonical design config:** `react-app/app/public/config/design-system.json`
- **Generated config outputs:** `react-app/app/public/config/default-config.json`, `shell-config.json`, `portfolio-config.json`, `cv-config.json`
- Build flattening: root `npm run build` runs `flatten:design-config` before Vite build. A direct `react-app/app` build can bypass flattening, so prefer building from the repo root.
- Build: Vite → `react-app/app/dist/`
- **Site UI styleguide (chrome buttons, harmony):** `docs/reference/SITE-STYLEGUIDE.md`
- **Route top bar:** Same standing as the **footer**—fixed pattern only: `header.ui-top` → `ui-top-main.route-topbar` → `route-topbar__left` / `route-topbar__center.ui-main-nav` (`.footer_link` buttons) / `route-topbar__right` + `#sound-toggle-slot`. Do not invent alternate top-bar text buttons or absolute-center layouts. See `docs/reference/COMPONENT-LIBRARY.md` (route top bar) + `SITE-STYLEGUIDE.md` §1.4 + live `/styleguide.html`.
- **Layer stacking (z-order):** **`docs/reference/LAYER-STACKING.md` is canonical.** Read it before changing `#portfolio-sheet-host`, `.fade-content`, `#abs-scene`, or `#portfolioProjectView` mount. **Portfolio drawer MUST stack above header + footer** (`.fade-content`, z-index 200): host is **`#abs-scene` sibling after `.fade-content`**, z-index **220** / **260** when open — **never** only inside `#bravia-balls`.
- **Portfolio pit physics (collisions, walls, spatial grid):** `docs/reference/PORTFOLIO-PIT-PHYSICS.md`
- **Portfolio CSS on SPA:** `index.html` must include **`/css/portfolio.css`**. **`#portfolio-sheet-host`**: fixed inset like inner canvas, **`border-radius: var(--frame-inner-radius)`**, **`overflow: hidden`**, **`z-index: 220` / `260`**. **`#portfolioProjectView`** inherits **`corner-shape`** like `#c`. **`.portfolio-project-view__drawer`**: **`--portfolio-drawer-ground`**, no second frame border.

## Config Workflow
- Treat `react-app/app/public/config/design-system.json` as the only authored design source.
- Treat `default-config.json`, `shell-config.json`, `portfolio-config.json`, and `cv-config.json` as generated compatibility outputs, not hand-edited sources of truth.
- A control is only complete when it has all three paths:
  - live apply in dev
  - canonical save/export into `design-system.json`
  - build-time flattening into the generated config files
- Shared visual finish belongs in `shell`. Light edge, wall atmosphere, quote/script treatment, and edge-caption spacing should be authored once and reused across views.
- Page panels should own composition, page-specific motion, and content geometry. They should not redefine the shared surface language, shell chrome, or brand tokens.
- If a control is deprecated, remove it from persistence/export as well as from the visible panel. Hidden controls can still pollute saved JSON if export paths are left active.
- `localStorage`, `sessionStorage`, and `window.__...` caches are panel/runtime helpers only. They are not design truth.
- Convenience presets must be clearly one of:
  - persistent, by writing underlying canonical values
  - UI-only, by being explicitly non-persistent

## Verification
- `npm run certify:screens` writes to `output/playwright/screens-certification/`; the whole `output/playwright/` tree is gitignored—regenerate after visual changes. Scratch audit scripts under `tmp/*.cjs` / `output/cv_audit.js` are gitignored—do not commit.
- After changes to SPA routing, `renderer.js`, `loop.js`, or keyed wall/canvas remounts: with **dev server on 8012**, run `npm run audit:canvas-spa`. It asserts **backing-store dimensions** (fails on 300×150-style remount bugs); it does not prove 60 FPS or every browser quirk—manual pass still matters.
- For config or panel changes, verify the full parity loop:
  - change value in dev
  - save
  - reload the page
  - run `npm run build`
  - run `npm run preview`
  - confirm the same result in preview without panel interaction
- Minimum visual coverage for config changes:
  - home
  - portfolio
  - CV
  - preview build
- When touching visuals rendered in more than one pipeline, update every path. In this repo that includes cases like:
  - DOM SVG + canvas-rendered logo
  - shared shell CSS + page-local adapters
  - live panel state + flattened build config

## Code Style
- **ES Modules**: Always include `.js` extension in imports
- **Naming**: `PascalCase` classes, `UPPER_SNAKE_CASE` constants, `camelCase` functions/vars
- **CSS**: Use design tokens (`var(--gap-*)`, `var(--text-*)`), no raw pixels; never use `!important`
- **Performance**: O(1) hot paths, no allocations in physics loop, 60 FPS minimum
- **Documentation is authoritative**: If code conflicts with `docs/`, fix the code

## Critical Constraints
- 20 simulation modes (see `docs/reference/MODES.md`)
- Privacy-first: No external calls, localStorage for settings only
- Accessibility: ARIA labels, keyboard nav, respect `prefers-reduced-motion`
- Modal blur uses two-layer architecture (locked, do not modify)

## Workflow: Completion & Handoff Protocol
**CRITICAL**: Never assume a problem is solved or a task is complete without explicit user confirmation.
- Before handing off work: Verify all changes are complete, tested, and ready for review
- After implementation: Always request user verification before marking anything as done
- If user reports an issue: Continue investigating until they confirm it's resolved
- Never mark todos complete or close issues without explicit user confirmation
- This ensures quality and prevents incomplete work from being considered finished

## Learned Workspace Facts
- **Custom cursor contract:** `docs/reference/CUSTOM-CURSOR.md`. **Home inner wall only:** small solid palette dot (~**66%** of on-screen ball diameter from canvas mapping). **Everywhere else in-scene** (portfolio pit, CV, chrome, modals): **64px tap ring** (`#custom-cursor.abs-cursor-tap`), `position:fixed` on `body` so it is not buried under UI. Gate overlay still adds `#custom-cursor.modal-active` (same CSS as tap ring).
- **Route top bar** must match the shared strip (grid + `ui-main-nav` + `MainNavLink` / `footer_link` + sound slot), same discipline as footer composition—documented in `COMPONENT-LIBRARY.md`, `SITE-STYLEGUIDE.md` §1.4, and the styleguide page. Shell chrome has two button families: **text** (`MainNavLink`) and **icon** (`.abs-icon-btn`); do not add parallel text-button classes.
- Primary surface is `react-app/app/` only; there is no parallel static-site pipeline in this repo.
- Inner wall corner radius is applied at 1.1× (or 1.15×) base radius to visually compensate for the second outer wall offset; document in CONFIGURATION.md if the multiplier changes.
- **Squircle corners:** `runtime.cornerShapeSquircleEnabled` in `design-system.json` toggles class `abs-corner-shape-squircle` on `<html>`; `tokens.css` applies `corner-shape: squircle` to descendants inside `@supports` (property is not inherited—see `CONFIGURATION.md`). **Excluded from squircle:** `#custom-cursor`, `.legend .circle` (perfect circles). Dev panel (dev): Browser → **Squircle corners**. Canvas physics drawing is unchanged (CSS-only).
- **Quote button drag:** Custom physics (inertia, bounce, resistance, Coulomb friction) were removed; they were overengineered and didn’t work as intended. Current behavior is drag-to-move only, position saved on release. If adding motion again: (1) keep it minimal — e.g. one simple throw decay (single exponential or one time constant), no multi-parameter “realistic” model; (2) prefer CSS for follow-through (e.g. transition on release) or a tiny, well-tested library; (3) add one effect at a time and validate with the user before layering more.
- **Portfolio project drawer vs route chrome:** The open project sheet **covers** header and footer. Mount `#portfolioProjectView` in **`#portfolio-sheet-host`** (sibling after `.fade-content` in `#abs-scene`; see `portfolio/app.js` `createProjectView()` + `StudioShell.jsx`). **Canonical z-order:** **`docs/reference/LAYER-STACKING.md`**.
