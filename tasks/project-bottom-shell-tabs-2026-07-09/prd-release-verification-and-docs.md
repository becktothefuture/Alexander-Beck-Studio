# PRD: Release Verification And Docs

## 1. Introduction

Close the bottom shell tabs project with documentation, visual proof, full verification, independent review, and PRD archive. This PRD does not introduce new product behavior; it proves the completed behavior is reliable.

## 2. Goals

- Update canonical docs for bottom dock, geometry, route state, and Contact route.
- Run full verification from production preview.
- Inspect screenshot/audit artifacts before claiming release readiness.
- Archive completed PRDs.
- Commit closeout with only intended files.

## 3. User Stories

### US-001: Update canonical documentation

**Description:** As a future developer, I need the shell dock contract documented in the same places as existing chrome and layer contracts.

**Acceptance Criteria:**
- [ ] `COMPONENT-LIBRARY.md` documents bottom shell tabs.
- [ ] `SITE-STYLEGUIDE.md` documents the visual treatment and constraints.
- [ ] `LAYER-STACKING.md` documents dock position if layer semantics changed.
- [ ] `TRANSITION-ORCHESTRATION.md` documents route/tab state if transition behavior changed.
- [ ] `CONFIGURATION.md` is updated if new design-system/config keys are introduced.

### US-002: Run release verification

**Description:** As the site owner, I want proof that the new shell works across routes, browsers, and viewports.

**Acceptance Criteria:**
- [ ] `git diff --check` passes.
- [ ] `npm run check:site` passes.
- [ ] `npm run certify:screens` passes.
- [ ] Preview `audit:boot-overlay` passes.
- [ ] Preview `audit:canvas-spa` passes.
- [ ] Preview `audit:portfolio-gate` passes.
- [ ] Preview Chromium and WebKit `audit:transition-flows` pass.
- [ ] Strict Chromium and WebKit transition audits pass if route/motion behavior changed.
- [ ] Screenshots are inspected for home, Contact, Portfolio, About, desktop, and mobile.
- [ ] Validation scripts reflect the new UI contract: Contact route included, bottom dock selectors used, removed `#main-links` assumptions deleted, Contact modal checks updated or retired.

### US-003: Close the PRD packet

**Description:** As a maintainer, I want the PRD packet to show what was actioned and where proof lives.

**Acceptance Criteria:**
- [ ] `progress-log.md` records each PRD status, commit, verification, and artifact path.
- [ ] Completed PRDs move to `archive/actioned/`.
- [ ] A read-only final reviewer checks archive/progress consistency.
- [ ] Final closeout commit stages only intended project files.

## 4. Functional Requirements

- FR-1: Update canonical docs affected by the project.
- FR-2: Run and record the full release verification stack.
- FR-3: Inspect visual artifacts before claiming confidence.
- FR-4: Archive actioned PRD files.
- FR-5: Keep commits scoped around unrelated pre-existing worktree changes.

## 5. Non-Goals

- No new product behavior in this PRD.
- No new visual design in this PRD.
- No unrelated cleanup.

## 6. Design Considerations

- Visual proof must compare against the screenshot intent and the site's existing design language.
- Release confidence should be evidence-backed, not based on green commands alone.

## 7. Technical Considerations

- Use production preview for visual/audit proof.
- Run transition audits serially per browser.
- Restart preview after build-affecting changes.

## 8. Success Metrics

- Full gate passes.
- PRD packet is internally consistent.
- No unrelated files are committed.
- User can verify the finished behavior in browser.

## 9. Resolved Decisions

- This request asks to commit and action the PRDs. Commit locally with scoped per-PRD commits. Do not push unless explicitly requested later.
