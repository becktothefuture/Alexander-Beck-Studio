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

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
const SEGMENTS_PER_WALL = 12;  // Resolution for smooth curves
const SPRING_STIFFNESS = 400;  // How fast walls spring back
const SPRING_DAMPING = 18;     // How quickly oscillation dies down
const MAX_DEFORM = 30;         // Maximum inward flex (pixels at DPR 1)
const BOUNCE_HIGHLIGHT_DECAY = 5.0; // How fast the highlight fades (per second)

// Bounce highlight state (global for all walls)
let bounceHighlightIntensity = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// WALL EDGE - Straight section between two corners
// Segments near corners (0 and N-1) are pinned, middle segments flex
// ═══════════════════════════════════════════════════════════════════════════════
class WallEdge {
  constructor() {
    this.deformations = new Float32Array(SEGMENTS_PER_WALL);
    this.velocities = new Float32Array(SEGMENTS_PER_WALL);
  }
  
  /**
   * Register impact at normalized position (0-1)
   * Corners (0 and 1) don't flex - only middle sections
   */
  impact(normalizedPos, intensity) {
    // Clamp position to middle section (avoid corners)
    // This ensures corner segments stay "stuck"
    const pos = Math.max(0.1, Math.min(0.9, normalizedPos));
    const segmentIdx = pos * (SEGMENTS_PER_WALL - 1);
    const impulse = MAX_DEFORM * intensity;
    
    // Gaussian spread with corner falloff
    const sigma = 2.0;
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
   * Spring physics update - corners stay pinned at 0
   */
  step(dt) {
    // First and last segments are ANCHORED (no movement)
    this.deformations[0] = 0;
    this.deformations[SEGMENTS_PER_WALL - 1] = 0;
    this.velocities[0] = 0;
    this.velocities[SEGMENTS_PER_WALL - 1] = 0;
    
    for (let i = 1; i < SEGMENTS_PER_WALL - 1; i++) {
      // Damped spring: F = -k*x - c*v
      const force = -SPRING_STIFFNESS * this.deformations[i] - SPRING_DAMPING * this.velocities[i];
      this.velocities[i] += force * dt;
      this.deformations[i] += this.velocities[i] * dt;
      
      // Clamp to prevent runaway
      this.deformations[i] = Math.max(0, Math.min(MAX_DEFORM, this.deformations[i]));
      
      // Kill tiny values
      if (Math.abs(this.deformations[i]) < 0.05 && Math.abs(this.velocities[i]) < 0.1) {
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
    return this.getMaxDeformation() > 0.1;
  }
  
  reset() {
    this.deformations.fill(0);
    this.velocities.fill(0);
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
   * Update all wall physics + bounce highlight decay
   */
  step(dt) {
    this.top.step(dt);
    this.bottom.step(dt);
    this.left.step(dt);
    this.right.step(dt);
    
    // Decay bounce highlight
    bounceHighlightIntensity = Math.max(0, bounceHighlightIntensity - BOUNCE_HIGHLIGHT_DECAY * dt);
    
    // Update CSS variable for visual effect
    updateBounceHighlightCSS();
  },
  
  reset() {
    this.top.reset();
    this.bottom.reset();
    this.left.reset();
    this.right.reset();
    bounceHighlightIntensity = 0;
    updateBounceHighlightCSS();
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
  
  // Skip low-intensity impacts
  if (intensity < 0.05) return;
  
  // Add to bounce highlight (capped at max)
  const g = getGlobals();
  const maxHighlight = g.wallBounceHighlightMax || 0.3;
  bounceHighlightIntensity = Math.min(maxHighlight, bounceHighlightIntensity + intensity * 0.5);
  
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

// ═══════════════════════════════════════════════════════════════════════════════
// BOUNCE HIGHLIGHT CSS UPDATE
// Updates the CSS variable for the wall highlight flash effect
// ═══════════════════════════════════════════════════════════════════════════════
function updateBounceHighlightCSS() {
  const root = document.documentElement;
  if (root) {
    root.style.setProperty('--wall-bounce-intensity', String(bounceHighlightIntensity));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WALL RENDERING
// Draws rubber walls anchored at viewport edges with flexible middles
// ═══════════════════════════════════════════════════════════════════════════════
export function drawWalls(ctx, w, h) {
  const g = getGlobals();
  
  // Skip if no deformation
  if (!wallState.hasAnyDeformation()) return;
  
  // Get chrome color
  const chromeColor = getChromeColorFromCSS();
  
  // Wall thickness (visual stroke width)
  const thickness = (g.wallThickness || 12) * (g.DPR || 1);
  
  // Viewport top (Ball Pit mode starts lower)
  const viewportTop = (g.currentMode === 'pit') ? (h / 3) : 0;
  
  ctx.save();
  ctx.fillStyle = chromeColor;
  
  // ─────────────────────────────────────────────────────────────────────────
  // BOTTOM WALL
  // Anchored at FULL WIDTH (0 to w), flexible in middle
  // ─────────────────────────────────────────────────────────────────────────
  if (wallState.bottom.hasDeformation()) {
    ctx.beginPath();
    
    // Start outside canvas at bottom-left corner (full width)
    ctx.moveTo(0, h + thickness);
    
    // Draw deformed edge across full width
    for (let i = 0; i <= SEGMENTS_PER_WALL; i++) {
      const t = i / SEGMENTS_PER_WALL;
      const x = t * w; // Map 0..1 to 0..w
      const deform = wallState.bottom.getDeformAt(t);
      // Positive deform = chrome pushes UP into canvas
      ctx.lineTo(x, h - deform);
    }
    
    // Close path below canvas at bottom-right
    ctx.lineTo(w, h + thickness);
    ctx.closePath();
    ctx.fill();
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // TOP WALL  
  // Anchored at FULL WIDTH at viewportTop
  // ─────────────────────────────────────────────────────────────────────────
  if (wallState.top.hasDeformation()) {
    ctx.beginPath();
    
    ctx.moveTo(0, viewportTop - thickness);
    
    for (let i = 0; i <= SEGMENTS_PER_WALL; i++) {
      const t = i / SEGMENTS_PER_WALL;
      const x = t * w;
      const deform = wallState.top.getDeformAt(t);
      // Positive deform = chrome pushes DOWN into canvas
      ctx.lineTo(x, viewportTop + deform);
    }
    
    ctx.lineTo(w, viewportTop - thickness);
    ctx.closePath();
    ctx.fill();
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // LEFT WALL
  // Anchored at FULL HEIGHT (viewportTop to h)
  // ─────────────────────────────────────────────────────────────────────────
  if (wallState.left.hasDeformation()) {
    ctx.beginPath();
    
    ctx.moveTo(-thickness, viewportTop);
    
    for (let i = 0; i <= SEGMENTS_PER_WALL; i++) {
      const t = i / SEGMENTS_PER_WALL;
      const y = viewportTop + t * (h - viewportTop);
      const deform = wallState.left.getDeformAt(t);
      // Positive deform = chrome pushes RIGHT into canvas
      ctx.lineTo(deform, y);
    }
    
    ctx.lineTo(-thickness, h);
    ctx.closePath();
    ctx.fill();
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // RIGHT WALL
  // Anchored at FULL HEIGHT (viewportTop to h)
  // ─────────────────────────────────────────────────────────────────────────
  if (wallState.right.hasDeformation()) {
    ctx.beginPath();
    
    ctx.moveTo(w + thickness, viewportTop);
    
    for (let i = 0; i <= SEGMENTS_PER_WALL; i++) {
      const t = i / SEGMENTS_PER_WALL;
      const y = viewportTop + t * (h - viewportTop);
      const deform = wallState.right.getDeformAt(t);
      // Positive deform = chrome pushes LEFT into canvas
      ctx.lineTo(w - deform, y);
    }
    
    ctx.lineTo(w + thickness, h);
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
