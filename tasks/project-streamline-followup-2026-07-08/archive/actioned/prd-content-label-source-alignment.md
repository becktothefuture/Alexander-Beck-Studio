# PRD: Content Label Source Alignment

## 1. Introduction/Overview

The UI currently mixes `About me` and `About Me` across content JSON, route modules, templates, and styleguide examples. This is small but visible source-of-truth drift. This PRD chooses one owner and normalizes the label across active surfaces.

## 2. Goals

- Pick canonical casing for the About/CV navigation label.
- Store the label in one content source where possible.
- Remove route-level hard-coded label overrides unless intentionally documented.
- Keep styleguide examples aligned with active UI.

## 3. User Stories

### US-001: Choose canonical label
**Description:** As a site owner, I want one canonical About label so the site feels intentional.

**Acceptance Criteria:**
- [ ] Canonical label is documented.
- [ ] Product decision is recorded in the PRD implementation log.
- [ ] Docs and UI agree.

### US-002: Normalize active route labels
**Description:** As a user, I want the About/CV label to read consistently across home, portfolio, CV, and styleguide.

**Acceptance Criteria:**
- [ ] Home uses the canonical label.
- [ ] Portfolio uses the canonical label.
- [ ] CV route topbar uses the canonical label where relevant.
- [ ] Styleguide examples use the canonical label or explicitly mark demo text.
- [ ] **Verify in browser using dev-browser skill** across home, portfolio, CV, and styleguide.

### US-003: Remove unnecessary hard-coded overrides
**Description:** As a developer, I want route labels loaded from content where possible so future copy edits do not require code changes.

**Acceptance Criteria:**
- [ ] `contents-home.json` is the owner for shared navigation copy, unless a route has an explicit reason to override.
- [ ] Hard-coded route label constants are removed or justified.
- [ ] `SITE-COPY.md` stays in sync.

### US-004: Classify demo and inactive label surfaces
**Description:** As an implementation agent, I want demo-only files classified so the casing pass does not accidentally broaden into unrelated experiments.

**Acceptance Criteria:**
- [ ] Active routes and docs are in scope.
- [ ] Demo-only or inactive files such as public experiments are explicitly listed as in-scope or out-of-scope.
- [ ] Out-of-scope demo labels are not changed just to satisfy a broad text search.

## 4. Functional Requirements

- FR-1: Do not change route IDs or access gate behavior.
- FR-2: Preserve `cv-modal-trigger` IDs.
- FR-3: Update docs and active UI together.
- FR-4: Do not change inactive demo/test surfaces unless explicitly listed.

## 5. Non-Goals

- No rewrite of the About/CV page content.
- No broader copywriting pass.
- No navigation redesign.

## 6. Design Considerations

Follow `COMPONENT-LIBRARY.md` route topbar guidance unless the user chooses a different casing.

## 7. Technical Considerations

Route labels feed buttons with stable IDs. Keep IDs unchanged; change visible text only.

## 8. Success Metrics

- No mixed `About me` / `About Me` casing across active UI.
- Future label copy can be changed from one owner.

## 9. Open Questions

- Canonical casing recommendation: `About Me`, because the component library currently says route nav labels should be title case.
