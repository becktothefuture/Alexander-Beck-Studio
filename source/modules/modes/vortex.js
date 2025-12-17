// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                             VORTEX SHEETS MODE                               ║
// ║      Enhanced swirl field with configurable radius, falloff, and strength    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { Ball } from '../physics/Ball.js';
import { pickRandomColor, getColorByIndex } from '../visual/colors.js';
import { MODES } from '../core/constants.js';
import { randomRadiusForMode } from '../utils/ball-sizing.js';

export function initializeVortex() {
  const g = getGlobals();
  clearBalls();
  const canvas = g.canvas;
  if (!canvas) return;

  const w = canvas.width;
  const h = canvas.height;
  const baseCount = Math.min(g.vortexBallCount || 180, g.maxBalls || 500);
  const count = getMobileAdjustedCount(baseCount);
  if (count <= 0) return;
  
  // Enhanced initial velocity based on speed multiplier (DPR-scaled)
  const DPR = g.DPR || 1;
  const speedMultiplier = g.vortexSpeedMultiplier ?? 1.0;
  const baseSpeed = 80 * speedMultiplier * DPR;

  // Ensure at least one of each color
  for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = randomRadiusForMode(g, MODES.VORTEX);
    const c = getColorByIndex(colorIndex);
    const b = new Ball(x, y, r, c);
    b.vx = (Math.random() - 0.5) * baseSpeed;
    b.vy = (Math.random() - 0.5) * baseSpeed;
    g.balls.push(b);
  }

  for (let i = 8; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = randomRadiusForMode(g, MODES.VORTEX);
    const c = pickRandomColor();
    const b = new Ball(x, y, r, c);
    b.vx = (Math.random() - 0.5) * baseSpeed;
    b.vy = (Math.random() - 0.5) * baseSpeed;
    g.balls.push(b);
  }
}

export function applyVortexForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.VORTEX) return;

  const mx = g.mouseX;
  const my = g.mouseY;
  if (!g.mouseInCanvas) return;

  // Core parameters
  const swirlStrength = g.vortexSwirlStrength || 420;
  const radialPull = g.vortexRadialPull || 180;
  const speedMultiplier = g.vortexSpeedMultiplier ?? 1.0;
  
  // New parameters with defaults
  const radius = g.vortexRadius ?? 0; // 0 = unlimited (uses falloff)
  const falloffCurve = g.vortexFalloffCurve ?? 1.0; // 1.0 = linear, 2.0 = quadratic, 0.5 = sqrt
  const rotationDirection = g.vortexRotationDirection ?? 1; // 1 = counterclockwise, -1 = clockwise
  const coreStrength = g.vortexCoreStrength ?? 1.0; // Multiplier for center strength
  const accelerationZone = g.vortexAccelerationZone ?? 0; // Radius where acceleration is strongest (0 = disabled)
  const outwardPush = g.vortexOutwardPush ?? 0; // Outward force at edges (0 = disabled)

  const dx = ball.x - mx;
  const dy = ball.y - my;
  const dist2 = dx * dx + dy * dy;
  const dist = Math.max(8, Math.sqrt(dist2));
  
  // Radius cutoff (if configured)
  if (radius > 0 && dist > radius) {
    // Apply outward push at edges if configured
    if (outwardPush > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      const pushStrength = outwardPush * ((dist - radius) / radius);
      ball.vx += nx * pushStrength * dt;
      ball.vy += ny * pushStrength * dt;
    }
    return;
  }
  
  // Enhanced falloff calculation
  let inv;
  if (radius > 0) {
    // Use radius-based falloff
    const normalizedDist = Math.min(1, dist / radius);
    inv = Math.pow(1 - normalizedDist, falloffCurve);
  } else {
    // Use distance-based falloff (original behavior, enhanced)
    const falloffRate = g.vortexFalloffRate ?? 0.0015;
    const rawInv = 1 / (1 + dist * falloffRate);
    inv = Math.pow(rawInv, falloffCurve);
  }
  
  // Core strength boost (stronger at center)
  const coreBoost = 1.0 + (coreStrength - 1.0) * (1.0 - Math.min(1, dist / (radius || 400)));
  const effectiveSwirl = swirlStrength * inv * coreBoost * speedMultiplier;
  const effectivePull = radialPull * inv * coreBoost * speedMultiplier;
  
  // Acceleration zone (extra boost in specific radius band)
  let accelerationBoost = 1.0;
  if (accelerationZone > 0) {
    const zoneDist = Math.abs(dist - accelerationZone);
    const zoneWidth = accelerationZone * 0.3; // 30% of zone radius
    if (zoneDist < zoneWidth) {
      accelerationBoost = 1.0 + (1.0 - zoneDist / zoneWidth) * 0.5; // Up to 50% boost
    }
  }

  // Tangential swirl (perp to radial) with rotation direction
  const nx = dx / dist;
  const ny = dy / dist;
  const tx = -ny * rotationDirection;
  const ty = nx * rotationDirection;
  const swirl = effectiveSwirl * accelerationBoost;
  ball.vx += tx * swirl * dt;
  ball.vy += ty * swirl * dt;

  // Radial pull (inward)
  const pull = effectivePull * accelerationBoost;
  ball.vx -= nx * pull * dt;
  ball.vy -= ny * pull * dt;
  
  // Configurable drag to prevent runaway speeds
  const drag = Math.max(0, Math.min(1, g.vortexDrag ?? 0.005));
  ball.vx *= (1 - drag);
  ball.vy *= (1 - drag);
}
