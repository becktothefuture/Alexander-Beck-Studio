# Portfolio pit physics

## Symptoms addressed

- Bodies **pass through** each other or ignore the floor.
- **Floating** above the floor (rounded rects vs circle-only wall margin).
- **Invisible** interaction volume: mismatch between circumcircle broadphase, chordal SAT hull, and visuals.

## Architecture

- **Solver**: Shared pit integrator in `physics/engine.js` (collisions → walls → post pass).
- **Ball–ball**: `physics/collision.js` — spatial hash broadphase, then `portfolioPitNarrowPhase` (SAT) for `PORTFOLIO_PIT` when both bodies have `projectIndex`.
- **Hull**: `physics/portfolio-body-geometry.js` — same vertices for canvas `roundRect` collision and wall **support** extent (rounded portfolio rects).
- **Walls**: `physics/Ball.js` `getInteriorWallViolation` — inset rounded-rect SDF; portfolio rounded rects use **convex support** along the wall normal instead of `ball.r` only.

## Failure modes (reference)

1. **SAT false negative**: Chordal hull inside true arcs; if narrow phase returned `hasContact: false` while circles overlapped, the solver used to skip the pair. **Mitigation**: fall back to circle separation when SAT reports no contact but `dist² ≤ rSum²` (`collision.js`).
2. **Spatial grid too fine**: `cellSize` was derived from `globals.R_MAX` (home pit ~18px). Portfolio radii are **much** larger; pairs in non-adjacent cells were never tested → **no collisions**. **Mitigation**: for `PORTFOLIO_PIT`, derive `cellRMax` as `max(ball.r)` when building the grid (`collision.js`).
3. **Coarse arc approximation**: Few segments per corner underestimated contact. **Mitigation**: increased per-quadrant arc segments in `writeRoundedRectLocalVerts` (see source).
4. **Wall “float”**: Circle margin `r` for a rounded rect whose flat edge is closer than `r`. **Mitigation**: `getPortfolioBodyMaxExtentAlongWorldNormal` for wall margin (`Ball.js`).

## Open / follow-up

- **Squircle** clip on `#c` vs circular wall SDF may still disagree slightly in corners; align `corner-shape` or wall math if corner clipping persists.
- Optional: tighten `collisionPairSlopPx` for portfolio after geometry is stable.

## Verification

- Manual: portfolio route — bodies should stack, rounded rects rest on floor without a gap, no tunneling through each other when falling.
- After SPA/canvas resize: `npm run audit:canvas-spa` (buffer sizing).
