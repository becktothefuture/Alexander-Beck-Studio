# PRD: React Conversion with Shared Frame and Visual Parity

## Clarifying Questions and Answers (Resolved)

1. What page scope should this conversion include?
   A. 3 Pages only (`index`, `portfolio`, `cv`)  
   B. All HTML pages  
   C. 3 pages + simulations test page  
   **Answer: A**

2. How should behavior be migrated?
   A. Bridge-first (reuse existing JS runtime modules)  
   B. Hybrid refactor (mixed bridge + rewritten React behavior)  
   C. Full React rewrite now  
   **Answer: A**

3. Which route model should be used?
   A. SPA with React Router  
   B. Multi-entry React (`index.html`, `portfolio.html`, `cv.html`)  
   C. Hash routing  
   **Answer: B**

4. How should React-adherence deviations be handled?
   A. Discuss-first before applying deviation  
   B. Auto-apply low-risk deviations  
   C. Aggressive modernization  
   **Answer: A**

5. What is the target folder?
   A. `react-app` at repo root  
   B. Branded folder name  
   C. Generic conversion folder name  
   **Answer: A**

## 1. Introduction / Overview

Convert the existing static HTML/CSS/JS website into a new React project located in a **new root subfolder** (`react-app`) without editing any original project files.

The converted React app must:
- preserve visual and interaction parity across the 3 primary pages (`index`, `portfolio`, `cv`)
- use a **shared page frame** architecture so the same structural shell is reused across all pages
- keep existing optimized runtime behavior intact via bridge-first integration
- provide side-by-side validation against the current source site

This PRD defines the migration scope, constraints, acceptance criteria, and validation gates for a production-grade conversion plan.

## 2. Goals

- Create a new React app in `/react-app` with no changes to existing source files.
- Maintain no perceived design drift versus the current implementation.
- Reuse one shared frame/shell across all three converted pages.
- Preserve key runtime optimizations and behavioral characteristics from the current implementation.
- Provide deterministic side-by-side visual parity checks at required breakpoints.
- Produce migration documentation that enables a junior developer or agent to implement safely.
- Preserve current page-entry URL model (`index.html`, `portfolio.html`, `cv.html`) rather than switching to SPA routing in this phase.

## 3. Current Optimization Baseline (Rescan Snapshot)

The conversion must preserve compatibility with the current optimization state:

- Runtime includes independent feature flags in `source/config/default-config.json`:
  - `featureRenderSchedulerEnabled`
  - `featureLazyModeLoadingEnabled`
  - `featureQualityTieringEnabled`
  - `featureCrittersNeighborCacheEnabled`
- Mode system uses daily-mode-first + dynamic mode module loading with cache (`source/modules/modes/mode-controller.js`).
- Render loop is optimized and visibility-aware with adaptive throttling (`source/modules/rendering/loop.js`).
- Dev performance HUD is available and dev-gated (`source/modules/utils/performance.js`).
- Critters mode includes spatial hash and neighbor cache optimization (`source/modules/modes/critters.js`).
- Physics collision path reuses structures to avoid per-frame allocations (`source/modules/physics/collision.js`).
- Procedural noise system caches ImageData/typed arrays to reduce regeneration overhead (`source/modules/visual/noise-system.js`).
- Dark mode and browser chrome color synchronization include Safari/PWA-safe behavior (`source/modules/visual/dark-mode-v2.js`).
- Shared chrome initialization already exists (`source/modules/ui/shared-chrome.js`) and should map cleanly to React page shells.

## 4. User Stories

### US-001: Create isolated React conversion workspace
**Description:** As a developer, I want a separate conversion workspace so that original files cannot be accidentally modified.

**Acceptance Criteria:**
- [ ] New root folder exists at `react-app`
- [ ] Conversion artifacts exist under `react-app/conversion`
- [ ] No original files in `source/` are edited by the conversion setup
- [ ] `npm run build` (original project) still completes successfully

### US-002: Define source contract and DOM dependency map
**Description:** As a developer, I want a DOM contract for legacy runtime dependencies so that React structure changes do not break behavior.

**Acceptance Criteria:**
- [ ] Contract file lists required IDs/classes per page
- [ ] Contract explicitly marks parity-critical selectors (e.g., `#abs-scene`, `#app-frame`, modal layer IDs)
- [ ] Contract includes module dependency mapping for home/portfolio/cv bootstraps
- [ ] Document is stored in `react-app/conversion/`

### US-003: Configure multi-entry React architecture
**Description:** As a user, I want each page to keep its own URL entry so navigation behavior matches current hosting patterns.

**Acceptance Criteria:**
- [ ] React app exposes `index.html`, `portfolio.html`, `cv.html`
- [ ] Each entry mounts the correct page component
- [ ] Shared layout/frame is imported by all page entries
- [ ] `npm run build` (React app) produces all three entries
- [ ] Verify in browser using dev-browser skill

### US-004: Implement reusable shared frame component
**Description:** As a user, I want all three pages to share the same visual frame so the UI remains consistent and modular.

**Acceptance Criteria:**
- [ ] A single reusable frame component is used by home, portfolio, and cv pages
- [ ] Shared frame preserves structure for header/center/footer/modal host layers
- [ ] Shared frame supports page-specific slot content
- [ ] No perceived visual drift in frame geometry/spacing
- [ ] Verify in browser using dev-browser skill

### US-005: Bridge legacy Home runtime into React
**Description:** As a user, I want the home experience to behave exactly as it does now after conversion.

**Acceptance Criteria:**
- [ ] Home page boots legacy behavior through a React lifecycle bridge
- [ ] Existing entrance behavior and daily simulation startup are preserved
- [ ] Main interactive links and modal triggers still work
- [ ] No duplicate initialization during dev hot-reload
- [ ] Verify in browser using dev-browser skill

### US-006: Bridge legacy Portfolio runtime into React
**Description:** As a user, I want the portfolio carousel and detail interactions to remain unchanged.

**Acceptance Criteria:**
- [ ] Portfolio page boots its legacy module from React mount lifecycle
- [ ] Carousel drag/wheel interactions remain equivalent
- [ ] Detail overlay open/close behavior remains equivalent
- [ ] Sound slot, social controls, and footer meta remain aligned
- [ ] Verify in browser using dev-browser skill

### US-007: Bridge legacy CV runtime into React
**Description:** As a user, I want CV scrolling and media behavior to remain unchanged.

**Acceptance Criteria:**
- [ ] CV page boots its legacy module from React mount lifecycle
- [ ] CV scroll typography and slideshow behavior remain equivalent
- [ ] CV page nav links and modal triggers remain equivalent
- [ ] No visual regressions in fixed/scroll regions
- [ ] Verify in browser using dev-browser skill

### US-008: Preserve first-paint and theme/chrome behavior
**Description:** As a mobile user, I want no white flash or theme mismatch during page load.

**Acceptance Criteria:**
- [ ] First-paint critical wall/theme behavior is preserved
- [ ] Theme-color meta synchronization remains correct on light/dark and page resume
- [ ] Safari/PWA status bar behavior remains correct
- [ ] Verify in browser using dev-browser skill

### US-009: Preserve locked two-layer modal blur architecture
**Description:** As a user, I want modal presentation and blur behavior unchanged.

**Acceptance Criteria:**
- [ ] `modal-blur-layer` and `modal-content-layer` structure is preserved
- [ ] Existing overlay transitions remain equivalent
- [ ] No z-index or compositing regressions
- [ ] Verify in browser using dev-browser skill

### US-010: Preserve navigation transition behavior
**Description:** As a user, I want page-to-page transitions to feel identical.

**Acceptance Criteria:**
- [ ] Session-based nav state behavior is preserved
- [ ] View Transitions support and fallback behavior remain equivalent
- [ ] Back/forward cache restore behavior remains equivalent
- [ ] Verify in browser using dev-browser skill

### US-011: Preserve optimization feature-flag compatibility
**Description:** As a maintainer, I want existing optimization flags to continue controlling behavior after conversion.

**Acceptance Criteria:**
- [ ] React integration does not break runtime config flag reads
- [ ] Flags continue to influence legacy runtime behavior as before
- [ ] No new implicit defaults override existing config keys
- [ ] `npm run build` (React app) passes

### US-012: Preserve performance-sensitive runtime behavior
**Description:** As a visitor, I want smooth performance characteristics to remain consistent.

**Acceptance Criteria:**
- [ ] Adaptive scheduler behavior remains intact
- [ ] Lazy mode-loading behavior remains intact
- [ ] Critters neighbor cache behavior remains intact
- [ ] Procedural noise caching behavior remains intact
- [ ] `npm run build` (React app) passes

### US-013: Preserve accessibility parity
**Description:** As a keyboard and assistive-tech user, I want equivalent accessibility behavior after migration.

**Acceptance Criteria:**
- [ ] Landmarks/headings/ARIA labels are preserved for all three pages
- [ ] Keyboard navigation order remains logical and complete
- [ ] `prefers-reduced-motion` behavior remains respected
- [ ] Verify in browser using dev-browser skill

### US-014: Preserve privacy and network boundaries
**Description:** As a user, I want no new external data calls introduced by migration.

**Acceptance Criteria:**
- [ ] No new third-party network calls are introduced
- [ ] Existing localStorage/sessionStorage behavior remains equivalent
- [ ] Config/data fetch paths remain local and deterministic
- [ ] Verify in browser using dev-browser skill

### US-015: Add side-by-side run workflow
**Description:** As a developer, I want one-command side-by-side execution to compare static and React apps efficiently.

**Acceptance Criteria:**
- [ ] Scripts exist to run source app (`8001`) and React app (`8002`) together
- [ ] Documentation shows expected startup steps and URLs
- [ ] Workflow is repeatable on clean checkout
- [ ] Verify in browser using dev-browser skill

### US-016: Add smoke test workflow for migration safety
**Description:** As a developer, I want minimal automated checks to catch critical regressions quickly.

**Acceptance Criteria:**
- [ ] Smoke checks validate page load and critical DOM anchors on all three pages
- [ ] Smoke checks validate critical modal open path per page
- [ ] Smoke checks report obvious console/runtime failures
- [ ] Verify in browser using dev-browser skill

### US-017: Add visual parity diff workflow
**Description:** As a reviewer, I want objective comparison artifacts so parity decisions are evidence-based.

**Acceptance Criteria:**
- [ ] Screenshots captured for source vs React at `1440`, `1024`, `768`, `390`
- [ ] Dynamic regions are masked for automated diffing
- [ ] Diff report includes per-page breakpoint pass/fail status
- [ ] Non-masked pixel difference threshold is defined and enforced (`<= 1.0%` per screenshot)
- [ ] Key anchor alignment threshold is defined and enforced (`<= 2px` drift for frame/layout anchors)
- [ ] Verify in browser using dev-browser skill

### US-018: Publish standalone React migration README
**Description:** As a maintainer, I want dedicated docs for the converted app so onboarding and handoff are clear.

**Acceptance Criteria:**
- [ ] `react-app/README.md` documents architecture, commands, parity workflow, and known constraints
- [ ] Document includes discussion-first deviation policy
- [ ] Document includes rollback and troubleshooting notes
- [ ] `npm run build` (React app) passes

## 5. Functional Requirements

- FR-1: The migration must create all new implementation files inside `/react-app` only.
- FR-2: The migration must support exactly three converted pages: home, portfolio, and CV.
- FR-3: The React implementation must use a shared frame component across all three pages.
- FR-4: The React app must be configured as multi-entry (`index.html`, `portfolio.html`, `cv.html`).
- FR-5: Legacy runtime modules must be integrated through React lifecycle adapters (bridge-first).
- FR-6: Legacy DOM anchor IDs/classes required by runtime modules must remain stable.
- FR-7: First-paint theming/chrome behavior must be preserved to avoid perceptual flash/regression.
- FR-8: Modal rendering must preserve the locked two-layer blur/content architecture.
- FR-9: Navigation transition behavior must preserve view transition + fallback semantics.
- FR-10: Existing runtime config loading flow must remain compatible.
- FR-11: Existing optimization feature flags must continue to work unchanged.
- FR-12: Existing adaptive performance behavior must remain behaviorally equivalent.
- FR-13: Existing lazy mode-loading/caching behavior must remain behaviorally equivalent.
- FR-14: Existing critters and collision hot-path optimizations must remain behaviorally equivalent.
- FR-15: Existing procedural noise caching behavior must remain behaviorally equivalent.
- FR-16: Accessibility semantics and keyboard behavior must remain equivalent.
- FR-17: `prefers-reduced-motion` behavior must remain respected.
- FR-18: No new external network calls may be introduced.
- FR-19: Side-by-side comparison workflow must be documented and runnable.
- FR-20: Visual parity report must include required breakpoints and explicit pass/fail criteria.
- FR-21: A dedicated migration README must be provided under `/react-app`.
- FR-22: Any non-parity React modernization must be documented and require explicit approval before implementation.
- FR-23: Visual parity automation must enforce non-masked pixel diff threshold (`<= 1.0%` per screenshot).
- FR-24: Visual parity review must enforce key anchor drift threshold (`<= 2px` for declared anchors).

## 6. Non-Goals (Out of Scope)

- Rewriting the simulation engine from vanilla JS modules into pure React state logic in this phase.
- Redesigning visual style, layout language, typography, or interaction model.
- Expanding conversion scope to styleguide/test-only HTML pages.
- Changing runtime optimization defaults in `source/config/default-config.json`.
- Altering modal blur architecture.
- Adding new simulation modes or changing narrative sequencing behavior.

## 7. Design Considerations

- Preserve class names and DOM ordering on first pass to minimize CSS drift.
- Shared frame composition should use explicit slots (header/content/footer/modal-host areas).
- Keep parity-first markup, then refactor internals only where contract-safe.
- Avoid inline event handlers in JSX; replace with React handlers while preserving behavior.
- Maintain responsive behavior exactly at current breakpoints and token-driven spacing.

## 8. Technical Considerations

- Existing source remains the system of record; converted code must not mutate original code paths.
- Performance-sensitive loops remain in legacy modules; React should orchestrate mount/unmount only.
- Strict mode/hot reload can double-run effects; guard one-time bootstrap paths.
- Existing optimization controls are config-driven and must remain discoverable through runtime loader.
- Existing daily scheduler behavior (deterministic day-of-year selection) must stay intact.
- Current docs indicate `15` mode IDs registered and `14` in narrative cycle; conversion must preserve runtime behavior as implemented.
- Existing project has no formal typecheck script; build and runtime smoke checks are primary quality gates.

## 9. Success Metrics

- 0 source file modifications outside `/react-app`.
- All three React entries render and operate with no critical regressions.
- Side-by-side parity review passes at required breakpoints for all three pages.
- No new external network endpoints detected relative to baseline behavior.
- Key interactions (modal triggers, navigation transitions, portfolio interactions, CV interactions) remain equivalent.
- Migration documentation is complete enough for a junior developer to continue implementation without hidden decisions.

## 10. Implementation Sequence (Decision-Complete)

1. Bootstrap isolated workspace in `/react-app` and generate conversion artifacts.
2. Configure Vite multi-entry build (`index.html`, `portfolio.html`, `cv.html`) on React port `8002`.
3. Copy required static assets/config to React app public assets.
4. Implement shared frame components and page-level slot compositions.
5. Integrate legacy runtime bootstraps through React lifecycle bridges with one-time init guards.
6. Validate parity-critical DOM contract and module selector dependencies.
7. Add dual-run scripts and smoke checks.
8. Run side-by-side screenshot capture + diff + manual interaction review.
9. Write migration README and parity report.

## 11. Risks and Mitigations

- Risk: React mount timing causes double initialization in dev.
  Mitigation: enforce idempotent bootstrap guards and explicit cleanup hooks.
- Risk: DOM selector drift breaks legacy modules silently.
  Mitigation: maintain a required selector contract and validate anchors in smoke tests.
- Risk: first-paint/theme behavior regresses on Safari/PWA.
  Mitigation: preserve theme meta/tag behavior and validate on load/resume flows.
- Risk: visual parity appears acceptable on static screenshots but diverges in motion.
  Mitigation: combine masked image diffs with manual interaction/motion review at all required breakpoints.

## 12. Open Questions

1. Should the converted React app include `new-simulations.html` in a future phase, or remain permanently excluded?
2. Should current README messaging about “20 modes” be updated to align with current runtime docs (`15` registered IDs)?
3. Should parity automation be enforced in CI eventually, or remain a local/manual gate for now?
4. For future modernization, which legacy module families are highest priority to refactor into native React patterns after parity lock?
5. Should a formal `typecheck` script be added to the React app template for stricter PRD acceptance consistency?
