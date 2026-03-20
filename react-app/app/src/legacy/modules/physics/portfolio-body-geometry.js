// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    PORTFOLIO BODY GEOMETRY (RENDER + COLLISION)              ║
// ║   Chunky grid-led silhouettes for the portfolio pit.                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

const PORTFOLIO_BLOCK_SHAPE_SEQUENCE = [
  'block-square',
  'block-chamfer',
  'block-plus',
  'block-bevel-wide',
  'block-square',
  'block-bevel-tall',
];

export function pickPortfolioBodyShape(index) {
  return PORTFOLIO_BLOCK_SHAPE_SEQUENCE[index % PORTFOLIO_BLOCK_SHAPE_SEQUENCE.length];
}

const _pathScratchX = [];
const _pathScratchY = [];

const SHAPE_POINTS = {
  'block-square': [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ],
  'block-chamfer': [
    [-0.72, -1],
    [0.72, -1],
    [1, -0.72],
    [1, 0.72],
    [0.72, 1],
    [-0.72, 1],
    [-1, 0.72],
    [-1, -0.72],
  ],
  'block-bevel-wide': [
    [-1, -0.84],
    [-0.78, -1],
    [0.78, -1],
    [1, -0.84],
    [1, 0.84],
    [0.78, 1],
    [-0.78, 1],
    [-1, 0.84],
  ],
  'block-bevel-tall': [
    [-0.84, -1],
    [0.84, -1],
    [1, -0.78],
    [1, 0.78],
    [0.84, 1],
    [-0.84, 1],
    [-1, 0.78],
    [-1, -0.78],
  ],
  'block-plus': [
    [-0.52, -1],
    [0.52, -1],
    [0.52, -0.52],
    [1, -0.52],
    [1, 0.52],
    [0.52, 0.52],
    [0.52, 1],
    [-0.52, 1],
    [-0.52, 0.52],
    [-1, 0.52],
    [-1, -0.52],
    [-0.52, -0.52],
  ],
};

function writePolygonLocalVerts(points, r, outX, outY) {
  outX.length = 0;
  outY.length = 0;
  if (!Array.isArray(points) || !points.length) return 0;
  let maxLen = 1;
  for (let i = 0; i < points.length; i += 1) {
    const [px, py] = points[i];
    maxLen = Math.max(maxLen, Math.hypot(px, py));
  }
  const scale = r / maxLen;
  for (let i = 0; i < points.length; i += 1) {
    const [px, py] = points[i];
    outX.push(px * scale);
    outY.push(py * scale);
  }
  return outX.length;
}

/**
 * Writes vertices in **local** space (center 0,0), convex, winding consistent with render.
 * @returns vertex count; `0` means use circular collider of radius `r` only.
 */
export function writePortfolioBodyLocalVertices(shape, r, config, outX, outY) {
  outX.length = 0;
  outY.length = 0;
  if (!shape || shape === 'circle') return 0;
  if (shape === 'block-plus') return 0;
  return writePolygonLocalVerts(SHAPE_POINTS[shape], r, outX, outY);
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
  if (!shape || shape === 'circle') {
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    return;
  }

  const pointCount = writePolygonLocalVerts(SHAPE_POINTS[shape], r, _pathScratchX, _pathScratchY);
  if (pointCount < 3) {
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    return;
  }

  ctx.moveTo(_pathScratchX[0], _pathScratchY[0]);
  for (let i = 1; i < pointCount; i += 1) {
    ctx.lineTo(_pathScratchX[i], _pathScratchY[i]);
  }
  ctx.closePath();
}
