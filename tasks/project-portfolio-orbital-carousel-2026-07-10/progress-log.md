# Progress Log

## 2026-07-10

Status: planning packet drafted; implementation not started.

Completed:

- Loaded the PRD skill and codex swarm executor skill.
- Checked project memory for the Studio Website PRD workflow.
- Confirmed Figma MCP access is rate-limited in this turn.
- Inspected active portfolio docs, runtime, CSS/control references, and content source.
- Confirmed active portfolio uses `PortfolioScrollApp` in `react-app/app/src/legacy/modules/portfolio/app.js`.
- Confirmed previous drawer host contract used `#portfolio-sheet-host`; later user decision changes the target behavior so project detail opens inside the window and the dock remains visible.
- Confirmed existing `runtime.deck` controls already provide a starting point for scroll sensitivity, card size, center Y, depth, and snapping.
- Confirmed archived slider files exist for inspiration but are reference-only.
- Created this PRD packet.
- Copied reference images into `references/` so the packet does not depend on temp clipboard paths.
- Completed four read-only PRD review lanes:
  - Architecture/integration.
  - Motion/performance.
  - Art direction/digital creative.
  - QA/release gates.
- Patched the packet based on reviewer findings:
  - Added a virtual card identity contract.
  - Added an explicit input state machine requirement.
  - Chose `portfolio.runtime.carousel` as the persisted config namespace.
  - Tightened visual proportion, dot dial, crop, CTA, and transition choreography requirements.
  - Added earlier audit migration and stronger reduced-motion/WebKit/boot-overlay gates.

Open:

- Figma MCP refresh when rate limit clears or documented fallback to durable references.
- User confirmation before implementation.

Notes:

- Existing dirty worktree files were present before this packet:
  - `react-app/app/public/css/main.css`
  - `frame-band-investigation-current.png`
- This packet intentionally does not touch those files.

## 2026-07-11

Status: Figma source refreshed through the app Figma connector.

Completed:

- Tried the official `mcp__figma` path again; it still returned the Professional plan View-seat tool-call limit.
- Used the app Figma connector successfully against file `t5pOoVMjVJ7ZF2JAl5ixhS`.
- Confirmed the file currently exposes page `259:77` (`New - Jul 2026`).
- Confirmed active card component `293:850` is available.
- Confirmed original requested node `293:910` is not present in the current file metadata.
- Identified current closed desktop source frame `304:2504`.
- Identified expansion storyboard frame `304:3048`.
- Identified desktop open/detail mock `293:983`.
- Downloaded durable current Figma screenshots into `references/`.
- Added `figma-findings-2026-07-11.md`.
- Recorded user decision that the bottom dock/buttons must always stay visible and project detail opens inside the window.
- Added `implementation-prompt.md` for actioning the PRD packet.

Open:

- User confirmation before implementation.
- Confirmed by user on 2026-07-11: bottom dock/buttons should always stay visible; project detail opens inside the window.

## 2026-07-11 Implementation Pass

Status: implementation started.

Completed:

- Re-read the implementation prompt, README, action sequence, Figma findings, system impact map, and PRDs 01-06 before editing.
- Confirmed existing dirty worktree before implementation:
  - `react-app/app/public/css/main.css`
  - `frame-band-investigation-current.png`
  - `tasks/project-portfolio-orbital-carousel-2026-07-10/`
- Tried official Figma MCP again; it is still rate-limited on the Professional View seat. `whoami` reported `alexander.beck@mrm.com`, not the requested personal account.
- Used the app Figma connector successfully for current active card context `293:850` and fresh screenshots for `304:2504` and `293:983`.
- Baseline `npm run check:site` passed; this includes lint, `check:design-config`, and build.

Open:

- Phase 1 implementation in progress: orbital geometry, bounded virtual card pool, and multi-axis input.

## 2026-07-11 Implementation Complete

Status: implementation complete; awaiting user visual review.

Completed:

- Rebuilt the portfolio route around a bounded 11-card orbital carousel backed by six canonical project records.
- Added carousel wheel, touch, mouse-drag, keyboard, snap, and virtual-card retargeting behavior.
- Reworked closed project cards to match the current Figma portrait-card proportions: 316 x 461 desktop active card, rounded image card, top gradient text, active-only CTA, hidden closed-card tags, lower dot dial, and project-authored thumbnail accents/focal points.
- Kept inactive duplicate cards lightweight by attaching video media only to the active card when available and motion is allowed.
- Added `portfolio.runtime.carousel` defaults to the canonical design config, generated runtime configs, and the portfolio panel control registry, including a separate mobile orbit Y control.
- Updated portfolio content with `thumbnailAccent`, `thumbnailPosition`, `thumbnailFocalPoint`, and explicit `thumbnailVideo: null` fields.
- Changed project detail opening to a transform-based handoff and kept the bottom dock/app frame visible while only the carousel stage is inerted behind the drawer.
- Updated `docs/reference/PORTFOLIO.md` for the orbital carousel, config namespace, virtual-card pool, active CTA, lower dot dial, and in-window detail behavior.
- Captured final visual QA screenshots in `output/playwright/orbital-carousel-qa/`:
  - `desktop-closed-final-v4.png`
  - `desktop-active-hover-final-v4.png`
  - `mobile-closed-final-v4.png`
  - `mobile-active-hover-final-v4.png`

Verification:

- `npm run check:design-config` passed.
- `git diff --check` passed.
- `npm run check:site` passed after fixing one lint issue in the new carousel fallback label.
- `ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-gate:quick` passed.
- `ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-drawer` passed.
- `ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-drawer:pointer` passed.
- `ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:canvas-spa:quick` passed.
- `ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium npm run audit:transition-flows` passed.
- `ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit npm run audit:transition-flows` passed.
- `ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows` passed.
- `ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows` passed.
- `npm run certify:screens` ran and portfolio was not listed among failures, but the command failed on existing home/about 1440 x 900 dark near-blank thresholds:
  - `home 1440x900 dark: near-blank:top-share=0.9725,unique=86,stddev=14.47`
  - `about 1440x900 dark: near-blank:top-share=0.9805,unique=33,stddev=17.81`

Open:

- User visual review of the new orbital carousel and project-detail handoff.
- Optional follow-up: investigate the unrelated `certify:screens` home/about dark near-blank thresholds.

## 2026-07-11 Release QA Fixes

Status: release QA complete; fixed bugs committed in the implementation diff.

Captured bugs:

- Desktop and mobile project detail opened without moving focus to the drawer close button.
- Mobile project detail drawer overlapped the taller mobile bottom dock because the portfolio host used the desktop `--shell-bottom-band-height` reserve instead of the mobile button-bar reserve.

Fixes:

- Added guarded close-button focus after drawer reveal, with short retries that stop once focus is inside the drawer.
- Updated the portfolio sheet host bottom inset to mirror the mobile `.shell-bottom-band` height formula at `max-width: 600px`.

Final visual QA:

- Captured and inspected:
  - `output/playwright/orbital-carousel-release-qa/desktop-01-closed.png`
  - `output/playwright/orbital-carousel-release-qa/desktop-03-open.png`
  - `output/playwright/orbital-carousel-release-qa/mobile-01-closed.png`
  - `output/playwright/orbital-carousel-release-qa/mobile-03-open.png`
- Custom release QA passed for desktop, mobile, and reduced-motion states:
  - 11 virtual cards.
  - one active card.
  - 42 dot-dial points.
  - active CTA visible and inside the card.
  - active card clears the dock.
  - open drawer stays above the dock.
  - carousel stage is inert while detail is open.
  - `#app-frame` remains non-inert.
  - close button receives focus.
  - no page or console errors.

Final verification:

- `npm run check:site` passed.
- `ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-gate:quick` passed.
- `ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-drawer` passed.
- `ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-drawer:pointer` passed.
- `ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:canvas-spa:quick` passed.
- `ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium npm run audit:transition-flows` passed.
- `ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit npm run audit:transition-flows` passed.
- `ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows` passed.
- `ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows` passed.
- `npm run certify:screens` ran; portfolio screenshots passed, but the command still fails on existing home/about desktop dark near-blank thresholds. The captured home/about screenshots render visible content and are not portfolio regressions.
