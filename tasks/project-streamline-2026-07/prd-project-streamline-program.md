# PRD: Project Streamline Program

## 1. Introduction/Overview

Coordinate the Studio Website streamlining work as one program so validation, routing, design contracts, setup hygiene, and documentation cleanup are actioned in a safe order. The program prevents isolated fixes from creating new drift across the React shell, legacy runtime, simulation catalog, route docs, and visual system.

## 2. Goals

- Turn the repo-wide review into an executable sequence of focused PRDs.
- Restore trust in validation before larger architecture changes.
- Keep route, simulation, design, and documentation contracts aligned.
- Require clear QA gates before dependent work proceeds.
- Maintain a visible progress log for future agents and developer handoff.

## 3. User Stories

### US-001: Maintain a central action packet
**Description:** As a developer, I want all streamlining PRDs and status logs in one folder so future implementation sessions can start from a single source.

**Acceptance Criteria:**
- [ ] `tasks/project-streamline-2026-07/README.md` lists every PRD in the packet.
- [ ] `tasks/project-streamline-2026-07/action-sequence.md` defines the order of work.
- [ ] `tasks/project-streamline-2026-07/progress-log.md` records status for every PRD.
- [ ] Documentation links remain repo-relative within the packet.

### US-002: Enforce program phase gates
**Description:** As a lead developer, I want each phase to define required validation before proceeding so architecture work does not move ahead on weak evidence.

**Acceptance Criteria:**
- [ ] Each phase in `action-sequence.md` lists exact required commands.
- [ ] Transition-related phases require Chromium and WebKit transition audits.
- [ ] UI-affecting phases require browser verification using dev-browser skill.
- [ ] Program closeout requires the full final gate.

### US-003: Keep implementation status visible
**Description:** As a project owner, I want a progress log so I can see which PRDs are not started, in progress, blocked, or complete.

**Acceptance Criteria:**
- [ ] Every PRD has a row in `progress-log.md`.
- [ ] Status values use the documented status legend.
- [ ] Implementation entries include date, PRD, status, summary, and verification.

## 4. Functional Requirements

- FR-1: The program must keep all streamlining PRDs under `tasks/project-streamline-2026-07/`.
- FR-2: The program must define a dependency order that starts with validation repair.
- FR-3: The program must require validation gates before moving to dependent work.
- FR-4: The program must record senior developer review results in `progress-log.md`.
- FR-5: The program must not implement product/runtime code by itself.

## 5. Non-Goals

- No runtime or UI implementation in this PRD.
- No branch, commit, or push unless explicitly requested later.
- No redesign of home, portfolio, CV/About, or simulations outside the individual PRDs.

## 6. Design Considerations

- The program should preserve the homepage as the baseline contract.
- The portfolio deck should remain centered as the current visual anchor.
- The about/CV route should not be redesigned as part of planning.

## 7. Technical Considerations

- The packet should reference existing repo commands rather than inventing new ones.
- Browser audits should run serially to reduce false negatives.
- Route, transition, and canvas work must respect compatibility hooks such as `#abs-scene`, `#c`, `#hero-title`, and `data-abs-*`.

## 8. Success Metrics

- Future implementation can start from one PRD without re-running the whole review.
- Every dependent phase has an explicit pass/fail gate.
- No completed PRD leaves docs and code in conflict.

## 9. Decisions

- Leave completed PRDs in this folder as historical planning records, with status and completion evidence tracked in `progress-log.md`.

## 10. Completion Notes

Completed: 2026-07-08

- PRDs 1, 2, 4, 5, 6, 7, 8, and 11 were implemented and verified.
- PRDs 3, 9, and 10 were deliberately not actioned, with rationale recorded in their PRDs and `progress-log.md`.
- Final visual proof was captured in `output/playwright/prd-closeout-2026-07-08/`.
- Final verification included `npm run check:site`, `npm run certify:screens`, boot overlay, canvas SPA, daily focus, simulation focus, simulation stress, portfolio gate, Chromium/WebKit transition flows, strict RAF transition flows, targeted back-link smoke, and screenshot proof.
