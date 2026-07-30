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

`MILESTONE-05` must land before `MILESTONE-08`. Known URLs and aliases remain stable. Unknown-path behavior is resolved separately through `HD-01`.

## ADR-004 — Use a bounded required browser smoke, not the full audit matrix

**Status:** Accepted
**Date:** 2026-07-30

### Context

The repository has many deep Playwright audits, but Pages deployment does not launch a browser. Running every audit on every deploy would be expensive and unstable.

### Decision

Create one Chromium production-preview smoke for the four primary routes, SPA navigation, runtime readiness, Canvas sizing, semantics, and representative focus. Make it blocking after five stable runs within an eight-minute budget. Keep Chromium/WebKit visual and transition matrices targeted.

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

M01 owns the workflow step and failure artifacts. CI budget may be overridden through `HD-04`, but later milestones must still run the smoke locally.

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

M04 is non-destructive. M09 requires `HD-02`. No roadmap agent may rewrite history under `OPS-001`.

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
