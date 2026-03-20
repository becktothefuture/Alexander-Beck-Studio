// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          RENDERER (OPTIMIZED)                               ║
// ║                 Canvas setup, resize, and rendering                          ║
// ║      Electron-grade performance optimizations for all browsers               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
//
//  SPA: teardown (`disposeRendererListeners`) stops the rAF loop + resize observers;
//  `setupRenderer` always disposes first; `resize` follows live `#c` and won’t early-out
//  until backing-store pixels match the target buffer (remount-safe).

import { CONSTANTS, MODES } from '../core/constants.js';
import {
  getGlobals,
  setEffectiveDPR,
  applyLayoutFromVwToPx,
  applyLayoutCSSVars,
  detectResponsiveScale,
  syncPitPortfolioRadiusStatsFromBalls
} from '../core/state.js';
import { applyCanvasShadow } from './effects.js';
import { stopMainLoop } from './loop.js';
import { isDev } from '../utils/logger.js';

let canvas, ctx;

// ════════════════════════════════════════════════════════════════════════════════
// PERFORMANCE: Adaptive DPR based on device capability
// High-end: full DPR, Low-end: reduced for smooth 60fps
// ════════════════════════════════════════════════════════════════════════════════
let effectiveDPR = CONSTANTS.DPR;

// Track previous canvas dimensions for dynamic ball repositioning on resize
let prevCanvasWidth = 0;
let prevCanvasHeight = 0;

// Debounce resize to prevent excessive recalculation during drag-resize
let resizeDebounceId = null;

/** Removes window / visualViewport / ResizeObserver subscriptions from the last setupRenderer() */
let disposeRendererListenersFn = null;

// Callback to force immediate render after canvas dimensions change
// This prevents blank frames during resize
let forceRenderCallback = null;

/**
 * Register a callback to force render after canvas dimension changes
 * Called by main.js after render loop is set up
 */
export function setForceRenderCallback(callback) {
  forceRenderCallback = callback;
}

// Cached canvas clip path (rounded rect) — recomputed on resize only.
// This prevents iOS/mobile corner “bleed” where canvas pixels can peek past the
// container’s rounded corners during fast motion / compositing.
let cachedClipW = 0;
let cachedClipH = 0;
let cachedClipR = 0;

function acquireSimulation2dContext(el) {
  if (!el) return null;
  let c = el.getContext('2d', {
    alpha: true,
    desynchronized: true,
    willReadFrequently: false,
  });
  if (!c) {
    c = el.getContext('2d');
  }
  if (c) {
    c.imageSmoothingEnabled = false;
  }
  return c;
}

function buildRoundedRectPath(w, h, r) {
  // Build a rounded-rect path in *canvas pixel* space.
  // Important: keep allocation out of hot paths (called only on resize).
  const rr = Math.max(0, Math.min(r, Math.min(w, h) * 0.5));
  if (typeof Path2D === 'undefined') return null;
  const p = new Path2D();

  if (rr <= 0) {
    p.rect(0, 0, w, h);
    return p;
  }

  // Rounded rect via arcTo (widely supported).
  p.moveTo(rr, 0);
  p.lineTo(w - rr, 0);
  p.arcTo(w, 0, w, rr, rr);
  p.lineTo(w, h - rr);
  p.arcTo(w, h, w - rr, h, rr);
  p.lineTo(rr, h);
  p.arcTo(0, h, 0, h - rr, rr);
  p.lineTo(0, rr);
  p.arcTo(0, 0, rr, 0, rr);
  p.closePath();
  return p;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getPortfolioBodyRadiusForResize(ball, balls, globals, newWidth, newHeight) {
  const config = globals.portfolioPitConfig || {};
  const seedRadius = Number(ball?._portfolioSeedRadius);
  const seedWidth = Number(ball?._portfolioSeedCanvasWidth);
  const seedHeight = Number(ball?._portfolioSeedCanvasHeight);
  if (seedRadius > 0 && seedWidth > 0 && seedHeight > 0) {
    const seedArea = seedWidth * seedHeight;
    const nextArea = newWidth * newHeight;
    if (seedArea > 0 && nextArea > 0) {
      const scale = Math.sqrt(nextArea / seedArea);
      if (scale > 0 && Number.isFinite(scale)) return seedRadius * scale;
    }
  }

  const count = Array.isArray(balls) ? balls.length : 0;
  const index = Number.isInteger(ball?.projectIndex) ? ball.projectIndex : -1;

  if (index >= 0 && count > 0) {
    const frameBorderWidth = Number.isFinite(globals.frameBorderWidthEffective)
      ? globals.frameBorderWidthEffective
      : (Number.isFinite(globals.frameBorderWidth)
        ? globals.frameBorderWidth
        : (globals.wallThickness || 20));
    const dpr = globals.DPR || 1;
    const frameInset = frameBorderWidth * dpr;
    const innerW = Math.max(1, newWidth - 2 * frameInset);
    const innerH = Math.max(1, newHeight - 2 * frameInset);
    const areaNorm = Math.sqrt(innerW * innerH);

    const minFrac = clamp(toNumber(config.bodies?.minDiameterViewport, 0.14), 0.08, 1);
    const maxFrac = clamp(toNumber(config.bodies?.maxDiameterViewport, 0.22), minFrac, 1);
    const sizeMul = clamp(toNumber(config.bodies?.diameterScale, 1.2), 1, 1.8);
    let minD = areaNorm * minFrac * sizeMul * 1.6;
    let maxD = areaNorm * maxFrac * sizeMul * 1.6;

    const wallPadding = Math.min(innerW, innerH) * clamp(
      toNumber(config.bodies?.wallPaddingViewport, 0.05),
      0.02,
      0.14
    );
    const maxDiameterFit = Math.max(24 * dpr, Math.min(innerW, innerH) - 2 * wallPadding);
    maxD = Math.min(maxD, maxDiameterFit);
    minD = Math.min(minD, maxD);

    const t = count <= 1 ? 0.5 : index / (count - 1);
    const diameter = minD + ((maxD - minD) * (0.25 + (0.75 * (1 - Math.abs(0.5 - t)))));
    const radius = diameter * 0.5;
    if (Number.isFinite(radius) && radius > 0) return radius;
  }

  return null;
}

/**
 * Portfolio pit bootstrap can run before `body.portfolio-page` is applied (SPA gate
 * navigation effect order). Detect the route by mount node / URL so DPR is not capped
 * like a generic “low power” page — avoids a 1× buffer stretched to full CSS size
 * (pixelation) and keeps DOM label coordinates aligned with canvas space.
 */
function isPortfolioSimulationPage() {
  if (typeof document === 'undefined') return false;
  if (document.body?.classList?.contains('portfolio-page')) return true;
  if (document.getElementById('portfolioProjectMount')) return true;
  try {
    const path = window.location?.pathname || '';
    return /portfolio/i.test(path);
  } catch (e) {
    return false;
  }
}

export function detectOptimalDPR() {
  const baseDPR = window.devicePixelRatio || 1;
  const isPortfolioPage = isPortfolioSimulationPage();

  if (isPortfolioPage) {
    effectiveDPR = Math.min(baseDPR, 2);
    setEffectiveDPR(effectiveDPR);
    return effectiveDPR;
  }
  
  // Check for low-power hints
  const isLowPower = navigator.connection?.saveData || 
                     navigator.hardwareConcurrency <= 4 ||
                     /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  // Cap DPR more aggressively on mobile/low-power devices
  if (isLowPower) {
    const lowPowerCap = 1.25;
    effectiveDPR = Math.min(baseDPR, lowPowerCap);
    if (isDev()) {
      console.log(`⚡ Adaptive DPR: Reduced to ${effectiveDPR}x for performance`);
    }
  } else {
    effectiveDPR = Math.min(baseDPR, 2);
  }
  
  // Sync with global state so all modules use the same DPR
  setEffectiveDPR(effectiveDPR);
  
  return effectiveDPR;
}

export function getEffectiveDPR() {
  return effectiveDPR;
}

/**
 * Tear down resize/orientation/visualViewport/ResizeObserver from the last `setupRenderer()`.
 * Safe to call multiple times; also cancels a pending debounced resize rAF.
 */
export function disposeRendererListeners() {
  stopMainLoop();
  if (typeof disposeRendererListenersFn === 'function') {
    try {
      disposeRendererListenersFn();
    } catch (e) {
      /* ignore */
    }
    disposeRendererListenersFn = null;
  }
  if (resizeDebounceId) {
    cancelAnimationFrame(resizeDebounceId);
    resizeDebounceId = null;
  }
  // SPA route teardown removes pointer listeners via legacy scope; allow the next
  // `setupPointer()` to register fresh handlers (otherwise __pointerReady blocks re-init).
  try {
    const g = getGlobals();
    g.__pointerReady = false;
  } catch (e) {
    /* ignore */
  }
  if (typeof window !== 'undefined') window.__pointerReady = false;
}

/**
 * Point module `canvas`/`ctx` at the live `#c` (SPA remounts replace the element).
 * Resets prev buffer dims when the node changes so `resize()` cannot early-out on stale sizes.
 */
function bindLiveSimulationCanvas() {
  const live = document.getElementById('c');
  if (!live) return false;
  if (live !== canvas) {
    canvas = live;
    ctx = acquireSimulation2dContext(live);
    prevCanvasWidth = 0;
    prevCanvasHeight = 0;
    try {
      detectOptimalDPR();
    } catch (e) {}
  }
  return Boolean(canvas && ctx);
}

export function setupRenderer() {
  disposeRendererListeners();

  // SPA route changes mount a new `#c`. Module-level `canvas` is reassigned here, so
  // `bindLiveSimulationCanvas()` would see live === canvas and skip resetting
  // `prevCanvasWidth`/`prevCanvasHeight` — leaving dimensions from the previous route.
  // That can make `resize()` early-out while the backing store is still 300×150, or
  // scale the wrong buffer into portfolio space after the modal gate transition.
  const previousCanvas = canvas;
  const next = document.getElementById('c');
  if (next !== previousCanvas) {
    prevCanvasWidth = 0;
    prevCanvasHeight = 0;
  }
  canvas = next;

  if (!canvas) {
    canvas = null;
    ctx = null;
    console.error('Canvas not found');
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PERFORMANCE: Optimized canvas context flags (Electron-grade)
  //
  // alpha: true         → Canvas is transparent (required for page background)
  // desynchronized: true → Low-latency rendering, bypasses compositor (Chrome/Edge)
  // willReadFrequently: false → GPU can optimize for write-only operations
  // ══════════════════════════════════════════════════════════════════════════════
  ctx = acquireSimulation2dContext(canvas);
  if (!ctx) {
    canvas = null;
    console.warn('⚠️ Canvas 2D context unavailable');
    return;
  }

  detectOptimalDPR();

  // NOTE: Don't call resize() here - globals.container may not be set yet
  // main.js will call resize() after setCanvas() to ensure container is available

  const debouncedResize = () => {
    if (resizeDebounceId) cancelAnimationFrame(resizeDebounceId);
    resizeDebounceId = requestAnimationFrame(() => {
      resize();
      resizeDebounceId = null;
    });
  };

  const onOrientationChange = () => {
    setTimeout(resize, 100);
    setTimeout(resize, 300);
  };

  window.addEventListener('resize', debouncedResize, { passive: true });
  window.addEventListener('orientationchange', onOrientationChange, { passive: true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', debouncedResize, { passive: true });
    window.visualViewport.addEventListener('scroll', debouncedResize, { passive: true });
  }

  let resizeObserver = null;
  if (typeof ResizeObserver !== 'undefined') {
    const container = document.getElementById('simulations');
    if (container) {
      resizeObserver = new ResizeObserver(() => {
        debouncedResize();
      });
      resizeObserver.observe(container);
    }
  }

  disposeRendererListenersFn = () => {
    window.removeEventListener('resize', debouncedResize);
    window.removeEventListener('orientationchange', onOrientationChange);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', debouncedResize);
      window.visualViewport.removeEventListener('scroll', debouncedResize);
    }
    if (resizeObserver) {
      try {
        resizeObserver.disconnect();
      } catch (e) {
        /* ignore */
      }
      resizeObserver = null;
    }
  };

  if (isDev()) {
    console.log(
      `✓ Renderer optimized (DPR: ${effectiveDPR.toFixed(2)}, desync: ${ctx.getContextAttributes?.()?.desynchronized ?? 'unknown'})`
    );
  }
}

/**
 * Resize canvas to match container dimensions minus wall thickness.
 * 
 * The rubber wall system uses wall thickness as the inset for the canvas.
 * CSS handles positioning (top/left/right/bottom = wallThickness)
 * JS handles buffer dimensions for high-DPI rendering.
 * 
 * DYNAMIC BALL REPOSITIONING:
 * When the canvas resizes, balls are scaled proportionally to maintain their
 * relative positions within the viewport. This prevents balls from:
 * - Disappearing outside new bounds when shrinking
 * - Clustering in one corner when expanding
 */
export function resize() {
  if (!bindLiveSimulationCanvas()) return;

  const legacyBackingW = canvas.width || 0;
  const legacyBackingH = canvas.height || 0;

  const globals = getGlobals();

  // ══════════════════════════════════════════════════════════════════════════════
  // iOS SAFARI VIEWPORT FIX:
  // Keep a CSS var synced to the *visual* viewport height (keyboard + URL bar aware).
  // This ensures fixed-position "frame" layers size to the actually visible area.
  // Runs only on resize events (debounced by rAF), not in hot render loops.
  // ══════════════════════════════════════════════════════════════════════════════
  try {
    const vv = window.visualViewport;
    // iOS Safari can transiently report 0 for vv.width/height during keyboard/zoom.
    // Never propagate 0-sized viewport values into layout CSS vars.
    const rawVh = (vv && typeof vv.height === 'number') ? vv.height : window.innerHeight;
    const rawVw = (vv && typeof vv.width === 'number') ? vv.width : window.innerWidth;
    const vhPx = rawVh > 0 ? rawVh : window.innerHeight;
    const vwPx = rawVw > 0 ? rawVw : window.innerWidth;

    const rawTop = (vv && typeof vv.offsetTop === 'number') ? vv.offsetTop : 0;
    const rawLeft = (vv && typeof vv.offsetLeft === 'number') ? vv.offsetLeft : 0;
    const topPx = Number.isFinite(rawTop) ? rawTop : 0;
    const leftPx = Number.isFinite(rawLeft) ? rawLeft : 0;
    // Center of the *visual* viewport (keyboard + URL bar aware).
    let centerYPx = topPx + (vhPx / 2);
    let centerXPx = leftPx + (vwPx / 2);
    // Safety: if anything is still degenerate, fall back to the layout viewport center.
    if (!(centerXPx > 0)) centerXPx = window.innerWidth / 2;
    if (!(centerYPx > 0)) centerYPx = window.innerHeight / 2;

    const rootStyle = document.documentElement?.style;
    rootStyle?.setProperty('--abs-viewport-h', `${vhPx}px`);
    rootStyle?.setProperty('--abs-vv-offset-top', `${topPx}px`);
    rootStyle?.setProperty('--abs-vv-offset-left', `${leftPx}px`);
    rootStyle?.setProperty('--abs-vv-h', `${vhPx}px`);
    rootStyle?.setProperty('--abs-vv-w', `${vwPx}px`);
    rootStyle?.setProperty('--abs-vv-center-x', `${centerXPx}px`);
    rootStyle?.setProperty('--abs-vv-center-y', `${centerYPx}px`);
  } catch (e) {}

  // Keep vw-based layout responsive: on any resize we recompute derived px and
  // restamp CSS vars before measuring container dimensions.
  try {
    applyLayoutFromVwToPx();
    applyLayoutCSSVars();
  } catch (e) {}

  // Keep "mobile scaling" responsive to viewport width (safe: early-outs unless breakpoint changes).
  try { detectResponsiveScale(); } catch (e) {}

  // Re-evaluate DPR when body class / route DOM appears (SPA transitions).
  try {
    detectOptimalDPR();
  } catch (e) {}
  
  // Use container dimensions if available, fallback to window for safety
  const container = globals.container || document.getElementById('simulations');
  const containerWidth = container ? container.clientWidth : window.innerWidth;
  const containerHeight = container ? container.clientHeight : window.innerHeight;
  
  // ══════════════════════════════════════════════════════════════════════════════
  // SAFETY: Skip resize if container reports invalid dimensions
  // This can happen during CSS transitions or when the element is temporarily hidden.
  // Processing 0/negative dimensions would corrupt ball positions (all become 0).
  // ══════════════════════════════════════════════════════════════════════════════
  if (containerWidth <= 0 || containerHeight <= 0) {
    return;
  }
  
  // Canvas CSS is calc(100% + 2px) for edge coverage, so buffer should be container + 2px.
  // This ensures the wall drawing fills to the actual CSS edges.
  const CSS_EDGE_OVERFLOW = 2;
  const canvasWidth = containerWidth + CSS_EDGE_OVERFLOW;
  const canvasHeight = containerHeight + CSS_EDGE_OVERFLOW;
  
  // Canvas fills container - CSS handles mode-specific heights
  // Ball Pit: CSS sets 150vh, Other modes: CSS sets 100%
  const simHeight = canvasHeight;
  
  // Use adaptive DPR for performance (may be lower than device DPR on weak hardware)
  const DPR = effectiveDPR;
  
  // Calculate new buffer dimensions (ceil to prevent sub-pixel gaps at edges)
  const newWidth = Math.ceil(canvasWidth * DPR);
  const newHeight = Math.ceil(simHeight * DPR);
  
  // Safety: ensure we have valid positive dimensions after DPR scaling
  if (newWidth <= 0 || newHeight <= 0) {
    return;
  }
  
  // Early-out only if logical size AND the backing store already match. After SPA remount,
  // `newWidth` may equal `prev*` while `canvas` is a new default 300×150 — must not skip.
  if (
    newWidth === prevCanvasWidth &&
    newHeight === prevCanvasHeight &&
    canvas.width === newWidth &&
    canvas.height === newHeight
  ) {
    return;
  }
  
  // ══════════════════════════════════════════════════════════════════════════════
  // DYNAMIC BALL REPOSITIONING
  // Scale ball positions proportionally when canvas dimensions change.
  // This keeps balls in valid positions relative to the new viewport bounds.
  //
  // Portfolio pit: if balls were seeded while `prevCanvasWidth` was still 0 (SPA remount
  // or default 300×150 backing store), recalculate portfolio radii from the immutable
  // seed dimensions stored on each body so repeated resize passes cannot compound size.
  // ══════════════════════════════════════════════════════════════════════════════
  const pitPortfolio = globals.currentMode === MODES.PORTFOLIO_PIT;
  const hadPrevBuffer = prevCanvasWidth > 0 && prevCanvasHeight > 0;
  let shouldRelayoutPortfolioLabels = false;
  const legacyPitBufferJump =
    pitPortfolio &&
    !hadPrevBuffer &&
    legacyBackingW > 0 &&
    legacyBackingH > 0 &&
    legacyBackingW < newWidth * 0.82 &&
    legacyBackingH < newHeight * 0.82;

  const scaleFromW = hadPrevBuffer ? prevCanvasWidth : (legacyPitBufferJump ? legacyBackingW : 0);
  const scaleFromH = hadPrevBuffer ? prevCanvasHeight : (legacyPitBufferJump ? legacyBackingH : 0);

  if (scaleFromW > 0 && scaleFromH > 0 && globals.balls && globals.balls.length > 0) {
    const scaleX = newWidth / scaleFromW;
    const scaleY = newHeight / scaleFromH;

    // Safety: only reposition if scale factors are reasonable (not 0, not extreme)
    // Extreme scales (>10x or <0.1x) likely indicate invalid intermediate states
    if (scaleX > 0.1 && scaleX < 10 && scaleY > 0.1 && scaleY < 10) {
      const balls = globals.balls;
      for (let i = 0; i < balls.length; i++) {
        const ball = balls[i];
        if (!ball) continue;

        // Scale position proportionally
        ball.x *= scaleX;
        ball.y *= scaleY;

        if (pitPortfolio && ball.projectIndex !== undefined) {
          const nextRadius = getPortfolioBodyRadiusForResize(ball, balls, globals, newWidth, newHeight);
          if (nextRadius !== null) {
            ball.r = nextRadius;
            ball.rBase = nextRadius;
          }
        }

        // Clamp to ensure ball stays within new bounds (with radius margin)
        const r = ball.r || 10;
        ball.x = Math.max(r, Math.min(newWidth - r, ball.x));
        ball.y = Math.max(r, Math.min(newHeight - r, ball.y));

        // Wake sleeping balls so they can settle into new positions
        if (ball.isSleeping) {
          ball.isSleeping = false;
          ball.sleepTimer = 0;
        }
      }
      if (pitPortfolio) {
        syncPitPortfolioRadiusStatsFromBalls();
        // Keep portfolio SAT conservative for a short recovery window after resize.
        globals.portfolioResizeRecoveryFrames = Math.max(
          Number(globals.portfolioResizeRecoveryFrames) || 0,
          6
        );
        shouldRelayoutPortfolioLabels = true;
      }
    }
  }
  
  // Store dimensions for next resize comparison
  prevCanvasWidth = newWidth;
  prevCanvasHeight = newHeight;
  
  // ══════════════════════════════════════════════════════════════════════════════
  // CANVAS DIMENSION UPDATE with flicker prevention
  // Setting canvas.width/height clears the buffer. To prevent flicker:
  // 1. Only update if dimensions actually need changing
  // 2. Immediately render after update (no gap for transparent frame)
  // ══════════════════════════════════════════════════════════════════════════════
  
  // Check if canvas buffer dimensions need updating
  const needsUpdate = canvas.width !== newWidth || canvas.height !== newHeight;
  
  if (needsUpdate) {
    // Set canvas buffer size (high-DPI) - this clears the canvas buffer
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    // Re-apply context optimizations after resize (some browsers reset them)
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
    }
  }
  
  // Always update CSS display size (doesn't cause flicker)
  canvas.style.width = canvasWidth + 'px';
  canvas.style.height = simHeight + 'px';

  if (shouldRelayoutPortfolioLabels) {
    try {
      globals.portfolioRelayoutLabels?.();
    } catch (e) {}
  }
  
  if (needsUpdate) {
    applyCanvasShadow(canvas);
    
    // Force immediate render after canvas dimension change to prevent blank frame
    if (forceRenderCallback) {
      try {
        forceRenderCallback();
      } catch (e) {
        // Ignore render errors during resize
      }
    }
  }

  // Update cached clip path (rounded-rect) on any resize that changes buffer dims
  // Radius is controlled entirely by rubber wall system - canvas uses rectangular clip (0 radius)
  // This ensures visual rounded corners come only from wall rendering, not canvas clipping
  try {
    // Force 0 radius for canvas clip - rubber wall system controls visual radius
    const rCanvasPx = 0;
    if (canvas.width !== cachedClipW || canvas.height !== cachedClipH || Math.abs(rCanvasPx - cachedClipR) > 1e-3) {
      cachedClipW = canvas.width;
      cachedClipH = canvas.height;
      cachedClipR = rCanvasPx;
      globals.canvasClipPath = buildRoundedRectPath(canvas.width, canvas.height, rCanvasPx);
    }
  } catch (e) {}
}

export function getCanvas() {
  return canvas;
}

export function getContext() {
  return ctx;
}
