// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         CARBONATED BUBBLES MODE                              ║
// ║    Bubbles rise from bottom with wobble, dissipate at top, then recycle      ║
// ║    Scale up from 0 on spawn, scale down to 0 on dissipate                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { Ball } from '../physics/Ball.js';
import { pickRandomColor, getColorByIndex } from '../visual/colors.js';
import { MODES } from '../core/constants.js';

export function initializeBubbles() {
  const g = getGlobals();
  // Clear existing balls
  g.balls.length = 0;
  
  const canvas = g.canvas;
  if (!canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  const count = g.bubblesMaxCount || 150;
  
  // Spawn bubbles distributed across the screen (some already rising)
  // First ensure one of each color
  for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
    const x = Math.random() * w;
    const y = h * 0.3 + Math.random() * h * 0.6; // Middle 60% of screen
    createBubble(x, y, getColorByIndex(colorIndex), true); // Already scaled in
  }
  
  // Fill rest with random colors
  for (let i = 8; i < count; i++) {
    const x = Math.random() * w;
    const y = h * 0.3 + Math.random() * h * 0.6;
    createBubble(x, y, pickRandomColor(), true); // Already scaled in
  }
}

/**
 * Create a bubble ball at position (x, y) with given color
 * @param {boolean} alreadyVisible - If true, skip spawn animation (for initial setup)
 */
function createBubble(x, y, color, alreadyVisible = false) {
  const g = getGlobals();
  
  // Variable bubble sizes
  const minR = g.R_MIN * 0.5;
  const maxR = g.R_MAX * 0.8;
  const targetRadius = minR + Math.random() * (maxR - minR);
  
  const b = new Ball(x, y, alreadyVisible ? targetRadius : 0.1, color);
  b.isBubble = true;
  b.baseRadius = targetRadius;
  b.targetRadius = targetRadius;
  b.wobblePhase = Math.random() * Math.PI * 2;
  b.wobbleFreq = 2 + Math.random() * 3;
  b.vx = (Math.random() - 0.5) * 20;
  b.vy = -50 - Math.random() * 50;
  
  // Animation states
  b.spawning = !alreadyVisible;
  b.spawnProgress = alreadyVisible ? 1 : 0;
  b.dissipating = false;
  b.dissipateProgress = 0;
  b.alpha = 1;
  
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
  
  const w = canvas.width;
  const h = canvas.height;
  
  // New random x position at bottom
  ball.x = Math.random() * w;
  ball.y = h + 20 + Math.random() * 30; // Just below screen
  
  // Reset velocity
  ball.vx = (Math.random() - 0.5) * 20;
  ball.vy = -50 - Math.random() * 50;
  
  // New wobble phase
  ball.wobblePhase = Math.random() * Math.PI * 2;
  ball.wobbleFreq = 2 + Math.random() * 3;
  
  // New random color from full palette
  ball.c = pickRandomColor();
  
  // New target size
  const minR = g.R_MIN * 0.5;
  const maxR = g.R_MAX * 0.8;
  ball.targetRadius = minR + Math.random() * (maxR - minR);
  ball.baseRadius = ball.targetRadius;
  
  // Start spawn animation (scale up from 0)
  ball.r = 0.1;
  ball.spawning = true;
  ball.spawnProgress = 0;
  ball.dissipating = false;
  ball.dissipateProgress = 0;
  ball.alpha = 1;
}

export function applyBubblesForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.BUBBLES) return;
  if (!ball.isBubble) return;
  
  const canvas = g.canvas;
  if (!canvas) return;
  
  // Handle spawn animation (scale up from 0)
  if (ball.spawning) {
    ball.spawnProgress += dt * 3; // Scale up over ~0.33s
    
    // Ease out for smooth appearance
    const ease = 1 - Math.pow(1 - Math.min(1, ball.spawnProgress), 3);
    ball.r = ball.targetRadius * ease;
    ball.rBase = ball.r;
    
    if (ball.spawnProgress >= 1) {
      ball.spawning = false;
      ball.r = ball.targetRadius;
      ball.rBase = ball.targetRadius;
    }
  }
  
  // Handle dissipation animation (scale down to 0)
  if (ball.dissipating) {
    ball.dissipateProgress += dt * 3; // Scale down over ~0.33s
    
    // Ease in for smooth disappearance
    const ease = Math.pow(ball.dissipateProgress, 2);
    ball.r = ball.targetRadius * Math.max(0, 1 - ease);
    ball.rBase = ball.r;
    ball.alpha = Math.max(0, 1 - ease * 0.5); // Slight fade
    
    // Slow down during dissipation
    ball.vy *= 0.92;
    ball.vx *= 0.92;
    
    // When fully dissipated, recycle
    if (ball.dissipateProgress >= 1) {
      recycleBubble(ball);
    }
    return;
  }
  
  const riseSpeed = g.bubblesRiseSpeed || 150;
  const wobbleStrength = (g.bubblesWobble || 40) * 0.01;
  
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
  
  // Cursor deflection
  if (g.mouseInCanvas) {
    const dx = ball.x - g.mouseX;
    const dy = ball.y - g.mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const deflectRadius = (g.bubblesDeflectRadius || 80) * g.DPR;
    
    if (dist < deflectRadius && dist > 1) {
      const force = (1 - dist / deflectRadius) * 300;
      const nx = dx / dist;
      const ny = dy / dist;
      ball.vx += nx * force * dt;
      ball.vy += ny * force * dt;
    }
  }
  
  // Check if bubble reached very top - start dissipating
  const topThreshold = ball.targetRadius * 2; // Very close to top edge
  
  if (ball.y < topThreshold && !ball.dissipating && !ball.spawning) {
    ball.dissipating = true;
    ball.dissipateProgress = 0;
  }
  
  // Safety: recycle if bubble goes off sides
  if (ball.x < -ball.r * 4 || ball.x > canvas.width + ball.r * 4) {
    recycleBubble(ball);
  }
}

export function updateBubbles(dt) {
  // Bubbles recycle automatically via applyBubblesForces
}
