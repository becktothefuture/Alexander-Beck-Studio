// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         PORTFOLIO PIT MODE                                   ║
// ║   Same pit physics as home (circle colliders); one large ball per project   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { Ball } from '../physics/Ball.js';
import { getGlobals, clearBalls, syncPitPortfolioRadiusStatsFromBalls } from '../core/state.js';
import { getPortfolioProjectPaletteColor } from '../visual/colors.js';
import { resize, detectOptimalDPR } from '../rendering/renderer.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Defaults ≈ previous hard-coded rim; rimScale > 1 reads slightly larger than small UI pills. */
const PIT_CHROME_DEFAULTS = {
  rimScale: 1.25,
  lightPeakLight: 0.53,
  lightPeakDark: 0.41,
  shadePeakLight: 0.13,
  shadePeakDark: 0.22,
  arcSpan: 1.12,
};

function getPitChrome(globals) {
  const raw = globals?.portfolioPitConfig?.pitChrome;
  const out = { ...PIT_CHROME_DEFAULTS };
  if (!raw || typeof raw !== 'object') return out;
  for (const key of Object.keys(PIT_CHROME_DEFAULTS)) {
    const n = Number(raw[key]);
    if (Number.isFinite(n)) out[key] = n;
  }
  out.rimScale = clamp(out.rimScale, 0.65, 2.5);
  out.lightPeakLight = clamp(out.lightPeakLight, 0.05, 0.95);
  out.lightPeakDark = clamp(out.lightPeakDark, 0.05, 0.95);
  out.shadePeakLight = clamp(out.shadePeakLight, 0, 0.55);
  out.shadePeakDark = clamp(out.shadePeakDark, 0, 0.55);
  out.arcSpan = clamp(out.arcSpan, 0.55, 2.2);
  return out;
}

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

export function buildWrappedTitle(ctx, title, bounds) {
  const safeTitle = String(title || '').trim() || 'Untitled Project';
  const words = safeTitle
    .replace(/\s*([+&/])\s*/g, ' $1 ')
    .split(/\s+/)
    .filter(Boolean);
  const maxWidth = Math.max(80, bounds.width);
  const maxHeight = Math.max(80, bounds.height);
  const maxLines = Math.max(2, Math.min(bounds.maxLines || 5, Math.ceil(words.length / 2)));
  const fontMax = Math.round(bounds.fontMax);
  const fontMin = Math.round(bounds.fontMin);

  for (let fontSize = fontMax; fontSize >= fontMin; fontSize -= 1) {
    ctx.font = `600 ${fontSize}px ${bounds.fontFamily}`;
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
  ctx.font = `600 ${fallbackFontSize}px ${bounds.fontFamily}`;
  return {
    fontSize: fallbackFontSize,
    lineHeight: fallbackFontSize * bounds.lineHeight,
    lines: words.slice(0, maxLines).reduce((acc, word) => {
      if (!acc.length) return [word];
      const current = acc[acc.length - 1];
      const next = `${current} ${word}`;
      if (ctx.measureText(next).width <= maxWidth || acc.length >= maxLines) {
        acc[acc.length - 1] = next;
      } else {
        acc.push(word);
      }
      return acc;
    }, []),
  };
}

function computeLabelForBall(ctx, ball, config, projectLabel, fontFamily, isMobile) {
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
  const textBounds = {
    width: diameter * (1 - (insetRatio * 2)),
    height: diameter * (1 - (insetRatio * 2)),
    fontMin: Math.max(10, labelFontPx * 0.55),
    fontMax: labelFontPx,
    lineHeight: clamp(toNumber(config.labeling?.lineHeight, 0.94), 0.85, 1.2),
    fontFamily,
    maxLines: isMobile ? 4 : 4,
  };
  ball.label = buildWrappedTitle(ctx, projectLabel, textBounds);
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
    const projectLabel = String(
      project?.displayTitle || project?.title || ball.projectTitle || 'Untitled Project'
    ).trim();
    ball._portfolioDpr = globals.DPR || 1;
    computeLabelForBall(ctx, ball, config, projectLabel, fontFamily, isMobile);
    ball.labelColor = getContrastText(ball.color);
    ball.projectTitle = projectLabel;
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
  const mobileDiameterMul = isMobile ? 0.82 : 1;

  const minFrac = clamp(toNumber(config.bodies?.minDiameterViewport, 0.22), 0.14, 0.45);
  const maxFrac = clamp(
    toNumber(config.bodies?.maxDiameterViewport, 0.32),
    minFrac,
    0.52
  ) * mobileDiameterMul;
  const sizeMul = clamp(toNumber(config.bodies?.diameterScale, 1.2), 1, 1.6);
  const minD = Math.min(width, height) * minFrac * mobileDiameterMul * sizeMul;
  const maxD = Math.min(width, height) * maxFrac * sizeMul;

  const frameBorderWidth = Number.isFinite(globals.frameBorderWidth)
    ? globals.frameBorderWidth
    : (globals.wallThickness || 20);
  const frameInset = frameBorderWidth * dpr;
  const wallPadding = Math.min(width, height) * clamp(toNumber(config.bodies?.wallPaddingViewport, 0.05), 0.02, 0.14);

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
    const fill = getPortfolioProjectPaletteColor(index, projects.length);

    const x = spawnBandMin + (hashUnit(index + 31) * (spawnBandMax - spawnBandMin));
    const y = spawnYTop + (hashUnit(index + 53) * (spawnYBottom - spawnYTop)) - (index * (spawnHeight / Math.max(6, projects.length + 2)));

    const ball = new Ball(x, y, radius, fill);
    ball.projectIndex = index;
    ball._noSquash = true;
    ball.omega = 0;
    ball.theta = 0;
    ball.rotationOffset = 0;
    ball._portfolioDpr = dpr;

    const projectLabel = String(project.displayTitle || project.title || 'Untitled Project').trim();
    computeLabelForBall(ctx, ball, config, projectLabel, fontFamily, isMobile);

    ball.labelColor = getContrastText(fill);
    ball.projectTitle = projectLabel;
    ball.projectTitleFull = String(project.title || projectLabel || '').trim();

    ball.vx = (hashUnit(index + 71) - 0.5) * vxBase;
    ball.vy = (hashUnit(index + 97) * vyBase) + vyBase;
    globals.balls.push(ball);
  }

  syncPitPortfolioRadiusStatsFromBalls();
}

/**
 * Inner arc stroke with opacity feathered at both ends (sin envelope) so tips don’t
 * “chop” like a hard line cap. Dense segments + round caps limit visible stepping;
 * optional second pass at lower alpha softens anti-aliasing without a gradient fill.
 */
function strokeArcRimFeathered(ctx, ir, startAngle, endAngle, lineWidth, peakAlpha, rgb) {
  const span = endAngle - startAngle;
  const segs = Math.round(clamp(ir * 0.084, 32, 46));
  const rr = rgb[0];
  const gg = rgb[1];
  const bb = rgb[2];
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const drawPass = (lw, peak) => {
    ctx.lineWidth = lw;
    for (let i = 0; i < segs; i += 1) {
      const t0 = i / segs;
      const t1 = (i + 1) / segs;
      const w = (Math.sin(Math.PI * t0) + Math.sin(Math.PI * t1)) * 0.5;
      const a = peak * w;
      if (a < 0.01) continue;
      const a0 = startAngle + t0 * span;
      const a1 = startAngle + t1 * span;
      ctx.strokeStyle = `rgba(${rr},${gg},${bb},${a})`;
      ctx.beginPath();
      ctx.arc(0, 0, ir, a0, a1);
      ctx.stroke();
    }
  };

  drawPass(lineWidth * 1.45, peakAlpha * 0.22);
  drawPass(lineWidth, peakAlpha);
}

/**
 * Inset rim in **screen space** (never coupled to ball.theta): same idea as
 * `--ui-chrome-button-edge` — highlight toward upper-left (studio light), shade toward
 * lower-right. Arcs sit with their **outer** stroke extent at the ball radius (not
 * visibly inset). Caller must `translate(cx, cy)` first; must not apply ball rotation.
 */
function portfolioBallInsetChromeEdge(ctx, r) {
  const globals = getGlobals();
  const chrome = getPitChrome(globals);
  const isDark = typeof document !== 'undefined'
    && document.documentElement?.classList?.contains('dark-mode');
  const line = Math.max(1.1, r * 0.0032) * chrome.rimScale;
  // Widest pass uses line * 1.45; center path so outer stroke edge meets r.
  const rimR = r - (line * 1.45) * 0.5;
  const span = chrome.arcSpan;
  const peakLight = isDark ? chrome.lightPeakDark : chrome.lightPeakLight;
  const peakShade = isDark ? chrome.shadePeakDark : chrome.shadePeakLight;

  ctx.save();
  try {
    ctx.imageSmoothingEnabled = true;
  } catch (_) { /* no-op */ }

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  const shadeMid = Math.PI / 4;
  strokeArcRimFeathered(ctx, rimR, shadeMid - span, shadeMid + span, line, peakShade, [0, 0, 0]);

  const lightMid = (-Math.PI * 3) / 4;
  strokeArcRimFeathered(ctx, rimR, lightMid - span, lightMid + span, line, peakLight, [255, 255, 255]);

  ctx.restore();
}

function renderProjectBody(ctx, ball) {
  if (!ball || ball.__portfolioHidden) return;

  const focusDimmer = toNumber(ball.__portfolioDimAlpha, 1);
  const r = ball.r;
  const x = ball.x;
  const y = ball.y;
  const alpha = clamp(focusDimmer, 0, 1);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ball.color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  portfolioBallInsetChromeEdge(ctx, r);
  ctx.restore();

  if (ball.__portfolioFocused) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = Math.max(2, r * 0.04);
    ctx.strokeStyle = ball.labelColor || '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r - 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
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
