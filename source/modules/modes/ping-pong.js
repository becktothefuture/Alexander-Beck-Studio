// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            PING PONG MODE                                    ║
// ║     Balls bounce left-right continuously; ONLY cursor disrupts their path    ║
// ║                    No drag, no friction, pure momentum                       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { Ball } from '../physics/Ball.js';
import { pickRandomColor, pickRandomColorWithIndex } from '../visual/colors.js';
import { MODES } from '../core/constants.js';
import { randomRadiusForMode } from '../utils/ball-sizing.js';

export function initializePingPong() {
  const g = getGlobals();
  clearBalls();
  const canvas = g.canvas;
  if (!canvas) return;

  const w = canvas.width;
  const h = canvas.height;
  const baseCount = Math.min(g.pingPongBallCount || 80, g.maxBalls || 300);
  const count = getMobileAdjustedCount(baseCount);
  if (count <= 0) return;
  const baseSpeed = g.pingPongSpeed || 400;

  // Ensure at least one of each color
  for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
    const x = Math.random() * w;
    const y = h * 0.15 + Math.random() * h * 0.7; // Middle 70% vertically
    const r = randomRadiusForMode(g, MODES.PING_PONG);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const b = new Ball(x, y, r, color);
    b.distributionIndex = distributionIndex;
    // Pure horizontal velocity - no vertical component
    const dir = Math.random() > 0.5 ? 1 : -1;
    b.vx = dir * (baseSpeed * 0.8 + Math.random() * baseSpeed * 0.4);
    b.vy = 0; // Start with zero vertical
    b.isPingPong = true; // Mark for special handling
    g.balls.push(b);
  }

  for (let i = 8; i < count; i++) {
    const x = Math.random() * w;
    const y = h * 0.15 + Math.random() * h * 0.7;
    const r = randomRadiusForMode(g, MODES.PING_PONG);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const b = new Ball(x, y, r, color);
    b.distributionIndex = distributionIndex;
    const dir = Math.random() > 0.5 ? 1 : -1;
    b.vx = dir * (baseSpeed * 0.8 + Math.random() * baseSpeed * 0.4);
    b.vy = 0;
    b.isPingPong = true;
    g.balls.push(b);
  }
}

export function applyPingPongForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.PING_PONG) return;
  if (!ball.isPingPong) return;

  // ═══════════════════════════════════════════════════════════════════════════
  // CURSOR COLLISION - The ONLY thing that disrupts ball movement
  // ═══════════════════════════════════════════════════════════════════════════
  if (g.mouseInCanvas) {
    // Cursor radius is derived from vw-based layout in `applyLayoutFromVwToPx()`.
    // Keep this hot path allocation-free and avoid per-frame vw→px conversions.
    const cursorRadius = Math.max(0, (g.pingPongCursorRadius || 0)) * g.DPR;
    const mx = g.mouseX;
    const my = g.mouseY;
    const dx = ball.x - mx;
    const dy = ball.y - my;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = cursorRadius + ball.r;
    
    if (dist < minDist && dist > 0.1) {
      // Push ball out of cursor
      const overlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;
      ball.x += nx * overlap * 1.1; // Push out with small buffer
      ball.y += ny * overlap * 1.1;
      
      // Reflect velocity perfectly (elastic collision)
      const velDotN = ball.vx * nx + ball.vy * ny;
      if (velDotN < 0) {
        ball.vx -= 2 * velDotN * nx;
        ball.vy -= 2 * velDotN * ny;
        // Add some spin for visual flair
        ball.omega += velDotN * 0.02;
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MAINTAIN HORIZONTAL ENERGY - Restore any lost horizontal speed
  // ═══════════════════════════════════════════════════════════════════════════
  const targetSpeed = g.pingPongSpeed || 400;
  const currentHSpeed = Math.abs(ball.vx);
  
  // If horizontal speed drops below target, restore it
  if (currentHSpeed < targetSpeed * 0.9) {
    const dir = ball.vx >= 0 ? 1 : -1;
    ball.vx = dir * targetSpeed;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DAMPEN VERTICAL DRIFT - Gently return to horizontal motion
  // ═══════════════════════════════════════════════════════════════════════════
  // Very slowly reduce vertical velocity to return to pure horizontal motion
  const vertDamp = Math.max(0, Math.min(1, g.pingPongVerticalDamp ?? 0.995));
  ball.vy *= vertDamp;
  
  // NO OTHER DRAG - balls maintain momentum perfectly
}

/**
 * Custom wall handling for ping-pong mode
 * Called from Ball.walls() override or engine
 */
export function handlePingPongWalls(ball, w, h) {
  // Perfect elastic bounces off left/right walls
  if (ball.x - ball.r < 0) {
    ball.x = ball.r;
    ball.vx = Math.abs(ball.vx); // Bounce right
  }
  if (ball.x + ball.r > w) {
    ball.x = w - ball.r;
    ball.vx = -Math.abs(ball.vx); // Bounce left
  }
  
  // Top/bottom - bounce but also dampen vertical
  if (ball.y - ball.r < 0) {
    ball.y = ball.r;
    ball.vy = Math.abs(ball.vy) * 0.5; // Absorb some vertical energy
  }
  if (ball.y + ball.r > h) {
    ball.y = h - ball.r;
    ball.vy = -Math.abs(ball.vy) * 0.5;
  }
}
