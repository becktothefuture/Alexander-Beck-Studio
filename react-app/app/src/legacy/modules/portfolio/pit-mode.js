// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         PORTFOLIO PIT MODE                                   ║
// ║   Pit solver + portfolio narrow-phase SAT (circles + Lamé squircles).         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { Ball } from '../physics/Ball.js';
import { getGlobals, clearBalls, syncPitPortfolioRadiusStatsFromBalls } from '../core/state.js';
import { getPortfolioProjectPaletteColor } from '../visual/colors.js';
import { resize, detectOptimalDPR } from '../rendering/renderer.js';
import {
  appendPortfolioBodyPath,
  pickPortfolioBodyShape,
} from '../physics/portfolio-body-geometry.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Extra scale vs authored fractions (tuned after user feedback). */
const PORTFOLIO_BODY_DIAMETER_BOOST = 1.6;

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

function hashUnit(seed) {
  const value = Math.sin((seed + 1) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function getPortfolioBodyRotationRad(ball) {
  return (ball.theta || 0) + (ball.rotationOffset || 0);
}

const PORTFOLIO_RIM_LIGHT_X = 0;
const PORTFOLIO_RIM_LIGHT_Y = -0.82;
const PORTFOLIO_RIM_WIDTH_MIN_PX = 3;
const PORTFOLIO_RIM_WIDTH_MAX_PX = 6.5;
const PORTFOLIO_RIM_LIGHT_STR = 0.46;
const PORTFOLIO_RIM_SHADOW_STR = 0.42;
const PORTFOLIO_RIM_LIGHT_ALPHA = 0.52;
const PORTFOLIO_RIM_SHADOW_ALPHA = 0.34;
const PORTFOLIO_RIM_FADE_START = 0.2;
const PORTFOLIO_RIM_FADE_END = 0.76;
const PORTFOLIO_RIM_INSET = 0.64;

function drawPortfolioBodyRim(ctx, x, y, r, color, drawPath, rotationRad) {
  if (typeof drawPath !== 'function') return;

  const rgb = hexToRgb(color);
  const light = `${Math.min(255, Math.round(rgb.r + (255 - rgb.r) * PORTFOLIO_RIM_LIGHT_STR))},${Math.min(255, Math.round(rgb.g + (255 - rgb.g) * PORTFOLIO_RIM_LIGHT_STR))},${Math.min(255, Math.round(rgb.b + (255 - rgb.b) * PORTFOLIO_RIM_LIGHT_STR))}`;
  const shadow = `${Math.max(0, Math.round(rgb.r * (1 - PORTFOLIO_RIM_SHADOW_STR)))},${Math.max(0, Math.round(rgb.g * (1 - PORTFOLIO_RIM_SHADOW_STR)))},${Math.max(0, Math.round(rgb.b * (1 - PORTFOLIO_RIM_SHADOW_STR)))}`;
  const mid = `${rgb.r},${rgb.g},${rgb.b}`;
  const lineWidth = clamp(r * 0.022, PORTFOLIO_RIM_WIDTH_MIN_PX, PORTFOLIO_RIM_WIDTH_MAX_PX);
  const strokeRadius = Math.max(1, r - (lineWidth * PORTFOLIO_RIM_INSET));
  const grad = ctx.createLinearGradient(
    x + PORTFOLIO_RIM_LIGHT_X * r, y + PORTFOLIO_RIM_LIGHT_Y * r,
    x - PORTFOLIO_RIM_LIGHT_X * r, y - PORTFOLIO_RIM_LIGHT_Y * r
  );

  grad.addColorStop(0, `rgba(${light},${PORTFOLIO_RIM_LIGHT_ALPHA})`);
  grad.addColorStop(PORTFOLIO_RIM_FADE_START, `rgba(${mid},0)`);
  grad.addColorStop(PORTFOLIO_RIM_FADE_END, `rgba(${mid},0)`);
  grad.addColorStop(1, `rgba(${shadow},${PORTFOLIO_RIM_SHADOW_ALPHA})`);

  ctx.save();
  ctx.translate(x, y);
  if (Number.isFinite(rotationRad) && rotationRad !== 0) ctx.rotate(rotationRad);
  ctx.beginPath();
  drawPath(ctx, strokeRadius);
  ctx.clip();
  ctx.strokeStyle = grad;
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
  ) * dpr;
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

  const frameBorderWidth = Number.isFinite(globals.frameBorderWidth)
    ? globals.frameBorderWidth
    : (globals.wallThickness || 20);
  const frameInset = frameBorderWidth * dpr;
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

  const spawnInset = Math.min(width, height) * clamp(toNumber(config.layout?.spawnInsetViewport, 0.1), 0.05, 0.22);
  const maxRSpawn = maxD * 0.5;
  let spawnXLeft = frameInset + wallPadding + maxRSpawn;
  let spawnXRight = width - frameInset - wallPadding - maxRSpawn;
  if (spawnXRight <= spawnXLeft + 8) {
    spawnXLeft = Math.max(frameInset + 4, maxRSpawn);
    spawnXRight = Math.min(width - frameInset - 4, width - maxRSpawn);
  }
  const usableW = Math.max(maxD, spawnXRight - spawnXLeft);
  const bandRatio = clamp(toNumber(config.layout?.spawnBandWidthRatio, isMobile ? 0.88 : 0.76), 0.4, 0.95);
  const spawnBandWidth = Math.max(maxD, usableW * bandRatio);
  const spawnCenterX = width * 0.5;
  let spawnBandMin = clamp(spawnCenterX - spawnBandWidth * 0.5, spawnXLeft, spawnXRight - maxD);
  let spawnBandMax = clamp(spawnCenterX + spawnBandWidth * 0.5, spawnBandMin + maxD, spawnXRight);

  const spawnHeight = height * clamp(toNumber(config.layout?.spawnHeightViewport, 0.62), 0.45, 0.78);
  const spawnYTop = -spawnHeight;
  const spawnYBottom = Math.min(0, height * 0.02);
  const vxBase = (isMobile ? 90 : 130) * dpr;
  const vyBase = (isMobile ? 42 : 52) * dpr;

  for (let index = 0; index < projects.length; index += 1) {
    const project = projects[index];
    const t = projects.length <= 1 ? 0.5 : index / (projects.length - 1);
    const diameter = minD + ((maxD - minD) * (0.25 + (0.75 * (1 - Math.abs(0.5 - t)))));
    const radius = diameter * 0.5;
    const shape = pickPortfolioBodyShape(index);
    const isAccentCircle = shape === 'circle' && index === 0;
    const fill = isAccentCircle
      ? getPortfolioAccentCircleFill()
      : getPortfolioProjectPaletteColor(index, projects.length);

    const x = spawnBandMin + (hashUnit(index + 31) * (spawnBandMax - spawnBandMin));
    const y = spawnYTop + (hashUnit(index + 53) * (spawnYBottom - spawnYTop)) - (index * (spawnHeight / Math.max(6, projects.length + 2)));

    const ball = new Ball(x, y, radius, fill);
    ball.projectIndex = index;
    ball.portfolioBodyShape = shape;
    ball.__portfolioAccentCircle = isAccentCircle;
    ball._noSquash = true;
    ball.theta = hashUnit(index + 11) * Math.PI * 2;
    ball.rotationOffset = 0;
    ball.omega = (hashUnit(index + 13) - 0.5) * 6;
    ball._portfolioDpr = dpr;
    storePortfolioSeedMetrics(ball, width, height, radius);

    const labelContent = resolvePortfolioLabelContent(project, 'Untitled Project');
    computeLabelForBall(ctx, ball, config, project, fontFamily, isMobile);

    ball.labelColor = getContrastText(fill);
    ball.projectEyebrow = labelContent.eyebrow;
    ball.projectTitle = labelContent.title;
    ball.projectTitleFull = String(project.title || labelContent.title || '').trim();

    ball.vx = (hashUnit(index + 71) - 0.5) * vxBase;
    ball.vy = (hashUnit(index + 97) * vyBase) + vyBase;
    globals.balls.push(ball);
  }

  syncPitPortfolioRadiusStatsFromBalls();
}

function renderProjectBody(ctx, ball) {
  if (!ball || ball.__portfolioHidden) return;

  const globals = getGlobals();
  const pitConfig = globals.portfolioPitConfig || {};
  const shape = ball.portfolioBodyShape || 'circle';
  const focusDimmer = toNumber(ball.__portfolioDimAlpha, 1);
  const r = ball.r;
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
  appendPortfolioBodyPath(ctx, shape, r, pitConfig);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = alpha;
  drawPortfolioBodyRim(
    ctx,
    x,
    y,
    r,
    ball.color,
    (pathCtx, strokeR) => {
      pathCtx.beginPath();
      appendPortfolioBodyPath(pathCtx, shape, strokeR, pitConfig);
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
}

export function renderPortfolioPit(ctx) {
  const globals = getGlobals();
  const balls = Array.isArray(globals.balls) ? globals.balls : [];
  for (let index = 0; index < balls.length; index += 1) {
    renderProjectBody(ctx, balls[index]);
  }
  globals.portfolioSyncLabelLayer?.();
}
