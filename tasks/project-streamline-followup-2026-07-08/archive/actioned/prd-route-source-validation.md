# PRD: Route Source Validation

## 1. Introduction/Overview

Route identity is repeated across `routes.js`, `SiteApp` maps, Vite inputs, HTML entries, and transition Daily route IDs. This PRD is the first, low-risk pass: it does not generate routes or change boot behavior. It makes current route drift fail fast and documents what a future route descriptor could own.

## 2. Goals

- Validate current route metadata across existing sources.
- Catch missing `SiteApp`, `routes.js`, Vite input, and Daily route coverage.
- Document the future descriptor shape without implementing derivation.
- Keep route behavior unchanged.

## 3. User Stories

### US-001: Validate route registry and Vite inputs
**Description:** As a maintainer, I want route registry paths checked against Vite inputs so a public route cannot be missed by the build.

**Acceptance Criteria:**
- [ ] Validator checks every expected public route path is present in `routes.js`.
- [ ] Validator checks every expected public route path is present in Vite inputs where required.
- [ ] Validator fails with a clear file/path message on drift.

### US-002: Validate `SiteApp` route maps
**Description:** As a developer, I want `SiteApp` view/runtime maps checked against the route registry so SPA route composition cannot drift silently.

**Acceptance Criteria:**
- [ ] Validator checks every shell route has required `ROUTE_VIEW_BY_ID` coverage.
- [ ] Validator checks every route that needs legacy runtime has `ROUTE_RUNTIME_BY_ID` coverage.
- [ ] Standalone/lab exceptions are explicit.

### US-003: Validate Daily lab route IDs
**Description:** As a simulation maintainer, I want Daily lab route IDs checked against catalog-driven Daily route-backed entries.

**Acceptance Criteria:**
- [ ] Validator derives route-backed Daily IDs from `simulationCatalog.json`.
- [ ] Validator checks transition Daily ID coverage against derived IDs.
- [ ] Compatibility exceptions are explicit and documented.

### US-004: Document future descriptor shape
**Description:** As a future implementer, I want a clear descriptor proposal so a later derivation PRD has bounded scope.

**Acceptance Criteria:**
- [ ] Docs or PRD notes list route descriptor fields.
- [ ] Descriptor proposal does not change runtime behavior in this PRD.
- [ ] Future derivation remains a separate decision.

### US-005: Prove route validation fails on drift
**Description:** As a reviewer, I want at least one negative route-validation proof so I know the new guard catches real route drift.

**Acceptance Criteria:**
- [ ] At least one temporary local mutation or fixture proves missing route registry coverage fails.
- [ ] At least one temporary local mutation or fixture proves missing Vite or `SiteApp` coverage fails.
- [ ] Temporary mutations are reverted before final status.
- [ ] Negative proof evidence is recorded in `progress-log.md`.

## 4. Functional Requirements

- FR-1: Extend existing validation rather than introducing code generation.
- FR-2: Keep validation cheap enough for `npm run check:site`.
- FR-3: Do not change public URLs, route aliases, access gates, or route runtime behavior.
- FR-4: Provide actionable validator errors.
- FR-5: Record negative validation evidence in `progress-log.md`.

## 5. Non-Goals

- No route descriptor derivation.
- No direct boot readiness changes.
- No router library migration.
- No HTML entry consolidation.

## 6. Design Considerations

None directly; this is validation and documentation.

## 7. Technical Considerations

Prefer structured parsing/imports where safe. If text extraction is used, keep it tightly scoped and add negative test evidence by temporarily mutating one fixture or local file, then reverting it before completion.

## 8. Success Metrics

- Known route drift classes fail validation.
- `npm run check:site` remains green after implementation.

## 9. Open Questions

- Should route validation live in `sim:validate`, a new route validator, or both through `check:site`?
