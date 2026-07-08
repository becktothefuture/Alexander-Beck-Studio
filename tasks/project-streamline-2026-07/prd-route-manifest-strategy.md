# PRD: Route Manifest Strategy

## 1. Introduction/Overview

Define a later route manifest or generation strategy only if validator-first drift reduction is not enough. This PRD is intentionally sequenced after `prd-simulation-validator-expansion.md`.

## 2. Goals

- Decide whether a route manifest is needed after validator expansion.
- If needed, define manifest responsibilities and non-responsibilities.
- Avoid premature code generation that makes the route system harder to debug.

## 3. User Stories

### US-001: Assess remaining route drift after validation
**Description:** As a lead developer, I want evidence that validation is insufficient before introducing a manifest.

**Acceptance Criteria:**
- [ ] Review post-validator route promotion/removal workflow.
- [ ] List remaining manual touchpoints.
- [ ] Identify which touchpoints are still error-prone despite validators.
- [ ] Recommend either no manifest, validation-only continuation, or a narrow manifest.

### US-002: Define narrow manifest scope
**Description:** As a developer, I want any manifest to be narrow so it reduces drift without hiding route behavior.

**Acceptance Criteria:**
- [ ] Manifest proposal names exactly which files it would validate or generate.
- [ ] Manifest proposal preserves public route aliases.
- [ ] Manifest proposal keeps `lib/routes.js` behavior transparent.
- [ ] Manifest proposal explicitly avoids changing visual/runtime behavior.

### US-003: Decide generation versus validation
**Description:** As a maintainer, I want to know whether the manifest should generate route maps or only validate them.

**Acceptance Criteria:**
- [ ] Decision is recorded before implementation.
- [ ] If generation is recommended, generated files and source files are clearly separated.
- [ ] If validation-only is recommended, no generator is added.

## 4. Functional Requirements

- FR-1: The strategy must be based on evidence from completed validator work.
- FR-2: The strategy must not change runtime behavior by itself.
- FR-3: The strategy must identify rollback and debugging implications.

## 5. Non-Goals

- No implementation in the strategy PRD.
- No route URL cleanup.
- No code generation unless a later implementation PRD is approved.

## 6. Design Considerations

- Public route compatibility matters more than reducing file count.
- The route system must remain understandable to future agents.

## 7. Technical Considerations

- The current repo already has Vite inputs, `lib/routes.js`, `SiteApp.jsx`, catalog data, and per-route files.
- Manifest generation could reduce drift but may add build indirection.

## 8. Success Metrics

- The team has a clear go/no-go decision on manifest work.
- Any future manifest implementation has a narrow, defensible scope.

## 9. Sequencing Decision

- This PRD should not be actioned until validator-first work is complete.

## 10. Actioned Decision

Status: `not-actioned`

Decision: Do not introduce a route manifest or route code generation in this pass.

Rationale: `prd-simulation-validator-expansion.md` added the missing low-cost drift checks for route-backed Daily runtime coverage and duplicated legacy labels without changing runtime route ownership. The remaining route surfaces are still readable through the existing Vite inputs, `lib/routes.js`, `SiteApp.jsx`, catalog data, and per-route files. A manifest would add build indirection before there is evidence that validation-only coverage is insufficient.

Revisit only if a later promotion/removal still requires repeated manual route edits that `npm run sim:validate` cannot catch.
