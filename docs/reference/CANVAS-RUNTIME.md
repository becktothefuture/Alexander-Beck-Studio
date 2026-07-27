# Canvas Runtime

The Canvas 2D runtime lives under `react-app/app/src/legacy/`. The directory name is historical: it describes how the runtime was integrated into the React shell, not a signal that the code is broken or ready to discard.

The runtime is intentionally preserved because it owns the exact simulation feel.

## What The Runtime Owns

The runtime owns:

- simulation state and globals;
- physics, collisions, and mode-specific force application;
- renderer setup, canvas sizing, DPR handling, and physics-boundary caching;
- per-frame loop timing;
- pointer, cursor, sound, and material responses tied to simulation state;
- direct-load boot completion after the canvas route is visually ready;
- route-specific imperative modules such as the Portfolio runtime.

React mounts the DOM structure and route slots. The runtime bootstraps imperative behavior into those slots.

## Visual Contour Authority

`#simulations` is the sole rounded clip for the studio window. Every Canvas inside it fills the wall box as a rectangular layer with no independent `border-radius`, mask, or drawing-path clip. Repeating the wall radius on a full-size Canvas creates a second antialiased contour and can reveal dark stepped pixels even when DOM rectangles and computed radii match.

Canvas display sizing is CSS-owned too. The renderer must not serialize fractional computed wall dimensions into inline Canvas pixel sizes: embedded Chromium can round that string to a different layout quantum. CSS keeps the display box attached to the frame immediately during resize; JavaScript measures the resulting box only to update the backing store and physics cache.

Physics uses the separate `simulationCollisionBounds` cache. Its locked `0px` production inset and resolved `cornerShape` come from the visible wall measurement, so body surfaces meet the browser-rendered round or squircle contour. There is no independent authoring control for this boundary. Changing the visible wall measurement must never change the Canvas CSS box.

Run `npm run audit:rendered-wall-contour` for Chromium and `ABS_BROWSER=webkit npm run audit:rendered-wall-contour` for WebKit. The audit compares the production corner pixels with a forced parent-only clip oracle across the supported breakpoint, theme, and DPR matrix.

## Route Bootstrapping

React route files export runtime descriptors such as:

```js
export const HOME_ROUTE_RUNTIME = {
  exportName: 'bootstrapHomePage',
  loadModule: () => import('../../legacy/main.js'),
  prewarm: async ({ signal }) => {
    const module = await import('../../legacy/main.js');
    return module.prewarmHomeRoute({ signal });
  }
};
```

`useLegacyRouteRuntime` receives the descriptor, imports the module, calls the named boot export, stores an optional cleanup function, and dispatches `abs:route-ready` after boot completes. That event is a route-runtime readiness signal; it does not itself own final direct-load boot overlay release.

Direct-load boot completion has one active owner per route family:

- home canvas direct loads: `legacy/modules/visual/page-orchestrator.js`;
- non-home shell routes such as Portfolio, About Me, Contact, styleguide, simulations, and palette-lab: `SiteApp.jsx`;
- route-backed Daily Focus direct loads: `routes/daily-focus/DailyFocusShellBridge.jsx`;
- standalone lab/dashboard entries: their lightweight page bootstrap, without the full shell boot overlay.

The Home owner does not equate canvas allocation with readiness. It waits for critical fonts, the final backing-store size, two rendered frames, and the measured three-line canvas-title state before setting `data-abs-home-simulation-ready="true"`. Route-backed Daily Focus uses the same public readiness marker after its own runtime surface reports ready. The overlay exit then starts the simulation-material entrance; Home copy remains staged until the overlay has detached.

Runtime boot functions may return a cleanup/disposer function. New runtime work should prefer explicit cleanup because it is easier to audit and safer during SPA route changes.

Home prewarming may cache the Home route module, copy, and the selected simulation-mode module, but it never creates a canvas runtime, initializes simulation state, or starts a loop. When Home is bootstrapped behind an active shell route cover, it reports route readiness immediately after mode initialization and scheduling the first main-loop frame. The shell then keeps the final canvas/title geometry covered for two painted frames. Non-critical quote and development tooling continues after that readiness boundary. Direct document boot keeps its existing self-contained readiness cadence. Do not add per-frame allocations or move physics work into React to reduce bootstrap cost.

### Runtime generation and cancellation

`useLegacyRouteRuntime` assigns each mounted route runtime a generation and passes the boot export a lifecycle context containing `signal`, `generation`, `isCurrent`, and `registerCleanup`.

- Its module-local active snapshot, exposed read-only through `getActiveLegacyRuntimeSnapshot()`, owns route identity and lifecycle status.
- Register an idempotent disposer before the first asynchronous wait.
- Check `signal.aborted` / `isCurrent()` after asynchronous work and before mutating shared DOM, renderer, mode, or route-ready state.
- A disposer that resolves after cancellation is executed immediately.
- Renderer teardown is owner-qualified. A stale generation must not stop or dispose the current generation's loop.
- `abs:route-ready` includes the active runtime generation. Stale generations must not announce readiness.

`<html data-abs-runtime-route data-abs-runtime-generation data-abs-runtime-status>` and `window.__ABS_RUNTIME_LIFECYCLE__` mirror only the latest snapshot for diagnostics. They are output-only and do not own route sequencing or retain lifecycle history.

## Cleanup Boundary

`legacy-runtime-scope.js` wraps a route bootstrap and tracks event listeners, timers, animation frames, and idle callbacks created during that bootstrap. It is a migration safety net for older imperative modules.

Prefer explicit cleanup contracts in new code:

- return a disposer from the boot function;
- remove known event listeners directly;
- stop route-owned loops directly;
- clear route-owned timers directly.

Do not rely on global patching as the first choice for new runtime code. Keep `legacy-runtime-scope` because it protects the current mixed integration model.

## Production Simulation Atmosphere

`modules/rendering/atmosphere/simulation-atmosphere.js` owns one route-neutral compositor. `StudioShell` supplies one stable glow Canvas inside the wall slot and one stable edge-light Canvas inside the wall-radius-inheriting edge layer; route runtimes supply material through `registerSimulationAtmosphereSource()` and never create another production compositor.

Production eligibility covers Home and its Daily modes, the four route-backed Daily runtimes, Portfolio, About, and Contact. The Crisp + Glow lab mounts the same compositor under a lab scope for authoring. Other labs and incidental canvases are ineligible unless the shell explicitly mounts a host and the runtime explicitly registers a source.

The registration boundary is:

```js
const unregister = registerSimulationAtmosphereSource({
  id,
  routeId,
  kind: 'emitters' | 'canvas' | 'ambient',
  canvas,
  getEmitters,
  quietZoneElement,
  opacityElement,
  scheduler: 'external' | 'internal' | 'renderer-coupled',
});
```

- `emitters` requires `getEmitters()` and `external`; the Home physics frame hook calls `tickSimulationAtmosphere()` after material rendering.
- `canvas` accepts `internal` when the compositor may sample independently, or `renderer-coupled` when the source renderer must tick it after publishing a frame. A registered source Canvas must never be either compositor output Canvas.
- `ambient` requires `internal` and uses the compositor's fixed eight-emitter fallback. It is for a genuinely canvas-less or deliberately suspended eligible state, not a substitute for registering available route material.
- `quietZoneElement` may be an element or getter. Its geometry is cached and invalidated by resize, source, theme, and authored-geometry changes; settled frames must not introduce repeated layout reads.
- `opacityElement` identifies the crisp material whose authored presence the compositor projects. Home keeps title opacity inside its engine rather than fading a title-bearing Canvas wholesale.

Registration returns a generation-qualified, idempotent disposer. A stale disposer cannot clear a newer route source. Source changes clear feedback in the idle state; during a shell transition the outgoing result may freeze under the route cover until the next source is ready. The disposer also exposes `firstFrame`, which resolves `ready`, `cancelled`, or `failed-open` without extending the shell's global readiness timeout.

Scheduling and performance are part of the contract:

- only one host, source, internal animation frame, glow Canvas, and edge Canvas may exist at once;
- High, Balanced, and Low render at `0.5`, `0.375`, and `0.25` scale with bounded emitter budgets of `160`, `96`, and `64`;
- automatic cadence is 30 FPS on desktop and 20 FPS on coarse-pointer, narrow, or short viewports; source physics/renderers retain their own cadence;
- Canvas sources use one downsampled `drawImage`; emitter sources use a bounded stride; there is no pixel readback, full-resolution fog pass, or per-body edge-distance loop;
- authored source-material softness uses one CSS compositor blur per registered material Canvas (and Home depth layer), never `CanvasRenderingContext2D.filter` or `shadowBlur` inside the body loop;
- automatic quality may step down after sustained compositor cost, without reducing the simulation's authored body count;
- internal scheduling stops when hidden, disabled, failed, detached, or without an internal source. Reduced Motion renders a static response and does not keep a drift loop alive;
- two consecutive compositor errors fail open: glow and edge clear, crisp route material returns to full presence, and route interaction/readiness continues.

`window.__ABS_SIMULATION_ATMOSPHERE__.getSnapshot()` is diagnostic output only. It reports ownership, source, scheduler, scale, cadence, geometry reads, sampled emitters, and rolling cost; it must not become configuration truth.

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

Current decision: do not add a live adapter until it removes real duplication or makes cleanup contracts enforceable.

## Refactor Rules

- Do not rename `src/legacy/` until every import, build entry, route runtime, and browser check proves the rename is safe.
- Do not move renderer, loop, physics, mode implementations, or portfolio internals just to make names feel modern.
- Do not convert Canvas 2D output to React DOM, SVG, WebGL, Three.js, or another animation library.
- Keep hot paths allocation-conscious.
- Treat physics constants, render timings, DPR behavior, and route boot timing as parity-sensitive.

## Pointer And Title Depth Contract

`modules/input/pointer.js` is the shared mouse, trackpad, pen, and touch input contract. It keeps the legacy `mouseX`, `mouseY`, and `mouseInCanvas` fields current, and also exposes normalized `pointer*` fields so modes can tell when input first becomes valid, whether it is active, and whether it came from mouse, pen, or touch.

Modes that smooth pointer state, calculate pointer velocity, or derive deltas must seed their local state from the first valid pointer sample. They must not ease from `CONSTANTS.OFFSCREEN_MOUSE`, the canvas center, or an idle anchor when a pointer/touch first enters, presses, or starts a new contact sequence.

`modules/rendering/title-depth.js` owns the central title scene placement and canvas title rendering contract. The home `#hero-title` remains the semantic, accessible, measurable DOM source, but the visible home title/subtitle are drawn into the Ball Canvas path from that source. Depth-aware ball modes draw the canvas title between the behind-ball pass and the front-ball pass; no-depth modes draw the title before the normal ball pass so the existing "balls over title" relationship is preserved.

Do not move the title's CSS x/y placement to align a scene. If a depth scene needs alignment, map the existing DOM title center into canvas coordinates and align the scene to that point. Do not add a second title geometry owner; extend `title-depth.js` so audits, route readiness, and accessibility continue to share one source.
