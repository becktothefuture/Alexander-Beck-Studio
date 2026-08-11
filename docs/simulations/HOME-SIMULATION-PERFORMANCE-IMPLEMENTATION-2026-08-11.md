# Home simulation performance implementation — 2026-08-11

## Outcome

The Home simulations now do materially less work while preserving the authored composition, material response, depth split, palette, and motion endpoints. The strongest final proof is:

- 64/64 deterministic visual comparisons pass across all 16 Home modes, Chromium and WebKit, desktop and mobile.
- Owned-production Chromium Pit and Flies runs pass every cold and warm repeat at the 60 FPS target.
- Owned-production WebKit Flies passes every repeat. Pit reaches the 58.82 Hz emulated-display ceiling in all repeats, but one cold repeat records a 52 ms maximum gap against the strict 50 ms gate. This remains an open certification failure.
- The small/tight atmosphere spread is removed from production. The broad/large spread remains authored at `0.08`.

This implementation follows specification [#49](https://github.com/becktothefuture/Alexander-Beck-Studio/issues/49) and tickets #50–#61. The source comparison fixed point is commit `6270df38`; that commit contains unrelated About work but no part of this simulation performance implementation.

## What changed

### Pointer and title geometry

The cursor is now the single pointer-presentation owner. It uses the event target before any fallback hit test, coalesces visual work to one requestAnimationFrame, guards body-class writes by state, and caches canvas mapping. Title geometry no longer polls because the permanent noise pseudo-element is animated.

Final pointer proof for an 80-event burst:

| Counter | Before exploratory probe | After |
| --- | ---: | ---: |
| `elementFromPoint` calls | 160 expected from the confirmed two-per-event path | 0 |
| Cursor presentations | 80 event-synchronous opportunities | 1 |
| Body class mutations | repeated per event | 0 |
| Canvas rect reads | repeated per event | 1 |
| Title/glyph layout reads | repeated layout scan | 0 |

A paced 41-event run produces 41 presentations with zero hit tests, body mutations, canvas-rect reads, or title-layout reads after the cache is warm. Evidence: `output/playwright/pointer-title-depth/home-simulations-final-2026-08-11.json`.

### Rendering

- Flat opaque circles batch by visible material capability, not by desktop/mobile identity. Squashed, translucent, and depth-split bodies flush through the exact path, so impact squash and title occlusion remain intact.
- Kaleidoscope and Rift replicas batch only opaque circles. Translucent replicas keep their independent compositing.
- 3D Sphere and Cube integrate state at their existing reference cadence but project points only once per visible update. The final pointer audit records 25 integration steps, 12 projection passes, and exactly `12 × 240 = 2,880` projected Sphere points; touch records 10 steps, 5 passes, and `5 × 160 = 800` points.
- Sphere keeps exact depth order with an insertion sort for coherent frames and retains native sort for initial or high-angular-displacement frames.

### Atmosphere

Production now renders only the broad field. The small/tight field is dormant for migration and lab compatibility. The large spread remains `0.08`; it was not reduced.

This removes one of four native effect passes (25%) and 20 of 38 fallback field draws (about 53%) from the production atmosphere path. Final Home direct-boot audits pass in Chromium and WebKit. Chromium selected its bounded low-quality 20 Hz atmosphere tier at a 2.51 ms mean measured cost; WebKit selected balanced 24 Hz at 0.108 ms. The nine-control production panel exposes field mode and broad spread but not the dormant small spread.

### Physics and collision work

- The spatial collision grid visits the current cell and four forward neighbours instead of scanning the full 3×3 neighbourhood twice. It now clears and traverses only cells active in the current build.
- Collision solvers stop when the largest applied correction is below `0.05 × DPR` instead of always spending the full iteration budget.
- Pit evaluates sleep after constraints and skips body integration for sleeping stacks. A final forced-sleep audit skipped 16 body steps and verified that pointer input wakes the stack. In an owned warm Chromium sample, 325 of 326 Pit bodies were sleeping and 225,601 sleeping body steps were skipped.
- Flubber keeps its full budget during active deformation, then uses measured convergence when settled. The default solver path drops from 21 grid builds to 9 in the deterministic settled probe, a 57% reduction, while retaining zero maximum overlap and the connected two-body composition.
- Flies builds one reusable neighbour grid per physics step. It queries the surrounding 3×3 cells and merges their already-sorted index lists without per-body allocation or sorting. This preserves the original accumulation order and visual endpoint.

### Cadence and time correctness

Flies, Weightless, Water, Magnetic, and Elastic Center now use 60 Hz physics on desktop; collision-dense Pit remains 120 Hz. Generic drag plus Water body/ripple decay, Magnetic damping, Cube tumble damping, and Rift damping are normalized against their previous reference cadence. This is why the reduced step count does not make those materials looser or slower.

The main loop also bounds accumulated debt and records resynchronized/dropped time instead of silently losing an unbounded interval.

### Performance proof contract

The performance artifact is now schema v6. In addition to raw rAF cadence, it gates source-stamped render-invocation p95/p99, longest gap, consecutive missed opportunities, active-input-to-owned-render latency, console/page errors, and all repeats. Static rAF controls run immediately before and after every mode block so a host or browser failure is not blamed on the mode.

## Before and after

The initial data was captured on the same machine with Playwright iPhone 13 emulation. The final Pit/Flies data below uses an owned production build with artifact identity; the final multi-mode Water data is an explicitly labelled local-development diagnostic.

| Browser/mode/profile | Initial worst FPS | Final worst FPS | Initial max gap | Final max gap | Final status |
| --- | ---: | ---: | ---: | ---: | --- |
| WebKit Pit cold | 57.05 | 59.64 | 59 ms | 52 ms | 2/3 cold repeats pass; all warm pass |
| WebKit Water cold | 54.77 | 58.47 | 85 ms | 36 ms | 3/3 cold and 3/3 warm pass in final serial diagnostic |
| WebKit Flies cold | not in initial representative set | 58.92 | — | 47 ms | 3/3 cold and 3/3 warm pass |
| Chromium Pit cold | at the 60 FPS ceiling | 59.95 | ≤10.4 ms in the final run | 10.4 ms | 6/6 cold/warm repeats pass |
| Chromium Flies cold | pre-fix run stalled at 75.8 ms | 59.99 | 75.8 ms | 10.4 ms | 6/6 cold/warm repeats pass |

The WebKit display ceiling in the owned run is 58.82 Hz. Capped results at 58.82 therefore represent full display cadence, not an FPS shortfall.

Evidence:

- `output/playwright/runtime-performance/home-simulations-audit-2026-08-11-webkit.json`
- `output/playwright/runtime-performance/home-simulations-final-serial-2026-08-11-webkit.json`
- `output/playwright/runtime-performance/home-simulations-owned-final-2026-08-11-chromium.json`
- `output/playwright/runtime-performance/home-simulations-owned-final-2026-08-11-webkit.json`

## Look-and-feel proof

The visual parity harness uses deterministic random input, stops the asynchronous loop, advances each side for the same three seconds at that version's real physics cadence, renders once, and compares composition state plus raw-canvas and full-scene screenshots.

Both bounded reports pass with no failures:

- Part A: Pit, Flies, Cube, Water, Sphere, Flubber, Elastic Center, and Kaleidoscope — 32/32.
- Part B: Magnetic, Weightless, Critters, Starfield, Rift, Pressure Crucible, Fountain A, and Fountain B — 32/32.

Evidence:

- `output/playwright/home-simulation-visual-parity/all-modes-final-part-a-2026-08-11/report.json`
- `output/playwright/home-simulation-visual-parity/all-modes-final-part-b-2026-08-11/report.json`

The audit deliberately compares equal simulated duration at each version's true cadence. A prior harness version advanced every desktop mode at 60 Hz and produced false failures for modes whose reference cadence was 120 Hz; the final harness corrects that measurement error without changing visual tolerances.

## Verification

Passed:

- app ESLint and the legacy lint ratchet;
- six Home performance-contract tests;
- 19 runtime performance-contract tests;
- render scheduler, mode runtime, scene pointer, depth title, sphere material, wall geometry, and design-config checks;
- production build and About production-boundary check;
- Chromium and WebKit production-atmosphere direct/panel audits;
- 64/64 cross-browser, cross-viewport visual parity comparisons;
- final pointer, 3D projection, depth split, Pit sleep/wake, reduced-motion Cube, and crisp-glow audit;
- owned-production Chromium Pit/Flies certification; owned-production WebKit Flies certification.

`npm run check:site` still stops at the pre-existing `check:3d-cube` assertion because canonical `cube3dDotSizeMul` is absent (`undefined !== 1`). This value was already missing before this scope and was not restored without separate authorization. All checks before that assertion pass; the targeted checks and production build listed above also pass.

## Remaining risk and next proof

- WebKit Pit is not yet strict all-repeat certified because one cold owned-production sample had a 52 ms maximum gap. The mode otherwise holds the emulated display ceiling, and every warm repeat passes.
- These runs use Playwright device emulation, not a physical iPhone Safari capture. A physical-device trace remains the correct final hardware proof.
- The full performance matrix should be repeated from a clean release commit after unrelated dirty-worktree changes are resolved. No production deployment or push was performed.
