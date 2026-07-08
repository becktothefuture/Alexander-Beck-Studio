# PRD: Backlog And Historical Docs Triage

## 1. Introduction/Overview

The repo keeps useful historical audit notes, but some stale P0/P1 rows and archived integration guidance can look active to future agents. This PRD separates active backlog from historical notes without losing useful context.

## 2. Goals

- Mark historical audit sections clearly.
- Close or update stale backlog rows that no longer describe current state.
- Keep active risks visible.
- Avoid deleting useful context without replacement.

## 3. User Stories

### US-001: Classify backlog rows
**Description:** As a maintainer, I want backlog rows classified as active, closed, historical, or superseded so severity is trustworthy.

**Acceptance Criteria:**
- [ ] Rows contradicted by current code are updated or marked closed.
- [ ] Historical rows are moved or labeled as historical.
- [ ] Active rows keep clear severity and action.

### US-002: Align archived integration guidance
**Description:** As a future agent, I want archived docs to be unmistakably non-authoritative so I do not implement against old standalone APIs.

**Acceptance Criteria:**
- [ ] Archived integration docs retain context but point to current authoritative docs.
- [ ] Missing old globals are not presented as active requirements.
- [ ] Current privacy/external-origin notes match real shipped fonts/tactile behavior.

### US-003: Keep docs reviewable
**Description:** As a reviewer, I want documentation changes to be narrow so historical context is not silently erased.

**Acceptance Criteria:**
- [ ] Docs diff is reviewed manually.
- [ ] Removed claims are either obsolete or replaced by current guidance.
- [ ] `npm run check:site` still passes.

## 4. Functional Requirements

- FR-1: Update `docs/BACKLOG.md` rows directly tied to current review findings.
- FR-2: Update archived docs only where they can mislead current implementation.
- FR-3: Preserve links to authoritative current docs.

## 5. Non-Goals

- No full documentation rewrite.
- No deletion of historical research without user approval.
- No implementation of backlog items in this PRD.

## 6. Design Considerations

None; documentation only.

## 7. Technical Considerations

Docs should not claim stronger validation than CI/local gates actually provide.

## 8. Success Metrics

- Future agents can distinguish active risks from historical notes.
- Backlog severity matches current repo state.

## 9. Open Questions

- Should historical audit sections stay in `docs/BACKLOG.md`, or move to a dated archive file?
