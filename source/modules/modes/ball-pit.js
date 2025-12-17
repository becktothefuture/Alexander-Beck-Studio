// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              BALL PIT MODE                                   ║
// ║            Extracted from balls-source.html lines 3489-3518                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { spawnBall } from '../physics/spawn.js';
import { getGlobals, clearBalls } from '../core/state.js';
import { getColorByIndex } from '../visual/colors.js';

function spawnPourBallPit(globals, targetBalls) {
  const w = globals.canvas.width;
  const h = globals.canvas.height;
  const DPR = globals.DPR;

  // Spawn balls ABOVE the canvas (negative Y coordinates)
  // They will fall into the visible area via gravity
  // This is "negative spacing" - spawn area extends above y=0
  // Drop-in from higher: +30% taller spawn band above the canvas.
  const spawnHeight = h * 0.65; // was 0.50h
  const spawnYTop = -spawnHeight;
  const spawnYBottom = 0;

  // Spawn from the top, biased toward the right but ~1/3 in toward center.
  // Keep a narrow band so the drop-in reads as a deliberate "pour".
  const padding = (globals.wallThickness || 20) * DPR;
  const spawnXLeft = padding;
  const spawnXRight = w - padding;
  const usableW = spawnXRight - spawnXLeft;
  const spawnBandWidth = Math.max(1, usableW * 0.22);
  const anchorX = spawnXLeft + usableW * (2 / 3); // one-third in from right edge
  const spawnXMin = Math.max(spawnXLeft, anchorX - spawnBandWidth * 0.5);
  const spawnXMax = Math.min(spawnXRight, anchorX + spawnBandWidth * 0.5);

  const count = Math.max(0, targetBalls | 0);

  // First, ensure at least one ball of each color (0-7)
  for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
    const x = spawnXMin + Math.random() * (spawnXMax - spawnXMin);
    const y = spawnYTop + Math.random() * (spawnYBottom - spawnYTop);

    const ball = spawnBall(x, y, getColorByIndex(colorIndex));
    // Small downward velocity and random horizontal drift
    ball.vx = (Math.random() - 0.5) * 100;
    ball.vy = Math.random() * 50 + 50; // Initial downward velocity
    ball.driftAx = 0;
    ball.driftTime = 0;
  }

  // Then fill the rest with random colors
  for (let i = 8; i < count; i++) {
    const x = spawnXMin + Math.random() * (spawnXMax - spawnXMin);
    const y = spawnYTop + Math.random() * (spawnYBottom - spawnYTop);

    const ball = spawnBall(x, y);
    // Small downward velocity and random horizontal drift
    ball.vx = (Math.random() - 0.5) * 100;
    ball.vy = Math.random() * 50 + 50; // Initial downward velocity
    ball.driftAx = 0;
    ball.driftTime = 0;
  }
}

export function initializeBallPit() {
  const globals = getGlobals();
  clearBalls();
  
  const targetBalls = globals.maxBalls ?? 300;
  spawnPourBallPit(globals, targetBalls);
}

export function applyBallPitForces(ball, dt) {
  const globals = getGlobals();
  const repelPower = globals.repelPower;
  const repelRadius = globals.repelRadius;
  const mouseX = globals.mouseX;
  const mouseY = globals.mouseY;
  
  if (!globals.repellerEnabled || repelPower <= 0 || repelRadius <= 0) return;
  
  const rPx = repelRadius * globals.DPR;
  const dx = ball.x - mouseX;
  const dy = ball.y - mouseY;
  const d2 = dx*dx + dy*dy;
  const r2 = rPx * rPx;
  if (d2 > r2) return;
  
  const d = Math.max(Math.sqrt(d2), 1e-4);
  const nx = dx / d;
  const ny = dy / d;
  const q = Math.max(0, 1 - d / rPx);
  const strength = (repelPower * 20.0) * Math.pow(q, globals.repelSoft || 3.4);
  const massScale = Math.max(0.25, ball.m / globals.MASS_BASELINE_KG);
  ball.vx += (nx * strength * dt) / massScale;
  ball.vy += (ny * strength * dt) / massScale;
}


