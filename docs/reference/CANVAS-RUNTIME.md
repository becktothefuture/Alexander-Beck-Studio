# Canvas Runtime

The Canvas 2D runtime lives under `react-app/app/src/legacy/`. The directory name is historical: it describes how the runtime was integrated into the React shell, not a signal that the code is broken or ready to discard.

The runtime is intentionally preserved because it owns the exact simulation feel.

## What The Runtime Owns

The runtime owns:

- simulation state and globals;
- physics, collisions, and mode-specific force application;
- renderer setup, canvas sizing, DPR handling, and clipping;
- per-frame loop timing;
- pointer, cursor, sound, and material responses tied to simulation state;
- direct-load boot completion after the canvas route is visually ready;
- route-specific imperative modules such as the portfolio runtime and CV bootstrap.

React mounts the DOM structure and route slots. The runtime bootstraps imperative behavior into those slots.

## Route Bootstrapping

React route files export runtime descriptors such as:

```js
export const HOME_ROUTE_RUNTIME = {
  exportName: 'bootstrapHomePage',
  loadModule: () => import('../../legacy/main.js')
};
```

`useLegacyRouteRuntime` receives the descriptor, imports the module, calls the named boot export, stores an optional cleanup function, and dispatches `abs:route-ready` after boot completes.

Runtime boot functions may return a cleanup/disposer function. New runtime work should prefer explicit cleanup because it is easier to audit and safer during SPA route changes.

## Cleanup Boundary

`legacy-runtime-scope.js` wraps a route bootstrap and tracks event listeners, timers, animation frames, and idle callbacks created during that bootstrap. It is a migration safety net for older imperative modules.

Prefer explicit cleanup contracts in new code:

- return a disposer from the boot function;
- remove known event listeners directly;
- stop route-owned loops directly;
- clear route-owned timers directly.

Do not rely on global patching as the first choice for new runtime code. Keep `legacy-runtime-scope` because it protects the current mixed integration model.

## Future Direction

A useful long-term direction is a named canvas runtime adapter around the existing engine, not a visual rewrite or directory rename for its own sake.

Possible future API shape:

```js
const runtime = await createCanvasRuntime({
  routeId,
  canvas,
  config,
  content
});

runtime.start();
runtime.destroy();
```

That shape is guidance only. It is not a Phase 1 implementation requirement. Any adapter must preserve boot timing, route readiness, canvas sizing, physics, render output, and cleanup semantics.

Current decision: do not add a live adapter until it removes real duplication or makes cleanup contracts enforceable. See `ARCHITECTURE-IMPROVEMENT-LEDGER.md` for the preservation-first classification.

## Refactor Rules

- Do not rename `src/legacy/` until every import, build entry, route runtime, and browser check proves the rename is safe.
- Do not move renderer, loop, physics, mode implementations, or portfolio internals just to make names feel modern.
- Do not convert Canvas 2D output to React DOM, SVG, WebGL, Three.js, or another animation library.
- Keep hot paths allocation-conscious.
- Treat physics constants, render timings, DPR behavior, and route boot timing as parity-sensitive.
