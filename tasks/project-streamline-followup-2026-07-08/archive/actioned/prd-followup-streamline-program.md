# PRD: Follow-Up Project Streamline Programme

## 1. Introduction/Overview

This programme turns the latest repo-wide review into a sequenced set of implementation PRDs. The project is currently healthy: the root site gate, simulation validation, route audits, portfolio gate, transition audits, and screenshot certification pass. The remaining work is about removing drift paths before they become future regressions.

## 2. Goals

- Keep the site visually and behaviorally stable while reducing duplicated ownership.
- Strengthen validation before touching route, boot, simulation, and transition behavior.
- Make setup, CI, and local verification tell the same story.
- Normalize visible content/style ownership across home, portfolio, CV/About, and styleguide.
- Keep a centralized action log for implementation and review.

## 3. User Stories

### US-001: Track all follow-up tasks in one hub
**Description:** As a maintainer, I want all follow-up PRDs in one folder so implementation does not drift across old plans.

**Acceptance Criteria:**
- [ ] The packet has a README, action sequence, progress log, programme PRD, and individual PRDs.
- [ ] Every PRD has a clear status in `progress-log.md`.
- [ ] Every implementation pass updates the progress log.

### US-002: Sequence work by dependency and risk
**Description:** As an implementation agent, I want a dependency-aware order so I do not refactor route behavior before validators are ready.

**Acceptance Criteria:**
- [ ] Setup and validator PRDs come before route/transition PRDs.
- [ ] Visual/content cleanup comes after route ownership decisions.
- [ ] Final documentation triage comes after code-facing decisions.

### US-003: Enforce gates between phases
**Description:** As a reviewer, I want mandatory gates before proceeding so each phase leaves the project in a releasable state.

**Acceptance Criteria:**
- [ ] Each phase has explicit shell commands.
- [ ] Route, transition, and visual changes require browser verification.
- [ ] **Verify in browser using dev-browser skill** for UI-visible changes.

## 4. Functional Requirements

- FR-1: The programme must keep every follow-up PRD in `tasks/project-streamline-followup-2026-07-08/`.
- FR-2: The programme must keep `progress-log.md` current.
- FR-3: The programme must require `npm run check:site` before any phase is considered complete.
- FR-4: The programme must require browser audits for route, boot, transition, portfolio, and visual changes.
- FR-5: The programme must allow `not-actioned` only with rationale and verification evidence.

## 5. Non-Goals

- No implementation in this planning pass.
- No visible design changes unless a later implementation PRD explicitly requires them.
- No change to simulation physics, canvas rendering, or portfolio drawer behavior as part of the programme plan itself.

## 6. Design Considerations

The programme must preserve the current site language: shared wall/frame shell, fixed route topbar contract, portfolio drawer above chrome, and Daily Simulation material rules.

## 7. Technical Considerations

The highest-risk surfaces are route descriptors, boot readiness, Daily Focus routing, legacy page-nav compatibility, and generated config/build gates. These must be handled in dependency order.

## 8. Success Metrics

- Every PRD reaches `complete`, `not-actioned`, or `blocked` with evidence.
- Final full gate passes.
- No new warning or validation noise is introduced.
- The user can inspect progress from one folder.

## 9. Open Questions

- Should the final programme closeout be committed and deployed immediately, or reviewed locally first?
