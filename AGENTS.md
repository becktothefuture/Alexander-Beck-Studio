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
- `npm run certify:screens` — Screenshot certification for home, portfolio, and CV across critical breakpoints/themes
- `npm run validate:html-fragments` — Validate partial HTML templates
- No automated tests; manual testing required (all 20 modes, 60 FPS, mobile)

## Architecture
- **Primary surface:** React app at `react-app/app/` (Vite, multi-entry: index, portfolio, cv)
- **Edit** `react-app/app/src/` and `react-app/app/public/` (CSS, config, images)
- Entry: `react-app/app/src/entries/*.jsx` → pages + legacy bridge
- Legacy runtime: `react-app/app/src/legacy/` (modules, main.js, cv-init, etc.) — no imports from repo root
- **Canonical design config:** `react-app/app/public/config/design-system.json`
- **Generated config outputs:** `react-app/app/public/config/default-config.json`, `shell-config.json`, `portfolio-config.json`, `cv-config.json`
- Build flattening: root `npm run build` runs `flatten:design-config` before Vite build. A direct `react-app/app` build can bypass flattening, so prefer building from the repo root.
- Build: Vite → `react-app/app/dist/`

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
