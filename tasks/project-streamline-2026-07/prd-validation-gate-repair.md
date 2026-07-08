# PRD: Validation Gate Repair

## 1. Introduction/Overview

Repair stale and incomplete validation so the repo's safety net reflects the current Studio Website architecture. The immediate bug is `npm run audit:daily-focus-boundary`, which fails before browser launch because it references removed daily-focus files and an old daily count.

## 2. Goals

- Make `npm run audit:daily-focus-boundary` pass against the current implementation.
- Add `npm run sim:validate` to the canonical root gate and CI path.
- Remove stale expected counts and derive them from `simulationCatalog.json`.
- Preserve existing passing gates: `check:site`, `check:design-config`, `validate:html-fragments`, lint, and build.
- Prove Daily chooser behavior with the Daily switch audits after the repair.

## 3. User Stories

### US-001: Repair daily focus boundary audit
**Description:** As a developer, I want the daily-focus boundary audit to inspect the current `SimulationStage` architecture so it can catch real regressions.

**Acceptance Criteria:**
- [ ] `scripts/audit-daily-focus-boundary.mjs` no longer reads removed `DailyFocusCanvasRuntime.jsx`.
- [ ] The audit derives daily count from `react-app/app/src/data/simulationCatalog.json`.
- [ ] The audit validates current daily-focus runtime shape, including `SimulationStage`, route-backed runtime roots, transparent Daily mode, and clean home URL settlement.
- [ ] `npm run audit:daily-focus-boundary` passes against preview or documented dev server input.
- [ ] `ABS_DEV_URL=http://localhost:8013 npm run audit:simulation-focus` passes with preview running.
- [ ] `ABS_DEV_URL=http://localhost:8013 npm run audit:simulation-focus:stress` passes with preview running, or any failure is fixed rather than ignored.
- [ ] Typecheck/lint passes through `npm run check:site`.

### US-002: Promote simulation validation into canonical gate
**Description:** As a maintainer, I want simulation catalog validation to run in the main site gate so route/catalog drift is caught before merge.

**Acceptance Criteria:**
- [ ] Root `check:site` includes `npm run sim:validate`.
- [ ] `.github/workflows/gh-pages.yml` runs `npm run sim:validate` or uses a root command that includes it.
- [ ] `npm run check:site` still passes locally.
- [ ] CI flow still builds `react-app/app/dist/`.

### US-003: Document validation ownership
**Description:** As a future agent, I want docs to say which command is canonical so I do not run stale or partial checks.

**Acceptance Criteria:**
- [ ] Relevant docs mention `sim:validate` as part of the main gate.
- [ ] Stale references to expected daily count `15` are removed or derived dynamically.
- [ ] Docs explain when browser transition audits are required.

## 4. Functional Requirements

- FR-1: `audit:daily-focus-boundary` must not import or read removed daily-focus files.
- FR-2: Daily count expectations must be data-driven from the catalog.
- FR-3: `check:site` must include simulation catalog validation.
- FR-4: CI must either call root `npm run check:site` or explicitly run the same core validation set.
- FR-5: The repaired audit must fail on missing route-backed daily runtime coverage.

## 5. Non-Goals

- No visual redesign of Daily Simulation.
- No changes to daily rotation membership unless a validation failure proves drift.
- No transition refactor beyond what is needed to update the audit.

## 6. Design Considerations

- Daily Simulation must remain a homepage product surface.
- Route-backed daily simulations must settle to clean `/` or `/index.html`.
- Browser-visible Daily switches must keep shell chrome available and avoid boot overlay flashes.

## 7. Technical Considerations

- Use `simulationCatalog.json` and `simulationCatalog.js` helpers where possible.
- Keep browser audit behavior serial and deterministic.
- Avoid weakening the audit by deleting checks without replacing them with current equivalents.

## 8. Success Metrics

- `npm run audit:daily-focus-boundary` changes from known failing to passing.
- `npm run check:site` catches simulation catalog drift.
- A future route-backed daily promotion has one clear required gate.

## 9. Decisions

- Support both dev and preview targets through `ABS_DEV_URL`; document preview as the required merge gate because it verifies the production build path.
