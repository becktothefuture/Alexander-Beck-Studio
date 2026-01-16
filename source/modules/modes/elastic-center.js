// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          ELASTIC CENTER MODE                                  ║
// ║     Circle made of many dots, elastically drawn to center with instant        ║
// ║              mouse interaction causing dots to scatter                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { Ball } from '../physics/Ball.js';
import { pickRandomColorWithIndex } from '../visual/colors.js';
import { MODES } from '../core/constants.js';
import { randomRadiusForMode } from '../utils/ball-sizing.js';

// Center position (fixed at canvas center)
let centerX = 0;
let centerY = 0;
let targetRadius = 0; // Target radius for the circle formation

/**
 * Create composite circle from many small balls arranged in a circular pattern
 */
function createCompositeCircle(globals, targetBalls) {
  const canvas = globals.canvas;
  if (!canvas) return;
  
  const DPR = globals.DPR || 1;
  const avgRadius = (globals.R_MIN + globals.R_MAX) * 0.5;
  // Increased spacing for larger gaps between balls
  const spacingMultiplier = globals.elasticCenterSpacingMultiplier || 2.8;
  const spacing = avgRadius * spacingMultiplier; // Larger gaps between ball centers
  
  // Calculate target radius based on ball count (approximately)
  // Each layer adds roughly 6 * layer balls
  let layers = 1;
  let totalCapacity = 1; // center ball
  while (totalCapacity < targetBalls) {
    totalCapacity += 6 * layers;
    layers++;
  }
  targetRadius = layers * spacing;
  
  // Calculate layers needed for target ball count
  let totalPlaced = 0;
  let layer = 0;
  const ballPositions = [];
  
  // Center ball
  if (targetBalls > 0) {
    ballPositions.push({ x: 0, y: 0, layer: 0, index: 0 });
    totalPlaced++;
  }
  
  // Add layers
  layer = 1;
  while (totalPlaced < targetBalls) {
    const layerRadius = layer * spacing;
    const circumference = layerRadius * 2 * Math.PI;
    // Calculate balls based on spacing distance (not diameter) for consistent gaps
    const ballsInLayer = Math.max(6, Math.floor(circumference / spacing));
    
    for (let i = 0; i < ballsInLayer && totalPlaced < targetBalls; i++) {
      const angle = (i / ballsInLayer) * Math.PI * 2;
      const x = Math.cos(angle) * layerRadius;
      const y = Math.sin(angle) * layerRadius;
      ballPositions.push({ x, y, layer, index: totalPlaced });
      totalPlaced++;
    }
    layer++;
  }
  
  // Create balls from positions
  // First 8 get one of each color
  for (let i = 0; i < Math.min(8, ballPositions.length); i++) {
    const pos = ballPositions[i];
    const r = randomRadiusForMode(globals, MODES.ELASTIC_CENTER);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const ball = new Ball(centerX + pos.x, centerY + pos.y, r, color);
    ball.distributionIndex = distributionIndex;
    ball.isElasticCenter = true;
    ball._targetOffsetX = pos.x;
    ball._targetOffsetY = pos.y;
    ball._targetRadius = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
    const massMultiplier = globals.elasticCenterMassMultiplier || 2.0;
    ball.m = globals.MASS_BASELINE_KG * massMultiplier;
    ball.vx = 0;
    ball.vy = 0;
    ball.omega = 0;
    globals.balls.push(ball);
  }
  
  // Rest get random colors
  for (let i = 8; i < ballPositions.length; i++) {
    const pos = ballPositions[i];
    const r = randomRadiusForMode(globals, MODES.ELASTIC_CENTER);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const ball = new Ball(centerX + pos.x, centerY + pos.y, r, color);
    ball.distributionIndex = distributionIndex;
    ball.isElasticCenter = true;
    ball._targetOffsetX = pos.x;
    ball._targetOffsetY = pos.y;
    ball._targetRadius = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
    const massMultiplier = globals.elasticCenterMassMultiplier || 2.0;
    ball.m = globals.MASS_BASELINE_KG * massMultiplier;
    ball.vx = 0;
    ball.vy = 0;
    ball.omega = 0;
    globals.balls.push(ball);
  }
}

export function initializeElasticCenter() {
  const g = getGlobals();
  clearBalls();
  
  const canvas = g.canvas;
  if (!canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  
  // Set center position at canvas center
  centerX = w * 0.5;
  centerY = h * 0.5;
  
  // Create composite circle
  const baseCount = g.elasticCenterBallCount ?? 60;
  const count = getMobileAdjustedCount(baseCount);
  if (count <= 0) return;
  
  createCompositeCircle(g, count);
}

export function applyElasticCenterForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.ELASTIC_CENTER) return;
  if (!ball.isElasticCenter) return;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ELASTIC CENTER FORCE - Pull ball back toward its target position
  // ═══════════════════════════════════════════════════════════════════════════
  const elasticStrength = (g.elasticCenterElasticStrength ?? 2000) * g.DPR;
  
  // Calculate target position relative to center
  const targetX = centerX + ball._targetOffsetX;
  const targetY = centerY + ball._targetOffsetY;
  
  // Calculate displacement from target
  const dx = targetX - ball.x;
  const dy = targetY - ball.y;
  const dist = Math.max(0.1, Math.sqrt(dx * dx + dy * dy));
  
  // Apply elastic spring force (proportional to displacement)
  const force = elasticStrength * dist * dt;
  const nx = dx / dist;
  const ny = dy / dist;
  
  ball.vx += nx * force;
  ball.vy += ny * force;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MOUSE REPULSION - Instant reaction to scatter dots
  // ═══════════════════════════════════════════════════════════════════════════
  if (g.mouseInCanvas) {
    const mouseRepelStrength = (g.elasticCenterMouseRepelStrength ?? 12000) * g.DPR;
    const mouseRepelRadius = (g.elasticCenterMouseRadius ?? 200) * g.DPR;
    
    const mx = g.mouseX;
    const my = g.mouseY;
    const mdx = ball.x - mx;
    const mdy = ball.y - my;
    const mdist2 = mdx * mdx + mdy * mdy;
    const mdist = Math.sqrt(mdist2);
    
    if (mdist < mouseRepelRadius && mdist > 0.1) {
      // Inverse square falloff for smooth transition
      const falloff = 1 - (mdist / mouseRepelRadius);
      const repelForce = mouseRepelStrength * falloff * falloff * dt;
      
      const mnx = mdx / mdist;
      const mny = mdy / mdist;
      
      // Apply instant repulsion
      ball.vx += mnx * repelForce;
      ball.vy += mny * repelForce;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DAMPING - Smooth out oscillations for stability
  // ═══════════════════════════════════════════════════════════════════════════
  const damping = g.elasticCenterDamping ?? 0.94;
  ball.vx *= damping;
  ball.vy *= damping;
}

export function updateElasticCenter(dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.ELASTIC_CENTER) return;
  
  // Update center position if canvas resized (shouldn't happen often, but handle it)
  const canvas = g.canvas;
  if (!canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  centerX = w * 0.5;
  centerY = h * 0.5;
  
  // Optional: Add gentle rotation or other effects here if desired
  // For now, just maintain center position
}