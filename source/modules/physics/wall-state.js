// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          STATIC WALL RENDERING                              ║
// ║                                                                              ║
// ║  Simplified wall system - static rounded rectangle, no deformation.         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

// Cached wall fill color (avoid per-frame getComputedStyle)
let CACHED_WALL_COLOR = null;
let STROKE_CACHE_CTX = null;
let STROKE_PATH_KEY = '';
let STROKE_PATH = null;
let BOTTOM_GRADIENT_KEY = '';
let BOTTOM_GRADIENT = null;
let TOP_GRADIENT_KEY = '';
let TOP_GRADIENT = null;

function resetStrokeCache() {
  STROKE_PATH_KEY = '';
  STROKE_PATH = null;
  BOTTOM_GRADIENT_KEY = '';
  BOTTOM_GRADIENT = null;
  TOP_GRADIENT_KEY = '';
  TOP_GRADIENT = null;
}

function ensureStrokeCacheContext(ctx) {
  if (STROKE_CACHE_CTX === ctx) return;
  STROKE_CACHE_CTX = ctx;
  resetStrokeCache();
}

function traceRoundedRectStrokePath(ctx, x, y, innerW, innerH, r) {
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
}

function createRoundedRectStrokePath(x, y, innerW, innerH, r) {
  const path = new Path2D();
  path.moveTo(x + r, y);
  path.lineTo(x + innerW - r, y);
  if (r > 0) path.arcTo(x + innerW, y, x + innerW, y + r, r);
  path.lineTo(x + innerW, y + innerH - r);
  if (r > 0) path.arcTo(x + innerW, y + innerH, x + innerW - r, y + innerH, r);
  path.lineTo(x + r, y + innerH);
  if (r > 0) path.arcTo(x, y + innerH, x, y + innerH - r, r);
  path.lineTo(x, y + r);
  if (r > 0) path.arcTo(x, y, x + r, y, r);
  path.closePath();
  return path;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WALL RENDERING - Static rounded rectangle
// ═══════════════════════════════════════════════════════════════════════════════
export function drawWalls(ctx, w, h, options = {}) {
  const g = getGlobals();
  if (!ctx) return;

  const chromeColor = CACHED_WALL_COLOR || getChromeColorFromCSS();
  const DPR = g.DPR || 1;

  // R = innermost wall radius (matches CSS --wall-radius / --radius-inner)
  const rCssPx = (Number.isFinite(g.wallRadius) && g.wallRadius >= 0)
    ? g.wallRadius
    : (typeof g.getCanvasCornerRadius === 'function'
      ? g.getCanvasCornerRadius()
      : (g.cornerRadius ?? 0));
  const R = Math.max(0, (Number(rCssPx) || 0) * DPR);
  const T = Math.max(0, (Number(g.wallThickness) || 0) * DPR);

  // Walls are now CSS containers — canvas only draws gradient stroke on content edge.
  const gradientStrokeEnabled = options.wallGradientStrokeEnabled ?? g.wallGradientStrokeEnabled;
  if (gradientStrokeEnabled) {
    const rClamped = Math.max(0, Math.min(R, (w * 0.5), (h * 0.5)));
    drawGradientStroke(ctx, w, h, g, DPR, 0, w, h, rClamped);
  }
}

function traceCW(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  if (r > 0) ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  if (r > 0) ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  if (r > 0) ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  if (r > 0) ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function traceCCW(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y + h);
  ctx.lineTo(x + w - r, y + h);
  if (r > 0) ctx.arcTo(x + w, y + h, x + w, y + h - r, r);
  ctx.lineTo(x + w, y + r);
  if (r > 0) ctx.arcTo(x + w, y, x + w - r, y, r);
  ctx.lineTo(x + r, y);
  if (r > 0) ctx.arcTo(x, y, x, y + r, r);
  ctx.lineTo(x, y + h - r);
  if (r > 0) ctx.arcTo(x, y + h, x + r, y + h, r);
  ctx.closePath();
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
  ensureStrokeCacheContext(ctx);

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

  const pathKey = `${x}|${y}|${innerW}|${innerH}|${r}`;
  const canUsePath2D = typeof Path2D === 'function';
  if (canUsePath2D && pathKey !== STROKE_PATH_KEY) {
    STROKE_PATH_KEY = pathKey;
    STROKE_PATH = createRoundedRectStrokePath(x, y, innerW, innerH, r);
  }
  
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
    const bottomKey = `${bottomCenterX}|${bottomCenterY}|${bottomRadius}|${bottomOpacity}|${bottomColor}`;
    if (bottomKey !== BOTTOM_GRADIENT_KEY) {
      BOTTOM_GRADIENT_KEY = bottomKey;
      const bottomGradient = ctx.createRadialGradient(
        bottomCenterX, bottomCenterY, 0,
        bottomCenterX, bottomCenterY, bottomRadius
      );
      bottomGradient.addColorStop(0, hexToRGBA(bottomColor, bottomOpacity));
      bottomGradient.addColorStop(0.1, hexToRGBA(bottomColor, bottomOpacity));
      bottomGradient.addColorStop(0.5, hexToRGBA(bottomColor, bottomOpacity * 0.5));
      bottomGradient.addColorStop(1, hexToRGBA(bottomColor, 0));
      BOTTOM_GRADIENT = bottomGradient;
    }
    
    ctx.save();
    ctx.strokeStyle = BOTTOM_GRADIENT;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (canUsePath2D && STROKE_PATH) {
      ctx.stroke(STROKE_PATH);
    } else {
      traceRoundedRectStrokePath(ctx, x, y, innerW, innerH, r);
      ctx.stroke();
    }
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
    const topKey = `${topCenterX}|${topCenterY}|${topRadius}|${topOpacity}|${topColor}`;
    if (topKey !== TOP_GRADIENT_KEY) {
      TOP_GRADIENT_KEY = topKey;
      const topGradient = ctx.createRadialGradient(
        topCenterX, topCenterY, 0,
        topCenterX, topCenterY, topRadius
      );
      topGradient.addColorStop(0, hexToRGBA(topColor, topOpacity));
      topGradient.addColorStop(0.1, hexToRGBA(topColor, topOpacity));
      topGradient.addColorStop(0.5, hexToRGBA(topColor, topOpacity * 0.5));
      topGradient.addColorStop(1, hexToRGBA(topColor, 0));
      TOP_GRADIENT = topGradient;
    }
    
    ctx.save();
    ctx.strokeStyle = TOP_GRADIENT;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (canUsePath2D && STROKE_PATH) {
      ctx.stroke(STROKE_PATH);
    } else {
      traceRoundedRectStrokePath(ctx, x, y, innerW, innerH, r);
      ctx.stroke();
    }
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
