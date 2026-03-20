# Portfolio pit physics

## Symptoms addressed

- Bodies **pass through** each other or ignore the floor.
- **Floating** above the floor (non-circular silhouettes vs circle-only wall margin).
- **Invisible** interaction volume: mismatch between circumcircle broadphase, chordal SAT hull, and visuals.

## Architecture

- **Solver**: Shared pit integrator in `physics/engine.js` (collisions → walls → post pass).
- **Ball–ball**: `physics/collision.js` — spatial hash broadphase, then `portfolioPitNarrowPhase` (SAT) for `PORTFOLIO_PIT` when both bodies have `projectIndex`.
- **Hull**: `physics/portfolio-body-geometry.js` — **circles** or **Lamé squircles**; the squircle uses the **same** 64-point sampled boundary for canvas fill, SAT, and pointer tests.
- **Walls**: `physics/Ball.js` `getInteriorWallViolation` — inset rounded-rect SDF; portfolio **squircles** use **convex vertex support** along the wall normal instead of `ball.r` only.

## Failure modes (reference)

1. **TypedArray overflow (critical)**: World-vertex buffers in `portfolio-pit-narrow-phase.js` were fixed at **48** floats while hulls could exceed that. Buffers are now **128** wide with a capped copy count.
2. **SAT false negative**: Chordal hull inside true arcs; if narrow phase returned `hasContact: false` while circles overlapped, the solver used to skip the pair. **Mitigation**: fall back to circle separation when SAT reports no contact but `dist² ≤ rSum²` (`collision.js`).
3. **Spatial grid**: Home-pit `R_MAX` and grid cells could miss pairs for huge portfolio radii. **Mitigation**: `PORTFOLIO_PIT` uses **brute-force O(n²)** pair generation for `n ≤ 96` (cheap at project counts).
4. **Mobile iteration stomp**: `detectResponsiveScale` forced `physicsCollisionIterations = 4` on mobile **even in portfolio**, undoing `applyPortfolioPhysicsProfile`. **Mitigation**: skip that stomp when `currentMode === PORTFOLIO_PIT` (`state.js`).
5. **Hull vs fill mismatch**: **Mitigation**: squircles use one `sampleSuperellipseBoundary` for both `appendPortfolioBodyPath` and `writePortfolioBodyLocalVertices`.
6. **Wall “float”**: **Mitigation**: `getPortfolioBodyMaxExtentAlongWorldNormal` for wall margin (`Ball.js`).
7. **Adaptive throttle**: Low FPS could (a) **skip physics frames** in `loop.js` and (b) **reduce** `resolvePitCollisionIterations` — both showed up as tunneling / weak contacts for portfolio SAT. **Mitigation**: `PORTFOLIO_PIT` always runs physics each frame and keeps the full clamped iteration budget (no throttle/FPS cuts).

## Open / follow-up

- **Squircle** clip on `#c` vs circular wall SDF may still disagree slightly in corners; align `corner-shape` or wall math if corner clipping persists.
- Optional: tighten `collisionPairSlopPx` for portfolio after geometry is stable.

## Verification

- Manual: portfolio route — bodies should stack, squircles rest on floor without a gap, no tunneling through each other when falling.
- After SPA/canvas resize: `npm run audit:canvas-spa` (buffer sizing).
