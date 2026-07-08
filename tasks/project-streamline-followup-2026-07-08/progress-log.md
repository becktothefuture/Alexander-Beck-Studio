# Studio Website Follow-Up Progress Log

Created: 2026-07-08

## Status Legend

- `draft`
- `review-needed`
- `not-started`
- `in-progress`
- `blocked`
- `not-actioned`
- `complete`

## PRD Status

| Order | PRD | Status | Owner | Last update | Notes |
| ---: | --- | --- | --- | --- | --- |
| 0 | `prd-followup-streamline-program.md` | review-needed | Lead planning agent | 2026-07-08 | Programme PRD created; awaiting senior review. |
| 1 | `prd-setup-environment-and-ci-parity.md` | complete | Codex lead | 2026-07-08 | CI now checks generated-config parity before build; environment template and parity/precommit wording use current commands. |
| 2 | `prd-simulation-validation-hardening.md` | complete | Codex lead | 2026-07-08 | Validator now checks Daily route ID coverage, required legacy label keys, surface enum, and reviewStatus enum. |
| 3 | `prd-route-source-validation.md` | complete | Codex lead | 2026-07-08 | Route source validation now checks routes.js, Vite inputs, SiteApp maps, and documented future descriptor fields. |
| 4 | `prd-direct-boot-readiness-ownership.md` | complete | Codex lead | 2026-07-08 | Direct boot readiness ownership is documented by route family; no timing behavior changed. |
| 5 | `prd-transition-compatibility-boundary.md` | complete | Codex lead | 2026-07-08 | page-nav fallback cleanup now preserves shell-owned SPA transition phase; compatibility boundary documented. |
| 6 | `prd-build-warning-html-entry-cleanup.md` | complete | Codex lead | 2026-07-08 | Lab HTML entries now link root public CSS; lab boot classification and accepted chunk warning are documented. |
| 7 | `prd-content-label-source-alignment.md` | review-needed | Lead planning agent | 2026-07-08 | Covers `About Me` casing and content source ownership. |
| 8 | `prd-portfolio-legacy-template-retirement.md` | review-needed | Lead planning agent | 2026-07-08 | Covers `PortfolioPage.jsx` and `portfolio-body.html` support/retirement decision. |
| 9 | `prd-route-topbar-css-ownership.md` | review-needed | Lead planning agent | 2026-07-08 | Covers shared route-topbar CSS ownership and visual parity. |
| 10 | `prd-backlog-historical-docs-triage.md` | review-needed | Lead planning agent | 2026-07-08 | Covers historical backlog/docs severity cleanup. |

## Review Log

| Date | Reviewer | Scope | Result | Notes |
| --- | --- | --- | --- | --- |
| 2026-07-08 | Senior developer subagent | Initial follow-up PRD packet | changes-requested | Requested route/boot split, copy-pasteable preview gates, and stronger evidence log. |
| 2026-07-08 | Senior developer subagent | Revised follow-up PRD packet | approved | Approved after required revisions; optional route negative-proof criterion promoted into `prd-route-source-validation.md`. |

## Baseline Evidence

Add a row before implementation starts and whenever baseline is refreshed.

| Date | Commands | Result | Artifacts | Notes |
| --- | --- | --- | --- | --- |
| 2026-07-08 | Audit baseline from review turn | pass | `output/playwright/screens-certification/report.json` | `check:site`, `sim:validate`, boot overlay, canvas SPA quick, daily focus boundary, portfolio gate quick, Chromium/WebKit transition flows, and screen certification passed during planning review. |
| 2026-07-08 | Local implementation baseline | pass | `output/playwright/screens-certification/report.json` | Fresh `npm run check:site`, `npm run sim:validate`, and `npm run certify:screens` passed before actioning PRD 1. Build reproduced known public CSS and chunk warnings covered by PRD 6. |

## Exit Gate Evidence

Add one row per PRD completion attempt.

| Date | PRD | Commands run | Result | Artifacts | Reviewer/signoff | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-07-08 | `prd-setup-environment-and-ci-parity.md` | `git diff --check`; `npm run sim:validate`; `npm run check:site` | pass | n/a | Codex lead | `check:site` passed; known Vite public CSS and chunk warnings remained baseline warnings for PRD 6. |
| 2026-07-08 | `prd-simulation-validation-hardening.md` | `git diff --check`; `npm run sim:validate`; `npm run check:site`; `ABS_DEV_URL=http://localhost:8013 npm run audit:daily-focus-boundary`; `ABS_DEV_URL=http://localhost:8013 npm run audit:simulation-focus` | pass | preview audit JSON in command output | Codex lead | Negative proofs passed for missing `DAILY_LAB_ROUTE_IDS`, missing legacy label key, and invalid `reviewStatus`; files restored before final validation. |
| 2026-07-08 | `prd-route-source-validation.md` | `git diff --check`; `npm run sim:validate`; `npm run check:site`; `npm run certify:screens`; `ABS_DEV_URL=http://localhost:8013 npm run audit:boot-overlay`; `ABS_DEV_URL=http://localhost:8013 npm run audit:canvas-spa`; `ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-gate`; `ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:transition-flows`; `ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:transition-flows` | pass | `output/playwright/screens-certification/report.json`; preview audit JSON in command output | Codex lead | Negative proofs passed for route registry path drift and missing Vite input; files restored before final validation. |
| 2026-07-08 | `prd-direct-boot-readiness-ownership.md` | `git diff --check`; `npm run check:site`; `npm run certify:screens`; `ABS_DEV_URL=http://localhost:8013 npm run audit:boot-overlay`; `ABS_DEV_URL=http://localhost:8013 npm run audit:daily-focus-boundary`; `ABS_DEV_URL=http://localhost:8013 npm run audit:canvas-spa`; `ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-gate`; `ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:transition-flows`; `ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:transition-flows` | pass | `output/playwright/screens-certification/report.json`; preview audit JSON in command output | Codex lead | Docs/comment-only ownership clarification; boot overlay verified on 21 direct route states. |
| 2026-07-08 | `prd-transition-compatibility-boundary.md` | `git diff --check`; `npm run check:site`; `npm run certify:screens`; `ABS_DEV_URL=http://localhost:8013 npm run audit:boot-overlay`; `ABS_DEV_URL=http://localhost:8013 npm run audit:canvas-spa`; `ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-gate`; `ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:transition-flows`; `ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows`; `ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:transition-flows`; `ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit ABS_TRANSITION_STRICT_RAF=1 ABS_TRANSITION_HARD_TIMEOUT_MS=300000 npm run audit:transition-flows` | pass | `output/playwright/screens-certification/report.json`; preview audit JSON in command output | Codex lead | Transition ownership change verified with normal and strict Chromium/WebKit transition audits. |
| 2026-07-08 | `prd-build-warning-html-entry-cleanup.md` | `rg -n "%BASE_URL%\\.\\./css|/\\.\\./css|\\.\\./css" react-app/app/lab/*.html`; `git diff --check`; `npm run check:site`; lab route CSS Playwright check; `npm run certify:screens`; `ABS_DEV_URL=http://localhost:8013 npm run audit:boot-overlay`; `ABS_DEV_URL=http://localhost:8013 npm run audit:canvas-spa`; `ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-gate`; `ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:transition-flows`; `ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:transition-flows` | pass | `output/playwright/screens-certification/report.json`; preview audit JSON in command output | Codex lead | Build no longer emits stale public CSS warnings; `/lab/wall-repel.html` loaded normalize/tokens/main/portfolio CSS with 200 responses. |

## Decision Evidence

Use this table for blocked or `not-actioned` decisions.

| Date | PRD | Decision | Rationale | Evidence | User guidance needed |
| --- | --- | --- | --- | --- | --- |

## Implementation Log

Add entries here as PRDs are actioned.

```text
YYYY-MM-DD - PRD - status - summary - verification
2026-07-08 - prd-setup-environment-and-ci-parity.md - complete - Added CI generated-config parity before build, refreshed Codex environment setup actions, and clarified parity/precommit gate wording - git diff --check, sim:validate, check:site passed
2026-07-08 - prd-simulation-validation-hardening.md - complete - Added stricter Daily route, label, surface, and reviewStatus validation plus missing legacy labels exposed by the new rule - negative proofs, git diff --check, sim:validate, check:site, daily-focus-boundary, and simulation-focus passed
2026-07-08 - prd-route-source-validation.md - complete - Added route registry, Vite input, and SiteApp map drift validation with route descriptor documentation - negative proofs, check:site, certify:screens, boot-overlay, canvas-spa, portfolio-gate, and Chromium/WebKit transition flows passed
2026-07-08 - prd-direct-boot-readiness-ownership.md - complete - Documented route-family direct boot readiness owners and preserved current timing behavior - check:site, certify:screens, boot-overlay, daily-focus-boundary, canvas-spa, portfolio-gate, and Chromium/WebKit transition flows passed
2026-07-08 - prd-transition-compatibility-boundary.md - complete - Guarded hard-navigation compatibility cleanup from shell-owned SPA transition phase and documented page-nav as fallback-only - check:site, certify:screens, boot-overlay, canvas-spa, portfolio-gate, normal transition audits, and strict Chromium/WebKit transition audits passed
2026-07-08 - prd-build-warning-html-entry-cleanup.md - complete - Repointed lab CSS links to root public CSS and documented lab/chunk warning policy - check:site, lab route CSS check, certify:screens, boot-overlay, canvas-spa, portfolio-gate, and Chromium/WebKit transition flows passed
```
