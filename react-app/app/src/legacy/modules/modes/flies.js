// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                FLIES MODE                                    ║
// ║            Extracted from balls-source.html lines 3521-3551                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { spawnBall } from '../physics/spawn.js';
import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { pickRandomColor } from '../visual/colors.js';

export function initializeFlies() {
  const globals = getGlobals();
  clearBalls();
  
  const targetBalls = getMobileAdjustedCount(globals.fliesBallCount ?? 60);
  if (targetBalls <= 0) return;
  const w = globals.canvas.width;
  const h = globals.canvas.height;
  const centerX = w * 0.5;
  const centerY = h * 0.5;
  const swarmRadius = 150 * globals.DPR;
  
  // Initial velocity base (DPR-scaled)
  const baseSpeed = 300 * globals.DPR;
  
  // First, ensure at least one ball of each color (0-7)
  for (let colorIndex = 0; colorIndex < 8; colorIndex++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * swarmRadius;
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    
    const ball = spawnBall(x, y, pickRandomColor());
    
    const speedVariation = 0.5 + Math.random() * 0.5;
    const vAngle = Math.random() * Math.PI * 2;
    const speed = baseSpeed * speedVariation;
    ball.vx = Math.cos(vAngle) * speed;
    ball.vy = Math.sin(vAngle) * speed;
    ball.driftAx = 0;
    ball.driftTime = 0;
  }
  
  // Then fill the rest with random colors
  for (let i = 8; i < targetBalls; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * swarmRadius;
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    
    const ball = spawnBall(x, y);
    
    const speedVariation = 0.5 + Math.random() * 0.5;
    const vAngle = Math.random() * Math.PI * 2;
    const speed = baseSpeed * speedVariation;
    ball.vx = Math.cos(vAngle) * speed;
    ball.vy = Math.sin(vAngle) * speed;
    ball.driftAx = 0;
    ball.driftTime = 0;
  }
}

export function applyFliesForces(ball, dt) {
  const globals = getGlobals();
  const attractionPower = 5000;
  const swarmSpeed = 0.4;
  
  const swarmCenterX = (globals.mouseX === -1e9) ? globals.canvas.width * 0.5 : globals.mouseX;
  const swarmCenterY = (globals.mouseY === -1e9) ? globals.canvas.height * 0.5 : globals.mouseY;
  
  const dx = swarmCenterX - ball.x;
  const dy = swarmCenterY - ball.y;
  const d = Math.sqrt(dx*dx + dy*dy + 1);
  
  const dirX = dx / d;
  const dirY = dy / d;
  
  const attractForce = attractionPower * swarmSpeed * 2.0;
  ball.vx += dirX * attractForce * dt;
  ball.vy += dirY * attractForce * dt;
  
  // Separation
  const separationRadius = 120 * globals.DPR;
  let sepX = 0, sepY = 0, neighborCount = 0;
  for (let i = 0; i < globals.balls.length; i++) {
    const other = globals.balls[i];
    if (other === ball) continue;
    const dx2 = ball.x - other.x;
    const dy2 = ball.y - other.y;
    const d2 = dx2*dx2 + dy2*dy2;
    if (d2 < separationRadius * separationRadius && d2 > 0) {
      const d_other = Math.sqrt(d2);
      const strength = 1 - (d_other / separationRadius);
      sepX += (dx2 / d_other) * strength;
      sepY += (dy2 / d_other) * strength;
      neighborCount++;
    }
  }
  if (neighborCount > 0) {
    const separationForce = 15000;
    ball.vx += (sepX / neighborCount) * separationForce * dt;
    ball.vy += (sepY / neighborCount) * separationForce * dt;
  }
  
  // Jitter
  const jitterBase = 2500 * swarmSpeed;
  ball.vx += (Math.random() - 0.5) * jitterBase * dt;
  ball.vy += (Math.random() - 0.5) * jitterBase * dt;
}
