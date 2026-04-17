// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            WEIGHTLESS MODE                                   ║
// ║     Grid-built geometric formations that preserve the central lockup         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { spawnBall } from '../physics/spawn.js';
import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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

function createFilledRectangle(globals, centerXRatio, centerYRatio, columns, rows, spacing, push = 1.08) {
  const canvas = globals.canvas;
  if (!canvas) return [];

  const centerX = canvas.width * centerXRatio;
  const centerY = canvas.height * centerYRatio;
  const points = [];
  const width = (columns - 1) * spacing;
  const height = (rows - 1) * spacing;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      points.push({
        x: centerX - width * 0.5 + column * spacing,
        y: centerY - height * 0.5 + row * spacing
      });
    }
  }

  return pushFormationAwayFromCenter(globals, points, push, spacing * 1.6);
}

function createFilledCircle(globals, centerXRatio, centerYRatio, columns, rows, spacing, push = 1.08) {
  const canvas = globals.canvas;
  if (!canvas) return [];

  const centerX = canvas.width * centerXRatio;
  const centerY = canvas.height * centerYRatio;
  const points = [];
  const radiusX = Math.max(0.5, (columns - 1) * 0.5);
  const radiusY = Math.max(0.5, (rows - 1) * 0.5);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const nx = radiusX === 0 ? 0 : (column - radiusX) / radiusX;
      const ny = radiusY === 0 ? 0 : (row - radiusY) / radiusY;
      if ((nx * nx) + (ny * ny) > 1) continue;
      points.push({
        x: centerX + (column - radiusX) * spacing,
        y: centerY + (row - radiusY) * spacing
      });
    }
  }

  return pushFormationAwayFromCenter(globals, points, push, spacing * 1.6);
}

function spawnFormation(globals, points) {
  let spawned = 0;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const ball = spawnBall(point.x, point.y);

    // Hold the illustration still until the pointer disturbs it.
    ball.vx = 0;
    ball.vy = 0;
    ball.omega = 0;
    ball.driftAx = 0;
    ball.driftTime = 0;
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
  const spacing = avgRadius * 1.72;
  const largeCircle = createFilledCircle(globals, 0.22, 0.26, 7, 7, spacing, 1.12);
  const mediumRect = createFilledRectangle(globals, 0.78, 0.30, 5, 4, spacing, 1.06);
  const smallRect = createFilledRectangle(globals, 0.22, 0.74, 3, 3, spacing, 1.04);
  const formations = trimFormationPoints([
    { name: 'largeCircle', points: largeCircle },
    { name: 'mediumRect', points: mediumRect },
    { name: 'smallRect', points: smallRect }
  ], targetBalls);

  let spawned = 0;
  for (let i = 0; i < formations.length; i++) {
    spawned += spawnFormation(globals, formations[i].points);
  }
  return spawned;
}

export function initializeWeightless() {
  const globals = getGlobals();
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
