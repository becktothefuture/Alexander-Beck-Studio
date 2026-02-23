// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            WEIGHTLESS MODE                                   ║
// ║            Snooker-style triangle arrangement in center                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { spawnBall } from '../physics/spawn.js';
import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';

/**
 * Calculate number of rows needed for a triangle arrangement to fit target ball count
 * Triangle with n rows has n*(n+1)/2 balls
 */
function calculateTriangleRows(targetBalls) {
  let rows = 1;
  while (rows * (rows + 1) / 2 < targetBalls) {
    rows++;
  }
  return rows;
}

/**
 * Arrange balls in a triangle formation (snooker rack style) centered in viewport
 */
function arrangeBallsInTriangle(globals, targetBalls) {
  const canvas = globals.canvas;
  if (!canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  const DPR = globals.DPR || 1;
  
  // Calculate rows needed for triangle
  const rows = calculateTriangleRows(targetBalls);
  const actualBalls = Math.min(targetBalls, rows * (rows + 1) / 2);
  
  // Get average ball radius for spacing
  const avgRadius = ((globals.R_MIN || 15) + (globals.R_MAX || 25)) * 0.5 * DPR;
  const spacing = avgRadius * 2.1; // Slight gap between balls
  
  // Center of viewport
  const centerX = w * 0.5;
  const centerY = h * 0.5;
  
  // Calculate total triangle width and height
  const triangleWidth = (rows - 1) * spacing;
  const triangleHeight = (rows - 1) * spacing * Math.sqrt(3) / 2;
  
  // Starting position (top of triangle, centered horizontally)
  const startX = centerX - triangleWidth * 0.5;
  const startY = centerY - triangleHeight * 0.5;
  
  let ballIndex = 0;
  
  // Create triangle arrangement: row 1 has 1 ball, row 2 has 2, etc.
  for (let row = 0; row < rows && ballIndex < actualBalls; row++) {
    const ballsInRow = row + 1;
    const rowWidth = (ballsInRow - 1) * spacing;
    const rowX = startX + (triangleWidth - rowWidth) * 0.5;
    const rowY = startY + row * spacing * Math.sqrt(3) / 2;
    
    for (let col = 0; col < ballsInRow && ballIndex < actualBalls; col++) {
      const x = rowX + col * spacing;
      const y = rowY;
      
      const ball = spawnBall(x, y);
      
      // Start stationary (zero velocity) - will move when mouse interacts
      ball.vx = 0;
      ball.vy = 0;
      ball.omega = 0;
      ball.driftAx = 0;
      ball.driftTime = 0;
      
      ballIndex++;
    }
  }
  
  return ballIndex;
}

export function initializeWeightless() {
  const globals = getGlobals();
  clearBalls();
  
  const targetBalls = getMobileAdjustedCount(globals.weightlessCount);
  if (targetBalls <= 0) return;
  
  // Arrange balls in triangle formation (snooker rack style)
  arrangeBallsInTriangle(globals, targetBalls);
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


