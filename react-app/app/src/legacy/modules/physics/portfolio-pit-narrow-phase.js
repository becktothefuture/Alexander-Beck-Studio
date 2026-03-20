// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║              PORTFOLIO PIT NARROW-PHASE (CONVEX / CIRCLE SAT)                ║
// ║   Geometric contact for project bodies; overlaps add surface gap like balls. ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { writePortfolioBodyLocalVertices } from './portfolio-body-geometry.js';

const _localXA = [];
const _localYA = [];
const _localXB = [];
const _localYB = [];
const _wxA = new Float64Array(48);
const _wyA = new Float64Array(48);
const _wxB = new Float64Array(48);
const _wyB = new Float64Array(48);

function fillWorldVertsInto(ball, config, localX, localY, outWx, outWy) {
  const shape = ball.portfolioBodyShape || 'circle';
  const n = writePortfolioBodyLocalVertices(
    shape,
    ball.r,
    config,
    localX,
    localY,
    ball.portfolioRectAspect || null
  );
  if (n === 0) return 0;
  const th = (ball.theta || 0) + (ball.rotationOffset || 0);
  const c = Math.cos(th);
  const s = Math.sin(th);
  for (let i = 0; i < n; i += 1) {
    const lx = localX[i];
    const ly = localY[i];
    outWx[i] = ball.x + lx * c - ly * s;
    outWy[i] = ball.y + lx * s + ly * c;
  }
  return n;
}

function intervalPoly(px, py, n, nx, ny) {
  let minP = Infinity;
  let maxP = -Infinity;
  for (let i = 0; i < n; i += 1) {
    const p = px[i] * nx + py[i] * ny;
    if (p < minP) minP = p;
    if (p > maxP) maxP = p;
  }
  return { minP, maxP };
}

function intervalCircle(cx, cy, r, nx, ny) {
  const c0 = cx * nx + cy * ny;
  return { minP: c0 - r, maxP: c0 + r };
}

function overlap1D(a0, a1, b0, b1) {
  return Math.min(a1, b1) - Math.max(a0, b0);
}

/**
 * @param {number} dx - (B.x - A.x) circle body A, poly body B
 */
function satCirclePoly(circleX, circleY, cr, px, py, pn, dx, dy, out) {
  let minOv = Infinity;
  let bestNx = 1;
  let bestNy = 0;

  const tryAxis = (inx, iny) => {
    const len = Math.hypot(inx, iny);
    if (len < 1e-12) return true;
    const nx = inx / len;
    const ny = iny / len;
    const ic = intervalCircle(circleX, circleY, cr, nx, ny);
    const ip = intervalPoly(px, py, pn, nx, ny);
    const o = overlap1D(ic.minP, ic.maxP, ip.minP, ip.maxP);
    if (o <= 0) return false;
    if (o < minOv) {
      minOv = o;
      bestNx = nx;
      bestNy = ny;
    }
    return true;
  };

  for (let i = 0; i < pn; i += 1) {
    const j = (i + 1) % pn;
    const ex = px[j] - px[i];
    const ey = py[j] - py[i];
    if (!tryAxis(-ey, ex)) return false;
  }

  for (let i = 0; i < pn; i += 1) {
    const vx = px[i] - circleX;
    const vy = py[i] - circleY;
    const vl = Math.hypot(vx, vy);
    if (vl < 1e-12) continue;
    if (!tryAxis(vx / vl, vy / vl)) return false;
  }

  if (bestNx * dx + bestNy * dy < 0) {
    bestNx = -bestNx;
    bestNy = -bestNy;
  }
  out.nx = bestNx;
  out.ny = bestNy;
  out.geomDeep = minOv;
  return true;
}

function satPolyPoly(ax, ay, an, bx, by, bn, dx, dy, out) {
  let minOv = Infinity;
  let bestNx = 1;
  let bestNy = 0;

  const tryAxis = (inx, iny) => {
    const len = Math.hypot(inx, iny);
    if (len < 1e-12) return true;
    const nx = inx / len;
    const ny = iny / len;
    const ia = intervalPoly(ax, ay, an, nx, ny);
    const ib = intervalPoly(bx, by, bn, nx, ny);
    const o = overlap1D(ia.minP, ia.maxP, ib.minP, ib.maxP);
    if (o <= 0) return false;
    if (o < minOv) {
      minOv = o;
      bestNx = nx;
      bestNy = ny;
    }
    return true;
  };

  for (let i = 0; i < an; i += 1) {
    const j = (i + 1) % an;
    const ex = ax[j] - ax[i];
    const ey = ay[j] - ay[i];
    if (!tryAxis(-ey, ex)) return false;
  }
  for (let i = 0; i < bn; i += 1) {
    const j = (i + 1) % bn;
    const ex = bx[j] - bx[i];
    const ey = by[j] - by[i];
    if (!tryAxis(-ey, ex)) return false;
  }

  if (bestNx * dx + bestNy * dy < 0) {
    bestNx = -bestNx;
    bestNy = -bestNy;
  }
  out.nx = bestNx;
  out.ny = bestNy;
  out.geomDeep = minOv;
  return true;
}

const _satOut = { nx: 1, ny: 0, geomDeep: 0 };

/**
 * Portfolio pit pair: convex polygons and/or circle colliders.
 * @returns {{ useCircle: true } | { useCircle: false, hasContact: false } | { useCircle: false, hasContact: true, nx, ny, overlap }}
 */
export function portfolioPitNarrowPhase(A, B, globals) {
  const config = globals.portfolioPitConfig || {};
  const nA = fillWorldVertsInto(A, config, _localXA, _localYA, _wxA, _wyA);
  const nB = fillWorldVertsInto(B, config, _localXB, _localYB, _wxB, _wyB);

  if (nA === 0 && nB === 0) {
    return { useCircle: true };
  }

  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const gapPx = Math.max(0, Number(globals.ballBallSurfaceGapPx) || 0);

  let ok = false;
  if (nA === 0) {
    ok = satCirclePoly(A.x, A.y, A.r, _wxB, _wyB, nB, dx, dy, _satOut);
  } else if (nB === 0) {
    ok = satCirclePoly(B.x, B.y, B.r, _wxA, _wyA, nA, -dx, -dy, _satOut);
    if (ok) {
      _satOut.nx = -_satOut.nx;
      _satOut.ny = -_satOut.ny;
    }
  } else {
    ok = satPolyPoly(_wxA, _wyA, nA, _wxB, _wyB, nB, dx, dy, _satOut);
  }

  if (!ok) {
    return { useCircle: false, hasContact: false };
  }

  const overlap = _satOut.geomDeep + gapPx;
  return {
    useCircle: false,
    hasContact: true,
    nx: _satOut.nx,
    ny: _satOut.ny,
    overlap,
  };
}

/**
 * Kinematic portfolio body vs other: geometric overlap along normal (A = kinematic).
 */
export function portfolioPitKinematicOverlap(kinematicBall, B, globals) {
  const config = globals.portfolioPitConfig || {};
  const nK = fillWorldVertsInto(kinematicBall, config, _localXA, _localYA, _wxA, _wyA);
  const nB = fillWorldVertsInto(B, config, _localXB, _localYB, _wxB, _wyB);
  const dx = B.x - kinematicBall.x;
  const dy = B.y - kinematicBall.y;

  let ok = false;
  if (nK === 0 && nB === 0) {
    const spacingRatio = globals.ballSpacing || 0;
    const avgRadius = (kinematicBall.r + B.r) * 0.5;
    const gapPx = Math.max(0, Number(globals.ballBallSurfaceGapPx) || 0);
    const rSum = kinematicBall.r + B.r + (avgRadius * spacingRatio) + gapPx;
    const dist2 = dx * dx + dy * dy;
    if (dist2 >= rSum * rSum) return null;
    const dist = Math.sqrt(Math.max(dist2, 1e-12));
    return {
      nx: dx / dist,
      ny: dy / dist,
      overlap: rSum - dist,
    };
  }

  if (nK === 0) {
    ok = satCirclePoly(kinematicBall.x, kinematicBall.y, kinematicBall.r, _wxB, _wyB, nB, dx, dy, _satOut);
  } else if (nB === 0) {
    ok = satCirclePoly(B.x, B.y, B.r, _wxA, _wyA, nK, -dx, -dy, _satOut);
    if (ok) {
      _satOut.nx = -_satOut.nx;
      _satOut.ny = -_satOut.ny;
    }
  } else {
    ok = satPolyPoly(_wxA, _wyA, nK, _wxB, _wyB, nB, dx, dy, _satOut);
  }

  if (!ok) return null;
  const gapPx = Math.max(0, Number(globals.ballBallSurfaceGapPx) || 0);
  return {
    nx: _satOut.nx,
    ny: _satOut.ny,
    overlap: _satOut.geomDeep + gapPx,
  };
}

const _hitLX = [];
const _hitLY = [];

function pointInPoly(xs, ys, n, lx, ly) {
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i, i += 1) {
    const xi = xs[i];
    const yi = ys[i];
    const xj = xs[j];
    const yj = ys[j];
    const intersect = (yi > ly) !== (yj > ly)
      && (lx < ((xj - xi) * (ly - yi)) / (yj - yi + 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function portfolioCanvasPointHitsBody(ball, px, py, globals) {
  const config = globals?.portfolioPitConfig || {};
  const shape = ball.portfolioBodyShape || 'circle';
  const dx = px - ball.x;
  const dy = py - ball.y;
  const th = -(ball.theta || 0) - (ball.rotationOffset || 0);
  const c = Math.cos(th);
  const s = Math.sin(th);
  const lx = dx * c - dy * s;
  const ly = dx * s + dy * c;
  if (!shape || shape === 'circle') {
    return (lx * lx + ly * ly) <= ball.r * ball.r;
  }
  const n = writePortfolioBodyLocalVertices(
    shape,
    ball.r,
    config,
    _hitLX,
    _hitLY,
    ball.portfolioRectAspect || null
  );
  if (n === 0) return (lx * lx + ly * ly) <= ball.r * ball.r;
  return pointInPoly(_hitLX, _hitLY, n, lx, ly);
}
