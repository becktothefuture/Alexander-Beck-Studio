# PRD: Content Source Alignment

## 1. Introduction/Overview

Clarify and align route content sources. Home and CV/About use Vite virtual JSON modules, while the portfolio shell uses home content for hero copy and the legacy portfolio runtime fetches `contents-portfolio.json` at runtime. Docs also contain stale statements about CV copy living in an inline `cv-body.html` template.

## 2. Goals

- Make current content ownership clear and accurate.
- Remove stale references to deleted or old CV content templates.
- Make portfolio runtime loading explicitly intentional; do not migrate portfolio content loading without separate user approval.
- Keep portfolio project content source of truth unchanged unless explicitly approved.

## 3. User Stories

### US-001: Correct stale CV content docs
**Description:** As a content editor, I want docs to point at `contents-cv.json` so I edit the real source.

**Acceptance Criteria:**
- [ ] `SITE-COPY.md` no longer claims CV copy lives in `cv-body.html`.
- [ ] Docs reference `react-app/app/public/config/contents-cv.json` where appropriate.
- [ ] Any hardcoded CV strings are listed separately if they still exist.

### US-002: Document portfolio content loading
**Description:** As a developer, I want portfolio content loading to be intentional and documented so the mixed model does not look accidental.

**Acceptance Criteria:**
- [ ] Docs explain that portfolio projects are loaded from `contents-portfolio.json`.
- [ ] Docs explain why the portfolio runtime fetches content at runtime, or a migration path is specified.
- [ ] No duplicate portfolio content file is introduced.

### US-003: Record portfolio content model as intentionally runtime-loaded
**Description:** As a maintainer, I want the portfolio content model documented as intentional so future agents do not start an unapproved migration.

**Acceptance Criteria:**
- [ ] Docs state that portfolio project content remains runtime-loaded from `contents-portfolio.json`.
- [ ] Code comments make the runtime fetch intentional where helpful.
- [ ] Any migration to virtual JSON import is explicitly out of scope for this PRD.
- [ ] Verify in browser using dev-browser skill on portfolio deck and one project drawer.

## 4. Functional Requirements

- FR-1: Docs must identify `contents-home.json`, `contents-cv.json`, and `contents-portfolio.json` accurately.
- FR-2: Portfolio must keep `contents-portfolio.json` as the only live project content source.
- FR-3: Runtime and docs must not reference missing CV templates as active sources.
- FR-4: This PRD must not migrate portfolio content loading.

## 5. Non-Goals

- No rewrite of portfolio project content.
- No about/CV redesign.
- No changes to access gate copy unless docs prove it is stale.
- No portfolio content model migration.

## 6. Design Considerations

- Portfolio deck should keep its current centered visual anchor.
- CV/About remains a reading-first route until a separate redesign is approved.

## 7. Technical Considerations

- Vite virtual content currently maps home and CV only.
- Portfolio runtime has legacy fallback paths for content loading.
- A future migration may be considered later, but this PRD is docs-first and clarification-only for portfolio loading.

## 8. Success Metrics

- A content edit can be made from docs without chasing old templates.
- Portfolio content model is explicitly justified.
- Browser verification confirms no copy or media regression.

## 9. Decisions

- Default is docs-first clarification with no portfolio content model migration.
