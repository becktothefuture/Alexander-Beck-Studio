# Refactoring Manifest

Last planned: 2026-07-30
Roadmap: `docs/refactoring-roadmap.md`
Audit: `docs/codebase-audit.md`

## Global rules

- Preserve existing behavior unless a milestone explicitly names the intended accessibility or unknown-route change.
- Do not modify files outside assigned scope.
- Do not edit generated config files by hand.
- Do not rewrite Git history, publish, push, commit, or stop a pre-existing Studio process without explicit authorization.
- Start relevant work with `npm run studio:status`.
- Run focused tests during work and `npm run check:site` before completion.
- Visual/browser milestones require screenshot or computed-pixel inspection; green commands alone are insufficient.
- Preserve the React shell/imperative runtime boundary, Canvas allocation contracts, Portfolio handoff, About schema/persistence, public-mirror deny boundary, and locked design contracts.
- Milestone agents must not edit `docs/codebase-audit.md`, `docs/refactoring-roadmap.md`, `docs/refactoring-manifest.md`, or `docs/architecture-decisions.md`.
- The global orchestrator updates planning status, integrates each wave, reviews diffs, resolves shared interfaces, and runs final verification.
- Do not mark work complete without acceptance evidence and a rollback note.
- Decision-gated milestones remain unassigned until their named human decision is accepted.

## Execution waves

| Parallel group | Milestones | Entry condition |
| --- | --- | --- |
| A | M01, M02, M03, M04 | Start of programme. |
| B | M05; M09 after decision | M01 complete for M05; M04 and `HD-02` complete for M09. |
| C | M06 | M01 and M05 complete. Run alone. |
| D | M07; M08 after decision | M06 complete; M08 also needs `HD-01`. |
| E | M10, M11, M12 | M06 complete for M10; M01/M05 for M11; M07 for M12. |
| F | M13, M14, M15 | M10 and M11 integrated. |
| G | M16 | M07, M12, and M15 integrated. |

Critical path: `M01 -> M05 -> M06 -> M07 -> M12 -> M16`.

## Milestones

### MILESTONE-01

- Status: Ready
- Outcome: Bounded production-browser release smoke
- Priority: High
- Parallel group: A
- Depends on: None
- Blocks: M05, M06, M11
- Owner: Unassigned
- Issues:
  - `TEST-001`
- Files:
  - `package.json`
  - `.github/workflows/gh-pages.yml`
  - `scripts/audit-release-smoke.mjs` (new)
  - smoke-only helpers under `scripts/lib/` (new)
- Shared contracts:
  - route-ready events and runtime data attributes
  - production preview process/port
  - primary route `main`/`h1` contract
  - Home Canvas backing store
- Must not change:
  - production route behavior
  - deep browser audit commands
- Verification commands:
  - `npm run check:site`
  - new release-smoke command against production preview
- Manual evidence:
  - five stable CI-equivalent runs
  - failure screenshot/trace inspection
- Acceptance criteria:
  - loads and navigates all four primary routes
  - fails on route/runtime/Canvas/landmark/heading/representative-focus regression
  - completes within eight minutes
  - preserves targeted Chromium/WebKit matrices
- Rollback: Revert the workflow step, command, and smoke script together.

### MILESTONE-02

- Status: Ready
- Outcome: Shared safeguards for every local JSON write route
- Priority: High
- Parallel group: A
- Depends on: None
- Blocks: None
- Owner: Unassigned
- Issues:
  - `SEC-001`
- Files:
  - `react-app/app/vite.dev-admin-plugin.js`
  - one new focused endpoint test under `scripts/`
  - local authoring clients only if response compatibility requires it
- Shared contracts:
  - local `/api/*` status/JSON responses
  - fixed canonical config paths
  - public-mirror 404 boundary
- Must not change:
  - valid save payloads
  - static production architecture
  - client-side gate behavior
- Verification commands:
  - focused endpoint test
  - existing About persistence tests
  - `npm run check:site`
- Manual evidence:
  - local design, simulation, and About save/reload
  - public mirror denies `/api/*` and `/@fs/*`
- Acceptance criteria:
  - shared origin/content-type/body-size/JSON/validation guards cover every write route
  - file targets remain fixed or allowlisted
  - valid authoring behavior is unchanged
- Rollback: Revert helper extraction and all endpoint adoption atomically.

### MILESTONE-03

- Status: Ready
- Outcome: Current About and test documentation agrees with code
- Priority: Medium
- Parallel group: A
- Depends on: None
- Blocks: None
- Owner: Unassigned
- Issues:
  - `DOC-001`
- Files:
  - `README.md`
  - `DESIGN.md`
  - `docs/reference/SYSTEM-ARCHITECTURE.md`
  - `docs/development/DEV-WORKFLOW.md`
- Shared contracts:
  - current production/development About split
  - canonical command names
- Must not change:
  - About production code/content
  - future product commitments
- Verification commands:
  - `npm run check:malformed-tokens`
  - path/command existence check
- Manual evidence:
  - focused documentation diff review
- Acceptance criteria:
  - all documents state production uses `AboutComingSoon`
  - development narrative/editor is described separately
  - test layers and source-of-truth files are current
- Rollback: Revert the four documentation edits.

### MILESTONE-04

- Status: Ready
- Outcome: Measured artifact-retention policy and prevention check
- Priority: High
- Parallel group: A
- Depends on: None
- Blocks: M09
- Owner: Unassigned
- Issues:
  - `OPS-001` phase 1
- Files:
  - `.gitignore`
  - `scripts/precommit-check.sh`
  - one new repository-hygiene script
  - `docs/development/REPOSITORY-ARTIFACT-RETENTION.md` (new)
- Shared contracts:
  - ignored generated paths
  - durable evidence locations
  - precommit behavior
- Must not change:
  - current tracked set
  - Git history
  - production behavior
- Verification commands:
  - new hygiene check against clean/violating/allowlisted fixtures
  - `scripts/precommit-check.sh`
  - `npm run check:site`
- Manual evidence:
  - reconciled tracked file count and byte inventory
  - reviewable `HD-02` retention list
- Acceptance criteria:
  - all ignored tracked paths are classified
  - retained exceptions have owner/reason/size/reproduction notes
  - newly staged generated artifacts fail by default
- Rollback: Revert policy and checks; no artifact is removed.

### MILESTONE-05

- Status: Ready
- Outcome: Complete route-registry drift validation and current mismatch repair
- Priority: High
- Parallel group: B
- Depends on: M01
- Blocks: M06, M08, M11
- Owner: Unassigned
- Issues:
  - `ARCH-001` phase 1
- Files:
  - `scripts/validate-html-entries.mjs`
  - `scripts/validate-simulation-catalog.mjs`
  - one new or extended route validator
  - `react-app/app/src/components/app/StudioShell.jsx`
  - route metadata files only as required for parity
- Shared contracts:
  - route IDs/paths/aliases
  - Vite inputs and entries
  - `SiteApp` descriptors
  - shell `data-sfid`/route-view metadata
- Must not change:
  - URLs and aliases
  - unknown-path fallback
  - transition behavior
- Verification commands:
  - focused validator fixtures
  - `npm run validate:html-entries`
  - `npm run sim:validate`
  - `npm run check:site`
- Manual evidence:
  - direct load and SPA navigation for `rift-rings` and `loader-playground`
- Acceptance criteria:
  - every supported registry relationship is validated
  - both missing shell identities are corrected
  - omission fixtures fail deterministically
- Rollback: Revert validator and two metadata additions together.

### MILESTONE-06

- Status: Ready
- Outcome: Operable and semantically correct primary routes
- Priority: High
- Parallel group: C
- Depends on: M01, M05
- Blocks: M07, M08, M10
- Owner: Unassigned
- Issues:
  - `A11Y-002`
  - `A11Y-003`
  - `A11Y-005`
- Files:
  - `react-app/app/src/routes/home/HomeRoute.jsx`
  - `react-app/app/src/routes/portfolio/PortfolioRoute.jsx`
  - `react-app/app/src/routes/contact/ContactRouteContent.jsx`
  - `react-app/app/src/routes/about/AboutRoute.jsx` only if required
  - `react-app/app/src/legacy/modules/ui/legend-filter.js`
  - `react-app/app/src/components/app/StudioShell.jsx` only if required
  - `react-app/app/public/css/main.css`
  - `react-app/app/public/css/portfolio.css`
- Shared contracts:
  - route wrappers/focus targets
  - Home filter state
  - Portfolio drag versus reading surfaces
- Must not change:
  - visual hierarchy
  - Canvas ownership
  - Portfolio deck drag/selection behavior
- Verification commands:
  - `npm run check:site`
  - `npm run audit:canvas-spa`
  - `npm run audit:portfolio-carousel`
  - `npm run audit:portfolio-drawer`
  - release smoke
- Manual evidence:
  - keyboard and accessibility-tree review on all primary routes
  - Portfolio text-selection/drag review
- Acceptance criteria:
  - one meaningful `main` and `h1` per primary route
  - native semantic Home filter buttons with selected state
  - Portfolio reading text selectable without deck regression
- Rollback: Separate semantic wrapper, Home controls, and selection commits.

### MILESTONE-07

- Status: Ready
- Outcome: Reliable global focus and compliant supporting-copy contrast
- Priority: High
- Parallel group: D
- Depends on: M01, M06
- Blocks: M12, M16
- Owner: Unassigned
- Issues:
  - `A11Y-001`
  - `A11Y-004`
- Files:
  - `react-app/app/public/config/design-system.json`
  - `react-app/app/public/css/main.css`
  - `react-app/app/src/components/app/shell-button-bar-dominant.css`
  - focused browser assertions/screenshots
- Shared contracts:
  - token flattening
  - `:focus-visible`
  - shell/window theme ownership
- Must not change:
  - frame/wall geometry and color
  - layout
  - cursor contract
  - unrelated tokens
- Verification commands:
  - `npm run check:site`
  - release smoke
  - palette/theme/frame audits
  - `npm run certify:screens`
- Manual evidence:
  - Chromium/WebKit keyboard review
  - rendered contrast measurements over atmosphere states
  - screenshot inspection
- Acceptance criteria:
  - every primary keyboard target has visible focus
  - supporting normal text reaches 4.5:1
  - generated config remains in parity
  - no layout or locked-shell regression
- Rollback: Revert focus and contrast commits independently through canonical sources.

### MILESTONE-08

- Status: Needs decision
- Decision gate: `HD-01`
- Outcome: One validated route identity manifest and explicit unknown-route behavior
- Priority: Medium
- Parallel group: D after decision
- Depends on: M05, M06, HD-01
- Blocks: None
- Owner: Unassigned
- Issues:
  - `ARCH-001` phase 2
- Files:
  - `react-app/app/src/lib/routes.js`
  - one new static route-manifest module
  - `react-app/app/src/components/app/SiteApp.jsx`
  - `react-app/app/src/components/app/StudioShell.jsx`
  - `react-app/app/vite.config.js` and validators only as required
- Shared contracts:
  - route identity/aliases/tabs
  - lazy descriptor map
  - unknown-route result
- Must not change:
  - known URLs and aliases
  - explicit lazy imports/code splitting
- Verification commands:
  - route validator fixtures
  - `npm run check:site`
  - release smoke
  - `npm run audit:canvas-spa`
  - Chromium/WebKit transition flows
- Manual evidence:
  - direct-load every built entry
  - approved unknown-route behavior
- Acceptance criteria:
  - one owner for shared route identity
  - explicit imports remain readable
  - known routes preserve behavior
  - unknown routes follow `HD-01`
- Rollback: Keep old registry until parity passes; revert migration without URL changes.

### MILESTONE-09

- Status: Needs decision
- Decision gate: `HD-02`
- Outcome: Ignored generated artifacts are no longer tracked in the current tree
- Priority: High
- Parallel group: B after decision
- Depends on: M04, HD-02
- Blocks: None
- Owner: Unassigned
- Issues:
  - `OPS-001` phase 2
- Files:
  - exact Git index targets approved by the retention manifest
  - `.gitignore`
  - `scripts/precommit-check.sh`
  - documented retained-evidence paths
- Shared contracts:
  - clone/install behavior
  - browser evidence reproduction
- Must not change:
  - Git history
  - production source/runtime
- Verification commands:
  - ignored-but-tracked inventory
  - precommit hygiene check
  - clean `npm run install:all`
  - `npm run check:site`
- Manual evidence:
  - before/after file count and current-tree size
  - one representative browser audit writing ignored output
- Acceptance criteria:
  - no unapproved ignored tracked paths remain
  - durable evidence is preserved/reproducible
  - fresh install and gate pass
  - no history rewrite occurs
- Rollback: One focused commit restores index entries and evidence moves.

### MILESTONE-10

- Status: Ready
- Outcome: Measured legacy lint ratchet
- Priority: Medium
- Parallel group: E
- Depends on: M01, M06
- Blocks: M13, M14, M15
- Owner: Unassigned
- Issues:
  - `MAINT-002`
- Files:
  - `react-app/app/eslint.config.js`
  - selected tested legacy leaf modules
  - optional small lint-ratchet check
- Shared contracts:
  - compatibility fields
  - intentional empty catches
  - hot-path placeholders
- Must not change:
  - hotspot orchestrators
  - runtime behavior
  - formatting outside touched lines
- Verification commands:
  - app lint
  - `npm run check:site`
  - affected route/Canvas audits
- Manual evidence:
  - before/after exempt file and violation counts
- Acceptance criteria:
  - exemption scope shrinks measurably
  - new/modified legacy files receive normal checks
  - every retained suppression has a reason
- Rollback: Revert module-family slices independently.

### MILESTONE-11

- Status: Ready
- Outcome: Stable characterization contracts for all three hotspots
- Priority: High
- Parallel group: E
- Depends on: M01, M05
- Blocks: M13, M14, M15
- Owner: Unassigned
- Issues:
  - `MAINT-001` phase 1
- Files:
  - new focused tests under `scripts/`
  - fixtures under `scripts/fixtures/`
  - minimal test seams in the three hotspot modules only if unavoidable
- Shared contracts:
  - transition phases/readiness
  - control IDs/order/defaults/persistence/markup semantics
  - Portfolio normalization/boot/readiness/cleanup/selectors
- Must not change:
  - production behavior
  - public global APIs
- Verification commands:
  - new characterization checks
  - `npm run check:route-transitions`
  - `npm run check:site`
  - Portfolio/Canvas/transition audits
- Manual evidence:
  - proof that intentional contract-break fixtures fail
- Acceptance criteria:
  - each later extraction has focused stable coverage
  - tests avoid brittle full-markup snapshots
  - no test-only production global is introduced
- Rollback: Revert tests and any narrow test seam together.

### MILESTONE-12

- Status: Ready
- Outcome: Complete CSS ownership inventory and cascade assertions
- Priority: Medium
- Parallel group: E
- Depends on: M01, M07
- Blocks: M16
- Owner: Unassigned
- Issues:
  - `MAINT-003` phase 1
- Files:
  - `docs/development/PORTFOLIO-CSS-OWNERSHIP.md` (new)
  - selector analysis and computed-style checks under `scripts/`
  - screenshot manifests
- Shared contracts:
  - Portfolio selectors/load order/specificity
  - gate/deck/sheet/drawer computed states
- Must not change:
  - production CSS
  - approved pixels
- Verification commands:
  - selector-analysis self-tests
  - computed-style assertions
  - `npm run check:site`
  - Portfolio audits
- Manual evidence:
  - Chromium/WebKit desktop/mobile light/dark baselines
- Acceptance criteria:
  - every overlap has one planned owner or documented exception
  - high-risk computed styles are asserted
  - report is sufficient for M16 allocation
- Rollback: Revert analysis, docs, and tests; production CSS is untouched.

### MILESTONE-13

- Status: Ready
- Outcome: One transition observation/prewarm-readiness responsibility extracted
- Priority: Medium
- Parallel group: F
- Depends on: M10, M11
- Blocks: None
- Owner: Unassigned
- Issues:
  - `MAINT-001` transition hotspot
- Files:
  - `react-app/app/src/hooks/useShellRouteTransition.js`
  - focused modules under `react-app/app/src/lib/motion/`
  - transition characterization tests
- Shared contracts:
  - hook input/return
  - transaction phases/readiness/history/focus/diagnostics
- Must not change:
  - animation timing
  - route manifest
  - history/cancellation/failure behavior
- Verification commands:
  - M11 transition checks
  - `npm run check:route-transitions`
  - `npm run check:site`
  - strict Chromium/WebKit transition flows
  - route loader/Canvas SPA/simulation lifecycle audits
- Manual evidence:
  - before/after ownership summary and timing comparison
- Acceptance criteria:
  - one named responsibility leaves the hook
  - public contract and legal phase order remain unchanged
  - no new global state or cycle
- Rollback: Revert one extraction commit and inline the helper.

### MILESTONE-14

- Status: Ready
- Outcome: Control definitions separated from rendering/binding
- Priority: Medium
- Parallel group: F
- Depends on: M10, M11
- Blocks: None
- Owner: Unassigned
- Issues:
  - `MAINT-001` control-registry hotspot
- Files:
  - `react-app/app/src/legacy/modules/ui/control-registry.js`
  - new `react-app/app/src/legacy/modules/ui/control-definitions/`
  - direct Home panel consumers and tests
- Shared contracts:
  - control IDs/order/defaults
  - saved visibility state
  - lookup exports and markup semantics
- Must not change:
  - panel design
  - control names/IDs
  - saved-state format
  - Portfolio panel
- Verification commands:
  - M11 control characterization
  - app lint
  - `npm run check:site`
  - Canvas SPA/runtime-performance audits
- Manual evidence:
  - Home panel save/reload and authoring review
- Acceptance criteria:
  - selected definition families leave the registry
  - all public control behavior matches baseline
  - no cycle, saved-state loss, or hot-path allocation appears
- Rollback: One definition-family commit at a time.

### MILESTONE-15

- Status: Ready
- Outcome: Portfolio data/config and boot seams extracted
- Priority: Medium
- Parallel group: F
- Depends on: M10, M11
- Blocks: M16
- Owner: Unassigned
- Issues:
  - `MAINT-001` Portfolio hotspot
- Files:
  - `react-app/app/src/legacy/modules/portfolio/app.js`
  - `react-app/app/src/legacy/modules/portfolio/portfolio-content.js`
  - `react-app/app/src/legacy/modules/portfolio/portfolio-config.js`
  - new focused Portfolio helpers/tests
- Shared contracts:
  - `preloadPortfolioRoute`
  - `bootstrapPortfolio`
  - content/config shape
  - readiness/cleanup/focus/DOM selectors
- Must not change:
  - orbital interaction
  - CSS
  - drawer geometry handoff
  - animation tuning
- Verification commands:
  - M11 Portfolio characterization
  - `npm run check:portfolio-content`
  - `npm run check:site`
  - Portfolio gate/carousel/drawer/project-transition/transition-flow audits
- Manual evidence:
  - Chromium/WebKit remount and reduced-motion review
  - frozen selector contract for M16
- Acceptance criteria:
  - public preload/bootstrap signatures and readiness remain stable
  - normalization/boot responsibility leaves `app.js`
  - cleanup stays idempotent
  - Portfolio interaction/handoff/focus behavior passes
- Rollback: Separate data and boot extraction commits.

### MILESTONE-16

- Status: Ready
- Outcome: One owner for global versus Portfolio CSS
- Priority: Medium
- Parallel group: G
- Depends on: M07, M12, M15
- Blocks: None
- Owner: Unassigned
- Issues:
  - `MAINT-003` phase 2
- Files:
  - `react-app/app/public/css/main.css`
  - `react-app/app/public/css/portfolio.css`
  - M12 ownership assertions/report
  - focused CSS ownership references
- Shared contracts:
  - stylesheet order/specificity
  - shell and Portfolio DOM selectors
  - themes/breakpoints/gate/deck/sheet/drawer states
- Must not change:
  - approved rendered output
  - tokens or visual design
  - selector names without necessity
- Verification commands:
  - M12 selector/computed-style assertions
  - `npm run check:site`
  - Portfolio and transition audits
  - theme/frame matrices
  - `npm run certify:screens`
- Manual evidence:
  - Chromium/WebKit screenshot comparison
- Acceptance criteria:
  - every moved selector has one owner
  - no unreviewed duplicate remains
  - non-Portfolio shell styles are unchanged
  - approved screenshots and computed styles retain parity
- Rollback: One selector ownership group per commit.

## Human decisions

- `HD-01`: Unknown same-origin routes. Recommended: return no internal match and allow host 404. Blocks M08 only.
- `HD-02`: Durable generated evidence. Recommended: retain only named compressed evidence with reproduction notes. Blocks M09 only.
- `HD-03`: Git history rewrite. Recommended: defer to a separate measured programme. Blocks nothing.
- `HD-04`: CI smoke enforcement. Recommended: blocking after five stable runs within eight minutes. Local/advisory M01 work can proceed.
- `HD-05`: Future public About launch. Recommended: keep current production behavior and plan launch separately. Blocks no refactoring milestone.

## Integration checklist

- Verify dependency status before assigning a milestone.
- Verify exact file ownership against the conflict matrix.
- Do not run M05 with M06, M06 with M07, M08 with M13, M04 with M09, or M15 with M16.
- After each parallel group, inspect every worker diff and run the union of required checks.
- Update issue and milestone statuses only after integration evidence passes.
- At programme close, run `npm run studio:check`, the release smoke, required Chromium/WebKit matrices, and screenshot/benchmark review.
- Production publication remains a separate explicitly authorized action.
