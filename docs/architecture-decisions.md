# Architecture decisions

This log records programme-level decisions that future refactoring milestones must preserve. It does not replace the focused architecture and design references.

## ADR-001 — Preserve the React shell and imperative runtime boundary

**Status:** Accepted
**Date:** 2026-07-30

### Context

The site uses React for route/shell lifecycle and imperative systems for continuous Canvas, physics, Portfolio, audio, and other high-frequency state. The `src/legacy/` name can incorrectly suggest that this boundary should be modernized away.

### Decision

Keep the current architecture. Refactoring may strengthen lifecycle interfaces or move stable responsibilities, but it must not merge the rendering models or move per-frame state into React.

### Reasons

- The boundary matches update frequency and ownership.
- Abort, generation, cleanup, ready, and failure contracts already protect SPA transitions.
- Canvas hot paths depend on bounded, allocation-aware mutation.
- A framework rewrite would not resolve the identified accessibility, registry, CSS, or test gaps.

### Alternatives considered

- Rewrite imperative routes as React components.
- Move the entire site to one imperative application.
- Treat `src/legacy/` as deprecated and replace it wholesale.

### Trade-offs

The repository keeps two state models and an explicit bridge. Contributors must understand lifecycle ownership, but production performance and proven behavior remain protected.

### Consequences

Future milestones must characterize the bridge, preserve public runtime events, and avoid frame-oriented React state. Rename work, if ever desired, is a separate developer-experience change.

## ADR-002 — Put characterization and browser gates before structural refactors

**Status:** Accepted
**Date:** 2026-07-30

### Context

The largest hotspots control routes, animation, authoring state, Canvas/Portfolio lifecycle, and cascade-sensitive visuals. The existing canonical gate does not exercise a browser.

### Decision

Add a bounded production-browser smoke and hotspot characterization before route, orchestrator, or CSS ownership changes. High-risk milestones must depend on those safety milestones.

### Reasons

- Build success cannot prove browser lifecycle, focus, Canvas, or computed-style behavior.
- Smaller characterization contracts allow independent extraction and rollback.
- The repository already contains focused browser audits that can be reused.

### Alternatives considered

- Refactor first and add tests afterward.
- Run the complete browser matrix on every deploy.
- Rely only on screenshots or only on unit tests.

### Trade-offs

The programme spends time on enabling tests before reducing code size. The release smoke adds CI cost, while deep matrices remain targeted to control duration and flake risk.

### Consequences

`MILESTONE-01` and `MILESTONE-11` precede structural work. Agents must not bypass a failed gate to keep a milestone moving.

## ADR-003 — Consolidate route identity, not bundler behavior

**Status:** Accepted
**Date:** 2026-07-30

### Context

Route identity is duplicated across Vite, entries, `routes.js`, `SiteApp`, `StudioShell`, and catalogs. Fully dynamic generation could hide lazy imports and make Vite behavior harder to inspect.

### Decision

First validate every registry. Then establish one static source for shared route identity and metadata while keeping view/runtime lazy imports and bundler-specific inputs explicit consumers.

### Reasons

- One identity owner reduces omission and alias drift.
- Explicit imports preserve code splitting and source readability.
- Validation can prove parity throughout migration.

### Alternatives considered

- Keep all current declarations and rely on contributor discipline.
- Generate every HTML entry, import, and descriptor dynamically.
- Remove compatibility aliases during consolidation.

### Trade-offs

Some explicit mapping remains. The result is not the minimum number of lines, but it avoids an opaque route framework.

### Consequences

`MILESTONE-05` landed first and validated authored view ownership plus standalone/shared-shell applicability. It also corrected the earlier false Loader shell assumption. `HD-01` was then approved, and M08 established one source-readable route manifest while preserving explicit SiteApp imports. Known URLs and aliases remain stable; unknown and standalone destinations decline shared-shell SPA handling so normal browser/host navigation owns them.

## ADR-004 — Use a bounded required browser smoke, not the full audit matrix

**Status:** Accepted
**Date:** 2026-07-30

### Context

The repository has many deep Playwright audits, but Pages deployment does not launch a browser. Running every audit on every deploy would be expensive and unstable.

### Decision

Create one Chromium production-preview smoke for the five manifest-derived primary routes, SPA navigation, runtime readiness, Canvas sizing, semantics, and representative focus. Make it blocking after five stable runs within an eight-minute budget. Keep Chromium/WebKit visual and transition matrices targeted.

### Reasons

- It closes the largest release-confidence gap with bounded cost.
- It catches browser-only failures that source/build checks cannot.
- Targeted deep audits remain available for affected contracts.

### Alternatives considered

- Keep browser checks manual.
- Run every browser audit on each deploy.
- Use scheduled-only browser coverage.

### Trade-offs

Deployment takes longer and can be blocked by browser infrastructure. The smoke intentionally does not prove full visual parity.

### Consequences

M01 owns the workflow step and failure artifacts. Its implementation was verified locally on 2026-07-30 and is staged as advisory while five stable Actions runs are collected. `HD-04` was approved on 2026-07-30, so the fifth in-budget pass authorizes one focused change to make the smoke blocking. The initial semantic assertion is representative on About; M06 expands the same contract to all primary routes after repairing their known markup defects. Later milestones must run the smoke locally.

## ADR-005 — Separate current-tree artifact hygiene from Git history rewriting

**Status:** Accepted
**Date:** 2026-07-30

### Context

Ignored browser captures, vendor files, and temp outputs remain tracked. Removing current index entries is reviewable; rewriting history invalidates hashes and disrupts collaborators.

### Decision

Inventory and approve retained evidence, then repair only the current tree. Defer any history rewrite to a separately authorized programme after fresh measurements.

### Reasons

- Current-tree cleanup stops ongoing hygiene drift.
- Evidence can be preserved deliberately before mutation.
- History rewriting is unnecessary to fix build or runtime correctness.

### Alternatives considered

- Keep all tracked artifacts.
- Remove files immediately without an inventory.
- Rewrite history in the same milestone.

### Trade-offs

The Git pack remains large after current-tree cleanup. Clone-size benefits are limited until a later decision.

### Consequences

M04 was non-destructive. `HD-02` was approved on 2026-07-30, and M09 applied exact index-only removals while preserving local files. No roadmap agent may rewrite history under `OPS-001`.

## ADR-006 — Preserve CSS behavior while clarifying ownership

**Status:** Accepted
**Date:** 2026-07-30

### Context

Global and Portfolio styles overlap, and current pixels depend on load order, specificity, breakpoints, themes, and transition states.

### Decision

Inventory selectors and assert computed styles before moving declarations. Keep shell/token primitives global, move only Portfolio-owned presentation to `portfolio.css`, and require pixel/computed-style parity.

### Reasons

- Ownership can improve without redesigning the visual system.
- Browser-computed evidence catches cascade effects that source review misses.
- The locked shell and Portfolio layer contracts remain protected.

### Alternatives considered

- Rewrite CSS into modules or CSS-in-JS.
- Merge all styles into one file.
- Move selectors based only on their names.

### Trade-offs

The work requires an inventory and browser baselines before line count falls. Some intentional overrides may remain documented.

### Consequences

M12 cannot change production CSS. M16 occurs after route semantics, visual accessibility, and Portfolio DOM seams are stable.

## ADR-007 — Programme completion requires a reproducible integration boundary

**Status:** Accepted by independent review on 2026-07-30

### Context

Most refactor source, tests, and programme records are uncommitted or untracked and overlap later About Director and Playground work. Only M09 has a dedicated refactoring commit. Local and remote `main` trees are patch-equivalent but have divergent commit identities.

### Decision

Do not call the refactoring programme complete, release-ready, or independently reproducible until its intended files are captured in reviewable commit boundaries and the integrated gates pass from that state. Preserve all user work. Do not reset, discard, or rewrite history to manufacture clean attribution.

### Reasons

- Release evidence must identify the exact source under test.
- Rollback instructions require real integration boundaries.
- Untracked central modules can be lost and do not exist in a clean checkout.
- About and Playground work must remain intact while refactor ownership is established.

### Trade-offs

Creating boundaries across overlapping files requires deliberate review and may not reproduce one commit per historical milestone. The goal is a truthful integrated state, not retroactive history.

### Consequences

- `OPS-002` blocks release approval.
- M01 workflow evidence does not count until its scripts and configuration are integrated.
- The corrective fixes for `TEST-003` and `ARCH-003` should land before final integration verification.
- Git history rewriting remains outside scope and requires separate authorization.

## Historical independent architecture review note — 2026-07-30

The route manifest, transition-readiness seam, lint ratchet, local-write request boundary, control-definition seam, and Portfolio data/prewarm seams should be retained. They improve ownership and testability even where total line count increased.

Do not interpret the programme as a net-complexity reduction. Across the four measured refactor scopes, source grew from 14,570 to 14,810 lines. Central responsibility density, a 12-module active legacy cycle, shared mutable browser/runtime state, and 428 CSS overlaps remain. M16 must stay behind completed M07 and a refreshed M12 baseline.

## Architecture verification amendment — 2026-07-31

The 2026-07-30 note above is a historical snapshot. Current evidence changes these consequences without changing the accepted architecture:

- The null-route startup defect from `ARCH-003` is locally resolved through an explicit fallback state. Unknown URLs remain host-owned and are not rewritten to Home.
- Multi-file local authoring now uses a serialized, journaled transaction boundary with an explicit durable commit point, rollback, recovery, containment, and cleanup-pending behavior. Independent review accepted the boundary after 30 focused tests.
- A focused mode-button dependency seam reduced the active legacy cyclic component from 12 modules/23 internal edges to 9/15. A route-neutral scene-pointer event port then removed input and three mode modules from the component, reducing it to 5 modules/8 edges without moving frame-frequency work into React. The remaining cycle stays documented; this is not approval for a broad runtime rewrite.
- The supported development/build runtime is Node 22.19 or later. Root and app full dependency audits are clean after controlled updates.
- The renderer uses an allocation-free cadence helper that accepts bounded jitter and carries genuinely late callbacks by modulo. This keeps frame accounting aligned with accepted render work.

The sequencing decision was satisfied locally: M07 and `A11Y-006` passed before the M12 refresh, and M16 followed the accepted baseline. M16 moved only the approved Portfolio hero/title and locked-overlay ownership families. The computed signature stayed `7de7352b7ce1e3c7a7c0a6c9dc9a65eba19fbf1920c692e85c56f91172219d01`, and both approved residual-conflict counts are zero. `OPS-002` still blocks reproducible release review until an authorized commit boundary exists. `TEST-001` still needs remote run history and branch-protection evidence. No commit, push, cross-browser performance certification, or production decision is implied.
