# PRD: About Narrative Visual Certification Loop

## 1. Introduction / Overview

The current About runtime audit proves schema, world stage, visibility, draw calls, exact anchor sampling, resource stability, and absence of console errors. It can still pass while the opening is visibly off-center, circles are too small, editorial copy is clipped, orbital bodies overlap, and bust formation is unreadable. The visual certification must therefore capture the full authored story and quantify the most important composition contracts.

This PRD creates one fixed preview set and one keep/discard loop for the About narrative. Each design iteration changes one bounded surface, regenerates the same evidence, scores it against a stable rubric, and is kept only when it improves the target without violating hard constraints.

## 2. Goals

- Expand the contact sheets so every important narrative and editorial beat is visible.
- Add quantitative checks for alignment, text clipping, material presence, and key silhouette bounds.
- Make desktop, mobile, and reduced-motion evidence directly comparable.
- Add tablet and short-landscape spot checks for high-risk compositions.
- Record each bounded iteration and keep/discard decision.
- Require two independent read-only reviewers after implementation.
- Repeat the loop whenever actionable P0/P1 feedback remains.

## 3. User Stories

### US-001: Capture the complete visual story

**Description:** As a reviewer, I want every important narrative beat represented so I can judge continuity rather than isolated endpoints.

**Acceptance Criteria:**

- [ ] Desktop contact sheet includes opener, threshold, inside/turbulent, void/editorial I, grid rise/flyover, discipline, both editorial II passages, grid return, early/close/wide ripple, orbital form/settled/live, bust form, and final bust.
- [ ] Mobile contact sheet includes equivalent high-risk beats, including bust formation and both editorial passages.
- [ ] Reduced-motion sheet includes opener, discipline, editorial, grid/ripple settled state, orbital, bust formation, and finale.
- [ ] Every panel label includes checkpoint ID and Story WU.
- [ ] Contact-sheet order matches narrative order.
- [ ] Screenshots are captured only after world preparation and runtime state are stable.

### US-002: Quantify opening and text-edge correctness

**Description:** As a developer, I want geometry assertions for centering and clipped text so obvious layout defects cannot pass unnoticed.

**Acceptance Criteria:**

- [ ] Audit records studio-window, title, description, and scroll-cue bounding boxes at opener checkpoints.
- [ ] Audit fails when opener center error exceeds 1% of studio-window width.
- [ ] Audit detects visible editorial elements intersecting the top/bottom edge by only 1–48 CSS px.
- [ ] Audit records finale headline, bust, actions, and Button Bar bounds on mobile.
- [ ] Audit fails on overlap or missing required clearances.

### US-003: Quantify material presence and silhouettes

**Description:** As a reviewer, I want diagnostic measurements that flag tiny or missing material while leaving aesthetic judgment to the contact sheet.

**Acceptance Criteria:**

- [ ] Audit records coloured-pixel coverage and non-background material bounds for each visible checkpoint.
- [ ] Audit records projected discipline-anchor bounds.
- [ ] Audit records orbital material bounds and viewport clearance.
- [ ] Audit records bust-form/final-bust bounds and height ratios.
- [ ] Hidden checkpoints still assert zero draw calls.
- [ ] Measurements are diagnostic and deterministic; they do not mutate runtime state.

### US-004: Run a bounded autoresearch loop

**Description:** As the product owner, I want each visual experiment evaluated consistently so the sequence improves without aesthetic drift.

**Acceptance Criteria:**

- [ ] One canonical artifact is mutated: the About narrative only.
- [ ] Each iteration states one hypothesis and one bounded changed surface.
- [ ] The same preview set is exported after each kept candidate.
- [ ] Each candidate is scored for material continuity, hierarchy, typography, narrative clarity, responsive parity, and implementation realism.
- [ ] Any hard-constraint failure is discarded.
- [ ] A ledger records hypothesis, files/values changed, evidence, score, keep/discard, and next mutation.

### US-005: Require independent final review

**Description:** As the product owner, I want both an art-direction review and a frontend/simulation review before the work is considered complete.

**Acceptance Criteria:**

- [ ] The art-direction reviewer inspects every panel at original detail and reports typography/composition findings.
- [ ] The frontend reviewer inspects every panel and maps defects to Camera, Visibility, World, Text, or Motion.
- [ ] Reviewers are read-only and independent.
- [ ] Any P0/P1 feedback starts another bounded implementation/capture/review iteration.
- [ ] Completion requires no remaining actionable P0/P1 feedback from either reviewer.

## 4. Functional Requirements

- **FR-1:** `scripts/audit-about-narrative-runtime-visuals.mjs` must remain the canonical runtime visual capture.
- **FR-2:** The audit must keep existing stage, preparation, resource, visibility, draw-call, and console assertions.
- **FR-3:** Contact-sheet checkpoint order must be deterministic.
- **FR-4:** Evidence JSON must include geometry/material diagnostics alongside existing runtime state.
- **FR-5:** Tablet and short-landscape spot captures must cover opener, discipline, and finale.
- **FR-6:** Chromium and WebKit production/editor audits must remain green.
- **FR-7:** The loop ledger must be stored under `tasks/` and updated after each iteration.
- **FR-8:** Final verification must include `npm run check:about-narrative-hardening`, `npm run check:site`, runtime visual audit, and relevant production/editor browser audits.

## 5. Non-Goals

- No pixel-perfect snapshot test that rejects harmless antialiasing differences.
- No automated aesthetic score presented as a substitute for human review.
- No expansion into Home, Portfolio, Contact, or stable shell redesign.
- No mutation of generated contact-sheet images by hand.
- No certification claim based on a green build alone.

## 6. Evaluation Rubric

Score each category from 1–5:

- **Material continuity:** circles retain identity and useful apparent scale.
- **Narrative clarity:** each beat reads in the intended order.
- **Spatial hierarchy:** hero, environment, semantic constellation, and text have clear priority.
- **Typography:** centering, line breaks, measure, and editorial placement feel deliberate.
- **Responsive parity:** mobile/reduced are recompositions of the same story.
- **Implementation realism:** the change uses the five-lane model and preserves performance/accessibility.

Hard constraints:

- Stable shell geometry and Button Bar remain unchanged.
- No retired camera controls return.
- Zero visibility still means zero draw calls.
- Reduced motion remains non-travelling.
- All required tests/audits pass.

## 7. Success Metrics

- Contact sheets contain all required beats and no accidental blank/cropped review panels.
- Opener and text-edge geometry assertions pass.
- Material diagnostics meet the thresholds defined in the scale PRD.
- Browser audits pass in Chromium and WebKit.
- Two final independent reviews return no actionable P0/P1 feedback.
- The ledger contains a complete keep/discard history for this refinement.

## 8. Open Questions

None. P2 polish may be accepted only if it does not undermine a hard constraint or materially weaken the intended look.
