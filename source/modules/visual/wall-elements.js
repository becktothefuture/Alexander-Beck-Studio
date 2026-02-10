// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         WALL ELEMENTS SYSTEM                                 ║
// ║                                                                              ║
// ║  Creates real DOM elements for outer and inner walls with proper layering.  ║
// ║  Manages continuous conic gradient borders via CSS custom properties.      ║
// ║                                                                              ║
// ║  Structure:                                                                  ║
// ║  #bravia-balls                                                               ║
// ║    ├── .outer-wall (recessed effect, conic border via ::before)              ║
// ║    │   └── .outer-wall__shine (inset blur glow layer)                         ║
// ║    ├── .inner-wall (raised effect, conic border via ::before)                ║
// ║    │   ├── .inner-wall__glow (soft ambient top light)                         ║
// ║    │   └── .inner-wall__shine (optional glow)                                  ║
// ║    ├── canvas                                                                 ║
// ║    └── .inner-shadow (z:25 - below inner wall, blends edges into bg)          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

// Element references
let outerWall = null;
let outerWallShine = null;
let innerWall = null;
let innerGlow = null;
let innerShine = null;
let innerShadowEl = null;
let initialized = false;
let wallUpdateRaf = null;

// ═══════════════════════════════════════════════════════════════════════════════
// LIGHT SIMULATION
// Naturalistic fluctuation of ambient light
// ═══════════════════════════════════════════════════════════════════════════════

let lightSimTimeout = null;

function applyAmbientLightMul(multiplier) {
  if (outerWall) {
    outerWall.style.setProperty('--ambient-light-mul', String(multiplier));
  }
  if (innerWall) {
    innerWall.style.setProperty('--ambient-light-mul', String(multiplier));
  }
}

export function initLightSimulation() {
  if (lightSimTimeout) clearTimeout(lightSimTimeout);
  lightSimTimeout = null;
  
  // Baseline is fixed by default to avoid repaint-heavy fluctuation writes.
  const baseline = 1.0;
  applyAmbientLightMul(baseline);

  const g = getGlobals();
  if (!g || g.wallLightFluctuationEnabled !== true) {
    return;
  }
  if (!outerWall) {
    return;
  }

  const tick = () => {
    const globals = getGlobals();
    if (!globals || !outerWall) {
      lightSimTimeout = setTimeout(tick, 1000);
      return;
    }
    if (globals.wallLightFluctuationEnabled !== true) {
      lightSimTimeout = null;
      applyAmbientLightMul(baseline);
      return;
    }

    const strength = Math.max(0, Number(globals.wallLightFluctuationStrength ?? 0.15) || 0);
    const randomFactor = (Math.random() - 0.5) * 2;
    const targetMul = 1.0 + (randomFactor * strength);
    applyAmbientLightMul(targetMul.toFixed(3));

    const nextInterval = 3000 + Math.random() * 3000;
    lightSimTimeout = setTimeout(tick, nextInterval);
  };

  tick();
}

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
  
  // Create outer wall shine (inset blur glow layer)
  outerWallShine = document.createElement('div');
  outerWallShine.className = 'outer-wall__shine';
  outerWallShine.setAttribute('aria-hidden', 'true');
  outerWallShine.style.position = 'absolute';
  outerWallShine.style.pointerEvents = 'none';
  outerWall.appendChild(outerWallShine);
  
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
  
  // Create inner shine (strong blur from all sides, using background color)
  innerShine = document.createElement('div');
  innerShine.className = 'inner-wall__shine';
  innerShine.setAttribute('aria-hidden', 'true');
  innerShine.style.position = 'absolute';
  innerShine.style.pointerEvents = 'none';
  innerWall.appendChild(innerShine);
  
  // Single inner shadow: above canvas (balls), below inner wall / text layers
  innerShadowEl = document.createElement('div');
  innerShadowEl.className = 'inner-shadow';
  innerShadowEl.setAttribute('aria-hidden', 'true');
  container.appendChild(innerShadowEl);
  
  initialized = true;
  
  // Start light simulation
  initLightSimulation();
  
  // Apply initial styles
  updateWallElements();
  
  // Apply inner shadow CSS (must happen after element creation)
  // Use dynamic import to avoid circular dependency with control-registry.js
  const g = getGlobals();
  if (g) {
    import('../ui/control-registry.js').then(({ updateWallShadowCSS }) => {
      updateWallShadowCSS(g);
    }).catch(() => {});
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE WALLS
// Recalculates wall styles based on current settings and theme
// ═══════════════════════════════════════════════════════════════════════════════

function applyWallElementsNow() {
  if (!outerWall || !innerWall) return;
  
  const g = getGlobals();
  const isDark = document.body.classList.contains('dark-mode');
  
  // Wall geometry is now fully CSS-driven via custom properties:
  // - --wall-radius: inner wall radius (set by state.js)
  // - --wall-thickness: gap between walls (set by state.js)
  // - --outer-wall-radius: derived in tokens.css from above
  // No inline style overrides needed - CSS handles transitions smoothly.
  
  // Update border styles (CSS variables for gradients/shadows)
  updateWallBorders(g, isDark);
}

export function requestWallElementUpdate() {
  if (wallUpdateRaf !== null) return;
  wallUpdateRaf = requestAnimationFrame(() => {
    wallUpdateRaf = null;
    applyWallElementsNow();
  });
}

export function updateWallElements() {
  requestWallElementUpdate();
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE WALL BORDERS
// Sets CSS custom properties that control the conic gradient borders
// ═══════════════════════════════════════════════════════════════════════════════

function updateWallBorders(g, isDark) {
  const activeWallColor = (getComputedStyle(document.documentElement).getPropertyValue('--wall-color') || '').trim();

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
  // INNER WALL SHINE (Inset blur from background colour to blend edges)
  // ─────────────────────────────────────────────────────────────────────────────
  if (innerShine) {
    const innerShineEnabled = g.innerWallShineEnabled !== false;
    const shineOpacity = isDark
      ? (g.innerWallShineOpacityDark ?? 0.5)
      : (g.innerWallShineOpacityLight ?? 0.4);
      
    if (!innerShineEnabled || shineOpacity <= 0.01) {
      innerShine.style.display = 'none';
    } else {
      innerShine.style.display = 'block';
      const shineBlur = g.innerWallShineBlur ?? 20;
      const shineSpread = g.innerWallShineSpread ?? 4;
      const shineOvershoot = g.innerWallShineOvershoot ?? 10;

      innerShine.style.setProperty('--inner-wall-shine-opacity', shineOpacity);
      innerShine.style.setProperty('--inner-wall-shine-blur', `${shineBlur}px`);
      innerShine.style.setProperty('--inner-wall-shine-spread', `${shineSpread}px`);
      innerShine.style.setProperty('--inner-wall-shine-overshoot', `-${shineOvershoot}px`);
      
      // Prefer active wall color so browser-harmony light mode doesn't produce a visible seam.
      const shineColor = g.innerWallShineColor || activeWallColor || (isDark
        ? (g.frameColorDark ?? g.frameColor ?? '#242529')
        : (g.frameColorLight ?? g.frameColor ?? '#242529'));
      innerShine.style.setProperty('--inner-wall-shine-color', shineColor);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // OUTER WALL SHINE (Inset blur from background colour to blend edges)
  // ─────────────────────────────────────────────────────────────────────────────
  if (outerWallShine) {
    const outerShineEnabled = g.outerWallShineEnabled !== false;
    const shineOpacity = isDark
      ? (g.outerWallShineOpacityDark ?? 0.5)
      : (g.outerWallShineOpacityLight ?? 0.4);
      
    if (!outerShineEnabled || shineOpacity <= 0.01) {
      outerWallShine.style.display = 'none';
    } else {
      outerWallShine.style.display = 'block';
      const shineBlur = isDark
        ? (g.outerWallShineBlurDark ?? 20)
        : (g.outerWallShineBlurLight ?? 20);
      const shineSpread = isDark
        ? (g.outerWallShineSpreadDark ?? 4)
        : (g.outerWallShineSpreadLight ?? 4);
      const shineOvershoot = isDark
        ? (g.outerWallShineOvershootDark ?? 10)
        : (g.outerWallShineOvershootLight ?? 10);

      outerWallShine.style.setProperty('--outer-wall-shine-opacity', shineOpacity);
      outerWallShine.style.setProperty('--outer-wall-shine-blur', `${shineBlur}px`);
      outerWallShine.style.setProperty('--outer-wall-shine-spread', `${shineSpread}px`);
      outerWallShine.style.setProperty('--outer-wall-shine-overshoot', `-${shineOvershoot}px`);
      
      // Prefer active wall color so browser-harmony light mode doesn't produce a visible seam.
      const shineColor = isDark
        ? (g.outerWallShineColorDark || activeWallColor || g.frameColorDark || g.frameColor || '#242529')
        : (g.outerWallShineColorLight || activeWallColor || g.frameColorLight || g.frameColor || '#242529');
      outerWallShine.style.setProperty('--outer-wall-shine-color', shineColor);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INNER WALL BORDER (Conic gradient via ::before)
  // ─────────────────────────────────────────────────────────────────────────────
  if (innerWall) {
    const width = g.innerWallBorderWidth ?? 2;
    // Angles for conical gradient: center 0deg (top).
    // Spread defines how wide the bright spot is.
    const spread = g.innerWallBorderGradientSpread ?? 75; // Degrees from center (total width = 2x)
    
    const brightOp = isDark ? (g.innerWallBorderBrightOpacityDark ?? 0.6) : (g.innerWallBorderBrightOpacityLight ?? 0.5);
    const dimOp = isDark ? (g.innerWallBorderDimOpacityDark ?? 0.2) : (g.innerWallBorderDimOpacityLight ?? 0.15);
    const shadowOp = isDark ? (g.innerWallBorderShadowOpacityDark ?? 0.35) : (g.innerWallBorderShadowOpacityLight ?? 0.2);

    innerWall.style.setProperty('--inner-wall-border-width', `${width}px`);
    
    // Set gradient stops based on spread
    // 0deg = Top Center (Brightest)
    // spread = End of bright fade
    innerWall.style.setProperty('--inner-wall-grad-stop-bright', `0deg`);
    innerWall.style.setProperty('--inner-wall-grad-stop-dim-start', `${spread}deg`);
    innerWall.style.setProperty('--inner-wall-grad-stop-dim-end', `${360 - spread}deg`);
    
    // Multiply by ambient light for dynamic effect
    innerWall.style.setProperty('--inner-wall-border-bright-opacity', `calc(${brightOp} * var(--ambient-light-mul, 1))`);
    innerWall.style.setProperty('--inner-wall-border-dim-opacity', `calc(${dimOp} * var(--ambient-light-mul, 1))`);
    innerWall.style.setProperty('--inner-wall-border-shadow-opacity', shadowOp); // Shadows typically don't fluctuate with light intensity in the same way, or inverse? Let's keep static for now or maybe subtle inverse? Sticking to static for shadow to anchor it.
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // OUTER WALL BORDER (Conic gradient via ::before)
  // ─────────────────────────────────────────────────────────────────────────────
  if (outerWall) {
    const width = g.outerWallBorderWidth ?? 2;
    // Angles for conical gradient: center 180deg (bottom).
    const spread = g.outerWallBorderGradientSpread ?? 85; // Degrees from center
    
    const brightOp = isDark ? (g.outerWallBorderBrightOpacityDark ?? 0.6) : (g.outerWallBorderBrightOpacityLight ?? 0.5);
    const dimOp = isDark ? (g.outerWallBorderDimOpacityDark ?? 0.2) : (g.outerWallBorderDimOpacityLight ?? 0.15);
    const shadowOp = isDark ? (g.outerWallBorderShadowOpacityDark ?? 0.4) : (g.outerWallBorderShadowOpacityLight ?? 0.25);

    outerWall.style.setProperty('--outer-wall-border-width', `${width}px`);
    
    // Set gradient stops based on spread (centered at 0deg in rotated gradient)
    // With `from 180deg`, 0deg maps to bottom center (brightest).
    outerWall.style.setProperty('--outer-wall-grad-stop-bright', `0deg`);
    outerWall.style.setProperty('--outer-wall-grad-stop-dim-start', `${spread}deg`);
    outerWall.style.setProperty('--outer-wall-grad-stop-dim-end', `${360 - spread}deg`);
    
    outerWall.style.setProperty('--outer-wall-border-bright-opacity', `calc(${brightOp} * var(--ambient-light-mul, 1))`);
    outerWall.style.setProperty('--outer-wall-border-dim-opacity', `calc(${dimOp} * var(--ambient-light-mul, 1))`);
    outerWall.style.setProperty('--outer-wall-border-shadow-opacity', shadowOp);

    // ─────────────────────────────────────────────────────────────────────────────
    // MICRO-DETAILS (AO & Specular Bevel)
    // ─────────────────────────────────────────────────────────────────────────────
    
    // Ambient Occlusion (AO)
    const aoOpacity = isDark ? (g.wallAOOpacityDark ?? 0.3) : (g.wallAOOpacityLight ?? 0.15);
    const aoSpread = g.wallAOSpread ?? 2;
    outerWall.style.setProperty('--wall-ao-opacity', aoOpacity);
    outerWall.style.setProperty('--wall-ao-spread', `${aoSpread}px`);

    // Specular Micro-Bevel
    const specEnabled = g.wallSpecularEnabled !== false;
    const specOpacity = specEnabled
      ? (isDark ? (g.wallSpecularOpacityDark ?? 0.5) : (g.wallSpecularOpacityLight ?? 0.4))
      : 0;
    const specWidth = g.wallSpecularWidth ?? 0.5;
    // Specular highlight fluctuates significantly with light
    // We update the variable that the CSS uses in its calc()
    outerWall.style.setProperty('--wall-specular-opacity', specOpacity); 
    outerWall.style.setProperty('--wall-specular-width', `${specWidth}px`);
    
    // Top Shadow (Overhang)
    const topShadowOp = isDark ? (g.outerWallTopShadowOpacityDark ?? 0.6) : (g.outerWallTopShadowOpacityLight ?? 0.4);
    const topShadowBlur = g.outerWallTopShadowBlur ?? 8;
    const topShadowOffset = g.outerWallTopShadowOffset ?? 3;
    
    outerWall.style.setProperty('--outer-wall-top-shadow-opacity', topShadowOp);
    outerWall.style.setProperty('--outer-wall-top-shadow-blur', `${topShadowBlur}px`);
    outerWall.style.setProperty('--outer-wall-top-shadow-offset', `${topShadowOffset}px`);
  }
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

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════════════════════════

export function destroyWallElements() {
  if (lightSimTimeout) {
    clearTimeout(lightSimTimeout);
    lightSimTimeout = null;
  }
  if (wallUpdateRaf !== null) {
    cancelAnimationFrame(wallUpdateRaf);
    wallUpdateRaf = null;
  }
  [outerWall, innerWall].forEach(el => {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });
  outerWall = null;
  outerWallShine = null;
  innerWall = null;
  innerGlow = null;
  innerShine = null;
  initialized = false;
}
