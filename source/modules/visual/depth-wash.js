// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                        CANVAS DEPTH WASH                                    ║
// ║     Radial gradient overlay rendered between balls and wall                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

// Gradient cache: rebuild only when params change
let cachedGradient = null;
let cacheKey = '';

/**
 * Parse hex color to RGB object
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

/**
 * Smoothstep interpolation — perceptually uniform easing that concentrates
 * precision in the mid-tones where 8-bit banding is most visible.
 */
function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

/**
 * Build radial gradient for depth wash.
 * Uses many intermediate color stops to eliminate 8-bit banding that occurs
 * when only 2 stops span the full viewport through a multiply blend.
 */
function createDepthGradient(ctx, w, h, g, isDark) {
  const centerYPct = typeof g.depthWashCenterY === 'number' ? g.depthWashCenterY : 0.3;
  const radiusScale = typeof g.depthWashRadiusScale === 'number' ? g.depthWashRadiusScale : 1.0;
  
  const centerX = w / 2;
  const centerY = h * centerYPct;
  const radius = Math.max(w, h) * radiusScale;
  
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  
  const centerColor = isDark 
    ? (g.depthWashCenterColorDark || '#1a1e23')
    : (g.depthWashCenterColorLight || '#ffffff');
  const edgeColor = isDark
    ? (g.depthWashEdgeColorDark || '#05020f')
    : (g.depthWashEdgeColorLight || '#142b48');
  
  const centerAlpha = isDark
    ? (typeof g.depthWashCenterAlphaDark === 'number' ? g.depthWashCenterAlphaDark : 0)
    : (typeof g.depthWashCenterAlphaLight === 'number' ? g.depthWashCenterAlphaLight : 0.3);
  const edgeAlpha = isDark
    ? (typeof g.depthWashEdgeAlphaDark === 'number' ? g.depthWashEdgeAlphaDark : 0.8)
    : (typeof g.depthWashEdgeAlphaLight === 'number' ? g.depthWashEdgeAlphaLight : 0.4);
  
  const c0 = hexToRgb(centerColor);
  const c1 = hexToRgb(edgeColor);
  
  const STOPS = 12;
  for (let i = 0; i <= STOPS; i++) {
    const t = i / STOPS;
    const s = smoothstep(t);
    const r = Math.round(c0.r + (c1.r - c0.r) * s);
    const gb = Math.round(c0.g + (c1.g - c0.g) * s);
    const b = Math.round(c0.b + (c1.b - c0.b) * s);
    const a = centerAlpha + (edgeAlpha - centerAlpha) * s;
    gradient.addColorStop(t, `rgba(${r}, ${gb}, ${b}, ${a.toFixed(4)})`);
  }
  
  return gradient;
}

/**
 * Generate cache key from all gradient parameters
 */
function getCacheKey(w, h, g, isDark) {
  return `${w}|${h}|${isDark}|${g.depthWashCenterY}|${g.depthWashRadiusScale}|` +
    `${g.depthWashCenterColorLight}|${g.depthWashEdgeColorLight}|${g.depthWashCenterAlphaLight}|${g.depthWashEdgeAlphaLight}|` +
    `${g.depthWashCenterColorDark}|${g.depthWashEdgeColorDark}|${g.depthWashCenterAlphaDark}|${g.depthWashEdgeAlphaDark}`;
}

/**
 * Draw depth wash overlay between balls and wall
 */
export function drawDepthWash(ctx, w, h, options = {}) {
  const g = getGlobals();
  const isDark = g.isDarkMode || false;
  const opacityScale = Number.isFinite(options.opacityScale) ? options.opacityScale : 1;
  
  // Get configurable opacity (master control)
  const opacity = (typeof g.depthWashOpacity === 'number' ? g.depthWashOpacity : 0.65) * opacityScale;
  if (opacity <= 0) return;
  
  // Cache invalidation: rebuild gradient when any param changes
  const key = getCacheKey(w, h, g, isDark);
  if (cachedGradient === null || cacheKey !== key) {
    cachedGradient = createDepthGradient(ctx, w, h, g, isDark);
    cacheKey = key;
  }
  
  ctx.save();
  
  // Set blend mode from config
  const blendLight = g.depthWashBlendModeLight || 'color-dodge';
  const blendDark = g.depthWashBlendModeDark || 'multiply';
  ctx.globalCompositeOperation = isDark ? blendDark : blendLight;
  
  // Master opacity control
  ctx.globalAlpha = opacity;
  
  ctx.fillStyle = cachedGradient;
  ctx.fillRect(0, 0, w, h);
  
  ctx.restore();
}

/**
 * Invalidate gradient cache (call on theme change)
 */
export function invalidateDepthWashCache() {
  cachedGradient = null;
  cacheKey = '';
}
