# AGENTS.md

## Commands
- `npm run startup` — Interactive menu: dev, build preview, dual, watch, React app, or build-only
- `npm run dev` — Dev server (port 8001, instant reload)
- `npm run build` — Production build to `dist/`
- `npm start` — Serve production (port 8000)
- `npm run react:dev` — React app dev server (port 8012, Vite HMR); from repo root
- `npm run react:build` — React app production build; from repo root
- `npm run react:preview` — React app preview (port 8013); from repo root
- No automated tests; manual testing required (all 20 modes, 60 FPS, mobile)

## Architecture
- **Edit `source/` only** — Never edit `dist/` (generated)
- Entry: `source/main.js` → modules in `source/modules/{core,physics,rendering,modes,ui,visual,audio,input,utils}/`
- Config: `source/config/default-config.json` (runtime settings)
- CSS: `source/css/main.css` + `tokens.css` (design tokens)
- Build: Rollup bundles to `dist/js/app.js` + `dist/js/shared.js`

## HTML + React parity
- **Two surfaces**: The HTML site (`source/`, `dist/`) and the React app (`react-app/`) must stay in sync for layout, chrome, and config-driven behaviour.
- When changing layout, spacing, tokens, or shared UI (e.g. logo, nav, panels): apply the same change in **both** places:
  - **HTML**: `source/` (and optionally refresh `dist/` via build).
  - **React**: `react-app/source-snapshot/` (CSS, tokens, state, control-registry) and `react-app/app/src/legacy/` (JS that runs inside the React app). Update `react-app/source-snapshot/config/default-config.json` if the root `source/config/default-config.json` is changed.

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
