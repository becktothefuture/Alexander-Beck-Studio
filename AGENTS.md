# AGENTS.md

## Commands
- `npm run install:all` — One-time: install root + react-app/app
- `npm run startup` — Interactive menu: React dev, Install all, Build, Exit
- `npm run dev` — React app dev server on 8012
- `npm run dev:react` — React app dev server only (port 8012, Vite HMR)
- `npm run build` — React production build (minified) → `react-app/app/dist/`
- `npm run build:dev` — React unminified build + sourcemaps
- `npm run preview` — Serve React build (port 8013)
- `npm run start` — Alias for preview
- No automated tests; manual testing required (all 20 modes, 60 FPS, mobile)

## Architecture
- **Primary surface:** React app at `react-app/app/` (Vite, multi-entry: index, portfolio, cv)
- **Edit** `react-app/app/src/` and `react-app/app/public/` (CSS, config, images)
- Entry: `react-app/app/src/entries/*.jsx` → pages + legacy bridge
- Legacy runtime: `react-app/app/src/legacy/` (modules, main.js, cv-init, etc.) — no imports from repo root
- Config: `react-app/app/public/config/default-config.json` (and portfolio/cv configs)
- Build: Vite → `react-app/app/dist/`

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
