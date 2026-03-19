import { Ball } from '../physics/Ball.js';
import { getGlobals, clearBalls } from '../core/state.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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

function getPaletteColor(index) {
  const globals = getGlobals();
  const colors = Array.isArray(globals.currentColors) ? globals.currentColors : [];
  if (!colors.length) return '#1b7f6e';
  return colors[index % colors.length] || colors[0];
}

function hashUnit(seed) {
  const value = Math.sin((seed + 1) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function buildWrappedTitle(ctx, title, bounds) {
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

function seedProjectBodies(globals) {
  clearBalls();

  const config = globals.portfolioPitConfig || {};
  const projects = Array.isArray(globals.portfolioProjects) ? globals.portfolioProjects : [];
  const ctx = globals.ctx;
  const canvas = globals.canvas;
  if (!ctx || !canvas || projects.length === 0) return;

  const width = canvas.width;
  const height = canvas.height;
  const fontFamily = getComputedStyle(document.body).fontFamily || 'Helvetica Neue, Arial, sans-serif';
  const isMobile = width < 700;
  const mobileDiameterMul = isMobile ? 0.82 : 1;
  const minDiameter = Math.min(width, height) * clamp(toNumber(config.bodies?.minDiameterViewport, 0.2), 0.12, 0.42) * mobileDiameterMul;
  const maxDiameter = Math.min(width, height) * clamp(toNumber(config.bodies?.maxDiameterViewport, 0.26), minDiameter / Math.min(width, height), 0.5) * mobileDiameterMul;
  const blockWidthMultiplier = clamp(
    toNumber(config.bodies?.blockWidthMultiplier, 1.22) * (isMobile ? 0.92 : 1),
    1,
    1.55
  );
  const blockCornerRadius = clamp(toNumber(config.bodies?.blockCornerRadius, 48), 16, 96) * (globals.DPR || 1);
  const spawnInset = Math.min(width, height) * clamp(toNumber(config.layout?.spawnInsetViewport, 0.12), 0.06, 0.24);
  const columns = isMobile ? 2 : Math.min(3, Math.max(2, Math.ceil(Math.sqrt(projects.length))));
  const rows = Math.ceil(projects.length / columns);
  const usableWidth = width - (spawnInset * 2);
  const usableHeight = height - (spawnInset * 2);
  const cellWidth = usableWidth / columns;
  const cellHeight = usableHeight / rows;

  for (let index = 0; index < projects.length; index += 1) {
    const project = projects[index];
    const column = index % columns;
    const row = Math.floor(index / columns);
    const progress = projects.length <= 1 ? 0.5 : index / (projects.length - 1);
    const diameter = minDiameter + ((maxDiameter - minDiameter) * (0.35 + (0.65 * (1 - Math.abs(0.5 - progress)))));
    const radius = diameter * 0.5;
    const offsetX = ((hashUnit(index) - 0.5) * cellWidth * (isMobile ? 0.08 : 0.16))
      + ((column % 2 === 0 ? -1 : 1) * cellWidth * (isMobile ? 0.03 : 0.05));
    const offsetY = ((hashUnit(index + 17) - 0.5) * cellHeight * (isMobile ? 0.07 : 0.14))
      - (cellHeight * (isMobile ? 0.06 : 0.08));
    const anchorX = spawnInset + (cellWidth * (column + 0.5)) + offsetX;
    const anchorY = spawnInset + (cellHeight * (row + 0.5)) + offsetY;
    const fill = getPaletteColor(index);
    const ball = new Ball(
      anchorX + ((hashUnit(index + 31) - 0.5) * cellWidth * 0.12),
      anchorY + ((hashUnit(index + 53) - 0.5) * cellHeight * 0.12),
      radius,
      fill
    );
    const shape = index % 2 === 0 ? 'circle' : 'block';
    const insetRatio = clamp(toNumber(config.labeling?.innerPaddingRatio, 0.19), 0.08, 0.28);
    const visualWidth = shape === 'block' ? diameter * blockWidthMultiplier : diameter;
    const textBounds = {
      width: visualWidth * (1 - (insetRatio * 2)),
      height: diameter * (1 - (insetRatio * 2)),
      fontMin: clamp(toNumber(config.labeling?.fontMinPx, 16), 10, 42) * (globals.DPR || 1) * (isMobile ? 0.92 : 1),
      fontMax: clamp(toNumber(config.labeling?.fontMaxPx, 34), 14, 72) * (globals.DPR || 1) * (isMobile ? 0.84 : 1),
      lineHeight: clamp(toNumber(config.labeling?.lineHeight, 0.95), 0.85, 1.2),
      fontFamily,
      maxLines: isMobile ? 5 : 4,
    };
    const label = buildWrappedTitle(ctx, project.title, textBounds);

    ball.projectIndex = index;
    ball.shape = shape;
    ball.anchorX = clamp(anchorX, spawnInset + radius, width - spawnInset - radius);
    ball.anchorY = clamp(anchorY, spawnInset + radius, height - spawnInset - radius);
    ball.visualWidth = visualWidth;
    ball.visualHeight = diameter;
    ball.cornerRadius = blockCornerRadius;
    ball.label = label;
    ball.labelColor = getContrastText(fill);
    ball.rotationOffset = shape === 'block'
      ? ((Math.random() - 0.5) * clamp(toNumber(config.labeling?.blockRotationRangeDeg, 6), 0, 14) * (isMobile ? 0.25 : 0.5)) * (Math.PI / 180)
      : 0;
    ball._noSquash = true;
    ball.vx = (hashUnit(index + 71) - 0.5) * 34;
    ball.vy = (hashUnit(index + 97) - 0.5) * 18;
    ball.omega = 0;
    globals.balls.push(ball);
  }
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const halfWidth = width * 0.5;
  const halfHeight = height * 0.5;
  const left = x - halfWidth;
  const top = y - halfHeight;
  const right = x + halfWidth;
  const bottom = y + halfHeight;
  const corner = Math.min(radius, halfWidth, halfHeight);

  ctx.beginPath();
  ctx.moveTo(left + corner, top);
  ctx.lineTo(right - corner, top);
  ctx.quadraticCurveTo(right, top, right, top + corner);
  ctx.lineTo(right, bottom - corner);
  ctx.quadraticCurveTo(right, bottom, right - corner, bottom);
  ctx.lineTo(left + corner, bottom);
  ctx.quadraticCurveTo(left, bottom, left, bottom - corner);
  ctx.lineTo(left, top + corner);
  ctx.quadraticCurveTo(left, top, left + corner, top);
  ctx.closePath();
}

function renderProjectBody(ctx, ball) {
  if (!ball || ball.__portfolioHidden) return;

  const focusDimmer = toNumber(ball.__portfolioDimAlpha, 1);
  const diameter = ball.r * 2;
  const width = ball.shape === 'block' ? ball.visualWidth : diameter;
  const height = diameter;

  ctx.save();
  ctx.globalAlpha = clamp(focusDimmer, 0, 1);
  ctx.translate(ball.x, ball.y);
  ctx.rotate((ball.theta || 0) + (ball.rotationOffset || 0));
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  if (ball.shape === 'block') {
    drawRoundedRect(ctx, 0, height * 0.46, width * 0.78, height * 0.22, height * 0.11);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(0, height * 0.46, ball.r * 0.76, ball.r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = ball.color;
  if (ball.shape === 'block') {
    drawRoundedRect(ctx, 0, 0, width, height, ball.cornerRadius || (height * 0.26));
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (ball.__portfolioFocused) {
    ctx.lineWidth = Math.max(3, ball.r * 0.045);
    ctx.strokeStyle = ball.labelColor || '#ffffff';
    if (ball.shape === 'block') {
      drawRoundedRect(ctx, 0, 0, width + (ctx.lineWidth * 1.6), height + (ctx.lineWidth * 1.6), (ball.cornerRadius || (height * 0.26)) + ctx.lineWidth);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, ball.r + ctx.lineWidth, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.fillStyle = ball.labelColor || '#ffffff';
  ctx.font = `600 ${ball.label?.fontSize || 20}px ${getComputedStyle(document.body).fontFamily || 'Helvetica Neue, Arial, sans-serif'}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = Array.isArray(ball.label?.lines) ? ball.label.lines : [ball.projectTitle || 'Project'];
  const lineHeight = ball.label?.lineHeight || 24;
  const offsetY = -((lines.length - 1) * lineHeight * 0.5);
  for (let index = 0; index < lines.length; index += 1) {
    ctx.fillText(lines[index], 0, offsetY + (index * lineHeight));
  }
  ctx.restore();
}

export function initializePortfolioPit() {
  const globals = getGlobals();
  seedProjectBodies(globals);
}

export function applyPortfolioPitForces(ball, dt) {
  if (!ball || ball.__portfolioHidden || ball.isPointerLocked || ball.__portfolioSelected) return;

  const globals = getGlobals();
  const canvas = globals.canvas;
  if (!canvas) return;

  const springStrength = clamp(toNumber(globals.portfolioPitConfig?.motion?.settleStrength, 2.4), 0.8, 6);
  const dampingStrength = clamp(toNumber(globals.portfolioPitConfig?.motion?.settleDamping, 1.6), 0.4, 3.5);
  const anchorLift = canvas.height * clamp(toNumber(globals.portfolioPitConfig?.layout?.anchorLiftViewport, 0.055), 0, 0.14);
  const targetX = Number.isFinite(ball.anchorX) ? ball.anchorX : ball.x;
  const targetY = Number.isFinite(ball.anchorY) ? ball.anchorY - anchorLift : ball.y;
  const dx = targetX - ball.x;
  const dy = targetY - ball.y;
  const massScale = Math.max(0.5, ball.m / globals.MASS_BASELINE_KG);

  ball.vx += ((dx * springStrength) / massScale) * dt;
  ball.vy += ((dy * springStrength) / massScale) * dt;

  const drag = Math.max(0, 1 - (dampingStrength * dt * 0.22));
  ball.vx *= drag;
  ball.vy *= Math.max(0.72, 1 - (dampingStrength * dt * 0.12));

  if ((ball.isGrounded || ball.hasSupport) && dy < -6) {
    ball.vy -= 18 * dt;
  }
}

export function renderPortfolioPit(ctx) {
  const globals = getGlobals();
  const balls = Array.isArray(globals.balls) ? globals.balls : [];
  for (let index = 0; index < balls.length; index += 1) {
    renderProjectBody(ctx, balls[index]);
  }
}
