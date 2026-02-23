# React Conversion Workspace

This folder contains the isolated React conversion of the Alexander Beck Studio Website.

## Structure
- `app/` - Vite React app (multi-entry)
- `conversion/` - migration artifacts, contracts, parity docs
- `source-snapshot/` - frozen source copy created during bootstrap

## Run
From `react-app/app`:

```bash
npm install
npm run dev:react       # React app on http://localhost:8002
npm run dev:source      # Original source app on http://localhost:8001
npm run dev:side-by-side
npm run build
```

## Routes / Entries
- `http://localhost:8002/`
- `http://localhost:8002/portfolio.html`
- `http://localhost:8002/cv.html`

## Migration Approach
- Bridge-first integration: React mounts markup and boots existing legacy runtime modules.
- No edits are made to original `source/` files for conversion.
- Shared frame architecture is represented by reusable React shell + page-specific templates.
- Portfolio soft-gate parity is preserved:
  - direct `portfolio.html` access without `sessionStorage.abs_portfolio_ok` redirects to `index.html`
  - with token present, portfolio route loads normally

## Parity Workflow
1. Run source app on `8001` and React app on `8002`.
2. Capture side-by-side screenshots at `1440`, `1024`, `768`, `390`.
3. Validate interaction parity manually (modals, transitions, portfolio/cv behavior).
4. Log findings in `conversion/parity-report.md`.

## Deviation Policy
- Discuss-first: no React modernization that changes behavior/visuals without explicit approval.

## Proposed Simplification (Post-Parity)
- Keep current parity bridge as-is for launch stability.
- Next pass: split each page into:
  - `PageFrame` (shared chrome shell)
  - `SceneContent` (home / portfolio / cv scene body)
  - `useLegacyBoot(page)` (single boot contract)
- Reason: cleaner React ownership boundaries while preserving selectors required by legacy modules.
