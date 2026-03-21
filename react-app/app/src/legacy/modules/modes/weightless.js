// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            WEIGHTLESS MODE                                   ║
// ║     Grid-built geometric formations that preserve the central lockup         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { spawnBall } from '../physics/spawn.js';
import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { applyExpertiseLegendColors } from '../ui/legend-colors.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const WEIGHTLESS_PALETTE = {
  light: ['#91887b', '#5f564a', '#f3ede1', '#149a72', '#121212', '#3e6ff2', '#d6a21d', '#eb5b2a'],
  dark: ['#a79d91', '#706659', '#f6efe3', '#31b78c', '#e0d8cb', '#5f86ff', '#e0b543', '#ff7442']
};

const WEIGHTLESS_DISTRIBUTION = [
  { label: 'Product Systems', colorIndex: 0, weight: 14 },
  { label: 'Applied AI', colorIndex: 2, weight: 14 },
  { label: 'Interaction Design', colorIndex: 4, weight: 14 },
  { label: 'Creative Technology', colorIndex: 3, weight: 14 },
  { label: 'Experience Strategy', colorIndex: 5, weight: 14 },
  { label: 'Art Direction', colorIndex: 6, weight: 14 },
  { label: 'Prototyping', colorIndex: 7, weight: 16 }
];

const SHAPE_COLOR_MAP = {
  ring: {
    label: 'Creative Technology',
    fallbackPaletteIndex: 3
  },
  pyramid: {
    label: 'Prototyping',
    fallbackPaletteIndex: 7
  },
  frame: {
    label: 'Art Direction',
    fallbackPaletteIndex: 6
  },
  systemsMini: {
    label: 'Product Systems',
    fallbackPaletteIndex: 0
  },
  appliedMini: {
    label: 'Applied AI',
    fallbackPaletteIndex: 2
  },
  interactionMini: {
    label: 'Interaction Design',
    fallbackPaletteIndex: 4
  }
};

function normalizeLabel(value) {
  return String(value || '').trim().toLowerCase();
}

function resolveShapeColor(globals, shapeName) {
  const colors = Array.isArray(globals.currentColors) ? globals.currentColors : [];
  const distribution = Array.isArray(globals.colorDistribution) ? globals.colorDistribution : [];
  const group = SHAPE_COLOR_MAP[shapeName];
  const wantedLabel = normalizeLabel(group?.label);
  for (let i = 0; i < distribution.length; i++) {
    const row = distribution[i];
    if (normalizeLabel(row?.label) !== wantedLabel) continue;
    const paletteIdx = Math.max(0, Math.min(7, Number(row?.colorIndex) || 0));
    return {
      color: colors[paletteIdx] || colors[0] || '#ffffff',
      distributionIndex: i
    };
  }
  const fallbackPaletteIdx = Math.max(0, Math.min(7, Number(group?.fallbackPaletteIndex) || 0));
  return {
    color: colors[fallbackPaletteIdx] || colors[0] || '#ffffff',
    distributionIndex: 0
  };
}

function syncWeightlessPalette(globals) {
  const palette = (globals.isDarkMode ? WEIGHTLESS_PALETTE.dark : WEIGHTLESS_PALETTE.light).slice();
  globals.currentColors = palette;
  globals.colorDistribution = WEIGHTLESS_DISTRIBUTION.map((row) => ({ ...row }));

  const dist = globals.colorDistribution;
  const balls = Array.isArray(globals.balls) ? globals.balls : [];
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    if (!ball?._preserveColor) continue;
    const row = dist[ball.distributionIndex];
    const colorIndex = Math.max(0, Math.min(7, Number(row?.colorIndex) || 0));
    ball.color = palette[colorIndex] || palette[0] || '#ffffff';
  }

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    for (let i = 0; i < 8; i++) {
      root.style.setProperty(`--ball-${i + 1}`, palette[i] || '#ffffff');
    }
  }

  applyExpertiseLegendColors();
}

function ensureWeightlessPaletteSync() {
  if (typeof window === 'undefined') return;
  if (window.__absWeightlessPaletteSyncBound) return;

  const handlePaletteDrift = () => {
    const globals = getGlobals();
    if (globals.currentMode !== 'weightless') return;
    syncWeightlessPalette(globals);
  };

  window.addEventListener('bb:paletteChanged', handlePaletteDrift);
  window.__absWeightlessPaletteSyncBound = true;
}

function pushFormationAwayFromCenter(globals, points, push = 1.2, edgePad = 0) {
  const canvas = globals.canvas;
  if (!canvas || !Array.isArray(points) || points.length === 0) return points;

  const centerX = canvas.width * 0.5;
  const centerY = canvas.height * 0.5;
  const safeLeft = edgePad;
  const safeRight = canvas.width - edgePad;
  const safeTop = edgePad;
  const safeBottom = canvas.height - edgePad;

  return points.map((point) => {
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    return {
      ...point,
      x: clamp(centerX + (dx * push), safeLeft, safeRight),
      y: clamp(centerY + (dy * push), safeTop, safeBottom),
    };
  });
}

function createRingFormation(globals, spacing) {
  const canvas = globals.canvas;
  if (!canvas) return [];

  const centerX = canvas.width * 0.385;
  const centerY = canvas.height * 0.215;
  const step = spacing * 0.98;
  const points = [];

  for (let gy = -1.5; gy <= 1.5; gy += 1) {
    for (let gx = -1.5; gx <= 1.5; gx += 1) {
      const isPerimeter = Math.abs(gx) === 1.5 || Math.abs(gy) === 1.5;
      if (!isPerimeter) continue;
      points.push({
        x: centerX + gx * step,
        y: centerY + gy * step
      });
    }
  }

  return pushFormationAwayFromCenter(globals, points, 1.2, spacing * 1.6);
}

function createPyramidFormation(globals, spacing) {
  const canvas = globals.canvas;
  if (!canvas) return [];

  const centerX = canvas.width * 0.22;
  const topY = canvas.height * 0.61;
  const step = spacing * 0.92;
  const points = [];

  for (let row = 0; row < 5; row += 1) {
    const columns = row + 1;
    const rowWidth = (columns - 1) * step;
    const startX = centerX - rowWidth * 0.5;
    const y = topY + row * step;
    for (let column = 0; column < columns; column += 1) {
      points.push({
        x: startX + column * step,
        y
      });
    }
  }

  return pushFormationAwayFromCenter(globals, points, 1.2, spacing * 1.6);
}

function createFrameFormation(globals, spacing) {
  const canvas = globals.canvas;
  if (!canvas) return [];

  const centerX = canvas.width * 0.72;
  const centerY = canvas.height * 0.675;
  const step = spacing * 0.94;
  const points = [];

  for (let gy = -1.5; gy <= 1.5; gy += 1) {
    for (let gx = -1.5; gx <= 1.5; gx += 1) {
      const isPerimeter = Math.abs(gx) === 1.5 || Math.abs(gy) === 1.5;
      if (!isPerimeter) continue;
      const x = centerX + gx * step;
      const y = centerY + gy * step;
      points.push({ x, y });
    }
  }

  return pushFormationAwayFromCenter(globals, points, 1.2, spacing * 1.6);
}

function createNeutralAccentFormation(globals, spacing) {
  const canvas = globals.canvas;
  if (!canvas) return [];

  const centerX = canvas.width * 0.165;
  const centerY = canvas.height * 0.455;
  const step = spacing * 0.90;
  const points = [];

  points.push({ x: centerX - step * 0.5, y: centerY - step * 0.5, colorKey: 'systemsMini' });
  points.push({ x: centerX + step * 0.5, y: centerY - step * 0.5, colorKey: 'appliedMini' });
  points.push({ x: centerX - step * 0.5, y: centerY + step * 0.5, colorKey: 'systemsMini' });
  points.push({ x: centerX + step * 0.5, y: centerY + step * 0.5, colorKey: 'interactionMini' });

  return pushFormationAwayFromCenter(globals, points, 1.2, spacing * 1.6);
}

function spawnFormation(globals, points, shapeName) {
  let spawned = 0;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const resolvedName = point.colorKey || shapeName;
    const { color, distributionIndex } = resolveShapeColor(globals, resolvedName);
    const ball = spawnBall(point.x, point.y, color, distributionIndex);

    // Hold the illustration still until the pointer disturbs it.
    ball.vx = 0;
    ball.vy = 0;
    ball.omega = 0;
    ball.driftAx = 0;
    ball.driftTime = 0;
    ball._preserveColor = true;
    spawned++;
  }
  return spawned;
}

function trimFormationPoints(groups, targetCount) {
  let remaining = Math.max(0, targetCount);
  return groups.map((group) => {
    const take = Math.max(0, Math.min(group.points.length, remaining));
    remaining -= take;
    return { ...group, points: group.points.slice(0, take) };
  });
}

function arrangeBallsInComposition(globals, targetBalls) {
  const canvas = globals.canvas;
  if (!canvas || targetBalls <= 0) return 0;

  const avgRadius = ((globals.R_MIN || 15) + (globals.R_MAX || 25)) * 0.5;
  const spacing = avgRadius * 1.86;
  const ring = createRingFormation(globals, spacing);
  const pyramid = createPyramidFormation(globals, spacing);
  const frame = createFrameFormation(globals, spacing);
  const neutralAccent = createNeutralAccentFormation(globals, spacing);
  const formations = trimFormationPoints([
    { name: 'ring', points: ring },
    { name: 'pyramid', points: pyramid },
    { name: 'frame', points: frame },
    { name: 'systemsMini', points: neutralAccent }
  ], targetBalls);

  let spawned = 0;
  for (let i = 0; i < formations.length; i++) {
    spawned += spawnFormation(globals, formations[i].points, formations[i].name);
  }
  return spawned;
}

export function initializeWeightless() {
  const globals = getGlobals();
  ensureWeightlessPaletteSync();
  syncWeightlessPalette(globals);
  clearBalls();
  
  const targetBalls = getMobileAdjustedCount(globals.weightlessCount);
  if (targetBalls <= 0) return;

  arrangeBallsInComposition(globals, targetBalls);
}

export function applyWeightlessForces(ball, dt) {
  const globals = getGlobals();
  if (!globals.mouseInCanvas) return;

  const radius = globals.weightlessRepelRadius ?? 0;
  const power = globals.weightlessRepelPower ?? 0;
  if (radius <= 0 || power <= 0) return;

  // Treat as “CSS px” and scale into canvas units via DPR (matches Ball Pit repeller behavior).
  const rPx = radius * (globals.DPR || 1);
  const dx = ball.x - globals.mouseX;
  const dy = ball.y - globals.mouseY;
  const d2 = dx * dx + dy * dy;
  const r2 = rPx * rPx;
  if (d2 > r2) return;

  const d = Math.max(Math.sqrt(d2), 1e-4);
  const nx = dx / d;
  const ny = dy / d;

  // Strong near-field impulse (“explosion” feel), smoothly falling off to 0 at the radius.
  const q = Math.max(0, 1 - d / rPx);
  const soft = globals.weightlessRepelSoft ?? 2.2;
  const strength = (power * 20.0) * Math.pow(q, soft);

  const massScale = Math.max(0.25, ball.m / globals.MASS_BASELINE_KG);
  ball.vx += (nx * strength * dt) / massScale;
  ball.vy += (ny * strength * dt) / massScale;
}
