# Architecture Improvement Ledger

This ledger records the preservation-first architecture streamlining work and the decisions that should guide later refactors.

## What Was Clarified

- The current supported app pipeline is `react-app/app/`.
- React/Vite owns page structure, shell slots, route composition, route transitions, and public HTML entries.
- The Canvas 2D runtime under `react-app/app/src/legacy/` is intentional and owns simulation feel, physics, rendering, sizing, DPR behavior, pointer response, and route bootstraps.
- `react-app/app/public/config/design-system.json` is the authored design/config source.
- `default-config.json`, `shell-config.json`, `portfolio-config.json`, and `cv-config.json` are generated compatibility/runtime outputs.
- The root `npm run build` is canonical because it flattens config before the Vite build.
- Historical standalone embed guidance remains archived context, not the current build/deployment path.
- Frontend parity now has an explicit contract in `PARITY-CONTRACT.md`.

## What Was Simplified

- Vite build inputs, virtual content loading, and dev/admin middleware are easier to scan after extracting the local dev/admin middleware into `react-app/app/vite.dev-admin-plugin.js`.
- `npm run check:design-config` now verifies generated config files against `design-system.json` without writing files.
- `npm run check:site` provides a single local command for malformed-token guard, HTML fragment validation, React lint, generated-config sync, and production build.
- Runtime cleanup comments now state the preferred direction: explicit boot disposers first, legacy runtime scope as a safety net.

## Intentionally Unchanged

- Canvas renderer, render loop, physics engine, collision behavior, and mode implementations.
- `src/legacy/` directory name and import paths.
- Boot overlay and early theme/chrome scripts.
- `StudioShell` structure, transition orchestration, and portfolio drawer stacking.
- Public route URLs, invite-code behavior, modal/gate behavior, and public content.
- Generated config schemas and values.
- GitHub Pages deployment target.

## Considered And Skipped

### Named canvas runtime adapter

Classification: Needs more context.

A thin `src/runtime/canvas-runtime/` adapter could wrap existing boot functions, but wiring it into route descriptors today would add indirection without reducing a current risk. If route descriptors start diverging or runtime cleanup contracts become more explicit, introduce the adapter then and verify chunking, boot timing, `abs:route-ready`, and teardown behavior.

### Renaming `src/legacy/`

Classification: Too risky for this workstream.

The directory name is imperfect but deeply referenced. Renaming it would touch many imports and could create broad review noise without changing architecture. Keep the name until a dedicated import-boundary migration has a clear payoff.

### Splitting the dev/admin Vite plugin further

Classification: Safe later, not necessary now.

The extracted plugin still groups design-system save endpoints, simulation admin endpoints, and route-specific demo config writes. That coupling existed before. Splitting it into smaller plugins may help ownership later, but preserving endpoint behavior and plugin order was the safer Phase 2 outcome.

### Removing portfolio pit physics

Classification: Too risky for this workstream.

The visible portfolio route is DOM-deck driven, but `pit-mode.js` still provides live helper exports plus hidden/runtime, fallback, and archive behavior. Removing it requires import tracing, route testing, and portfolio audits. Leave the code until a dedicated cleanup proves no interaction, helper export, or fallback depends on it.

### Moving GitHub Pages to `npm run build:site`

Classification: Safe later with CI validation.

The workflow currently performs the same flatten-then-build sequence as the root build. Switching the workflow to call `npm run build:site` would reduce drift risk, but deployment changes should be isolated and validated in CI.

## Checks Protecting Parity

Baseline checks:

```bash
npm run check:malformed-tokens -- --full
npm run validate:html-fragments
npm run lint --prefix react-app/app
npm run check:design-config
npm run build
```

Additional checks for tooling changes:

```bash
npm run build:dev
npm run preview
```

Additional checks for route/runtime/visual changes:

```bash
ABS_DEV_URL=http://127.0.0.1:8012 npm run audit:canvas-spa:quick
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-gate:quick
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit npm run audit:transition-flows
```

Run browser audits serially when reliability matters.

Phase 3 was documentation-only. Browser and visual audits were not rerun for that phase because no runtime code, CSS, config values, routes, or public content changed.

## Recommended Later Phases

- Add a dedicated runtime adapter only when it removes real route-runtime duplication or makes cleanup contracts enforceable.
- Split dev/admin middleware into smaller ownership plugins if endpoint groups grow further.
- Align GitHub Pages with the root canonical build entrypoint in a CI-focused change.
- Extend simulation catalog validation only when a concrete drift case appears; `npm run sim:validate` already checks route registry, Vite inputs, daily hrefs, configs, and previews.
- Build visual regression coverage before moving renderer, transition, portfolio drawer, or physics code.

## How Future Agents Should Proceed

1. Read `SYSTEM-ARCHITECTURE.md`, `CANVAS-RUNTIME.md`, `PARITY-CONTRACT.md`, and this ledger before planning deeper refactors.
2. Classify each candidate as Safe now, Needs more context, or Too risky for this workstream.
3. Prefer documentation or validation when code movement would only rename complexity.
4. Keep visual systems untouched unless the relevant browser/visual checks can run.
5. Preserve generated config flow: author `design-system.json`, regenerate/check generated outputs, and build from the repo root.
