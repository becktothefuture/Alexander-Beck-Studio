// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    PORTFOLIO BODY GEOMETRY (RENDER + COLLISION)              ║
// ║   Single source for canvas paths and convex hull vertices (local space).    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

/** Only circles and rounded rectangles on the portfolio pit. */
export function pickPortfolioBodyShape(index) {
  return (index % 2 === 0) ? 'circle' : 'roundedRect';
}

/** Distinct width/height proportions for each rounded-rect project (inscribed in `r`). */
export const PORTFOLIO_RECT_ASPECT_PRESETS = [
  { ar: 0.96, br: 0.4 },
  { ar: 0.68, br: 0.88 },
  { ar: 0.9, br: 0.5 },
  { ar: 0.52, br: 0.92 },
  { ar: 0.85, br: 0.62 },
  { ar: 0.76, br: 0.74 },
];

export function pickPortfolioRectAspect(index) {
  const rectOrdinal = index >> 1;
  return PORTFOLIO_RECT_ASPECT_PRESETS[rectOrdinal % PORTFOLIO_RECT_ASPECT_PRESETS.length];
}

function resolveRoundedRectDims(r, config, rectOverride) {
  const bodies = config?.bodies || {};
  const ar = clamp(
    rectOverride && Number.isFinite(rectOverride.ar)
      ? rectOverride.ar
      : toNumber(bodies.blockWidthMultiplier, 0.92),
    0.45,
    1
  );
  const br = clamp(
    rectOverride && Number.isFinite(rectOverride.br)
      ? rectOverride.br
      : toNumber(bodies.blockHeightRatio, 0.68),
    0.28,
    0.95
  );
  const k = 1 / Math.hypot(ar, br);
  const hw = r * k * ar;
  const hh = r * k * br;
  const cr = Math.min(hw, hh) * 0.42;
  return { hw, hh, cr };
}

function writeRoundedRectLocalVerts(hw, hh, rc, outX, outY) {
  const rCorner = Math.min(rc, hw, hh);
  const segs = 3;
  const push = (x, y) => {
    outX.push(x);
    outY.push(y);
  };

  push(-hw + rCorner, -hh);
  push(hw - rCorner, -hh);

  let ctrX = hw - rCorner;
  let ctrY = -hh + rCorner;
  for (let i = 1; i < segs; i += 1) {
    const t = (i / segs) * (Math.PI / 2);
    const ang = -Math.PI / 2 + t;
    push(ctrX + rCorner * Math.cos(ang), ctrY + rCorner * Math.sin(ang));
  }

  push(hw, -hh + rCorner);
  push(hw, hh - rCorner);

  ctrX = hw - rCorner;
  ctrY = hh - rCorner;
  for (let i = 1; i < segs; i += 1) {
    const t = (i / segs) * (Math.PI / 2);
    const ang = t;
    push(ctrX + rCorner * Math.cos(ang), ctrY + rCorner * Math.sin(ang));
  }

  push(hw - rCorner, hh);
  push(-hw + rCorner, hh);

  ctrX = -hw + rCorner;
  ctrY = hh - rCorner;
  for (let i = 1; i < segs; i += 1) {
    const t = (i / segs) * (Math.PI / 2);
    const ang = Math.PI / 2 + t;
    push(ctrX + rCorner * Math.cos(ang), ctrY + rCorner * Math.sin(ang));
  }

  push(-hw, hh - rCorner);
  push(-hw, -hh + rCorner);

  ctrX = -hw + rCorner;
  ctrY = -hh + rCorner;
  for (let i = 1; i < segs; i += 1) {
    const t = (i / segs) * (Math.PI / 2);
    const ang = Math.PI + t;
    push(ctrX + rCorner * Math.cos(ang), ctrY + rCorner * Math.sin(ang));
  }
}

/**
 * Writes vertices in **local** space (center 0,0), convex, winding consistent with render.
 * @returns vertex count; `0` means use circular collider of radius `r` only.
 */
export function writePortfolioBodyLocalVertices(shape, r, config, outX, outY, rectOverride = null) {
  outX.length = 0;
  outY.length = 0;
  if (!shape || shape === 'circle') return 0;

  if (shape === 'roundedRect') {
    const { hw, hh, cr } = resolveRoundedRectDims(r, config, rectOverride);
    writeRoundedRectLocalVerts(hw, hh, cr, outX, outY);
    return outX.length;
  }
  return 0;
}

export function appendPortfolioBodyPath(ctx, shape, r, config, rectOverride = null) {
  if (shape === 'roundedRect') {
    const { hw, hh, cr } = resolveRoundedRectDims(r, config, rectOverride);
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(-hw, -hh, hw * 2, hh * 2, cr);
    } else {
      ctx.rect(-hw, -hh, hw * 2, hh * 2);
    }
    return;
  }
  ctx.arc(0, 0, r, 0, Math.PI * 2);
}
