# Bottom Shell Tabs PRD Packet

Created: 2026-07-09

This packet plans and tracks the bottom-shell tab navigation redesign shown in the reference screenshot. The intended change moves primary route actions out of the inner wall, expands the bottom frame/wall area to house skeuomorphic tab controls, makes the active route visually persistent, and promotes Contact from modal-only content to a real route.

## Contents

- `implementation-plan.md` - initial codebase-grounded plan for review.
- `progress-log.md` - status, review, verification, and commit evidence.
- `review-findings.md` - subagent review synthesis.
- `action-sequence.md` - dependency order and validation gates.
- `prd-*.md` - implementation-ready product requirement documents.

## Working Rules

- Keep the home route as the baseline shell contract.
- Preserve the centered portfolio deck/card composition.
- Do not change simulation concepts or canvas physics unless a PRD explicitly requires geometry adaptation.
- Treat the bottom dock as shared shell chrome, not page-local route chrome.
- Keep `#portfolio-sheet-host` above header/footer and aligned with the inner wall contract.
- Preserve gate friction for Portfolio/About unless a PRD explicitly changes the access model.
- Commit only intended files; this checkout already contains unrelated uncommitted simulation/config edits.
- This request explicitly asks for commits while actioning the PRDs. Keep commits scoped per PRD and stage only intended files.
- Verify from production preview before calling UI work release-ready.
