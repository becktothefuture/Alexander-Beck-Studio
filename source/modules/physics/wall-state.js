// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                        RUBBER WALL VISUAL SYSTEM                            ║
// ║                                                                              ║
// ║  Simple elastic wall effect:                                                 ║
// ║  - Corners are ANCHORED (stuck, no elasticity)                               ║
// ║  - Straight sections between corners FLEX inward on impact                   ║
// ║  - Natural spring-back decay                                                 ║
// ║  - Walls anchored to FULL container width/height                             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { WALL_PRESETS } from '../core/constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
const SEGMENTS_PER_WALL = 12;  // Resolution for smooth curves (kept constant for perf)
const SPRING_STIFFNESS = 2200; // Default spring stiffness (tuned for rubber)
const SPRING_DAMPING = 35;     // Default spring damping
const MAX_DEFORM = 45;         // Default max inward flex (px at DPR 1)

// ═══════════════════════════════════════════════════════════════════════════════
// WALL PRESETS - Moved to core/constants.js to avoid circular deps
// ═══════════════════════════════════════════════════════════════════════════════
export { WALL_PRESETS }; // Re-export for convenience if needed, but prefer direct import

/**
 * Apply a named preset to the global state
 * @param {string} presetName key in WALL_PRESETS
 * @param {object} g global state object
 */
export function applyWallPreset(presetName, g) {
  const preset = WALL_PRESETS[presetName];
  if (!preset) return;
  Object.assign(g, preset);
  g.wallPreset = presetName;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WALL EDGE - Straight section between two corners
// Segments near corners (0 and N-1) are pinned, middle segments flex
// ═══════════════════════════════════════════════════════════════════════════════
class WallEdge {
  constructor() {
    this.deformations = new Float32Array(SEGMENTS_PER_WALL);
    this.velocities = new Float32Array(SEGMENTS_PER_WALL);
    this.pressure = new Float32Array(SEGMENTS_PER_WALL); // Track resting pressure per segment
  }
  
  /**
   * Register impact at normalized position (0-1)
   * Corners (0 and 1) don't flex - only middle sections
   */
  impact(normalizedPos, intensity) {
    const g = getGlobals();
    const clamp = Math.max(0, Math.min(0.45, g.wallWobbleCornerClamp ?? 0.1));
    // Clamp position away from corners (keeps corners "stuck")
    const pos = Math.max(clamp, Math.min(1 - clamp, normalizedPos));
    const segmentIdx = pos * (SEGMENTS_PER_WALL - 1);
    const maxDeform = g.wallWobbleMaxDeform ?? MAX_DEFORM;
    const impulse = maxDeform * intensity;
    
    // Gaussian spread with corner falloff
    const sigma = Math.max(0.25, g.wallWobbleSigma ?? 2.0);
    for (let i = 1; i < SEGMENTS_PER_WALL - 1; i++) { // Skip first and last (corners)
      const dist = Math.abs(i - segmentIdx);
      const falloff = Math.exp(-(dist * dist) / (2 * sigma * sigma));
      
      // Additional falloff near corners (segments 0,1 and N-2,N-1)
      const cornerDist = Math.min(i, SEGMENTS_PER_WALL - 1 - i);
      const cornerFalloff = Math.min(1, cornerDist / 2);
      
      this.velocities[i] += impulse * falloff * cornerFalloff;
    }
  }
  
  /**
   * Register resting pressure at normalized position (0-1)
   * Used to apply extra damping where balls are resting against the wall
   */
  addPressure(normalizedPos, amount) {
    const clamp = Math.max(0, Math.min(0.45, 0.1));
    const pos = Math.max(clamp, Math.min(1 - clamp, normalizedPos));
    const segmentIdx = pos * (SEGMENTS_PER_WALL - 1);
    
    // Spread pressure to nearby segments (simpler than impact - just linear falloff)
    const spread = 2; // segments on each side
    const startIdx = Math.max(1, Math.floor(segmentIdx - spread));
    const endIdx = Math.min(SEGMENTS_PER_WALL - 2, Math.ceil(segmentIdx + spread));
    
    for (let i = startIdx; i <= endIdx; i++) {
      const dist = Math.abs(i - segmentIdx);
      const falloff = Math.max(0, 1 - dist / (spread + 1));
      this.pressure[i] = Math.min(1, this.pressure[i] + amount * falloff);
    }
  }
  
  /**
   * Clear pressure (called each frame before re-accumulating)
   */
  clearPressure() {
    this.pressure.fill(0);
  }
  
  /**
   * Spring physics update - corners stay pinned at 0
   * Uses progressive damping for realistic energy dissipation:
   * - Base damping from config
   * - Pressure damping (resting balls add friction)
   * - Progressive damping (increases as velocity decreases to prevent micro-jitters)
   * - Aggressive snap-to-zero for tiny oscillations
   */
  step(dt) {
    const g = getGlobals();
    const stiffness = Math.max(1, g.wallWobbleStiffness ?? SPRING_STIFFNESS);
    const baseDamping = Math.max(0, g.wallWobbleDamping ?? SPRING_DAMPING);
    const maxDeform = Math.max(0, g.wallWobbleMaxDeform ?? MAX_DEFORM);
    
    // Settling speed (0-100) - controls how aggressively walls stop moving
    const settlingSpeed = Math.max(0, Math.min(100, g.wallWobbleSettlingSpeed ?? 50));
    const settleFactor = settlingSpeed / 100; // 0..1
    
    // Calculate critical damping for reference: c_crit = 2 * sqrt(k * m) where m=1
    const criticalDamping = 2 * Math.sqrt(stiffness);
    
    // Extra damping multiplier when there's pressure (resting balls create friction)
    // Scale from 5x (low settling) to 35x (high settling) based on setting
    const pressureDampingMult = 5.0 + (30.0 * settleFactor); 
    
    // First and last segments are ANCHORED (no movement)
    this.deformations[0] = 0;
    this.deformations[SEGMENTS_PER_WALL - 1] = 0;
    this.velocities[0] = 0;
    this.velocities[SEGMENTS_PER_WALL - 1] = 0;
    this.pressure[0] = 0;
    this.pressure[SEGMENTS_PER_WALL - 1] = 0;
    
    // Aggressive snap-to-zero for micro-oscillations
    // Higher settling = larger snap thresholds (snaps sooner)
    const snapScale = 0.5 + (1.5 * settleFactor); // 0.5x .. 2.0x
    
    for (let i = 1; i < SEGMENTS_PER_WALL - 1; i++) {
      const vel = Math.abs(this.velocities[i]);
      const def = Math.abs(this.deformations[i]);
      
      // Progressive damping: multiply by (1 + factor) instead of dividing
      // Increases damping by up to 2x at very small amplitudes
      // More stable than division approach
      const amplitudeFactor = Math.max(0, Math.min(1, 1 - def / 20)); // 0 at large, 1 at small
      const progressiveDamping = baseDamping * (1 + amplitudeFactor * 1.0); // Up to 2x damping
      
      // Apply extra damping where there's pressure (resting balls)
      const pressureDamping = progressiveDamping * (1 + this.pressure[i] * pressureDampingMult);
      
      // Cap at critical damping to prevent over-damping instability
      const effectiveDamping = Math.min(pressureDamping, criticalDamping * 0.95);
      
      // Damped spring: F = -k*x - c*v
      const force = -stiffness * this.deformations[i] - effectiveDamping * this.velocities[i];
      this.velocities[i] += force * dt;
      this.deformations[i] += this.velocities[i] * dt;
      
      // Clamp to prevent runaway
      this.deformations[i] = Math.max(0, Math.min(maxDeform, this.deformations[i]));
      
      // Snap thresholds derived from pressure and settling speed
      const baseDeformThresh = this.pressure[i] > 0.5 ? 0.3 : (this.pressure[i] > 0.1 ? 0.8 : 2.0);
      const baseVelThresh = this.pressure[i] > 0.5 ? 0.5 : (this.pressure[i] > 0.1 ? 3.0 : 10.0);
      
      if (def < baseDeformThresh * snapScale && vel < baseVelThresh * snapScale) {
        this.deformations[i] = 0;
        this.velocities[i] = 0;
      }
    }
  }
  
  /**
   * Get smooth interpolated deformation with Catmull-Rom-like smoothing
   */
  getDeformAt(t) {
    const idx = Math.max(0, Math.min(1, t)) * (SEGMENTS_PER_WALL - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(lo + 1, SEGMENTS_PER_WALL - 1);
    const frac = idx - lo;
    
    // Smooth interpolation
    const smoothT = frac * frac * (3 - 2 * frac); // Smoothstep
    return this.deformations[lo] * (1 - smoothT) + this.deformations[hi] * smoothT;
  }
  
  /**
   * Peak deformation (for optimization)
   */
  getMaxDeformation() {
    let max = 0;
    for (let i = 0; i < SEGMENTS_PER_WALL; i++) {
      if (this.deformations[i] > max) max = this.deformations[i];
    }
    return max;
  }
  
  hasDeformation() {
    // Only render wobble when deformation is visually significant (>2px)
    // This hides micro-oscillations that look like jitter
    // Higher threshold prevents rendering tiny wobbles from resting balls
    return this.getMaxDeformation() > 2.0;
  }
  
  reset() {
    this.deformations.fill(0);
    this.velocities.fill(0);
    this.pressure.fill(0);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WALL STATE SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════
export const wallState = {
  top: new WallEdge(),
  bottom: new WallEdge(),
  left: new WallEdge(),
  right: new WallEdge(),
  
  /**
   * Clear all pressure before re-accumulating (called each frame)
   */
  clearAllPressure() {
    this.top.clearPressure();
    this.bottom.clearPressure();
    this.left.clearPressure();
    this.right.clearPressure();
  },
  
  /**
   * Update all wall physics
   */
  step(dt) {
    this.top.step(dt);
    this.bottom.step(dt);
    this.left.step(dt);
    this.right.step(dt);
  },
  
  reset() {
    this.top.reset();
    this.bottom.reset();
    this.left.reset();
    this.right.reset();
  },
  
  hasAnyDeformation() {
    return this.top.hasDeformation() ||
           this.bottom.hasDeformation() ||
           this.left.hasDeformation() ||
           this.right.hasDeformation();
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// IMPACT REGISTRATION
// Called from Ball.walls() - corners are ignored, only edges flex
// ═══════════════════════════════════════════════════════════════════════════════
export function registerWallImpact(wall, normalizedPos, intensity) {
  // Skip corner impacts - corners are stuck
  if (wall.startsWith('corner')) return;
  
  if (wall === 'top') {
    wallState.top.impact(normalizedPos, intensity);
  } else if (wall === 'bottom') {
    wallState.bottom.impact(normalizedPos, intensity);
  } else if (wall === 'left') {
    wallState.left.impact(normalizedPos, intensity);
  } else if (wall === 'right') {
    wallState.right.impact(normalizedPos, intensity);
  }
}

/**
 * Register resting pressure (balls touching wall but not impacting)
 * This applies extra damping to stop wobble when balls settle
 */
export function registerWallPressure(wall, normalizedPos, amount = 1.0) {
  // Skip corner pressure - corners are stuck
  if (wall.startsWith('corner')) return;
  
  if (wall === 'top') {
    wallState.top.addPressure(normalizedPos, amount);
  } else if (wall === 'bottom') {
    wallState.bottom.addPressure(normalizedPos, amount);
  } else if (wall === 'left') {
    wallState.left.addPressure(normalizedPos, amount);
  } else if (wall === 'right') {
    wallState.right.addPressure(normalizedPos, amount);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WALL RENDERING
// Draws rubber walls anchored at viewport edges with flexible middles
// ═══════════════════════════════════════════════════════════════════════════════
export function drawWalls(ctx, w, h) {
  const g = getGlobals();
  
  // Get chrome color
  const chromeColor = getChromeColorFromCSS();
  
  // Calculate thickness for top/bottom (Y) and left/right (X) walls
  // On mobile, left/right walls are thicker than top/bottom via containerBorderX
  // Use state values directly (they're already calculated with mobile factors)
  const baseThicknessPx = g.containerBorder || 12;  // Top/bottom (CSS pixels)
  const leftRightThicknessPx = g.containerBorderX || baseThicknessPx;  // Left/right (CSS pixels)
  
  // Scale to canvas buffer coordinates (DPR)
  const DPR = g.DPR || 1;
  const thicknessY = baseThicknessPx * DPR;      // Top/bottom
  const thicknessX = leftRightThicknessPx * DPR;  // Left/right
  
  // Walls always at canvas edges - no special mode offsets
  
  ctx.save();
  ctx.fillStyle = chromeColor;
  
  // ─────────────────────────────────────────────────────────────────────────
  // BOTTOM WALL - Only draw when there's deformation (like other walls)
  // ─────────────────────────────────────────────────────────────────────────
  if (wallState.bottom.hasDeformation()) {
    ctx.beginPath();
    ctx.moveTo(0, h + thicknessY);
    
    for (let i = 0; i <= SEGMENTS_PER_WALL; i++) {
      const t = i / SEGMENTS_PER_WALL;
      const x = t * w;
      const deform = wallState.bottom.getDeformAt(t);
      // Scale deformation from CSS pixels to canvas buffer coordinates
      const deformScaled = deform * DPR;
      // Inner edge at h, deform pushes inward
      ctx.lineTo(x, h - deformScaled);
    }
    
    ctx.lineTo(w, h + thicknessY);
    ctx.closePath();
    ctx.fill();
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // TOP WALL  
  // ─────────────────────────────────────────────────────────────────────────
  if (wallState.top.hasDeformation()) {
    ctx.beginPath();
    
    ctx.moveTo(0, -thicknessY);
    
    for (let i = 0; i <= SEGMENTS_PER_WALL; i++) {
      const t = i / SEGMENTS_PER_WALL;
      const x = t * w;
      const deform = wallState.top.getDeformAt(t);
      // Scale deformation from CSS pixels to canvas buffer coordinates
      const deformScaled = deform * DPR;
      // Positive deform = chrome pushes DOWN into canvas
      ctx.lineTo(x, deformScaled);
    }
    
    ctx.lineTo(w, -thicknessY);
    ctx.closePath();
    ctx.fill();
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // LEFT WALL
  // ─────────────────────────────────────────────────────────────────────────
  if (wallState.left.hasDeformation()) {
    ctx.beginPath();
    
    ctx.moveTo(-thicknessX, 0);
    
    for (let i = 0; i <= SEGMENTS_PER_WALL; i++) {
      const t = i / SEGMENTS_PER_WALL;
      const y = t * h;
      const deform = wallState.left.getDeformAt(t);
      // Scale deformation from CSS pixels to canvas buffer coordinates
      const deformScaled = deform * DPR;
      // Positive deform = chrome pushes RIGHT into canvas
      ctx.lineTo(deformScaled, y);
    }
    
    ctx.lineTo(-thicknessX, h);
    ctx.closePath();
    ctx.fill();
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // RIGHT WALL
  // ─────────────────────────────────────────────────────────────────────────
  if (wallState.right.hasDeformation()) {
    ctx.beginPath();
    
    ctx.moveTo(w + thicknessX, 0);
    
    for (let i = 0; i <= SEGMENTS_PER_WALL; i++) {
      const t = i / SEGMENTS_PER_WALL;
      const y = t * h;
      const deform = wallState.right.getDeformAt(t);
      // Scale deformation from CSS pixels to canvas buffer coordinates
      const deformScaled = deform * DPR;
      // Positive deform = chrome pushes LEFT into canvas
      ctx.lineTo(w - deformScaled, y);
    }
    
    ctx.lineTo(w + thicknessX, h);
    ctx.closePath();
    ctx.fill();
  }
  
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
function getChromeColorFromCSS() {
  try {
    const style = getComputedStyle(document.documentElement);
    // Use --wall-color (which equals --frame-color-* which equals --chrome-bg-*)
    return style.getPropertyValue('--wall-color').trim() || '#0a0a0a';
  } catch {
    return '#0a0a0a';  // Must match --frame-color-* in main.css
  }
}

export function updateChromeColor() {
  // No-op now - we read directly from CSS each frame
  // This is kept for API compatibility
}

/**
 * Derive low-level wall wobble parameters from high-level controls
 * @param {number} softness 0-100 (softer = more flex, lower stiffness)
 * @param {number} bounciness 0-100 (bouncier = less damping, less settling)
 * @returns {Object} { wallWobbleStiffness, wallWobbleMaxDeform, wallWobbleDamping, wallWobbleSettlingSpeed }
 */
export function deriveWallParamsFromHighLevel(softness, bounciness) {
  const s = Math.max(0, Math.min(100, softness)) / 100;
  const b = Math.max(0, Math.min(100, bounciness)) / 100;
  
  function lerp(min, max, t) { return min + (max - min) * t; }
  
  return {
    wallWobbleStiffness: Math.round(lerp(2800, 600, s)),
    wallWobbleMaxDeform: Math.round(lerp(40, 140, s)),
    wallWobbleDamping: Math.round(lerp(70, 12, b)),
    // Settling speed inversely related to bounciness by default (bouncier = less settling)
    // But exposed as separate advanced control
    wallWobbleSettlingSpeed: Math.round(lerp(80, 20, b))
  };
}
