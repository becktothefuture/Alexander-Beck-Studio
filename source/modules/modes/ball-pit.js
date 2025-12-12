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
  const DPR = globals.DPR;
  
  // CRITICAL: Use container height (not canvas height) for spawn calculations
  // Canvas is 150% of container (top 1/3 is spawn area above viewport)
  // Spawn positions are relative to the visible viewport, so we need base container height
  const container = globals.container || document.getElementById('bravia-balls');
  const containerHeightCss = container ? container.clientHeight : (globals.canvas.clientHeight / 1.5);
  
  // Account for simulation padding (canvas is inset from container)
  const simPad = globals.simulationPadding || 0;
  const visibleHeightCss = containerHeightCss - (simPad * 2);
  
  // Spawn parameters (from config)
  const SPAWN_Y_VH = -50;  // -50% = spawn 50% above visible viewport
  const SPAWN_H_VH = 50;   // 50% height spawn zone
  const SPAWN_W_VW = 100;  // Full width
  const SPAWN_X_CENTER_VW = 50;
  
  const spawnYTop = (SPAWN_Y_VH / 100) * visibleHeightCss * DPR;
  const spawnYBottom = spawnYTop + (SPAWN_H_VH / 100) * visibleHeightCss * DPR;
  const widthCss = (SPAWN_W_VW / 100) * (globals.canvas.clientWidth);
  const xCenterCss = (SPAWN_X_CENTER_VW / 100) * (globals.canvas.clientWidth);
  const xLeftCss = xCenterCss - widthCss / 2;
  const xRightCss = xCenterCss + widthCss / 2;
  
  // First, ensure at least one ball of each color (0-7)
  for (let colorIndex = 0; colorIndex < 8; colorIndex++) {
    const x = (xLeftCss + Math.random() * widthCss) * DPR;
    const y = spawnYTop + Math.random() * (spawnYBottom - spawnYTop);
    
    const ball = spawnBall(x, y, getColorByIndex(colorIndex));
    ball.vx = (Math.random() - 0.5) * 100;
    ball.vy = Math.random() * 50;
    ball.driftAx = 0;
    ball.driftTime = 0;
  }
  
  // Then fill the rest with random colors
  for (let i = 8; i < targetBalls; i++) {
    const x = (xLeftCss + Math.random() * widthCss) * DPR;
    const y = spawnYTop + Math.random() * (spawnYBottom - spawnYTop);
    
    const ball = spawnBall(x, y);
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


