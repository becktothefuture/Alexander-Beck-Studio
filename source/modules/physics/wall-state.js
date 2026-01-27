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
