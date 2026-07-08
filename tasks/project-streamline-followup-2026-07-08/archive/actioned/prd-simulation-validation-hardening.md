# PRD: Simulation Validation Hardening

## 1. Introduction/Overview

`npm run sim:validate` passes and already catches important catalog drift. The latest review found remaining manual touchpoints around Daily lab route IDs, route maps, labels, and schema enums. This PRD strengthens the validator before the next simulation promotion/removal.

## 2. Goals

- Validate route-backed Daily entries against shell route maps and transition Daily IDs.
- Require catalog labels to resolve consistently in duplicated legacy UI maps.
- Enforce closed enums for `surface` and `reviewStatus`.
- Reduce false-passes from loose string matching where practical.

## 3. User Stories

### US-001: Validate Daily route IDs against transition ownership
**Description:** As a simulation maintainer, I want route-backed Daily entries checked against transition code so promoted lab routes cannot miss shell transition coverage.

**Acceptance Criteria:**
- [ ] Validator derives Daily route-backed IDs from `simulationCatalog.json`.
- [ ] Validator checks `DAILY_LAB_ROUTE_IDS` or its replacement against derived IDs.
- [ ] Known compatibility exceptions are explicit and documented.
- [ ] `npm run sim:validate` fails on a missing Daily route-backed ID.

### US-002: Validate shell route maps against catalog lab routes
**Description:** As a maintainer, I want lab route catalog entries checked against `SiteApp` route maps so public launch paths cannot exist without React route coverage.

**Acceptance Criteria:**
- [ ] Validator checks route view/runtime coverage for every relevant lab route.
- [ ] Validator fails when a catalog lab route is missing from shell route maps.
- [ ] Validator keeps non-shell standalone exceptions explicit.

### US-003: Validate mode labels completely
**Description:** As a user, I want simulation names to appear consistently so UI labels and announcements do not fall back to raw IDs.

**Acceptance Criteria:**
- [ ] Validator checks required duplicated label maps for missing keys, not only mismatched keys.
- [ ] Validator compares legacy labels to catalog `name`.
- [ ] Missing labels for narrative or daily modes fail validation.

### US-004: Enforce catalog enums
**Description:** As a developer, I want invalid catalog enum values to fail fast so typos do not bypass validation branches.

**Acceptance Criteria:**
- [ ] `surface` values are validated against an explicit allowed set.
- [ ] `reviewStatus` values are validated against `SIMULATION_REVIEW_STATUSES`.
- [ ] `stage` validation remains intact.

### US-005: Prove negative coverage before completion
**Description:** As a reviewer, I want each new validator rule demonstrated against a failing case so I know the rule actually catches drift.

**Acceptance Criteria:**
- [ ] At least one temporary local mutation or fixture proves Daily route drift fails.
- [ ] At least one temporary local mutation or fixture proves label drift fails.
- [ ] At least one temporary local mutation or fixture proves enum drift fails.
- [ ] Temporary mutations are reverted before final status.

## 4. Functional Requirements

- FR-1: Extend `scripts/validate-simulation-catalog.mjs`.
- FR-2: Prefer structured parsing or tightly scoped extraction over broad `source.includes()` where feasible.
- FR-3: Keep the command cheap enough to remain in `check:site`.
- FR-4: Keep validation output actionable, with simulation IDs and file names.
- FR-5: Record negative validation evidence in `progress-log.md`.

## 5. Non-Goals

- No simulation behavior changes.
- No new simulation routes.
- No route manifest generation in this PRD.

## 6. Design Considerations

None directly; this protects simulation naming and route behavior.

## 7. Technical Considerations

Avoid overfitting to formatting if the repo already has stable exports that can be imported directly. If importing app modules from Node is not safe, use targeted text extraction with explicit tests.

## 8. Success Metrics

- `npm run sim:validate` catches the drift classes identified in the review.
- `npm run check:site` remains fast and green.

## 9. Open Questions

- Should `beach-ball-room` remain a compatibility allowlist case, or should it be represented with a clearer catalog field?
