// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       WALL SHADOW SYSTEM                                     ║
// ║                                                                              ║
// ║  Manages the inner shadow and edge lighting effects for the wall system.     ║
// ║  Moved from control-registry.js to avoid circular dependencies.              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color string (e.g., '#ffffff' or '#fff')
 * @returns {{r: number, g: number, b: number}} RGB values (0-255)
 */
export function hexToRgb(hex) {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Handle 3-character hex
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

/**
 * Convert hex color to RGB CSS string for use in rgba()
 * @param {string} hex - Hex color string (e.g., '#ff0000')
 * @returns {string} RGB values as comma-separated string (e.g., '255, 0, 0')
 */
export function hexToRgbString(hex) {
  const { r, g, b } = hexToRgb(hex);
  return `${r}, ${g}, ${b}`;
}

/**
 * Update the CSS variables for the wall shadow
 * @param {Object} g - Global state object
 */
export function updateWallShadowCSS(g) {
  const container = document.getElementById('bravia-balls');
  if (!container) return;
  
  // Check if dark mode
  const isDark = document.body.classList.contains('dark-mode');
  
  // ═══ EDGE BORDERS DISABLED ═══
  // All edge shadows and strokes are now disabled by default.
  // Previously created 1px bevel lines around the inner wall edge.
  // To re-enable, set these values in config:
  // wallShadowEdgeTopOpacityLight, wallShadowEdgeTopOpacityDark, etc.
  
  // Dark edges (top + left) - wall shadow falling onto content
  const edgeTopOpacity = isDark 
    ? (g.wallShadowEdgeTopOpacityDark ?? 0)
    : (g.wallShadowEdgeTopOpacityLight ?? 0);
  const edgeLeftOpacity = isDark
    ? (g.wallShadowEdgeLeftOpacityDark ?? 0)
    : (g.wallShadowEdgeLeftOpacityLight ?? 0);
  
  // Light edges (bottom + right) - catching light
  const edgeBottomOpacity = isDark
    ? (g.wallShadowEdgeBottomOpacityDark ?? 0)
    : (g.wallShadowEdgeBottomOpacityLight ?? 0);
  const edgeRightOpacity = isDark
    ? (g.wallShadowEdgeRightOpacityDark ?? 0)
    : (g.wallShadowEdgeRightOpacityLight ?? 0);
  
  // Ambient inset shadow (soft vignette from wall depth) - kept for subtle depth
  const ambientBlur = g.wallShadowAmbientBlur ?? 20;
  const ambientOpacity = isDark
    ? (g.wallShadowAmbientOpacityDark ?? 0.12)
    : (g.wallShadowAmbientOpacityLight ?? 0.04);
  
  // Stroke (solid edge definition) - disabled
  const strokeOpacity = isDark
    ? (g.wallShadowStrokeOpacityDark ?? 0)
    : (g.wallShadowStrokeOpacityLight ?? 0);
  
  // ═══ BUILD SHADOW STRING ═══
  const shadows = [];
  
  // Only add edge shadows if they have non-zero opacity
  if (edgeTopOpacity > 0) {
    shadows.push(`inset 0 1px 0 rgba(0,0,0, ${edgeTopOpacity.toFixed(3)})`);
  }
  if (edgeLeftOpacity > 0) {
    shadows.push(`inset 1px 0 0 rgba(0,0,0, ${edgeLeftOpacity.toFixed(3)})`);
  }
  if (edgeBottomOpacity > 0) {
    shadows.push(`inset 0 -1px 0 rgba(255,255,255, ${edgeBottomOpacity.toFixed(3)})`);
  }
  if (edgeRightOpacity > 0) {
    shadows.push(`inset -1px 0 0 rgba(255,255,255, ${edgeRightOpacity.toFixed(3)})`);
  }
  
  // Ambient vignette (always add if non-zero)
  if (ambientOpacity > 0) {
    shadows.push(`inset 2px 3px ${ambientBlur}px rgba(0,0,0, ${ambientOpacity.toFixed(3)})`);
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SINGLE INNER SHADOW — above balls, below text (one inset shadow only)
  // Applied to .inner-shadow element. Uses PAGE background colour (not frame colour)
  // so the shadow blends the simulation edges into the surrounding background.
  // ─────────────────────────────────────────────────────────────────────────────
  const innerShadowEnabled = g.wallInnerShadowEnabled ?? true;
  let innerShadowStr = 'none';
  let innerShadowOpacity = 0;
  if (innerShadowEnabled) {
    const innerOpacity = isDark
      ? (g.wallInnerShadowOpacityDarkV2 ?? 1.0)
      : (g.wallInnerShadowOpacityLightV2 ?? 1.0);
    innerShadowOpacity = innerOpacity;
    if (innerOpacity > 0) {
      const blurVh = g.wallInnerShadowBlurVh ?? 15;
      const blur = `${blurVh}vh`;
      const spreadVh = g.wallInnerShadowSpreadVh ?? 15;
      const spread = spreadVh !== 0 ? `${spreadVh}vh` : '0';
      // Use explicit HEX codes because hexToRgb cannot parse 'var(--...)' strings
      const bgHex = isDark ? '#0a0a0a' : '#f5f5f5';
      const { r, g: gb, b } = hexToRgb(bgHex);
      
      // Full inset on all sides (no offset) — blends edges into background colour
      // Using standard rgba() for maximum compatibility
      innerShadowStr = `inset 0 0 ${blur} ${spread} rgba(${r}, ${gb}, ${b}, ${innerOpacity.toFixed(3)})`;
    }
  }
  container.style.setProperty('--inner-wall-inner-shadow', innerShadowStr);
  container.style.setProperty('--inner-wall-inner-shadow-opacity', String(innerShadowOpacity));
  
  // Apply stroke opacity (disabled by default)
  container.style.setProperty('--wall-stroke-opacity', strokeOpacity.toFixed(3));
  
  // Remove legacy style tag that targeted #bravia-balls::before (display:none)
  const styleTag = document.getElementById('wall-shadow-override-style');
  if (styleTag) styleTag.remove();
}
