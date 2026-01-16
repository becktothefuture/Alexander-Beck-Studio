// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            METEOR SHOWER MODE                                  ║
// ║     Balls spawn from top at random intervals, fall with high velocity         ║
// ║              creating dramatic wall deformations on impact                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { Ball } from '../physics/Ball.js';
import { pickRandomColorWithIndex } from '../visual/colors.js';
import { MODES } from '../core/constants.js';
import { randomRadiusForMode } from '../utils/ball-sizing.js';

// Spawn timer for random interval spawning
let spawnTimer = 0;

export function initializeMeteorShower() {
  const g = getGlobals();
  clearBalls();
  
  const canvas = g.canvas;
  if (!canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  const DPR = g.DPR || 1;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE SURFACE BALLS AT BOTTOM - Static surface for meteors to bounce into
  // ═══════════════════════════════════════════════════════════════════════════
  const wallInset = Math.max(0, (g.wallThickness ?? 0) * DPR);
  const borderInset = Math.max(0, (g.wallInset ?? 3) * DPR);
  const bottomMargin = wallInset + borderInset;
  const surfaceY = h - bottomMargin;
  
  // Create a row of surface balls across the bottom
  // Use average radius to calculate spacing
  const avgRadius = randomRadiusForMode(g, MODES.METEOR_SHOWER);
  const spacing = avgRadius * 2.2; // Slight overlap for continuous surface
  const surfaceWidth = w - (wallInset + borderInset) * 2;
  const surfaceBallCount = Math.floor(surfaceWidth / spacing);
  
  for (let i = 0; i < surfaceBallCount; i++) {
    const x = wallInset + borderInset + (i + 0.5) * spacing;
    const r = randomRadiusForMode(g, MODES.METEOR_SHOWER);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const ball = new Ball(x, surfaceY - r, r, color);
    ball.distributionIndex = distributionIndex;
    ball.isMeteor = false; // Mark as surface ball, not a meteor
    ball.isSurface = true; // Additional marker for clarity
    
    // Surface balls have normal mass (not heavy like meteors)
    ball.m = g.MASS_BASELINE_KG;
    
    // Zero velocity - they should stay at the bottom
    ball.vx = 0;
    ball.vy = 0;
    ball.omega = 0;
    
    g.balls.push(ball);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SPAWN FIRST METEOR - Timer handles subsequent spawns
  // ═══════════════════════════════════════════════════════════════════════════
  const maxBalls = getMobileAdjustedCount(g.meteorShowerMaxBalls || 30);
  const minInterval = g.meteorShowerSpawnMinInterval || 0.3;
  const maxInterval = g.meteorShowerSpawnMaxInterval || 1.2;
  
  // Spawn first ball immediately
  if (maxBalls > 0) {
    const topMargin = wallInset + borderInset + 20 * DPR;
    const x = topMargin + Math.random() * (w - topMargin * 2);
    const y = topMargin;
    
    const r = randomRadiusForMode(g, MODES.METEOR_SHOWER);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const ball = new Ball(x, y, r, color);
    ball.distributionIndex = distributionIndex;
    ball.isMeteor = true;
    
    const massMultiplier = g.meteorShowerMassMultiplier || 7.0;
    ball.m = g.MASS_BASELINE_KG * massMultiplier;
    
    const baseVelocity = (g.meteorShowerInitialVelocity || 1000) * DPR;
    const velocityVariation = 0.8 + Math.random() * 0.4;
    ball.vy = baseVelocity * velocityVariation;
    ball.vx = (Math.random() - 0.5) * 50 * DPR;
    ball.omega = 0;
    
    // Prevent meteors from sleeping so they always register wall impacts
    ball.isSleeping = false;
    ball.sleepTimer = 0;
    
    g.balls.push(ball);
  }
  
  // Set timer for next spawn
  const nextInterval = minInterval + Math.random() * (maxInterval - minInterval);
  spawnTimer = nextInterval;
}

export function applyMeteorShowerForces(ball, dt) {
  // No-op: gravity handles the falling motion
  // Wall collisions handled by existing Ball.walls() system
}

export function updateMeteorShower(dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.METEOR_SHOWER) return;
  
  const canvas = g.canvas;
  if (!canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  const DPR = g.DPR || 1;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SPAWN LOGIC - Random intervals between min and max
  // ═══════════════════════════════════════════════════════════════════════════
  const maxBalls = getMobileAdjustedCount(g.meteorShowerMaxBalls || 30);
  const minInterval = g.meteorShowerSpawnMinInterval || 0.3;
  const maxInterval = g.meteorShowerSpawnMaxInterval || 1.2;
  
  // Calculate next spawn interval (random between min and max)
  if (spawnTimer <= 0) {
    // Time to spawn a new meteor
    // Count only meteors (exclude surface balls from the limit)
    const meteorCount = g.balls.filter(ball => ball.isMeteor).length;
    if (meteorCount < maxBalls) {
      // Random X position at top of viewport
      const wallInset = Math.max(0, (g.wallThickness ?? 0) * DPR);
      const borderInset = Math.max(0, (g.wallInset ?? 3) * DPR);
      const topMargin = wallInset + borderInset + 20 * DPR; // Small margin from top
      const x = topMargin + Math.random() * (w - topMargin * 2);
      const y = topMargin;
      
      // Ball properties
      const r = randomRadiusForMode(g, MODES.METEOR_SHOWER);
      const { color, distributionIndex } = pickRandomColorWithIndex();
      const ball = new Ball(x, y, r, color);
      ball.distributionIndex = distributionIndex;
      ball.isMeteor = true;
      
      // High mass for dramatic wall deformation
      const massMultiplier = g.meteorShowerMassMultiplier || 7.0;
      ball.m = g.MASS_BASELINE_KG * massMultiplier;
      
      // High initial velocity downward (with slight variation)
      const baseVelocity = (g.meteorShowerInitialVelocity || 1000) * DPR;
      const velocityVariation = 0.8 + Math.random() * 0.4; // ±20% variation
      ball.vy = baseVelocity * velocityVariation;
      ball.vx = (Math.random() - 0.5) * 50 * DPR; // Small horizontal drift
      ball.omega = 0; // No rotation
      
      // Prevent meteors from sleeping so they always register wall impacts
      ball.isSleeping = false;
      ball.sleepTimer = 0;
      
      g.balls.push(ball);
    }
    
    // Reset timer with random interval
    const nextInterval = minInterval + Math.random() * (maxInterval - minInterval);
    spawnTimer = nextInterval;
  } else {
    // Decrement timer
    spawnTimer -= dt;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DESPAWN LOGIC - Remove meteors that hit the bottom (keep surface balls)
  // ═══════════════════════════════════════════════════════════════════════════
  const wallInset = Math.max(0, (g.wallThickness ?? 0) * DPR);
  const borderInset = Math.max(0, (g.wallInset ?? 3) * DPR);
  const bottomThreshold = h - wallInset - borderInset;
  
  // Filter out meteors that have hit the bottom (preserve surface balls)
  g.balls = g.balls.filter(ball => {
    // Keep surface balls (they stay at the bottom)
    if (ball.isSurface || !ball.isMeteor) {
      return true;
    }
    // Keep meteor if it hasn't reached bottom yet
    return ball.y < bottomThreshold;
  });
}
