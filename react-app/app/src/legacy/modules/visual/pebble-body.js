// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                        PEBBLE BODY VISUALS                                   ║
// ║  Render-only contour system for all non-portfolio ball bodies.               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { MODES } from '../core/constants.js';

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

function getPebbleRenderRadius(radius) {
  return radius;
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

function getRelativeLuminance(rgb) {
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };
  return (0.2126 * channel(rgb.r)) + (0.7152 * channel(rgb.g)) + (0.0722 * channel(rgb.b));
}

function mixToward(rgb, target, t) {
  return {
    r: Math.round(rgb.r + ((target.r - rgb.r) * t)),
    g: Math.round(rgb.g + ((target.g - rgb.g) * t)),
    b: Math.round(rgb.b + ((target.b - rgb.b) * t)),
  };
}

function getPebbleContourStyle(color, globals, radius) {
  const rgb = getRgb(color);
  const luminance = getRelativeLuminance(rgb);
  const useShadowContour = luminance > 0.72;
  const contourRgb = useShadowContour
    ? mixToward(rgb, { r: 0, g: 0, b: 0 }, 0.14)
    : mixToward(rgb, { r: 255, g: 255, b: 255 }, 0.22);
  const contourAlpha = useShadowContour ? 0.22 : 0.28;
  const dpr = globals?.DPR || 1;
  return {
    strokeStyle: `rgba(${contourRgb.r},${contourRgb.g},${contourRgb.b},${contourAlpha})`,
    lineWidth: clamp(radius * 0.06, 0.8 * dpr, 2.2 * dpr, 1.2 * dpr),
    inset: 0.72,
  };
}

export function drawPebbleBodyRim(ctx, ball, x, y, radius, color, globals, opts = {}) {
  if (!ctx) return;
  if (globals?.currentMode === MODES.PIT) return;
  const renderRadius = getPebbleRenderRadius(radius, globals);
  const contour = getPebbleContourStyle(color, globals, radius);
  if (!ball || !shouldUsePebbleBody(radius, globals)) {
    const strokeR = renderRadius - (contour.lineWidth * contour.inset);
    ctx.strokeStyle = contour.strokeStyle;
    ctx.lineWidth = contour.lineWidth;
    ctx.beginPath();
    ctx.arc(x, y, strokeR, 0, TAU);
    ctx.stroke();
    return;
  }

  const geom = getPebbleGeometry(ball, radius, globals);
  if (!geom || geom.xs.length < 3) {
    return;
  }

  const strokeR = renderRadius - (contour.lineWidth * contour.inset);

  ctx.save();
  ctx.translate(x, y);
  if (Number.isFinite(opts.rotationRad) && opts.rotationRad !== 0) {
    ctx.rotate(opts.rotationRad);
  }
  ctx.strokeStyle = contour.strokeStyle;
  ctx.lineWidth = contour.lineWidth;
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
  const renderRadius = getPebbleRenderRadius(radius, globals);
  if (!ball || !shouldUsePebbleBody(radius, globals)) {
    const needsTransform = rotationRad !== 0 || alpha < 1;
    if (needsTransform) {
      ctx.save();
      ctx.translate(x, y);
      if (rotationRad !== 0) ctx.rotate(rotationRad);
      if (alpha < 1) ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, renderRadius, 0, TAU);
      ctx.fill();
      ctx.restore();
      drawPebbleBodyRim(ctx, ball, x, y, radius, color, globals, opts);
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, renderRadius, 0, TAU);
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
  appendPebbleBodyPath(ctx, ball, renderRadius, globals);
  ctx.fill();
  ctx.restore();
  drawPebbleBodyRim(ctx, ball, x, y, radius, color, globals, opts);
}

export function getPebbleBodyRotation(ball) {
  return (ball?.theta || 0) + (ball?.rotationOffset || 0);
}
