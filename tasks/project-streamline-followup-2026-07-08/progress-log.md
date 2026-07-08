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
| 3 | `prd-route-source-validation.md` | review-needed | Lead planning agent | 2026-07-08 | Covers route identity drift validation without behavior refactor. |
| 4 | `prd-direct-boot-readiness-ownership.md` | review-needed | Lead planning agent | 2026-07-08 | Covers direct route boot readiness ownership after route validation is stronger. |
| 5 | `prd-transition-compatibility-boundary.md` | review-needed | Lead planning agent | 2026-07-08 | Covers page-nav compatibility mutations and SPA owner boundary. |
| 6 | `prd-build-warning-html-entry-cleanup.md` | review-needed | Lead planning agent | 2026-07-08 | Covers public CSS build warnings, lab boot classification, and chunk warning policy. |
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
```
