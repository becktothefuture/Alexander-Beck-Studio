import { getGlobals } from '../core/state.js';
import { appendPebbleBodyPath, getPebbleBodyRotation } from './pebble-body.js';

const TAU = Math.PI * 2;
const DEPTH_FOG_MIN_OPACITY = 0.3;
const DEPTH_FOG_START_Z = 0.75;

function clamp(value, min, max, fallback = min) {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.min(max, Math.max(min, next));
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1, 0);
  return t * t * (3 - (2 * t));
}

function hash01(seed) {
  let x = (seed | 0) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967295;
}

function getDepthFogOpacity(z) {
  if (z >= DEPTH_FOG_START_Z) return 1;
  const t = Math.max(0, z) / DEPTH_FOG_START_Z;
  return DEPTH_FOG_MIN_OPACITY + t * (1 - DEPTH_FOG_MIN_OPACITY);
}

function getRootStyle() {
  try {
    return getComputedStyle(document.documentElement);
  } catch (error) {
    return null;
  }
}

function readStyleVar(rootStyle, name) {
  try {
    return rootStyle?.getPropertyValue(name).trim() || '';
  } catch (error) {
    return '';
  }
}

function parseNumberVar(rootStyle, name, fallback, min, max) {
  const raw = readStyleVar(rootStyle, name);
  const numeric = Number.parseFloat(raw);
  if (!Number.isFinite(numeric)) return fallback;
  return clamp(numeric, min, max, fallback);
}

function parseRgbVar(rootStyle, name, fallback) {
  const raw = readStyleVar(rootStyle, name);
  const parts = raw.match(/-?\d+(?:\.\d+)?/g);
  if (parts && parts.length >= 3) {
    return {
      r: clamp(parts[0], 0, 255, fallback.r),
      g: clamp(parts[1], 0, 255, fallback.g),
      b: clamp(parts[2], 0, 255, fallback.b),
    };
  }

  const hex = raw.match(/#([0-9a-f]{3}|[0-9a-f]{6})\b/i)?.[1];
  if (hex) {
    const expanded = hex.length === 3
      ? hex.split('').map((char) => `${char}${char}`).join('')
      : hex;
    return {
      r: parseInt(expanded.slice(0, 2), 16),
      g: parseInt(expanded.slice(2, 4), 16),
      b: parseInt(expanded.slice(4, 6), 16),
    };
  }

  return fallback;
}

function parseCssLengthToCanvasPx(rootStyle, name, axisSize, dpr, fallbackRatio) {
  const raw = readStyleVar(rootStyle, name);
  const numeric = Number.parseFloat(raw);
  if (!Number.isFinite(numeric)) return axisSize * fallbackRatio;

  if (raw.endsWith('vw')) {
    return Math.max(0, (window.innerWidth || axisSize / dpr) * numeric * 0.01 * dpr);
  }
  if (raw.endsWith('vh')) {
    return Math.max(0, (window.innerHeight || axisSize / dpr) * numeric * 0.01 * dpr);
  }
  if (raw.endsWith('vmax')) {
    return Math.max(0, Math.max(window.innerWidth || 0, window.innerHeight || 0) * numeric * 0.01 * dpr);
  }
  if (raw.endsWith('px')) {
    return Math.max(0, numeric * dpr);
  }

  return Math.max(0, axisSize * numeric * 0.01);
}

function getBallSeed(ball, index) {
  const raw = Number.isFinite(ball?.pebbleSeed)
    ? ball.pebbleSeed
    : Number.isFinite(ball?._soundIdSeed)
      ? ball._soundIdSeed
      : index * 2654435761;
  return raw | 0;
}

function appendBallPath(ctx, ball, radius, globals, simpleCircleBodies) {
  if (simpleCircleBodies) {
    ctx.arc(0, 0, radius, 0, TAU);
    return;
  }
  appendPebbleBodyPath(ctx, ball, radius, globals);
}

export function drawBallContrastVeil(ctx, ballsToRender, renderOptions = {}) {
  if (!ctx || !ballsToRender || ballsToRender.length === 0) return;

  const rootStyle = getRootStyle();
  const opacity = parseNumberVar(rootStyle, '--simulation-contrast-veil-opacity', 0, 0, 0.6);
  if (opacity <= 0.0005) return;

  const canvasWidth = Number(renderOptions.canvasWidth) || ctx.canvas?.width || 0;
  const canvasHeight = Number(renderOptions.canvasHeight) || ctx.canvas?.height || 0;
  if (canvasWidth <= 0 || canvasHeight <= 0) return;

  const globals = getGlobals();
  const dpr = Math.max(0.5, Number(globals?.DPR) || 1);
  const wallRgb = parseRgbVar(rootStyle, '--simulation-contrast-veil-rgb', { r: 245, g: 245, b: 245 });
  const reachX = parseCssLengthToCanvasPx(rootStyle, '--simulation-contrast-veil-reach-x', canvasWidth, dpr, 0.25);
  const reachY = parseCssLengthToCanvasPx(rootStyle, '--simulation-contrast-veil-reach-y', canvasHeight, dpr, 0.25);
  const blurVmax = parseNumberVar(rootStyle, '--simulation-contrast-veil-blur-vmax', 7, 2, 16);
  const softness = clamp(blurVmax / 16, 0.12, 1, 0.45);
  const ditherOpacity = parseNumberVar(rootStyle, '--simulation-contrast-veil-dither-opacity', 0, 0, 0.12);
  const ditherSizePx = parseCssLengthToCanvasPx(
    rootStyle,
    '--simulation-contrast-veil-dither-size',
    Math.max(canvasWidth, canvasHeight),
    dpr,
    0.08
  );
  const ditherCell = Math.max(8, ditherSizePx || 96 * dpr);
  const pitLodEnabled = Boolean(renderOptions.pitRenderLodEnabled);
  const tinyRadiusPx = Number(renderOptions.pitTinyRadiusPx) || 0;
  const cullPad = pitLodEnabled ? Math.max(1, tinyRadiusPx) : 0;
  const simpleCircleBodies = Boolean(renderOptions.simpleCircleBodies);
  const useDepthFog = Boolean(renderOptions.applyDepthFog);

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  for (let i = 0; i < ballsToRender.length; i += 1) {
    const ball = ballsToRender[i];
    const radius = ball?.getDisplayRadius?.() ?? ball?.radius ?? 0;
    if (radius <= 0.05) continue;
    if (
      ball.x + radius < -cullPad ||
      ball.y + radius < -cullPad ||
      ball.x - radius > canvasWidth + cullPad ||
      ball.y - radius > canvasHeight + cullPad
    ) {
      continue;
    }
    if (pitLodEnabled && radius <= tinyRadiusPx) continue;

    const distanceX = Math.min(ball.x, canvasWidth - ball.x);
    const distanceY = Math.min(ball.y, canvasHeight - ball.y);
    const edgeX = reachX > 0 ? 1 - clamp(distanceX / reachX, 0, 1, 1) : 0;
    const edgeY = reachY > 0 ? 1 - clamp(distanceY / reachY, 0, 1, 1) : 0;
    let strength = smoothstep(0, 1, Math.max(edgeX, edgeY));
    if (strength <= 0.001) continue;

    strength = Math.pow(strength, 1 + ((1 - softness) * 1.1));
    const seed = getBallSeed(ball, i);
    const cellX = Math.floor(ball.x / ditherCell);
    const cellY = Math.floor(ball.y / ditherCell);
    const dither = ditherOpacity > 0
      ? (hash01(seed ^ (cellX * 374761393) ^ (cellY * 668265263)) - 0.5) * ditherOpacity
      : 0;

    const filterOpacity = ball.filterOpacity ?? 1;
    let alpha = clamp((opacity * strength) + dither, 0, 0.72, 0) * (ball.alpha ?? 1) * filterOpacity;
    if (useDepthFog) alpha *= getDepthFogOpacity(ball.z ?? 1);
    if (alpha <= 0.001) continue;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgb(${wallRgb.r}, ${wallRgb.g}, ${wallRgb.b})`;
    ctx.translate(ball.x, ball.y);
    if (!simpleCircleBodies) {
      const rotationRad = getPebbleBodyRotation(ball);
      if (rotationRad !== 0) ctx.rotate(rotationRad);
    }
    ctx.beginPath();
    appendBallPath(ctx, ball, radius, globals, simpleCircleBodies);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}
