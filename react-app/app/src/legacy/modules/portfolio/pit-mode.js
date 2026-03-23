// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         PORTFOLIO PIT MODE                                   ║
// ║   Pit solver + smooth pebble render path on top of portfolio hull physics.   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { Ball } from '../physics/Ball.js';
import { getGlobals, clearBalls, syncPitPortfolioRadiusStatsFromBalls } from '../core/state.js';
import { getPortfolioProjectPaletteColor } from '../visual/colors.js';
import { resize, detectOptimalDPR } from '../rendering/renderer.js';
import { getSimulationVisibleInsetPx } from '../utils/frame-geometry.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Extra scale vs authored fractions (tuned after user feedback). */
const PORTFOLIO_BODY_DIAMETER_BOOST = 1.6;
const PORTFOLIO_SPAWN_COLS = 3;
const PORTFOLIO_SPAWN_ROWS = 2;
const PORTFOLIO_SPAWN_ORDER = [
  [1, 0],
  [0, 0],
  [2, 0],
  [1, 1],
  [0, 1],
  [2, 1],
];
const PORTFOLIO_PEBBLE_VARIANTS = 16;
const PORTFOLIO_PEBBLE_SEGMENTS_DESKTOP = 18;
const PORTFOLIO_PEBBLE_SEGMENTS_MOBILE = 12;
const PORTFOLIO_PEBBLE_RENDER_SCALE = 1;
const PORTFOLIO_HOVER_SCALE = 1.05;
const PORTFOLIO_HOVER_SPEED_IN = 8;
const PORTFOLIO_HOVER_SPEED_OUT = 5;
const MOBILE_TYPE_SCALE = 0.9;

function toNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function hexToRgb(hex) {
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

function getContrastText(fill) {
  const { r, g, b } = hexToRgb(fill);
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };
  const luminance = (0.2126 * channel(r)) + (0.7152 * channel(g)) + (0.0722 * channel(b));
  return luminance > 0.42 ? '#111111' : '#f5f1ea';
}

function getReadableLabelRotation(rotationRad) {
  if (!Number.isFinite(rotationRad)) return 0;
  let normalized = rotationRad % (Math.PI * 2);
  if (normalized > Math.PI) normalized -= Math.PI * 2;
  if (normalized < -Math.PI) normalized += Math.PI * 2;
  if (normalized > Math.PI * 0.5) normalized -= Math.PI;
  if (normalized < -Math.PI * 0.5) normalized += Math.PI;
  return normalized;
}

// Time-based salt so each page load produces a slightly different drop pattern.
let _spawnSalt = 0;

function hashUnit(seed) {
  const value = Math.sin((seed + 1 + _spawnSalt) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function lerp(a, b, t) {
  return a + ((b - a) * t);
}

function getPortfolioSpawnPoint(index, width, height, frameInset, wallPadding, radius, headerClearance, isMobile) {
  const safeLeft = frameInset + wallPadding + radius;
  const safeRight = width - frameInset - wallPadding - radius;
  const centerX = width * 0.5;
  const slot = PORTFOLIO_SPAWN_ORDER[index % PORTFOLIO_SPAWN_ORDER.length];
  const bandRatio = isMobile ? 0.58 : 0.42;
  const bandWidth = (safeRight - safeLeft) * bandRatio;
  const bandLeft = clamp(centerX - (bandWidth * 0.5), safeLeft, safeRight);
  const bandRight = clamp(centerX + (bandWidth * 0.5), bandLeft, safeRight);
  const xT = slot[0] / Math.max(1, PORTFOLIO_SPAWN_COLS - 1);
  const columnGap = (bandRight - bandLeft) / Math.max(1, PORTFOLIO_SPAWN_COLS - 1);
  const jitterX = (hashUnit(index + 31) - 0.5) * columnGap * 0.08;
  const stackStep = radius * 1.22;
  const batchOffset = Math.floor(index / PORTFOLIO_SPAWN_ORDER.length) * stackStep * PORTFOLIO_SPAWN_ROWS;
  const dropHeadroom = Math.max(height * 0.18, headerClearance + (radius * 3.1));
  const y = frameInset - dropHeadroom - (slot[1] * stackStep) - batchOffset;
  return {
    x: clamp(lerp(bandLeft, bandRight, xT) + jitterX, safeLeft, safeRight),
    y,
  };
}

function getPortfolioBodyRotationRad(ball) {
  return (ball.theta || 0) + (ball.rotationOffset || 0);
}

function isPortfolioMobileRender(globals = getGlobals()) {
  return Boolean(
    globals?.isMobile
    || globals?.isMobileViewport
    || ((globals?.canvas?.width || 0) > 0 && globals.canvas.width < 700)
  );
}

function makePebbleVariant(index, segmentCount) {
  const phase = (index / PORTFOLIO_PEBBLE_VARIANTS) * Math.PI * 2;
  const phaseB = phase * 1.7;
  const phaseC = phase * 2.3;
  const stretchX = 0.965 + (hashUnit(index + 211) * 0.07);
  const stretchY = 0.955 + (hashUnit(index + 223) * 0.06);
  const swellA = 0.006 + (hashUnit(index + 227) * 0.008);
  const swellB = 0.003 + (hashUnit(index + 229) * 0.005);
  const swellC = 0.001 + (hashUnit(index + 233) * 0.002);
  const taper = 0.002 + (hashUnit(index + 239) * 0.003);
  const skewX = (hashUnit(index + 241) - 0.5) * 0.02;
  const skewY = (hashUnit(index + 251) - 0.5) * 0.016;
  const xPoints = new Float32Array(segmentCount);
  const yPoints = new Float32Array(segmentCount);
  let maxRadius = 1;

  for (let i = 0; i < segmentCount; i += 1) {
    const theta = (i / segmentCount) * Math.PI * 2;
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    const radial = 1
      + (swellA * Math.cos(theta - phase))
      + (swellB * Math.cos((2 * theta) + phaseB))
      + (swellC * Math.sin((3 * theta) - phaseC))
      - (taper * Math.cos((4 * theta) + phase * 0.6));
    const x = (ct * stretchX * radial) + (skewX * st);
    const y = (st * stretchY * radial) + (skewY * ct);
    const len = Math.hypot(x, y);
    if (len > maxRadius) maxRadius = len;
    xPoints[i] = x;
    yPoints[i] = y;
  }

  const inv = 1 / Math.max(1e-6, maxRadius);
  for (let i = 0; i < segmentCount; i += 1) {
    xPoints[i] *= inv;
    yPoints[i] *= inv;
  }

  return { xPoints, yPoints };
}

const PORTFOLIO_PEBBLE_VARIANT_DATA_DESKTOP = Array.from(
  { length: PORTFOLIO_PEBBLE_VARIANTS },
  (_, index) => makePebbleVariant(index, PORTFOLIO_PEBBLE_SEGMENTS_DESKTOP)
);

const PORTFOLIO_PEBBLE_VARIANT_DATA_MOBILE = Array.from(
  { length: PORTFOLIO_PEBBLE_VARIANTS },
  (_, index) => makePebbleVariant(index, PORTFOLIO_PEBBLE_SEGMENTS_MOBILE)
);

function getPebbleVariantForBall(ball, globals = getGlobals()) {
  const index = Number.isInteger(ball?.projectIndex) ? ball.projectIndex : 0;
  const variants = isPortfolioMobileRender(globals)
    ? PORTFOLIO_PEBBLE_VARIANT_DATA_MOBILE
    : PORTFOLIO_PEBBLE_VARIANT_DATA_DESKTOP;
  const variantIndex = Math.abs(index) % variants.length;
  return variants[variantIndex];
}

function appendPebbleBodyPath(ctx, ball, radius) {
  const variant = getPebbleVariantForBall(ball);
  const xs = variant.xPoints;
  const ys = variant.yPoints;
  if (!xs || !ys || xs.length < 3) {
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    return;
  }

  const count = xs.length;
  const startMidX = ((xs[count - 1] + xs[0]) * 0.5) * radius;
  const startMidY = ((ys[count - 1] + ys[0]) * 0.5) * radius;
  ctx.moveTo(startMidX, startMidY);
  for (let i = 0; i < count; i += 1) {
    const next = (i + 1) % count;
    const ctrlX = xs[i] * radius;
    const ctrlY = ys[i] * radius;
    const midX = ((xs[i] + xs[next]) * 0.5) * radius;
    const midY = ((ys[i] + ys[next]) * 0.5) * radius;
    ctx.quadraticCurveTo(ctrlX, ctrlY, midX, midY);
  }
  ctx.closePath();
}

const PORTFOLIO_RIM_WIDTH_MIN_PX = 3;
const PORTFOLIO_RIM_WIDTH_MAX_PX = 6.5;
const PORTFOLIO_RIM_INSET = 0.64;

function getRelativeLuminance(rgb) {
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };
  return (0.2126 * channel(rgb.r)) + (0.7152 * channel(rgb.g)) + (0.0722 * channel(rgb.b));
}

function drawPortfolioBodyRim(ctx, x, y, r, color, drawPath, rotationRad) {
  if (typeof drawPath !== 'function') return;

  const rgb = hexToRgb(color);
  const luminance = getRelativeLuminance(rgb);
  const useShadowContour = luminance > 0.72;
  const contour = useShadowContour
    ? {
        r: Math.round(rgb.r * 0.86),
        g: Math.round(rgb.g * 0.86),
        b: Math.round(rgb.b * 0.86),
        alpha: 0.2,
      }
    : {
        r: Math.round(rgb.r + ((255 - rgb.r) * 0.2)),
        g: Math.round(rgb.g + ((255 - rgb.g) * 0.2)),
        b: Math.round(rgb.b + ((255 - rgb.b) * 0.2)),
        alpha: 0.26,
      };
  const lineWidth = clamp(r * 0.022, PORTFOLIO_RIM_WIDTH_MIN_PX, PORTFOLIO_RIM_WIDTH_MAX_PX);
  const strokeRadius = Math.max(1, r - (lineWidth * PORTFOLIO_RIM_INSET));

  ctx.save();
  ctx.translate(x, y);
  if (Number.isFinite(rotationRad) && rotationRad !== 0) ctx.rotate(rotationRad);
  ctx.beginPath();
  drawPath(ctx, strokeRadius);
  ctx.clip();
  ctx.strokeStyle = `rgba(${contour.r},${contour.g},${contour.b},${contour.alpha})`;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  drawPath(ctx, strokeRadius);
  ctx.stroke();
  ctx.restore();
}

function storePortfolioSeedMetrics(ball, width, height, radius) {
  ball._portfolioSeedCanvasWidth = width;
  ball._portfolioSeedCanvasHeight = height;
  ball._portfolioSeedRadius = radius;
}

function isDocumentDarkMode() {
  if (typeof document === 'undefined') return false;
  return document.documentElement?.classList?.contains('dark-mode')
    || document.body?.classList?.contains('dark-mode');
}

/** First project circle: light fill on dark UI, dark fill on light UI. */
export function getPortfolioAccentCircleFill() {
  return isDocumentDarkMode() ? '#f5f1ea' : '#111111';
}

export function applyPortfolioAccentBallColor(ball) {
  if (!ball?.__portfolioAccentCircle) return;
  const fill = getPortfolioAccentCircleFill();
  ball.color = fill;
  ball.labelColor = getContrastText(fill);
}

export function syncPortfolioAccentCircleColors() {
  const globals = getGlobals();
  const balls = globals.balls;
  if (!Array.isArray(balls)) return;
  let any = false;
  for (let i = 0; i < balls.length; i += 1) {
    const b = balls[i];
    if (b?.__portfolioAccentCircle) {
      applyPortfolioAccentBallColor(b);
      any = true;
    }
  }
  if (any) globals.portfolioSyncLabelLayer?.();
}

export function resolvePortfolioLabelContent(project, fallbackTitle = 'Untitled Project') {
  const eyebrow = String(
    project?.eyebrow
      || project?.labelEyebrow
      || project?.client
      || ''
  ).trim();
  const title = String(
    project?.shapeTitle
      || project?.shapeTitleLong
      || project?.bodyTitle
      || project?.displayTitle
      || project?.title
      || fallbackTitle
  ).trim() || String(fallbackTitle || 'Untitled Project').trim();

  return {
    eyebrow,
    title,
  };
}

export function buildWrappedTitle(ctx, title, bounds) {
  const safeTitle = String(title || '').trim() || 'Untitled Project';
  const words = safeTitle
    .replace(/\s*([+&/])\s*/g, ' $1 ')
    .split(/\s+/)
    .filter(Boolean);
  const maxWidth = Math.max(80, bounds.width);
  const maxHeight = Math.max(80, bounds.height);
  const maxLines = Math.max(1, Math.min(bounds.maxLines || 5, Math.ceil(words.length / 2)));
  const fontMax = Math.round(bounds.fontMax);
  const fontMin = Math.round(bounds.fontMin);
  const fontWeight = Math.max(100, Math.min(900, Math.round(bounds.fontWeight || 600)));

  for (let fontSize = fontMax; fontSize >= fontMin; fontSize -= 1) {
    ctx.font = `${fontWeight} ${fontSize}px ${bounds.fontFamily}`;
    const lines = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i += 1) {
      const nextLine = `${currentLine} ${words[i]}`;
      if (ctx.measureText(nextLine).width <= maxWidth) {
        currentLine = nextLine;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    if (currentLine) lines.push(currentLine);

    if (lines.length > maxLines) continue;

    const lineHeight = fontSize * bounds.lineHeight;
    if ((lines.length * lineHeight) > maxHeight) continue;

    return { fontSize, lineHeight, lines };
  }

  const fallbackFontSize = fontMin;
  ctx.font = `${fontWeight} ${fallbackFontSize}px ${bounds.fontFamily}`;
  const trimLineToFit = (line) => {
    const ellipsis = '...';
    let candidate = String(line || '').trim();
    if (!candidate) return ellipsis;

    while (candidate.length > 0 && ctx.measureText(`${candidate}${ellipsis}`).width > maxWidth) {
      const cut = candidate.lastIndexOf(' ');
      candidate = cut > 0
        ? candidate.slice(0, cut).trimEnd()
        : candidate.slice(0, -1).trimEnd();
    }

    return candidate ? `${candidate}${ellipsis}` : ellipsis;
  };
  const fallbackLines = [];
  let index = 0;
  while (index < words.length && fallbackLines.length < maxLines) {
    let currentLine = words[index] || '';
    index += 1;

    while (index < words.length) {
      const nextLine = `${currentLine} ${words[index]}`;
      if (ctx.measureText(nextLine).width <= maxWidth) {
        currentLine = nextLine;
        index += 1;
      } else {
        break;
      }
    }

    fallbackLines.push(currentLine);
  }

  if (index < words.length && fallbackLines.length) {
    fallbackLines[fallbackLines.length - 1] = trimLineToFit(fallbackLines[fallbackLines.length - 1]);
  }

  return {
    fontSize: fallbackFontSize,
    lineHeight: fallbackFontSize * bounds.lineHeight,
    lines: fallbackLines.length ? fallbackLines : [trimLineToFit(safeTitle)],
  };
}

function computeLabelForBall(ctx, ball, config, project, fontFamily, isMobile) {
  const insetRatio = clamp(toNumber(config.labeling?.innerPaddingRatio, 0.18), 0.08, 0.3);
  const dpr = ball._portfolioDpr || 1;
  const labelFontPx = clamp(
    toNumber(
      isMobile ? config.labeling?.fontMobilePx : config.labeling?.fontDesktopPx,
      isMobile ? 20 : 28
    ),
    12,
    48
  ) * dpr * (isMobile ? MOBILE_TYPE_SCALE : 1);
  const diameter = ball.r * 2;
  const labelWidth = diameter * (1 - (insetRatio * 2));
  const labelHeight = diameter * (1 - (insetRatio * 2));
  const labelContent = resolvePortfolioLabelContent(
    project,
    ball.projectTitleFull || ball.projectTitle || 'Untitled Project'
  );
  const titleBounds = {
    width: labelWidth,
    height: Math.max(24 * dpr, labelHeight * (labelContent.eyebrow ? 0.73 : 0.88)),
    fontMin: Math.max(10 * dpr, Math.round(labelFontPx * 0.54)),
    fontMax: labelFontPx,
    lineHeight: clamp(toNumber(config.labeling?.titleLineHeight, 0.76), 0.68, 0.9),
    fontFamily,
    maxLines: isMobile ? 4 : 4,
    fontWeight: 640,
  };
  const eyebrowBounds = {
    width: labelWidth,
    height: Math.max(18 * dpr, labelHeight * 0.18),
    fontMin: Math.max(9 * dpr, Math.round(labelFontPx * 0.22)),
    fontMax: Math.round(labelFontPx * (isMobile ? 0.38 : 0.42)),
    lineHeight: 0.92,
    fontFamily,
    maxLines: isMobile ? 2 : 1,
    fontWeight: 560,
  };
  const title = buildWrappedTitle(ctx, labelContent.title, titleBounds);
  const eyebrow = labelContent.eyebrow ? buildWrappedTitle(ctx, labelContent.eyebrow, eyebrowBounds) : null;

  ball.label = {
    eyebrow,
    title,
    gap: labelContent.eyebrow ? Math.max(4 * dpr, Math.round(labelFontPx * 0.14)) : 0,
    fontSize: title.fontSize,
    lineHeight: title.lineHeight,
    titleFontSize: title.fontSize,
    titleLineHeight: title.lineHeight,
    eyebrowFontSize: eyebrow?.fontSize || 0,
    eyebrowLineHeight: eyebrow?.lineHeight || 0,
    lines: title.lines,
  };
}

/**
 * Recompute DOM label line breaks after canvas/DPR resize (radii changed).
 */
export function relayoutPortfolioProjectLabels() {
  const globals = getGlobals();
  const ctx = globals.ctx;
  const canvas = globals.canvas;
  const projects = Array.isArray(globals.portfolioProjects) ? globals.portfolioProjects : [];
  if (!ctx || !canvas || !projects.length) return;

  const config = globals.portfolioPitConfig || {};
  const fontFamily = getComputedStyle(document.body).fontFamily || 'Helvetica Neue, Arial, sans-serif';
  const isMobile = canvas.width < 700;
  const balls = Array.isArray(globals.balls) ? globals.balls : [];

  for (let i = 0; i < balls.length; i += 1) {
    const ball = balls[i];
    if (!ball || ball.projectIndex === undefined) continue;
    const project = projects[ball.projectIndex];
    const labelContent = resolvePortfolioLabelContent(
      project,
      ball.projectTitleFull || ball.projectTitle || 'Untitled Project'
    );
    ball._portfolioDpr = globals.DPR || 1;
    if (ball.__portfolioAccentCircle) applyPortfolioAccentBallColor(ball);
    computeLabelForBall(ctx, ball, config, project, fontFamily, isMobile);
    ball.labelColor = getContrastText(ball.color);
    ball.projectEyebrow = labelContent.eyebrow;
    ball.projectTitle = labelContent.title;
    ball.projectTitleFull = String(project?.title || labelContent.title || '').trim();
  }
}

function seedProjectBodies(globals) {
  clearBalls();
  _spawnSalt = (Date.now() % 10000) * 0.001;

  const config = globals.portfolioPitConfig || {};
  const projects = Array.isArray(globals.portfolioProjects) ? globals.portfolioProjects : [];
  const ctx = globals.ctx;
  const canvas = globals.canvas;
  if (!ctx || !canvas || projects.length === 0) return;

  const width = canvas.width;
  const height = canvas.height;
  const dpr = globals.DPR || 1;
  const fontFamily = getComputedStyle(document.body).fontFamily || 'Helvetica Neue, Arial, sans-serif';
  const isMobile = width < 700;

  const frameInset = getSimulationVisibleInsetPx(globals);
  const innerW = Math.max(1, width - 2 * frameInset);
  const innerH = Math.max(1, height - 2 * frameInset);
  const innerArea = innerW * innerH;
  const areaNorm = Math.sqrt(innerArea);

  const minFrac = clamp(toNumber(config.bodies?.minDiameterViewport, 0.14), 0.08, 1);
  const maxFrac = clamp(
    toNumber(config.bodies?.maxDiameterViewport, 0.22),
    minFrac,
    1
  );
  const sizeMul = clamp(toNumber(config.bodies?.diameterScale, 1.2), 1, 1.8);

  let minD = areaNorm * minFrac * sizeMul * PORTFOLIO_BODY_DIAMETER_BOOST;
  let maxD = areaNorm * maxFrac * sizeMul * PORTFOLIO_BODY_DIAMETER_BOOST;

  const wallPadding = Math.min(innerW, innerH) * clamp(toNumber(config.bodies?.wallPaddingViewport, 0.05), 0.02, 0.14);
  const maxDiameterFit = Math.max(24 * dpr, Math.min(innerW, innerH) - 2 * wallPadding);
  maxD = Math.min(maxD, maxDiameterFit);
  minD = Math.min(minD, maxD);

  const headerClearance = Math.max(
    18 * dpr,
    toNumber(config.layout?.headerTopSpacing, 24) * dpr * 1.6
  );
  const vxBase = (isMobile ? 40 : 65) * dpr;
  const vyBase = (isMobile ? 120 : 180) * dpr;

  for (let index = 0; index < projects.length; index += 1) {
    const project = projects[index];
    const sizeT = hashUnit(index + 29);
    const diameter = minD + (maxD - minD) * sizeT;
    const radius = diameter * 0.5;
    const isAccentCircle = index === 0;
    const fill = isAccentCircle
      ? getPortfolioAccentCircleFill()
      : getPortfolioProjectPaletteColor(index - 1, projects.length - 1);
    const spawnPoint = getPortfolioSpawnPoint(
      index,
      width,
      height,
      frameInset,
      wallPadding,
      radius,
      headerClearance,
      isMobile
    );
    const x = spawnPoint.x;
    // Stagger drop heights: each pebble starts at a different altitude
    const staggerHeight = hashUnit(index + 53) * height * 0.3;
    const y = spawnPoint.y - staggerHeight;

    const ball = new Ball(x, y, radius, fill);
    ball.projectIndex = index;
    // Portfolio visuals render custom pebble silhouettes, but the simulation body should remain
    // conservative so the visible contour never clips through neighbors or the wall.
    ball.portfolioBodyShape = 'circle';
    ball.__portfolioAccentCircle = isAccentCircle;
    ball._noSquash = true;
    ball.theta = 0;
    ball.rotationOffset = 0;
    ball.omega = 0;
    ball._portfolioDpr = dpr;
    storePortfolioSeedMetrics(ball, width, height, radius);

    const labelContent = resolvePortfolioLabelContent(project, 'Untitled Project');
    computeLabelForBall(ctx, ball, config, project, fontFamily, isMobile);

    ball.labelColor = getContrastText(fill);
    ball.projectEyebrow = labelContent.eyebrow;
    ball.projectTitle = labelContent.title;
    ball.projectTitleFull = String(project.title || labelContent.title || '').trim();

    // Each pebble gets a distinct throw angle and speed
    const throwAngle = (hashUnit(index + 71) - 0.5) * 1.2;
    const throwSpeed = vyBase * (0.4 + hashUnit(index + 41) * 1.2);
    const inwardBias = (width * 0.5 - x) * 0.08;
    ball.vx = inwardBias + Math.sin(throwAngle) * throwSpeed * 0.7;
    ball.vy = Math.cos(throwAngle) * throwSpeed + vyBase * 0.3;
    globals.balls.push(ball);
  }

  syncPitPortfolioRadiusStatsFromBalls();
}

function renderProjectBody(ctx, ball, isHovered) {
  if (!ball || ball.__portfolioHidden) return;

  const targetScale = isHovered ? PORTFOLIO_HOVER_SCALE : 1;
  const currentScale = ball._hoverScale ?? 1;
  const speed = targetScale > currentScale ? PORTFOLIO_HOVER_SPEED_IN : PORTFOLIO_HOVER_SPEED_OUT;
  const dt = 1 / 60;
  ball._hoverScale = currentScale + (targetScale - currentScale) * Math.min(1, speed * dt);

  const focusDimmer = toNumber(ball.__portfolioDimAlpha, 1);
  const r = ball.r;
  const drawR = r * PORTFOLIO_PEBBLE_RENDER_SCALE * ball._hoverScale;
  const x = ball.x;
  const y = ball.y;
  const alpha = clamp(focusDimmer, 0, 1);
  const rot = getPortfolioBodyRotationRad(ball);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = ball.color;
  ctx.beginPath();
  appendPebbleBodyPath(ctx, ball, drawR);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = alpha;
  drawPortfolioBodyRim(
    ctx,
    x,
    y,
    drawR,
    ball.color,
    (pathCtx, strokeR) => {
      pathCtx.beginPath();
      appendPebbleBodyPath(pathCtx, ball, strokeR);
    },
    rot
  );
  ctx.restore();
}

export function initializePortfolioPit() {
  const globals = getGlobals();

  // SPA gate transitions can leave the canvas at default 300×150 or stale
  // home-route dimensions if resize() no-oped (container zero-sized during
  // the CSS opacity transition).  Force a resize and rebind to the live #c
  // so seedProjectBodies reads correct buffer dimensions.
  try {
    detectOptimalDPR();
    resize();
  } catch (_) { /* ignore */ }

  const canvas = globals.canvas;
  if (canvas && (canvas.width <= 2 || canvas.height <= 2)) {
    // Buffer was never properly sized — skip seeding so the follow-up
    // settlePortfolioPresentation resize + re-seed can recover.
    return;
  }

  seedProjectBodies(globals);
}

/**
 * Portfolio pit uses the shared pit integrator; extra forces stay empty so we do not
 * fight global collision/wall tuning. Drag bounds + kinematic handling live in
 * portfolio `app.js` + `clampBallPositionToWallInterior`.
 */
export function applyPortfolioPitForces(ball, dt) {
  if (!ball || ball.__portfolioHidden || ball.isPointerLocked || ball.__portfolioSelected) return;
  ball.theta = 0;
  ball.omega = 0;
}

function shouldSyncPortfolioLabelLayer(globals, balls) {
  if (!globals) return false;
  if (globals.__portfolioForceLabelSync) {
    globals.__portfolioForceLabelSync = false;
    globals.__portfolioLabelLayerSignature = '';
  }
  const dpr = globals.DPR || 1;
  const nextSignature = balls.map((ball) => {
    if (!ball) return 'x';
    return [
      ball.projectIndex ?? -1,
      ball.__portfolioHidden ? 1 : 0,
      (ball.x / dpr).toFixed(2),
      (ball.y / dpr).toFixed(2),
      (ball.r / dpr).toFixed(2),
      getReadableLabelRotation(ball.theta || 0).toFixed(3),
      (ball.__portfolioDimAlpha ?? 1).toFixed(3),
      ball.__portfolioSelected ? 1 : 0,
      ball.labelColor || '',
      (ball._hoverScale ?? 1).toFixed(3),
    ].join(':');
  }).join('|');
  if (globals.__portfolioLabelLayerSignature === nextSignature) return false;
  globals.__portfolioLabelLayerSignature = nextSignature;
  return true;
}

export function renderPortfolioPit(ctx) {
  const globals = getGlobals();
  const balls = Array.isArray(globals.balls) ? globals.balls : [];
  const hoveredIndex = globals.__portfolioHoveredIndex ?? -1;
  for (let index = 0; index < balls.length; index += 1) {
    const ball = balls[index];
    renderProjectBody(ctx, ball, ball?.projectIndex === hoveredIndex);
  }
  if (shouldSyncPortfolioLabelLayer(globals, balls)) {
    globals.portfolioSyncLabelLayer?.();
  }
}
