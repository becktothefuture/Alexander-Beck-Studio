// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            WATER/SWIMMING MODE                               ║
// ║           Balls swim through water with gorgeous ripple effects             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { Ball } from '../physics/Ball.js';
import { pickRandomColor, pickRandomColorWithIndex } from '../visual/colors.js';
import { randomRadiusForMode } from '../utils/ball-sizing.js';
import { MODES } from '../core/constants.js';

// Ripple system
const ripples = [];

export function initializeWater() {
  const globals = getGlobals();
  clearBalls();
  ripples.length = 0;
  
  const canvas = globals.canvas;
  if (!canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  const count = getMobileAdjustedCount(globals.waterBallCount || 100);
  if (count <= 0) return;
  
  // Initial velocity (DPR-scaled)
  const DPR = globals.DPR || 1;
  const v0 = (globals.waterInitialVelocity || 120) * DPR;
  
  // First, ensure at least one ball of each color (0-7)
  for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const size = randomRadiusForMode(globals, MODES.WATER);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const ball = new Ball(x, y, size, color);
    ball.distributionIndex = distributionIndex;
    
    // Random initial velocities (snowglobe-style movement)
    ball.vx = (Math.random() - 0.5) * v0;
    ball.vy = (Math.random() - 0.5) * v0;
    
    globals.balls.push(ball);
  }
  
  // Then fill the rest with random colors
  for (let i = 8; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const size = randomRadiusForMode(globals, MODES.WATER);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const ball = new Ball(x, y, size, color);
    ball.distributionIndex = distributionIndex;
    
    // Random initial velocities (snowglobe-style movement)
    ball.vx = (Math.random() - 0.5) * v0;
    ball.vy = (Math.random() - 0.5) * v0;
    
    globals.balls.push(ball);
  }
}

export function applyWaterForces(ball, dt) {
  const globals = getGlobals();
  
  // Strong water resistance (damping)
  const waterDrag = globals.waterDrag || 0.015;
  ball.vx *= (1 - waterDrag);
  ball.vy *= (1 - waterDrag);
  ball.omega *= (1 - waterDrag * 0.5);
  
  // Apply ripple forces
  const DPR = globals.DPR || 1;
  for (let i = 0; i < ripples.length; i++) {
    const ripple = ripples[i];
    const dx = ball.x - ripple.x;
    const dy = ball.y - ripple.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Ripple affects balls in expanding ring (DPR-scaled)
    const rippleThickness = 40 * DPR;
    const innerRadius = ripple.radius - rippleThickness;
    const outerRadius = ripple.radius + rippleThickness;
    
    if (dist > innerRadius && dist < outerRadius) {
      // Calculate force based on distance from ripple edge
      const distFromEdge = Math.abs(dist - ripple.radius);
      const forceMag = ripple.strength * (1 - distFromEdge / rippleThickness);
      
      if (dist > 0.1) {
        const nx = dx / dist;
        const ny = dy / dist;
        ball.vx += nx * forceMag * dt;
        ball.vy += ny * forceMag * dt;
      }
    }
  }
  
  // Gentle ambient drift (like currents)
  const driftStrength = globals.waterDriftStrength || 25;
  ball.vx += Math.sin(ball.t * 0.5 + ball.x * 0.01) * driftStrength * dt;
  ball.vy += Math.cos(ball.t * 0.7 + ball.y * 0.01) * driftStrength * dt;
}

export function updateWaterRipples(dt) {
  const globals = getGlobals();
  const rippleSpeed = globals.waterRippleSpeed || 300;
  
  // Update existing ripples
  for (let i = ripples.length - 1; i >= 0; i--) {
    const ripple = ripples[i];
    ripple.radius += rippleSpeed * dt;
    ripple.age += dt;
    ripple.strength *= 0.96; // Decay
    
    // Remove old/weak ripples
    if (ripple.age > 3.0 || ripple.strength < 10) {
      ripples.splice(i, 1);
    }
  }
}

/**
 * Create a water ripple at the given position
 * @param {number} x - X position
 * @param {number} y - Y position  
 * @param {number} [velocityFactor=1] - Multiplier for ripple strength (based on mouse velocity)
 */
export function createWaterRipple(x, y, velocityFactor = 1) {
  const globals = getGlobals();
  const baseStrength = globals.waterRippleStrength || 15000;
  
  // Scale strength based on velocity factor
  const strength = baseStrength * Math.min(velocityFactor, 5);
  
  ripples.push({
    x,
    y,
    radius: 0,
    strength,
    age: 0
  });
}

export function getWaterRipples() {
  return ripples;
}
