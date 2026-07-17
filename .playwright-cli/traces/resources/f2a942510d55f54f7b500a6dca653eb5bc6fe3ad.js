// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         PORTFOLIO PIT MODE                                   ║
// ║   Pit solver + smooth pebble render path on top of portfolio hull physics.   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { Ball } from "/src/legacy/modules/physics/Ball.js";
import { getGlobals, clearBalls, syncPitPortfolioRadiusStatsFromBalls } from "/src/legacy/modules/core/state.js";
import { getPortfolioProjectPaletteColor } from "/src/legacy/modules/visual/colors.js";
import { resize, detectOptimalDPR } from "/src/legacy/modules/rendering/renderer.js";
import { getSimulationCollisionInsetPx } from "/src/legacy/modules/utils/frame-geometry.js";
import { resolvePortfolioLabelContent } from "/src/legacy/modules/portfolio/portfolio-content.js";

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
  const value = String(hex || "var(--color-detected-000000)").replace('#', '').trim();
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
  return luminance > 0.42 ? "var(--color-detected-111111)" : "var(--color-detected-f5f1ea)";
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
  return isDocumentDarkMode() ? "var(--color-detected-f5f1ea)" : "var(--color-detected-111111)";
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
    lineHeight: clamp(toNumber(config.labeling?.titleLineHeight, 0.84), 0.68, 0.9),
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

  const frameInset = getSimulationCollisionInsetPx(globals);
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
    ball.rotationOffset = hashUnit(index + 89) * Math.PI * 2;
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
    const inwardBias = (width * 0.5 - x) * 0.14;
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
  void ball;
  void dt;
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInBpdC1tb2RlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIOKVlOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVl1xuLy8g4pWRICAgICAgICAgICAgICAgICAgICAgICAgIFBPUlRGT0xJTyBQSVQgTU9ERSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg4pWRXG4vLyDilZEgICBQaXQgc29sdmVyICsgc21vb3RoIHBlYmJsZSByZW5kZXIgcGF0aCBvbiB0b3Agb2YgcG9ydGZvbGlvIGh1bGwgcGh5c2ljcy4gICDilZFcbi8vIOKVmuKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVnVxuXG5pbXBvcnQgeyBCYWxsIH0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvcGh5c2ljcy9CYWxsLmpzXCI7XG5pbXBvcnQgeyBnZXRHbG9iYWxzLCBjbGVhckJhbGxzLCBzeW5jUGl0UG9ydGZvbGlvUmFkaXVzU3RhdHNGcm9tQmFsbHMgfSBmcm9tIFwiL3NyYy9sZWdhY3kvbW9kdWxlcy9jb3JlL3N0YXRlLmpzXCI7XG5pbXBvcnQgeyBnZXRQb3J0Zm9saW9Qcm9qZWN0UGFsZXR0ZUNvbG9yIH0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvdmlzdWFsL2NvbG9ycy5qc1wiO1xuaW1wb3J0IHsgcmVzaXplLCBkZXRlY3RPcHRpbWFsRFBSIH0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvcmVuZGVyaW5nL3JlbmRlcmVyLmpzXCI7XG5pbXBvcnQgeyBnZXRTaW11bGF0aW9uQ29sbGlzaW9uSW5zZXRQeCB9IGZyb20gXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL3V0aWxzL2ZyYW1lLWdlb21ldHJ5LmpzXCI7XG5pbXBvcnQgeyByZXNvbHZlUG9ydGZvbGlvTGFiZWxDb250ZW50IH0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvcG9ydGZvbGlvL3BvcnRmb2xpby1jb250ZW50LmpzXCI7XG5cbmZ1bmN0aW9uIGNsYW1wKHZhbHVlLCBtaW4sIG1heCkge1xuICByZXR1cm4gTWF0aC5taW4obWF4LCBNYXRoLm1heChtaW4sIHZhbHVlKSk7XG59XG5cbi8qKiBFeHRyYSBzY2FsZSB2cyBhdXRob3JlZCBmcmFjdGlvbnMgKHR1bmVkIGFmdGVyIHVzZXIgZmVlZGJhY2spLiAqL1xuY29uc3QgUE9SVEZPTElPX0JPRFlfRElBTUVURVJfQk9PU1QgPSAxLjY7XG5jb25zdCBQT1JURk9MSU9fU1BBV05fQ09MUyA9IDM7XG5jb25zdCBQT1JURk9MSU9fU1BBV05fUk9XUyA9IDI7XG5jb25zdCBQT1JURk9MSU9fU1BBV05fT1JERVIgPSBbXG4gIFsxLCAwXSxcbiAgWzAsIDBdLFxuICBbMiwgMF0sXG4gIFsxLCAxXSxcbiAgWzAsIDFdLFxuICBbMiwgMV0sXG5dO1xuY29uc3QgUE9SVEZPTElPX1BFQkJMRV9WQVJJQU5UUyA9IDE2O1xuY29uc3QgUE9SVEZPTElPX1BFQkJMRV9TRUdNRU5UU19ERVNLVE9QID0gMTg7XG5jb25zdCBQT1JURk9MSU9fUEVCQkxFX1NFR01FTlRTX01PQklMRSA9IDEyO1xuY29uc3QgUE9SVEZPTElPX1BFQkJMRV9SRU5ERVJfU0NBTEUgPSAxO1xuY29uc3QgUE9SVEZPTElPX0hPVkVSX1NDQUxFID0gMS4wNTtcbmNvbnN0IFBPUlRGT0xJT19IT1ZFUl9TUEVFRF9JTiA9IDg7XG5jb25zdCBQT1JURk9MSU9fSE9WRVJfU1BFRURfT1VUID0gNTtcbmNvbnN0IE1PQklMRV9UWVBFX1NDQUxFID0gMC45O1xuXG5mdW5jdGlvbiB0b051bWJlcih2YWx1ZSwgZmFsbGJhY2spIHtcbiAgY29uc3QgbnVtZXJpYyA9IE51bWJlcih2YWx1ZSk7XG4gIHJldHVybiBOdW1iZXIuaXNGaW5pdGUobnVtZXJpYykgPyBudW1lcmljIDogZmFsbGJhY2s7XG59XG5cbmZ1bmN0aW9uIGhleFRvUmdiKGhleCkge1xuICBjb25zdCB2YWx1ZSA9IFN0cmluZyhoZXggfHwgXCJ2YXIoLS1jb2xvci1kZXRlY3RlZC0wMDAwMDApXCIpLnJlcGxhY2UoJyMnLCAnJykudHJpbSgpO1xuICBjb25zdCBub3JtYWxpemVkID0gdmFsdWUubGVuZ3RoID09PSAzXG4gICAgPyB2YWx1ZS5zcGxpdCgnJykubWFwKChwYXJ0KSA9PiBwYXJ0ICsgcGFydCkuam9pbignJylcbiAgICA6IHZhbHVlLnBhZEVuZCg2LCAnMCcpLnNsaWNlKDAsIDYpO1xuICBjb25zdCBpbnQgPSBOdW1iZXIucGFyc2VJbnQobm9ybWFsaXplZCwgMTYpO1xuICByZXR1cm4ge1xuICAgIHI6IChpbnQgPj4gMTYpICYgMjU1LFxuICAgIGc6IChpbnQgPj4gOCkgJiAyNTUsXG4gICAgYjogaW50ICYgMjU1LFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRDb250cmFzdFRleHQoZmlsbCkge1xuICBjb25zdCB7IHIsIGcsIGIgfSA9IGhleFRvUmdiKGZpbGwpO1xuICBjb25zdCBjaGFubmVsID0gKHZhbHVlKSA9PiB7XG4gICAgY29uc3Qgbm9ybWFsaXplZCA9IHZhbHVlIC8gMjU1O1xuICAgIHJldHVybiBub3JtYWxpemVkIDw9IDAuMDM5MjhcbiAgICAgID8gbm9ybWFsaXplZCAvIDEyLjkyXG4gICAgICA6IE1hdGgucG93KChub3JtYWxpemVkICsgMC4wNTUpIC8gMS4wNTUsIDIuNCk7XG4gIH07XG4gIGNvbnN0IGx1bWluYW5jZSA9ICgwLjIxMjYgKiBjaGFubmVsKHIpKSArICgwLjcxNTIgKiBjaGFubmVsKGcpKSArICgwLjA3MjIgKiBjaGFubmVsKGIpKTtcbiAgcmV0dXJuIGx1bWluYW5jZSA+IDAuNDIgPyBcInZhcigtLWNvbG9yLWRldGVjdGVkLTExMTExMSlcIiA6IFwidmFyKC0tY29sb3ItZGV0ZWN0ZWQtZjVmMWVhKVwiO1xufVxuXG5mdW5jdGlvbiBnZXRSZWFkYWJsZUxhYmVsUm90YXRpb24ocm90YXRpb25SYWQpIHtcbiAgaWYgKCFOdW1iZXIuaXNGaW5pdGUocm90YXRpb25SYWQpKSByZXR1cm4gMDtcbiAgbGV0IG5vcm1hbGl6ZWQgPSByb3RhdGlvblJhZCAlIChNYXRoLlBJICogMik7XG4gIGlmIChub3JtYWxpemVkID4gTWF0aC5QSSkgbm9ybWFsaXplZCAtPSBNYXRoLlBJICogMjtcbiAgaWYgKG5vcm1hbGl6ZWQgPCAtTWF0aC5QSSkgbm9ybWFsaXplZCArPSBNYXRoLlBJICogMjtcbiAgaWYgKG5vcm1hbGl6ZWQgPiBNYXRoLlBJICogMC41KSBub3JtYWxpemVkIC09IE1hdGguUEk7XG4gIGlmIChub3JtYWxpemVkIDwgLU1hdGguUEkgKiAwLjUpIG5vcm1hbGl6ZWQgKz0gTWF0aC5QSTtcbiAgcmV0dXJuIG5vcm1hbGl6ZWQ7XG59XG5cbi8vIFRpbWUtYmFzZWQgc2FsdCBzbyBlYWNoIHBhZ2UgbG9hZCBwcm9kdWNlcyBhIHNsaWdodGx5IGRpZmZlcmVudCBkcm9wIHBhdHRlcm4uXG5sZXQgX3NwYXduU2FsdCA9IDA7XG5cbmZ1bmN0aW9uIGhhc2hVbml0KHNlZWQpIHtcbiAgY29uc3QgdmFsdWUgPSBNYXRoLnNpbigoc2VlZCArIDEgKyBfc3Bhd25TYWx0KSAqIDEyLjk4OTgpICogNDM3NTguNTQ1MztcbiAgcmV0dXJuIHZhbHVlIC0gTWF0aC5mbG9vcih2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIGxlcnAoYSwgYiwgdCkge1xuICByZXR1cm4gYSArICgoYiAtIGEpICogdCk7XG59XG5cbmZ1bmN0aW9uIGdldFBvcnRmb2xpb1NwYXduUG9pbnQoaW5kZXgsIHdpZHRoLCBoZWlnaHQsIGZyYW1lSW5zZXQsIHdhbGxQYWRkaW5nLCByYWRpdXMsIGhlYWRlckNsZWFyYW5jZSwgaXNNb2JpbGUpIHtcbiAgY29uc3Qgc2FmZUxlZnQgPSBmcmFtZUluc2V0ICsgd2FsbFBhZGRpbmcgKyByYWRpdXM7XG4gIGNvbnN0IHNhZmVSaWdodCA9IHdpZHRoIC0gZnJhbWVJbnNldCAtIHdhbGxQYWRkaW5nIC0gcmFkaXVzO1xuICBjb25zdCBjZW50ZXJYID0gd2lkdGggKiAwLjU7XG4gIGNvbnN0IHNsb3QgPSBQT1JURk9MSU9fU1BBV05fT1JERVJbaW5kZXggJSBQT1JURk9MSU9fU1BBV05fT1JERVIubGVuZ3RoXTtcbiAgY29uc3QgYmFuZFJhdGlvID0gaXNNb2JpbGUgPyAwLjU4IDogMC40MjtcbiAgY29uc3QgYmFuZFdpZHRoID0gKHNhZmVSaWdodCAtIHNhZmVMZWZ0KSAqIGJhbmRSYXRpbztcbiAgY29uc3QgYmFuZExlZnQgPSBjbGFtcChjZW50ZXJYIC0gKGJhbmRXaWR0aCAqIDAuNSksIHNhZmVMZWZ0LCBzYWZlUmlnaHQpO1xuICBjb25zdCBiYW5kUmlnaHQgPSBjbGFtcChjZW50ZXJYICsgKGJhbmRXaWR0aCAqIDAuNSksIGJhbmRMZWZ0LCBzYWZlUmlnaHQpO1xuICBjb25zdCB4VCA9IHNsb3RbMF0gLyBNYXRoLm1heCgxLCBQT1JURk9MSU9fU1BBV05fQ09MUyAtIDEpO1xuICBjb25zdCBjb2x1bW5HYXAgPSAoYmFuZFJpZ2h0IC0gYmFuZExlZnQpIC8gTWF0aC5tYXgoMSwgUE9SVEZPTElPX1NQQVdOX0NPTFMgLSAxKTtcbiAgY29uc3Qgaml0dGVyWCA9IChoYXNoVW5pdChpbmRleCArIDMxKSAtIDAuNSkgKiBjb2x1bW5HYXAgKiAwLjA4O1xuICBjb25zdCBzdGFja1N0ZXAgPSByYWRpdXMgKiAxLjIyO1xuICBjb25zdCBiYXRjaE9mZnNldCA9IE1hdGguZmxvb3IoaW5kZXggLyBQT1JURk9MSU9fU1BBV05fT1JERVIubGVuZ3RoKSAqIHN0YWNrU3RlcCAqIFBPUlRGT0xJT19TUEFXTl9ST1dTO1xuICBjb25zdCBkcm9wSGVhZHJvb20gPSBNYXRoLm1heChoZWlnaHQgKiAwLjE4LCBoZWFkZXJDbGVhcmFuY2UgKyAocmFkaXVzICogMy4xKSk7XG4gIGNvbnN0IHkgPSBmcmFtZUluc2V0IC0gZHJvcEhlYWRyb29tIC0gKHNsb3RbMV0gKiBzdGFja1N0ZXApIC0gYmF0Y2hPZmZzZXQ7XG4gIHJldHVybiB7XG4gICAgeDogY2xhbXAobGVycChiYW5kTGVmdCwgYmFuZFJpZ2h0LCB4VCkgKyBqaXR0ZXJYLCBzYWZlTGVmdCwgc2FmZVJpZ2h0KSxcbiAgICB5LFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRQb3J0Zm9saW9Cb2R5Um90YXRpb25SYWQoYmFsbCkge1xuICByZXR1cm4gKGJhbGwudGhldGEgfHwgMCkgKyAoYmFsbC5yb3RhdGlvbk9mZnNldCB8fCAwKTtcbn1cblxuZnVuY3Rpb24gaXNQb3J0Zm9saW9Nb2JpbGVSZW5kZXIoZ2xvYmFscyA9IGdldEdsb2JhbHMoKSkge1xuICByZXR1cm4gQm9vbGVhbihcbiAgICBnbG9iYWxzPy5pc01vYmlsZVxuICAgIHx8IGdsb2JhbHM/LmlzTW9iaWxlVmlld3BvcnRcbiAgICB8fCAoKGdsb2JhbHM/LmNhbnZhcz8ud2lkdGggfHwgMCkgPiAwICYmIGdsb2JhbHMuY2FudmFzLndpZHRoIDwgNzAwKVxuICApO1xufVxuXG5mdW5jdGlvbiBtYWtlUGViYmxlVmFyaWFudChpbmRleCwgc2VnbWVudENvdW50KSB7XG4gIGNvbnN0IHBoYXNlID0gKGluZGV4IC8gUE9SVEZPTElPX1BFQkJMRV9WQVJJQU5UUykgKiBNYXRoLlBJICogMjtcbiAgY29uc3QgcGhhc2VCID0gcGhhc2UgKiAxLjc7XG4gIGNvbnN0IHBoYXNlQyA9IHBoYXNlICogMi4zO1xuICBjb25zdCBzdHJldGNoWCA9IDAuOTY1ICsgKGhhc2hVbml0KGluZGV4ICsgMjExKSAqIDAuMDcpO1xuICBjb25zdCBzdHJldGNoWSA9IDAuOTU1ICsgKGhhc2hVbml0KGluZGV4ICsgMjIzKSAqIDAuMDYpO1xuICBjb25zdCBzd2VsbEEgPSAwLjAwNiArIChoYXNoVW5pdChpbmRleCArIDIyNykgKiAwLjAwOCk7XG4gIGNvbnN0IHN3ZWxsQiA9IDAuMDAzICsgKGhhc2hVbml0KGluZGV4ICsgMjI5KSAqIDAuMDA1KTtcbiAgY29uc3Qgc3dlbGxDID0gMC4wMDEgKyAoaGFzaFVuaXQoaW5kZXggKyAyMzMpICogMC4wMDIpO1xuICBjb25zdCB0YXBlciA9IDAuMDAyICsgKGhhc2hVbml0KGluZGV4ICsgMjM5KSAqIDAuMDAzKTtcbiAgY29uc3Qgc2tld1ggPSAoaGFzaFVuaXQoaW5kZXggKyAyNDEpIC0gMC41KSAqIDAuMDI7XG4gIGNvbnN0IHNrZXdZID0gKGhhc2hVbml0KGluZGV4ICsgMjUxKSAtIDAuNSkgKiAwLjAxNjtcbiAgY29uc3QgeFBvaW50cyA9IG5ldyBGbG9hdDMyQXJyYXkoc2VnbWVudENvdW50KTtcbiAgY29uc3QgeVBvaW50cyA9IG5ldyBGbG9hdDMyQXJyYXkoc2VnbWVudENvdW50KTtcbiAgbGV0IG1heFJhZGl1cyA9IDE7XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZWdtZW50Q291bnQ7IGkgKz0gMSkge1xuICAgIGNvbnN0IHRoZXRhID0gKGkgLyBzZWdtZW50Q291bnQpICogTWF0aC5QSSAqIDI7XG4gICAgY29uc3QgY3QgPSBNYXRoLmNvcyh0aGV0YSk7XG4gICAgY29uc3Qgc3QgPSBNYXRoLnNpbih0aGV0YSk7XG4gICAgY29uc3QgcmFkaWFsID0gMVxuICAgICAgKyAoc3dlbGxBICogTWF0aC5jb3ModGhldGEgLSBwaGFzZSkpXG4gICAgICArIChzd2VsbEIgKiBNYXRoLmNvcygoMiAqIHRoZXRhKSArIHBoYXNlQikpXG4gICAgICArIChzd2VsbEMgKiBNYXRoLnNpbigoMyAqIHRoZXRhKSAtIHBoYXNlQykpXG4gICAgICAtICh0YXBlciAqIE1hdGguY29zKCg0ICogdGhldGEpICsgcGhhc2UgKiAwLjYpKTtcbiAgICBjb25zdCB4ID0gKGN0ICogc3RyZXRjaFggKiByYWRpYWwpICsgKHNrZXdYICogc3QpO1xuICAgIGNvbnN0IHkgPSAoc3QgKiBzdHJldGNoWSAqIHJhZGlhbCkgKyAoc2tld1kgKiBjdCk7XG4gICAgY29uc3QgbGVuID0gTWF0aC5oeXBvdCh4LCB5KTtcbiAgICBpZiAobGVuID4gbWF4UmFkaXVzKSBtYXhSYWRpdXMgPSBsZW47XG4gICAgeFBvaW50c1tpXSA9IHg7XG4gICAgeVBvaW50c1tpXSA9IHk7XG4gIH1cblxuICBjb25zdCBpbnYgPSAxIC8gTWF0aC5tYXgoMWUtNiwgbWF4UmFkaXVzKTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZWdtZW50Q291bnQ7IGkgKz0gMSkge1xuICAgIHhQb2ludHNbaV0gKj0gaW52O1xuICAgIHlQb2ludHNbaV0gKj0gaW52O1xuICB9XG5cbiAgcmV0dXJuIHsgeFBvaW50cywgeVBvaW50cyB9O1xufVxuXG5jb25zdCBQT1JURk9MSU9fUEVCQkxFX1ZBUklBTlRfREFUQV9ERVNLVE9QID0gQXJyYXkuZnJvbShcbiAgeyBsZW5ndGg6IFBPUlRGT0xJT19QRUJCTEVfVkFSSUFOVFMgfSxcbiAgKF8sIGluZGV4KSA9PiBtYWtlUGViYmxlVmFyaWFudChpbmRleCwgUE9SVEZPTElPX1BFQkJMRV9TRUdNRU5UU19ERVNLVE9QKVxuKTtcblxuY29uc3QgUE9SVEZPTElPX1BFQkJMRV9WQVJJQU5UX0RBVEFfTU9CSUxFID0gQXJyYXkuZnJvbShcbiAgeyBsZW5ndGg6IFBPUlRGT0xJT19QRUJCTEVfVkFSSUFOVFMgfSxcbiAgKF8sIGluZGV4KSA9PiBtYWtlUGViYmxlVmFyaWFudChpbmRleCwgUE9SVEZPTElPX1BFQkJMRV9TRUdNRU5UU19NT0JJTEUpXG4pO1xuXG5mdW5jdGlvbiBnZXRQZWJibGVWYXJpYW50Rm9yQmFsbChiYWxsLCBnbG9iYWxzID0gZ2V0R2xvYmFscygpKSB7XG4gIGNvbnN0IGluZGV4ID0gTnVtYmVyLmlzSW50ZWdlcihiYWxsPy5wcm9qZWN0SW5kZXgpID8gYmFsbC5wcm9qZWN0SW5kZXggOiAwO1xuICBjb25zdCB2YXJpYW50cyA9IGlzUG9ydGZvbGlvTW9iaWxlUmVuZGVyKGdsb2JhbHMpXG4gICAgPyBQT1JURk9MSU9fUEVCQkxFX1ZBUklBTlRfREFUQV9NT0JJTEVcbiAgICA6IFBPUlRGT0xJT19QRUJCTEVfVkFSSUFOVF9EQVRBX0RFU0tUT1A7XG4gIGNvbnN0IHZhcmlhbnRJbmRleCA9IE1hdGguYWJzKGluZGV4KSAlIHZhcmlhbnRzLmxlbmd0aDtcbiAgcmV0dXJuIHZhcmlhbnRzW3ZhcmlhbnRJbmRleF07XG59XG5cbmZ1bmN0aW9uIGFwcGVuZFBlYmJsZUJvZHlQYXRoKGN0eCwgYmFsbCwgcmFkaXVzKSB7XG4gIGNvbnN0IHZhcmlhbnQgPSBnZXRQZWJibGVWYXJpYW50Rm9yQmFsbChiYWxsKTtcbiAgY29uc3QgeHMgPSB2YXJpYW50LnhQb2ludHM7XG4gIGNvbnN0IHlzID0gdmFyaWFudC55UG9pbnRzO1xuICBpZiAoIXhzIHx8ICF5cyB8fCB4cy5sZW5ndGggPCAzKSB7XG4gICAgY3R4LmFyYygwLCAwLCByYWRpdXMsIDAsIE1hdGguUEkgKiAyKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBjb3VudCA9IHhzLmxlbmd0aDtcbiAgY29uc3Qgc3RhcnRNaWRYID0gKCh4c1tjb3VudCAtIDFdICsgeHNbMF0pICogMC41KSAqIHJhZGl1cztcbiAgY29uc3Qgc3RhcnRNaWRZID0gKCh5c1tjb3VudCAtIDFdICsgeXNbMF0pICogMC41KSAqIHJhZGl1cztcbiAgY3R4Lm1vdmVUbyhzdGFydE1pZFgsIHN0YXJ0TWlkWSk7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY291bnQ7IGkgKz0gMSkge1xuICAgIGNvbnN0IG5leHQgPSAoaSArIDEpICUgY291bnQ7XG4gICAgY29uc3QgY3RybFggPSB4c1tpXSAqIHJhZGl1cztcbiAgICBjb25zdCBjdHJsWSA9IHlzW2ldICogcmFkaXVzO1xuICAgIGNvbnN0IG1pZFggPSAoKHhzW2ldICsgeHNbbmV4dF0pICogMC41KSAqIHJhZGl1cztcbiAgICBjb25zdCBtaWRZID0gKCh5c1tpXSArIHlzW25leHRdKSAqIDAuNSkgKiByYWRpdXM7XG4gICAgY3R4LnF1YWRyYXRpY0N1cnZlVG8oY3RybFgsIGN0cmxZLCBtaWRYLCBtaWRZKTtcbiAgfVxuICBjdHguY2xvc2VQYXRoKCk7XG59XG5cbmZ1bmN0aW9uIHN0b3JlUG9ydGZvbGlvU2VlZE1ldHJpY3MoYmFsbCwgd2lkdGgsIGhlaWdodCwgcmFkaXVzKSB7XG4gIGJhbGwuX3BvcnRmb2xpb1NlZWRDYW52YXNXaWR0aCA9IHdpZHRoO1xuICBiYWxsLl9wb3J0Zm9saW9TZWVkQ2FudmFzSGVpZ2h0ID0gaGVpZ2h0O1xuICBiYWxsLl9wb3J0Zm9saW9TZWVkUmFkaXVzID0gcmFkaXVzO1xufVxuXG5mdW5jdGlvbiBpc0RvY3VtZW50RGFya01vZGUoKSB7XG4gIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ/LmNsYXNzTGlzdD8uY29udGFpbnMoJ2RhcmstbW9kZScpXG4gICAgfHwgZG9jdW1lbnQuYm9keT8uY2xhc3NMaXN0Py5jb250YWlucygnZGFyay1tb2RlJyk7XG59XG5cbi8qKiBGaXJzdCBwcm9qZWN0IGNpcmNsZTogbGlnaHQgZmlsbCBvbiBkYXJrIFVJLCBkYXJrIGZpbGwgb24gbGlnaHQgVUkuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UG9ydGZvbGlvQWNjZW50Q2lyY2xlRmlsbCgpIHtcbiAgcmV0dXJuIGlzRG9jdW1lbnREYXJrTW9kZSgpID8gXCJ2YXIoLS1jb2xvci1kZXRlY3RlZC1mNWYxZWEpXCIgOiBcInZhcigtLWNvbG9yLWRldGVjdGVkLTExMTExMSlcIjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UG9ydGZvbGlvQWNjZW50QmFsbENvbG9yKGJhbGwpIHtcbiAgaWYgKCFiYWxsPy5fX3BvcnRmb2xpb0FjY2VudENpcmNsZSkgcmV0dXJuO1xuICBjb25zdCBmaWxsID0gZ2V0UG9ydGZvbGlvQWNjZW50Q2lyY2xlRmlsbCgpO1xuICBiYWxsLmNvbG9yID0gZmlsbDtcbiAgYmFsbC5sYWJlbENvbG9yID0gZ2V0Q29udHJhc3RUZXh0KGZpbGwpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3luY1BvcnRmb2xpb0FjY2VudENpcmNsZUNvbG9ycygpIHtcbiAgY29uc3QgZ2xvYmFscyA9IGdldEdsb2JhbHMoKTtcbiAgY29uc3QgYmFsbHMgPSBnbG9iYWxzLmJhbGxzO1xuICBpZiAoIUFycmF5LmlzQXJyYXkoYmFsbHMpKSByZXR1cm47XG4gIGxldCBhbnkgPSBmYWxzZTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBiYWxscy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGNvbnN0IGIgPSBiYWxsc1tpXTtcbiAgICBpZiAoYj8uX19wb3J0Zm9saW9BY2NlbnRDaXJjbGUpIHtcbiAgICAgIGFwcGx5UG9ydGZvbGlvQWNjZW50QmFsbENvbG9yKGIpO1xuICAgICAgYW55ID0gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgaWYgKGFueSkgZ2xvYmFscy5wb3J0Zm9saW9TeW5jTGFiZWxMYXllcj8uKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFdyYXBwZWRUaXRsZShjdHgsIHRpdGxlLCBib3VuZHMpIHtcbiAgY29uc3Qgc2FmZVRpdGxlID0gU3RyaW5nKHRpdGxlIHx8ICcnKS50cmltKCkgfHwgJ1VudGl0bGVkIFByb2plY3QnO1xuICBjb25zdCB3b3JkcyA9IHNhZmVUaXRsZVxuICAgIC5yZXBsYWNlKC9cXHMqKFsrJi9dKVxccyovZywgJyAkMSAnKVxuICAgIC5zcGxpdCgvXFxzKy8pXG4gICAgLmZpbHRlcihCb29sZWFuKTtcbiAgY29uc3QgbWF4V2lkdGggPSBNYXRoLm1heCg4MCwgYm91bmRzLndpZHRoKTtcbiAgY29uc3QgbWF4SGVpZ2h0ID0gTWF0aC5tYXgoODAsIGJvdW5kcy5oZWlnaHQpO1xuICBjb25zdCBtYXhMaW5lcyA9IE1hdGgubWF4KDEsIE1hdGgubWluKGJvdW5kcy5tYXhMaW5lcyB8fCA1LCBNYXRoLmNlaWwod29yZHMubGVuZ3RoIC8gMikpKTtcbiAgY29uc3QgZm9udE1heCA9IE1hdGgucm91bmQoYm91bmRzLmZvbnRNYXgpO1xuICBjb25zdCBmb250TWluID0gTWF0aC5yb3VuZChib3VuZHMuZm9udE1pbik7XG4gIGNvbnN0IGZvbnRXZWlnaHQgPSBNYXRoLm1heCgxMDAsIE1hdGgubWluKDkwMCwgTWF0aC5yb3VuZChib3VuZHMuZm9udFdlaWdodCB8fCA2MDApKSk7XG5cbiAgZm9yIChsZXQgZm9udFNpemUgPSBmb250TWF4OyBmb250U2l6ZSA+PSBmb250TWluOyBmb250U2l6ZSAtPSAxKSB7XG4gICAgY3R4LmZvbnQgPSBgJHtmb250V2VpZ2h0fSAke2ZvbnRTaXplfXB4ICR7Ym91bmRzLmZvbnRGYW1pbHl9YDtcbiAgICBjb25zdCBsaW5lcyA9IFtdO1xuICAgIGxldCBjdXJyZW50TGluZSA9IHdvcmRzWzBdIHx8ICcnO1xuXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCB3b3Jkcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgY29uc3QgbmV4dExpbmUgPSBgJHtjdXJyZW50TGluZX0gJHt3b3Jkc1tpXX1gO1xuICAgICAgaWYgKGN0eC5tZWFzdXJlVGV4dChuZXh0TGluZSkud2lkdGggPD0gbWF4V2lkdGgpIHtcbiAgICAgICAgY3VycmVudExpbmUgPSBuZXh0TGluZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxpbmVzLnB1c2goY3VycmVudExpbmUpO1xuICAgICAgICBjdXJyZW50TGluZSA9IHdvcmRzW2ldO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoY3VycmVudExpbmUpIGxpbmVzLnB1c2goY3VycmVudExpbmUpO1xuXG4gICAgaWYgKGxpbmVzLmxlbmd0aCA+IG1heExpbmVzKSBjb250aW51ZTtcblxuICAgIGNvbnN0IGxpbmVIZWlnaHQgPSBmb250U2l6ZSAqIGJvdW5kcy5saW5lSGVpZ2h0O1xuICAgIGlmICgobGluZXMubGVuZ3RoICogbGluZUhlaWdodCkgPiBtYXhIZWlnaHQpIGNvbnRpbnVlO1xuXG4gICAgcmV0dXJuIHsgZm9udFNpemUsIGxpbmVIZWlnaHQsIGxpbmVzIH07XG4gIH1cblxuICBjb25zdCBmYWxsYmFja0ZvbnRTaXplID0gZm9udE1pbjtcbiAgY3R4LmZvbnQgPSBgJHtmb250V2VpZ2h0fSAke2ZhbGxiYWNrRm9udFNpemV9cHggJHtib3VuZHMuZm9udEZhbWlseX1gO1xuICBjb25zdCB0cmltTGluZVRvRml0ID0gKGxpbmUpID0+IHtcbiAgICBjb25zdCBlbGxpcHNpcyA9ICcuLi4nO1xuICAgIGxldCBjYW5kaWRhdGUgPSBTdHJpbmcobGluZSB8fCAnJykudHJpbSgpO1xuICAgIGlmICghY2FuZGlkYXRlKSByZXR1cm4gZWxsaXBzaXM7XG5cbiAgICB3aGlsZSAoY2FuZGlkYXRlLmxlbmd0aCA+IDAgJiYgY3R4Lm1lYXN1cmVUZXh0KGAke2NhbmRpZGF0ZX0ke2VsbGlwc2lzfWApLndpZHRoID4gbWF4V2lkdGgpIHtcbiAgICAgIGNvbnN0IGN1dCA9IGNhbmRpZGF0ZS5sYXN0SW5kZXhPZignICcpO1xuICAgICAgY2FuZGlkYXRlID0gY3V0ID4gMFxuICAgICAgICA/IGNhbmRpZGF0ZS5zbGljZSgwLCBjdXQpLnRyaW1FbmQoKVxuICAgICAgICA6IGNhbmRpZGF0ZS5zbGljZSgwLCAtMSkudHJpbUVuZCgpO1xuICAgIH1cblxuICAgIHJldHVybiBjYW5kaWRhdGUgPyBgJHtjYW5kaWRhdGV9JHtlbGxpcHNpc31gIDogZWxsaXBzaXM7XG4gIH07XG4gIGNvbnN0IGZhbGxiYWNrTGluZXMgPSBbXTtcbiAgbGV0IGluZGV4ID0gMDtcbiAgd2hpbGUgKGluZGV4IDwgd29yZHMubGVuZ3RoICYmIGZhbGxiYWNrTGluZXMubGVuZ3RoIDwgbWF4TGluZXMpIHtcbiAgICBsZXQgY3VycmVudExpbmUgPSB3b3Jkc1tpbmRleF0gfHwgJyc7XG4gICAgaW5kZXggKz0gMTtcblxuICAgIHdoaWxlIChpbmRleCA8IHdvcmRzLmxlbmd0aCkge1xuICAgICAgY29uc3QgbmV4dExpbmUgPSBgJHtjdXJyZW50TGluZX0gJHt3b3Jkc1tpbmRleF19YDtcbiAgICAgIGlmIChjdHgubWVhc3VyZVRleHQobmV4dExpbmUpLndpZHRoIDw9IG1heFdpZHRoKSB7XG4gICAgICAgIGN1cnJlbnRMaW5lID0gbmV4dExpbmU7XG4gICAgICAgIGluZGV4ICs9IDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmYWxsYmFja0xpbmVzLnB1c2goY3VycmVudExpbmUpO1xuICB9XG5cbiAgaWYgKGluZGV4IDwgd29yZHMubGVuZ3RoICYmIGZhbGxiYWNrTGluZXMubGVuZ3RoKSB7XG4gICAgZmFsbGJhY2tMaW5lc1tmYWxsYmFja0xpbmVzLmxlbmd0aCAtIDFdID0gdHJpbUxpbmVUb0ZpdChmYWxsYmFja0xpbmVzW2ZhbGxiYWNrTGluZXMubGVuZ3RoIC0gMV0pO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBmb250U2l6ZTogZmFsbGJhY2tGb250U2l6ZSxcbiAgICBsaW5lSGVpZ2h0OiBmYWxsYmFja0ZvbnRTaXplICogYm91bmRzLmxpbmVIZWlnaHQsXG4gICAgbGluZXM6IGZhbGxiYWNrTGluZXMubGVuZ3RoID8gZmFsbGJhY2tMaW5lcyA6IFt0cmltTGluZVRvRml0KHNhZmVUaXRsZSldLFxuICB9O1xufVxuXG5mdW5jdGlvbiBjb21wdXRlTGFiZWxGb3JCYWxsKGN0eCwgYmFsbCwgY29uZmlnLCBwcm9qZWN0LCBmb250RmFtaWx5LCBpc01vYmlsZSkge1xuICBjb25zdCBpbnNldFJhdGlvID0gY2xhbXAodG9OdW1iZXIoY29uZmlnLmxhYmVsaW5nPy5pbm5lclBhZGRpbmdSYXRpbywgMC4xOCksIDAuMDgsIDAuMyk7XG4gIGNvbnN0IGRwciA9IGJhbGwuX3BvcnRmb2xpb0RwciB8fCAxO1xuICBjb25zdCBsYWJlbEZvbnRQeCA9IGNsYW1wKFxuICAgIHRvTnVtYmVyKFxuICAgICAgaXNNb2JpbGUgPyBjb25maWcubGFiZWxpbmc/LmZvbnRNb2JpbGVQeCA6IGNvbmZpZy5sYWJlbGluZz8uZm9udERlc2t0b3BQeCxcbiAgICAgIGlzTW9iaWxlID8gMjAgOiAyOFxuICAgICksXG4gICAgMTIsXG4gICAgNDhcbiAgKSAqIGRwciAqIChpc01vYmlsZSA/IE1PQklMRV9UWVBFX1NDQUxFIDogMSk7XG4gIGNvbnN0IGRpYW1ldGVyID0gYmFsbC5yICogMjtcbiAgY29uc3QgbGFiZWxXaWR0aCA9IGRpYW1ldGVyICogKDEgLSAoaW5zZXRSYXRpbyAqIDIpKTtcbiAgY29uc3QgbGFiZWxIZWlnaHQgPSBkaWFtZXRlciAqICgxIC0gKGluc2V0UmF0aW8gKiAyKSk7XG4gIGNvbnN0IGxhYmVsQ29udGVudCA9IHJlc29sdmVQb3J0Zm9saW9MYWJlbENvbnRlbnQoXG4gICAgcHJvamVjdCxcbiAgICBiYWxsLnByb2plY3RUaXRsZUZ1bGwgfHwgYmFsbC5wcm9qZWN0VGl0bGUgfHwgJ1VudGl0bGVkIFByb2plY3QnXG4gICk7XG4gIGNvbnN0IHRpdGxlQm91bmRzID0ge1xuICAgIHdpZHRoOiBsYWJlbFdpZHRoLFxuICAgIGhlaWdodDogTWF0aC5tYXgoMjQgKiBkcHIsIGxhYmVsSGVpZ2h0ICogKGxhYmVsQ29udGVudC5leWVicm93ID8gMC43MyA6IDAuODgpKSxcbiAgICBmb250TWluOiBNYXRoLm1heCgxMCAqIGRwciwgTWF0aC5yb3VuZChsYWJlbEZvbnRQeCAqIDAuNTQpKSxcbiAgICBmb250TWF4OiBsYWJlbEZvbnRQeCxcbiAgICBsaW5lSGVpZ2h0OiBjbGFtcCh0b051bWJlcihjb25maWcubGFiZWxpbmc/LnRpdGxlTGluZUhlaWdodCwgMC44NCksIDAuNjgsIDAuOSksXG4gICAgZm9udEZhbWlseSxcbiAgICBtYXhMaW5lczogaXNNb2JpbGUgPyA0IDogNCxcbiAgICBmb250V2VpZ2h0OiA2NDAsXG4gIH07XG4gIGNvbnN0IGV5ZWJyb3dCb3VuZHMgPSB7XG4gICAgd2lkdGg6IGxhYmVsV2lkdGgsXG4gICAgaGVpZ2h0OiBNYXRoLm1heCgxOCAqIGRwciwgbGFiZWxIZWlnaHQgKiAwLjE4KSxcbiAgICBmb250TWluOiBNYXRoLm1heCg5ICogZHByLCBNYXRoLnJvdW5kKGxhYmVsRm9udFB4ICogMC4yMikpLFxuICAgIGZvbnRNYXg6IE1hdGgucm91bmQobGFiZWxGb250UHggKiAoaXNNb2JpbGUgPyAwLjM4IDogMC40MikpLFxuICAgIGxpbmVIZWlnaHQ6IDAuOTIsXG4gICAgZm9udEZhbWlseSxcbiAgICBtYXhMaW5lczogaXNNb2JpbGUgPyAyIDogMSxcbiAgICBmb250V2VpZ2h0OiA1NjAsXG4gIH07XG4gIGNvbnN0IHRpdGxlID0gYnVpbGRXcmFwcGVkVGl0bGUoY3R4LCBsYWJlbENvbnRlbnQudGl0bGUsIHRpdGxlQm91bmRzKTtcbiAgY29uc3QgZXllYnJvdyA9IGxhYmVsQ29udGVudC5leWVicm93ID8gYnVpbGRXcmFwcGVkVGl0bGUoY3R4LCBsYWJlbENvbnRlbnQuZXllYnJvdywgZXllYnJvd0JvdW5kcykgOiBudWxsO1xuXG4gIGJhbGwubGFiZWwgPSB7XG4gICAgZXllYnJvdyxcbiAgICB0aXRsZSxcbiAgICBnYXA6IGxhYmVsQ29udGVudC5leWVicm93ID8gTWF0aC5tYXgoNCAqIGRwciwgTWF0aC5yb3VuZChsYWJlbEZvbnRQeCAqIDAuMTQpKSA6IDAsXG4gICAgZm9udFNpemU6IHRpdGxlLmZvbnRTaXplLFxuICAgIGxpbmVIZWlnaHQ6IHRpdGxlLmxpbmVIZWlnaHQsXG4gICAgdGl0bGVGb250U2l6ZTogdGl0bGUuZm9udFNpemUsXG4gICAgdGl0bGVMaW5lSGVpZ2h0OiB0aXRsZS5saW5lSGVpZ2h0LFxuICAgIGV5ZWJyb3dGb250U2l6ZTogZXllYnJvdz8uZm9udFNpemUgfHwgMCxcbiAgICBleWVicm93TGluZUhlaWdodDogZXllYnJvdz8ubGluZUhlaWdodCB8fCAwLFxuICAgIGxpbmVzOiB0aXRsZS5saW5lcyxcbiAgfTtcbn1cblxuLyoqXG4gKiBSZWNvbXB1dGUgRE9NIGxhYmVsIGxpbmUgYnJlYWtzIGFmdGVyIGNhbnZhcy9EUFIgcmVzaXplIChyYWRpaSBjaGFuZ2VkKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbGF5b3V0UG9ydGZvbGlvUHJvamVjdExhYmVscygpIHtcbiAgY29uc3QgZ2xvYmFscyA9IGdldEdsb2JhbHMoKTtcbiAgY29uc3QgY3R4ID0gZ2xvYmFscy5jdHg7XG4gIGNvbnN0IGNhbnZhcyA9IGdsb2JhbHMuY2FudmFzO1xuICBjb25zdCBwcm9qZWN0cyA9IEFycmF5LmlzQXJyYXkoZ2xvYmFscy5wb3J0Zm9saW9Qcm9qZWN0cykgPyBnbG9iYWxzLnBvcnRmb2xpb1Byb2plY3RzIDogW107XG4gIGlmICghY3R4IHx8ICFjYW52YXMgfHwgIXByb2plY3RzLmxlbmd0aCkgcmV0dXJuO1xuXG4gIGNvbnN0IGNvbmZpZyA9IGdsb2JhbHMucG9ydGZvbGlvUGl0Q29uZmlnIHx8IHt9O1xuICBjb25zdCBmb250RmFtaWx5ID0gZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5ib2R5KS5mb250RmFtaWx5IHx8ICdIZWx2ZXRpY2EgTmV1ZSwgQXJpYWwsIHNhbnMtc2VyaWYnO1xuICBjb25zdCBpc01vYmlsZSA9IGNhbnZhcy53aWR0aCA8IDcwMDtcbiAgY29uc3QgYmFsbHMgPSBBcnJheS5pc0FycmF5KGdsb2JhbHMuYmFsbHMpID8gZ2xvYmFscy5iYWxscyA6IFtdO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYmFsbHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICBjb25zdCBiYWxsID0gYmFsbHNbaV07XG4gICAgaWYgKCFiYWxsIHx8IGJhbGwucHJvamVjdEluZGV4ID09PSB1bmRlZmluZWQpIGNvbnRpbnVlO1xuICAgIGNvbnN0IHByb2plY3QgPSBwcm9qZWN0c1tiYWxsLnByb2plY3RJbmRleF07XG4gICAgY29uc3QgbGFiZWxDb250ZW50ID0gcmVzb2x2ZVBvcnRmb2xpb0xhYmVsQ29udGVudChcbiAgICAgIHByb2plY3QsXG4gICAgICBiYWxsLnByb2plY3RUaXRsZUZ1bGwgfHwgYmFsbC5wcm9qZWN0VGl0bGUgfHwgJ1VudGl0bGVkIFByb2plY3QnXG4gICAgKTtcbiAgICBiYWxsLl9wb3J0Zm9saW9EcHIgPSBnbG9iYWxzLkRQUiB8fCAxO1xuICAgIGlmIChiYWxsLl9fcG9ydGZvbGlvQWNjZW50Q2lyY2xlKSBhcHBseVBvcnRmb2xpb0FjY2VudEJhbGxDb2xvcihiYWxsKTtcbiAgICBjb21wdXRlTGFiZWxGb3JCYWxsKGN0eCwgYmFsbCwgY29uZmlnLCBwcm9qZWN0LCBmb250RmFtaWx5LCBpc01vYmlsZSk7XG4gICAgYmFsbC5sYWJlbENvbG9yID0gZ2V0Q29udHJhc3RUZXh0KGJhbGwuY29sb3IpO1xuICAgIGJhbGwucHJvamVjdEV5ZWJyb3cgPSBsYWJlbENvbnRlbnQuZXllYnJvdztcbiAgICBiYWxsLnByb2plY3RUaXRsZSA9IGxhYmVsQ29udGVudC50aXRsZTtcbiAgICBiYWxsLnByb2plY3RUaXRsZUZ1bGwgPSBTdHJpbmcocHJvamVjdD8udGl0bGUgfHwgbGFiZWxDb250ZW50LnRpdGxlIHx8ICcnKS50cmltKCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2VlZFByb2plY3RCb2RpZXMoZ2xvYmFscykge1xuICBjbGVhckJhbGxzKCk7XG4gIF9zcGF3blNhbHQgPSAoRGF0ZS5ub3coKSAlIDEwMDAwKSAqIDAuMDAxO1xuXG4gIGNvbnN0IGNvbmZpZyA9IGdsb2JhbHMucG9ydGZvbGlvUGl0Q29uZmlnIHx8IHt9O1xuICBjb25zdCBwcm9qZWN0cyA9IEFycmF5LmlzQXJyYXkoZ2xvYmFscy5wb3J0Zm9saW9Qcm9qZWN0cykgPyBnbG9iYWxzLnBvcnRmb2xpb1Byb2plY3RzIDogW107XG4gIGNvbnN0IGN0eCA9IGdsb2JhbHMuY3R4O1xuICBjb25zdCBjYW52YXMgPSBnbG9iYWxzLmNhbnZhcztcbiAgaWYgKCFjdHggfHwgIWNhbnZhcyB8fCBwcm9qZWN0cy5sZW5ndGggPT09IDApIHJldHVybjtcblxuICBjb25zdCB3aWR0aCA9IGNhbnZhcy53aWR0aDtcbiAgY29uc3QgaGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcbiAgY29uc3QgZHByID0gZ2xvYmFscy5EUFIgfHwgMTtcbiAgY29uc3QgZm9udEZhbWlseSA9IGdldENvbXB1dGVkU3R5bGUoZG9jdW1lbnQuYm9keSkuZm9udEZhbWlseSB8fCAnSGVsdmV0aWNhIE5ldWUsIEFyaWFsLCBzYW5zLXNlcmlmJztcbiAgY29uc3QgaXNNb2JpbGUgPSB3aWR0aCA8IDcwMDtcblxuICBjb25zdCBmcmFtZUluc2V0ID0gZ2V0U2ltdWxhdGlvbkNvbGxpc2lvbkluc2V0UHgoZ2xvYmFscyk7XG4gIGNvbnN0IGlubmVyVyA9IE1hdGgubWF4KDEsIHdpZHRoIC0gMiAqIGZyYW1lSW5zZXQpO1xuICBjb25zdCBpbm5lckggPSBNYXRoLm1heCgxLCBoZWlnaHQgLSAyICogZnJhbWVJbnNldCk7XG4gIGNvbnN0IGlubmVyQXJlYSA9IGlubmVyVyAqIGlubmVySDtcbiAgY29uc3QgYXJlYU5vcm0gPSBNYXRoLnNxcnQoaW5uZXJBcmVhKTtcblxuICBjb25zdCBtaW5GcmFjID0gY2xhbXAodG9OdW1iZXIoY29uZmlnLmJvZGllcz8ubWluRGlhbWV0ZXJWaWV3cG9ydCwgMC4xNCksIDAuMDgsIDEpO1xuICBjb25zdCBtYXhGcmFjID0gY2xhbXAoXG4gICAgdG9OdW1iZXIoY29uZmlnLmJvZGllcz8ubWF4RGlhbWV0ZXJWaWV3cG9ydCwgMC4yMiksXG4gICAgbWluRnJhYyxcbiAgICAxXG4gICk7XG4gIGNvbnN0IHNpemVNdWwgPSBjbGFtcCh0b051bWJlcihjb25maWcuYm9kaWVzPy5kaWFtZXRlclNjYWxlLCAxLjIpLCAxLCAxLjgpO1xuXG4gIGxldCBtaW5EID0gYXJlYU5vcm0gKiBtaW5GcmFjICogc2l6ZU11bCAqIFBPUlRGT0xJT19CT0RZX0RJQU1FVEVSX0JPT1NUO1xuICBsZXQgbWF4RCA9IGFyZWFOb3JtICogbWF4RnJhYyAqIHNpemVNdWwgKiBQT1JURk9MSU9fQk9EWV9ESUFNRVRFUl9CT09TVDtcblxuICBjb25zdCB3YWxsUGFkZGluZyA9IE1hdGgubWluKGlubmVyVywgaW5uZXJIKSAqIGNsYW1wKHRvTnVtYmVyKGNvbmZpZy5ib2RpZXM/LndhbGxQYWRkaW5nVmlld3BvcnQsIDAuMDUpLCAwLjAyLCAwLjE0KTtcbiAgY29uc3QgbWF4RGlhbWV0ZXJGaXQgPSBNYXRoLm1heCgyNCAqIGRwciwgTWF0aC5taW4oaW5uZXJXLCBpbm5lckgpIC0gMiAqIHdhbGxQYWRkaW5nKTtcbiAgbWF4RCA9IE1hdGgubWluKG1heEQsIG1heERpYW1ldGVyRml0KTtcbiAgbWluRCA9IE1hdGgubWluKG1pbkQsIG1heEQpO1xuXG4gIGNvbnN0IGhlYWRlckNsZWFyYW5jZSA9IE1hdGgubWF4KFxuICAgIDE4ICogZHByLFxuICAgIHRvTnVtYmVyKGNvbmZpZy5sYXlvdXQ/LmhlYWRlclRvcFNwYWNpbmcsIDI0KSAqIGRwciAqIDEuNlxuICApO1xuICBjb25zdCB2eEJhc2UgPSAoaXNNb2JpbGUgPyA0MCA6IDY1KSAqIGRwcjtcbiAgY29uc3QgdnlCYXNlID0gKGlzTW9iaWxlID8gMTIwIDogMTgwKSAqIGRwcjtcblxuICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgcHJvamVjdHMubGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgY29uc3QgcHJvamVjdCA9IHByb2plY3RzW2luZGV4XTtcbiAgICBjb25zdCBzaXplVCA9IGhhc2hVbml0KGluZGV4ICsgMjkpO1xuICAgIGNvbnN0IGRpYW1ldGVyID0gbWluRCArIChtYXhEIC0gbWluRCkgKiBzaXplVDtcbiAgICBjb25zdCByYWRpdXMgPSBkaWFtZXRlciAqIDAuNTtcbiAgICBjb25zdCBpc0FjY2VudENpcmNsZSA9IGluZGV4ID09PSAwO1xuICAgIGNvbnN0IGZpbGwgPSBpc0FjY2VudENpcmNsZVxuICAgICAgPyBnZXRQb3J0Zm9saW9BY2NlbnRDaXJjbGVGaWxsKClcbiAgICAgIDogZ2V0UG9ydGZvbGlvUHJvamVjdFBhbGV0dGVDb2xvcihpbmRleCAtIDEsIHByb2plY3RzLmxlbmd0aCAtIDEpO1xuICAgIGNvbnN0IHNwYXduUG9pbnQgPSBnZXRQb3J0Zm9saW9TcGF3blBvaW50KFxuICAgICAgaW5kZXgsXG4gICAgICB3aWR0aCxcbiAgICAgIGhlaWdodCxcbiAgICAgIGZyYW1lSW5zZXQsXG4gICAgICB3YWxsUGFkZGluZyxcbiAgICAgIHJhZGl1cyxcbiAgICAgIGhlYWRlckNsZWFyYW5jZSxcbiAgICAgIGlzTW9iaWxlXG4gICAgKTtcbiAgICBjb25zdCB4ID0gc3Bhd25Qb2ludC54O1xuICAgIC8vIFN0YWdnZXIgZHJvcCBoZWlnaHRzOiBlYWNoIHBlYmJsZSBzdGFydHMgYXQgYSBkaWZmZXJlbnQgYWx0aXR1ZGVcbiAgICBjb25zdCBzdGFnZ2VySGVpZ2h0ID0gaGFzaFVuaXQoaW5kZXggKyA1MykgKiBoZWlnaHQgKiAwLjM7XG4gICAgY29uc3QgeSA9IHNwYXduUG9pbnQueSAtIHN0YWdnZXJIZWlnaHQ7XG5cbiAgICBjb25zdCBiYWxsID0gbmV3IEJhbGwoeCwgeSwgcmFkaXVzLCBmaWxsKTtcbiAgICBiYWxsLnByb2plY3RJbmRleCA9IGluZGV4O1xuICAgIC8vIFBvcnRmb2xpbyB2aXN1YWxzIHJlbmRlciBjdXN0b20gcGViYmxlIHNpbGhvdWV0dGVzLCBidXQgdGhlIHNpbXVsYXRpb24gYm9keSBzaG91bGQgcmVtYWluXG4gICAgLy8gY29uc2VydmF0aXZlIHNvIHRoZSB2aXNpYmxlIGNvbnRvdXIgbmV2ZXIgY2xpcHMgdGhyb3VnaCBuZWlnaGJvcnMgb3IgdGhlIHdhbGwuXG4gICAgYmFsbC5wb3J0Zm9saW9Cb2R5U2hhcGUgPSAnY2lyY2xlJztcbiAgICBiYWxsLl9fcG9ydGZvbGlvQWNjZW50Q2lyY2xlID0gaXNBY2NlbnRDaXJjbGU7XG4gICAgYmFsbC5fbm9TcXVhc2ggPSB0cnVlO1xuICAgIGJhbGwudGhldGEgPSAwO1xuICAgIGJhbGwucm90YXRpb25PZmZzZXQgPSBoYXNoVW5pdChpbmRleCArIDg5KSAqIE1hdGguUEkgKiAyO1xuICAgIGJhbGwub21lZ2EgPSAwO1xuICAgIGJhbGwuX3BvcnRmb2xpb0RwciA9IGRwcjtcbiAgICBzdG9yZVBvcnRmb2xpb1NlZWRNZXRyaWNzKGJhbGwsIHdpZHRoLCBoZWlnaHQsIHJhZGl1cyk7XG5cbiAgICBjb25zdCBsYWJlbENvbnRlbnQgPSByZXNvbHZlUG9ydGZvbGlvTGFiZWxDb250ZW50KHByb2plY3QsICdVbnRpdGxlZCBQcm9qZWN0Jyk7XG4gICAgY29tcHV0ZUxhYmVsRm9yQmFsbChjdHgsIGJhbGwsIGNvbmZpZywgcHJvamVjdCwgZm9udEZhbWlseSwgaXNNb2JpbGUpO1xuXG4gICAgYmFsbC5sYWJlbENvbG9yID0gZ2V0Q29udHJhc3RUZXh0KGZpbGwpO1xuICAgIGJhbGwucHJvamVjdEV5ZWJyb3cgPSBsYWJlbENvbnRlbnQuZXllYnJvdztcbiAgICBiYWxsLnByb2plY3RUaXRsZSA9IGxhYmVsQ29udGVudC50aXRsZTtcbiAgICBiYWxsLnByb2plY3RUaXRsZUZ1bGwgPSBTdHJpbmcocHJvamVjdC50aXRsZSB8fCBsYWJlbENvbnRlbnQudGl0bGUgfHwgJycpLnRyaW0oKTtcblxuICAgIC8vIEVhY2ggcGViYmxlIGdldHMgYSBkaXN0aW5jdCB0aHJvdyBhbmdsZSBhbmQgc3BlZWRcbiAgICBjb25zdCB0aHJvd0FuZ2xlID0gKGhhc2hVbml0KGluZGV4ICsgNzEpIC0gMC41KSAqIDEuMjtcbiAgICBjb25zdCB0aHJvd1NwZWVkID0gdnlCYXNlICogKDAuNCArIGhhc2hVbml0KGluZGV4ICsgNDEpICogMS4yKTtcbiAgICBjb25zdCBpbndhcmRCaWFzID0gKHdpZHRoICogMC41IC0geCkgKiAwLjE0O1xuICAgIGJhbGwudnggPSBpbndhcmRCaWFzICsgTWF0aC5zaW4odGhyb3dBbmdsZSkgKiB0aHJvd1NwZWVkICogMC43O1xuICAgIGJhbGwudnkgPSBNYXRoLmNvcyh0aHJvd0FuZ2xlKSAqIHRocm93U3BlZWQgKyB2eUJhc2UgKiAwLjM7XG4gICAgZ2xvYmFscy5iYWxscy5wdXNoKGJhbGwpO1xuICB9XG5cbiAgc3luY1BpdFBvcnRmb2xpb1JhZGl1c1N0YXRzRnJvbUJhbGxzKCk7XG59XG5cbmZ1bmN0aW9uIHJlbmRlclByb2plY3RCb2R5KGN0eCwgYmFsbCwgaXNIb3ZlcmVkKSB7XG4gIGlmICghYmFsbCB8fCBiYWxsLl9fcG9ydGZvbGlvSGlkZGVuKSByZXR1cm47XG5cbiAgY29uc3QgdGFyZ2V0U2NhbGUgPSBpc0hvdmVyZWQgPyBQT1JURk9MSU9fSE9WRVJfU0NBTEUgOiAxO1xuICBjb25zdCBjdXJyZW50U2NhbGUgPSBiYWxsLl9ob3ZlclNjYWxlID8/IDE7XG4gIGNvbnN0IHNwZWVkID0gdGFyZ2V0U2NhbGUgPiBjdXJyZW50U2NhbGUgPyBQT1JURk9MSU9fSE9WRVJfU1BFRURfSU4gOiBQT1JURk9MSU9fSE9WRVJfU1BFRURfT1VUO1xuICBjb25zdCBkdCA9IDEgLyA2MDtcbiAgYmFsbC5faG92ZXJTY2FsZSA9IGN1cnJlbnRTY2FsZSArICh0YXJnZXRTY2FsZSAtIGN1cnJlbnRTY2FsZSkgKiBNYXRoLm1pbigxLCBzcGVlZCAqIGR0KTtcblxuICBjb25zdCBmb2N1c0RpbW1lciA9IHRvTnVtYmVyKGJhbGwuX19wb3J0Zm9saW9EaW1BbHBoYSwgMSk7XG4gIGNvbnN0IHIgPSBiYWxsLnI7XG4gIGNvbnN0IGRyYXdSID0gciAqIFBPUlRGT0xJT19QRUJCTEVfUkVOREVSX1NDQUxFICogYmFsbC5faG92ZXJTY2FsZTtcbiAgY29uc3QgeCA9IGJhbGwueDtcbiAgY29uc3QgeSA9IGJhbGwueTtcbiAgY29uc3QgYWxwaGEgPSBjbGFtcChmb2N1c0RpbW1lciwgMCwgMSk7XG4gIGNvbnN0IHJvdCA9IGdldFBvcnRmb2xpb0JvZHlSb3RhdGlvblJhZChiYWxsKTtcblxuICBjdHguc2F2ZSgpO1xuICBjdHguZ2xvYmFsQWxwaGEgPSBhbHBoYTtcbiAgY3R4LnRyYW5zbGF0ZSh4LCB5KTtcbiAgY3R4LnJvdGF0ZShyb3QpO1xuICBjdHguZmlsbFN0eWxlID0gYmFsbC5jb2xvcjtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBhcHBlbmRQZWJibGVCb2R5UGF0aChjdHgsIGJhbGwsIGRyYXdSKTtcbiAgY3R4LmZpbGwoKTtcbiAgY3R4LnJlc3RvcmUoKTtcblxufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5pdGlhbGl6ZVBvcnRmb2xpb1BpdCgpIHtcbiAgY29uc3QgZ2xvYmFscyA9IGdldEdsb2JhbHMoKTtcblxuICAvLyBTUEEgZ2F0ZSB0cmFuc2l0aW9ucyBjYW4gbGVhdmUgdGhlIGNhbnZhcyBhdCBkZWZhdWx0IDMwMMOXMTUwIG9yIHN0YWxlXG4gIC8vIGhvbWUtcm91dGUgZGltZW5zaW9ucyBpZiByZXNpemUoKSBuby1vcGVkIChjb250YWluZXIgemVyby1zaXplZCBkdXJpbmdcbiAgLy8gdGhlIENTUyBvcGFjaXR5IHRyYW5zaXRpb24pLiAgRm9yY2UgYSByZXNpemUgYW5kIHJlYmluZCB0byB0aGUgbGl2ZSAjY1xuICAvLyBzbyBzZWVkUHJvamVjdEJvZGllcyByZWFkcyBjb3JyZWN0IGJ1ZmZlciBkaW1lbnNpb25zLlxuICB0cnkge1xuICAgIGRldGVjdE9wdGltYWxEUFIoKTtcbiAgICByZXNpemUoKTtcbiAgfSBjYXRjaCAoXykgeyAvKiBpZ25vcmUgKi8gfVxuXG4gIGNvbnN0IGNhbnZhcyA9IGdsb2JhbHMuY2FudmFzO1xuICBpZiAoY2FudmFzICYmIChjYW52YXMud2lkdGggPD0gMiB8fCBjYW52YXMuaGVpZ2h0IDw9IDIpKSB7XG4gICAgLy8gQnVmZmVyIHdhcyBuZXZlciBwcm9wZXJseSBzaXplZCDigJQgc2tpcCBzZWVkaW5nIHNvIHRoZSBmb2xsb3ctdXBcbiAgICAvLyBzZXR0bGVQb3J0Zm9saW9QcmVzZW50YXRpb24gcmVzaXplICsgcmUtc2VlZCBjYW4gcmVjb3Zlci5cbiAgICByZXR1cm47XG4gIH1cblxuICBzZWVkUHJvamVjdEJvZGllcyhnbG9iYWxzKTtcbn1cblxuLyoqXG4gKiBQb3J0Zm9saW8gcGl0IHVzZXMgdGhlIHNoYXJlZCBwaXQgaW50ZWdyYXRvcjsgZXh0cmEgZm9yY2VzIHN0YXkgZW1wdHkgc28gd2UgZG8gbm90XG4gKiBmaWdodCBnbG9iYWwgY29sbGlzaW9uL3dhbGwgdHVuaW5nLiBEcmFnIGJvdW5kcyArIGtpbmVtYXRpYyBoYW5kbGluZyBsaXZlIGluXG4gKiBwb3J0Zm9saW8gYGFwcC5qc2AgKyBgY2xhbXBCYWxsUG9zaXRpb25Ub1dhbGxJbnRlcmlvcmAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcHBseVBvcnRmb2xpb1BpdEZvcmNlcyhiYWxsLCBkdCkge1xuICB2b2lkIGJhbGw7XG4gIHZvaWQgZHQ7XG59XG5cbmZ1bmN0aW9uIHNob3VsZFN5bmNQb3J0Zm9saW9MYWJlbExheWVyKGdsb2JhbHMsIGJhbGxzKSB7XG4gIGlmICghZ2xvYmFscykgcmV0dXJuIGZhbHNlO1xuICBpZiAoZ2xvYmFscy5fX3BvcnRmb2xpb0ZvcmNlTGFiZWxTeW5jKSB7XG4gICAgZ2xvYmFscy5fX3BvcnRmb2xpb0ZvcmNlTGFiZWxTeW5jID0gZmFsc2U7XG4gICAgZ2xvYmFscy5fX3BvcnRmb2xpb0xhYmVsTGF5ZXJTaWduYXR1cmUgPSAnJztcbiAgfVxuICBjb25zdCBkcHIgPSBnbG9iYWxzLkRQUiB8fCAxO1xuICBjb25zdCBuZXh0U2lnbmF0dXJlID0gYmFsbHMubWFwKChiYWxsKSA9PiB7XG4gICAgaWYgKCFiYWxsKSByZXR1cm4gJ3gnO1xuICAgIHJldHVybiBbXG4gICAgICBiYWxsLnByb2plY3RJbmRleCA/PyAtMSxcbiAgICAgIGJhbGwuX19wb3J0Zm9saW9IaWRkZW4gPyAxIDogMCxcbiAgICAgIChiYWxsLnggLyBkcHIpLnRvRml4ZWQoMiksXG4gICAgICAoYmFsbC55IC8gZHByKS50b0ZpeGVkKDIpLFxuICAgICAgKGJhbGwuciAvIGRwcikudG9GaXhlZCgyKSxcbiAgICAgIGdldFJlYWRhYmxlTGFiZWxSb3RhdGlvbihiYWxsLnRoZXRhIHx8IDApLnRvRml4ZWQoMyksXG4gICAgICAoYmFsbC5fX3BvcnRmb2xpb0RpbUFscGhhID8/IDEpLnRvRml4ZWQoMyksXG4gICAgICBiYWxsLl9fcG9ydGZvbGlvU2VsZWN0ZWQgPyAxIDogMCxcbiAgICAgIGJhbGwubGFiZWxDb2xvciB8fCAnJyxcbiAgICAgIChiYWxsLl9ob3ZlclNjYWxlID8/IDEpLnRvRml4ZWQoMyksXG4gICAgXS5qb2luKCc6Jyk7XG4gIH0pLmpvaW4oJ3wnKTtcbiAgaWYgKGdsb2JhbHMuX19wb3J0Zm9saW9MYWJlbExheWVyU2lnbmF0dXJlID09PSBuZXh0U2lnbmF0dXJlKSByZXR1cm4gZmFsc2U7XG4gIGdsb2JhbHMuX19wb3J0Zm9saW9MYWJlbExheWVyU2lnbmF0dXJlID0gbmV4dFNpZ25hdHVyZTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJQb3J0Zm9saW9QaXQoY3R4KSB7XG4gIGNvbnN0IGdsb2JhbHMgPSBnZXRHbG9iYWxzKCk7XG4gIGNvbnN0IGJhbGxzID0gQXJyYXkuaXNBcnJheShnbG9iYWxzLmJhbGxzKSA/IGdsb2JhbHMuYmFsbHMgOiBbXTtcbiAgY29uc3QgaG92ZXJlZEluZGV4ID0gZ2xvYmFscy5fX3BvcnRmb2xpb0hvdmVyZWRJbmRleCA/PyAtMTtcbiAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IGJhbGxzLmxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgIGNvbnN0IGJhbGwgPSBiYWxsc1tpbmRleF07XG4gICAgcmVuZGVyUHJvamVjdEJvZHkoY3R4LCBiYWxsLCBiYWxsPy5wcm9qZWN0SW5kZXggPT09IGhvdmVyZWRJbmRleCk7XG4gIH1cbiAgaWYgKHNob3VsZFN5bmNQb3J0Zm9saW9MYWJlbExheWVyKGdsb2JhbHMsIGJhbGxzKSkge1xuICAgIGdsb2JhbHMucG9ydGZvbGlvU3luY0xhYmVsTGF5ZXI/LigpO1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVsRixNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztBQUMxRCxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLG9DQUFvQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO0FBQ2hILE1BQU0sQ0FBQyxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMs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QUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUN0RDs7QUFFQSxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDckYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3hELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQzdDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7QUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUc7QUFDaEIsQ0FBQyxDQUFDLENBQUM7QUFDSDs7QUFFQSxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQy9CLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7QUFDcEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUc7QUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDeEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkQsQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekYsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzNGOztBQUVBLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUMvQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0MsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JELENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RELENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDdkQsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQ3hELENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVTtBQUNuQjs7QUFFQSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPO0FBQy9FLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRWxCLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDeEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUk7QUFDeEUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO0FBQ2xDOztBQUVBLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUI7O0FBRUEsUUFBUSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2xILENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNwRCxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUM3RCxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM3QixDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUM7QUFDMUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDMUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztBQUN0RCxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQztBQUMxRSxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQztBQUMzRSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDakUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxD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QUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUN6RCxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUN6RCxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUN4RCxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUN4RCxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUN4RCxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUN2RCxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUNwRCxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztBQUNyRCxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUM7QUFDaEQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDO0FBQ2hELENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVuQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztBQUM5QixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNoRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUNyRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ3JELENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRztBQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0FBQzNDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQ3JCLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7QUFDckIsQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzdCOztBQUVBLEtBQUssQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUk7QUFDeEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDLGlDQUFpQztBQUMxRSxDQUFDOztBQUVELEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUk7QUFDdkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDLGdDQUFnQztBQUN6RSxDQUFDOztBQUVELFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvRCxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1RSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsdUJBQXVCLENBQUMsT0FBTztBQUNsRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLHFDQUFxQztBQUMzQyxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU07QUFDeEQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDO0FBQy9COztBQUVBLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNqRCxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDO0FBQy9DLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTztBQUM1QixDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU87QUFDNUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ1YsQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTTtBQUN6QixDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQzVELENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDNUQsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsU0FBUyxDQUFDO0FBQ2xDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMs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QUFNLENBQUMsQ0FBQztBQUN0RCxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO0FBQ3BFLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7QUFDN0MsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztBQUMvQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNGLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7QUFDNUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztBQUM1QyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDOztBQUV2RixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDakUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVwQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDdkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUM5QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ2IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDOUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQzs7QUFFNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFROztBQUV6QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVU7QUFDbkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFROztBQUV6RCxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDMUMsQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLE9BQU87QUFDbEMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUN2RSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM3QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVE7O0FBRW5DLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNoRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDMUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDMUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFSixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUMzRCxDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2xFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVkLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ3ZELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3ZELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFFBQVE7QUFDOUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDYixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUNiLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFSixDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO0FBQ25DLENBQUMsQ0FBQzs7QUFFRixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNwRCxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwRyxDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVO0FBQ3BELENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUM1RSxDQUFDLENBQUMsQ0FBQztBQUNIOztBQUVBLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvRSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6RixDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JDLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLGFBQWE7QUFDL0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3RCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FB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Q0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1RixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTTs7QUFFakQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUN0RyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRztBQUNyQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFakUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxF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QUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQzNDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRzs7QUFFN0MsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7QUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLDRCQUE0QixDQUFDO0FBQ3JDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2RSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLHNCQUFzQjtBQUM3QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQ1gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUNYLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDWixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVO0FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVc7QUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWU7QUFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzFCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztBQUMvRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdELENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYTs7QUFFMUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQztBQUM3QyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7QUFDMUYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUk7QUFDcEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ3RDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxjQUFjO0FBQ2pELENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1RCxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDOztBQUUxRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLDRCQUE0QixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsUUFBUSxDQUFDOztBQUV6RSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsT0FBTztBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxLQUFLO0FBQzFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRXBGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztBQUNuRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlELENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0FBQzVCLENBQUMsQ0FBQzs7QUFFRixDQUFDLENBQUMsb0NBQW9DLENBQUMsQ0FBQztBQUN4Qzs7QUFFQSxRQUFRLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDakQsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLE1BQU07O0FBRTdDLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNELENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMseUJBQXlCO0FBQ2pHLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDbkIsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDOztBQUUxRixDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzRCxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXO0FBQ3BFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQzs7QUFFL0MsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNaLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQ3pCLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyQixDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7QUFDakIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFL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