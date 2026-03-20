// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           CANVAS LOGO MODULE                                ║
// ║      Renders the Alexander Beck Studio logo inside the canvas element       ║
// ║      with theme-aware colors, DPR scaling, and entrance animation           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getShellConfig } from '../visual/site-shell.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
const LOGO_VIEWBOX_W = 511;
const LOGO_VIEWBOX_H = 101;
const LOGO_ASPECT = LOGO_VIEWBOX_W / LOGO_VIEWBOX_H;
const LOGO_SECONDARY_OPACITY_DEFAULT = 0.66;

// Theme colors (from tokens.css)
const LOGO_COLOR_LIGHT = '#161616';
const LOGO_COLOR_DARK = '#eaeaea';
const MIN_LOGO_CONTRAST = 2.2;

// Entrance animation settings
const ENTRANCE_DURATION_MS = 1000;
const ENTRANCE_BLUR_MAX = 8; // pixels
const LOGO_STYLE_CACHE_MS = 250;

// ═══════════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════════
let offscreenByRenderKey = new Map(); // key: normalized color + secondary opacity -> offscreen canvas
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

function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/** Mirrors html.modal-active / gate timing so canvas logo fades with the DOM chrome (DOM #brand-logo is display:none). */
const modalLogoFade = {
  lastModalActive: null,
  startMs: 0,
  durationMs: 455,
  from: 1,
  to: 1,
  value: 1
};

function parseCssTimeMs(raw, fallbackMs) {
  const s = String(raw || '').trim();
  if (!s) return fallbackMs;
  const ms = s.match(/^([\d.]+)ms$/i);
  if (ms) return Math.max(0, parseFloat(ms[1]) || fallbackMs);
  const sec = s.match(/^([\d.]+)s$/i);
  if (sec) return Math.max(0, (parseFloat(sec[1]) || 0) * 1000);
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.max(0, n) : fallbackMs;
}

/**
 * Opacity multiplier when gate modals open/close (1 = visible, 0 = hidden).
 * Durations align with main.css --ui-duration-out / --ui-logo-duration-in on #brand-logo.
 */
function resolveModalLogoOpacityMultiplier(nowMs) {
  if (typeof document === 'undefined') return 1;

  const modalActive = document.documentElement.classList.contains('modal-active');
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  if (modalLogoFade.lastModalActive === null) {
    modalLogoFade.lastModalActive = modalActive;
    modalLogoFade.value = modalActive ? 0 : 1;
    modalLogoFade.to = modalLogoFade.value;
    modalLogoFade.from = modalLogoFade.value;
    return modalLogoFade.value;
  }

  if (modalActive !== modalLogoFade.lastModalActive) {
    const root = getComputedStyle(document.documentElement);
    const outMs = parseCssTimeMs(root.getPropertyValue('--ui-duration-out'), 455);
    const inMs = parseCssTimeMs(root.getPropertyValue('--ui-logo-duration-in'), 1040);
    modalLogoFade.startMs = nowMs;
    modalLogoFade.from = modalLogoFade.value;
    modalLogoFade.to = modalActive ? 0 : 1;
    modalLogoFade.durationMs = modalActive ? outMs : inMs;
    modalLogoFade.lastModalActive = modalActive;
    if (reduceMotion) {
      modalLogoFade.value = modalLogoFade.to;
      return modalLogoFade.value;
    }
  }

  if (reduceMotion) {
    modalLogoFade.value = modalLogoFade.to;
    return modalLogoFade.value;
  }

  const elapsed = nowMs - modalLogoFade.startMs;
  const t = modalLogoFade.durationMs <= 0 ? 1 : Math.min(1, elapsed / modalLogoFade.durationMs);
  const eased = easeOutExpo(t);
  modalLogoFade.value = modalLogoFade.from + (modalLogoFade.to - modalLogoFade.from) * eased;
  if (t >= 1) modalLogoFade.value = modalLogoFade.to;
  return modalLogoFade.value;
}

const runtimeStyleCache = {
  expiresAt: 0,
  logoColor: LOGO_COLOR_DARK,
  sceneImpactScale: 1
};
let cacheInvalidationBound = false;

// ═══════════════════════════════════════════════════════════════════════════════
// COLOR / STYLE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
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
  } catch {
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

function isTransparentColor(input) {
  if (!input) return true;
  const color = String(input).trim().toLowerCase();
  if (!color || color === 'transparent') return true;
  const rgbaMatch = color.match(/^rgba\(([^)]+)\)$/);
  if (!rgbaMatch) return false;
  const parts = rgbaMatch[1].split(',').map(part => Number.parseFloat(part.trim()));
  return parts.length >= 4 && Number.isFinite(parts[3]) && parts[3] <= 0.01;
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
  const sceneEl = document.getElementById('simulations');
  if (sceneEl) {
    const sceneBg = getComputedStyle(sceneEl).backgroundColor?.trim();
    if (sceneBg && !isTransparentColor(sceneBg)) return sceneBg;
  }

  const isDark = document.documentElement.classList.contains('dark-mode')
    || document.body?.classList.contains('dark-mode');
  const tokenBg = rootStyles.getPropertyValue(isDark ? '--bg-dark' : '--bg-light').trim();
  if (tokenBg) return tokenBg;

  return rootStyles.getPropertyValue('--wall-color').trim() || '#242529';
}

function invalidateRuntimeStyleCache() {
  runtimeStyleCache.expiresAt = 0;
}

function refreshRuntimeStyleCache(nowMs = performance.now()) {
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
  let resolvedLogoColor = requestedLogoColor;

  // Always choose the token color that has higher contrast with the active scene background.
  const lightRgb = parseRgbColor(LOGO_COLOR_LIGHT);
  const darkRgb = parseRgbColor(LOGO_COLOR_DARK);
  if (sceneRgb && lightRgb && darkRgb) {
    const lightContrast = contrastRatio(lightRgb, sceneRgb);
    const darkContrast = contrastRatio(darkRgb, sceneRgb);
    const bestToken = darkContrast >= lightContrast ? LOGO_COLOR_DARK : LOGO_COLOR_LIGHT;
    if (!logoRgb || contrastRatio(logoRgb, sceneRgb) < MIN_LOGO_CONTRAST) {
      resolvedLogoColor = bestToken;
    }
  }

  let sceneImpactScale = 1;
  try {
    const sceneEl = document.getElementById('abs-scene');
    if (sceneEl) {
      const scaleRaw = getComputedStyle(sceneEl).getPropertyValue('--abs-scene-impact-logo-scale');
      const parsed = parseFloat(scaleRaw);
      if (Number.isFinite(parsed) && parsed > 0) {
        sceneImpactScale = parsed;
      }
    }
  } catch (error) {
    void error;
  }

  runtimeStyleCache.logoColor = resolvedLogoColor;
  runtimeStyleCache.sceneImpactScale = sceneImpactScale;
  runtimeStyleCache.expiresAt = nowMs + LOGO_STYLE_CACHE_MS;
}

function resolveAccessibleLogoColor(nowMs = performance.now()) {
  if (nowMs >= runtimeStyleCache.expiresAt) {
    refreshRuntimeStyleCache(nowMs);
  }
  return runtimeStyleCache.logoColor;
}

function resolveSceneImpactScale(nowMs = performance.now()) {
  if (nowMs >= runtimeStyleCache.expiresAt) {
    refreshRuntimeStyleCache(nowMs);
  }
  return runtimeStyleCache.sceneImpactScale;
}

function bindRuntimeCacheInvalidation() {
  if (cacheInvalidationBound) return;
  cacheInvalidationBound = true;
  window.addEventListener('resize', invalidateRuntimeStyleCache, { passive: true });
  window.addEventListener('orientationchange', invalidateRuntimeStyleCache, { passive: true });
  document.addEventListener('visibilitychange', invalidateRuntimeStyleCache, { passive: true });
  document.addEventListener('abs:theme-updated', invalidateRuntimeStyleCache);
  document.addEventListener('abs:wall-updated', invalidateRuntimeStyleCache);
  document.addEventListener('abs:scene-impact-updated', invalidateRuntimeStyleCache);
}

function resolveSecondaryLogoOpacity() {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--brand-logo-secondary-opacity')
    .trim();
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return LOGO_SECONDARY_OPACITY_DEFAULT;
  return Math.max(0, Math.min(1, parsed));
}

/** Matches `--brand-logo-user-scale` in tokens.css (canvas size = DOM transform). */
function resolveBrandLogoUserScale() {
  try {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--brand-logo-user-scale')
      .trim();
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  } catch (e) {
    void e;
  }
  return 1;
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
  const heroConfig = getShellConfig()?.hero || {};
  
  // Step 1: Calculate base width from CSS clamp logic
  let logoWidth;
  if (isMobile) {
    const mobileWidthVw = Number(heroConfig.mobileLogoWidthVw);
    const mobileMinPx = Number(heroConfig.mobileLogoMinPx);
    const mobileMaxPx = Number(heroConfig.mobileLogoMaxPx);
    const mobileHeightRatio = Number(heroConfig.mobileLogoHeightRatio);
    const widthFromViewport = vw * ((Number.isFinite(mobileWidthVw) ? mobileWidthVw : 50) / 100);
    const widthFromHeight = window.innerHeight * (Number.isFinite(mobileHeightRatio) ? mobileHeightRatio : 0.24);
    const minWidth = Number.isFinite(mobileMinPx) ? mobileMinPx : 170;
    const maxWidth = Number.isFinite(mobileMaxPx) ? mobileMaxPx : 220;
    logoWidth = Math.max(minWidth, Math.min(maxWidth, widthFromViewport, widthFromHeight));
  } else {
    const desktopWidthVw = Number(heroConfig.desktopLogoWidthVw);
    const desktopMinPx = Number(heroConfig.desktopLogoMinPx);
    const desktopMaxPx = Number(heroConfig.desktopLogoMaxPx);
    const widthFromViewport = vw * ((Number.isFinite(desktopWidthVw) ? desktopWidthVw : 52) / 100);
    const minWidth = Number.isFinite(desktopMinPx) ? desktopMinPx : 340;
    const maxWidth = Number.isFinite(desktopMaxPx) ? desktopMaxPx : 640;
    logoWidth = Math.max(minWidth, Math.min(maxWidth, widthFromViewport));
  }
  
  // Step 2: Safety max - never exceed 90vw (prevents side clipping)
  logoWidth = Math.min(logoWidth, vw * 0.90);
  
  // Step 3: Additional safety - never exceed canvas width minus padding
  const canvasCssPx = canvasWidth / dpr;
  const maxCanvasWidth = canvasCssPx * 0.95; // 5% padding on each side
  logoWidth = Math.min(logoWidth, maxCanvasWidth);

  // Step 3b: User scale from tokens (matches #brand-logo transform / entrance animation)
  logoWidth *= resolveBrandLogoUserScale();
  
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
  const isMobile = window.innerWidth <= 600;
  const mobileBias = Math.min(window.innerHeight * 0.045, 28);
  const shortViewportReduction = Math.max(0, 700 - window.innerHeight) * 0.18;
  const yBias = isMobile ? Math.max(0, mobileBias - shortViewportReduction) : 0;
  return {
    x: (canvasWidth - logoWidth) / 2,
    y: ((canvasHeight - logoHeight) / 2) - yBias
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
      pathData.push({
        d,
        isSecondary: path.classList.contains('brand-logo-path--secondary')
      });
    }
  });

  return pathData;
}

/**
 * Render SVG to an offscreen canvas with specified color
 * Uses 2x supersampling for crisp edges on all displays
 */
function renderToOffscreen(pathData, width, height, color, secondaryOpacity) {
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
  pathData.forEach(entry => {
    const path = new Path2D(entry.d);
    ctx.globalAlpha = entry.isSecondary ? secondaryOpacity : 1;
    ctx.fill(path);
  });
  ctx.globalAlpha = 1;
  
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
  bindRuntimeCacheInvalidation();
  invalidateRuntimeStyleCache();
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
  
  if (!sizeChanged && !dprChanged && offscreenByRenderKey.size > 0) {
    return; // No changes needed
  }
  
  // Update state
  currentSize = newSize;
  lastDpr = dpr;

  // Size changed -> invalidate color cache (will re-render lazily in drawLogo)
  offscreenByRenderKey.clear();
  invalidateRuntimeStyleCache();
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
  if (typeof document !== 'undefined' && document.body?.classList?.contains('portfolio-page')) {
    return;
  }
  const nowMs = performance.now();
  
  const logoColor = resolveAccessibleLogoColor(nowMs);
  const secondaryOpacity = resolveSecondaryLogoOpacity();
  const renderKey = `${logoColor}|${secondaryOpacity.toFixed(3)}`;
  let offscreen = offscreenByRenderKey.get(renderKey);
  if (!offscreen) {
    offscreen = renderToOffscreen(svgPathData, currentSize.width, currentSize.height, logoColor, secondaryOpacity);
    if (offscreen) {
      offscreenByRenderKey.set(renderKey, offscreen);
    }
  }

  if (!offscreen) return;

  // Calculate centered position
  const pos = getLogoCenterPosition(canvasWidth, canvasHeight, currentSize.width, currentSize.height);

  // Keep progress time-based (independent from physics tick cadence).
  syncEntranceProgress(nowMs);
  
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

  const modalOpacityMul = resolveModalLogoOpacityMultiplier(nowMs);
  const combinedOpacity = opacity * modalOpacityMul;
  if (combinedOpacity <= 0.001) return;
  
  // Apply scene impact scale from CSS var (if available)
  let effectiveScale = scale * resolveSceneImpactScale(nowMs);
  
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
  
  ctx.globalAlpha = combinedOpacity;
  
  if (blur > 0.5) {
    ctx.filter = `blur(${blur}px)`;
  }
  
  // Draw the logo with high-quality downsampling from supersampled offscreen
  // Source: full supersampled canvas, Dest: target size at calculated position
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
  // Avoid resetting mid-flight: quick-entrance sets html.entrance-complete before the
  // delayed call from main.js; a draw-loop failsafe used to start early and this second
  // call would snap progress back to 0.
  if (entranceState.isStarted) return;
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

  offscreenByRenderKey.clear();
  invalidateRuntimeStyleCache();
}
