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
- route-specific imperative modules such as the Work case-study drawer and handoff.

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
- non-home shell routes such as Work, About, Contact, styleguide, simulations, and palette-lab: `SiteApp.jsx`;
- route-backed Daily Focus direct loads: `routes/daily-focus/DailyFocusShellBridge.jsx`;
- standalone lab/dashboard entries: their lightweight page bootstrap, without the full shell boot overlay.

The Home owner does not equate canvas allocation with readiness. It waits for critical fonts, the final backing-store size, two rendered frames, and the measured three-line canvas-title state before setting `data-abs-home-simulation-ready="true"`. Route-backed Daily Focus uses the same public readiness marker after its own runtime surface reports ready. The overlay exit then starts the simulation-material entrance; Home copy remains staged until the overlay has detached.

Runtime boot functions may return a cleanup/disposer function. New runtime work should prefer explicit cleanup because it is easier to audit and safer during SPA route changes.

Home prewarming may cache the Home route module, copy, and the selected simulation-mode module, but it never creates a canvas runtime, initializes simulation state, or starts a loop. When Home is bootstrapped behind an active shell route cover, it starts the main loop and reports route readiness after scheduled body warm-up completes. The shell then keeps the final canvas/title geometry covered for two painted frames. Non-critical quote and development tooling continues after that readiness boundary. Direct document boot keeps its existing self-contained readiness cadence. Do not add per-frame allocations or move physics work into React to reduce bootstrap cost.

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

## Production Simulation Body Material

Production semantic simulation bodies reuse cached matte sphere stickers or atlases from the active time-of-day palette. The finish is enabled at the canonical `shell.surface.simulationBodyMaterial.enabled` setting and defaults to disabled when configuration is missing. Home, the Home quote puck, the simplified About point world, and Contact consume the shared cached material; flat circles remain a guarded missing-material fallback. The Work depth field is a separate neutral three-layer material.

This is a performance contract as well as a visual choice. Renderers prewarm the active palette and retain the resulting sprites or atlas; they do not construct gradients, parse colours, or calculate lighting per body during a frame. Physics state, forces, collision envelopes, body counts, opacity lifecycles, perspective, and route behavior remain under their existing owners.

The retained sphere-material cache is compatibility and development infrastructure only. It must remain inactive in production unless a later, explicit visual decision includes measured frame-time evidence across the route matrix. The shared atmosphere compositor below remains separate and may sample the completed flat route material.

## Production Simulation Atmosphere

`modules/rendering/atmosphere/simulation-atmosphere.js` owns one route-neutral compositor. `StudioShell` supplies one stable glow Canvas inside the wall slot and one stable edge-light Canvas inside the wall-radius-inheriting edge layer; route runtimes supply material through `registerSimulationAtmosphereSource()` and never create another production compositor.

Production eligibility covers Home and its Daily modes, the four route-backed Daily runtimes, Work, About, and Contact. Development scene parameters tune the mounted About route directly, so there is no separate editor preview or compositor host. The Crisp + Glow lab mounts the compositor under a lab scope for authoring. The Atmospheric Glow performance lab owns one isolated broad-field compositor and never mounts the production host. Other labs and incidental canvases are ineligible unless the shell explicitly mounts a host and the runtime explicitly registers a source.

The registration boundary is:

```js
const unregister = registerSimulationAtmosphereSource({
  id,
  routeId,
  kind: 'emitters' | 'canvas' | 'ambient',
  canvas,
  getEmitters,
  opacityElement,
  scheduler: 'external' | 'internal' | 'renderer-coupled',
});
```

- `emitters` requires `getEmitters()` and `external`.
- `canvas` accepts `internal` when the compositor may sample independently, or `renderer-coupled` when the source renderer must tick it after publishing a frame. Home uses a renderer-coupled Canvas source and supplies its main and active front-depth canvases in final display order through `getCanvasLayers()`, so custom, replicated, and depth-split modes all feed the same finished-frame atmosphere path. A registered source Canvas must never be either compositor output Canvas.
- `ambient` requires `internal` and is a transparent compatibility/readiness source for a genuinely canvas-less, failed, or deliberately suspended eligible state. It clears outgoing atmosphere, keeps both compositor outputs hidden, settles ready, and stops without entering the blur path. It never paints synthetic discs, colour, glow, or placeholder material, and it is not a substitute for registering available route material.
- `opacityElement` identifies the crisp material whose authored presence the compositor projects. The shell-owned title plane is never a compositor source and keeps its own opacity contract.

Registration returns a generation-qualified, idempotent disposer. A stale disposer cannot clear a newer route source. Source changes clear the diffuse output in the idle state; during a shell transition the outgoing result may freeze under the route cover until the next source is ready. The disposer also exposes `firstFrame`, which resolves `ready`, `cancelled`, or `failed-open` without extending the shell's global readiness timeout.

Scheduling and performance are part of the contract:

- only one host, source, internal animation frame, glow Canvas, and edge Canvas may exist at once;
- High, Balanced, and Low render at `0.5`, `0.375`, and `0.25` scale with bounded emitter budgets of `160`, `96`, and `64`;
- production uses `fieldMode: "broad"`: the large atmospheric field remains at the authored `0.08` spread, while the tight colour-reflection field is deliberately disabled. The dormant small-spread value remains migration and lab input only. Backing-store quality changes resolution only and cannot change the broad field's apparent spread;
- High and Balanced atmosphere cadence is 24 FPS. Low quality uses 20 FPS to free frame time on constrained or over-budget surfaces; source physics/renderers retain their own cadence;
- an already-presented, clean, steady-state atmosphere frame may defer when its measured compositor cost would miss the next display deadline. First, dirty, transition, and replacement frames remain mandatory. The scheduler does not deliberately defer when the next nominal display interval would retain output beyond one atmosphere interval plus one display interval;
- each production compositor frame samples the current completed source frame, applies the broad field across the complete wall, then preserves only the previous clean field behind the current one. The removed tight field must not be simulated by raising opacity or shrinking the broad radius. Browsers with a reliable Canvas filter use the native blur; other browsers use a bounded spread pyramid tuned to the same apparent footprint. That one-frame blend is deterministic rather than frame-time-weighted, so deadline jitter cannot pulse its brightness; it is primed from the first clean field, resets on source/mode/theme/geometry changes, and is disabled for Reduced Motion. There is no content mask, recursive feedback, multi-buffer diffusion, unbounded accumulation, or mode-to-mode trail;
- the wall `ResizeObserver` must update glow and edge backing geometry in place across desktop, tablet, portrait mobile, short landscape, and return-to-desktop resizing; the production audit exercises that live resize cycle for Home, Work, About, and Contact in both themes;
- Canvas sources use one downsampled `drawImage` per visible final-frame layer; emitter sources use a bounded stride; there is no pixel readback, full-resolution fog pass, or per-body edge-distance loop;
- the edge-light Canvas samples only the narrow quality-scaled band exposed by the shell mask; authored inset moves that band inward while its corner radius remains concentric with the studio window. Brightness and saturation belong to the masked CSS compositor layer so Canvas does not run a filtered full-frame raster pass for the edge response;
- simulation bodies stay crisp; broad softness belongs to the shared atmosphere output and never to source-body `CanvasRenderingContext2D.filter`, `shadowBlur`, or a whole-source CSS blur;
- automatic quality may step down after sustained compositor cost, without reducing the simulation's authored body count;
- internal scheduling stops when hidden, disabled, failed, detached, or without an internal source. Transparent `ambient` sources settle through a clear readiness frame and do not retain a loop. Reduced Motion renders a static response for real material sources;
- two consecutive compositor errors fail open: glow and edge clear, crisp route material returns to full presence, and route interaction/readiness continues.
- source startup gets a bounded 2.5-second first-frame window before fail-open so a busy route transition cannot permanently hide a healthy glow source.

`window.__ABS_SIMULATION_ATMOSPHERE__.getSnapshot()` is diagnostic output only. It reports ownership, source, scheduler, scale, cadence, geometry reads, sampled emitters, rolling cost, deadline deferrals, and their maximum retained-output age; it must not become configuration truth.

### Atmospheric Glow performance lab

`/lab/atmosphere-hybrid-glow.html` renders only the broad atmospheric field at an authored default of 8 FPS. It deliberately omits the tight small-radius glow, alternating snapshot canvases, CSS opacity crossfade, and additive display blend. The source simulation and crisp balls retain their normal cadence.

The lab reads the production field material and its bounded one-frame memory, but keeps cadence, level multiplier, enabled state, and quality as lab-owned controls. One visible output Canvas and one reusable source Canvas carry the effect. The clean current field swaps with one history buffer, so memory does not require an additional full-frame history copy or accumulate older frames. Geometry reads occur only when the source Canvas changes size. The lab does not alter production cadence, production configuration, or production host ownership. Reduced Motion resolves to one static broad field without temporal history.

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

`modules/rendering/cursor.js` is the single document-level presentation owner. Event targets are passed through the pointer path, presentation is coalesced to one animation frame, body ownership classes change only when state changes, and `elementFromPoint()` is reserved for programmatic refreshes. Stable Canvas mapping is cached; known scene transforms may refresh it at most once per animation frame. Pointer movement after title settlement must not increase title layout reads.

Modes that smooth pointer state, calculate pointer velocity, or derive deltas must seed their local state from the first valid pointer sample. They must not ease from `CONSTANTS.OFFSCREEN_MOUSE`, the canvas center, or an idle anchor when a pointer/touch first enters, presses, or starts a new contact sequence.

`modules/rendering/title-depth.js` owns the central title scene placement and the stable title-plane controller. `StudioShell` mounts one unkeyed `#simulation-title-canvas` for the shell lifetime. Home and route-backed Daily simulations provide an invisible, semantic, accessible, measurable `#hero-title`; the controller copies that source into the stable plane, retains the last valid bitmap while keyed source content is replaced, redraws for real geometry/theme/font/entrance invalidations, then sleeps. Its mutation observer is scoped to the title, its scene, and title replacement; clock, footer, control, and unrelated route mutations must not wake the plane. During an active title entrance, the controller keeps one uniformly scaled glyph composition anchored to the current semantic title centre. Responsive font changes scale both axes together while the entrance clock continues unchanged; Canvas aspect ratio never becomes a title scale input. The physics engine partitions rear and front material but never draws or owns title pixels.

Do not move the title's CSS x/y placement to align a scene. If a depth scene needs alignment, map the existing DOM title center into canvas coordinates and align the scene to that point. Do not register, snapshot, or transition the title plane, and do not add a second title geometry owner; extend `title-depth.js` so audits, readiness, and accessibility continue to share one source.

## Physics And Render Cost Contract

- Desktop Pit retains its authored 120 Hz reference step during warm-up, direct/recent pointer interaction, or measured pile activity, then returns to 60 Hz after a 250 ms activity hold. Portfolio Pit and other collision-dense desktop modes retain 120 Hz; Water, Magnetic, Weightless, Flies, and Elastic use 60 Hz; mobile retains its existing 60 Hz reference.
- Body warm-up keeps its exact authored simulation duration but is consumed under the route cover in preferred 2 ms, best-effort 4 ms wall-clock slices. Home readiness waits for the slices to finish; custom renderers with no `Ball` bodies skip body warm-up as they did before.
- Per-step damping uses an explicit reference rate, so changing step count does not change the authored decay curve. Do not add a raw per-step multiplier without time normalization.
- Sphere and Cube integrate their shared 3D state at the existing reference step but project each point once per visible frame. They do not run generic `Ball.step()` work.
- Adaptive pressure may defer physics, but bounded simulation debt is carried into later frames. It must not silently discard accepted-frame time.
- Compatible opaque flat circles may share a compound path. Squashed, translucent, material, and depth-special bodies stay on the exact path, and translucent overlaps are never merged without pixel proof.
- Collision grids visit only the current and four forward neighbour cells. Solver passes may stop when remaining correction is below the DPR-scaled subpixel threshold; impact, drag, and active-contact paths retain their full safety budget.
