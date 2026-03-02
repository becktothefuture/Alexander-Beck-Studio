# AGENTS.md

## Commands
- `npm run install:all` — One-time: install root + react-app/app + html-site
- `npm run startup` — Interactive menu: Dev (both), React only, HTML only, Install all, Build, Exit
- `npm run dev` — Both pipelines: React on 8012, HTML on 8001 (concurrently)
- `npm run dev:react` — React app dev server only (port 8012, Vite HMR)
- `npm run dev:html` — HTML site dev server only (port 8001)
- `npm run build` — React production build (minified) → `react-app/app/dist/`
- `npm run build:dev` — React unminified build + sourcemaps
- `npm run preview` — Serve React build (port 8013)
- `npm run start` — Alias for preview
- `npm run html:build` / `npm run html:build:dev` — HTML site build (isolated in `html-site/`)
- `npm run html:dev` / `npm run html:start` / `npm run html:watch` — HTML-only workflows
- No automated tests; manual testing required (all 20 modes, 60 FPS, mobile)

## Architecture
- **Primary surface:** React app at `react-app/app/` (Vite, multi-entry: index, portfolio, cv)
- **Edit** `react-app/app/src/` and `react-app/app/public/` (CSS, config, images)
- Entry: `react-app/app/src/entries/*.jsx` → pages + legacy bridge
- Legacy runtime: `react-app/app/src/legacy/` (modules, main.js, cv-init, etc.) — no imports from repo root
- Config: `react-app/app/public/config/default-config.json` (and portfolio/cv configs)
- Build: Vite → `react-app/app/dist/`
- **Isolated HTML:** `html-site/` — self-contained (source/, build-production.js, Rollup), built via `npm run html:build`

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
