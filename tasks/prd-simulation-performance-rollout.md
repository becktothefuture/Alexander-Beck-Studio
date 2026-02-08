# PRD: Full Simulation Performance Optimization Rollout

## 1. Introduction / Overview

The website currently feels laggy on the daily simulation, and the user goal is clear: maximize smoothness without changing simulation behavior or breaking site UX.

This rollout will:

- Remove unnecessary runtime overhead (especially startup/module overhead from non-active simulations)
- Improve hot-path simulation and rendering performance
- Add actionable dev-mode FPS visibility
- Keep existing simulation behavior, narrative/daily scheduling, accessibility, privacy, and modal architecture intact

Core intent: visitors should only pay runtime cost for the simulation that is active today, and engineering should have enough instrumentation to tune toward **120 FPS** safely.

---

## 2. Goals

- Reach **120 FPS target** for active simulations on modern desktop hardware at default settings.
- Improve frame consistency (reduce long-frame spikes and stutter) on both desktop and mobile.
- Ensure startup only initializes and executes logic required for the active daily simulation.
- Preserve existing simulation identity and interaction behavior (no redesign of mode mechanics).
- Add dev-only FPS visibility and diagnostics to speed iterative optimization.
- Ship with safe rollout controls and fast rollback options.

---

## 3. Performance Findings (Ranked: Highest to Lowest Impact)

### P1. Hard render-loop cap at 60 FPS
- **Evidence:** `source/modules/rendering/loop.js` sets `TARGET_FPS = 60` and skips frames if interval is below 16.67ms.
- **Impacted areas:** All simulations, all devices.
- **Why bottleneck happens:** Even when compute is available for >60 FPS, the scheduler intentionally drops frames.
- **Correlations:** Masks true mode-level performance headroom; complicates diagnosis of simulation-specific bottlenecks.
- **Solution:** Replace fixed cap with configurable target FPS (dev-configurable), defaulting to 120 in dev/perf mode and safe production defaults by device tier.
- **What this solves:** Unlocks headroom and exposes real simulation cost ceilings.

### P2. Eager loading/import of mode modules at startup
- **Evidence:** `source/modules/modes/mode-controller.js` statically imports many mode files; `source/main.js` imports controller early.
- **Impacted areas:** Startup parse/compile/execution time, memory footprint, GC pressure, time-to-first-smooth-frame.
- **Why bottleneck happens:** Non-active simulations are loaded/parsed up front even though daily mode is locked.
- **Correlations:** Larger JS work at boot increases startup jank and can worsen first-frame pacing.
- **Solution:** Introduce mode registry with dynamic imports so only active daily mode is loaded at startup; cache loaded mode chunks for later use.
- **What this solves:** Reduces unnecessary startup overhead while preserving mode behavior.

### P3. Critters hot path does repeated neighbor array construction and high-frequency math/random calls
- **Evidence:** `source/modules/modes/critters.js` calls `getNearbyCritters(...)` multiple times per critter force step; each call builds a new array.
- **Impacted areas:** Critters mode (currently frequent daily candidate), CPU time in force application.
- **Why bottleneck happens:** Repeated neighbor collection/allocation and expensive per-ball logic stack.
- **Correlations:** Becomes worse when object count is high and when collision work is also active.
- **Solution:** Reuse per-ball neighbor results within a frame, avoid transient arrays in hot loops, and merge duplicated neighborhood passes.
- **What this solves:** Reduces critters per-frame CPU cost without changing behavior.

### P4. High object counts + collision iterations amplify CPU load
- **Evidence:** `source/config/default-config.json` includes high counts (e.g. `waterBallCount: 1800`, `critterCount: 135`) plus global collision iteration work.
- **Impacted areas:** Physics-heavy modes, frame-time stability, lower-end devices.
- **Why bottleneck happens:** Solver and per-object updates scale with object count and interaction density.
- **Correlations:** Compounds with critters hot path and any rendering overdraw.
- **Solution:** Introduce explicit per-mode performance budgets and adaptive quality tiers, preserving visual identity while capping worst-case costs.
- **What this solves:** Better frame-time predictability and fewer sustained drops.

### P5. Per-frame canvas work includes expensive visual layers
- **Evidence:** `source/modules/physics/engine.js` render path draws balls, depth wash, trail/explosion, and wall rendering each frame.
- **Impacted areas:** GPU/CPU render time, especially on high DPR and large viewports.
- **Why bottleneck happens:** Layered effects can add fill-rate and state-change costs.
- **Correlations:** More visible when physics load is already high; contributes to long-frame tails.
- **Solution:** Add quality-level controls for expensive visual passes, tuned per device/perf mode while preserving default look.
- **What this solves:** Smoother frame pacing with controlled visual tradeoffs.

### P6. Missing dev-visible FPS/debug HUD for rapid tuning
- **Evidence:** `source/modules/utils/performance.js` updates `#render-fps`, but no reliable source element is present by default.
- **Impacted areas:** Developer iteration speed and confidence in optimization changes.
- **Why bottleneck happens:** Lack of immediate telemetry slows bottleneck isolation and regression detection.
- **Correlations:** Increases risk of accidental performance regressions across modes.
- **Solution:** Add dev-only FPS HUD (current FPS, frame ms, target FPS, throttle state) with zero production footprint.
- **What this solves:** Faster, safer optimization loop.

---

## 4. Correlation Network (How Bottlenecks Interact)

- `60 FPS cap` -> hides whether mode optimizations actually improve throughput above 60.
- `eager module loading` -> increases startup parse/compile/memory -> increases GC risk -> worsens early frame stability.
- `critters hot-path allocations` + `high object counts` -> CPU spikes in physics/update -> triggers adaptive throttling.
- `physics cost spikes` + `expensive render layers` -> compound total frame time -> visible stutter.
- `missing dev FPS telemetry` -> slower detection of all above issues -> longer unstable optimization cycles.

---

## 5. User Stories

### US-001: Establish a repeatable performance baseline
**Description:** As an engineer, I want a repeatable profiling baseline per simulation so that optimization impact is measurable and non-subjective.

**Acceptance Criteria:**
- [ ] Define baseline metrics for each simulation: avg FPS, 1% low FPS, avg frame time (ms), long-frame count (>16.67ms and >8.33ms)
- [ ] Capture baseline in dev mode on desktop and mobile viewport presets
- [ ] Store baseline report under `tasks/` in markdown format
- [ ] `npm run build` completes successfully

### US-002: Add a dev-only FPS/perf HUD
**Description:** As a developer, I want live FPS/perf readouts in dev mode so that I can tune performance quickly.

**Acceptance Criteria:**
- [ ] HUD is visible in dev mode only and hidden in production builds
- [ ] HUD shows current FPS, target FPS, frame time (ms), and adaptive throttle level
- [ ] HUD does not affect input hit areas or accessibility focus order
- [ ] HUD updates at a controlled frequency (not every paint if unnecessary)
- [ ] `npm run build` completes successfully
- [ ] Verify in browser using dev-browser skill

### US-003: Replace fixed 60 FPS cap with configurable target scheduler
**Description:** As a user, I want simulations to use available device headroom so that smoothness can exceed 60 FPS where possible.

**Acceptance Criteria:**
- [ ] Render loop target FPS is configurable by runtime config/dev controls
- [ ] Default dev target supports 120 FPS testing
- [ ] Production defaults are safe by device capability tier
- [ ] Reduced-motion behavior remains respected
- [ ] `npm run build` completes successfully

### US-004: Lazy-load simulation mode modules
**Description:** As a visitor, I want only required simulation code loaded initially so that startup and first smooth frame improve.

**Acceptance Criteria:**
- [ ] Mode registry supports dynamic imports for simulation modules
- [ ] Startup loads only current daily mode and required shared runtime modules
- [ ] Non-active modes are loaded on demand and cached after first use
- [ ] No behavior change to active mode initialization and force/updater hooks
- [ ] `npm run build` completes successfully

### US-005: Preserve mode-switch compatibility with on-demand module loading
**Description:** As a maintainer, I want mode switching to remain correct even with lazy loading so that no hidden regressions are introduced.

**Acceptance Criteria:**
- [ ] `setMode(...)` can handle not-yet-loaded modes via async loading path
- [ ] Loading failures degrade gracefully with fallback logging and safe state
- [ ] Daily-mode lock behavior remains intact
- [ ] `npm run build` completes successfully

### US-006: Optimize Critters hot path without changing behavior
**Description:** As a visitor, I want Critters mode to remain visually/behaviorally identical but significantly faster.

**Acceptance Criteria:**
- [ ] Neighbor lookups are reused per critter frame step (no duplicate nearby-array builds)
- [ ] Hot loops avoid avoidable allocations and duplicate math passes
- [ ] Behavior parity validated for panic, foraging, journey points, and pheromone interactions
- [ ] `npm run build` completes successfully

### US-007: Introduce per-mode performance budgets and guardrails
**Description:** As an engineer, I want explicit per-mode budgets so that complex modes stay within frame-time targets.

**Acceptance Criteria:**
- [ ] Define max object counts and expensive-effect toggles per mode/hardware tier
- [ ] Keep visual identity of each simulation while reducing worst-case cost
- [ ] Budget values are configurable and documented
- [ ] `npm run build` completes successfully

### US-008: Add adaptive render-quality controls for expensive layers
**Description:** As a visitor, I want stable motion during load spikes so that occasional heavy frames are reduced.

**Acceptance Criteria:**
- [ ] Depth wash, wall gradient stroke, and optional overlay effects have quality controls
- [ ] Quality controls are applied deterministically (not random flicker)
- [ ] Defaults preserve current art direction unless performance mode is active
- [ ] `npm run build` completes successfully

### US-009: Validate all simulations for non-regression
**Description:** As a maintainer, I want a complete regression sweep so that performance work does not break simulation behavior.

**Acceptance Criteria:**
- [ ] Manual validation checklist covers all documented simulations/modes and key interactions
- [ ] Accessibility checks: keyboard nav, ARIA integrity, `prefers-reduced-motion`
- [ ] Privacy check: no new external network calls, local storage usage unchanged in scope
- [ ] `npm run build` completes successfully
- [ ] Verify in browser using dev-browser skill

### US-010: Safe rollout controls and rollback strategy
**Description:** As an owner, I want a low-risk rollout with kill switches so that regressions can be contained quickly.

**Acceptance Criteria:**
- [ ] Feature flags gate scheduler changes, lazy mode loading, and quality-tier logic
- [ ] Rollback path can disable new optimization layers independently
- [ ] Release notes include known risks and rollback commands/procedures
- [ ] `npm run build` completes successfully

---

## 6. Functional Requirements

- **FR-1:** The system must support a configurable render loop target FPS (including 120 FPS target in dev mode).
- **FR-2:** The system must preserve daily simulation selection behavior from the existing scheduler.
- **FR-3:** On startup, the system must only load/initialize the active daily simulation module plus shared required runtime modules.
- **FR-4:** Non-active simulation modules must be lazy-loaded on demand and cached after first load.
- **FR-5:** Existing simulation behavior (forces, movement identity, interactions) must remain unchanged from a user perspective.
- **FR-6:** Critters mode must avoid duplicate neighbor-list creation within the same per-frame force pass.
- **FR-7:** Physics and render hot paths must avoid avoidable allocations in frame-critical loops.
- **FR-8:** The system must provide dev-only on-screen FPS/performance readout.
- **FR-9:** Production builds must not render dev FPS HUD.
- **FR-10:** Performance HUD must not break keyboard navigation, pointer interactions, or ARIA semantics.
- **FR-11:** The system must continue respecting `prefers-reduced-motion`.
- **FR-12:** The two-layer modal blur architecture must remain untouched.
- **FR-13:** No additional external calls may be introduced by optimization features.
- **FR-14:** Runtime config must support per-mode performance budget values.
- **FR-15:** Adaptive quality logic must be deterministic and reversible via config/feature flags.
- **FR-16:** Build pipeline output must remain in `dist/` and source edits must remain in `source/`.
- **FR-17:** The rollout must include full regression checklist coverage for all documented simulations.
- **FR-18:** Rollback toggles must allow disabling each major optimization independently.

---

## 7. Non-Goals (Out of Scope)

- Rewriting simulation physics model or changing simulation art direction.
- Redesigning UI layout, typography, or brand presentation.
- Introducing external analytics or third-party telemetry services.
- Modifying the modal blur architecture.
- Adding brand-new simulation modes as part of this optimization rollout.

---

## 8. Design Considerations

- Dev FPS HUD should be minimal, unobtrusive, and pinned in a non-interfering corner.
- HUD should use existing design token conventions for spacing/typography/color.
- HUD visibility must be strictly dev-gated.

---

## 9. Technical Considerations

- Maintain ES module imports with explicit `.js` extensions.
- Keep hot-path complexity and allocations minimal (O(1) where feasible for per-ball updates).
- Preserve current runtime config loading flow and daily scheduler behavior.
- Prefer incremental migration to lazy-loading registry over large, risky refactors.
- Use feature flags for:
  - loop target scheduler changes
  - lazy mode loading
  - quality-tier render adjustments
  - critters hot-path optimization toggles (if needed)

---

## 10. Rollout Plan (Pragmatic / Low-Risk)

### Phase 0: Baseline and Instrumentation
- Capture baseline performance across all simulations.
- Add dev-only HUD and internal metrics hooks.

### Phase 1: Loop Scheduler Upgrade
- Introduce configurable target FPS logic.
- Validate stability with existing adaptive throttling.

### Phase 2: Daily-Mode-First Lazy Loading
- Build mode module registry with dynamic imports.
- Load only active daily mode at startup.
- Validate mode switch fallback behavior.

### Phase 3: Critters and Hot-Path Optimization
- Remove duplicate neighbor array work.
- Minimize hot-path allocations and repeated calculations.

### Phase 4: Render Quality Guardrails
- Add configurable quality controls for expensive visual passes.
- Tune defaults for stable frame pacing.

### Phase 5: Regression and Release
- Run manual full-mode validation, accessibility checks, and privacy checks.
- Ship behind flags; progressively enable and monitor.

---

## 11. Success Metrics

- **Primary:** Active simulation reaches or exceeds **120 FPS average** on modern desktop reference hardware in dev/perf mode.
- **Secondary:** 1% low FPS improves materially vs baseline for heavy modes (especially Critters/Water-like loads).
- **Startup:** Reduced startup JS work and improved time-to-first-smooth-frame.
- **Stability:** Fewer adaptive-throttle escalations during normal interaction.
- **Safety:** Zero functional regressions across documented simulations and core UI interactions.

---

## 12. Open Questions

- Should 120 FPS also be the default production target on capable desktop hardware, or dev/perf-only at first rollout?
- Which exact hardware matrix defines “modern desktop reference” for pass/fail benchmarking?
- For documented but currently disabled/legacy modes, should regression coverage be full parity or smoke-level?
- Should quality-tier controls be user-exposed in dev panel only, or fully runtime-config only?
- Do we require a strict hard floor (e.g., 60 FPS minimum) for low-power mobile devices as a release gate?

