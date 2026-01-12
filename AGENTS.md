# AGENTS.md

## Commands
- `npm run dev` — Dev server (port 8001, instant reload)
- `npm run build` — Production build to `public/`
- `npm start` — Serve production (port 8000)
- No automated tests; manual testing required (all 20 modes, 60 FPS, mobile)

## Architecture
- **Edit `source/` only** — Never edit `public/` (generated)
- Entry: `source/main.js` → modules in `source/modules/{core,physics,rendering,modes,ui,visual,audio,input,utils}/`
- Config: `source/config/default-config.json` (runtime settings)
- CSS: `source/css/main.css` + `tokens.css` (design tokens)
- Build: Rollup bundles to `public/js/bouncy-balls-embed.js`

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
