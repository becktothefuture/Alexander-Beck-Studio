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

function selectEvenlySpacedPositions(positions, targetCount) {
  if (!Array.isArray(positions) || positions.length <= targetCount) return positions;
  if (!Number.isFinite(targetCount) || targetCount <= 0) return [];

  const byLayer = new Map();
  for (const pos of positions) {
    const layer = Number(pos?.layer ?? 0);
    if (!byLayer.has(layer)) byLayer.set(layer, []);
    byLayer.get(layer).push(pos);
  }

  const layers = Array.from(byLayer.keys()).sort((a, b) => a - b);
  const total = positions.length;
  const selected = [];
  let remainingTarget = targetCount;
  let remainingTotal = total;

  for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
    const layer = layers[layerIndex];
    const layerPositions = byLayer.get(layer) || [];
    const layersRemaining = layers.length - layerIndex;
    const proportionalQuota = Math.round((layerPositions.length / Math.max(1, remainingTotal)) * remainingTarget);
    const quota = Math.max(1, Math.min(layerPositions.length, proportionalQuota || (remainingTarget > 0 ? 1 : 0)));
    const layerTake = Math.min(layerPositions.length, layerIndex === layers.length - 1 ? remainingTarget : quota);

    if (layerTake >= layerPositions.length) {
      selected.push(...layerPositions);
    } else if (layerTake > 0) {
      const step = layerPositions.length / layerTake;
      for (let i = 0; i < layerTake; i++) {
        const sourceIndex = Math.min(layerPositions.length - 1, Math.floor(i * step));
        selected.push(layerPositions[sourceIndex]);
      }
    }

    remainingTarget = Math.max(0, targetCount - selected.length);
    remainingTotal -= layerPositions.length;

    if (remainingTarget <= 0 && layersRemaining > 1) break;
  }

  return selected.slice(0, targetCount);
}

/**
 * Create a ring from many small balls arranged in concentric rows.
 * `ringCount` controls the overall outer size, while `bandRows` controls how
 * many populated rows remain at the perimeter before the center is left empty.
 */
function createCompositeCircle(globals, ringCount) {
  const canvas = globals.canvas;
  if (!canvas) return;
  
  const avgRadius = (globals.R_MIN + globals.R_MAX) * 0.5;
  // Increased spacing for larger gaps between balls
  const spacingMultiplier = globals.elasticCenterSpacingMultiplier || 2.8;
  const spacing = avgRadius * spacingMultiplier; // Larger gaps between ball centers
  const requestedBandRows = Math.round(globals.elasticCenterBandRows ?? 5);
  const bandRows = Math.max(1, Math.min(ringCount, requestedBandRows));
  const startRing = Math.max(0, ringCount - bandRows);
  
  // Calculate target radius based on ring count
  targetRadius = ringCount * spacing;
  
  const ballPositions = [];
  
  // Center ball (ring 0) only exists when the occupied band includes the center.
  if (ringCount > 0 && startRing === 0) {
    ballPositions.push({ x: 0, y: 0, layer: 0, index: 0 });
  }
  
  // Add occupied rings only, leaving the interior hollow when startRing > 0.
  for (let ring = Math.max(1, startRing); ring < ringCount; ring++) {
    const layerRadius = ring * spacing;
    const circumference = layerRadius * 2 * Math.PI;
    // Calculate balls based on spacing distance (not diameter) for consistent gaps
    const ballsInLayer = Math.max(6, Math.floor(circumference / spacing));
    
    for (let i = 0; i < ballsInLayer; i++) {
      const angle = (i / ballsInLayer) * Math.PI * 2;
      const x = Math.cos(angle) * layerRadius;
      const y = Math.sin(angle) * layerRadius;
      ballPositions.push({ x, y, layer: ring, index: ballPositions.length });
    }
  }

  const targetBallCount = getMobileAdjustedCount(ballPositions.length);
  const finalPositions = selectEvenlySpacedPositions(ballPositions, targetBallCount);
  
  // Create balls from positions
  // First set covers the active legend colors.
  for (let i = 0; i < Math.min(8, finalPositions.length); i++) {
    const pos = finalPositions[i];
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
  for (let i = 8; i < finalPositions.length; i++) {
    const pos = finalPositions[i];
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
  
  // Create composite circle based on ring count
  const ringCount = g.elasticCenterRingCount ?? 10;
  if (ringCount <= 0) return;
  
  createCompositeCircle(g, ringCount);
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
