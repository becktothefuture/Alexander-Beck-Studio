// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    INNER WALL GRADIENT EDGE LIGHTING                        ║
// ║                                                                              ║
// ║  Creates a radial gradient light edge along the inner wall boundary.        ║
// ║  Simulates light shining from above, brightest at center, fading to edges.  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

// Element references
let topGradientEdge = null;
let bottomGradientEdge = null;
let initialized = false;

// ═══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// Creates the gradient edge elements inside #bravia-balls
// ═══════════════════════════════════════════════════════════════════════════════

export function initInnerWallGradientEdge() {
  if (initialized) return;
  
  const container = document.getElementById('bravia-balls');
  if (!container) {
    console.warn('⚠️ #bravia-balls not found, cannot create gradient edge');
    return;
  }
  
  // Create top gradient edge element (light from above)
  topGradientEdge = document.createElement('div');
  topGradientEdge.className = 'inner-wall-gradient-edge inner-wall-gradient-edge--top';
  topGradientEdge.setAttribute('aria-hidden', 'true');
  container.appendChild(topGradientEdge);
  
  // Create bottom gradient edge element (shadow/dark from below)
  bottomGradientEdge = document.createElement('div');
  bottomGradientEdge.className = 'inner-wall-gradient-edge inner-wall-gradient-edge--bottom';
  bottomGradientEdge.setAttribute('aria-hidden', 'true');
  container.appendChild(bottomGradientEdge);
  
  initialized = true;
  
  // Apply initial styles
  updateGradientEdge();
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE GRADIENT
// Recalculates gradient based on current settings and theme
// ═══════════════════════════════════════════════════════════════════════════════

export function updateGradientEdge() {
  if (!topGradientEdge || !bottomGradientEdge) return;
  
  const g = getGlobals();
  const isDark = document.body.classList.contains('dark-mode');
  
  // Get configuration values
  const topOpacity = isDark 
    ? (g.innerWallTopLightOpacityDark ?? 0.4)
    : (g.innerWallTopLightOpacityLight ?? 0.3);
  
  const bottomOpacity = isDark
    ? (g.innerWallTopBevelOpacityDark ?? 0.25)
    : (g.innerWallTopBevelOpacityLight ?? 0.18);
  
  const topColor = g.innerWallTopLightColor ?? '#ffffff';
  const bottomColor = g.innerWallBottomShadowColor ?? '#000000';
  
  const edgeWidth = g.innerWallTopBevelWidth ?? 2;
  const gradientRadius = g.innerWallGradientRadius ?? 70; // percentage of width
  
  // Parse hex color to RGB for use in gradient
  const topRgb = hexToRgb(topColor);
  const bottomRgb = hexToRgb(bottomColor);
  
  // Build the radial gradient for top edge (light from above)
  // Gradient is brightest at center-top, fades toward corners
  const topGradient = `radial-gradient(
    ellipse ${gradientRadius}% 200% at 50% 0%,
    rgba(${topRgb.r}, ${topRgb.g}, ${topRgb.b}, ${topOpacity}) 0%,
    rgba(${topRgb.r}, ${topRgb.g}, ${topRgb.b}, ${topOpacity * 0.8}) 20%,
    rgba(${topRgb.r}, ${topRgb.g}, ${topRgb.b}, ${topOpacity * 0.4}) 50%,
    rgba(${topRgb.r}, ${topRgb.g}, ${topRgb.b}, 0) 100%
  )`;
  
  // Build the radial gradient for bottom edge (shadow from below)
  // Gradient is darkest at center-bottom, fades toward corners
  const bottomGradient = `radial-gradient(
    ellipse ${gradientRadius}% 200% at 50% 100%,
    rgba(${bottomRgb.r}, ${bottomRgb.g}, ${bottomRgb.b}, ${bottomOpacity}) 0%,
    rgba(${bottomRgb.r}, ${bottomRgb.g}, ${bottomRgb.b}, ${bottomOpacity * 0.8}) 20%,
    rgba(${bottomRgb.r}, ${bottomRgb.g}, ${bottomRgb.b}, ${bottomOpacity * 0.4}) 50%,
    rgba(${bottomRgb.r}, ${bottomRgb.g}, ${bottomRgb.b}, 0) 100%
  )`;
  
  // Apply to top edge element
  topGradientEdge.style.background = topGradient;
  topGradientEdge.style.height = `${edgeWidth}px`;
  
  // Apply to bottom edge element  
  bottomGradientEdge.style.background = bottomGradient;
  bottomGradientEdge.style.height = `${edgeWidth}px`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Convert hex to RGB
// ═══════════════════════════════════════════════════════════════════════════════

function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════════════════════════

export function destroyInnerWallGradientEdge() {
  if (topGradientEdge && topGradientEdge.parentNode) {
    topGradientEdge.parentNode.removeChild(topGradientEdge);
  }
  if (bottomGradientEdge && bottomGradientEdge.parentNode) {
    bottomGradientEdge.parentNode.removeChild(bottomGradientEdge);
  }
  topGradientEdge = null;
  bottomGradientEdge = null;
  initialized = false;
}
