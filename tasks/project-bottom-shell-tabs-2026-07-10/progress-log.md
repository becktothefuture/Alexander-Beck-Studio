# Progress Log

## 2026-07-10

Status: implemented and verified.

Completed:

- Reverted the previous bottom-shell-tabs implementation with focused revert commits.
- Confirmed the revert did not overlap the unrelated dirty worktree files present before this request.
- Completed four read-only review lanes:
  - Product and material design.
  - Shell geometry and canvas impact.
  - Routing, gates, and content.
  - Verification and audit migration.
- Created draft PRD packet.
- Completed independent PRD review and patched implementation-readiness gaps:
  - Added Contact/About multi-entry route requirements.
  - Corrected config parity gate ordering.
  - Clarified Phase 1 as route manifest plus shell tab skeleton, not full content/gate completion.
  - Added stale modal/session compatibility requirements.
  - Converted open questions into recommended defaults pending user confirmation.
- Ran a second independent PRD readiness review. Result: `needs_revision`; patching those findings before implementation.
- Ran final reviewer check. Remaining issue was Contact modal removal missing `DailyFocusShellBridge.jsx`; patched `prd-04` and `implementation-prompt.md`.
- Final focused reviewer confirmation returned `FINAL_READINESS: ready`.

Completed:

- PRD 01 route model and bottom-tab skeleton implementation:
  - Added Contact and About route definitions and direct Vite entries.
  - Mapped `/cv.html` and `/cv` to the non-gated About route.
  - Added persistent route-derived bottom tabs with stable `data-route-tab` selectors.
  - Changed locked Portfolio route state to stay on `/portfolio.html`.
  - Updated home readiness away from exclusive `#main-links` dependency.
  - Validation: `git diff --check`, `npm run lint --prefix react-app/app`, `npm run build`, `test -f react-app/app/dist/contact.html`, `test -f react-app/app/dist/about.html`, `npm run check:design-config`.
- PRD 02/03 initial shell geometry and tab material implementation:
  - Added bottom shell band geometry and scoped tab material tokens/styles.
  - Kept `#simulations` as the resized window/canvas/physics rect.
  - Updated `#portfolio-sheet-host` bottom geometry to match the resized window.
- PRD 04/05 initial content migration:
  - Added Contact route content with preserved email copy behavior.
  - Archived current CV/About content to `react-app/app/src/content/archive/contents-cv-about-2026-07.json`.
  - Replaced About route with centered `Coming soon`.
  - Removed Contact/CV/Portfolio modal DOM from the React shell and stopped normal Contact/CV/Portfolio modal bootstrap.
- PRD 06 initial in-window Portfolio gate:
  - Added locked Portfolio route content with invite-code inputs.
  - Portfolio access now writes first-party cookie `abs_portfolio_ok`.

Open:

- None for this packet. Awaiting user review/confirmation.

Completed:

- PRD 08 Instrument Wake implementation:
  - Retargeted route transitions away from the full UI wrapper so footer and bottom tabs remain stable.
  - Added optimistic active-tab state so the selected tab light leads route content changes.
  - Added the masked in-window highlight pass and reduced-motion fallback.
  - Documented the transition contract in `docs/reference/TRANSITION-ORCHESTRATION.md`.
- PRD 07 audit migration and release gate:
  - Migrated modal, Portfolio gate, drawer, transition, boot overlay, screen certification, and catalog validation checks to route/tab surfaces.
  - Verified stale compatibility for `?gate=portfolio`, `?gate=cv`, old CV params, and old modal session flags.
  - Verified Portfolio unlock persistence with `abs_portfolio_ok` cookie and reset after storage clear.
- Final validation:
  - `git diff --check`
  - `npm run check:design-config`
  - `npm run audit:modal-unified`
  - `npm run audit:portfolio-gate`
  - `npm run audit:transition-flows` for Chromium, WebKit, Chromium strict RAF, WebKit strict RAF, and Chromium reduced motion.
  - `npm run audit:boot-overlay`
  - `npm run audit:portfolio-drawer`
  - `npm run audit:portfolio-drawer:pointer`
  - `npm run certify:screens`
  - `npm run check:site`

User confirmations received:

- `/about.html` and `/cv.html` should be the same page.
- Locked Portfolio stays on `/portfolio.html`.
- Portfolio unlock persists in browser site storage until cache/site storage is cleared.
- The inner wall area is now called the `window`.
- Contact modal content becomes the Contact window content.
- Old Contact/CV modal implementations should be fully removed.
- Window content transition should use Instrument Wake.

Baseline notes:

- Existing dirty files unrelated to the reverted implementation remain in the worktree.
- The previous implementation packet was removed by the revert.
