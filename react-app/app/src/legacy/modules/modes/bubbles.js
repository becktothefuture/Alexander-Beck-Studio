// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         CARBONATED BUBBLES MODE                              ║
// ║    Bubbles rise from bottom with wobble, pop instantly at top, then recycle  ║
// ║    Scale up from 0 on every spawn for a clean entrance                       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, getMobileAdjustedCount } from '../core/state.js';
import { Ball } from '../physics/Ball.js';
import { pickRandomColor, pickRandomColorWithIndex } from '../visual/colors.js';
import { MODES } from '../core/constants.js';
import { randomRadiusForMode } from '../utils/ball-sizing.js';

function getBubbleBand(g, canvas) {
  const h = canvas.height;
  const extent = Math.max(0.15, Math.min(1, g.bubblesVerticalExtent ?? 0.7));
  const halfBand = (h * extent) / 2;
  const centerY = h / 2;
  const bandTop = Math.max(0, centerY - halfBand);
  const bandBottom = Math.min(h, centerY + halfBand);
  return { bandTop, bandBottom };
}

function getBubbleZ(g) {
  const span = Math.max(0.1, Math.min(1, g.bubblesDepthSpan ?? 0.8));
  const z = 0.5 + (Math.random() - 0.5) * span;
  return Math.max(0, Math.min(1, z));
}

function getBubbleDepthScale(z) {
  const clampedZ = Math.max(0, Math.min(1, z));
  return 0.7 + clampedZ * 0.6;
}

export function initializeBubbles() {
  const g = getGlobals();
  // Clear existing balls
  g.balls.length = 0;
  
  const canvas = g.canvas;
  if (!canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  const DPR = g.DPR || 1;
  const count = getMobileAdjustedCount(g.bubblesMaxCount || 200); // Increased for continuous coverage
  if (count <= 0) return;
  const { bandTop, bandBottom } = getBubbleBand(g, canvas);
  
  // Initial distribution: spread across the entire height with staggered spawn progress
  // to avoid clumping at the bottom on first frame. Recycles still come from below.
  // First ensure one of each color
  for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
    const x = Math.random() * w;
    const y = bandTop + Math.random() * (bandBottom - bandTop);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const seededProgress = Math.random(); // staggered scale-in phase
    createBubble(x, y, color, distributionIndex, false, seededProgress);
  }
  
  // Fill rest with random colors across height, staggered progress
  for (let i = 8; i < count; i++) {
    const x = Math.random() * w;
    const y = bandTop + Math.random() * (bandBottom - bandTop);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const seededProgress = Math.random();
    createBubble(x, y, color, distributionIndex, false, seededProgress);
  }
}

/**
 * Create a bubble ball at position (x, y) with given color
 * @param {boolean} alreadyVisible - If true, skip spawn animation (for initial setup)
 * @param {number} [spawnProgressSeed] - Optional 0..1 seed to stagger initial spawn
 */
function createBubble(x, y, color, distributionIndex, alreadyVisible = false, spawnProgressSeed) {
  const g = getGlobals();
  const DPR = g.DPR || 1;
  
  // Per-mode sizing system: bubbles vary only according to the Bubbles variation slider.
  const sizeBias = 0.9 + Math.random() * 0.2; // Tight spread: ~0.9–1.1 for similar sizes
  const targetRadius = randomRadiusForMode(g, MODES.BUBBLES) * sizeBias;
  const z = getBubbleZ(g);
  const depthScale = getBubbleDepthScale(z);
  
  const baseProgress = Number.isFinite(spawnProgressSeed) ? Math.max(0, Math.min(1, spawnProgressSeed)) : (alreadyVisible ? 1 : 0);
  const initialEase = 1 - Math.pow(1 - baseProgress, 3);
  const initialRadius = targetRadius * depthScale * initialEase;
  const b = new Ball(x, y, initialRadius, color);
  b.distributionIndex = distributionIndex;
  b.isBubble = true;
  b.z = z; // Random z-depth centered on logo
  b.depthScale = depthScale;
  b.baseRadius = targetRadius;
  b.targetRadius = targetRadius;
  b.wobblePhase = Math.random() * Math.PI * 2;
  b.wobbleFreq = 2 + Math.random() * 3;
  // Initial velocity (DPR-scaled)
  b.vx = (Math.random() - 0.5) * 28 * DPR;
  b.vy = (-160 - Math.random() * 140) * DPR;
  
  // Animation states
  b.spawning = baseProgress < 1 && !alreadyVisible;
  b.spawnProgress = baseProgress;
  b.dissipating = false;
  b.dissipateProgress = 0;
  b.alpha = 1;
  b.microBurst = false;
  b.microTime = 0;
  b.microLife = 0;
  b.microStartRadius = 0;
  b.wobbleMul = 0.6 + Math.random() * 0.8; // Per-bubble wobble strength
  
  g.balls.push(b);
  return b;
}

/**
 * Recycle a bubble - reset it to the bottom with new properties
 */
function recycleBubble(ball) {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;
  
  const DPR = g.DPR || 1;
  const w = canvas.width;
  const { bandBottom } = getBubbleBand(g, canvas);
  
  // New random x position at bottom
  ball.x = Math.random() * w;
  // Spawn 60-90px below screen so scale-in completes as bubble enters view
  // (bubbles rise ~50px during 0.33s spawn animation)
  ball.y = bandBottom + (60 + Math.random() * 30) * DPR;
  
  // Reset velocity (DPR-scaled)
  ball.vx = (Math.random() - 0.5) * 20 * DPR;
  ball.vy = (-50 - Math.random() * 50) * DPR;
  
  // New wobble phase
  ball.wobblePhase = Math.random() * Math.PI * 2;
  ball.wobbleFreq = 2 + Math.random() * 3;
  
  // New random color from full palette (using weighted distribution)
  ball.color = pickRandomColor();
  
  // New target size (bias toward smaller)
  const sizeBias = 0.9 + Math.random() * 0.2;
  ball.targetRadius = randomRadiusForMode(g, MODES.BUBBLES) * sizeBias;
  ball.baseRadius = ball.targetRadius;
  
  // Start spawn animation (scale up from 0 to full size)
  ball.r = 0;
  ball.rBase = 0;
  ball.spawning = true;
  ball.spawnProgress = 0;
  ball.dissipating = false;
  ball.dissipateProgress = 0;
  ball.alpha = 1;
  ball.microBurst = false;
  ball.microTime = 0;
  ball.microLife = 0;
  ball.microStartRadius = 0;
  ball.wobbleMul = 0.6 + Math.random() * 0.8;
  ball.z = getBubbleZ(g); // New random z-depth centered on logo
  ball.depthScale = getBubbleDepthScale(ball.z);
}

export function applyBubblesForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.BUBBLES) return;
  if (!ball.isBubble) return;
  
  const canvas = g.canvas;
  if (!canvas) return;
  const { bandTop } = getBubbleBand(g, canvas);

  // Micro-burst phase: tiny burst that fades quickly, then recycle
  if (ball.microBurst) {
    ball.microTime += dt;
    const life = ball.microLife || 0.18;
    const t = Math.min(1, life > 0 ? ball.microTime / life : 1);
    const shrink = Math.max(0, 1 - t);
    ball.vx *= 0.94;
    ball.vy *= 0.90;
    ball.r = ball.microStartRadius * shrink;
    ball.rBase = ball.r;
    ball.alpha = Math.max(0, 1 - t);
    if (t >= 1) {
      ball.microBurst = false;
      recycleBubble(ball);
    }
    return;
  }
  
  // Handle spawn animation (scale up from 0)
  if (ball.spawning) {
    ball.spawnProgress += dt * 3; // Scale up over ~0.33s
    
    // Ease out for smooth appearance
    const ease = 1 - Math.pow(1 - Math.min(1, ball.spawnProgress), 3);
    const depthScale = ball.depthScale ?? 1;
    ball.r = ball.targetRadius * depthScale * ease;
    ball.rBase = ball.r;
    
    if (ball.spawnProgress >= 1) {
      ball.spawning = false;
      ball.r = ball.targetRadius * (ball.depthScale ?? 1);
      ball.rBase = ball.r;
    }
  }
  
  const riseSpeed = g.bubblesRiseSpeed || 150;
  const wobbleStrength = ((g.bubblesWobble || 40) * 0.01) * (ball.wobbleMul || 1);
  
  // Buoyancy force (rise upward)
  const buoyancy = riseSpeed * g.DPR;
  ball.vy -= buoyancy * dt;
  
  // Wobble (side-to-side oscillation)
  ball.wobblePhase += ball.wobbleFreq * dt;
  const wobble = Math.sin(ball.wobblePhase) * wobbleStrength * 100;
  ball.vx += wobble * dt;
  
  // Horizontal drag
  ball.vx *= 0.92;
  
  // Vertical drag
  ball.vy *= 0.96;
  
  // Cursor collision force (powerful solid-object push)
  if (g.mouseInCanvas) {
    const dx = ball.x - g.mouseX;
    const dy = ball.y - g.mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Cursor deflect radius is derived from vw-based layout in `applyLayoutFromVwToPx()`.
    // Keep this hot path allocation-free and avoid per-frame vw→px conversions.
    const collisionRadius = Math.max(0, (g.bubblesDeflectRadius || 0)) * g.DPR;
    
    if (dist < collisionRadius && dist > 1) {
      // Cubic falloff for very strong close-range collision feel
      const normalizedDist = dist / collisionRadius;
      const falloff = Math.pow(1 - normalizedDist, 3);
      
      // Much stronger base force for solid collision feel
      const baseForce = 3000;
      const force = falloff * baseForce;
      
      // Direction away from cursor
      const nx = dx / dist;
      const ny = dy / dist;
      
      // Apply strong repulsion
      ball.vx += nx * force * dt;
      ball.vy += ny * force * dt;
      
      // Add extra "impact" velocity when very close (collision feel)
      if (dist < collisionRadius * 0.3) {
        const impactBoost = (1 - dist / (collisionRadius * 0.3)) * 500;
        ball.vx += nx * impactBoost * dt;
        ball.vy += ny * impactBoost * dt;
      }
    }
  }
  
  // Check if bubble reached top of band - instantly pop and recycle
  const depthScale = ball.depthScale ?? 1;
  const topThreshold = bandTop + Math.max(2, ball.targetRadius * depthScale * 0.5);
  
  if (ball.y < topThreshold && !ball.spawning && !ball.microBurst) {
    // Start micro-burst pop: quick fade/shrink, then recycle to bottom
    ball.microBurst = true;
    ball.microTime = 0;
    ball.microLife = 0.18;
    ball.microStartRadius = Math.max(0.2, ball.targetRadius * depthScale * 0.5);
    ball.r = ball.microStartRadius;
    ball.rBase = ball.r;
    ball.alpha = 1;
    ball.vx = (Math.random() - 0.5) * 40 * g.DPR;
    ball.vy = -(260 + Math.random() * 140) * g.DPR;
    return;
  }
  
  // Safety: recycle if bubble goes off sides
  if (ball.x < -ball.r * 4 || ball.x > canvas.width + ball.r * 4) {
    recycleBubble(ball);
  }
}

export function updateBubbles(dt) {
  // Bubbles recycle automatically via applyBubblesForces
}
