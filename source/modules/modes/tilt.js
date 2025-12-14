// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              TILT MODE (MODE 9)                              ║
// ║          Mouse-driven viewport rotation with water-like physics              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { spawnBall } from '../physics/spawn.js';
import { getGlobals, clearBalls } from '../core/state.js';
import { getColorByIndex } from '../visual/colors.js';

/**
 * Initialize Tilt mode
 * Spawns many super-light balls that flow like water when tilted
 */
export function initializeTilt() {
  const globals = getGlobals();
  clearBalls();
  
  const targetBalls = globals.tiltBallCount || 300; // Many particles for realistic fluid behavior
  const w = globals.canvas.width;
  const h = globals.canvas.height;
  const DPR = globals.DPR;
  
  // Reset tilt angle on mode entry
  globals.currentTiltAngle = 0;
  
  // Apply initial CSS transform to ENTIRE VIEWPORT (body element)
  if (document.body) {
    document.body.style.transformOrigin = 'center center';
    document.body.style.transform = 'rotate(0deg)';
  }
  
  // Spawn balls across full viewport (random positions, avoiding extremes)
  const padding = (globals.wallThickness || 20) * DPR;
  const margin = 50 * DPR; // Extra margin from edges
  const spawnXLeft = padding + margin;
  const spawnXRight = w - padding - margin;
  const spawnYTop = padding + margin;
  const spawnYBottom = h - padding - margin;
  
  // Calculate ball size (slightly smaller for more realistic packing)
  const avgBallSize = (globals.R_MIN + globals.R_MAX) / 2;
  const ballSize = avgBallSize * 0.9; // 90% of average for denser packing
  
  // Light balls - stable but responsive
  const waterBallMass = globals.ballMassKg * globals.tiltGlassBallMass;
  
  // Spawn many small, light balls with minimal initial velocity
  for (let i = 0; i < targetBalls; i++) {
    const x = spawnXLeft + Math.random() * (spawnXRight - spawnXLeft);
    const y = spawnYTop + Math.random() * (spawnYBottom - spawnYTop);
    
    const colorIndex = i % 8;
    const ball = spawnBall(x, y, getColorByIndex(colorIndex));
    ball.r = ballSize;
    ball.rBase = ballSize;
    ball.m = waterBallMass; // Light but stable
    // Very small initial velocity for calm start
    ball.vx = (Math.random() - 0.5) * 20;
    ball.vy = (Math.random() - 0.5) * 20;
  }
}

/**
 * Apply tilt forces with EXAGGERATED water-like physics
 * NOTE: Ball.step() skips standard gravity for TILT mode, so we handle ALL gravity here
 * @param {Ball} ball - Ball to apply forces to
 * @param {number} dt - Delta time in seconds
 */
export function applyTiltForces(ball, dt) {
  const globals = getGlobals();
  const { G, gravityScale, currentTiltAngle } = globals;
  
  // Safety check: ensure G is set
  if (!G || G === 0) return;
  
  // Convert tilt angle to radians
  const angleRad = currentTiltAngle * (Math.PI / 180);
  
  // Slightly exaggerated gravity (1.2x) for noticeable but realistic tilt response
  const exaggerationFactor = 1.2;
  const gravityX = Math.sin(angleRad) * G * (gravityScale || 1.0) * exaggerationFactor;
  const gravityY = Math.cos(angleRad) * G * (gravityScale || 1.0) * exaggerationFactor;
  
  // Apply gravity - light balls respond quickly
  const massScale = Math.max(0.1, ball.m / globals.MASS_BASELINE_KG);
  ball.vx += (gravityX * dt) / massScale;
  ball.vy += (gravityY * dt) / massScale;
}

/**
 * Update tilt state per frame (called from mode updater)
 * Smoothly interpolates toward target angle and applies CSS transform
 * @param {number} dt - Delta time in seconds
 */
export function updateTilt(dt) {
  const globals = getGlobals();
  const { mouseX, mouseInCanvas, canvas, tiltMaxAngle, tiltLerpSpeed } = globals;
  
  if (!canvas) return;
  
  let targetAngle = 0; // Default to neutral when mouse is outside
  
  // Only tilt based on mouse position if mouse is inside canvas AND valid
  const isValidMouseX = mouseInCanvas && mouseX > -1e8 && mouseX < 1e8;
  
  if (isValidMouseX) {
    // Calculate target tilt angle based on mouse X position
    // Mouse at left edge = -tiltMaxAngle, center = 0, right edge = +tiltMaxAngle
    const canvasWidth = canvas.width;
    const normalizedX = (mouseX / canvasWidth) - 0.5; // -0.5 to +0.5
    targetAngle = normalizedX * 2 * tiltMaxAngle; // -2° to +2°
  }
  // If mouse is outside canvas or invalid, targetAngle stays 0 (neutral position)
  
  // Smooth interpolation toward target (lerp)
  const delta = (targetAngle - globals.currentTiltAngle) * tiltLerpSpeed;
  globals.currentTiltAngle += delta;
  
  // Apply CSS transform to ENTIRE VIEWPORT (body element)
  // Check for prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  
  if (!prefersReducedMotion && document.body) {
    document.body.style.transform = `rotate(${globals.currentTiltAngle}deg)`;
  }
}

/**
 * Cleanup when exiting tilt mode
 * Resets CSS transform, tilt angle, and physics values
 */
export function exitTilt() {
  const globals = getGlobals();
  
  // Reset tilt angle
  globals.currentTiltAngle = 0;
  
  // Remove CSS transform from ENTIRE VIEWPORT (body element)
  if (document.body) {
    document.body.style.transform = 'none';
    document.body.style.transformOrigin = '';
  }
  
  // Restore default physics values
  globals.REST = globals.config.restitution || 0.69;
  globals.FRICTION = globals.config.friction || 0.0060;
}
