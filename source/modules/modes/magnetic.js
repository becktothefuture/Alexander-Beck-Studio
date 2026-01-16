// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            MAGNETIC MODE                                     ║
// ║    All balls are attracted to the cursor like metal to a magnet             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { Ball } from '../physics/Ball.js';
import { pickRandomColor, pickRandomColorWithIndex } from '../visual/colors.js';
import { MODES } from '../core/constants.js';
import { randomRadiusForMode } from '../utils/ball-sizing.js';

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
  const baseCount = Math.min(g.magneticBallCount || 180, g.maxBalls || 300);
  const count = getMobileAdjustedCount(baseCount);
  if (count <= 0) return;

  // Initial velocity (DPR-scaled)
  const DPR = g.DPR || 1;
  const initSpeed = 100 * DPR;
  
  // Ensure at least one of each color
  for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = randomRadiusForMode(g, MODES.MAGNETIC);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const b = new Ball(x, y, r, color);
    b.distributionIndex = distributionIndex;
    b.vx = (Math.random() - 0.5) * initSpeed;
    b.vy = (Math.random() - 0.5) * initSpeed;
    b.baseAlpha = 1;
    g.balls.push(b);
  }

  for (let i = 8; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = randomRadiusForMode(g, MODES.MAGNETIC);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const b = new Ball(x, y, r, color);
    b.distributionIndex = distributionIndex;
    b.vx = (Math.random() - 0.5) * initSpeed;
    b.vy = (Math.random() - 0.5) * initSpeed;
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
  const DPR = g.DPR || 1;
  
  for (let i = 0; i < g.balls.length; i++) {
    const ball = g.balls[i];
    const dx = ball.x - cx;
    const dy = ball.y - cy;
    const dist = Math.max(30 * DPR, Math.sqrt(dx * dx + dy * dy));
    const nx = dx / dist;
    const ny = dy / dist;
    
    // Strong outward explosion (DPR-scaled distance reference)
    const strength = (force / 50) * Math.min(1, (400 * DPR) / dist);
    ball.vx += nx * strength;
    ball.vy += ny * strength;
    ball.omega += (Math.random() - 0.5) * 15;
  }
}

export function applyMagneticForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.MAGNETIC) return;
  if (!g.mouseInCanvas) return;
  
  const DPR = g.DPR || 1;
  const magneticStrength = g.magneticStrength || 65000;
  const magneticRadius = g.magneticRadius || 0; // Optional: max effective radius (0 = unlimited)
  
  const mx = g.mouseX;
  const my = g.mouseY;
  const dx = mx - ball.x;
  const dy = my - ball.y;
  const distSq = dx * dx + dy * dy;
  const dist = Math.max(30 * DPR, Math.sqrt(distSq));
  
  // Check if within magnetic radius (if specified)
  if (magneticRadius > 0) {
    const radiusPx = magneticRadius * DPR;
    if (dist > radiusPx) return; // Too far away, no magnetic effect
  }
  
  // Force magnitude: inverse-square attraction (like metal to magnet)
  // Stronger when closer to cursor
  const forceMag = (magneticStrength / distSq) * 1000;
  
  // Normalize direction (toward cursor)
  const nx = dx / dist;
  const ny = dy / dist;
  
  // Always attract (like metal to magnet) - no repulsion
  ball.vx += nx * forceMag * dt;
  ball.vy += ny * forceMag * dt;
  
  // Remove rotation to prevent spiraling - zero angular velocity
  ball.omega = 0;
  
  // Velocity cap to prevent explosion (DPR-scaled)
  const maxVel = (g.magneticMaxVelocity || 2800) * DPR;
  const vel = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (vel > maxVel) {
    ball.vx = (ball.vx / vel) * maxVel;
    ball.vy = (ball.vy / vel) * maxVel;
  }
  
  // Damping (configurable)
  const damping = g.magneticDamping ?? 0.998;
  ball.vx *= damping;
  ball.vy *= damping;
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
