// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    PORTFOLIO BODY GEOMETRY (RENDER + COLLISION)              ║
// ║   Circles + Lamé squircles (square superellipse); one parametric source.    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

/** Alternating shapes: even index = circle, odd = squircle (square Lamé superellipse). */
export function pickPortfolioBodyShape(index) {
  return (index % 2 === 0) ? 'circle' : 'squircle';
}

/** Default Lamé exponent (|x/a|^n + |y/b|^n = 1). n = 4 is the classic “squircle” icon curve. */
const SQUIRCLE_DEFAULT_EXPONENT = 4;

/** Same segment count for canvas fill and SAT — hull matches pixels. */
const SQUIRCLE_HULL_SEGMENTS = 64;

const _pathScratchX = [];
const _pathScratchY = [];

function getSquircleLameExponent(config) {
  const bodies = config?.bodies || {};
  return clamp(
    toNumber(bodies.squircleLameExponent, SQUIRCLE_DEFAULT_EXPONENT),
    2.5,
    8
  );
}

/**
 * Equal half-axes a = b such that the farthest point on the superellipse from the origin
 * is exactly `r` (ball circumradius used for broadphase and spawn sizing).
 */
function getSquircleHalfAxesFromCircumradius(r, n) {
  const inv = Math.sqrt(2) / Math.pow(2, 1 / n);
  const a = r / inv;
  return { a, b: a };
}

function sampleSuperellipseBoundary(a, b, n, segments, outX, outY) {
  outX.length = 0;
  outY.length = 0;
  const twoOverN = 2 / n;
  for (let i = 0; i < segments; i += 1) {
    const t = (i / segments) * Math.PI * 2;
    const ct = Math.cos(t);
    const st = Math.sin(t);
    const ax = Math.abs(ct);
    const ay = Math.abs(st);
    const x = a * Math.sign(ct) * Math.pow(ax, twoOverN);
    const y = b * Math.sign(st) * Math.pow(ay, twoOverN);
    outX.push(x);
    outY.push(y);
  }
}

function fillSquircleLocalVerts(r, config, outX, outY) {
  const n = getSquircleLameExponent(config);
  const { a, b } = getSquircleHalfAxesFromCircumradius(r, n);
  sampleSuperellipseBoundary(a, b, n, SQUIRCLE_HULL_SEGMENTS, outX, outY);
}

/**
 * Writes vertices in **local** space (center 0,0), convex, winding consistent with render.
 * @returns vertex count; `0` means use circular collider of radius `r` only.
 */
export function writePortfolioBodyLocalVertices(shape, r, config, outX, outY) {
  outX.length = 0;
  outY.length = 0;
  if (!shape || shape === 'circle') return 0;

  if (shape === 'squircle') {
    fillSquircleLocalVerts(r, config, outX, outY);
    return outX.length;
  }
  return 0;
}

/**
 * Max distance from body center to hull along a **world-space** direction (unit vector).
 * Used for wall constraints so squircles use the same silhouette as render/SAT.
 */
export function getPortfolioBodyMaxExtentAlongWorldNormal(ball, dirx, diry, globals) {
  const spacingRatio = globals.ballSpacing || 0;
  const pad = 1 + spacingRatio;
  const len = Math.hypot(dirx, diry);
  if (len < 1e-12) return ball.r * pad;
  const ux = dirx / len;
  const uy = diry / len;

  const shape = ball.portfolioBodyShape || 'circle';
  if (!shape || shape === 'circle') {
    return ball.r * pad;
  }

  const config = globals.portfolioPitConfig || {};
  const outX = [];
  const outY = [];
  const nv = writePortfolioBodyLocalVertices(
    shape,
    ball.r,
    config,
    outX,
    outY
  );
  if (nv === 0) {
    return ball.r * pad;
  }

  const th = (ball.theta || 0) + (ball.rotationOffset || 0);
  const c = Math.cos(th);
  const s = Math.sin(th);
  const ldx = c * ux + s * uy;
  const ldy = -s * ux + c * uy;

  let maxS = -Infinity;
  for (let i = 0; i < nv; i += 1) {
    const d = outX[i] * ldx + outY[i] * ldy;
    if (d > maxS) maxS = d;
  }
  if (!(maxS > -Infinity)) return ball.r * pad;
  return maxS * pad;
}

export function appendPortfolioBodyPath(ctx, shape, r, config) {
  if (shape === 'squircle') {
    fillSquircleLocalVerts(r, config, _pathScratchX, _pathScratchY);
    const n = _pathScratchX.length;
    if (n < 3) {
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      return;
    }
    ctx.moveTo(_pathScratchX[0], _pathScratchY[0]);
    for (let i = 1; i < n; i += 1) {
      ctx.lineTo(_pathScratchX[i], _pathScratchY[i]);
    }
    ctx.closePath();
    return;
  }
  ctx.arc(0, 0, r, 0, Math.PI * 2);
}
