# PRD: Simulation Validator Expansion

## 1. Introduction/Overview

Expand cheap simulation validation so route-backed daily drift is caught before browser audits. This is the validator-first slice of route registry cleanup. It does not introduce a manifest or code generation.

## 2. Goals

- Detect missing and extra Daily Focus runtime cases.
- Detect common label/chapter drift where it can be checked safely.
- Keep route-backed simulation promotion/removal covered by `npm run sim:validate`.
- Avoid route manifest/codegen changes in this first pass.

## 3. User Stories

### US-001: Validate daily runtime case coverage
**Description:** As a developer, I want `sim:validate` to compare catalog daily lab entries against Daily Focus runtime cases so unreachable or missing runtime cases are caught.

**Acceptance Criteria:**
- [ ] `sim:validate` detects every `daily-rotation` + `lab-route` catalog entry.
- [ ] `sim:validate` confirms each such entry has a Daily Focus runtime case.
- [ ] `sim:validate` fails or warns on extra Daily Focus runtime cases not in daily rotation.
- [ ] The current `beach-ball-room` runtime case is either removed from Daily runtime coverage or explicitly allowlisted with a documented reason.
- [ ] `npm run sim:validate` passes after the validator is updated.

### US-002: Validate catalog route-backed path coverage
**Description:** As a maintainer, I want the existing path checks to remain active so route-backed simulations cannot lose Vite or route registry coverage.

**Acceptance Criteria:**
- [ ] Existing checks for lab HTML, Vite input, route registry, config path, previews, and dailyHref still run.
- [ ] Validator output clearly reports the failing simulation ID and missing surface.
- [ ] `npm run check:site` passes after changes.

### US-003: Add safe label drift checks
**Description:** As a developer, I want obvious duplicate label drift to be caught without forcing a broad refactor.

**Acceptance Criteria:**
- [ ] Validator checks catalog display names against reachable duplicated labels where parsing is reliable.
- [ ] Intentional mismatches use a small allowlist with comments.
- [ ] The validator does not require a route manifest or generated constants.

## 4. Functional Requirements

- FR-1: Extend `scripts/validate-simulation-catalog.mjs` or a helper it calls.
- FR-2: Daily runtime checks must derive expected IDs from `simulationCatalog.json`.
- FR-3: Extra Daily runtime cases must not silently pass.
- FR-4: The validator must keep output actionable for one simulation at a time.

## 5. Non-Goals

- No route manifest creation.
- No Vite input generation.
- No simulation promotion or demotion except removing/documenting unreachable Daily runtime coverage if required.
- No Canvas runtime rewrite.

## 6. Design Considerations

- This is not a visual change.
- Daily Simulation product behavior should remain unchanged.

## 7. Technical Considerations

- Prefer structured parsing where practical; avoid brittle string checks unless scoped and documented.
- Keep validation fast enough to run in `check:site`.
- If parsing duplicate labels proves too brittle, defer that slice to the manifest strategy PRD.

## 8. Success Metrics

- `npm run sim:validate` catches Daily runtime drift.
- Route-backed daily promotion/removal has a stronger no-browser guard.
- No new broad architecture surface is introduced.

## 9. Decisions

- Default approach is validator-first, no manifest/codegen.
