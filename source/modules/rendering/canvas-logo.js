// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           CANVAS LOGO MODULE                                ║
// ║      Renders the Alexander Beck Studio logo inside the canvas element       ║
// ║      with theme-aware colors, DPR scaling, and entrance animation           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
const LOGO_VIEWBOX_W = 919;
const LOGO_VIEWBOX_H = 66;
const LOGO_ASPECT = LOGO_VIEWBOX_W / LOGO_VIEWBOX_H; // 13.924242...

// Theme colors (from tokens.css)
const LOGO_COLOR_LIGHT = '#161616';
const LOGO_COLOR_DARK = '#e3e9f0';
const MIN_LOGO_CONTRAST = 2.2;

// Entrance animation settings
const ENTRANCE_DURATION_MS = 1000;
const ENTRANCE_BLUR_MAX = 8; // pixels

// ═══════════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════════
let offscreenByColor = new Map(); // key: normalized color string -> offscreen canvas
let svgPathData = null;     // Cached SVG path data (extracted from DOM)
let currentSize = { width: 0, height: 0, cssWidth: 0, cssHeight: 0 };
let lastDpr = 0;
let isInitialized = false;

// Entrance animation state
const entranceState = {
  progress: 0,        // 0.0 to 1.0
  isComplete: false,
  isStarted: false,
  startTimeMs: 0
};

// ═══════════════════════════════════════════════════════════════════════════════
// EASING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════
function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function getColorParserCtx() {
  const c = document.createElement('canvas');
  c.width = 1;
  c.height = 1;
  return c.getContext('2d');
}

const COLOR_PARSER_CTX = typeof document !== 'undefined' ? getColorParserCtx() : null;

function normalizeCssColor(input, fallback = '#000000') {
  if (!COLOR_PARSER_CTX) return fallback;
  try {
    COLOR_PARSER_CTX.fillStyle = fallback;
    COLOR_PARSER_CTX.fillStyle = String(input || '').trim() || fallback;
    return COLOR_PARSER_CTX.fillStyle || fallback;
  } catch (e) {
    return fallback;
  }
}

function parseRgbColor(input) {
  if (!input) return null;
  const color = String(input).trim().toLowerCase();
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(ch => ch + ch).join('');
    }
    if (hex.length !== 6) return null;
    const num = Number.parseInt(hex, 16);
    if (!Number.isFinite(num)) return null;
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  const rgbMatch = color.match(/^rgba?\(([^)]+)\)$/);
  if (!rgbMatch) return null;
  const parts = rgbMatch[1].split(',').map(part => Number.parseFloat(part.trim()));
  if (parts.length < 3 || parts.slice(0, 3).some(v => !Number.isFinite(v))) return null;
  return {
    r: Math.max(0, Math.min(255, Math.round(parts[0]))),
    g: Math.max(0, Math.min(255, Math.round(parts[1]))),
    b: Math.max(0, Math.min(255, Math.round(parts[2])))
  };
}

function relativeLuminance(rgb) {
  const toLinear = (c) => {
    const srgb = c / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };
  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

function resolveSceneBackgroundColor(rootStyles) {
  const sceneEl = document.getElementById('bravia-balls');
  if (sceneEl) {
    const sceneBg = getComputedStyle(sceneEl).backgroundColor?.trim();
    if (sceneBg) return sceneBg;
  }

  const isDark = document.documentElement.classList.contains('dark-mode')
    || document.body?.classList.contains('dark-mode');
  const tokenBg = rootStyles.getPropertyValue(isDark ? '--bg-dark' : '--bg-light').trim();
  if (tokenBg) return tokenBg;

  return rootStyles.getPropertyValue('--wall-color').trim() || '#242529';
}

function resolveAccessibleLogoColor() {
  // Prefer CSS-resolved logo color so canvas matches the design system source of truth.
  const styles = getComputedStyle(document.documentElement);
  const rawLogoColor = styles.getPropertyValue('--text-logo').trim()
    || (document.getElementById('brand-logo')
      ? getComputedStyle(document.getElementById('brand-logo')).color
      : '');
  const rawSceneColor = resolveSceneBackgroundColor(styles);

  const requestedLogoColor = normalizeCssColor(rawLogoColor, LOGO_COLOR_DARK);
  const sceneColor = normalizeCssColor(rawSceneColor, '#242529');
  const logoRgb = parseRgbColor(requestedLogoColor);
  const sceneRgb = parseRgbColor(sceneColor);

  if (!sceneRgb) return requestedLogoColor;

  // Always choose the token color that has higher contrast with the active scene background.
  const lightRgb = parseRgbColor(LOGO_COLOR_LIGHT);
  const darkRgb = parseRgbColor(LOGO_COLOR_DARK);
  if (!lightRgb || !darkRgb) return requestedLogoColor;

  const lightContrast = contrastRatio(lightRgb, sceneRgb);
  const darkContrast = contrastRatio(darkRgb, sceneRgb);
  const bestToken = darkContrast >= lightContrast ? LOGO_COLOR_DARK : LOGO_COLOR_LIGHT;

  // If requested color is already good enough, keep it; otherwise force best-contrast token.
  if (logoRgb && contrastRatio(logoRgb, sceneRgb) >= MIN_LOGO_CONTRAST) {
    return requestedLogoColor;
  }

  return bestToken;
}

/**
 * Keep entrance progress tied to wall-clock time so it can complete even when
 * physics updates are sparse (or temporarily skipped by mode-level optimizations).
 */
function syncEntranceProgress(nowMs = performance.now()) {
  if (!entranceState.isStarted || entranceState.isComplete) return;

  if (!Number.isFinite(entranceState.startTimeMs) || entranceState.startTimeMs <= 0) {
    entranceState.startTimeMs = nowMs;
  }

  const elapsed = Math.max(0, nowMs - entranceState.startTimeMs);
  const progress = Math.min(1, elapsed / ENTRANCE_DURATION_MS);
  entranceState.progress = progress;

  if (progress >= 1) {
    entranceState.isComplete = true;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIZE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate logo size based on viewport and canvas dimensions
 * Matches CSS clamp logic exactly to ensure consistent sizing
 */
function calculateLogoSize(canvasWidth, canvasHeight, dpr) {
  const vw = window.innerWidth;
  const isMobile = vw <= 600;
  
  // Step 1: Calculate base width from CSS clamp logic
  let logoWidth;
  if (isMobile) {
    logoWidth = vw * 0.60; // 60vw on mobile
  } else {
    // clamp(250px, 45vw, 500px) on desktop
    logoWidth = Math.max(250, Math.min(500, vw * 0.45));
  }
  
  // Step 2: Safety max - never exceed 90vw (prevents side clipping)
  logoWidth = Math.min(logoWidth, vw * 0.90);
  
  // Step 3: Additional safety - never exceed canvas width minus padding
  const canvasCssPx = canvasWidth / dpr;
  const maxCanvasWidth = canvasCssPx * 0.95; // 5% padding on each side
  logoWidth = Math.min(logoWidth, maxCanvasWidth);
  
  // Step 4: Calculate height from aspect ratio (NEVER distort)
  const logoHeight = logoWidth / LOGO_ASPECT;
  
  // Step 5: Scale to canvas pixels (DPR)
  return {
    width: Math.round(logoWidth * dpr),
    height: Math.round(logoHeight * dpr),
    cssWidth: logoWidth,
    cssHeight: logoHeight
  };
}

/**
 * Get centered position for logo in canvas
 */
function getLogoCenterPosition(canvasWidth, canvasHeight, logoWidth, logoHeight) {
  return {
    x: (canvasWidth - logoWidth) / 2,
    y: (canvasHeight - logoHeight) / 2
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SVG EXTRACTION AND RENDERING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract SVG path data from DOM element
 */
function extractSvgPaths() {
  const svg = document.querySelector('#brand-logo .brand-logo-svg');
  if (!svg) {
    console.warn('[canvas-logo] SVG element not found');
    return null;
  }
  
  const paths = svg.querySelectorAll('path');
  const pathData = [];
  
  paths.forEach(path => {
    const d = path.getAttribute('d');
    if (d) {
      pathData.push(d);
    }
  });
  
  return pathData;
}

/**
 * Render SVG to an offscreen canvas with specified color
 * Uses 2x supersampling for crisp edges on all displays
 */
function renderToOffscreen(pathData, width, height, color) {
  if (!pathData || pathData.length === 0 || width <= 0 || height <= 0) {
    return null;
  }
  
  // Supersample at 2x for crisp anti-aliasing, then scale down when drawing
  const SUPERSAMPLE = 2;
  const ssWidth = width * SUPERSAMPLE;
  const ssHeight = height * SUPERSAMPLE;
  
  const offscreen = document.createElement('canvas');
  offscreen.width = ssWidth;
  offscreen.height = ssHeight;
  const ctx = offscreen.getContext('2d', { alpha: true });
  
  if (!ctx) return null;
  
  // Enable high-quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Scale to fit the supersampled dimensions
  const scaleX = ssWidth / LOGO_VIEWBOX_W;
  const scaleY = ssHeight / LOGO_VIEWBOX_H;
  
  ctx.fillStyle = color;
  ctx.scale(scaleX, scaleY);
  
  // Draw all paths with high-quality fill
  pathData.forEach(d => {
    const path = new Path2D(d);
    ctx.fill(path);
  });
  
  // Store supersample factor for drawing
  offscreen._supersample = SUPERSAMPLE;
  
  return offscreen;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initialize the canvas logo system
 * Must be called after DOM is ready
 */
export function initCanvasLogo() {
  if (isInitialized) return true;
  
  // Extract SVG paths from DOM
  svgPathData = extractSvgPaths();
  if (!svgPathData || svgPathData.length === 0) {
    console.error('[canvas-logo] Failed to extract SVG paths');
    return false;
  }
  
  isInitialized = true;
  return true;
}

/**
 * Update logo size and re-render offscreen canvases if needed
 * Should be called on resize and DPR changes
 */
export function updateLogoSize(canvasWidth, canvasHeight, dpr) {
  if (!isInitialized || !svgPathData) return;
  
  const newSize = calculateLogoSize(canvasWidth, canvasHeight, dpr);
  
  // Check if re-render is needed
  const sizeChanged = newSize.width !== currentSize.width || newSize.height !== currentSize.height;
  const dprChanged = dpr !== lastDpr;
  
  if (!sizeChanged && !dprChanged && offscreenByColor.size > 0) {
    return; // No changes needed
  }
  
  // Update state
  currentSize = newSize;
  lastDpr = dpr;
  
  // Size changed -> invalidate color cache (will re-render lazily in drawLogo)
  offscreenByColor.clear();
}

/**
 * Draw the logo centered in the canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @param {number} scale - Optional scale factor (for scene impact)
 */
export function drawLogo(ctx, canvasWidth, canvasHeight, scale = 1) {
  if (!isInitialized) return;
  
  const logoColor = resolveAccessibleLogoColor();
  let offscreen = offscreenByColor.get(logoColor);
  if (!offscreen) {
    offscreen = renderToOffscreen(svgPathData, currentSize.width, currentSize.height, logoColor);
    if (offscreen) {
      offscreenByColor.set(logoColor, offscreen);
    }
  }
  
  if (!offscreen) return;
  
  // Calculate centered position
  const pos = getLogoCenterPosition(canvasWidth, canvasHeight, currentSize.width, currentSize.height);

  // Failsafe: if the explicit trigger was missed, start once the page entrance is complete.
  if (!entranceState.isStarted && !entranceState.isComplete) {
    const html = document.documentElement;
    if (html?.classList.contains('entrance-complete') || html?.classList.contains('ui-entered')) {
      startLogoEntrance();
    }
  }

  // Keep progress time-based (independent from physics tick cadence).
  syncEntranceProgress();
  
  // Handle entrance animation
  let opacity = 1;
  let blur = 0;
  
  if (!entranceState.isComplete) {
    if (entranceState.isStarted) {
      const t = easeOutExpo(entranceState.progress);
      opacity = t;
      blur = (1 - t) * ENTRANCE_BLUR_MAX;
    } else {
      // Not started yet -> hidden
      opacity = 0;
    }
  }
  
  // Optimization: Skip drawing if invisible
  if (opacity <= 0) return;
  
  // Apply scene impact scale from CSS var (if available)
  let effectiveScale = scale;
  try {
    const sceneImpactScale = getComputedStyle(document.getElementById('abs-scene'))
      .getPropertyValue('--abs-scene-impact-logo-scale');
    if (sceneImpactScale) {
      const parsed = parseFloat(sceneImpactScale);
      if (Number.isFinite(parsed) && parsed > 0) {
        effectiveScale *= parsed;
      }
    }
  } catch (e) {
    // Ignore errors reading CSS var
  }
  
  // Save context state
  ctx.save();
  
  // Apply transformations
  if (effectiveScale !== 1) {
    // Scale from center
    const centerX = pos.x + currentSize.width / 2;
    const centerY = pos.y + currentSize.height / 2;
    ctx.translate(centerX, centerY);
    ctx.scale(effectiveScale, effectiveScale);
    ctx.translate(-centerX, -centerY);
  }
  
  // Apply entrance animation effects
  if (opacity < 1) {
    ctx.globalAlpha = opacity;
  }
  
  if (blur > 0.5) {
    ctx.filter = `blur(${blur}px)`;
  }
  
  // Draw the logo with high-quality downsampling from supersampled offscreen
  // Source: full supersampled canvas, Dest: target size at calculated position
  const ss = offscreen._supersample || 1;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    offscreen,
    0, 0, offscreen.width, offscreen.height,  // Source rect (full supersampled)
    pos.x, pos.y, currentSize.width, currentSize.height  // Dest rect (target size)
  );
  
  // Restore context state
  ctx.restore();
}

/**
 * Update entrance animation progress
 * @param {number} dt - Delta time in seconds
 */
export function updateLogoEntrance(dt) {
  if (!entranceState.isStarted || entranceState.isComplete) return;

  if (Number.isFinite(dt) && dt > 0) {
    entranceState.progress += (dt * 1000) / ENTRANCE_DURATION_MS;
    if (entranceState.progress >= 1) {
      entranceState.progress = 1;
      entranceState.isComplete = true;
    }
    // Keep time baseline aligned so draw-time syncing never jumps backward.
    entranceState.startTimeMs = performance.now() - (entranceState.progress * ENTRANCE_DURATION_MS);
    return;
  }

  syncEntranceProgress();
}

/**
 * Start the entrance animation
 */
export function startLogoEntrance() {
  entranceState.isStarted = true;
  entranceState.progress = 0;
  entranceState.isComplete = false;
  entranceState.startTimeMs = performance.now();
}

/**
 * Check if entrance animation is complete
 */
export function isLogoEntranceComplete() {
  return entranceState.isComplete;
}

/**
 * Skip entrance animation (make logo immediately visible)
 */
export function skipLogoEntrance() {
  entranceState.isStarted = true;
  entranceState.progress = 1;
  entranceState.isComplete = true;
  entranceState.startTimeMs = performance.now() - ENTRANCE_DURATION_MS;
}

/**
 * Get current logo size information
 */
export function getLogoSize() {
  return { ...currentSize };
}

/**
 * Check if logo system is initialized
 */
export function isCanvasLogoReady() {
  return isInitialized && currentSize.width > 0 && currentSize.height > 0;
}

/**
 * Force re-render of offscreen canvases (e.g., on theme change)
 */
export function refreshLogoRender() {
  if (!isInitialized || !svgPathData) return;

  offscreenByColor.clear();
}
