# Bottom Shell Tabs Progress Log

Created: 2026-07-09

## Status Legend

- `draft`
- `review-needed`
- `not-started`
- `in-progress`
- `blocked`
- `not-actioned`
- `complete`

## Packet Status

| Item | Status | Owner | Last update | Notes |
| --- | --- | --- | --- | --- |
| Initial implementation plan | draft | Codex lead | 2026-07-09 | Created from screenshot, repo inspection, and existing shell contracts. |
| Product design review | complete | Subagent | 2026-07-09 | Requested state matrix, Contact canon, mobile/footer rules, topbar hierarchy. |
| Creative review | complete | Subagent | 2026-07-09 | Requested restrained token-based skeuomorphism, Contact route concept, mobile composition spec. |
| Development review | complete | Subagent | 2026-07-09 | Requested route/gate display state, Contact build entry, `#main-links` migration, geometry consumer coverage. |
| Business analysis / PRD drafting | complete | Subagent + Codex lead | 2026-07-09 | PRD split revised and six PRDs drafted. |
| Independent PRD review | complete | Subagent | 2026-07-09 | Requested Contact-first sequencing, explicit gate state machine, validation-script migration, dock layer ownership, and resolved implementation decisions. |
| Implementation | complete | Codex lead | 2026-07-09 | All six PRDs actioned, visually inspected, archived, verified, and prepared for the final closeout commit. |

## Review Log

| Date | Reviewer | Scope | Result | Notes |
| --- | --- | --- | --- | --- |
| 2026-07-09 | Product design subagent | Initial implementation plan | changes-requested | Active state during gates, Contact route canon, topbar hierarchy, footer/dock coexistence, mobile/a11y criteria. |
| 2026-07-09 | Creative subagent | Initial implementation plan | changes-requested | Constrain skeuomorphism to existing chrome tokens; add mobile composition and Contact route concept. |
| 2026-07-09 | Development subagent | Initial implementation plan | changes-requested | Add Contact build/direct-load ownership, update home readiness/legacy trigger migration, expand geometry consumers. |
| 2026-07-09 | Business analyst subagent | PRD structure | changes-requested | Revised PRD split into route/state, Contact, geometry, visual system, cleanup/compatibility, release/docs. |
| 2026-07-09 | Independent PRD reviewer | Draft PRD packet | changes-requested | Contact ownership split, gate pending reset, stale validation scripts, open decisions, dock layer, and commit wording needed revision. |

## PRD Status

| Order | PRD | Status | Owner | Last update | Notes |
| ---: | --- | --- | --- | --- | --- |
| 1 | `archive/actioned/prd-contact-route-promotion.md` | complete | Codex lead | 2026-07-09 | Contact is route-backed at `/contact.html`; direct-load, home Contact, inline Let's chat, copy feedback, screen certification, and boot overlay verified. Commit: `6552ac53`. |
| 2 | `archive/actioned/prd-route-and-tab-state-foundation.md` | complete | Codex lead | 2026-07-09 | Added shell-owned route dock, canonical tab descriptors, explicit gated pending state, gate lifecycle events, and accessibility state rules; active/pending/browser smoke, certification, boot overlay, and site checks passed. Commit: `c47c98a9`. |
| 3 | `archive/actioned/prd-bottom-frame-geometry.md` | complete | Codex lead | 2026-07-09 | Added directional shell wall/window insets, enlarged bottom dock band, dock-outside-wall positioning, and updated geometry consumers/docs; bottom shell geometry, canvas SPA, portfolio gate, certification, and site checks passed. Commit: `c71de6b0`. |
| 4 | `archive/actioned/prd-shell-tab-visual-system.md` | complete | Codex lead | 2026-07-09 | Added seated active/pending tab treatment, Home icon-only state, styleguide specimen, component-library docs, and mobile caption/dock collision guard; site checks, focused visual smoke, and screen certification passed. Commit: `de0e104f`. |
| 5 | `archive/actioned/prd-route-chrome-cleanup-and-legacy-compat.md` | complete | Codex lead | 2026-07-09 | Removed duplicate Home/Contact/Portfolio/CV primary text nav, kept route topbars as back/sound utility chrome, migrated audits and legacy selectors to shell route tabs, and verified dock-driven gates/routes. Commit: `2066b6b9`. |
| 6 | `archive/actioned/prd-release-verification-and-docs.md` | complete | Codex lead | 2026-07-09 | Updated canonical docs, fixed final footer-caption/dock visual overlap found during screenshot inspection, reran full release verification, archived actioned PRDs, and prepared final closeout commit. |

## Baseline Evidence

| Date | Commands | Result | Artifacts | Notes |
| --- | --- | --- | --- | --- |
| 2026-07-09 | `git diff --check`; `npm run check:site`; `npm run certify:screens`; `ABS_DEV_URL=http://localhost:8014 npm run audit:boot-overlay`; focused Playwright Contact route smoke | pass | `output/playwright/screens-certification/report.json` | PRD 1 Contact route promotion baseline. Preview used port 8014 because 8013 was already occupied. |

## Exit Gate Evidence

| Date | PRD | Commands run | Result | Artifacts | Reviewer/signoff | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-07-09 | `prd-contact-route-promotion.md` | `git diff --check`; `npm run check:site`; `npm run certify:screens`; `ABS_DEV_URL=http://localhost:8014 npm run audit:boot-overlay`; focused Playwright smoke for `/contact.html`, home Contact link, inline Let's chat, copy feedback | pass | `output/playwright/screens-certification/report.json` | Codex lead | Contact added to route registry, Vite input, SiteApp, direct boot audit, and screen certification. |
| 2026-07-09 | `prd-route-and-tab-state-foundation.md` | `git diff --check`; `npm run check:site`; focused Playwright shell dock active/pending smoke; `npm run certify:screens`; `ABS_DEV_URL=http://localhost:8014 npm run audit:boot-overlay` | pass | `output/playwright/screens-certification/report.json` | Codex lead | Home/Contact active tabs, Portfolio pending gate state without `aria-current`, dismiss reset, successful unlock to Portfolio, and browser back one-active-tab invariant verified. |
| 2026-07-09 | `prd-bottom-frame-geometry.md` | `git diff --check`; `npm run check:site`; focused Playwright bottom shell geometry measurement; `ABS_DEV_URL=http://localhost:8014 npm run audit:canvas-spa`; `ABS_DEV_URL=http://localhost:8014 npm run audit:portfolio-gate`; `npm run certify:screens` | pass | `output/playwright/screens-certification/report.json` | Codex lead | Dock sits outside the inner wall on mobile and desktop, footer remains inside the wall, route tabs do not overlap, canvas buffer survives route round-trips, and portfolio drawer still owns the inner-window geometry. |
| 2026-07-09 | `prd-shell-tab-visual-system.md` | `git diff --check`; `npm run check:site`; focused Playwright shell tab visual smoke for home/contact/styleguide; `npm run certify:screens` | pass | `output/playwright/shell-tab-visual-prd4/`; `output/playwright/screens-certification/report.json` | Codex lead | Active tab uses filled seated plate and lip, pending gated state is visually present without `aria-current`, Home is icon-only with accessible label, styleguide specimen uses production tab descriptors, and mobile edge caption no longer intersects the dock. |
| 2026-07-09 | `prd-route-chrome-cleanup-and-legacy-compat.md` | `git diff --check`; `npm run check:site`; focused Playwright route chrome cleanup smoke; `npm run certify:screens`; `ABS_DEV_URL=http://localhost:8014 npm run audit:boot-overlay`; `ABS_DEV_URL=http://localhost:8014 npm run audit:modal-unified`; `ABS_DEV_URL=http://localhost:8014 npm run audit:transition-flows` | pass | `output/playwright/screens-certification/report.json`; transition audit console PASS | Codex lead | Home has no `#main-links`, Contact/Portfolio/CV topbars have no duplicate text nav, dock opens gated Portfolio/About states, Contact navigates as a route, and legacy/audit selectors use shell route tabs. |
| 2026-07-09 | `prd-release-verification-and-docs.md` | `git diff --check`; `npm run check:site`; `npm run certify:screens`; `ABS_DEV_URL=http://localhost:8014 npm run audit:boot-overlay`; `ABS_DEV_URL=http://localhost:8014 npm run audit:canvas-spa`; `ABS_DEV_URL=http://localhost:8014 npm run audit:portfolio-gate`; `ABS_DEV_URL=http://localhost:8014 ABS_BROWSER=chromium npm run audit:transition-flows`; `ABS_DEV_URL=http://localhost:8014 ABS_BROWSER=webkit npm run audit:transition-flows`; `ABS_DEV_URL=http://localhost:8014 ABS_BROWSER=chromium ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows`; `ABS_DEV_URL=http://localhost:8014 ABS_BROWSER=webkit ABS_TRANSITION_STRICT_RAF=1 ABS_TRANSITION_HARD_TIMEOUT_MS=300000 npm run audit:transition-flows` | pass | `output/playwright/screens-certification/report.json`; inspected `home-1440x900-dark.png`, `contact-1440x900-dark.png`, `cv-1440x900-dark.png`, `cv-375x812-dark.png`, plus portfolio route captures | Codex lead | Screenshot inspection found footer-caption/dock overlap on Contact/CV; fixed in shared `main.css`, regenerated screenshots, re-inspected, and reran route/canvas/transition audits. |

## Implementation Log

```text
YYYY-MM-DD - PRD - status - summary - verification
2026-07-09 - prd-contact-route-promotion.md - complete - Added `/contact.html` direct route, shell-native Contact page, copy email interaction, Contact link routing, legacy modal compatibility migration, and Contact audit/certification coverage - git diff --check, check:site, certify:screens, boot-overlay, and focused Playwright smoke passed
2026-07-09 - prd-route-and-tab-state-foundation.md - complete - Added shell route dock descriptors, dock mount in the footer transition surface, explicit pending gate lifecycle events, and dock accessibility state rules - git diff --check, check:site, focused dock active/pending smoke, certify:screens, and boot-overlay passed
2026-07-09 - prd-bottom-frame-geometry.md - complete - Added route dock bottom band, directional shell wall/window geometry tokens, fixed dock placement outside the wall, and updated portfolio inner-window consumers/docs - git diff --check, check:site, bottom geometry smoke, canvas SPA audit, portfolio gate audit, and certify:screens passed
2026-07-09 - prd-shell-tab-visual-system.md - complete - Added seated active/pending tab treatment, styleguide dock specimen, component-library docs, and mobile caption/dock collision guard - git diff --check, check:site, focused visual smoke, and certify:screens passed
2026-07-09 - prd-route-chrome-cleanup-and-legacy-compat.md - complete - Removed duplicate route text nav, kept topbars as utility chrome, migrated audits/scripts to shell route tabs, and made legacy gate trigger bindings optional - git diff --check, check:site, focused cleanup smoke, certify:screens, boot-overlay, modal-unified, and transition-flows passed
2026-07-09 - prd-release-verification-and-docs.md - complete - Updated canonical shell docs, fixed final footer-caption/dock overlap found in screenshots, archived actioned PRDs, and recorded full release evidence - git diff --check, check:site, certify:screens, boot-overlay, canvas-spa, portfolio-gate, Chromium/WebKit transition-flows, and Chromium/WebKit strict transition-flows passed
```

## Local Commits

| Commit | Summary | PRD |
| --- | --- | --- |
| `ea6151a9` | Add bottom shell tabs PRD packet | Planning packet |
| `6552ac53` | Add contact route | PRD 1 |
| `c47c98a9` | Add shell route dock state | PRD 2 |
| `c71de6b0` | Add bottom shell geometry | PRD 3 |
| `de0e104f` | Add shell tab visual system | PRD 4 |
| `2066b6b9` | Clean up route chrome navigation | PRD 5 |
