// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              BALL PIT MODE                                   ║
// ║            Extracted from balls-source.html lines 3489-3518                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { spawnBall } from '../physics/spawn.js';
import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function applyKeepClearImpulse(ball, centerX, centerY, radiusX, radiusY, force, dt, globals) {
  const dx = ball.x - centerX;
  const dy = ball.y - centerY;
  const safeRadiusX = Math.max(radiusX, 1);
  const safeRadiusY = Math.max(radiusY, 1);
  const normalizedDistance = Math.sqrt(
    (dx * dx) / (safeRadiusX * safeRadiusX) +
    (dy * dy) / (safeRadiusY * safeRadiusY)
  );
  if (normalizedDistance >= 1) return;

  const distance = Math.max(Math.hypot(dx, dy), 1e-4);
  const push = force * Math.pow(1 - normalizedDistance, 2);
  const massScale = Math.max(0.25, ball.m / globals.MASS_BASELINE_KG);
  ball.vx += ((dx || 0.0001) / distance) * (push * dt) / massScale;
  ball.vy += ((dy || -1) / distance) * (push * dt) / massScale;
}

function spawnPourBallPit(globals, targetBalls) {
  const w = globals.canvas.width;
  const h = globals.canvas.height;
  const DPR = globals.DPR;
  const heroKeepClear = globals.homeHeroKeepClear || null;

  // Spawn balls ABOVE the canvas (negative Y coordinates)
  // They will fall into the visible area via gravity
  // This is "negative spacing" - spawn area extends above y=0
  // Drop-in from higher: +30% taller spawn band above the canvas.
  const spawnHeight = h * 0.65; // was 0.50h
  const spawnYTop = -spawnHeight;
  const spawnYBottom = 0;

  // Spawn from the top, biased toward the right but ~1/3 in toward center.
  // Keep a narrow band so the drop-in reads as a deliberate "pour".
  const frameBorderWidth = Number.isFinite(globals.frameBorderWidth)
    ? globals.frameBorderWidth
    : (globals.wallThickness || 20);
  const padding = frameBorderWidth * DPR;
  const spawnXLeft = padding;
  const spawnXRight = w - padding;
  const usableW = spawnXRight - spawnXLeft;
  const spawnBandWidth = Math.max(
    1,
    usableW * clamp(toNumber(heroKeepClear?.spawnBandWidthRatio, 0.18), 0.1, 0.3)
  );
  const anchorX = spawnXLeft + usableW * clamp(toNumber(heroKeepClear?.spawnBiasX, 0.74), 0.55, 0.88);
  const spawnXMin = Math.max(spawnXLeft, anchorX - spawnBandWidth * 0.5);
  const spawnXMax = Math.min(spawnXRight, anchorX + spawnBandWidth * 0.5);

  const count = Math.max(0, targetBalls | 0);
  
  // Initial velocity base values (DPR-scaled)
  const vxBase = 100 * DPR;
  const vyBase = 50 * DPR;

  // Color distribution is handled by spawnBall() via pickRandomColor().
  for (let i = 0; i < count; i++) {
    const x = spawnXMin + Math.random() * (spawnXMax - spawnXMin);
    const y = spawnYTop + Math.random() * (spawnYBottom - spawnYTop);

    const ball = spawnBall(x, y);
    // Small downward velocity and random horizontal drift (DPR-scaled)
    ball.vx = (Math.random() - 0.5) * vxBase;
    ball.vy = Math.random() * vyBase + vyBase; // Initial downward velocity
    ball.driftAx = 0;
    ball.driftTime = 0;
  }
}

export function initializeBallPit() {
  const globals = getGlobals();
  clearBalls();
  
  const targetBalls = getMobileAdjustedCount(globals.maxBalls ?? 300);
  spawnPourBallPit(globals, targetBalls);
}

export function applyBallPitForces(ball, dt) {
  const globals = getGlobals();
  const repelPower = globals.repelPower;
  const repelRadius = globals.repelRadius;
  const mouseX = globals.mouseX;
  const mouseY = globals.mouseY;

  if (globals.repellerEnabled && repelPower > 0 && repelRadius > 0) {
    const rPx = repelRadius * globals.DPR;
    const dx = ball.x - mouseX;
    const dy = ball.y - mouseY;
    const d2 = dx * dx + dy * dy;
    const r2 = rPx * rPx;
    if (d2 <= r2) {
      const d = Math.max(Math.sqrt(d2), 1e-4);
      const nx = dx / d;
      const ny = dy / d;
      const q = Math.max(0, 1 - d / rPx);
      const strength = (repelPower * 20.0) * Math.pow(q, globals.repelSoft || 3.4);
      const massScale = Math.max(0.25, ball.m / globals.MASS_BASELINE_KG);
      ball.vx += (nx * strength * dt) / massScale;
      ball.vy += (ny * strength * dt) / massScale;
    }
  }

  const keepClear = globals.homeHeroKeepClear;
  if (!keepClear?.enabled || !globals.canvas) return;

  const w = globals.canvas.width;
  const h = globals.canvas.height;
  const isMobile = window.innerWidth <= 767;
  const mobileBiasCssPx = isMobile
    ? Math.max(0, Math.min(window.innerHeight * 0.045, 28) - (Math.max(0, 700 - window.innerHeight) * 0.18))
    : 0;
  const centerX = w * 0.5;
  const centerY = (h * 0.5) - (mobileBiasCssPx * (globals.DPR || 1));
  const baseForce = clamp(toNumber(keepClear.force, 900), 0, 2400);
  const centerWidthRatio = clamp(
    toNumber(keepClear.centerWidthRatio, 0.58) * (isMobile ? 1.16 : 1),
    0.2,
    0.95
  );
  const centerHeightRatio = clamp(
    toNumber(keepClear.centerHeightRatio, 0.28) * (isMobile ? 1.22 : 1),
    0.12,
    0.6
  );

  applyKeepClearImpulse(
    ball,
    centerX,
    centerY,
    w * centerWidthRatio * 0.5,
    h * centerHeightRatio * 0.5,
    baseForce * (isMobile ? 1.15 : 1),
    dt,
    globals
  );

  applyKeepClearImpulse(
    ball,
    centerX,
    centerY + (h * clamp(toNumber(keepClear.navOffsetRatio, 0.15) * (isMobile ? 1.28 : 1), 0.05, 0.36)),
    w * clamp(toNumber(keepClear.navWidthRatio, 0.44) * (isMobile ? 1.18 : 1), 0.16, 0.84) * 0.5,
    h * clamp(toNumber(keepClear.navHeightRatio, 0.1) * (isMobile ? 1.6 : 1), 0.04, 0.24) * 0.5,
    baseForce * (isMobile ? 0.98 : 0.8),
    dt,
    globals
  );
}
