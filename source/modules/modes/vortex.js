// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          ELECTRONS MODE (3D SPIRAL ORBITS)                    ║
// ║  Balls orbit the mouse in 3D spirals - simple circular orbits with depth    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { Ball } from '../physics/Ball.js';
import { pickRandomColor, pickRandomColorWithIndex } from '../visual/colors.js';
import { MODES } from '../core/constants.js';
import { randomRadiusForMode } from '../utils/ball-sizing.js';

// Store orbital state per ball using WeakMaps
const orbitalAngle = new WeakMap(); // Current angle in orbit (0 to 2π)
const orbitalRadius = new WeakMap(); // Radius of the orbit
const spiralPhase = new WeakMap(); // Phase for 3D spiral (depth position)
const spiralSpeed = new WeakMap(); // Speed of spiral rotation
const orbitalSpeed = new WeakMap(); // Speed of orbital rotation

export function initializeVortex() {
  const g = getGlobals();
  clearBalls();
  // WeakMaps automatically garbage collect when balls are cleared
  
  const canvas = g.canvas;
  if (!canvas) return;

  const w = canvas.width;
  const h = canvas.height;
  const baseCount = Math.min(g.vortexBallCount || 180, g.maxBalls || 500);
  const count = getMobileAdjustedCount(baseCount);
  if (count <= 0) return;
  
  // Parameters for spiral orbital initialization
  const DPR = g.DPR || 1;
  const speedMultiplier = g.vortexSpeedMultiplier ?? 1.0;
  const baseOrbitalRadius = g.vortexRadius !== undefined ? g.vortexRadius : 300;
  
  // Create multiple spiral groups with different radii and speeds
  const spiralGroupCount = 3; // Number of different spiral groups
  
  let ballIndex = 0;
  
  // Ensure at least one of each color
  for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = randomRadiusForMode(g, MODES.VORTEX);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const b = new Ball(x, y, r, color);
    b.distributionIndex = distributionIndex;
    
    // Initialize 3D spiral orbital parameters
    initSpiralOrbit(b, baseOrbitalRadius, speedMultiplier, DPR, ballIndex % spiralGroupCount);
    
    g.balls.push(b);
    ballIndex++;
  }

  // Add remaining electrons
  for (let i = ballIndex; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = randomRadiusForMode(g, MODES.VORTEX);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const b = new Ball(x, y, r, color);
    b.distributionIndex = distributionIndex;
    
    // Initialize 3D spiral orbital parameters
    initSpiralOrbit(b, baseOrbitalRadius, speedMultiplier, DPR, i % spiralGroupCount);
    
    g.balls.push(b);
  }
}

/**
 * Initialize 3D spiral orbital parameters for a ball
 * Creates circular orbits at different radii with 3D spiral depth
 */
function initSpiralOrbit(ball, baseRadius, speedMultiplier, DPR, groupIndex) {
  // Store base radius for 3D size scaling
  ball._vortexBaseRadius = ball.r;
  
  // Orbital radius - varies by group to create distinct spirals
  const radiusVariation = 0.6 + (groupIndex / 3) * 0.8; // 0.6x to 1.4x of base radius
  const orbitRadius = baseRadius * radiusVariation;
  orbitalRadius.set(ball, orbitRadius);
  
  // Starting angle in orbit (random position around the circle)
  const startAngle = Math.random() * Math.PI * 2;
  orbitalAngle.set(ball, startAngle);
  
  // 3D spiral phase - determines depth position in the spiral
  // Each ball starts at a different phase to create the spiral effect
  const spiralPhaseValue = Math.random() * Math.PI * 2;
  spiralPhase.set(ball, spiralPhaseValue);
  
  // Orbital speed - how fast the ball rotates around the mouse
  // Different groups rotate at slightly different speeds for variety
  const baseOrbitalSpeed = 0.8 * speedMultiplier; // Base rotation speed
  const speedVariation = 0.8 + (groupIndex / 3) * 0.4; // 0.8x to 1.2x speed
  const orbitSpeed = baseOrbitalSpeed * speedVariation;
  orbitalSpeed.set(ball, orbitSpeed);
  
  // Spiral speed - how fast the 3D spiral rotates (depth changes)
  // Creates the 3D effect as balls move in and out
  const baseSpiralSpeed = 0.4 * speedMultiplier; // Base spiral speed
  const spiralSpeedValue = baseSpiralSpeed * (0.7 + Math.random() * 0.6); // Vary slightly
  spiralSpeed.set(ball, spiralSpeedValue);
}

export function applyVortexForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.VORTEX) return;

  // Use mouse position, or center of canvas if mouse not in canvas
  const mx = g.mouseInCanvas ? g.mouseX : (g.canvas ? g.canvas.width * 0.5 : 0);
  const my = g.mouseInCanvas ? g.mouseY : (g.canvas ? g.canvas.height * 0.5 : 0);
  
  // Get orbital parameters
  let angle = orbitalAngle.get(ball);
  const orbitRad = orbitalRadius.get(ball);
  let spiralPhaseValue = spiralPhase.get(ball);
  const spiralSpeedValue = spiralSpeed.get(ball);
  const orbitSpeedValue = orbitalSpeed.get(ball);
  
  // Initialize if missing (backwards compatibility)
  if (angle === undefined || orbitRad === undefined) {
    const baseRadius = g.vortexRadius !== undefined ? g.vortexRadius : 300;
    initSpiralOrbit(ball, baseRadius, g.vortexSpeedMultiplier ?? 1.0, g.DPR || 1, 0);
    angle = orbitalAngle.get(ball);
    spiralPhaseValue = spiralPhase.get(ball);
  }
  
  // Core parameters
  const speedMultiplier = g.vortexSpeedMultiplier ?? 1.0;
  const rotationDirection = g.vortexRotationDirection ?? 1; // 1 = counterclockwise, -1 = clockwise
  const depthVariation = g.vortexDepthVariation ?? 0.6; // How much size changes with z-depth (0-1)
  const spiralTightness = g.vortexSpiralTightness ?? 0.5; // How tightly balls spiral (0-1)
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // 3D SPIRAL ORBITAL MOTION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Update orbital angle - ball rotates around mouse in a circle
  const DPR = g.DPR || 1;
  angle += orbitSpeedValue * rotationDirection * dt;
  // Keep angle in [0, 2π] range
  if (angle > Math.PI * 2) angle -= Math.PI * 2;
  if (angle < 0) angle += Math.PI * 2;
  orbitalAngle.set(ball, angle);
  
  // Update spiral phase - creates 3D depth effect
  // As this changes, the ball moves in and out of the screen
  spiralPhaseValue += spiralSpeedValue * rotationDirection * dt;
  if (spiralPhaseValue > Math.PI * 2) spiralPhaseValue -= Math.PI * 2;
  if (spiralPhaseValue < 0) spiralPhaseValue += Math.PI * 2;
  spiralPhase.set(ball, spiralPhaseValue);
  
  // Calculate 3D depth based on spiral phase
  // Use sine wave to smoothly cycle through depth (0 = back, 1 = front)
  const zDepth = (Math.sin(spiralPhaseValue) + 1) / 2; // 0 to 1
  
  // Assign z-depth for logo layering
  ball.z = zDepth;
  
  // Effective orbital radius varies with 3D depth (spiral effect)
  // When ball is closer (zDepth = 1), it's at the base radius
  // When ball is farther (zDepth = 0), it's at a larger radius
  const depthRadiusVariation = 1.0 + (1 - zDepth) * spiralTightness * 0.4; // Up to 40% larger when far
  const effectiveRadius = orbitRad * depthRadiusVariation;
  
  // Calculate target position based on orbital angle and effective radius
  const targetX = mx + Math.cos(angle) * effectiveRadius;
  const targetY = my + Math.sin(angle) * effectiveRadius;
  
  // Calculate desired velocity for smooth circular motion
  // Velocity is perpendicular to radius vector (tangential to circle)
  const dx = ball.x - mx;
  const dy = ball.y - my;
  const currentDist = Math.max(30, Math.sqrt(dx * dx + dy * dy));
  
  // Target velocity for circular orbit: v = r * ω (tangential speed)
  const tangentialSpeed = effectiveRadius * orbitSpeedValue * rotationDirection;
  
  // Direction perpendicular to radius (tangential)
  const tangentX = -Math.sin(angle) * rotationDirection;
  const tangentY = Math.cos(angle) * rotationDirection;
  
  // Desired velocity components
  const desiredVx = tangentX * tangentialSpeed;
  const desiredVy = tangentY * tangentialSpeed;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SMOOTH MOVEMENT TOWARD ORBIT (ENHANCED CURSOR FOLLOWING)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Apply forces to guide ball toward circular orbit
  // Use spring-like forces for smooth orbital motion
  const orbitalStrength = g.vortexSwirlStrength || 450;
  
  // Radial force - pulls ball toward correct orbital radius
  // Enhanced for better cursor following
  const radialError = currentDist - effectiveRadius;
  const radialForce = -radialError * orbitalStrength * 0.2; // Increased from 0.1 for better following
  const radialDirX = dx / currentDist;
  const radialDirY = dy / currentDist;
  
  ball.vx += radialDirX * radialForce * dt;
  ball.vy += radialDirY * radialForce * dt;
  
  // Tangential force - maintains circular motion
  // Enhanced for better cursor following
  const currentVx = ball.vx;
  const currentVy = ball.vy;
  const vErrorX = desiredVx - currentVx;
  const vErrorY = desiredVy - currentVy;
  const tangentialForceStrength = orbitalStrength * 0.25; // Increased from 0.15 for better following
  
  ball.vx += vErrorX * tangentialForceStrength * dt;
  ball.vy += vErrorY * tangentialForceStrength * dt;
  
  // Additional direct cursor following force for responsive tracking
  // This makes balls quickly adjust when cursor moves
  const cursorFollowStrength = orbitalStrength * 0.15; // Additional force to follow cursor
  const cursorErrorX = targetX - ball.x;
  const cursorErrorY = targetY - ball.y;
  const cursorDistance = Math.max(1, Math.sqrt(cursorErrorX * cursorErrorX + cursorErrorY * cursorErrorY));
  
  // Only apply cursor following if ball is far from target orbit
  if (cursorDistance > effectiveRadius * 0.2) {
    const followForceX = (cursorErrorX / cursorDistance) * cursorFollowStrength;
    const followForceY = (cursorErrorY / cursorDistance) * cursorFollowStrength;
    ball.vx += followForceX * dt;
    ball.vy += followForceY * dt;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // 3D SIZE VARIATION (PERSPECTIVE EFFECT)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Scale ball radius based on z-depth (farther = smaller, closer = larger)
  // Initialize base radius if not set
  if (ball._vortexBaseRadius === undefined) {
    ball._vortexBaseRadius = ball.rBase || ball.r;
  }
  const sizeVariation = 1 - (zDepth * depthVariation); // 1.0 (closest) to (1-depthVariation) (farthest)
  ball.r = ball._vortexBaseRadius * (0.4 + sizeVariation * 0.6); // Scale between 40% and 100% of base
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // DAMPING FOR SMOOTH MOTION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Light damping to smooth out motion
  const drag = Math.max(0, Math.min(1, g.vortexDrag ?? 0.01));
  ball.vx *= (1 - drag);
  ball.vy *= (1 - drag);
}
