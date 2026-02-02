// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         WALL ELEMENTS SYSTEM                                 ║
// ║                                                                              ║
// ║  Creates real DOM elements for outer and inner walls with proper layering.  ║
// ║  Replaces pseudo-elements (::before/::after) for better control and         ║
// ║  clip-path support on gradient overlays.                                    ║
// ║                                                                              ║
// ║  Structure:                                                                  ║
// ║  #bravia-balls                                                               ║
// ║    ├── .outer-wall (inset:0, larger radius, inset shadow effect)           ║
// ║    ├── .inner-wall (inset:wall-thickness, smaller radius, outset effect)   ║
// ║    │   ├── .inner-wall__edge--top (gradient light from above)              ║
// ║    │   └── .inner-wall__edge--bottom (gradient shadow from below)          ║
// ║    └── canvas                                                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Element references
let outerWall = null;
let innerWall = null;
let topEdge = null;
let bottomEdge = null;
let innerGlow = null;
let outerBottomEdge = null;
let outerTopEdge = null;
let innerLightStroke = null;
let outerLightStroke = null;
let initialized = false;

// ═══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// Creates the wall elements inside #bravia-balls
// ═══════════════════════════════════════════════════════════════════════════════

export function initWallElements() {
  if (initialized) return;
  
  const container = document.getElementById('bravia-balls');
  if (!container) {
    console.warn('⚠️ #bravia-balls not found, cannot create wall elements');
    return;
  }
  
  // Create outer wall (inset effect - appears recessed)
  outerWall = document.createElement('div');
  outerWall.className = 'outer-wall';
  outerWall.setAttribute('aria-hidden', 'true');
  container.insertBefore(outerWall, container.firstChild);
  
  // Create outer wall edge gradients (inside outer wall for clipping)
  outerTopEdge = document.createElement('div');
  outerTopEdge.className = 'outer-wall__edge outer-wall__edge--top';
  outerTopEdge.setAttribute('aria-hidden', 'true');
  outerWall.appendChild(outerTopEdge);
  
  // Create outer wall light stroke (SVG gradient following wall path)
  outerLightStroke = createLightStrokeSvg('outer-wall__stroke-light', 'outer-wall-light-stroke-gradient');
  outerWall.appendChild(outerLightStroke.svg);
  
  outerBottomEdge = document.createElement('div');
  outerBottomEdge.className = 'outer-wall__edge outer-wall__edge--bottom';
  outerBottomEdge.setAttribute('aria-hidden', 'true');
  outerWall.appendChild(outerBottomEdge);
  
  // Create inner wall (outset effect - appears raised)
  innerWall = document.createElement('div');
  innerWall.className = 'inner-wall';
  innerWall.setAttribute('aria-hidden', 'true');
  container.insertBefore(innerWall, container.firstChild.nextSibling);
  
  // Create inner glow (soft top light gradient)
  innerGlow = document.createElement('div');
  innerGlow.className = 'inner-wall__glow';
  innerGlow.setAttribute('aria-hidden', 'true');
  innerGlow.style.position = 'absolute';
  innerGlow.style.top = '0';
  innerGlow.style.left = '0';
  innerGlow.style.right = '0';
  innerGlow.style.pointerEvents = 'none';
  innerWall.appendChild(innerGlow);
  
  // Create inner wall light stroke (SVG gradient following wall path)
  innerLightStroke = createLightStrokeSvg('inner-wall__stroke-light', 'inner-wall-light-stroke-gradient');
  innerWall.appendChild(innerLightStroke.svg);
  
  // Create top edge gradient (inside inner wall for proper clipping)
  topEdge = document.createElement('div');
  topEdge.className = 'inner-wall__edge inner-wall__edge--top';
  topEdge.setAttribute('aria-hidden', 'true');
  innerWall.appendChild(topEdge);
  
  // Create bottom edge gradient (inside inner wall for proper clipping)
  bottomEdge = document.createElement('div');
  bottomEdge.className = 'inner-wall__edge inner-wall__edge--bottom';
  bottomEdge.setAttribute('aria-hidden', 'true');
  innerWall.appendChild(bottomEdge);
  
  initialized = true;
  
  // Apply initial styles
  updateWallElements();
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE WALLS
// Recalculates wall styles based on current settings and theme
// ═══════════════════════════════════════════════════════════════════════════════

export function updateWallElements() {
  if (!outerWall || !innerWall) return;
  
  const g = getGlobals();
  const isDark = document.body.classList.contains('dark-mode');
  const root = document.documentElement;
  
  // Get wall geometry from CSS custom properties
  const wallThickness = getComputedStyle(root).getPropertyValue('--wall-thickness').trim() || '9px';
  const wallRadius = getComputedStyle(root).getPropertyValue('--wall-radius').trim() || '24px';
  
  // Parse values for calculations
  const thicknessPx = parseFloat(wallThickness) || 9;
  const radiusPx = parseFloat(wallRadius) || 24;
  
  // Outer wall radius = inner radius + half wall thickness + adjustment
  const outerRadiusAdjust = parseFloat(getComputedStyle(root).getPropertyValue('--outer-wall-radius-adjust').trim()) || 2;
  const outerRadius = radiusPx + (thicknessPx * 0.5) + outerRadiusAdjust;
  
  // Update outer wall
  outerWall.style.borderRadius = `${outerRadius}px`;
  
  // Update inner wall
  innerWall.style.inset = wallThickness;
  innerWall.style.borderRadius = wallRadius;
  
  // Update edge gradients
  updateEdgeGradients(g, isDark, radiusPx, outerRadius);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE EDGE GRADIENTS
// Applies radial gradient lighting to both inner and outer wall edges
// ═══════════════════════════════════════════════════════════════════════════════

function updateEdgeGradients(g, isDark, wallRadius, outerRadius) {
  const innerGradientRadius = g.innerWallGradientRadius ?? 70;
  const outerGradientRadius = g.outerWallGradientRadius ?? 70;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // INNER WALL GLOW (Top light gradient)
  // ─────────────────────────────────────────────────────────────────────────────
  if (innerGlow) {
    const glowOpacity = isDark
      ? (g.innerWallInnerGlowOpacityDark ?? 0.08)
      : (g.innerWallInnerGlowOpacityLight ?? 0);
    
    if (glowOpacity <= 0.01) {
      innerGlow.style.display = 'none';
      innerGlow.style.boxShadow = 'none';
    } else {
      innerGlow.style.display = 'block';
      const glowColor = g.innerWallInnerGlowColor ?? '#ffffff';
      const glowBlur = g.innerWallInnerGlowBlur ?? 30;
      const glowSpread = g.innerWallInnerGlowSpread ?? -5;
      const glowOffsetY = g.innerWallInnerGlowOffsetY ?? 0;
      
      const rgb = hexToRgb(glowColor);
      
      // Fill the entire inner wall
      innerGlow.style.inset = '0';
      // Use inset box-shadow for all-sides glow with offset
      innerGlow.style.boxShadow = `inset 0 ${glowOffsetY}px ${glowBlur}px ${glowSpread}px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${glowOpacity})`;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INNER WALL EDGES
  // Top: light from above | Bottom: shadow from below
  // ─────────────────────────────────────────────────────────────────────────────
  if (topEdge && bottomEdge) {
    const innerTopOpacity = isDark 
      ? (g.innerWallTopLightOpacityDark ?? 0.4)
      : (g.innerWallTopLightOpacityLight ?? 0.3);
    
    const innerBottomOpacity = isDark
      ? (g.innerWallTopBevelOpacityDark ?? 0.25)
      : (g.innerWallTopBevelOpacityLight ?? 0.18);
    
    const innerTopColor = g.innerWallTopLightColor ?? '#ffffff';
    const innerBottomColor = g.innerWallBottomShadowColor ?? '#000000';
    const innerEdgeWidth = g.innerWallTopBevelWidth ?? 2;
    
    const innerTopRgb = hexToRgb(innerTopColor);
    const innerBottomRgb = hexToRgb(innerBottomColor);
    
    // Inner wall top light (SVG stroke gradient - replaces thin edge bar)
    updateLightStrokeEdge(
      innerLightStroke,
      innerWall,
      wallRadius,
      innerEdgeWidth,
      innerTopRgb,
      innerTopOpacity,
      'top',
      innerGradientRadius
    );
    
    if (topEdge) {
      topEdge.style.display = 'none';
      topEdge.style.background = 'none';
      topEdge.style.height = '0px';
    }

    // Inner wall bottom gradient (shadow from below)
    if (innerBottomOpacity <= 0.01) {
      bottomEdge.style.display = 'none';
      bottomEdge.style.background = 'none';
      bottomEdge.style.height = '0px';
    } else {
      bottomEdge.style.display = 'block';
      const innerBottomGradient = `radial-gradient(
        ellipse ${innerGradientRadius}% 200% at 50% 100%,
        rgba(${innerBottomRgb.r}, ${innerBottomRgb.g}, ${innerBottomRgb.b}, ${innerBottomOpacity}) 0%,
        rgba(${innerBottomRgb.r}, ${innerBottomRgb.g}, ${innerBottomRgb.b}, ${innerBottomOpacity * 0.8}) 20%,
        rgba(${innerBottomRgb.r}, ${innerBottomRgb.g}, ${innerBottomRgb.b}, ${innerBottomOpacity * 0.4}) 50%,
        rgba(${innerBottomRgb.r}, ${innerBottomRgb.g}, ${innerBottomRgb.b}, 0) 100%
      )`;
      bottomEdge.style.background = innerBottomGradient;
      bottomEdge.style.height = `${innerEdgeWidth}px`;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // OUTER WALL EDGES
  // Top: shadow from above (dark) | Bottom: light catching from above (bright)
  // Opposite of inner wall - outer wall is recessed, so bottom catches light
  // ─────────────────────────────────────────────────────────────────────────────
  if (outerTopEdge && outerBottomEdge) {
    const outerEdgeEnabled = g.outerWallEdgeEnabled !== false;
    
    // Outer wall top edge (shadow - dark, recessed look)
    const outerTopOpacity = isDark
      ? (g.outerWallTopDarkOpacityDark ?? 0.5)
      : (g.outerWallTopDarkOpacityLight ?? 0.5);
    const outerTopColor = g.outerWallTopDarkColor ?? '#000000';
    
    // Outer wall bottom edge (light - catching light from above)
    const outerBottomOpacity = isDark
      ? (g.outerWallBottomLightOpacityDark ?? 0.5)
      : (g.outerWallBottomLightOpacityLight ?? 0.5);
    const outerBottomColor = g.outerWallBottomLightColor ?? '#ffffff';
    
    const outerEdgeWidth = g.outerWallEdgeWidth ?? 2;
    
    const outerTopRgb = hexToRgb(outerTopColor);
    const outerBottomRgb = hexToRgb(outerBottomColor);
    
    // Outer wall top gradient (shadow from above - darker at center)
    if (outerTopOpacity <= 0.01) {
      outerTopEdge.style.display = 'none';
      outerTopEdge.style.background = 'none';
      outerTopEdge.style.height = '0px';
    } else {
      outerTopEdge.style.display = 'block';
      const outerTopGradient = `radial-gradient(
        ellipse ${outerGradientRadius}% 200% at 50% 0%,
        rgba(${outerTopRgb.r}, ${outerTopRgb.g}, ${outerTopRgb.b}, ${outerTopOpacity}) 0%,
        rgba(${outerTopRgb.r}, ${outerTopRgb.g}, ${outerTopRgb.b}, ${outerTopOpacity * 0.8}) 20%,
        rgba(${outerTopRgb.r}, ${outerTopRgb.g}, ${outerTopRgb.b}, ${outerTopOpacity * 0.4}) 50%,
        rgba(${outerTopRgb.r}, ${outerTopRgb.g}, ${outerTopRgb.b}, 0) 100%
      )`;
      outerTopEdge.style.background = outerTopGradient;
      outerTopEdge.style.height = `${outerEdgeWidth}px`;
    }
    
    // Outer wall bottom light (SVG stroke gradient - replaces thin edge bar)
    if (outerEdgeEnabled) {
      updateLightStrokeEdge(
        outerLightStroke,
        outerWall,
        outerRadius,
        outerEdgeWidth,
        outerBottomRgb,
        outerBottomOpacity,
        'bottom',
        outerGradientRadius
      );
    } else if (outerLightStroke?.svg) {
      outerLightStroke.svg.style.display = 'none';
    }
    
    if (outerBottomEdge) {
      outerBottomEdge.style.display = 'none';
      outerBottomEdge.style.background = 'none';
      outerBottomEdge.style.height = '0px';
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIGHT STROKE HELPERS
// SVG stroke gradients that follow the wall path (no thin edge bars)
// ═══════════════════════════════════════════════════════════════════════════════

function createLightStrokeSvg(className, gradientId) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add(className);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('preserveAspectRatio', 'none');
  
  const defs = document.createElementNS(SVG_NS, 'defs');
  const gradient = document.createElementNS(SVG_NS, 'linearGradient');
  gradient.setAttribute('id', gradientId);
  gradient.setAttribute('gradientUnits', 'objectBoundingBox');
  
  const stops = [];
  for (let i = 0; i < 4; i += 1) {
    const stop = document.createElementNS(SVG_NS, 'stop');
    gradient.appendChild(stop);
    stops.push(stop);
  }
  
  defs.appendChild(gradient);
  svg.appendChild(defs);
  
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('fill', 'none');
  rect.setAttribute('stroke', `url(#${gradientId})`);
  rect.setAttribute('stroke-linecap', 'round');
  rect.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(rect);
  
  return { svg, rect, gradient, stops };
}

function updateLightStrokeEdge(stroke, hostEl, radiusPx, edgeWidth, rgb, opacity, direction, gradientRadius) {
  if (!stroke?.svg || !stroke?.rect || !hostEl) return;
  
  const useOpacity = Number.isFinite(opacity) ? opacity : 0;
  if (useOpacity <= 0.01 || edgeWidth <= 0) {
    stroke.svg.style.display = 'none';
    return;
  }
  
  const rect = hostEl.getBoundingClientRect();
  if (!rect || rect.width <= 1 || rect.height <= 1) {
    stroke.svg.style.display = 'none';
    return;
  }
  
  const strokeWidth = getLightStrokeWidth(edgeWidth);
  const width = rect.width;
  const height = rect.height;
  const half = strokeWidth * 0.5;
  const drawW = Math.max(1, width - strokeWidth);
  const drawH = Math.max(1, height - strokeWidth);
  const maxRadius = Math.min(drawW * 0.5, drawH * 0.5);
  const insetRadius = Math.max(0, Math.min(radiusPx - half, maxRadius));
  
  stroke.svg.style.display = 'block';
  stroke.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  stroke.svg.setAttribute('width', String(width));
  stroke.svg.setAttribute('height', String(height));
  
  stroke.rect.setAttribute('x', String(half));
  stroke.rect.setAttribute('y', String(half));
  stroke.rect.setAttribute('width', String(drawW));
  stroke.rect.setAttribute('height', String(drawH));
  stroke.rect.setAttribute('rx', String(insetRadius));
  stroke.rect.setAttribute('ry', String(insetRadius));
  stroke.rect.setAttribute('stroke-width', String(strokeWidth));
  
  const falloff = getLightFalloffPercent(gradientRadius);
  setSvgStop(stroke.stops[0], 0, rgb, useOpacity);
  setSvgStop(stroke.stops[1], falloff * 0.35, rgb, useOpacity * 0.8);
  setSvgStop(stroke.stops[2], falloff * 0.7, rgb, useOpacity * 0.4);
  setSvgStop(stroke.stops[3], falloff, rgb, 0);
  
  stroke.gradient.setAttribute('x1', '0');
  stroke.gradient.setAttribute('x2', '0');
  stroke.gradient.setAttribute('y1', direction === 'bottom' ? '1' : '0');
  stroke.gradient.setAttribute('y2', direction === 'bottom' ? '0' : '1');
}

function getLightStrokeWidth(edgeWidth) {
  const base = Number.isFinite(edgeWidth) ? edgeWidth : 0;
  return Math.max(base * 2, base + 2);
}

function getLightFalloffPercent(gradientRadius) {
  const radius = clamp(Number(gradientRadius) || 70, 30, 100);
  const falloff = (radius / 100) * 0.35;
  return clamp(falloff, 0.12, 0.45);
}

function setSvgStop(stop, offset, rgb, opacity) {
  if (!stop) return;
  const stopOffset = clamp(offset, 0, 1);
  const safeOpacity = clamp(opacity, 0, 1);
  stop.setAttribute('offset', `${stopOffset * 100}%`);
  stop.setAttribute('stop-color', `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
  stop.setAttribute('stop-opacity', String(safeOpacity));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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
// GETTERS
// Access to wall elements for external modules
// ═══════════════════════════════════════════════════════════════════════════════

export function getOuterWall() { return outerWall; }
export function getInnerWall() { return innerWall; }
export function getTopEdge() { return topEdge; }
export function getBottomEdge() { return bottomEdge; }
export function getOuterTopEdge() { return outerTopEdge; }
export function getOuterBottomEdge() { return outerBottomEdge; }

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════════════════════════

export function destroyWallElements() {
  [outerWall, innerWall].forEach(el => {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });
  outerWall = null;
  innerWall = null;
  innerGlow = null;
  topEdge = null;
  bottomEdge = null;
  outerTopEdge = null;
  outerBottomEdge = null;
  innerLightStroke = null;
  outerLightStroke = null;
  initialized = false;
}
