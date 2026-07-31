# Refactoring Progress

## Baseline

- Branch: `main` (seven commits ahead of `origin/main`)
- Commit: `4b9034d5` (`docs: add codebase audit and refactoring roadmap`)
- Existing uncommitted changes: None
- Build: Passed through `npm run check:site`; Vite built all 29 entries
- Tests: Passed through the canonical non-browser gate, including 214 About tests, 19 route-transition tests, five wall-geometry tests, three title-kerning tests, simulation-catalog validation, and focused source/configuration contracts
- Lint: Passed through `npm run check:site` (`eslint .` in `react-app/app`)
- Type checks: Not configured; the production application uses JavaScript/JSX and has no `typecheck` script or TypeScript/JavaScript project configuration
- Formatting: No repository formatter command or configuration is present
- Known pre-existing failures: None in the canonical non-browser gate
- Known pre-existing advisories: Vite reports one mixed static/dynamic import for `gate-modal-shared.js` and a minified Three.js chunk of about 505.20 kB
- Browser baseline: Not yet a required release gate; this is the gap owned by `MILESTONE-01`
- Generated files: Canonical `design-system.json` flattening passed parity; generated configuration is build output and is not authored directly
- Lockfiles: Root and `react-app/app` npm lockfiles are present and define the two install boundaries
- CI baseline: GitHub Pages runs `npm run check:site` before deployment but does not yet launch a browser
- Runtime state: Local authoring stopped; pre-existing safe public mirror on port 8014 left running; public tunnel stopped
- Date: 2026-07-30

## Programme status

- Parallel group A: Integrated and verified locally
- Parallel group B: `MILESTONE-05` and `MILESTONE-09` verified
- `MILESTONE-01`: Verified locally; `HD-04` approved, Pages enforcement remains advisory. The workflow change is not yet on `origin/main`, so there are zero qualifying CI runs.
- `MILESTONE-02`: Verified
- `MILESTONE-03`: Verified
- `MILESTONE-04`: Verified; its approved M09 cleanup is also verified
- `MILESTONE-05`: Verified after audit-assumption correction
- `MILESTONE-06`: Verified
- `MILESTONE-07`: Deferred by user after targeted browser checks; full 32-state matrix and final review remain
- `MILESTONE-08`: Verified after `HD-01` approval and three independent review rounds
- `MILESTONE-09`: Verified after `HD-02` approval
- `MILESTONE-10`, `MILESTONE-11`, and `MILESTONE-13` to `MILESTONE-15`: Verified
- `MILESTONE-12`: Accepted provisionally; refresh after `MILESTONE-07` before M16
- `MILESTONE-16`: Held until `MILESTONE-07` and `MILESTONE-12`; its M15 DOM dependency is verified
- Integration gate: `npm run studio:check` passes on the current tree after the authored collision value and About v6 test contract were reconciled
- Production publication: Not authorised and out of scope

## MILESTONE-01 — Establish a bounded production-browser release smoke

**Status:** Verified locally; advisory CI staging
**Agent:** `/root/m01_release_smoke`
**Started:** 2026-07-30
**Completed:** 2026-07-30

### Changes

Added a deterministic Chromium smoke for the production build and staged it as an advisory Pages workflow step. The smoke checks four direct loads, Button Bar SPA navigation and return, route/runtime identity, Home Canvas backing-store size, representative About semantics, representative keyboard focus, failure events, and retained failure artifacts.

### Files changed

- `package.json`
- `.github/workflows/gh-pages.yml`
- `scripts/audit-release-smoke.mjs`
- `scripts/lib/release-smoke-helpers.mjs`

### Acceptance criteria

- [x] Home, Portfolio, About, and Contact direct-load from production `dist`.
- [x] Primary navigation and one SPA return path preserve the browser document.
- [x] Runtime failure, final route/runtime identity, Canvas backing-store, representative semantics, and representative focus are asserted.
- [x] Handled failures retain diagnostics, screenshot, and trace artifacts.
- [x] The smoke stays inside the eight-minute budget; local runs complete in about 34 seconds.
- [ ] Five stable GitHub Actions runs remain; `HD-04` approves blocking enforcement after run five passes within budget.

### Verification

- Targeted tests: Six consecutive implementation runs passed before review; one post-review run passed in 33.7 seconds.
- Full tests: `npm run check:site` passed after the final review fixes.
- Build: Passed through `npm run check:site`.
- Lint: Passed through `npm run check:site`.
- Type checks: Not configured.
- Manual checks: Named assertion and five-second watchdog probes each produced non-empty `diagnostics.json`, `failure.png`, and `trace.zip`; port 8015 stopped after every run; port 8014 remained running.
- CI observation: The eight most recent successful Pages runs contain no advisory browser-install or release-smoke step because this workflow change is not yet on `origin/main`; qualifying run count is zero.
- Independent review: Initial route-identity, timeout, failure-reporting, shutdown, and semantic-scope findings were fixed; re-review reported no remaining findings.

### Audit issues

- `TEST-001`: Implementation verified locally; issue remains open until the approved blocking CI enforcement is proven and applied.

### Risks

Pages deployment will continue after an advisory smoke failure once the staging workflow is published. Actual Actions browser-install stability has not been measured; five qualifying runs are still required.

### Notes

The current smoke intentionally enforces the About `main`/`h1` contract as the representative semantic assertion. `MILESTONE-06` must expand semantic contracts to all four primary routes after it repairs their known markup defects.

## MILESTONE-02 — Standardize local authoring write safeguards

**Status:** Verified
**Agent:** `/root/m02_api_guards`
**Started:** 2026-07-30
**Completed:** 2026-07-30

### Changes

Applied one shared local JSON-write contract to all POST authoring routes. It enforces method, strict effective origin, JSON content type, declared and streamed size limits, parsing, endpoint validation, real-path-aware target containment, and consistent JSON errors while preserving valid response and About persistence contracts.

### Files changed

- `react-app/app/vite.dev-admin-plugin.js`
- `scripts/check-local-authoring-write-contract.mjs`
- `package.json` (orchestrator integration into the canonical gate)

### Acceptance criteria

- [x] All local POST routes share origin, content-type, body-size, JSON, and validation guards.
- [x] Configured targets and existing symlink ancestors cannot escape allowlisted real roots.
- [x] About ETag, conflict, diagnostics, and atomic persistence behavior remain intact.
- [x] The public mirror still returns 404 for `/api/*` and `/@fs/*`.
- [x] No production write server or client change was added.

### Verification

- Targeted tests: `npm run check:local-authoring-writes` passed 8/8; relevant About persistence/editor tests passed 27/27.
- Full tests: `npm run check:site` passed with the focused contract included.
- Build: Passed through `npm run check:site`.
- Lint: Passed.
- Type checks: Not configured.
- Manual checks: Temporary design, simulation-config, and About saves passed; canonical About, design, catalog, and activity files remained byte-identical; the running public mirror returned 404 for protected paths.
- Independent review: A scheme-insensitive origin comparison and weak symlink/streaming tests were found, fixed, and re-reviewed with no remaining findings.

### Audit issues

- `SEC-001`: Resolved.

### Risks

Manual non-browser clients must now provide a valid same-origin `Origin`, `Host`, and JSON media type. This is intentional defense in depth for the local-only server.

### Notes

Endpoint limits are 1 MiB for About/design writes and 256 KiB for simulation configuration/admin writes.

## MILESTONE-03 — Reconcile current About and test documentation

**Status:** Verified
**Agent:** `/root/m03_docs_truth`
**Started:** 2026-07-30
**Completed:** 2026-07-30

### Changes

Aligned the README, design constitution, system architecture, and development workflow with the current production/development About split and the actual source, Node, and Playwright test layers.

### Files changed

- `README.md`
- `DESIGN.md`
- `docs/reference/SYSTEM-ARCHITECTURE.md`
- `docs/development/DEV-WORKFLOW.md`

### Acceptance criteria

- [x] All four documents state that production renders `AboutComingSoon`.
- [x] The spatial narrative and editor are described as development-only.
- [x] Current Node and browser test layers are documented.
- [x] Canonical About development content is listed without implying a public launch.

### Verification

- Targeted tests: `npm run check:malformed-tokens` passed.
- Full tests: Integrated `npm run check:site` passed.
- Build: Passed through the integrated gate.
- Lint: Passed through the integrated gate.
- Type checks: Not configured.
- Manual checks: All documented commands and newly referenced paths exist; focused diff review found no remaining contradiction.

### Audit issues

- `DOC-001`: Resolved.

### Risks

None. This milestone changes documentation only.

### Notes

Future public About launch work remains separate product scope under `HD-05`.

## MILESTONE-04 — Define repository artifact retention and enforcement

**Status:** Verified
**Agent:** `/root/m04_artifact_policy`
**Started:** 2026-07-30
**Completed:** 2026-07-30

### Changes

Added deterministic ignored-tracked inventory tooling, a retention policy, and staged-artifact prevention integrated into the pre-commit check. No artifact was untracked, moved, deleted, or rewritten.

### Files changed

- `.gitignore`
- `scripts/precommit-check.sh`
- `scripts/check-repository-artifacts.mjs`
- `docs/development/REPOSITORY-ARTIFACT-RETENTION.md`

### Acceptance criteria

- [x] The inventory reconciles to 13,776 ignored tracked paths and 1,099,684,630 indexed bytes.
- [x] All current ignored generated groups are classified with reproduction or replacement notes.
- [x] Newly staged `.playwright-*`, `node_modules`, `output`, and temporary artifacts fail by default.
- [x] The `HD-02` retention proposal is explicit and reviewable.
- [x] The current tracked set and Git history remain unchanged.

### Verification

- Targeted tests: Deterministic detailed inventory hash repeated; clean, five-pattern violation, and exact-allowlist fixtures passed their expected outcomes.
- Full tests: `npm run check:site` passed.
- Build: Passed through the integrated gate.
- Lint: Passed through the integrated gate.
- Type checks: Not configured.
- Manual checks: `npm run precommit:check`, inventory reconciliation, staged-diff check, and index-versus-HEAD tree comparison passed.

### Audit issues

- `OPS-001`: Phase 1 verified; issue remains open pending decision-gated current-tree cleanup.

### Risks

Some historical browser sessions have no complete reproduction manifest. M09 must not start until the user approves or amends the zero-generated-retention recommendation.

### Notes

`HD-02` was later approved and applied by M09. Git history rewriting remains outside this programme under `ADR-005`.

## MILESTONE-05 — Make the complete route registry fail closed on drift

**Status:** Verified
**Agent:** `/root/m05_route_registry`
**Started:** 2026-07-30
**Completed:** 2026-07-30

### Changes

Added source-derived validation across Vite inputs, authored HTML, entry modules, route definitions and aliases, `SiteApp` descriptors and view ownership, reachable `StudioShell` scenes, and applicable simulation-catalog routes. Added exact Rift Rings metadata, removed the unreachable standalone Simulations scene, and corrected the original false assumption that standalone Loader Playground required a shell scene.

### Files changed

- `package.json`
- `scripts/validate-html-entries.mjs`
- `scripts/validate-route-registry.mjs`
- `react-app/app/src/components/app/StudioShell.jsx`

### Acceptance criteria

- [x] All 29 Vite inputs, 24 entry modules, and 21 `SiteApp` routes reconcile.
- [x] Route-view applicability follows exact authored `SiteApp` imports or local functions.
- [x] All 15 reachable shared-shell scenes are validated; standalone scenes fail closed.
- [x] Rift Rings has exact `data-sfid` and literal route-view metadata.
- [x] Loader Playground and Simulations remain standalone and have no shell scene.
- [x] Thirty-six omission, ownership, alias, catalogue, and metadata drift fixtures fail deterministically.
- [x] URLs, aliases, unknown-path fallback, and transition implementation remain unchanged.

### Verification

- Targeted tests: `npm run validate:route-registry:fixtures`, `npm run validate:route-registry`, `npm run validate:html-entries`, and `npm run sim:validate` passed.
- Full tests: `npm run check:site` passed.
- Build: Passed through the canonical gate.
- Lint: Passed through the canonical gate.
- Type checks: Not configured.
- Manual checks: Direct Loader, Simulations, and Rift routes passed; the supported Home-to-Rift SPA path preserved the document and exact metadata; release smoke passed; ports 8015 and 8016 were clear afterwards.
- Independent review: Three focused passes found the standalone-route contradiction and two fail-open validator gaps. All were corrected; final review reported no blocking findings.

### Audit issues

- `ARCH-001`: Phase 1 verified; consolidation and unknown-route behavior remain pending M08 and `HD-01`.
- `ARCH-002`: Newly recorded and deferred. The internal bridge can accept a standalone Loader destination that does not settle as an SPA route.

### Risks

The validator intentionally parses the repository's current readable source forms. A future syntax refactor can require parser updates, but unsupported forms fail closed.

### Notes

The latest redundant Home-to-Rift probe changed route correctly but used an invalid nested-content locator. It does not replace the earlier successful SPA proof. Loader's supported route contract is direct/hard navigation, not a shared-shell scene.

## Parallel group A integration

- `npm run check:site`: Passed, including the new 8-test local-write contract, 214 About tests, lint, config parity, and production build.
- `npm run audit:release-smoke`: Passed in 33.7 seconds across all four primary routes and three SPA return paths.
- `npm run precommit:check`: Passed.
- Artifact inventory: Reconciled to 13,776 paths and 1,099,684,630 indexed bytes.
- `git diff --check`: Passed.
- Existing advisories: The mixed `gate-modal-shared.js` import and approximately 505.20 kB Three.js chunk remain unchanged.
- Process ownership: Disposable port 8015 preview stopped; pre-existing port 8014 mirror remains running.

## MILESTONE-06 — Repair primary-route semantics and operability

**Status:** Verified
**Agent:** `/root/m06_accessibility`
**Started:** 2026-07-30
**Completed:** 2026-07-30

### Changes

Established an explicit primary-route landmark contract while preserving the identity of the stable `#simulations` shell node. Replaced Home legend div controls with native pressed-state buttons, added an accessible status contract and complete runtime cleanup, removed empty route mains, corrected the four primary heading contracts, and restored selection only inside Portfolio drawer reading content. Strengthened release smoke coverage for direct loads and SPA transitions.

### Files changed

- `react-app/app/src/components/app/StudioShell.jsx`
- `react-app/app/src/components/app/SiteApp.jsx`
- `react-app/app/src/routes/home/HomeRoute.jsx`
- `react-app/app/src/routes/portfolio/PortfolioRoute.jsx`
- `react-app/app/src/routes/contact/ContactRoute.jsx`
- `react-app/app/src/routes/contact/ContactRouteContent.jsx`
- `react-app/app/src/routes/about/AboutRoute.jsx`
- `react-app/app/src/routes/about/AboutComingSoon.jsx`
- `react-app/app/src/legacy/main.js`
- `react-app/app/src/legacy/modules/ui/legend-filter.js`
- `react-app/app/public/css/main.css`
- `react-app/app/public/css/portfolio.css`
- `scripts/audit-release-smoke.mjs`
- `scripts/lib/release-smoke-helpers.mjs`

### Acceptance criteria

- [x] Home, Portfolio, production About, and Contact expose one meaningful labelled main and one route-purpose `h1`.
- [x] `#simulations` preserves exact object identity through every release-smoke SPA hop.
- [x] Development About retains one internal main and one `h1` without a nested shell landmark.
- [x] Home filters are tabbable native buttons with exact pressed and status behavior.
- [x] Legend initialization and cleanup are idempotent across route remounts.
- [x] Portfolio drawer reading content is selectable while the deck remains non-selectable.
- [x] Existing visuals, Canvas ownership, route lifecycle, and Portfolio drag behavior remain unchanged.

### Verification

- Targeted tests: M06 source ESLint passed.
- Build: `npm run build` passed.
- Browser smoke: strict release smoke passed in approximately 49.7 seconds, including direct and SPA semantic contracts.
- Runtime audits: Canvas SPA passed 17 snapshots and eight Home/Portfolio round trips; Portfolio carousel and all six project drawers passed.
- Manual/browser checks: desktop and 390 px mobile legend behavior passed; development About on port 8012 exposed exactly one main and one labelled `h1`.
- Independent review: Three review/fix cycles corrected stable-node and development-About landmark issues. Final review reported no findings.
- Integration update: The authored collision value was restored later and `npm run studio:check` now passes; this earlier external limitation is resolved.

### Audit issues

- `A11Y-002`: Resolved.
- `A11Y-003`: Resolved.
- `A11Y-005`: Resolved.

### Risks

The release smoke now intentionally fails if a primary semantic contract is removed or if `#simulations` is replaced during a supported SPA transition. Active external changes in `design-system.json`, its generated output, Button Bar controls, and adjacent CSS remain outside this milestone and were preserved.

## MILESTONE-10 — Introduce a measured legacy lint ratchet

**Status:** Verified
**Agent:** `/root/m10_lint_ratchet`
**Completed:** 2026-07-30

### Changes

Removed the directory-wide legacy lint exemptions without changing runtime source. Normal unused-variable checking now applies automatically to clean and new legacy files. Existing unused-variable and empty-catch debt is kept as an exact reviewed signature baseline with narrow reasoned config exceptions and fail-closed mutation fixtures.

### Files changed

- `react-app/app/eslint.config.js`
- `scripts/check-legacy-lint-ratchet.mjs`
- `scripts/fixtures/legacy-lint-debt-baseline.json`
- `package.json`

### Acceptance criteria

- [x] Normal unused-variable checking applies to 85 of 118 legacy files.
- [x] The remaining 85 unused-variable findings are explicit across 33 files.
- [x] The remaining 138 empty catches are explicit across 28 reasoned best-effort files.
- [x] New findings in an allowlisted file cannot be hidden by removing a different finding.
- [x] Reductions cannot regrow without an explicit baseline diff.
- [x] Traversal, aliases, resolved duplicates, missing paths, and out-of-tree paths fail closed.
- [x] No runtime, compatibility, or performance field changed.

### Verification

- `npm run check:legacy-lint-ratchet`: Passed.
- `npm run check:legacy-lint-ratchet:fixtures`: Passed.
- `npm run lint --prefix react-app/app`: Passed.
- Script syntax and `git diff --check`: Passed.
- Independent review: The first aggregate implementation was rejected for four fail-open gaps. The corrected exact-signature implementation was accepted with no findings.
- Integration update: The authored collision value was restored later and `npm run studio:check` now passes; this earlier external limitation is resolved.

### Audit issues

- `MAINT-002`: Resolved.

### Risks

The exact baseline intentionally detects line movement in debt files. A legitimate edit can require an explicit baseline refresh and review even when total debt does not change.

## MILESTONE-11 — Characterize hotspot behavior before extraction

**Status:** Verified
**Agent:** `/root/m11_characterization`
**Date:** 2026-07-30

### Changes

Added focused characterization for transition participants, all 336 active control definitions and generated semantics, Portfolio data/config normalization, and observable Portfolio direct boot, readiness, cleanup, remount, selectors, and focus return. No production hotspot was edited.

### Files changed

- `package.json`
- `scripts/check-route-transition-transaction.mjs`
- `scripts/check-control-registry-characterization.mjs`
- `scripts/check-portfolio-characterization.mjs`
- `scripts/lib/portfolio-characterization-contract.mjs`
- `scripts/fixtures/control-registry-characterization.json`
- `scripts/fixtures/portfolio-hotspot-characterization.json`
- `scripts/audit-portfolio-characterization.mjs`
- `scripts/audit-portfolio-project-transition.mjs`

### Verification

- Route transactions: 20/20 passed.
- Hotspot characterization: 7/7 passed.
- Portfolio content: Six projects passed.
- Control contract: 37 sections and 336/336 applicable controls, including exact constraints, options, state, callbacks, generated values, and puck-only markup.
- Invalid browser/case and deliberate contract-break probes fail closed.
- Chromium and WebKit direct Portfolio boot/readiness/selectors/focus passed.
- Chromium pointer lifecycle and quick Canvas SPA passed.
- Chromium and WebKit direct plus keyboard-style SPA lifecycles passed after the audit was corrected to wait for canonical initial Home readiness.
- Release smoke, app lint, the exact legacy lint ratchet, production build, invalid browser/case probes, syntax, and diff checks passed.
- Targeted production navigation and transition diff is empty; the correction is confined to the audit.
- Integration update: The authored collision value was restored later and `npm run studio:check` now passes; this earlier external limitation is resolved.

### Audit issues

- `MAINT-001`: Characterization phase verified; remains In progress for M13-M15.

### Risks

The initial rebound report was a false failure caused by starting the SPA case before Home's boot overlay and readiness lifecycle had settled. Daily Focus is route-backed and can be ready without a legacy runtime snapshot, so the corrected precondition accepts its explicit ready state. The remaining non-blocking test gap is callback behavior: M14 must add representative parse/format and runtime-apply probes for each definition family before extraction.

## MILESTONE-13 — Extract transition observation from route mutation

**Status:** Verified
**Agent:** `/root/m13_transition_extraction`
**Date:** 2026-07-30

### Changes

Moved the complete route-readiness observation boundary from `useShellRouteTransition.js` into the stateless `route-transition-readiness.js` motion module. The hook still owns transaction sequencing and injects the active legacy-runtime snapshot reader.

### Files changed

- `react-app/app/src/hooks/useShellRouteTransition.js`
- `react-app/app/src/lib/motion/route-transition-readiness.js`
- `scripts/check-route-transition-transaction.mjs`

### Acceptance criteria

- [x] One named observation responsibility left the hook.
- [x] Hook inputs, return values, legal phases, history, focus, timing, and recovery remain unchanged.
- [x] No circular dependency or mutable global state was added.
- [x] Ready, failed, timeout, cancel, retarget, reduced-motion, and history flows passed.

### Verification

- Route-transition characterization: 28/28 passed.
- Combined hotspot characterization: 12/12 passed.
- Simulation-switch transactions: 14/14 passed.
- App lint, build, route registry, syntax, and diff checks passed.
- Route loader, focused simulation lifecycle, and strict transition flows passed in Chromium and WebKit.
- Canvas SPA passed 17 snapshots across eight round trips.
- Chromium reduced-motion, stress/retarget, preload-failure, and delayed-readiness variants passed.
- Independent review rejected shallow seam tests, then accepted the expanded event, timer, cleanup, audit-delay, and route-predicate coverage with no findings.
- Integration update: The authored collision value was restored later and `npm run studio:check` now passes; this earlier external limitation is resolved.

### Audit issues

- `MAINT-001`: Transition hotspot phase resolved; issue remains In progress for the control-registry and Portfolio phases.

### Risks

One broad Chromium sample reported a transient 1.008px title-centre drift; the exact isolated rerun passed at 1px. The extracted module does not write geometry. Dormant stable-frame code remains outside the active path because the required frame count is fixed at zero.

## MILESTONE-15 — Extract stable Portfolio data and boot seams

**Status:** Verified
**Agent:** `/root/m15_portfolio_extraction`
**Date:** 2026-07-30

### Changes

Moved cached Portfolio data/config loading, asset/project normalization, and thumbnail prewarming out of `app.js`. Configuration and pure content normalization now have focused owners, and the browser characterization consumes one exact selector/state-marker contract for M16.

### Files changed

- `react-app/app/src/legacy/modules/portfolio/app.js`
- `react-app/app/src/legacy/modules/portfolio/portfolio-config.js`
- `react-app/app/src/legacy/modules/portfolio/portfolio-content.js`
- `react-app/app/src/legacy/modules/portfolio/portfolio-data.js`
- `react-app/app/src/legacy/modules/portfolio/portfolio-prewarm.js`
- `react-app/app/src/legacy/modules/portfolio/portfolio-dom-contract.js`
- `react-app/app/src/legacy/modules/portfolio/project-drawer.js`
- `scripts/audit-portfolio-characterization.mjs`
- `scripts/check-portfolio-characterization.mjs`
- `scripts/lib/portfolio-characterization-contract.mjs`
- `docs/reference/PORTFOLIO.md`

### Acceptance criteria

- [x] `preloadPortfolioRoute` and `bootstrapPortfolio` public signatures remain stable.
- [x] Data, content, runtime normalization, and prewarming have focused owners outside the application class.
- [x] Cleanup remains idempotent across SPA remounts.
- [x] Orbital interaction, selection, drawer handoff/reversal, reduced motion, and focus return passed.
- [x] M16 has one rendered, exact-count DOM selector and state-marker contract.

### Verification

- Combined hotspot characterization: 12/12 passed.
- Portfolio content: Six projects passed.
- App lint, production build, syntax, diff, and ten-module import-cycle checks passed.
- Chromium and WebKit direct, SPA, remount, focus, and exact DOM-contract characterization passed.
- Gate and drawer passed in Chromium and WebKit; all six drawers were exercised.
- Full carousel stress passed across traversal, reversal, remount, mobile, and reduced motion.
- Project handoff/reversal and route-transition flows passed in Chromium and WebKit, including desktop/mobile and reduced motion.
- Missing and duplicate route-node mutations fail the DOM contract.
- Independent review rejected three boundary gaps and one uniqueness loophole; all were corrected, then accepted with no findings.
- Integration update: The authored collision value was restored later and `npm run studio:check` now passes; this earlier external limitation is resolved.

### Audit issues

- `MAINT-001`: Portfolio hotspot phase resolved; M14 completed the remaining planned hotspot phase.

### Risks

No M15 regression remains. Existing Vite mixed-import and large Three.js chunk advisories are unchanged. M16 must consume `PORTFOLIO_DOM_CONTRACT` without moving or renaming the frozen nodes and markers.

## MILESTONE-14 — Separate simulation-atmosphere control definitions

**Status:** Verified
**Agent:** `/root/m14_control_definitions`
**Date:** 2026-07-30

### Changes

Moved the four simulation-atmosphere definition sections and their 11 controls into one focused definition module. The registry still owns rendering, binding, persistence, public lookup exports, and all other definition families.

### Files changed

- `react-app/app/src/legacy/modules/ui/control-registry.js`
- `react-app/app/src/legacy/modules/ui/control-definitions/simulation-atmosphere-controls.js`
- `scripts/check-control-registry-characterization.mjs`
- `scripts/fixtures/control-registry-characterization.json`
- `scripts/fixtures/legacy-lint-debt-baseline.json`

### Acceptance criteria

- [x] The selected definition family left the registry without changing IDs, order, defaults, metadata, or generated semantics.
- [x] Rendering, binding, persistence, public registry exports, and saved-state format stayed stable.
- [x] No cycle, new production chunk, or per-frame work was added.
- [x] Panel save/reload and representative apply/hydration behavior passed.

### Verification

- Control characterization: 6/6 passed; exact 37 sections and 336 controls retained.
- Combined hotspot characterization: 14/14 passed.
- Type-correct parse/format runs for all 336 controls. State, CSS, runtime-ball, atmosphere, and light-theme profile apply/hydration probes passed.
- Intentional `designScope`, `group`, and `hint` metadata drift fails closed.
- App lint, build, exact legacy lint ratchet and fixtures, syntax, diff, Canvas SPA, and manual Home panel save/reload passed.
- Independent review accepted both the production extraction and final test-only hardening with no findings.
- Integration update: The authored collision value was restored later and `npm run studio:check` now passes; this earlier external limitation is resolved.

### Audit issues

- `MAINT-001`: Resolved for the planned M11/M13/M14/M15 characterization and extraction programme.
- `TEST-002`: Deferred; broad lifecycle fault injection still has reproducible recovery and WebKit geometry failures outside the M14 boundary.
- `PERF-001`: Deferred; current runtime performance certification is red and needs a stable comparison contract before optimization.

### Risks

The broad simulation lifecycle matrix reported `failure-did-not-recover-outgoing:repel-room` in Chromium and WebKit preload-fault cases, plus reproducible 1.016-1.023px WebKit reduced-motion title-centre drift. Performance samples also missed the current frame-time gate, including a cold `pit` sample. M14 changes definition ownership only, adds no frame-loop work, and passed its focused behavior tests, so these findings are tracked separately instead of being misclassified as extraction regressions.

## Programme integration checkpoint — safe executable scope

**Status:** Superseded; current canonical gate passes
**Date:** 2026-07-30

- Route-transition characterization: 28/28 passed.
- Combined hotspot characterization: 14/14 passed.
- Portfolio content: Six projects passed.
- Exact legacy lint ratchet and mutation fixtures passed with 85 reviewed unused-variable findings and 138 reviewed empty catches.
- App lint, production build, About production-assets check, and `git diff --check` passed.
- Vite advisories remain unchanged: mixed static/dynamic `gate-modal-shared.js` ownership and the approximately 505.20 kB Three.js chunk.
- At this checkpoint, `npm run check:site` stopped because the authored design config omitted required `runtime.simulationCollisionInsetPx: 0`. That value was restored later, and the current `npm run studio:check` passes.
- Local authoring on 8012, the safe public mirror on 8014, and the existing Cloudflare tunnel remain running. Owned validation previews on 8028, 8031, 8032, and 8033 are stopped.
- Branch `main` remains at `ec3dba41`, exactly synchronized with `origin/main`; the working tree contains the integrated refactor plus pre-existing user changes. Nothing was staged, committed, pushed, or published.
- This checkpoint was superseded when the user approved the remaining decisions. M08 and M09 are verified; M07 is deferred by the user; M12 is accepted provisionally; M16 remains held for the M07/M12 refresh; M01 has zero qualifying Actions runs because its advisory workflow is not yet on `origin/main`.

## MILESTONE-09 — Remove ignored generated artifacts from Git tracking

**Status:** Verified
**Agent:** `/root`
**Reviewer:** `/root/m10_review`
**Date:** 2026-07-30

### Changes

Applied the approved `HD-02` retention decision with an exact NUL-delimited index-only removal. Generated browser evidence, vendored dependencies, and temporary outputs remain on the local filesystem but no longer exist in fresh checkouts after commit `7fdb9ec6`.

### Verification

- 13,776 unique staged paths; every entry is a deletion.
- Exact approved indexed size: 1,099,684,630 bytes across all six M04 groups.
- Zero staged additions, copies, modifications, renames, authored paths, or non-ignored paths.
- Every staged path matches current ignore policy; the ignored-tracked inventory is now zero.
- All 13,776 local paths still exist; representative files from every group match their indexed sizes.
- `.vscode/settings.json` remains tracked and is not ignored.
- Staged-artifact enforcement and the full pre-commit checklist passed.
- Commit `7fdb9ec6` contains only the reviewed 13,776 index deletions. No history rewrite, push, publication, or local file deletion occurred.

### Audit issues

- `OPS-001`: Resolved for the current tree. Historical pack reduction remains outside this programme under `ADR-005`.

## MILESTONE-08 — Consolidate route identity behind one manifest

**Status:** Verified
**Agent:** `/root/m08_route_manifest`
**Reviewer:** `/root/m05_review`
**Date:** 2026-07-30

### Changes

Added one static route manifest for IDs, canonical paths, aliases, titles, shared-shell/standalone applicability, and Button Bar metadata. SiteApp still owns explicit view/runtime imports. Unknown paths no longer become Home, and standalone routes decline shared-shell SPA handling.

### Verification

- Route registry: 29 Vite inputs, 24 entry modules, 21 SiteApp routes, and 15 shell scenes.
- Fail-closed registry fixtures: 53 classes, including view/runtime owner omission, ambiguity, mismatch, and local-wrapper delegate ownership.
- Simulation catalogue: 27 simulations, 17 daily, zero candidates.
- Transactional deletion tests prove supported manifest/Vite/SiteApp removal and byte-identical rejection before writes.
- Route transitions: 28/28 passed; release smoke and full `check:site` passed.
- Canvas SPA passed 17 snapshots across eight round trips in Chromium and WebKit.
- All 21 canonical routes direct-loaded correctly in both engines. Known SPA, Back, unknown-decline, standalone Loader/Simulations, and transition flows passed.
- Independent review found four integration/validation defects over two rounds. Every finding was fixed; Review 3 accepted with no findings.

### Audit issues

- `ARCH-001`: Resolved.
- `ARCH-002`: Resolved.
- `HD-01`: Approved and applied; host-owned 404 behavior remains intentionally outside the project shell.

## MILESTONE-12 — Inventory CSS ownership and assert the current cascade

**Status:** Accepted provisionally pending M07
**Agent:** `/root/m15_portfolio_extraction`
**Reviewer:** `/root/m05_review`
**Date:** 2026-07-30

### Changes

Added a fail-closed global/Portfolio selector inventory, frozen computed-style and provenance contract, transactional evidence promotion, and a documented M16 move plan without changing production CSS or JavaScript.

### Verification

- Ownership contract: 14/14 tests passed.
- Current inventory: 1,605 global rules, 483 Portfolio rules, 428 overlaps.
- Ownership signature: `a5530a077589a59db6a6d9987937b904eca620fbd99dccaf7b850c0466dc70af`.
- Computed/provenance signature: `19c107e25a501b8e66b2fc5aaacb58f878926dc5601a5dc5e9fc6aedccbdd4c7`.
- Explicit-update and normal no-update runs each passed 8/8 Chromium/WebKit desktop/mobile light/dark states and 24/24 screenshots.
- All eight current drawer screenshots show an unobstructed authoritative-open sheet. Chromium/WebKit gate flows and all six project drawers passed.
- Failed validation and simulated fixture-replacement failure preserve or roll back the approved fixture and evidence together.
- Independent review accepted Revision 3 provisionally. WebKit gate self-blur remains deferred.

### Follow-up

M07 can change the CSS/token baseline. After M07 is accepted, rerun the 14 tests and complete browser matrix before treating this inventory as the M16 migration baseline.

## Historical independent programme review — 2026-07-30

**Status:** Requires targeted fixes before release
**Review:** `docs/refactoring-review.md`
**Baseline:** `4b9034d5`
**Reviewed HEAD:** `bc12fd81`

### Verified improvements

- Route registry validator and 55 mutation fixtures pass. Current counts: 30 inputs, 25 entries, 22 route descriptors, 16 shell scenes.
- Shared local write contract passes 12/12.
- Route transition suite passes 28/28.
- Hotspot characterization passes 14/14.
- Legacy lint ratchet and mutations passed. At that checkpoint, the inventory was 122 files, 84 unused findings in 32 files, and 138 empty catches in 28 files.
- Portfolio CSS ownership source checks pass 14/14.
- Canonical `npm run studio:check` passes on the reviewed working tree.
- Production-only dependency audits report zero findings.
- M09 is committed as `7fdb9ec6`; current ignored-tracked inventory is zero.

### Failed or incomplete evidence

- At that checkpoint, the release smoke failed on Playground focus discovery (`TEST-003`).
- At that checkpoint, unknown direct paths could crash initial route state on fallback hosts (`ARCH-003`).
- At that checkpoint, M07 was incomplete; the five-route contract was 40 states. WebKit gate self-blur remained `A11Y-006`.
- At that checkpoint, M12 was provisional and M16 had not started.
- At that checkpoint, `TEST-002` and `PERF-001` remained open.
- At that checkpoint, full development/build audits reported toolchain advisories (`DEP-001`), although production graphs were clean.
- Only M09 has a dedicated refactor commit. The pre-review snapshot mixed the remaining programme evidence into 68 modified and 37 untracked status entries (`OPS-002`).

### Independent milestone result

- **Changes required:** M01, M07, M08, M12.
- **Approved:** M04, M05, M11.
- **Approved with follow-up:** M02, M03, M06, M09, M10, M13, M14, M15.
- **Unable to verify:** M16.

No production publish, push, or new commit was performed by this review.

## Corrective-cycle checkpoint — 2026-07-31

**Status:** Local corrective work is partly verified; release approval remains blocked by pending local and external evidence.

### Confirmed local results

- `npm run check:site` passes on the integrated local tree.
- The production release smoke covers five manifest-derived routes, rejects unexpected console errors, and passes. Its unknown-path fallback-host audit also passes. Passing runs retain a schema-versioned `summary.json`; the verified 2026-07-31 run recorded nine route phases and zero page, console, response, or request failures.
- Route ownership is 30 Vite inputs, 25 entry modules, 22 `SiteApp` routes, and 16 shell scenes.
- The active legacy inventory is 126 JavaScript/JSX files, with 84 unused-variable findings in 32 files and 136 empty catches in 27 files.
- The simulation lifecycle evidence passes in Chromium and WebKit, including geometry and all 6 fault cases.
- Atomic local authoring work is independently accepted with 30 of 30 focused tests.
- Root and app full dependency audits report zero findings. The required Node version is 22.19 or later.
- The active legacy cyclic component is reduced from 12 modules/23 internal edges to 9/15 through the mode-button seam, then to 5/8 through the scene-pointer event port.
- Chromium performance has a stable mode-pass artifact. WebKit performance is environment-invalid, not a mode failure.
- M07 passes all 40 states in `output/playwright/focus-contrast/results-2026-07-31T07-56-53-938Z-all-all-all-all.json`. The verified fixes are Playground light-mobile contrast and deterministic focus evidence through iframe animation freeze.
- `A11Y-006` is resolved locally. The Portfolio gate foreground remains sharp over the independently blurred route.
- Refreshed M12 passes 14 of 14 static checks, 8 of 8 browser states, and all 24 inspected screenshots.
- M16 moved 8 hero/title and 6 locked-overlay blocks to `portfolio.css`. Rule counts are 1589/499, overlaps are 413, exact overlaps are 16, and both approved residual-conflict counts are zero. Update and normal audits pass with computed signature `7de7352b7ce1e3c7a7c0a6c9dc9a65eba19fbf1920c692e85c56f91172219d01`.

### Issue status changes

- Resolved locally: `TEST-002`, `TEST-003`, `ARCH-003`, `DEP-001`, and `OPS-003`.
- Resolved for current documentation: `DOC-002`.
- Partially resolved: `ARCH-004` and `PERF-001`.
- Verified resolved locally: `A11Y-006` and M07.
- Refreshed/accepted locally: M12.
- Completed locally: M16.
- Still open: `OPS-002` and `TEST-001` external qualification. `PERF-001` remains partial.

### Pending evidence

- Final integrated local gates must run after these documentation edits.
- The CI workflow exists only in the local working tree. It has no qualifying remote-run history and no confirmed branch-protection enforcement.
- The integrated work has no authorized reviewable commit boundary. Nothing in this checkpoint was committed, pushed, or published.
