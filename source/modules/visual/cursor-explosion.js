// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      CURSOR EXPLOSION PARTICLE SYSTEM                        ║
// ║     Visceral particle dispersion when cursor enters button areas             ║
// ║     - Pooled typed arrays for zero-allocation performance                    ║
// ║     - Impact-based parameters (velocity, direction, range)                   ║
// ║     - Beautiful cartoony character with visceral motion                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { getCursorColor } from '../rendering/cursor.js';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL STATE (pooled particle system)
// ═══════════════════════════════════════════════════════════════════════════════

const PARTICLE_POOL_SIZE = 64;
let particleCount = 0;

// Typed arrays for performance (no object allocations in hot path)
const xs = new Float32Array(PARTICLE_POOL_SIZE);
const ys = new Float32Array(PARTICLE_POOL_SIZE);
const vxs = new Float32Array(PARTICLE_POOL_SIZE);
const vys = new Float32Array(PARTICLE_POOL_SIZE);
const ages = new Float32Array(PARTICLE_POOL_SIZE);
const lifetimes = new Float32Array(PARTICLE_POOL_SIZE);
const alphas = new Float32Array(PARTICLE_POOL_SIZE);
const radii = new Float32Array(PARTICLE_POOL_SIZE);
const colors = new Array(PARTICLE_POOL_SIZE); // Hex strings (not numeric)

// Mouse velocity tracking for impact-based parameters
let lastMouseVelocity = 0;
let lastMouseDirX = 0;
let lastMouseDirY = 0;

function prefersReducedMotion() {
  try {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  } catch (e) {
    return false;
  }
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

/**
 * Variate a color by small random RGB offsets (characterful but subtle)
 */
function variateColor(hex, variance = 0.15) {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    const vr = Math.round(clamp(r + (Math.random() - 0.5) * variance * 255, 0, 255));
    const vg = Math.round(clamp(g + (Math.random() - 0.5) * variance * 255, 0, 255));
    const vb = Math.round(clamp(b + (Math.random() - 0.5) * variance * 255, 0, 255));
    
    return `#${vr.toString(16).padStart(2, '0')}${vg.toString(16).padStart(2, '0')}${vb.toString(16).padStart(2, '0')}`;
  } catch (e) {
    return hex;
  }
}

/**
 * Update mouse velocity/direction tracking (called from pointer.js)
 */
export function updateMouseVelocity(velocity, dirX, dirY) {
  if (velocity > 0) {
    lastMouseVelocity = velocity;
    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    if (len > 0.01) {
      lastMouseDirX = dirX / len;
      lastMouseDirY = dirY / len;
    }
  }
}

/**
 * Trigger cursor explosion at position with impact-based parameters
 * @param {number} x - Canvas X position
 * @param {number} y - Canvas Y position
 * @param {string} color - Cursor color hex
 * @param {number} velocity - Mouse velocity (px/ms)
 */
export function triggerCursorExplosion(x, y, color, velocity = 0) {
  const g = getGlobals();
  if (!g?.cursorExplosionEnabled) return;
  if (prefersReducedMotion()) return;
  if (!g.canvas || !g.ctx) return;
  
  const dpr = g.DPR || 1;
  
  // Base parameters from config
  const baseSpeed = (g.cursorExplosionSpeed ?? 400) * dpr;
  const baseCount = Math.floor(g.cursorExplosionParticleCount ?? 16);
  const baseSpreadDeg = g.cursorExplosionSpreadDeg ?? 360;
  const baseLifetime = g.cursorExplosionLifetime ?? 0.8;
  
  // Impact adjustments (visceral, responsive to movement)
  // Higher velocity = MORE dramatic effect (more particles, faster, farther)
  const impactMin = g.cursorExplosionImpactMinFactor ?? 0.5;
  const impactMax = g.cursorExplosionImpactMaxFactor ?? 4.0;
  const impactSensitivity = g.cursorExplosionImpactSensitivity ?? 400;
  
  // Calculate velocity factor: scales from min to max based on mouse velocity
  const velocityFactor = clamp(impactMin + (velocity / impactSensitivity), impactMin, impactMax);
  const particlesToCreate = Math.floor(baseCount * velocityFactor);
  const particleSpeed = baseSpeed * velocityFactor;
  const spreadDeg = Math.min(baseSpreadDeg * (0.6 + velocityFactor * 0.4), 360);
  
  // Lifetime also scales with impact (fast = particles travel farther)
  const lifetimeMin = g.cursorExplosionLifetimeImpactMin ?? 0.7;
  const lifetimeMax = g.cursorExplosionLifetimeImpactMax ?? 1.8;
  const lifetimeSensitivity = g.cursorExplosionLifetimeImpactSensitivity ?? 600;
  const scaledLifetime = baseLifetime * clamp(lifetimeMin + (velocity / lifetimeSensitivity), lifetimeMin, lifetimeMax);
  
  // Direction bias: particles favor mouse movement direction (cartoony impact)
  let spreadCenter = Math.random() * Math.PI * 2;
  if (lastMouseDirX !== 0 || lastMouseDirY !== 0) {
    // Calculate angle from movement direction
    const moveAngle = Math.atan2(lastMouseDirY, lastMouseDirX);
    // Bias toward movement direction with some randomness
    const biasStrength = clamp(velocity / 500, 0.3, 0.8);
    spreadCenter = moveAngle + (Math.random() - 0.5) * (1 - biasStrength) * Math.PI * 2;
  }
  
  const spreadRad = (spreadDeg * Math.PI) / 180;
  
  // Create particles (up to pool capacity)
  const maxToCreate = Math.min(particlesToCreate, PARTICLE_POOL_SIZE - particleCount);
  
  for (let i = 0; i < maxToCreate; i++) {
    const idx = particleCount + i;
    if (idx >= PARTICLE_POOL_SIZE) break; // Pool full
    
    // Random angle within spread cone (biased toward movement direction)
    const angleVariation = (Math.random() - 0.5) * spreadRad;
    const angle = spreadCenter + angleVariation;
    
    // Velocity variation for organic feel (80-120% of base)
    const velVariation = 0.8 + Math.random() * 0.4;
    const vel = particleSpeed * velVariation;
    
    // Position (start at cursor, tiny random offset for natural spread)
    const offsetRadius = (g.cursorSize ?? 1.15) * (g.R_MIN ?? 5) * 0.3 * dpr;
    const offsetAngle = Math.random() * Math.PI * 2;
    xs[idx] = x + Math.cos(offsetAngle) * offsetRadius * Math.random();
    ys[idx] = y + Math.sin(offsetAngle) * offsetRadius * Math.random();
    
    // Velocity components
    vxs[idx] = Math.cos(angle) * vel;
    vys[idx] = Math.sin(angle) * vel;
    
    // Lifetime variation (90-110% for natural randomness)
    const lifetimeVariation = 0.9 + Math.random() * 0.2;
    lifetimes[idx] = scaledLifetime * lifetimeVariation;
    ages[idx] = 0;
    
    // Visual properties
    alphas[idx] = 1.0;
    // Particle size: original thickness (2-6px radius, scaled by DPR) - but fewer, slower particles
    const baseRadius = clamp((g.cursorSize ?? 1.15) * 3 * dpr, 2 * dpr, 6 * dpr);
    radii[idx] = baseRadius * (0.8 + Math.random() * 0.4); // 80-120% size variation
    
    // Color with slight variation for character
    colors[idx] = Math.random() < 0.7 ? color : variateColor(color, 0.12);
  }
  
  particleCount += maxToCreate;
}

/**
 * Update particle positions, lifetimes, and cull expired ones
 */
export function updateCursorExplosion(dt) {
  const g = getGlobals();
  if (!g?.cursorExplosionEnabled) return;
  if (!particleCount) return;
  
  const dpr = g.DPR || 1;
  const drag = g.cursorExplosionDrag ?? 0.95; // Velocity decay per frame
  const fadeStartRatio = g.cursorExplosionFadeStartRatio ?? 0.6; // Start fading at 60% lifetime
  
  // Update all particles (compact array in place to remove expired)
  let writeIdx = 0;
  
  for (let readIdx = 0; readIdx < particleCount; readIdx++) {
    const age = ages[readIdx] + dt;
    const lifetime = lifetimes[readIdx];
    
    // Cull expired particles
    if (age >= lifetime) {
      continue; // Skip this particle (effectively removes it)
    }
    
    // Update age
    ages[readIdx] = age;
    
    // Velocity decay (natural motion)
    vxs[readIdx] *= drag;
    vys[readIdx] *= drag;
    
    // Update position
    xs[readIdx] += vxs[readIdx] * dt;
    ys[readIdx] += vys[readIdx] * dt;
    
    // Fade out over lifetime (ease-in for smooth disappearance)
    const lifetimeProgress = age / lifetime;
    let alpha = 1.0;
    
    if (lifetimeProgress >= fadeStartRatio) {
      // Fade from fadeStartRatio to 1.0
      const fadeProgress = (lifetimeProgress - fadeStartRatio) / (1.0 - fadeStartRatio);
      // Ease-in-cubic: t³ for smooth fade
      alpha = 1.0 - (fadeProgress * fadeProgress * fadeProgress);
    }
    
    alphas[readIdx] = Math.max(0, alpha);
    
    // Optional: slight shrink over time (cartoony character)
    if (g.cursorExplosionShrinkEnabled !== false) {
      const shrinkProgress = lifetimeProgress;
      const shrinkAmount = shrinkProgress * 0.3; // Shrink to 70% size
      radii[readIdx] = radii[readIdx] * (1.0 - shrinkAmount);
    }
    
    // Move particle to write position if needed (compact array, remove gaps)
    if (readIdx !== writeIdx) {
      xs[writeIdx] = xs[readIdx];
      ys[writeIdx] = ys[readIdx];
      vxs[writeIdx] = vxs[readIdx];
      vys[writeIdx] = vys[readIdx];
      ages[writeIdx] = ages[readIdx];
      lifetimes[writeIdx] = lifetimes[readIdx];
      alphas[writeIdx] = alphas[readIdx];
      radii[writeIdx] = radii[readIdx];
      colors[writeIdx] = colors[readIdx];
    }
    
    writeIdx++;
  }
  
  // Update particle count (removed expired particles)
  particleCount = writeIdx;
}

/**
 * Draw all active particles (batched by color for performance)
 */
export function drawCursorExplosion(ctx) {
  const g = getGlobals();
  if (!g?.cursorExplosionEnabled) return;
  if (prefersReducedMotion()) return;
  if (!particleCount || !ctx) return;
  
  // Group particles by color for batching (reduces fillStyle changes)
  const byColor = new Map();
  
  for (let i = 0; i < particleCount; i++) {
    const color = colors[i];
    if (!byColor.has(color)) {
      byColor.set(color, []);
    }
    byColor.get(color).push(i);
  }
  
  // Save canvas state
  const prevAlpha = ctx.globalAlpha;
  const prevComp = ctx.globalCompositeOperation;
  
  ctx.globalCompositeOperation = 'source-over';
  
  // Draw particles in color batches
  for (const [color, indices] of byColor) {
    ctx.fillStyle = color;
    
    for (const idx of indices) {
      const alpha = alphas[idx];
      if (alpha <= 0) continue;
      
      const radius = Math.max(0.5, radii[idx]);
      
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(xs[idx], ys[idx], radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Restore canvas state
  ctx.globalAlpha = prevAlpha;
  ctx.globalCompositeOperation = prevComp;
}
