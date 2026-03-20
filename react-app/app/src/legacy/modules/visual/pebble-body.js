// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                        PEBBLE BODY VISUALS                                   ║
// ║  Render-only contour system for all non-portfolio ball bodies.               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const TAU = Math.PI * 2;
const TEMPLATE_COUNT = 16;
const CIRCLE_FALLBACK_DPR_MUL = 4;
const BASE_POINT_COUNT = 14;
const MIN_POINT_COUNT = 10;
const MAX_POINT_COUNT = 18;

const _pathScratchX = [];
const _pathScratchY = [];

function clamp(value, min, max, fallback = min) {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.min(max, Math.max(min, next));
}

function lerp(a, b, t) {
  return a + ((b - a) * t);
}

function hash01(seed) {
  let x = (seed | 0) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967295;
}

function getPebbleControls(globals) {
  const blend = clamp(globals?.pebbleBlend, 0, 1, 0.86);
  const stretch = clamp(globals?.pebbleStretch, 0, 1, 0.30);
  const organic = clamp(globals?.pebbleOrganic, 0, 1, 0.34);
  const bulge = clamp(globals?.pebbleBulge, 0, 1, 0.42);
  const dpr = globals?.DPR || 1;
  return {
    blend,
    stretch,
    organic,
    bulge,
    dpr,
  };
}

function buildTemplate(index) {
  const seed = ((index + 1) * 0x9E3779B1) | 0;
  return {
    pointCount: BASE_POINT_COUNT + (index % 3 === 0 ? 2 : 0),
    stretchX: 1 + (hash01(seed + 11) - 0.5) * 0.48,
    stretchY: 1 + (hash01(seed + 13) - 0.5) * 0.48,
    c2: (hash01(seed + 17) - 0.5) * 0.18,
    s2: (hash01(seed + 19) - 0.5) * 0.18,
    c3: (hash01(seed + 23) - 0.5) * 0.11,
    s3: (hash01(seed + 29) - 0.5) * 0.11,
    c4: (hash01(seed + 31) - 0.5) * 0.07,
    s4: (hash01(seed + 37) - 0.5) * 0.07,
    asym: (hash01(seed + 41) - 0.5) * 0.10,
    pinch: (hash01(seed + 43) - 0.5) * 0.05,
    bulge: 0.08 + hash01(seed + 47) * 0.12,
    phase: hash01(seed + 53) * TAU,
    seed,
  };
}

const PEBBLE_TEMPLATES = Array.from({ length: TEMPLATE_COUNT }, (_, index) => buildTemplate(index));

function getTemplateForBall(ball) {
  const seed = Number.isFinite(ball?.pebbleSeed) ? ball.pebbleSeed : Number.isFinite(ball?._soundIdSeed) ? ball._soundIdSeed : 0;
  const index = Math.abs(seed | 0) % TEMPLATE_COUNT;
  return PEBBLE_TEMPLATES[index];
}

function getPebblePointCount(radius, controls, template) {
  const sizeBand = clamp(radius / 30, 0, 1, 0);
  const stretchBand = controls.stretch * 0.5 + controls.organic * 0.25;
  const count = Math.round(
    BASE_POINT_COUNT +
    (sizeBand * 2) +
    (stretchBand * 2) +
    (template.pointCount > BASE_POINT_COUNT ? 1 : 0)
  );
  return clamp(count, MIN_POINT_COUNT, MAX_POINT_COUNT, BASE_POINT_COUNT);
}

function getPebbleGeometry(ball, radius, globals) {
  const controls = getPebbleControls(globals);
  const template = getTemplateForBall(ball);
  const pointCount = getPebblePointCount(radius, controls, template);

  const cached = ball?._pebbleCache;
  if (
    cached &&
    cached.radius === radius &&
    cached.blend === controls.blend &&
    cached.stretch === controls.stretch &&
    cached.organic === controls.organic &&
    cached.bulge === controls.bulge &&
    cached.pointCount === pointCount &&
    cached.templateIndex === (Math.abs((Number.isFinite(ball?.pebbleSeed) ? ball.pebbleSeed : 0) | 0) % TEMPLATE_COUNT)
  ) {
    return cached;
  }

  const blend = controls.blend;
  const stretch = controls.stretch * blend;
  const organic = controls.organic * blend;
  const bulge = controls.bulge * blend;
  const familyStretchX = lerp(1, template.stretchX, stretch);
  const familyStretchY = lerp(1, template.stretchY, stretch);
  const familyBulge = template.bulge * bulge;
  const familyAsym = template.asym * organic;
  const familyPinch = template.pinch * organic;

  const xs = cached?.xs || [];
  const ys = cached?.ys || [];
  xs.length = 0;
  ys.length = 0;

  let maxLen = 1;
  for (let i = 0; i < pointCount; i += 1) {
    const t = template.phase + ((i / pointCount) * TAU);
    const c1 = Math.cos(t);
    const s1 = Math.sin(t);
    const c2 = Math.cos((2 * t) + template.phase * 0.37);
    const s2 = Math.sin((2 * t) - template.phase * 0.29);
    const c3 = Math.cos((3 * t) + template.phase * 0.22);
    const s3 = Math.sin((3 * t) + template.phase * 0.17);
    const c4 = Math.cos((4 * t) - template.phase * 0.11);
    const s4 = Math.sin((4 * t) + template.phase * 0.13);
    const longAxis = 1 + familyAsym * c1;
    const contour = 1
      + (template.c2 * blend * c2)
      + (template.s2 * organic * s2)
      + (template.c3 * organic * c3)
      + (template.s3 * organic * s3)
      + (template.c4 * organic * c4)
      + (template.s4 * organic * s4)
      + familyBulge * Math.cos(t * 2 - template.phase * 0.5)
      + familyPinch * Math.cos(t - template.phase)
      + (blend * 0.045 * Math.sin(t * 5 + template.phase * 0.25));
    const radiusNorm = Math.max(0.34, contour);
    const x = Math.cos(t) * familyStretchX * longAxis * radiusNorm;
    const y = Math.sin(t) * familyStretchY * (2 - longAxis) * radiusNorm;
    xs.push(x);
    ys.push(y);
    maxLen = Math.max(maxLen, Math.hypot(x, y));
  }

  const invMax = 1 / maxLen;
  for (let i = 0; i < xs.length; i += 1) {
    xs[i] *= invMax;
    ys[i] *= invMax;
  }

  const next = {
    radius,
    blend: controls.blend,
    stretch: controls.stretch,
    organic: controls.organic,
    bulge: controls.bulge,
    pointCount,
    templateIndex: Math.abs((Number.isFinite(ball?.pebbleSeed) ? ball.pebbleSeed : 0) | 0) % TEMPLATE_COUNT,
    xs,
    ys,
  };

  if (ball) ball._pebbleCache = next;
  return next;
}

export function shouldUsePebbleBody(radius, globals) {
  const controls = getPebbleControls(globals);
  return controls.blend > 0.02 && radius > (controls.dpr * CIRCLE_FALLBACK_DPR_MUL);
}

export function appendPebbleBodyPath(ctx, ball, radius, globals) {
  if (!ctx) return;
  if (!ball || !shouldUsePebbleBody(radius, globals)) {
    ctx.arc(0, 0, radius, 0, TAU);
    return;
  }

  const geom = getPebbleGeometry(ball, radius, globals);
  if (!geom || geom.xs.length < 3) {
    ctx.arc(0, 0, radius, 0, TAU);
    return;
  }

  ctx.moveTo(geom.xs[0] * radius, geom.ys[0] * radius);
  for (let i = 1; i < geom.pointCount; i += 1) {
    ctx.lineTo(geom.xs[i] * radius, geom.ys[i] * radius);
  }
  ctx.closePath();
}

function getRgb(hex) {
  const value = String(hex || '#000000').replace('#', '').trim();
  const normalized = value.length === 3
    ? value.split('').map((part) => part + part).join('')
    : value.padEnd(6, '0').slice(0, 6);
  const int = Number.parseInt(normalized, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

export function drawPebbleBodyRim(ctx, ball, x, y, radius, color, globals, opts = {}) {
  if (!ctx) return;
  if (!ball || !shouldUsePebbleBody(radius, globals)) {
    const rgb = getRgb(color);
    const light = `${Math.min(255, Math.round(rgb.r + (255 - rgb.r) * 0.35))},${Math.min(255, Math.round(rgb.g + (255 - rgb.g) * 0.35))},${Math.min(255, Math.round(rgb.b + (255 - rgb.b) * 0.35))}`;
    const shadow = `${Math.max(0, Math.round(rgb.r * 0.65))},${Math.max(0, Math.round(rgb.g * 0.65))},${Math.max(0, Math.round(rgb.b * 0.65))}`;
    const mid = `${rgb.r},${rgb.g},${rgb.b}`;
    const lw = radius * 0.12;
    const strokeR = radius - (lw * 0.55);
    const grad = ctx.createLinearGradient(
      x - radius * 0.10,
      y - radius * 0.15,
      x + radius * 0.10,
      y + radius * 0.15
    );
    grad.addColorStop(0, `rgba(${light},0.6)`);
    grad.addColorStop(0.33, `rgba(${mid},0)`);
    grad.addColorStop(0.83, `rgba(${mid},0)`);
    grad.addColorStop(1, `rgba(${shadow},0.4)`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(x, y, strokeR, 0, TAU);
    ctx.stroke();
    return;
  }

  const geom = getPebbleGeometry(ball, radius, globals);
  if (!geom || geom.xs.length < 3) {
    return;
  }

  const rgb = getRgb(color);
  const light = `${Math.min(255, Math.round(rgb.r + (255 - rgb.r) * 0.35))},${Math.min(255, Math.round(rgb.g + (255 - rgb.g) * 0.35))},${Math.min(255, Math.round(rgb.b + (255 - rgb.b) * 0.35))}`;
  const shadow = `${Math.max(0, Math.round(rgb.r * 0.65))},${Math.max(0, Math.round(rgb.g * 0.65))},${Math.max(0, Math.round(rgb.b * 0.65))}`;
  const mid = `${rgb.r},${rgb.g},${rgb.b}`;
  const lw = radius * 0.12;
  const strokeR = radius - (lw * 0.55);
  const grad = ctx.createLinearGradient(
    x - radius * 0.10,
    y - radius * 0.15,
    x + radius * 0.10,
    y + radius * 0.15
  );
  grad.addColorStop(0, `rgba(${light},0.6)`);
  grad.addColorStop(0.33, `rgba(${mid},0)`);
  grad.addColorStop(0.83, `rgba(${mid},0)`);
  grad.addColorStop(1, `rgba(${shadow},0.4)`);

  ctx.save();
  ctx.translate(x, y);
  if (Number.isFinite(opts.rotationRad) && opts.rotationRad !== 0) {
    ctx.rotate(opts.rotationRad);
  }
  ctx.strokeStyle = grad;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(geom.xs[0] * strokeR, geom.ys[0] * strokeR);
  for (let i = 1; i < geom.pointCount; i += 1) {
    ctx.lineTo(geom.xs[i] * strokeR, geom.ys[i] * strokeR);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

export function drawPebbleBody(ctx, ball, x, y, radius, color, globals, opts = {}) {
  if (!ctx) return;
  const rotationRad = Number.isFinite(opts.rotationRad) ? opts.rotationRad : 0;
  const alpha = Number.isFinite(opts.alpha) ? opts.alpha : 1;
  if (!ball || !shouldUsePebbleBody(radius, globals)) {
    const needsTransform = rotationRad !== 0 || alpha < 1;
    if (needsTransform) {
      ctx.save();
      ctx.translate(x, y);
      if (rotationRad !== 0) ctx.rotate(rotationRad);
      if (alpha < 1) ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, TAU);
      ctx.fill();
      ctx.restore();
      drawPebbleBodyRim(ctx, ball, x, y, radius, color, globals, opts);
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.fill();
      drawPebbleBodyRim(ctx, ball, x, y, radius, color, globals, opts);
    }
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  if (rotationRad !== 0) {
    ctx.rotate(rotationRad);
  }
  if (alpha < 1) {
    ctx.globalAlpha = alpha;
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  appendPebbleBodyPath(ctx, ball, radius, globals);
  ctx.fill();
  ctx.restore();
  drawPebbleBodyRim(ctx, ball, x, y, radius, color, globals, opts);
}

export function getPebbleBodyRotation(ball) {
  return (ball?.theta || 0) + (ball?.rotationOffset || 0);
}
