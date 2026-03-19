# Implementation workflow

Canonical commands and architecture live in:

- [`AGENTS.md`](../AGENTS.md) — scripts, build path, config workflow
- [`docs/development/DEV-WORKFLOW.md`](development/DEV-WORKFLOW.md) — day-to-day dev and QA
- [`docs/reference/SITE-STYLEGUIDE.md`](reference/SITE-STYLEGUIDE.md) — shell chrome buttons, tokens, and visual harmony for new on-page UI

**Build:** from repo root, `npm run build` runs `flatten:design-config` then Vite (`react-app/app/`). GitHub Pages uses the same flatten step before `vite build` (see `.github/workflows/gh-pages.yml`).

**Screenshots:** `npm run certify:screens` writes under `output/playwright/`; that path is gitignored—run locally when you need certification artifacts.

**Figma exports:** Any token/mapping dumps under `output/figma/` are gitignored and not part of the shipped app—regenerate from your design workflow if needed.
