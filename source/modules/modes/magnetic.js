// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            MAGNETIC MODE                                     ║
// ║    Cursor creates POWERFUL magnetic field - balls are violently attracted    ║
// ║    or repelled based on their "charge". Auto-explosion every 10s.            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls } from '../core/state.js';
import { Ball } from '../physics/Ball.js';
import { pickRandomColor, getColorByIndex } from '../visual/colors.js';
import { MODES } from '../core/constants.js';

// Explosion timer state (kept for compatibility, but explosions disabled)
let explosionTimer = 0;
const EXPLOSION_INTERVAL = 10; // unused now
const COUNTDOWN_START = 5; // unused now
let flashPhase = 0;

export function initializeMagnetic() {
  const g = getGlobals();
  clearBalls();
  explosionTimer = 0;
  flashPhase = 0;
  const canvas = g.canvas;
  if (!canvas) return;

  const w = canvas.width;
  const h = canvas.height;
  const count = Math.min(g.magneticBallCount || 180, g.maxBalls || 300);

  // Ensure at least one of each color
  for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = g.R_MIN + Math.random() * (g.R_MAX - g.R_MIN);
    const c = getColorByIndex(colorIndex);
    const b = new Ball(x, y, r, c);
    b.vx = (Math.random() - 0.5) * 100;
    b.vy = (Math.random() - 0.5) * 100;
    // Assign magnetic charge: positive (attracted) or negative (repelled)
    b.charge = Math.random() > 0.5 ? 1 : -1;
    b.baseAlpha = 1;
    g.balls.push(b);
  }

  for (let i = 8; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = g.R_MIN + Math.random() * (g.R_MAX - g.R_MIN);
    const c = pickRandomColor();
    const b = new Ball(x, y, r, c);
    b.vx = (Math.random() - 0.5) * 100;
    b.vy = (Math.random() - 0.5) * 100;
    b.charge = Math.random() > 0.5 ? 1 : -1;
    b.baseAlpha = 1;
    g.balls.push(b);
  }
}

/**
 * Trigger automatic explosion from center
 */
function triggerAutoExplosion() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;
  
  // Explode from canvas center
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const force = g.magneticStrength || 50000;
  
  for (let i = 0; i < g.balls.length; i++) {
    const ball = g.balls[i];
    const dx = ball.x - cx;
    const dy = ball.y - cy;
    const dist = Math.max(30, Math.sqrt(dx * dx + dy * dy));
    const nx = dx / dist;
    const ny = dy / dist;
    
    // Strong outward explosion
    const strength = (force / 50) * Math.min(1, 400 / dist);
    ball.vx += nx * strength;
    ball.vy += ny * strength;
    ball.omega += (Math.random() - 0.5) * 15;
  }
}

export function applyMagneticForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.MAGNETIC) return;
  if (!g.mouseInCanvas) return;

  const mx = g.mouseX;
  const my = g.mouseY;
  const dx = mx - ball.x;
  const dy = my - ball.y;
  const dist = Math.max(30, Math.sqrt(dx * dx + dy * dy));
  
  // EXAGGERATED magnetic force - inverse square law with high multiplier
  const magneticStrength = g.magneticStrength || 65000;
  
  // Force magnitude: strong inverse-square attraction/repulsion
  const forceMag = magneticStrength / (dist * dist) * 1000;
  
  // Normalize direction
  const nx = dx / dist;
  const ny = dy / dist;
  
  // Apply force based on charge (positive = attracted, negative = repelled)
  const charge = ball.charge || 1;
  ball.vx += nx * forceMag * charge * dt;
  ball.vy += ny * forceMag * charge * dt;
  
  // Velocity cap to prevent explosion
  const maxVel = g.magneticMaxVelocity || 2800;
  const vel = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (vel > maxVel) {
    ball.vx = (ball.vx / vel) * maxVel;
    ball.vy = (ball.vy / vel) * maxVel;
  }
  
  // Very light drag to prevent chaos (but keep it snappy)
  ball.vx *= 0.998;
  ball.vy *= 0.998;
}

/**
 * Update magnetic mode per-frame
 */
export function updateMagnetic(dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.MAGNETIC) return;

  // Explosions & countdown flashing have been disabled.
  // Keep alpha stable to preserve clean look.
  for (let i = 0; i < g.balls.length; i++) {
    g.balls[i].alpha = 1;
  }
}

export function getExplosionTimer() {
  return explosionTimer;
}
