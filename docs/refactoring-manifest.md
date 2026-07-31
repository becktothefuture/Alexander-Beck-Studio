# Refactoring Manifest

Last planned: 2026-07-30
Roadmap: `docs/refactoring-roadmap.md`
Audit: `docs/codebase-audit.md`

Execution update: Parallel group A was integrated and verified locally on 2026-07-30. `HD-04` is approved, but M01's advisory workflow is not yet on `origin/main`, so the qualifying CI-run count is zero. M02-M05 are verified. M05 corrected the audit's Loader shell assumption and completed route-registry validation without changing unknown-route behavior. See `docs/refactoring-progress.md` for acceptance and validation evidence.

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

- Status: Verified locally; advisory workflow is not yet on `origin/main`, so CI enforcement awaits five qualifying runs after publication
- Outcome: Bounded production-browser release smoke
- Priority: High
- Parallel group: A
- Depends on: None
- Blocks: M05, M06, M11
- Owner: `/root/m01_release_smoke`
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

- Status: Verified
- Outcome: Shared safeguards for every local JSON write route
- Priority: High
- Parallel group: A
- Depends on: None
- Blocks: None
- Owner: `/root/m02_api_guards`
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

- Status: Verified
- Outcome: Current About and test documentation agrees with code
- Priority: Medium
- Parallel group: A
- Depends on: None
- Blocks: None
- Owner: `/root/m03_docs_truth`
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

- Status: Verified
- Outcome: Measured artifact-retention policy and prevention check
- Priority: High
- Parallel group: A
- Depends on: None
- Blocks: M09
- Owner: `/root/m04_artifact_policy`
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

- Status: Verified
- Outcome: Complete route-registry drift validation and current mismatch repair
- Priority: High
- Parallel group: B
- Depends on: M01
- Blocks: M06, M08, M11
- Owner: `/root/m05_route_registry`
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
  - direct load for standalone Loader/Simulations and shared-shell Rift Rings
  - Home-to-Rift SPA navigation with document preservation
- Acceptance criteria:
  - every supported registry relationship is validated
  - Rift Rings has exact shell identity
  - standalone routes cannot own unreachable shell scenes
  - omission fixtures fail deterministically
- Deviation: Loader Playground is standalone and never rendered through `StudioShell`; the original second shell-identity requirement was false.
- Verification: 36 fixtures, 29 Vite inputs, 24 entry modules, 21 routes, 15 shell scenes, full gate, release smoke, and affected-route browser checks passed.
- Rollback: Revert validator, Rift metadata addition, and unreachable Simulations-case removal together.

### MILESTONE-06

- Status: Verified
- Outcome: Operable and semantically correct primary routes
- Priority: High
- Parallel group: C
- Depends on: M01, M05
- Blocks: M07, M08, M10
- Owner: `/root/m06_accessibility`
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
- Evidence: Targeted ESLint, build, strict release smoke, Canvas SPA, Portfolio carousel/drawer, desktop/mobile legend, and development About semantic checks passed. Independent review accepted the final stable-node landmark contract.
- Integration update: The authored collision value was restored later and `npm run studio:check` now passes; this earlier external limitation is resolved.

### MILESTONE-07

- Status: Deferred by user — targeted checks pass; full matrix and final review remain
- Outcome: Reliable global focus and compliant supporting-copy contrast
- Priority: High
- Parallel group: D
- Depends on: M01, M06
- Blocks: M12, M16
- Owner: `/root/m07_focus_contrast`
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

- Status: Verified
- Decision gate: `HD-01` approved 2026-07-30
- Outcome: One validated route identity manifest and explicit unknown-route behavior
- Priority: Medium
- Parallel group: D after decision
- Depends on: M05, M06, HD-01
- Blocks: None
- Owner: `/root/m08_route_manifest`
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
- Evidence: One source-readable manifest owns 21 route IDs, paths, aliases, titles, layouts, and shell-tab metadata while SiteApp retains explicit view/runtime imports. Unknown paths and standalone Loader/Simulations decline shared-shell SPA handling. The validator reconciles 29 Vite inputs, 24 entries, 21 descriptors, and 15 shell scenes through 53 fail-closed fixtures, including exact direct and local-wrapper runtime ownership. Simulation validation/deletion planning consumes the manifest and preflights every multi-source transform before writing. Full `check:site`, release smoke, route/simulation/HTML checks, deletion tests, 28 transition tests, lint/build, and Chromium/WebKit direct/SPA/history/unknown/standalone/Canvas/transition evidence passed. Independent review accepted Revision 2 with no findings.

### MILESTONE-09

- Status: Verified
- Decision gate: `HD-02` approved 2026-07-30
- Outcome: Ignored generated artifacts are no longer tracked in the current tree
- Priority: High
- Parallel group: B after decision
- Depends on: M04, HD-02
- Blocks: None
- Owner: `/root`
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
- Evidence: 13,776 policy-approved ignored generated/vendor/temp paths representing 1,099,684,630 indexed bytes were removed from the Git index only. Independent review confirmed all staged entries are deletions, every path matches current ignore policy and one of the six M04 groups, no authored/non-ignored path is staged, every local path still exists, the ignored-tracked inventory is zero, `.vscode/settings.json` remains tracked, and artifact plus full pre-commit checks pass. No history rewrite, commit, push, publication, or local file deletion occurred.

### MILESTONE-10

- Status: Verified
- Outcome: Measured legacy lint ratchet
- Priority: Medium
- Parallel group: E
- Depends on: M01, M06
- Blocks: M13, M14, M15
- Owner: `/root/m10_lint_ratchet`
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
- Evidence: Exact strict baseline covers 85 unused-variable findings in 33 files and 138 empty catches in 28 reasoned files. Mutation fixtures, app lint, syntax, and diff checks passed; corrected implementation received independent acceptance.
- Integration update: The authored collision value was restored later and `npm run studio:check` now passes; this earlier external limitation is resolved.

### MILESTONE-11

- Status: Verified
- Outcome: Stable characterization contracts for all three hotspots
- Priority: High
- Parallel group: E
- Depends on: M01, M05
- Blocks: M13, M14, M15
- Owner: `/root/m11_characterization`
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
- Implemented evidence: Route transactions 20/20; hotspot characterization 7/7; six-project content check; 37 sections and 336/336 control semantics; Chromium and WebKit direct plus SPA Portfolio lifecycle; release smoke, lint, build, invalid-input probes, syntax, and diff checks.
- Audit correction: The apparent keyboard route rebound was caused by beginning the SPA case before canonical Home readiness. The corrected audit waits for the overlay, transition, boot state, active tab, pending-route state, and the legacy-runtime or Daily-Focus readiness boundary. Both browser families pass with no production change.
- M14 prerequisite: Add representative parse/format and runtime-apply behavior probes for each definition family before moving it; do not freeze callback source text.
- Integration update: The authored collision value was restored later and `npm run studio:check` now passes; this earlier external limitation is resolved.

### MILESTONE-12

- Status: Accepted provisionally — refresh after M07 before M16
- Outcome: Complete CSS ownership inventory and cascade assertions
- Priority: Medium
- Parallel group: E
- Depends on: M01, M07
- Blocks: M16
- Owner: `/root/m15_portfolio_extraction`
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
- Evidence: 14/14 ownership tests; 8/8 Chromium/WebKit desktop/mobile light/dark states; 24/24 screenshots; ownership signature `a5530a077589a59db6a6d9987937b904eca620fbd99dccaf7b850c0466dc70af`; computed/provenance signature `19c107e25a501b8e66b2fc5aaacb58f878926dc5601a5dc5e9fc6aedccbdd4c7`; independent Revision 3 review accepted provisionally pending M07.

### MILESTONE-13

- Status: Verified
- Outcome: One transition observation/prewarm-readiness responsibility extracted
- Priority: Medium
- Parallel group: F
- Depends on: M10, M11
- Blocks: None
- Owner: `/root/m13_transition_extraction`
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
- Evidence: Route-readiness observation moved to one stateless motion module with the active runtime snapshot injected by the hook. Route checks pass 28/28; hotspot checks 12/12; build, lint, Canvas SPA, simulation lifecycle, route loader, and strict Chromium/WebKit transition evidence passed. Independent review accepted the final expanded event/timer/route-predicate coverage with no findings.
- Integration update: The authored collision value was restored later and `npm run studio:check` now passes; this earlier external limitation is resolved.

### MILESTONE-14

- Status: Verified
- Outcome: Control definitions separated from rendering/binding
- Priority: Medium
- Parallel group: F
- Depends on: M10, M11
- Blocks: None
- Owner: `/root/m14_control_definitions`
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
- Evidence: Four simulation-atmosphere sections containing 11 controls moved to `control-definitions/simulation-atmosphere-controls.js`; rendering, binding, persistence, public exports, and the other definition families remain owned by `control-registry.js`. The registry reduced from about 6,753 to 6,573 lines while the exact 37-section/336-control contract stayed stable. Control characterization passes 6/6, the combined hotspot suite passes 14/14, parse/format is exercised for every control, representative state/CSS/runtime/atmosphere/theme-profile callbacks and hydration pass, and deliberate metadata drift rejects. App lint, build, the exact lint ratchet and fixtures, Canvas SPA, manual panel save/reload, syntax, and diff checks passed. Independent review accepted the production boundary and final test hardening with no findings.
- Deferred evidence: Broad lifecycle fault injection and runtime-performance certification exposed unrelated existing risks now recorded as `TEST-002` and `PERF-001`. M14 adds no per-frame work or new production chunk.
- Integration update: The authored collision value was restored later and `npm run studio:check` now passes; this earlier external limitation is resolved.

### MILESTONE-15

- Status: Verified
- Outcome: Portfolio data/config and boot seams extracted
- Priority: Medium
- Parallel group: F
- Depends on: M10, M11
- Blocks: M16
- Owner: `/root/m15_portfolio_extraction`
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
- Evidence: Data/config/asset/project normalization moved to focused data/config/content modules; thumbnail prewarm caching, decoding, budgeting, retry, and diagnostics moved to `portfolio-prewarm.js`; `app.js` retains stable preload/bootstrap exports and the orbital/input core. `PORTFOLIO_DOM_CONTRACT` drives exact-one rendered selector assertions in Chromium/WebKit direct, SPA, and remount coverage. Hotspot checks pass 12/12, build/lint/content/cycle checks pass, and the full Portfolio browser matrix plus post-review focused reruns passed. Independent review accepted the corrected final delta with no findings.
- Integration update: The authored collision value was restored later and `npm run studio:check` now passes; this earlier external limitation is resolved.

### MILESTONE-16

- Status: Held — waits for M07 and M12; M15 is verified
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

- `HD-01`: Approved and applied. Unknown same-origin and standalone destinations decline shared-shell SPA handling so normal browser/host navigation owns them. M08 is verified.
- `HD-02`: Approved and applied. Retain none of the current ignored generated/vendor/temp paths in place; future durable evidence requires a named documented source location. M09 is verified.
- `HD-03`: Git history rewrite. Recommended: defer to a separate measured programme. Blocks nothing.
- `HD-04`: Approved. Promote the CI smoke to blocking after five stable GitHub Actions runs within eight minutes. It remains advisory until that external evidence exists.
- `HD-05`: Future public About launch. Recommended: keep current production behavior and plan launch separately. Blocks no refactoring milestone.

## Integration checklist

- Verify dependency status before assigning a milestone.
- Verify exact file ownership against the conflict matrix.
- Do not run M05 with M06, M06 with M07, M08 with M13, M04 with M09, or M15 with M16.
- After each parallel group, inspect every worker diff and run the union of required checks.
- Update issue and milestone statuses only after integration evidence passes.
- At programme close, run `npm run studio:check`, the release smoke, required Chromium/WebKit matrices, and screenshot/benchmark review.
- Production publication remains a separate explicitly authorized action.

## Independent milestone verdicts — 2026-07-30

These verdicts supersede completion labels for release planning while preserving milestone evidence above. Full acceptance-criteria reviews are in `docs/refactoring-review.md`.

| Milestone | Independent verdict | Required follow-up |
| --- | --- | --- |
| M01 | Changes required | Fix five-route smoke, integrate CI, collect five qualifying advisory runs. |
| M02 | Approved with follow-up | Address non-atomic multi-file writes under `OPS-003`. |
| M03 | Approved with follow-up | Keep live schema/route/count claims current under `DOC-002`. |
| M04 | Approved | Add the artifact check to integrated CI. |
| M05 | Approved | Run mutation fixtures in CI. |
| M06 | Approved with follow-up | Carry semantics into the completed M07 matrix. |
| M07 | Changes required | Complete the current five-route/40-state evidence and resolve or accept `A11Y-006`. |
| M08 | Changes required | Fix null-route boot regression `ARCH-003`. |
| M09 | Approved with follow-up | Dedicated commit verified; fresh integrated checkout still needed. |
| M10 | Approved with follow-up | At the 2026-07-30 review, the executable inventory was 122/84/32 rather than the earlier 118/85/33. |
| M11 | Approved | Retain explicit fixture review. |
| M12 | Changes required | Provisional only; refresh after M07. |
| M13 | Approved with follow-up | Repeat long transition browser matrix after integration. |
| M14 | Approved with follow-up | Do not continue line-count-driven extraction; `TEST-002`/`PERF-001` remain separate. |
| M15 | Approved with follow-up | Repeat long Portfolio browser audits after integration. |
| M16 | Unable to verify | No implementation; remains held behind M07 and refreshed M12. |

M09 does have a dedicated commit (`7fdb9ec6`). Earlier M09 wording that no refactor commit existed describes the pre-commit review checkpoint, not current history.

### New audit dependencies

- Release approval now depends on `TEST-003`, `ARCH-003`, `OPS-002`, and completion of the M01/`TEST-001` advisory-run and blocking-promotion decision recorded in `HD-04`.
- M12/M16 depend on M07 plus `A11Y-006` disposition.
- `DEP-001`, `OPS-003`, `TEST-002`, `PERF-001`, and `ARCH-004` belong to the next measured cycle unless their risk becomes release-critical.

## Current manifest status — 2026-07-31

This section supersedes only current status. The milestone evidence above remains a historical record.

| Work item | Current status | Confirmed evidence or remaining condition |
| --- | --- | --- |
| M01 / `TEST-001` | Local implementation verified; external qualification pending | Five-route smoke and local workflow checks pass. Five qualifying Actions runs, blocking promotion, and branch protection are not confirmed. |
| `TEST-003` | Resolved locally | Manifest-derived five-route smoke, route-aware focus, unexpected-console failure, and forced-failure probes pass. |
| M07 / `A11Y-006` | Verified resolved locally | The coherent report passes all 40 states. Playground light-mobile contrast and WebKit gate foreground blur are fixed. |
| M08 / `ARCH-003` | Resolved locally | Unknown paths preserve their URL, use the explicit Home fallback state, and pass fallback-host browser coverage. |
| M10 / `DOC-002` | Current | 125 legacy JavaScript/JSX files; 84 unused-variable findings in 32 files; 137 empty catches in 28 files. Earlier inventories are historical. |
| `TEST-002` | Resolved locally | Chromium/WebKit geometry and 6 of 6 lifecycle fault cases pass. |
| `PERF-001` | Partially resolved | Chromium has a stable mode-pass; WebKit is environment-invalid, so cross-browser certification remains pending. |
| `ARCH-004` | Partially resolved | Active cycle reduced from 12 modules/23 internal edges to 9 modules/15 internal edges; the remaining cycle is still debt. |
| `DEP-001` | Resolved locally | Node 22.19 or later; root and app full audits report zero findings. |
| `OPS-003` | Resolved locally; independently accepted | Serialized journaled transactions pass 30 of 30 focused tests. |
| M12 | Refreshed and accepted locally | 14/14 static checks, 8/8 browser states, and 24/24 inspected screenshots pass. |
| M16 | Completed locally | 8 hero/title and 6 locked-overlay blocks moved; 1605/483 rules became 1589/499, 428 overlaps became 413, 36 exact overlaps became 16, and both approved residual-conflict counts are zero. The computed signature remains `7de7352b7ce1e3c7a7c0a6c9dc9a65eba19fbf1920c692e85c56f91172219d01`. |
| `OPS-002` | Open | Requires an authorized, reviewable commit boundary and reproduced integrated checks. |

No commit, push, remote CI qualification, branch-protection change, or production publication is part of this status update.
