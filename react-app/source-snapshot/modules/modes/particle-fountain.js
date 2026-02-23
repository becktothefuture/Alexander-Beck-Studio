// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       PARTICLE FOUNTAIN MODE                                  ║
// ║    Simple water-like particles emit from bottom, rise, fall, recycle on ground ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, getMobileAdjustedCount } from '../core/state.js';
import { Ball } from '../physics/Ball.js';
import { pickRandomColorWithIndex } from '../visual/colors.js';
import { MODES } from '../core/constants.js';
import { randomRadiusForMode } from '../utils/ball-sizing.js';

// Emission timer for continuous particle spawning
let emissionTimer = 0;
const FADE_DURATION = 2.0;
const MOBILE_PEAK_HEIGHT_RATIO = 0.6;

/**
 * Initialize particle fountain mode - start emitting immediately
 */
export function initializeParticleFountain() {
  const g = getGlobals();
  const canvas = g.canvas;
  // Clear existing balls
  g.balls.length = 0;
  
  if (!canvas) {
    emissionTimer = -0.1;
    return;
  }
  
  // Create a few initial particles immediately for instant visibility
  // This ensures particles appear right away rather than waiting for first update
  const maxParticles = getMobileAdjustedCount(g.particleFountainMaxParticles || 100);
  const initialCount = Math.min(5, maxParticles); // Start with 5 particles or max, whichever is smaller
  
  for (let i = 0; i < initialCount; i++) {
    createParticle();
  }
  
  // Reset emission timer to start continuous emission
  emissionTimer = 0;
}

/**
 * Create a new particle at the fountain source
 */
function createParticle() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return null;
  
  const DPR = g.DPR || 1;
  const w = canvas.width;
  const h = canvas.height;
  
  // Get radius for this mode
  const targetRadius = randomRadiusForMode(g, MODES.PARTICLE_FOUNTAIN);
  
  // Calculate bottom center position (accounting for wall inset)
  // Position slightly above bottom so particles don't immediately trigger recycling
  const wallInset = Math.max(0, (g.wallThickness ?? 0) * DPR);
  const borderInset = Math.max(0, (g.wallInset ?? 3) * DPR);
  const bottomInset = wallInset + borderInset;
  const fountainX = w / 2;
  // Start slightly above the ground threshold so particles have room to rise
  const fountainY = h - bottomInset - (targetRadius * 0.5);
  
  // Get color
  const { color, distributionIndex } = pickRandomColorWithIndex();
  
  const ball = new Ball(fountainX, fountainY, targetRadius, color);
  ball.distributionIndex = distributionIndex;
  ball.isParticleFountain = true;
  ball.alpha = 1.0;
  
  // Lifetime tracking - age starts at 0, increments each frame
  ball.age = 0;
  ball.fading = false;
  ball.fadeProgress = 0;
  ball.originalRadius = targetRadius; // Store original radius for fade animation
  
  // Assign initial velocity with spread
  const baseVelocity = getFountainBaseVelocity(g, canvas, fountainY);
  const velocityVariation = 0.9 + Math.random() * 0.2; // ±10% variation
  const velocity = baseVelocity * velocityVariation;
  
  // Spread angle in radians (symmetric around vertical)
  const spreadAngleDeg = g.particleFountainSpreadAngle ?? 50;
  const spreadAngleRad = (spreadAngleDeg * Math.PI) / 180;
  const angle = (Math.random() - 0.5) * spreadAngleRad;
  
  // Vertical component (upward, negative y)
  ball.vy = -velocity * Math.cos(angle);
  // Horizontal component
  ball.vx = velocity * Math.sin(angle);
  
  g.balls.push(ball);
  return ball;
}

/**
 * Recycle a particle - reset it to bottom center with new properties
 */
function recycleParticle(ball) {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;
  
  const DPR = g.DPR || 1;
  const w = canvas.width;
  const h = canvas.height;
  
  // Get target radius for this mode (need to recalculate since ball might have shrunk during fade)
  const targetRadius = randomRadiusForMode(g, MODES.PARTICLE_FOUNTAIN);
  
  // Calculate bottom center position
  // Position slightly above bottom so particles don't immediately trigger recycling
  const wallInset = Math.max(0, (g.wallThickness ?? 0) * DPR);
  const borderInset = Math.max(0, (g.wallInset ?? 3) * DPR);
  const bottomInset = wallInset + borderInset;
  const fountainX = w / 2;
  // Start slightly above the ground threshold so particles have room to rise
  const fountainY = h - bottomInset - (targetRadius * 0.5);
  
  // Reset position
  ball.x = fountainX;
  ball.y = fountainY;
  
  // Reset alpha and radius
  ball.alpha = 1.0;
  ball.r = targetRadius;
  ball.rBase = targetRadius;
  
  // Reset lifetime tracking
  ball.age = 0;
  ball.fading = false;
  ball.fadeProgress = 0;
  ball.originalRadius = targetRadius;
  
  // Assign new initial velocity with spread
  const baseVelocity = getFountainBaseVelocity(g, canvas, fountainY);
  const velocityVariation = 0.9 + Math.random() * 0.2;
  const velocity = baseVelocity * velocityVariation;
  
  // Spread angle
  const spreadAngleDeg = g.particleFountainSpreadAngle ?? 50;
  const spreadAngleRad = (spreadAngleDeg * Math.PI) / 180;
  const angle = (Math.random() - 0.5) * spreadAngleRad;
  
  ball.vy = -velocity * Math.cos(angle);
  ball.vx = velocity * Math.sin(angle);
  
  // Optional: assign new color occasionally for variety
  if (Math.random() < 0.3) {
    const { color, distributionIndex } = pickRandomColorWithIndex();
    ball.color = color;
    ball.distributionIndex = distributionIndex;
  }
}

function getFountainBaseVelocity(g, canvas, fountainY) {
  const DPR = g.DPR || 1;
  const baseVelocity = (g.particleFountainInitialVelocity || 600) * DPR;
  const isMobile = g.isMobile || g.isMobileViewport;
  if (!isMobile) {
    return baseVelocity;
  }
  const h = canvas.height;
  const targetPeakY = h * MOBILE_PEAK_HEIGHT_RATIO;
  const riseDistance = Math.max(0, fountainY - targetPeakY);
  const gravity = Math.max(0.01, Math.abs(g.G || (g.GE * (g.gravityMultiplier || 1))));
  const targetVelocity = Math.sqrt(2 * gravity * riseDistance);
  return Math.min(baseVelocity, targetVelocity);
}

export function applyParticleFountainForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.PARTICLE_FOUNTAIN) return;
  if (!ball.isParticleFountain) return;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LIFETIME TRACKING & FADE ANIMATION
  // ═══════════════════════════════════════════════════════════════════════════
  const lifetime = g.particleFountainLifetime ?? 8.0;
  const fadeDuration = FADE_DURATION; // 2 seconds fade animation
  
  // Increment age if not already fading
  if (!ball.fading) {
    ball.age += dt;
    
    // Check if lifetime has expired - start fade animation
    if (ball.age >= lifetime) {
      ball.fading = true;
      ball.fadeProgress = 0;
      // Ensure originalRadius is set for fade
      if (!ball.originalRadius) {
        ball.originalRadius = ball.rBase || ball.r;
      }
    }
  }
  
  // Handle fade animation (2s, ease-in-circ)
  if (ball.fading) {
    ball.fadeProgress += dt;
    const t = Math.min(1.0, ball.fadeProgress / fadeDuration);
    
    // Ease-in-circ: 1 - sqrt(1 - t²)
    const easeInCirc = 1 - Math.sqrt(1 - (t * t));
    
    // Fade alpha from 1.0 to 0.0
    ball.alpha = Math.max(0, 1.0 - easeInCirc);
    
    // If fade is complete, particle will be removed in updateParticleFountain
    if (t >= 1.0) {
      ball.alpha = 0;
    }
    
    // Skip physics during fade (particle is disappearing)
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MOUSE REPULSION - Gentle deflection
  // ═══════════════════════════════════════════════════════════════════════════
  if (g.mouseInCanvas) {
    // Radius is already in px (derived from vw in applyLayoutFromVwToPx)
    // Multiply by DPR to account for device pixel ratio
    const mouseRepelStrength = (g.particleFountainMouseRepelStrength ?? 15000) * g.DPR;
    const mouseRepelRadius = (g.particleFountainMouseRepelRadius ?? 0) * g.DPR;
    
    const mx = g.mouseX;
    const my = g.mouseY;
    const mdx = ball.x - mx;
    const mdy = ball.y - my;
    const mdist2 = mdx * mdx + mdy * mdy;
    const mdist = Math.sqrt(mdist2);
    
    if (mdist < mouseRepelRadius && mdist > 0.1) {
      const falloff = 1 - (mdist / mouseRepelRadius);
      const repelForce = mouseRepelStrength * falloff * dt;
      
      const mnx = mdx / mdist;
      const mny = mdy / mdist;
      
      ball.vx += mnx * repelForce;
      ball.vy += mny * repelForce;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // WATER-LIKE DRAG - Smooth fluid motion
  // ═══════════════════════════════════════════════════════════════════════════
  const waterDrag = g.particleFountainWaterDrag ?? 0.02;
  ball.vx *= (1 - waterDrag);
  ball.vy *= (1 - waterDrag);
  ball.omega *= (1 - waterDrag * 0.5);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIONAL UPWARD FORCE - Buoyancy-style force (if enabled)
  // ═══════════════════════════════════════════════════════════════════════════
  const upwardForce = g.particleFountainUpwardForce || 0;
  if (upwardForce > 0) {
    const force = upwardForce * g.DPR;
    ball.vy -= force * dt; // Negative y is upward
  }
}

export function updateParticleFountain(dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.PARTICLE_FOUNTAIN) return;
  
  const canvas = g.canvas;
  if (!canvas) return;
  
  const DPR = g.DPR || 1;
  const w = canvas.width;
  const h = canvas.height;
  const wallInset = Math.max(0, (g.wallThickness ?? 0) * DPR);
  const borderInset = Math.max(0, (g.wallInset ?? 3) * DPR);
  const bottomThreshold = h - wallInset - borderInset;
  const velocityThreshold = 20 * DPR; // Very slow upward velocity
  
  // ═══════════════════════════════════════════════════════════════════════════
  // REMOVE PARTICLES - Faded out or hit ground
  // ═══════════════════════════════════════════════════════════════════════════
  // Remove particles that have fully faded (alpha <= 0) or hit the ground
  for (let i = g.balls.length - 1; i >= 0; i--) {
    const ball = g.balls[i];
    if (!ball.isParticleFountain) continue;
    
    // Remove particles that have fully faded out (alpha <= 0 and faded)
    if (ball.fading && ball.alpha <= 0) {
      g.balls.splice(i, 1);
      continue;
    }
    
    // Recycle particles that have landed on the ground (only if not fading)
    // Only recycle if clearly on ground: past threshold AND moving downward or very slow
    if (!ball.fading && ball.y >= bottomThreshold) {
      // Only recycle if moving downward (positive vy) or very slow (nearly stopped)
      // This prevents recycling particles that are still bouncing upward
      if (ball.vy >= -velocityThreshold) {
        recycleParticle(ball);
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // IMMEDIATE EMISSION - Spawn particles continuously from the start
  // ═══════════════════════════════════════════════════════════════════════════
  const emissionRate = g.particleFountainEmissionRate || 30; // particles per second
  const lifetime = g.particleFountainLifetime ?? 8.0;
  const targetMaxParticles = Math.max(1, Math.round(emissionRate * (lifetime + FADE_DURATION)));
  const isMobile = g.isMobile || g.isMobileViewport;
  const maxParticles = getMobileAdjustedCount(
    isMobile ? targetMaxParticles : (g.particleFountainMaxParticles || targetMaxParticles)
  );
  
  // Emit new particles immediately if under max
  emissionTimer += dt;
  const timePerParticle = 1.0 / emissionRate;
  let activeCount = 0;
  let recyclableCandidate = null;
  let oldestCandidate = null;
  let oldestAge = -Infinity;
  for (let i = 0; i < g.balls.length; i++) {
    const ball = g.balls[i];
    if (ball.isParticleFountain) {
      activeCount += 1;
      if (!recyclableCandidate) {
        const isGrounded = ball.y >= bottomThreshold && ball.vy >= -velocityThreshold;
        if (ball.fading || isGrounded) {
          recyclableCandidate = ball;
        }
      }
      const age = ball.age ?? 0;
      if (age > oldestAge) {
        oldestAge = age;
        oldestCandidate = ball;
      }
    }
  }
  
  // Emit particles up to max
  while (emissionTimer >= timePerParticle) {
    if (activeCount < maxParticles) {
      createParticle();
      activeCount += 1;
    } else {
      const candidate = recyclableCandidate || oldestCandidate;
      if (candidate) {
        recycleParticle(candidate);
      }
    }
    emissionTimer -= timePerParticle;
  }
  
  // Reset timer if it accumulates too much (safety measure)
  if (emissionTimer > timePerParticle * 2) {
    emissionTimer = 0;
  }
}
