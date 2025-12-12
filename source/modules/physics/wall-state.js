// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          RUBBERY WALL STATE                                 ║
// ║     Deformable boundaries that wobble on ball impact and spring back        ║
// ║                                                                              ║
// ║  ARCHITECTURE:                                                               ║
// ║  - Each wall has N segments with independent deformation                     ║
// ║  - Impact spreads as Gaussian to neighboring segments                        ║
// ║  - Damped spring physics for natural elastic return                          ║
// ║  - Corner deformation via single "corner bulge" value (simple, performant)   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
const SEGMENTS_PER_WALL = 10; // Resolution: 10 points per wall edge
const CORNER_SEGMENTS = 8;    // Points to draw each rounded corner arc

// ═══════════════════════════════════════════════════════════════════════════════
// WALL SEGMENT CLASS
// ═══════════════════════════════════════════════════════════════════════════════
class WallEdge {
  constructor() {
    // Segment deformations (inward displacement in pixels)
    this.deformations = new Float32Array(SEGMENTS_PER_WALL);
    // Segment velocities (for spring physics)
    this.velocities = new Float32Array(SEGMENTS_PER_WALL);
  }
  
  /**
   * Register an impact at a normalized position (0-1) along the wall
   * @param {number} normalizedPos - Position along wall (0 = start, 1 = end)
   * @param {number} intensity - Impact intensity (0-1)
   * @param {number} maxDeform - Maximum deformation in pixels
   */
  impact(normalizedPos, intensity, maxDeform) {
    const segmentIdx = normalizedPos * (SEGMENTS_PER_WALL - 1);
    const impulse = maxDeform * intensity;
    
    // Gaussian spread to neighboring segments (sigma ≈ 1.5 segments)
    const sigma = 1.5;
    for (let i = 0; i < SEGMENTS_PER_WALL; i++) {
      const dist = Math.abs(i - segmentIdx);
      const falloff = Math.exp(-(dist * dist) / (2 * sigma * sigma));
      this.velocities[i] += impulse * falloff;
    }
  }
  
  /**
   * Update spring physics for all segments
   * @param {number} dt - Delta time in seconds
   * @param {number} stiffness - Spring constant (higher = faster return)
   * @param {number} damping - Damping coefficient (higher = less oscillation)
   */
  step(dt, stiffness, damping) {
    for (let i = 0; i < SEGMENTS_PER_WALL; i++) {
      // Damped harmonic oscillator: F = -k*x - c*v
      const springForce = -stiffness * this.deformations[i];
      const dampingForce = -damping * this.velocities[i];
      const acceleration = springForce + dampingForce;
      
      this.velocities[i] += acceleration * dt;
      this.deformations[i] += this.velocities[i] * dt;
      
      // Clamp deformation to prevent explosion (safety)
      this.deformations[i] = Math.max(-100, Math.min(100, this.deformations[i]));
    }
  }
  
  /**
   * Get interpolated deformation at any position along wall
   * @param {number} normalizedPos - Position (0-1)
   * @returns {number} Deformation in pixels
   */
  getDeformAt(normalizedPos) {
    const idx = Math.max(0, Math.min(1, normalizedPos)) * (SEGMENTS_PER_WALL - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(lo + 1, SEGMENTS_PER_WALL - 1);
    const t = idx - lo;
    return this.deformations[lo] * (1 - t) + this.deformations[hi] * t;
  }
  
  /**
   * Check if this wall has any visible deformation
   */
  hasDeformation() {
    for (let i = 0; i < SEGMENTS_PER_WALL; i++) {
      if (Math.abs(this.deformations[i]) > 0.1) return true;
    }
    return false;
  }
  
  /**
   * Reset all deformations
   */
  reset() {
    this.deformations.fill(0);
    this.velocities.fill(0);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORNER BULGE CLASS
// Simple single-value deformation for each corner (not segmented)
// ═══════════════════════════════════════════════════════════════════════════════
class CornerBulge {
  constructor() {
    this.deformation = 0; // Radial outward displacement
    this.velocity = 0;
  }
  
  impact(intensity, maxDeform) {
    this.velocity += maxDeform * intensity;
  }
  
  step(dt, stiffness, damping) {
    const springForce = -stiffness * this.deformation;
    const dampingForce = -damping * this.velocity;
    this.velocity += (springForce + dampingForce) * dt;
    this.deformation += this.velocity * dt;
    this.deformation = Math.max(-50, Math.min(50, this.deformation));
  }
  
  reset() {
    this.deformation = 0;
    this.velocity = 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WALL STATE SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════
export const wallState = {
  // Four edges
  top: new WallEdge(),
  bottom: new WallEdge(),
  left: new WallEdge(),
  right: new WallEdge(),
  
  // Four corners (simple bulge, not segmented)
  cornerTL: new CornerBulge(),
  cornerTR: new CornerBulge(),
  cornerBL: new CornerBulge(),
  cornerBR: new CornerBulge(),
  
  // Configuration (can be modified via globals)
  enabled: true,
  
  /**
   * Update physics for all walls and corners
   */
  step(dt) {
    const g = getGlobals();
    const stiffness = g.wallStiffness || 600;
    const damping = g.wallDamping || 20;
    
    this.top.step(dt, stiffness, damping);
    this.bottom.step(dt, stiffness, damping);
    this.left.step(dt, stiffness, damping);
    this.right.step(dt, stiffness, damping);
    
    this.cornerTL.step(dt, stiffness, damping);
    this.cornerTR.step(dt, stiffness, damping);
    this.cornerBL.step(dt, stiffness, damping);
    this.cornerBR.step(dt, stiffness, damping);
  },
  
  /**
   * Reset all deformations
   */
  reset() {
    this.top.reset();
    this.bottom.reset();
    this.left.reset();
    this.right.reset();
    this.cornerTL.reset();
    this.cornerTR.reset();
    this.cornerBL.reset();
    this.cornerBR.reset();
  },
  
  /**
   * Check if any wall has deformation (for rendering optimization)
   */
  hasAnyDeformation() {
    return this.top.hasDeformation() ||
           this.bottom.hasDeformation() ||
           this.left.hasDeformation() ||
           this.right.hasDeformation() ||
           Math.abs(this.cornerTL.deformation) > 0.1 ||
           Math.abs(this.cornerTR.deformation) > 0.1 ||
           Math.abs(this.cornerBL.deformation) > 0.1 ||
           Math.abs(this.cornerBR.deformation) > 0.1;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// IMPACT REGISTRATION (called from Ball.walls())
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Register a wall impact for elastic wobble effect
 * @param {'top'|'bottom'|'left'|'right'|'cornerTL'|'cornerTR'|'cornerBL'|'cornerBR'} wall
 * @param {number} normalizedPos - Position along wall (0-1), ignored for corners
 * @param {number} intensity - Impact intensity (0-1)
 */
export function registerWallImpact(wall, normalizedPos, intensity) {
  const g = getGlobals();
  if (!g.wallElasticity || g.wallElasticity === 0) return;
  
  const maxDeform = g.wallElasticity || 25;
  
  if (wall === 'top') {
    wallState.top.impact(normalizedPos, intensity, maxDeform);
  } else if (wall === 'bottom') {
    wallState.bottom.impact(normalizedPos, intensity, maxDeform);
  } else if (wall === 'left') {
    wallState.left.impact(normalizedPos, intensity, maxDeform);
  } else if (wall === 'right') {
    wallState.right.impact(normalizedPos, intensity, maxDeform);
  } else if (wall === 'cornerTL') {
    wallState.cornerTL.impact(intensity, maxDeform);
  } else if (wall === 'cornerTR') {
    wallState.cornerTR.impact(intensity, maxDeform);
  } else if (wall === 'cornerBL') {
    wallState.cornerBL.impact(intensity, maxDeform);
  } else if (wall === 'cornerBR') {
    wallState.cornerBR.impact(intensity, maxDeform);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WALL RENDERING
// Draws the elastic boundary as chrome-colored fill that intrudes into canvas
// when deformed (creating the "rubbery" wobble effect)
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Draw the rubbery walls onto the canvas
 * The walls are chrome-colored areas that extend INTO the canvas when deformed
 * Creating the visual effect of the browser chrome pushing in on impact
 * 
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w - Canvas width
 * @param {number} h - Canvas height
 */
export function drawWalls(ctx, w, h) {
  const g = getGlobals();
  
  // Skip if walls disabled or no elasticity
  if (!g.wallElasticity || g.wallElasticity === 0) return;
  
  // Get chrome color from CSS
  const chromeColor = g.chromeColor || getChromeColorFromCSS();
  
  // Get corner radius from CSS (matches container radius)
  const cr = (g.getCanvasCornerRadius?.() || g.cornerRadius || 42) * (g.DPR || 1);
  
  // Viewport top offset (Ball Pit mode uses upper third as spawn area)
  const viewportTop = (g.currentMode === 'pit') ? (h / 3) : 0;
  
  // Base wall thickness (the chrome frame extends this far into canvas at rest)
  // We draw walls that push IN when deformed (positive deformation = chrome intrudes)
  const baseThickness = 0; // At rest, walls are at edge (no intrusion)
  
  ctx.save();
  ctx.fillStyle = chromeColor;
  
  // ───────────────────────────────────────────────────────────────────────────
  // BOTTOM WALL (most important - where balls land)
  // Draw as filled polygon from canvas bottom edge to deformed line
  // ───────────────────────────────────────────────────────────────────────────
  if (wallState.bottom.hasDeformation()) {
    ctx.beginPath();
    
    // Start at bottom-left corner (outside canvas)
    ctx.moveTo(-10, h + 10);
    
    // Draw along bottom edge with deformation (inward = negative Y)
    for (let i = 0; i <= SEGMENTS_PER_WALL; i++) {
      const t = i / SEGMENTS_PER_WALL;
      const x = t * w;
      const deform = wallState.bottom.getDeformAt(t);
      // Positive deformation = chrome intrudes INTO canvas (upward)
      ctx.lineTo(x, h - Math.max(0, deform));
    }
    
    // Close at bottom-right (outside canvas)
    ctx.lineTo(w + 10, h + 10);
    ctx.closePath();
    ctx.fill();
  }
  
  // ───────────────────────────────────────────────────────────────────────────
  // TOP WALL
  // ───────────────────────────────────────────────────────────────────────────
  if (wallState.top.hasDeformation()) {
    ctx.beginPath();
    
    // Start at top-left (outside canvas)
    ctx.moveTo(-10, viewportTop - 10);
    
    // Draw along top edge with deformation (inward = positive Y)
    for (let i = 0; i <= SEGMENTS_PER_WALL; i++) {
      const t = i / SEGMENTS_PER_WALL;
      const x = t * w;
      const deform = wallState.top.getDeformAt(t);
      // Positive deformation = chrome intrudes INTO canvas (downward)
      ctx.lineTo(x, viewportTop + Math.max(0, deform));
    }
    
    // Close at top-right (outside canvas)
    ctx.lineTo(w + 10, viewportTop - 10);
    ctx.closePath();
    ctx.fill();
  }
  
  // ───────────────────────────────────────────────────────────────────────────
  // LEFT WALL
  // ───────────────────────────────────────────────────────────────────────────
  if (wallState.left.hasDeformation()) {
    ctx.beginPath();
    
    // Start at top-left (outside canvas)
    ctx.moveTo(-10, viewportTop - 10);
    
    // Draw along left edge with deformation (inward = positive X)
    for (let i = 0; i <= SEGMENTS_PER_WALL; i++) {
      const t = i / SEGMENTS_PER_WALL;
      const y = viewportTop + t * (h - viewportTop);
      const deform = wallState.left.getDeformAt(t);
      // Positive deformation = chrome intrudes INTO canvas (rightward)
      ctx.lineTo(Math.max(0, deform), y);
    }
    
    // Close at bottom-left (outside canvas)
    ctx.lineTo(-10, h + 10);
    ctx.closePath();
    ctx.fill();
  }
  
  // ───────────────────────────────────────────────────────────────────────────
  // RIGHT WALL
  // ───────────────────────────────────────────────────────────────────────────
  if (wallState.right.hasDeformation()) {
    ctx.beginPath();
    
    // Start at top-right (outside canvas)
    ctx.moveTo(w + 10, viewportTop - 10);
    
    // Draw along right edge with deformation (inward = negative X)
    for (let i = 0; i <= SEGMENTS_PER_WALL; i++) {
      const t = i / SEGMENTS_PER_WALL;
      const y = viewportTop + t * (h - viewportTop);
      const deform = wallState.right.getDeformAt(t);
      // Positive deformation = chrome intrudes INTO canvas (leftward)
      ctx.lineTo(w - Math.max(0, deform), y);
    }
    
    // Close at bottom-right (outside canvas)
    ctx.lineTo(w + 10, h + 10);
    ctx.closePath();
    ctx.fill();
  }
  
  // ───────────────────────────────────────────────────────────────────────────
  // CORNERS - Draw as arc segments that bulge inward
  // ───────────────────────────────────────────────────────────────────────────
  
  // Bottom-left corner
  if (Math.abs(wallState.cornerBL.deformation) > 0.1) {
    drawCornerBulge(ctx, cr, h - cr, cr, wallState.cornerBL.deformation, Math.PI / 2, Math.PI, chromeColor);
  }
  
  // Bottom-right corner
  if (Math.abs(wallState.cornerBR.deformation) > 0.1) {
    drawCornerBulge(ctx, w - cr, h - cr, cr, wallState.cornerBR.deformation, 0, Math.PI / 2, chromeColor);
  }
  
  // Top-left corner
  if (Math.abs(wallState.cornerTL.deformation) > 0.1) {
    drawCornerBulge(ctx, cr, viewportTop + cr, cr, wallState.cornerTL.deformation, Math.PI, Math.PI * 1.5, chromeColor);
  }
  
  // Top-right corner
  if (Math.abs(wallState.cornerTR.deformation) > 0.1) {
    drawCornerBulge(ctx, w - cr, viewportTop + cr, cr, wallState.cornerTR.deformation, -Math.PI / 2, 0, chromeColor);
  }
  
  ctx.restore();
}

/**
 * Draw a corner bulge effect
 * Creates a filled arc that represents the corner pushing inward
 */
function drawCornerBulge(ctx, cx, cy, radius, deformation, startAngle, endAngle, color) {
  if (deformation <= 0) return; // Only draw positive (inward) deformation
  
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  
  // Draw the bulge as a pie slice from corner center
  ctx.moveTo(cx, cy);
  
  // Arc at reduced radius (pushing inward)
  const bulgeFactor = Math.min(deformation / radius, 0.5); // Cap at 50% intrusion
  const innerRadius = radius * (1 - bulgeFactor);
  
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  
  // Use partial opacity based on deformation amount for smoother effect
  ctx.globalAlpha = Math.min(1, deformation / 20);
  ctx.fill();
  ctx.globalAlpha = 1;
  
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Get chrome color from CSS variable
// ═══════════════════════════════════════════════════════════════════════════════
function getChromeColorFromCSS() {
  const style = getComputedStyle(document.documentElement);
  return style.getPropertyValue('--chrome-bg').trim() || '#cecece';
}

/**
 * Update chrome color in globals (call on theme change)
 */
export function updateChromeColor() {
  const g = getGlobals();
  g.chromeColor = getChromeColorFromCSS();
}

