// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          STATIC WALL RENDERING                              ║
// ║                                                                              ║
// ║  Simplified wall system - static rounded rectangle, no deformation.         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

// Cached wall fill color (avoid per-frame getComputedStyle)
let CACHED_WALL_COLOR = null;

// ═══════════════════════════════════════════════════════════════════════════════
// WALL RENDERING - Static rounded rectangle
// ═══════════════════════════════════════════════════════════════════════════════
export function drawWalls(ctx, w, h) {
  const g = getGlobals();
  if (!ctx) return;

  const chromeColor = CACHED_WALL_COLOR || getChromeColorFromCSS();
  const DPR = g.DPR || 1;

  const rCssPx = (typeof g.getCanvasCornerRadius === 'function')
    ? g.getCanvasCornerRadius()
    : (g.cornerRadius ?? g.wallRadius ?? 0);
  const rCanvasPx = Math.max(0, (Number(rCssPx) || 0) * DPR);
  
  // Wall inset rule:
  // The wall inner edge (collision boundary) is defined ONLY by wall thickness.
  const wallThicknessPx = Math.max(0, (Number(g.wallThickness) || 0) * DPR);
  const insetPx = wallThicknessPx;
  
  const innerW = Math.max(1, w - (insetPx * 2));
  const innerH = Math.max(1, h - (insetPx * 2));
  const innerR = Math.max(0, Math.min(rCanvasPx, innerW * 0.5, innerH * 0.5));
  
  // Small padding beyond canvas edges for sub-pixel path rounding safety
  const pad = Math.max(2, 2 * DPR);

  ctx.save();
  ctx.fillStyle = chromeColor;
  ctx.beginPath();

  // Outer path (CW): canvas edges
  ctx.moveTo(-pad, -pad);
  ctx.lineTo(w + pad, -pad);
  ctx.lineTo(w + pad, h + pad);
  ctx.lineTo(-pad, h + pad);
  ctx.closePath();

  // Inner path (CCW): static rounded rectangle
  const x = insetPx;
  const y = insetPx;
  const r = innerR;
  
  ctx.moveTo(x + r, y + innerH);
  ctx.lineTo(x + innerW - r, y + innerH);
  ctx.arcTo(x + innerW, y + innerH, x + innerW, y + innerH - r, r);
  ctx.lineTo(x + innerW, y + r);
  ctx.arcTo(x + innerW, y, x + innerW - r, y, r);
  ctx.lineTo(x + r, y);
  ctx.arcTo(x, y, x, y + r, r);
  ctx.lineTo(x, y + innerH - r);
  ctx.arcTo(x, y + innerH, x + r, y + innerH, r);
  ctx.closePath();
  
  try {
    ctx.fill('evenodd');
  } catch (e) {
    ctx.fill();
  }

  ctx.restore();
  
  // Draw radial gradient stroke on inner wall edge
  if (g.wallGradientStrokeEnabled) {
    drawGradientStroke(ctx, w, h, g, DPR, insetPx, innerW, innerH, innerR);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRADIENT STROKE SYSTEM
// 
// Two radial gradient strokes along the inner wall edge:
// 1. BOTTOM LIGHT - Simulates light shining up from below (white → transparent)
// 2. TOP LIGHT    - Subtle ambient light from above (white → transparent, lower opacity)
//
// Each gradient:
// - Originates from a point (center) and expands outward
// - Uses configurable radius to control how far the light spreads
// - Stroke is drawn centered on the inner wall edge
// ═══════════════════════════════════════════════════════════════════════════════

function drawGradientStroke(ctx, w, h, g, DPR, insetPx, innerW, innerH, innerR) {
  // ─────────────────────────────────────────────────────────────────────────────
  // STROKE WIDTH
  // Base width in CSS pixels, scaled by device pixel ratio
  // 0.33px CSS ≈ 1 retina pixel on 3x displays
  // ─────────────────────────────────────────────────────────────────────────────
  const baseWidthCSS = g.wallGradientStrokeWidth ?? 0.33;
  const strokeWidth = Math.max(1, baseWidthCSS * DPR);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // INNER WALL PATH (shared by both gradients)
  // The stroke follows the inner edge of the wall frame
  // ─────────────────────────────────────────────────────────────────────────────
  const x = insetPx;
  const y = insetPx;
  const r = innerR;
  
  // Helper to draw the rounded rectangle stroke path
  const drawStrokePath = () => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + innerW - r, y);
    if (r > 0) ctx.arcTo(x + innerW, y, x + innerW, y + r, r);
    ctx.lineTo(x + innerW, y + innerH - r);
    if (r > 0) ctx.arcTo(x + innerW, y + innerH, x + innerW - r, y + innerH, r);
    ctx.lineTo(x + r, y + innerH);
    if (r > 0) ctx.arcTo(x, y + innerH, x, y + innerH - r, r);
    ctx.lineTo(x, y + r);
    if (r > 0) ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  };
  
  // ─────────────────────────────────────────────────────────────────────────────
  // BOTTOM LIGHT GRADIENT (now rendered at TOP for flipped inner wall)
  // Center: top-center (50%, 0%)
  // Effect: Light shines downward from above, brightest at top edge
  // ─────────────────────────────────────────────────────────────────────────────
  const bottomEnabled = g.wallGradientStrokeBottomEnabled ?? true;
  if (bottomEnabled) {
    const bottomCenterX = w * 0.5;
    const bottomCenterY = 0;  // Top edge (flipped)
    const bottomRadius = (g.wallGradientStrokeBottomRadius ?? 1.0) * h * 0.7;  // 70% size
    const bottomOpacity = g.wallGradientStrokeBottomOpacity ?? 1.0;
    const bottomColor = g.wallGradientStrokeBottomColor ?? '#ffffff';
    
    // Radial gradient: full opacity at 10%, half at 50%, transparent at 100%
    const bottomGradient = ctx.createRadialGradient(
      bottomCenterX, bottomCenterY, 0,
      bottomCenterX, bottomCenterY, bottomRadius
    );
    bottomGradient.addColorStop(0, hexToRGBA(bottomColor, bottomOpacity));
    bottomGradient.addColorStop(0.1, hexToRGBA(bottomColor, bottomOpacity));
    bottomGradient.addColorStop(0.5, hexToRGBA(bottomColor, bottomOpacity * 0.5));
    bottomGradient.addColorStop(1, hexToRGBA(bottomColor, 0));
    
    ctx.save();
    ctx.strokeStyle = bottomGradient;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawStrokePath();
    ctx.stroke();
    ctx.restore();
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // TOP DARK GRADIENT (now rendered at BOTTOM for flipped inner wall)
  // Center: bottom-center (50%, 100%)
  // Effect: Shadow from below, darker at bottom edge
  // ─────────────────────────────────────────────────────────────────────────────
  const topEnabled = g.wallGradientStrokeTopEnabled ?? true;
  if (topEnabled) {
    const topCenterX = w * 0.5;
    const topCenterY = h;  // Bottom edge (flipped)
    const topRadius = (g.wallGradientStrokeTopRadius ?? 1.0) * h * 0.7;  // 70% size
    const topOpacity = g.wallGradientStrokeTopOpacity ?? 0.5;
    const topColor = g.wallGradientStrokeTopColor ?? '#ffffff';
    
    // Radial gradient: full opacity at 10%, half at 50%, transparent at 100%
    const topGradient = ctx.createRadialGradient(
      topCenterX, topCenterY, 0,
      topCenterX, topCenterY, topRadius
    );
    topGradient.addColorStop(0, hexToRGBA(topColor, topOpacity));
    topGradient.addColorStop(0.1, hexToRGBA(topColor, topOpacity));
    topGradient.addColorStop(0.5, hexToRGBA(topColor, topOpacity * 0.5));
    topGradient.addColorStop(1, hexToRGBA(topColor, 0));
    
    ctx.save();
    ctx.strokeStyle = topGradient;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawStrokePath();
    ctx.stroke();
    ctx.restore();
  }
}

// Convert hex color to rgba string
function hexToRGBA(hex, alpha) {
  // Handle shorthand hex (#fff)
  let r, g, b;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
function getChromeColorFromCSS() {
  try {
    const root = document.documentElement;
    const body = document.body;
    const container = document.getElementById('bravia-balls');

    const read = (el, name) => {
      if (!el) return '';
      try {
        const value = getComputedStyle(el).getPropertyValue(name).trim();
        if (!value) {
          const resolved = getComputedStyle(el).getPropertyValue(name).trim();
          return resolved;
        }
        return value;
      } catch (e) {
        return '';
      }
    };

    // Try --wall-color first (theme-aware)
    let color = read(root, '--wall-color');
    if (!color) {
      const isDark = root.classList.contains('dark-mode') || body.classList.contains('dark-mode');
      if (isDark) {
        color = read(root, '--wall-color-dark') || read(root, '--frame-color-dark');
      } else {
        color = read(root, '--wall-color-light') || read(root, '--frame-color-light');
      }
    }
    
    if (!color) {
      color = read(body, '--wall-color') || read(container, '--wall-color');
    }
    
    return color || '#0a0a0a';
  } catch {
    return '#0a0a0a';
  }
}

export function updateChromeColor() {
  CACHED_WALL_COLOR = getChromeColorFromCSS();
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY STUBS - For backwards compatibility during transition
// These do nothing but prevent errors if called from other modules
// ═══════════════════════════════════════════════════════════════════════════════
export const wallState = {
  reset() {},
  step() {},
  hasAnyDeformation() { return false; },
  resetStepBudgets() {},
  clearPressureFrame() {},
  ringPhysics: { reset() {}, ensureGeometry() {} },
  ringRender: { reset() {}, ensureGeometry() {} }
};

export function registerWallImpact() {}
export function registerWallImpactAtPoint() {}

export function registerWallPressure() {}
export function registerWallPressureAtPoint() {}
export function applyWallPreset() {}
export function deriveWallParamsFromHighLevel() { return {}; }
