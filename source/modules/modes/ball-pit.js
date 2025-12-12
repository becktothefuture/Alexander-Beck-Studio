// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              BALL PIT MODE                                   ║
// ║            Extracted from balls-source.html lines 3489-3518                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { spawnBall } from '../physics/spawn.js';
import { getGlobals, clearBalls } from '../core/state.js';
import { getColorByIndex } from '../visual/colors.js';

export function initializeBallPit() {
  const globals = getGlobals();
  clearBalls();
  
  const targetBalls = 300; // MAX_BALLS
  const w = globals.canvas.width;
  const h = globals.canvas.height;
  const DPR = globals.DPR;
  
  // Ball Pit canvas is 150vh tall (150% of viewport)
  // Top 1/3 (50vh) is above viewport = spawn area [0, h/3]
  // Bottom 2/3 (100vh) is visible viewport = play area [h/3, h]
  // viewportTop = h/3 marks where visible area begins
  
  const viewportTop = h / 3;
  
  // Spawn in top 70% of the hidden area (concentrated near top)
  // This creates the effect of balls "falling in from the top"
  const spawnYTop = 0;
  const spawnYBottom = viewportTop * 0.7;  // Use top 70% of spawn area
  
  // Spawn across full width
  const spawnXLeft = 0;
  const spawnXRight = w;
  
  // First, ensure at least one ball of each color (0-7)
  for (let colorIndex = 0; colorIndex < 8; colorIndex++) {
    const x = spawnXLeft + Math.random() * (spawnXRight - spawnXLeft);
    const y = spawnYTop + Math.random() * (spawnYBottom - spawnYTop);
    
    const ball = spawnBall(x, y, getColorByIndex(colorIndex));
    // Small downward velocity and random horizontal drift
    ball.vx = (Math.random() - 0.5) * 100;
    ball.vy = Math.random() * 50;
    ball.driftAx = 0;
    ball.driftTime = 0;
  }
  
  // Then fill the rest with random colors
  for (let i = 8; i < targetBalls; i++) {
    const x = spawnXLeft + Math.random() * (spawnXRight - spawnXLeft);
    const y = spawnYTop + Math.random() * (spawnYBottom - spawnYTop);
    
    const ball = spawnBall(x, y);
    // Small downward velocity and random horizontal drift
    ball.vx = (Math.random() - 0.5) * 100;
    ball.vy = Math.random() * 50;
    ball.driftAx = 0;
    ball.driftTime = 0;
  }
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


