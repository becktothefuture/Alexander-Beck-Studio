// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                        CANVAS DEPTH WASH                                    ║
// ║     Radial gradient overlay rendered between balls and wall                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

// Gradient cache: rebuild only on resize/theme changes
let cachedGradient = null;
let cachedWidth = 0;
let cachedHeight = 0;
let cachedIsDark = false;

/**
 * Build radial gradient for depth wash (cached per canvas size + theme)
 */
function createDepthGradient(ctx, w, h, isDark) {
  // Center at 50% x, 30% y as specified
  const centerX = w / 2;
  const centerY = h * 0.3;
  const radius = Math.max(w, h) * 0.8; // Extend to cover canvas
  
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  
  if (isDark) {
    // Dark mode gradient (desaturated, opaque at center for top-down lighting)
    gradient.addColorStop(1, 'rgba(5, 2, 15, 0.8)');
    gradient.addColorStop(0, 'rgba(25, 30, 35, 0)');
  } else {
    // Light mode gradient (from CSS overlay)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
    gradient.addColorStop(1, 'rgba(20, 43, 72, 0.05)');
  }
  
  return gradient;
}

/**
 * Draw depth wash overlay between balls and wall
 * Blend modes: light = "lighter" (additive), dark = "color-burn"
 */
export function drawDepthWash(ctx, w, h) {
  const g = getGlobals();
  const isDark = g.isDarkMode || false;
  
  // Cache invalidation: rebuild gradient on resize or theme change
  if (!cachedGradient || 
      Math.abs(w - cachedWidth) > 1 || 
      Math.abs(h - cachedHeight) > 1 || 
      isDark !== cachedIsDark) {
    cachedGradient = createDepthGradient(ctx, w, h, isDark);
    cachedWidth = w;
    cachedHeight = h;
    cachedIsDark = isDark;
  }
  
  // Save state (blend mode + alpha will be modified)
  ctx.save();
  
  // Set blend mode based on theme
  // Light: "color-dodge" (intense radiant brightening, inverse of color-burn)
  // Dark: "color-burn" (rich darkening with color interaction)
  ctx.globalCompositeOperation = isDark ? 'color-burn' : 'color-dodge';
  
  // Set opacity (same as CSS overlay)
  ctx.globalAlpha = 0.65;
  
  // Fill full canvas with gradient (wall will be drawn on top, hiding overflow)
  ctx.fillStyle = cachedGradient;
  ctx.fillRect(0, 0, w, h);
  
  // Restore state (critical: don't affect wall rendering)
  ctx.restore();
}

/**
 * Invalidate gradient cache (call on theme change)
 */
export function invalidateDepthWashCache() {
  cachedGradient = null;
}
