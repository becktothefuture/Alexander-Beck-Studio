// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          RENDERER (OPTIMIZED)                               ║
// ║                 Canvas setup, resize, and rendering                          ║
// ║      Electron-grade performance optimizations for all browsers               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
//
//  SPA: teardown (`disposeRendererListeners`) stops the rAF loop + resize observers;
//  `setupRenderer` always disposes first; `resize` follows live `#c` and won’t early-out
//  until backing-store pixels match the target buffer (remount-safe).

import { CONSTANTS, MODES } from "/src/legacy/modules/core/constants.js";
import {
  getGlobals,
  setEffectiveDPR,
  applyLayoutFromVwToPx,
  applyLayoutCSSVars,
  detectResponsiveScale,
  syncPitPortfolioRadiusStatsFromBalls
} from "/src/legacy/modules/core/state.js";
import { applyCanvasShadow } from "/src/legacy/modules/rendering/effects.js";
import { stopMainLoop } from "/src/legacy/modules/rendering/loop.js";
import { isDev } from "/src/legacy/modules/utils/logger.js";
import {
  getSimulationCollisionInsetPx,
  syncSimulationCollisionBounds,
} from "/src/legacy/modules/utils/frame-geometry.js";

let canvas, ctx;

// ════════════════════════════════════════════════════════════════════════════════
// PERFORMANCE: Adaptive DPR based on device capability
// High-end: full DPR, Low-end: reduced for smooth 60fps
// ════════════════════════════════════════════════════════════════════════════════
let effectiveDPR = CONSTANTS.DPR;
let lastCrittersDprCapLogKey = '';

// Track previous canvas dimensions for dynamic ball repositioning on resize
let prevCanvasWidth = 0;
let prevCanvasHeight = 0;

// Debounce resize to prevent excessive recalculation during drag-resize
let resizeDebounceId = null;

/** Removes window / visualViewport / ResizeObserver subscriptions from the last setupRenderer() */
let disposeRendererListenersFn = null;
let rendererOwnerSequence = 0;
let activeRendererOwner = 0;

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
    const dpr = globals.DPR || 1;
    const frameInset = getSimulationCollisionInsetPx(globals);
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
  const isLowPower = navigator.connection?.saveData || 
                     navigator.hardwareConcurrency <= 4 ||
                     /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isPortfolioPage = isPortfolioSimulationPage();
  const currentMode = getGlobals()?.currentMode;

  if (isPortfolioPage) {
    const portfolioCap = isLowPower ? 1.5 : 2;
    effectiveDPR = Math.min(baseDPR, portfolioCap);
    setEffectiveDPR(effectiveDPR);
    return effectiveDPR;
  }

  if (currentMode === MODES.CRITTERS) {
    effectiveDPR = Math.min(baseDPR, 1.25);
    setEffectiveDPR(effectiveDPR);
    const dprCapLogKey = `${baseDPR.toFixed(2)}:${effectiveDPR.toFixed(2)}`;
    if (isDev() && effectiveDPR < baseDPR && dprCapLogKey !== lastCrittersDprCapLogKey) {
      lastCrittersDprCapLogKey = dprCapLogKey;
      console.log(`⚡ Critters DPR cap: ${baseDPR.toFixed(2)} → ${effectiveDPR.toFixed(2)} for performance`);
    }
    return effectiveDPR;
  }

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

function disposeDepthTitleCanvas() {
  const globals = getGlobals();
  const frontCanvas = globals.depthTitleFrontCanvas || document.getElementById('simulation-front-depth-canvas');
  try {
    globals.depthTitleFrontCtx?.clearRect?.(0, 0, frontCanvas?.width || 0, frontCanvas?.height || 0);
  } catch (e) {
    /* ignore */
  }
  frontCanvas?.remove?.();
  const container = globals.container || document.getElementById('simulations');
  container?.classList?.remove('simulation-depth-title-layer-active');
  globals.depthTitleFrontCanvas = null;
  globals.depthTitleFrontCtx = null;
}

/**
 * Tear down resize/orientation/visualViewport/ResizeObserver from the last `setupRenderer()`.
 * Safe to call multiple times; also cancels a pending debounced resize rAF.
 */
export function disposeRendererListeners(expectedOwner = null) {
  if (expectedOwner !== null && expectedOwner !== activeRendererOwner) {
    stopMainLoop();
    disposeDepthTitleCanvas();
    return false;
  }
  activeRendererOwner = 0;
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
  disposeDepthTitleCanvas();
  // SPA route teardown removes pointer listeners via legacy scope; allow the next
  // `setupPointer()` to register fresh handlers (otherwise __pointerReady blocks re-init).
  try {
    const g = getGlobals();
    g.__pointerReady = false;
  } catch (e) {
    /* ignore */
  }
  if (typeof window !== 'undefined') window.__pointerReady = false;
  return true;
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
  const owner = ++rendererOwnerSequence;
  activeRendererOwner = owner;

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
    return owner;
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
    return owner;
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
  return owner;
}

/**
 * Resize the canvas to the exact CSS wall box.
 *
 * CSS owns the visible contour and clipping. JS only sizes the backing store
 * and caches the independently authored physics boundary.
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
  // CSS owns the Canvas display box through `#simulations canvas { width/height: 100% }`.
  // Never round-trip computed CSS dimensions through inline pixel strings: embedded
  // Chromium can serialize a 640.203125px wall as 640.203px, then quantize the Canvas
  // to 640.1875px when that string is written back. The resulting 1/64px shortfall is
  // enough to expose a dark corner after compositor antialiasing.
  canvas.style.removeProperty('left');
  canvas.style.removeProperty('top');
  canvas.style.removeProperty('width');
  canvas.style.removeProperty('height');

  const containerRect = container?.getBoundingClientRect();
  const containerWidth = containerRect?.width > 0
    ? containerRect.width
    : (container ? container.clientWidth : window.innerWidth);
  const containerHeight = containerRect?.height > 0
    ? containerRect.height
    : (container ? container.clientHeight : window.innerHeight);
  
  // ══════════════════════════════════════════════════════════════════════════════
  // SAFETY: Skip resize if container reports invalid dimensions
  // This can happen during CSS transitions or when the element is temporarily hidden.
  // Processing 0/negative dimensions would corrupt ball positions (all become 0).
  // ══════════════════════════════════════════════════════════════════════════════
  if (containerWidth <= 0 || containerHeight <= 0) {
    return;
  }
  
  const canvasWidth = containerWidth;
  const canvasHeight = containerHeight;
  
  // Canvas fills container - CSS handles mode-specific heights
  // Ball Field: CSS sets 150vh, Other modes: CSS sets 100%
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
    syncSimulationCollisionBounds(globals, container, canvas);
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
  
  // Physics consumes this cached inset boundary. The visible canvas remains
  // full-size and is clipped solely by the CSS wall container.
  syncSimulationCollisionBounds(globals, container, canvas);

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

}

export function getCanvas() {
  return canvas;
}

export function getContext() {
  return ctx;
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJlbmRlcmVyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIOKVlOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVl1xuLy8g4pWRICAgICAgICAgICAgICAgICAgICAgICAgICBSRU5ERVJFUiAoT1BUSU1JWkVEKSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICDilZFcbi8vIOKVkSAgICAgICAgICAgICAgICAgQ2FudmFzIHNldHVwLCByZXNpemUsIGFuZCByZW5kZXJpbmcgICAgICAgICAgICAgICAgICAgICAgICAgIOKVkVxuLy8g4pWRICAgICAgRWxlY3Ryb24tZ3JhZGUgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9ucyBmb3IgYWxsIGJyb3dzZXJzICAgICAgICAgICAgICAg4pWRXG4vLyDilZrilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZ1cbi8vXG4vLyAgU1BBOiB0ZWFyZG93biAoYGRpc3Bvc2VSZW5kZXJlckxpc3RlbmVyc2ApIHN0b3BzIHRoZSByQUYgbG9vcCArIHJlc2l6ZSBvYnNlcnZlcnM7XG4vLyAgYHNldHVwUmVuZGVyZXJgIGFsd2F5cyBkaXNwb3NlcyBmaXJzdDsgYHJlc2l6ZWAgZm9sbG93cyBsaXZlIGAjY2AgYW5kIHdvbuKAmXQgZWFybHktb3V0XG4vLyAgdW50aWwgYmFja2luZy1zdG9yZSBwaXhlbHMgbWF0Y2ggdGhlIHRhcmdldCBidWZmZXIgKHJlbW91bnQtc2FmZSkuXG5cbmltcG9ydCB7IENPTlNUQU5UUywgTU9ERVMgfSBmcm9tIFwiL3NyYy9sZWdhY3kvbW9kdWxlcy9jb3JlL2NvbnN0YW50cy5qc1wiO1xuaW1wb3J0IHtcbiAgZ2V0R2xvYmFscyxcbiAgc2V0RWZmZWN0aXZlRFBSLFxuICBhcHBseUxheW91dEZyb21Wd1RvUHgsXG4gIGFwcGx5TGF5b3V0Q1NTVmFycyxcbiAgZGV0ZWN0UmVzcG9uc2l2ZVNjYWxlLFxuICBzeW5jUGl0UG9ydGZvbGlvUmFkaXVzU3RhdHNGcm9tQmFsbHNcbn0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvY29yZS9zdGF0ZS5qc1wiO1xuaW1wb3J0IHsgYXBwbHlDYW52YXNTaGFkb3cgfSBmcm9tIFwiL3NyYy9sZWdhY3kvbW9kdWxlcy9yZW5kZXJpbmcvZWZmZWN0cy5qc1wiO1xuaW1wb3J0IHsgc3RvcE1haW5Mb29wIH0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvcmVuZGVyaW5nL2xvb3AuanNcIjtcbmltcG9ydCB7IGlzRGV2IH0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvdXRpbHMvbG9nZ2VyLmpzXCI7XG5pbXBvcnQge1xuICBnZXRTaW11bGF0aW9uQ29sbGlzaW9uSW5zZXRQeCxcbiAgc3luY1NpbXVsYXRpb25Db2xsaXNpb25Cb3VuZHMsXG59IGZyb20gXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL3V0aWxzL2ZyYW1lLWdlb21ldHJ5LmpzXCI7XG5cbmxldCBjYW52YXMsIGN0eDtcblxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4vLyBQRVJGT1JNQU5DRTogQWRhcHRpdmUgRFBSIGJhc2VkIG9uIGRldmljZSBjYXBhYmlsaXR5XG4vLyBIaWdoLWVuZDogZnVsbCBEUFIsIExvdy1lbmQ6IHJlZHVjZWQgZm9yIHNtb290aCA2MGZwc1xuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG5sZXQgZWZmZWN0aXZlRFBSID0gQ09OU1RBTlRTLkRQUjtcbmxldCBsYXN0Q3JpdHRlcnNEcHJDYXBMb2dLZXkgPSAnJztcblxuLy8gVHJhY2sgcHJldmlvdXMgY2FudmFzIGRpbWVuc2lvbnMgZm9yIGR5bmFtaWMgYmFsbCByZXBvc2l0aW9uaW5nIG9uIHJlc2l6ZVxubGV0IHByZXZDYW52YXNXaWR0aCA9IDA7XG5sZXQgcHJldkNhbnZhc0hlaWdodCA9IDA7XG5cbi8vIERlYm91bmNlIHJlc2l6ZSB0byBwcmV2ZW50IGV4Y2Vzc2l2ZSByZWNhbGN1bGF0aW9uIGR1cmluZyBkcmFnLXJlc2l6ZVxubGV0IHJlc2l6ZURlYm91bmNlSWQgPSBudWxsO1xuXG4vKiogUmVtb3ZlcyB3aW5kb3cgLyB2aXN1YWxWaWV3cG9ydCAvIFJlc2l6ZU9ic2VydmVyIHN1YnNjcmlwdGlvbnMgZnJvbSB0aGUgbGFzdCBzZXR1cFJlbmRlcmVyKCkgKi9cbmxldCBkaXNwb3NlUmVuZGVyZXJMaXN0ZW5lcnNGbiA9IG51bGw7XG5sZXQgcmVuZGVyZXJPd25lclNlcXVlbmNlID0gMDtcbmxldCBhY3RpdmVSZW5kZXJlck93bmVyID0gMDtcblxuLy8gQ2FsbGJhY2sgdG8gZm9yY2UgaW1tZWRpYXRlIHJlbmRlciBhZnRlciBjYW52YXMgZGltZW5zaW9ucyBjaGFuZ2Vcbi8vIFRoaXMgcHJldmVudHMgYmxhbmsgZnJhbWVzIGR1cmluZyByZXNpemVcbmxldCBmb3JjZVJlbmRlckNhbGxiYWNrID0gbnVsbDtcblxuLyoqXG4gKiBSZWdpc3RlciBhIGNhbGxiYWNrIHRvIGZvcmNlIHJlbmRlciBhZnRlciBjYW52YXMgZGltZW5zaW9uIGNoYW5nZXNcbiAqIENhbGxlZCBieSBtYWluLmpzIGFmdGVyIHJlbmRlciBsb29wIGlzIHNldCB1cFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0Rm9yY2VSZW5kZXJDYWxsYmFjayhjYWxsYmFjaykge1xuICBmb3JjZVJlbmRlckNhbGxiYWNrID0gY2FsbGJhY2s7XG59XG5cbmZ1bmN0aW9uIGFjcXVpcmVTaW11bGF0aW9uMmRDb250ZXh0KGVsKSB7XG4gIGlmICghZWwpIHJldHVybiBudWxsO1xuICBsZXQgYyA9IGVsLmdldENvbnRleHQoJzJkJywge1xuICAgIGFscGhhOiB0cnVlLFxuICAgIGRlc3luY2hyb25pemVkOiB0cnVlLFxuICAgIHdpbGxSZWFkRnJlcXVlbnRseTogZmFsc2UsXG4gIH0pO1xuICBpZiAoIWMpIHtcbiAgICBjID0gZWwuZ2V0Q29udGV4dCgnMmQnKTtcbiAgfVxuICBpZiAoYykge1xuICAgIGMuaW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIGM7XG59XG5cbmZ1bmN0aW9uIGNsYW1wKHZhbHVlLCBtaW4sIG1heCkge1xuICByZXR1cm4gTWF0aC5taW4obWF4LCBNYXRoLm1heChtaW4sIHZhbHVlKSk7XG59XG5cbmZ1bmN0aW9uIHRvTnVtYmVyKHZhbHVlLCBmYWxsYmFjaykge1xuICBjb25zdCBudW1lcmljID0gTnVtYmVyKHZhbHVlKTtcbiAgcmV0dXJuIE51bWJlci5pc0Zpbml0ZShudW1lcmljKSA/IG51bWVyaWMgOiBmYWxsYmFjaztcbn1cblxuZnVuY3Rpb24gZ2V0UG9ydGZvbGlvQm9keVJhZGl1c0ZvclJlc2l6ZShiYWxsLCBiYWxscywgZ2xvYmFscywgbmV3V2lkdGgsIG5ld0hlaWdodCkge1xuICBjb25zdCBjb25maWcgPSBnbG9iYWxzLnBvcnRmb2xpb1BpdENvbmZpZyB8fCB7fTtcbiAgY29uc3Qgc2VlZFJhZGl1cyA9IE51bWJlcihiYWxsPy5fcG9ydGZvbGlvU2VlZFJhZGl1cyk7XG4gIGNvbnN0IHNlZWRXaWR0aCA9IE51bWJlcihiYWxsPy5fcG9ydGZvbGlvU2VlZENhbnZhc1dpZHRoKTtcbiAgY29uc3Qgc2VlZEhlaWdodCA9IE51bWJlcihiYWxsPy5fcG9ydGZvbGlvU2VlZENhbnZhc0hlaWdodCk7XG4gIGlmIChzZWVkUmFkaXVzID4gMCAmJiBzZWVkV2lkdGggPiAwICYmIHNlZWRIZWlnaHQgPiAwKSB7XG4gICAgY29uc3Qgc2VlZEFyZWEgPSBzZWVkV2lkdGggKiBzZWVkSGVpZ2h0O1xuICAgIGNvbnN0IG5leHRBcmVhID0gbmV3V2lkdGggKiBuZXdIZWlnaHQ7XG4gICAgaWYgKHNlZWRBcmVhID4gMCAmJiBuZXh0QXJlYSA+IDApIHtcbiAgICAgIGNvbnN0IHNjYWxlID0gTWF0aC5zcXJ0KG5leHRBcmVhIC8gc2VlZEFyZWEpO1xuICAgICAgaWYgKHNjYWxlID4gMCAmJiBOdW1iZXIuaXNGaW5pdGUoc2NhbGUpKSByZXR1cm4gc2VlZFJhZGl1cyAqIHNjYWxlO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGNvdW50ID0gQXJyYXkuaXNBcnJheShiYWxscykgPyBiYWxscy5sZW5ndGggOiAwO1xuICBjb25zdCBpbmRleCA9IE51bWJlci5pc0ludGVnZXIoYmFsbD8ucHJvamVjdEluZGV4KSA/IGJhbGwucHJvamVjdEluZGV4IDogLTE7XG5cbiAgaWYgKGluZGV4ID49IDAgJiYgY291bnQgPiAwKSB7XG4gICAgY29uc3QgZHByID0gZ2xvYmFscy5EUFIgfHwgMTtcbiAgICBjb25zdCBmcmFtZUluc2V0ID0gZ2V0U2ltdWxhdGlvbkNvbGxpc2lvbkluc2V0UHgoZ2xvYmFscyk7XG4gICAgY29uc3QgaW5uZXJXID0gTWF0aC5tYXgoMSwgbmV3V2lkdGggLSAyICogZnJhbWVJbnNldCk7XG4gICAgY29uc3QgaW5uZXJIID0gTWF0aC5tYXgoMSwgbmV3SGVpZ2h0IC0gMiAqIGZyYW1lSW5zZXQpO1xuICAgIGNvbnN0IGFyZWFOb3JtID0gTWF0aC5zcXJ0KGlubmVyVyAqIGlubmVySCk7XG5cbiAgICBjb25zdCBtaW5GcmFjID0gY2xhbXAodG9OdW1iZXIoY29uZmlnLmJvZGllcz8ubWluRGlhbWV0ZXJWaWV3cG9ydCwgMC4xNCksIDAuMDgsIDEpO1xuICAgIGNvbnN0IG1heEZyYWMgPSBjbGFtcCh0b051bWJlcihjb25maWcuYm9kaWVzPy5tYXhEaWFtZXRlclZpZXdwb3J0LCAwLjIyKSwgbWluRnJhYywgMSk7XG4gICAgY29uc3Qgc2l6ZU11bCA9IGNsYW1wKHRvTnVtYmVyKGNvbmZpZy5ib2RpZXM/LmRpYW1ldGVyU2NhbGUsIDEuMiksIDEsIDEuOCk7XG4gICAgbGV0IG1pbkQgPSBhcmVhTm9ybSAqIG1pbkZyYWMgKiBzaXplTXVsICogMS42O1xuICAgIGxldCBtYXhEID0gYXJlYU5vcm0gKiBtYXhGcmFjICogc2l6ZU11bCAqIDEuNjtcblxuICAgIGNvbnN0IHdhbGxQYWRkaW5nID0gTWF0aC5taW4oaW5uZXJXLCBpbm5lckgpICogY2xhbXAoXG4gICAgICB0b051bWJlcihjb25maWcuYm9kaWVzPy53YWxsUGFkZGluZ1ZpZXdwb3J0LCAwLjA1KSxcbiAgICAgIDAuMDIsXG4gICAgICAwLjE0XG4gICAgKTtcbiAgICBjb25zdCBtYXhEaWFtZXRlckZpdCA9IE1hdGgubWF4KDI0ICogZHByLCBNYXRoLm1pbihpbm5lclcsIGlubmVySCkgLSAyICogd2FsbFBhZGRpbmcpO1xuICAgIG1heEQgPSBNYXRoLm1pbihtYXhELCBtYXhEaWFtZXRlckZpdCk7XG4gICAgbWluRCA9IE1hdGgubWluKG1pbkQsIG1heEQpO1xuXG4gICAgY29uc3QgdCA9IGNvdW50IDw9IDEgPyAwLjUgOiBpbmRleCAvIChjb3VudCAtIDEpO1xuICAgIGNvbnN0IGRpYW1ldGVyID0gbWluRCArICgobWF4RCAtIG1pbkQpICogKDAuMjUgKyAoMC43NSAqICgxIC0gTWF0aC5hYnMoMC41IC0gdCkpKSkpO1xuICAgIGNvbnN0IHJhZGl1cyA9IGRpYW1ldGVyICogMC41O1xuICAgIGlmIChOdW1iZXIuaXNGaW5pdGUocmFkaXVzKSAmJiByYWRpdXMgPiAwKSByZXR1cm4gcmFkaXVzO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogUG9ydGZvbGlvIHBpdCBib290c3RyYXAgY2FuIHJ1biBiZWZvcmUgYGJvZHkucG9ydGZvbGlvLXBhZ2VgIGlzIGFwcGxpZWQgKFNQQSBnYXRlXG4gKiBuYXZpZ2F0aW9uIGVmZmVjdCBvcmRlcikuIERldGVjdCB0aGUgcm91dGUgYnkgbW91bnQgbm9kZSAvIFVSTCBzbyBEUFIgaXMgbm90IGNhcHBlZFxuICogbGlrZSBhIGdlbmVyaWMg4oCcbG93IHBvd2Vy4oCdIHBhZ2Ug4oCUIGF2b2lkcyBhIDHDlyBidWZmZXIgc3RyZXRjaGVkIHRvIGZ1bGwgQ1NTIHNpemVcbiAqIChwaXhlbGF0aW9uKSBhbmQga2VlcHMgRE9NIGxhYmVsIGNvb3JkaW5hdGVzIGFsaWduZWQgd2l0aCBjYW52YXMgc3BhY2UuXG4gKi9cbmZ1bmN0aW9uIGlzUG9ydGZvbGlvU2ltdWxhdGlvblBhZ2UoKSB7XG4gIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnKSByZXR1cm4gZmFsc2U7XG4gIGlmIChkb2N1bWVudC5ib2R5Py5jbGFzc0xpc3Q/LmNvbnRhaW5zKCdwb3J0Zm9saW8tcGFnZScpKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwb3J0Zm9saW9Qcm9qZWN0TW91bnQnKSkgcmV0dXJuIHRydWU7XG4gIHRyeSB7XG4gICAgY29uc3QgcGF0aCA9IHdpbmRvdy5sb2NhdGlvbj8ucGF0aG5hbWUgfHwgJyc7XG4gICAgcmV0dXJuIC9wb3J0Zm9saW8vaS50ZXN0KHBhdGgpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXRlY3RPcHRpbWFsRFBSKCkge1xuICBjb25zdCBiYXNlRFBSID0gd2luZG93LmRldmljZVBpeGVsUmF0aW8gfHwgMTtcbiAgY29uc3QgaXNMb3dQb3dlciA9IG5hdmlnYXRvci5jb25uZWN0aW9uPy5zYXZlRGF0YSB8fCBcbiAgICAgICAgICAgICAgICAgICAgIG5hdmlnYXRvci5oYXJkd2FyZUNvbmN1cnJlbmN5IDw9IDQgfHxcbiAgICAgICAgICAgICAgICAgICAgIC9BbmRyb2lkfGlQaG9uZXxpUGFkfGlQb2QvaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpO1xuICBjb25zdCBpc1BvcnRmb2xpb1BhZ2UgPSBpc1BvcnRmb2xpb1NpbXVsYXRpb25QYWdlKCk7XG4gIGNvbnN0IGN1cnJlbnRNb2RlID0gZ2V0R2xvYmFscygpPy5jdXJyZW50TW9kZTtcblxuICBpZiAoaXNQb3J0Zm9saW9QYWdlKSB7XG4gICAgY29uc3QgcG9ydGZvbGlvQ2FwID0gaXNMb3dQb3dlciA/IDEuNSA6IDI7XG4gICAgZWZmZWN0aXZlRFBSID0gTWF0aC5taW4oYmFzZURQUiwgcG9ydGZvbGlvQ2FwKTtcbiAgICBzZXRFZmZlY3RpdmVEUFIoZWZmZWN0aXZlRFBSKTtcbiAgICByZXR1cm4gZWZmZWN0aXZlRFBSO1xuICB9XG5cbiAgaWYgKGN1cnJlbnRNb2RlID09PSBNT0RFUy5DUklUVEVSUykge1xuICAgIGVmZmVjdGl2ZURQUiA9IE1hdGgubWluKGJhc2VEUFIsIDEuMjUpO1xuICAgIHNldEVmZmVjdGl2ZURQUihlZmZlY3RpdmVEUFIpO1xuICAgIGNvbnN0IGRwckNhcExvZ0tleSA9IGAke2Jhc2VEUFIudG9GaXhlZCgyKX06JHtlZmZlY3RpdmVEUFIudG9GaXhlZCgyKX1gO1xuICAgIGlmIChpc0RldigpICYmIGVmZmVjdGl2ZURQUiA8IGJhc2VEUFIgJiYgZHByQ2FwTG9nS2V5ICE9PSBsYXN0Q3JpdHRlcnNEcHJDYXBMb2dLZXkpIHtcbiAgICAgIGxhc3RDcml0dGVyc0RwckNhcExvZ0tleSA9IGRwckNhcExvZ0tleTtcbiAgICAgIGNvbnNvbGUubG9nKGDimqEgQ3JpdHRlcnMgRFBSIGNhcDogJHtiYXNlRFBSLnRvRml4ZWQoMil9IOKGkiAke2VmZmVjdGl2ZURQUi50b0ZpeGVkKDIpfSBmb3IgcGVyZm9ybWFuY2VgKTtcbiAgICB9XG4gICAgcmV0dXJuIGVmZmVjdGl2ZURQUjtcbiAgfVxuXG4gIC8vIENhcCBEUFIgbW9yZSBhZ2dyZXNzaXZlbHkgb24gbW9iaWxlL2xvdy1wb3dlciBkZXZpY2VzXG4gIGlmIChpc0xvd1Bvd2VyKSB7XG4gICAgY29uc3QgbG93UG93ZXJDYXAgPSAxLjI1O1xuICAgIGVmZmVjdGl2ZURQUiA9IE1hdGgubWluKGJhc2VEUFIsIGxvd1Bvd2VyQ2FwKTtcbiAgICBpZiAoaXNEZXYoKSkge1xuICAgICAgY29uc29sZS5sb2coYOKaoSBBZGFwdGl2ZSBEUFI6IFJlZHVjZWQgdG8gJHtlZmZlY3RpdmVEUFJ9eCBmb3IgcGVyZm9ybWFuY2VgKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZWZmZWN0aXZlRFBSID0gTWF0aC5taW4oYmFzZURQUiwgMik7XG4gIH1cbiAgXG4gIC8vIFN5bmMgd2l0aCBnbG9iYWwgc3RhdGUgc28gYWxsIG1vZHVsZXMgdXNlIHRoZSBzYW1lIERQUlxuICBzZXRFZmZlY3RpdmVEUFIoZWZmZWN0aXZlRFBSKTtcbiAgXG4gIHJldHVybiBlZmZlY3RpdmVEUFI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRFZmZlY3RpdmVEUFIoKSB7XG4gIHJldHVybiBlZmZlY3RpdmVEUFI7XG59XG5cbmZ1bmN0aW9uIGRpc3Bvc2VEZXB0aFRpdGxlQ2FudmFzKCkge1xuICBjb25zdCBnbG9iYWxzID0gZ2V0R2xvYmFscygpO1xuICBjb25zdCBmcm9udENhbnZhcyA9IGdsb2JhbHMuZGVwdGhUaXRsZUZyb250Q2FudmFzIHx8IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaW11bGF0aW9uLWZyb250LWRlcHRoLWNhbnZhcycpO1xuICB0cnkge1xuICAgIGdsb2JhbHMuZGVwdGhUaXRsZUZyb250Q3R4Py5jbGVhclJlY3Q/LigwLCAwLCBmcm9udENhbnZhcz8ud2lkdGggfHwgMCwgZnJvbnRDYW52YXM/LmhlaWdodCB8fCAwKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIC8qIGlnbm9yZSAqL1xuICB9XG4gIGZyb250Q2FudmFzPy5yZW1vdmU/LigpO1xuICBjb25zdCBjb250YWluZXIgPSBnbG9iYWxzLmNvbnRhaW5lciB8fCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2ltdWxhdGlvbnMnKTtcbiAgY29udGFpbmVyPy5jbGFzc0xpc3Q/LnJlbW92ZSgnc2ltdWxhdGlvbi1kZXB0aC10aXRsZS1sYXllci1hY3RpdmUnKTtcbiAgZ2xvYmFscy5kZXB0aFRpdGxlRnJvbnRDYW52YXMgPSBudWxsO1xuICBnbG9iYWxzLmRlcHRoVGl0bGVGcm9udEN0eCA9IG51bGw7XG59XG5cbi8qKlxuICogVGVhciBkb3duIHJlc2l6ZS9vcmllbnRhdGlvbi92aXN1YWxWaWV3cG9ydC9SZXNpemVPYnNlcnZlciBmcm9tIHRoZSBsYXN0IGBzZXR1cFJlbmRlcmVyKClgLlxuICogU2FmZSB0byBjYWxsIG11bHRpcGxlIHRpbWVzOyBhbHNvIGNhbmNlbHMgYSBwZW5kaW5nIGRlYm91bmNlZCByZXNpemUgckFGLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGlzcG9zZVJlbmRlcmVyTGlzdGVuZXJzKGV4cGVjdGVkT3duZXIgPSBudWxsKSB7XG4gIGlmIChleHBlY3RlZE93bmVyICE9PSBudWxsICYmIGV4cGVjdGVkT3duZXIgIT09IGFjdGl2ZVJlbmRlcmVyT3duZXIpIHtcbiAgICBzdG9wTWFpbkxvb3AoKTtcbiAgICBkaXNwb3NlRGVwdGhUaXRsZUNhbnZhcygpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBhY3RpdmVSZW5kZXJlck93bmVyID0gMDtcbiAgc3RvcE1haW5Mb29wKCk7XG4gIGlmICh0eXBlb2YgZGlzcG9zZVJlbmRlcmVyTGlzdGVuZXJzRm4gPT09ICdmdW5jdGlvbicpIHtcbiAgICB0cnkge1xuICAgICAgZGlzcG9zZVJlbmRlcmVyTGlzdGVuZXJzRm4oKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvKiBpZ25vcmUgKi9cbiAgICB9XG4gICAgZGlzcG9zZVJlbmRlcmVyTGlzdGVuZXJzRm4gPSBudWxsO1xuICB9XG4gIGlmIChyZXNpemVEZWJvdW5jZUlkKSB7XG4gICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUocmVzaXplRGVib3VuY2VJZCk7XG4gICAgcmVzaXplRGVib3VuY2VJZCA9IG51bGw7XG4gIH1cbiAgZGlzcG9zZURlcHRoVGl0bGVDYW52YXMoKTtcbiAgLy8gU1BBIHJvdXRlIHRlYXJkb3duIHJlbW92ZXMgcG9pbnRlciBsaXN0ZW5lcnMgdmlhIGxlZ2FjeSBzY29wZTsgYWxsb3cgdGhlIG5leHRcbiAgLy8gYHNldHVwUG9pbnRlcigpYCB0byByZWdpc3RlciBmcmVzaCBoYW5kbGVycyAob3RoZXJ3aXNlIF9fcG9pbnRlclJlYWR5IGJsb2NrcyByZS1pbml0KS5cbiAgdHJ5IHtcbiAgICBjb25zdCBnID0gZ2V0R2xvYmFscygpO1xuICAgIGcuX19wb2ludGVyUmVhZHkgPSBmYWxzZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIC8qIGlnbm9yZSAqL1xuICB9XG4gIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgd2luZG93Ll9fcG9pbnRlclJlYWR5ID0gZmFsc2U7XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIFBvaW50IG1vZHVsZSBgY2FudmFzYC9gY3R4YCBhdCB0aGUgbGl2ZSBgI2NgIChTUEEgcmVtb3VudHMgcmVwbGFjZSB0aGUgZWxlbWVudCkuXG4gKiBSZXNldHMgcHJldiBidWZmZXIgZGltcyB3aGVuIHRoZSBub2RlIGNoYW5nZXMgc28gYHJlc2l6ZSgpYCBjYW5ub3QgZWFybHktb3V0IG9uIHN0YWxlIHNpemVzLlxuICovXG5mdW5jdGlvbiBiaW5kTGl2ZVNpbXVsYXRpb25DYW52YXMoKSB7XG4gIGNvbnN0IGxpdmUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYycpO1xuICBpZiAoIWxpdmUpIHJldHVybiBmYWxzZTtcbiAgaWYgKGxpdmUgIT09IGNhbnZhcykge1xuICAgIGNhbnZhcyA9IGxpdmU7XG4gICAgY3R4ID0gYWNxdWlyZVNpbXVsYXRpb24yZENvbnRleHQobGl2ZSk7XG4gICAgcHJldkNhbnZhc1dpZHRoID0gMDtcbiAgICBwcmV2Q2FudmFzSGVpZ2h0ID0gMDtcbiAgICB0cnkge1xuICAgICAgZGV0ZWN0T3B0aW1hbERQUigpO1xuICAgIH0gY2F0Y2ggKGUpIHt9XG4gIH1cbiAgcmV0dXJuIEJvb2xlYW4oY2FudmFzICYmIGN0eCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cFJlbmRlcmVyKCkge1xuICBkaXNwb3NlUmVuZGVyZXJMaXN0ZW5lcnMoKTtcbiAgY29uc3Qgb3duZXIgPSArK3JlbmRlcmVyT3duZXJTZXF1ZW5jZTtcbiAgYWN0aXZlUmVuZGVyZXJPd25lciA9IG93bmVyO1xuXG4gIC8vIFNQQSByb3V0ZSBjaGFuZ2VzIG1vdW50IGEgbmV3IGAjY2AuIE1vZHVsZS1sZXZlbCBgY2FudmFzYCBpcyByZWFzc2lnbmVkIGhlcmUsIHNvXG4gIC8vIGBiaW5kTGl2ZVNpbXVsYXRpb25DYW52YXMoKWAgd291bGQgc2VlIGxpdmUgPT09IGNhbnZhcyBhbmQgc2tpcCByZXNldHRpbmdcbiAgLy8gYHByZXZDYW52YXNXaWR0aGAvYHByZXZDYW52YXNIZWlnaHRgIOKAlCBsZWF2aW5nIGRpbWVuc2lvbnMgZnJvbSB0aGUgcHJldmlvdXMgcm91dGUuXG4gIC8vIFRoYXQgY2FuIG1ha2UgYHJlc2l6ZSgpYCBlYXJseS1vdXQgd2hpbGUgdGhlIGJhY2tpbmcgc3RvcmUgaXMgc3RpbGwgMzAww5cxNTAsIG9yXG4gIC8vIHNjYWxlIHRoZSB3cm9uZyBidWZmZXIgaW50byBwb3J0Zm9saW8gc3BhY2UgYWZ0ZXIgdGhlIG1vZGFsIGdhdGUgdHJhbnNpdGlvbi5cbiAgY29uc3QgcHJldmlvdXNDYW52YXMgPSBjYW52YXM7XG4gIGNvbnN0IG5leHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYycpO1xuICBpZiAobmV4dCAhPT0gcHJldmlvdXNDYW52YXMpIHtcbiAgICBwcmV2Q2FudmFzV2lkdGggPSAwO1xuICAgIHByZXZDYW52YXNIZWlnaHQgPSAwO1xuICB9XG4gIGNhbnZhcyA9IG5leHQ7XG5cbiAgaWYgKCFjYW52YXMpIHtcbiAgICBjYW52YXMgPSBudWxsO1xuICAgIGN0eCA9IG51bGw7XG4gICAgY29uc29sZS5lcnJvcignQ2FudmFzIG5vdCBmb3VuZCcpO1xuICAgIHJldHVybiBvd25lcjtcbiAgfVxuXG4gIC8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuICAvLyBQRVJGT1JNQU5DRTogT3B0aW1pemVkIGNhbnZhcyBjb250ZXh0IGZsYWdzIChFbGVjdHJvbi1ncmFkZSlcbiAgLy9cbiAgLy8gYWxwaGE6IHRydWUgICAgICAgICDihpIgQ2FudmFzIGlzIHRyYW5zcGFyZW50IChyZXF1aXJlZCBmb3IgcGFnZSBiYWNrZ3JvdW5kKVxuICAvLyBkZXN5bmNocm9uaXplZDogdHJ1ZSDihpIgTG93LWxhdGVuY3kgcmVuZGVyaW5nLCBieXBhc3NlcyBjb21wb3NpdG9yIChDaHJvbWUvRWRnZSlcbiAgLy8gd2lsbFJlYWRGcmVxdWVudGx5OiBmYWxzZSDihpIgR1BVIGNhbiBvcHRpbWl6ZSBmb3Igd3JpdGUtb25seSBvcGVyYXRpb25zXG4gIC8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuICBjdHggPSBhY3F1aXJlU2ltdWxhdGlvbjJkQ29udGV4dChjYW52YXMpO1xuICBpZiAoIWN0eCkge1xuICAgIGNhbnZhcyA9IG51bGw7XG4gICAgY29uc29sZS53YXJuKCfimqDvuI8gQ2FudmFzIDJEIGNvbnRleHQgdW5hdmFpbGFibGUnKTtcbiAgICByZXR1cm4gb3duZXI7XG4gIH1cblxuICBkZXRlY3RPcHRpbWFsRFBSKCk7XG5cbiAgLy8gTk9URTogRG9uJ3QgY2FsbCByZXNpemUoKSBoZXJlIC0gZ2xvYmFscy5jb250YWluZXIgbWF5IG5vdCBiZSBzZXQgeWV0XG4gIC8vIG1haW4uanMgd2lsbCBjYWxsIHJlc2l6ZSgpIGFmdGVyIHNldENhbnZhcygpIHRvIGVuc3VyZSBjb250YWluZXIgaXMgYXZhaWxhYmxlXG5cbiAgY29uc3QgZGVib3VuY2VkUmVzaXplID0gKCkgPT4ge1xuICAgIGlmIChyZXNpemVEZWJvdW5jZUlkKSBjYW5jZWxBbmltYXRpb25GcmFtZShyZXNpemVEZWJvdW5jZUlkKTtcbiAgICByZXNpemVEZWJvdW5jZUlkID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgIHJlc2l6ZSgpO1xuICAgICAgcmVzaXplRGVib3VuY2VJZCA9IG51bGw7XG4gICAgfSk7XG4gIH07XG5cbiAgY29uc3Qgb25PcmllbnRhdGlvbkNoYW5nZSA9ICgpID0+IHtcbiAgICBzZXRUaW1lb3V0KHJlc2l6ZSwgMTAwKTtcbiAgICBzZXRUaW1lb3V0KHJlc2l6ZSwgMzAwKTtcbiAgfTtcblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgZGVib3VuY2VkUmVzaXplLCB7IHBhc3NpdmU6IHRydWUgfSk7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvcmllbnRhdGlvbmNoYW5nZScsIG9uT3JpZW50YXRpb25DaGFuZ2UsIHsgcGFzc2l2ZTogdHJ1ZSB9KTtcblxuICBpZiAod2luZG93LnZpc3VhbFZpZXdwb3J0KSB7XG4gICAgd2luZG93LnZpc3VhbFZpZXdwb3J0LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGRlYm91bmNlZFJlc2l6ZSwgeyBwYXNzaXZlOiB0cnVlIH0pO1xuICAgIHdpbmRvdy52aXN1YWxWaWV3cG9ydC5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCBkZWJvdW5jZWRSZXNpemUsIHsgcGFzc2l2ZTogdHJ1ZSB9KTtcbiAgfVxuXG4gIGxldCByZXNpemVPYnNlcnZlciA9IG51bGw7XG4gIGlmICh0eXBlb2YgUmVzaXplT2JzZXJ2ZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NpbXVsYXRpb25zJyk7XG4gICAgaWYgKGNvbnRhaW5lcikge1xuICAgICAgcmVzaXplT2JzZXJ2ZXIgPSBuZXcgUmVzaXplT2JzZXJ2ZXIoKCkgPT4ge1xuICAgICAgICBkZWJvdW5jZWRSZXNpemUoKTtcbiAgICAgIH0pO1xuICAgICAgcmVzaXplT2JzZXJ2ZXIub2JzZXJ2ZShjb250YWluZXIpO1xuICAgIH1cbiAgfVxuXG4gIGRpc3Bvc2VSZW5kZXJlckxpc3RlbmVyc0ZuID0gKCkgPT4ge1xuICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCBkZWJvdW5jZWRSZXNpemUpO1xuICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdvcmllbnRhdGlvbmNoYW5nZScsIG9uT3JpZW50YXRpb25DaGFuZ2UpO1xuICAgIGlmICh3aW5kb3cudmlzdWFsVmlld3BvcnQpIHtcbiAgICAgIHdpbmRvdy52aXN1YWxWaWV3cG9ydC5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCBkZWJvdW5jZWRSZXNpemUpO1xuICAgICAgd2luZG93LnZpc3VhbFZpZXdwb3J0LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIGRlYm91bmNlZFJlc2l6ZSk7XG4gICAgfVxuICAgIGlmIChyZXNpemVPYnNlcnZlcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzaXplT2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvKiBpZ25vcmUgKi9cbiAgICAgIH1cbiAgICAgIHJlc2l6ZU9ic2VydmVyID0gbnVsbDtcbiAgICB9XG4gIH07XG5cbiAgaWYgKGlzRGV2KCkpIHtcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgIGDinJMgUmVuZGVyZXIgb3B0aW1pemVkIChEUFI6ICR7ZWZmZWN0aXZlRFBSLnRvRml4ZWQoMil9LCBkZXN5bmM6ICR7Y3R4LmdldENvbnRleHRBdHRyaWJ1dGVzPy4oKT8uZGVzeW5jaHJvbml6ZWQgPz8gJ3Vua25vd24nfSlgXG4gICAgKTtcbiAgfVxuICByZXR1cm4gb3duZXI7XG59XG5cbi8qKlxuICogUmVzaXplIHRoZSBjYW52YXMgdG8gdGhlIGV4YWN0IENTUyB3YWxsIGJveC5cbiAqXG4gKiBDU1Mgb3ducyB0aGUgdmlzaWJsZSBjb250b3VyIGFuZCBjbGlwcGluZy4gSlMgb25seSBzaXplcyB0aGUgYmFja2luZyBzdG9yZVxuICogYW5kIGNhY2hlcyB0aGUgaW5kZXBlbmRlbnRseSBhdXRob3JlZCBwaHlzaWNzIGJvdW5kYXJ5LlxuICogXG4gKiBEWU5BTUlDIEJBTEwgUkVQT1NJVElPTklORzpcbiAqIFdoZW4gdGhlIGNhbnZhcyByZXNpemVzLCBiYWxscyBhcmUgc2NhbGVkIHByb3BvcnRpb25hbGx5IHRvIG1haW50YWluIHRoZWlyXG4gKiByZWxhdGl2ZSBwb3NpdGlvbnMgd2l0aGluIHRoZSB2aWV3cG9ydC4gVGhpcyBwcmV2ZW50cyBiYWxscyBmcm9tOlxuICogLSBEaXNhcHBlYXJpbmcgb3V0c2lkZSBuZXcgYm91bmRzIHdoZW4gc2hyaW5raW5nXG4gKiAtIENsdXN0ZXJpbmcgaW4gb25lIGNvcm5lciB3aGVuIGV4cGFuZGluZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzaXplKCkge1xuICBpZiAoIWJpbmRMaXZlU2ltdWxhdGlvbkNhbnZhcygpKSByZXR1cm47XG5cbiAgY29uc3QgbGVnYWN5QmFja2luZ1cgPSBjYW52YXMud2lkdGggfHwgMDtcbiAgY29uc3QgbGVnYWN5QmFja2luZ0ggPSBjYW52YXMuaGVpZ2h0IHx8IDA7XG5cbiAgY29uc3QgZ2xvYmFscyA9IGdldEdsb2JhbHMoKTtcblxuICAvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbiAgLy8gaU9TIFNBRkFSSSBWSUVXUE9SVCBGSVg6XG4gIC8vIEtlZXAgYSBDU1MgdmFyIHN5bmNlZCB0byB0aGUgKnZpc3VhbCogdmlld3BvcnQgaGVpZ2h0IChrZXlib2FyZCArIFVSTCBiYXIgYXdhcmUpLlxuICAvLyBUaGlzIGVuc3VyZXMgZml4ZWQtcG9zaXRpb24gXCJmcmFtZVwiIGxheWVycyBzaXplIHRvIHRoZSBhY3R1YWxseSB2aXNpYmxlIGFyZWEuXG4gIC8vIFJ1bnMgb25seSBvbiByZXNpemUgZXZlbnRzIChkZWJvdW5jZWQgYnkgckFGKSwgbm90IGluIGhvdCByZW5kZXIgbG9vcHMuXG4gIC8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuICB0cnkge1xuICAgIGNvbnN0IHZ2ID0gd2luZG93LnZpc3VhbFZpZXdwb3J0O1xuICAgIC8vIGlPUyBTYWZhcmkgY2FuIHRyYW5zaWVudGx5IHJlcG9ydCAwIGZvciB2di53aWR0aC9oZWlnaHQgZHVyaW5nIGtleWJvYXJkL3pvb20uXG4gICAgLy8gTmV2ZXIgcHJvcGFnYXRlIDAtc2l6ZWQgdmlld3BvcnQgdmFsdWVzIGludG8gbGF5b3V0IENTUyB2YXJzLlxuICAgIGNvbnN0IHJhd1ZoID0gKHZ2ICYmIHR5cGVvZiB2di5oZWlnaHQgPT09ICdudW1iZXInKSA/IHZ2LmhlaWdodCA6IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICBjb25zdCByYXdWdyA9ICh2diAmJiB0eXBlb2YgdnYud2lkdGggPT09ICdudW1iZXInKSA/IHZ2LndpZHRoIDogd2luZG93LmlubmVyV2lkdGg7XG4gICAgY29uc3QgdmhQeCA9IHJhd1ZoID4gMCA/IHJhd1ZoIDogd2luZG93LmlubmVySGVpZ2h0O1xuICAgIGNvbnN0IHZ3UHggPSByYXdWdyA+IDAgPyByYXdWdyA6IHdpbmRvdy5pbm5lcldpZHRoO1xuXG4gICAgY29uc3QgcmF3VG9wID0gKHZ2ICYmIHR5cGVvZiB2di5vZmZzZXRUb3AgPT09ICdudW1iZXInKSA/IHZ2Lm9mZnNldFRvcCA6IDA7XG4gICAgY29uc3QgcmF3TGVmdCA9ICh2diAmJiB0eXBlb2YgdnYub2Zmc2V0TGVmdCA9PT0gJ251bWJlcicpID8gdnYub2Zmc2V0TGVmdCA6IDA7XG4gICAgY29uc3QgdG9wUHggPSBOdW1iZXIuaXNGaW5pdGUocmF3VG9wKSA/IHJhd1RvcCA6IDA7XG4gICAgY29uc3QgbGVmdFB4ID0gTnVtYmVyLmlzRmluaXRlKHJhd0xlZnQpID8gcmF3TGVmdCA6IDA7XG4gICAgLy8gQ2VudGVyIG9mIHRoZSAqdmlzdWFsKiB2aWV3cG9ydCAoa2V5Ym9hcmQgKyBVUkwgYmFyIGF3YXJlKS5cbiAgICBsZXQgY2VudGVyWVB4ID0gdG9wUHggKyAodmhQeCAvIDIpO1xuICAgIGxldCBjZW50ZXJYUHggPSBsZWZ0UHggKyAodndQeCAvIDIpO1xuICAgIC8vIFNhZmV0eTogaWYgYW55dGhpbmcgaXMgc3RpbGwgZGVnZW5lcmF0ZSwgZmFsbCBiYWNrIHRvIHRoZSBsYXlvdXQgdmlld3BvcnQgY2VudGVyLlxuICAgIGlmICghKGNlbnRlclhQeCA+IDApKSBjZW50ZXJYUHggPSB3aW5kb3cuaW5uZXJXaWR0aCAvIDI7XG4gICAgaWYgKCEoY2VudGVyWVB4ID4gMCkpIGNlbnRlcllQeCA9IHdpbmRvdy5pbm5lckhlaWdodCAvIDI7XG5cbiAgICBjb25zdCByb290U3R5bGUgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ/LnN0eWxlO1xuICAgIHJvb3RTdHlsZT8uc2V0UHJvcGVydHkoJy0tYWJzLXZpZXdwb3J0LWgnLCBgJHt2aFB4fXB4YCk7XG4gICAgcm9vdFN0eWxlPy5zZXRQcm9wZXJ0eSgnLS1hYnMtdnYtb2Zmc2V0LXRvcCcsIGAke3RvcFB4fXB4YCk7XG4gICAgcm9vdFN0eWxlPy5zZXRQcm9wZXJ0eSgnLS1hYnMtdnYtb2Zmc2V0LWxlZnQnLCBgJHtsZWZ0UHh9cHhgKTtcbiAgICByb290U3R5bGU/LnNldFByb3BlcnR5KCctLWFicy12di1oJywgYCR7dmhQeH1weGApO1xuICAgIHJvb3RTdHlsZT8uc2V0UHJvcGVydHkoJy0tYWJzLXZ2LXcnLCBgJHt2d1B4fXB4YCk7XG4gICAgcm9vdFN0eWxlPy5zZXRQcm9wZXJ0eSgnLS1hYnMtdnYtY2VudGVyLXgnLCBgJHtjZW50ZXJYUHh9cHhgKTtcbiAgICByb290U3R5bGU/LnNldFByb3BlcnR5KCctLWFicy12di1jZW50ZXIteScsIGAke2NlbnRlcllQeH1weGApO1xuICB9IGNhdGNoIChlKSB7fVxuXG4gIC8vIEtlZXAgdnctYmFzZWQgbGF5b3V0IHJlc3BvbnNpdmU6IG9uIGFueSByZXNpemUgd2UgcmVjb21wdXRlIGRlcml2ZWQgcHggYW5kXG4gIC8vIHJlc3RhbXAgQ1NTIHZhcnMgYmVmb3JlIG1lYXN1cmluZyBjb250YWluZXIgZGltZW5zaW9ucy5cbiAgdHJ5IHtcbiAgICBhcHBseUxheW91dEZyb21Wd1RvUHgoKTtcbiAgICBhcHBseUxheW91dENTU1ZhcnMoKTtcbiAgfSBjYXRjaCAoZSkge31cblxuICAvLyBLZWVwIFwibW9iaWxlIHNjYWxpbmdcIiByZXNwb25zaXZlIHRvIHZpZXdwb3J0IHdpZHRoIChzYWZlOiBlYXJseS1vdXRzIHVubGVzcyBicmVha3BvaW50IGNoYW5nZXMpLlxuICB0cnkgeyBkZXRlY3RSZXNwb25zaXZlU2NhbGUoKTsgfSBjYXRjaCAoZSkge31cblxuICAvLyBSZS1ldmFsdWF0ZSBEUFIgd2hlbiBib2R5IGNsYXNzIC8gcm91dGUgRE9NIGFwcGVhcnMgKFNQQSB0cmFuc2l0aW9ucykuXG4gIHRyeSB7XG4gICAgZGV0ZWN0T3B0aW1hbERQUigpO1xuICB9IGNhdGNoIChlKSB7fVxuICBcbiAgLy8gVXNlIGNvbnRhaW5lciBkaW1lbnNpb25zIGlmIGF2YWlsYWJsZSwgZmFsbGJhY2sgdG8gd2luZG93IGZvciBzYWZldHlcbiAgY29uc3QgY29udGFpbmVyID0gZ2xvYmFscy5jb250YWluZXIgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NpbXVsYXRpb25zJyk7XG4gIC8vIENTUyBvd25zIHRoZSBDYW52YXMgZGlzcGxheSBib3ggdGhyb3VnaCBgI3NpbXVsYXRpb25zIGNhbnZhcyB7IHdpZHRoL2hlaWdodDogMTAwJSB9YC5cbiAgLy8gTmV2ZXIgcm91bmQtdHJpcCBjb21wdXRlZCBDU1MgZGltZW5zaW9ucyB0aHJvdWdoIGlubGluZSBwaXhlbCBzdHJpbmdzOiBlbWJlZGRlZFxuICAvLyBDaHJvbWl1bSBjYW4gc2VyaWFsaXplIGEgNjQwLjIwMzEyNXB4IHdhbGwgYXMgNjQwLjIwM3B4LCB0aGVuIHF1YW50aXplIHRoZSBDYW52YXNcbiAgLy8gdG8gNjQwLjE4NzVweCB3aGVuIHRoYXQgc3RyaW5nIGlzIHdyaXR0ZW4gYmFjay4gVGhlIHJlc3VsdGluZyAxLzY0cHggc2hvcnRmYWxsIGlzXG4gIC8vIGVub3VnaCB0byBleHBvc2UgYSBkYXJrIGNvcm5lciBhZnRlciBjb21wb3NpdG9yIGFudGlhbGlhc2luZy5cbiAgY2FudmFzLnN0eWxlLnJlbW92ZVByb3BlcnR5KCdsZWZ0Jyk7XG4gIGNhbnZhcy5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgndG9wJyk7XG4gIGNhbnZhcy5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgnd2lkdGgnKTtcbiAgY2FudmFzLnN0eWxlLnJlbW92ZVByb3BlcnR5KCdoZWlnaHQnKTtcblxuICBjb25zdCBjb250YWluZXJSZWN0ID0gY29udGFpbmVyPy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgY29uc3QgY29udGFpbmVyV2lkdGggPSBjb250YWluZXJSZWN0Py53aWR0aCA+IDBcbiAgICA/IGNvbnRhaW5lclJlY3Qud2lkdGhcbiAgICA6IChjb250YWluZXIgPyBjb250YWluZXIuY2xpZW50V2lkdGggOiB3aW5kb3cuaW5uZXJXaWR0aCk7XG4gIGNvbnN0IGNvbnRhaW5lckhlaWdodCA9IGNvbnRhaW5lclJlY3Q/LmhlaWdodCA+IDBcbiAgICA/IGNvbnRhaW5lclJlY3QuaGVpZ2h0XG4gICAgOiAoY29udGFpbmVyID8gY29udGFpbmVyLmNsaWVudEhlaWdodCA6IHdpbmRvdy5pbm5lckhlaWdodCk7XG4gIFxuICAvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbiAgLy8gU0FGRVRZOiBTa2lwIHJlc2l6ZSBpZiBjb250YWluZXIgcmVwb3J0cyBpbnZhbGlkIGRpbWVuc2lvbnNcbiAgLy8gVGhpcyBjYW4gaGFwcGVuIGR1cmluZyBDU1MgdHJhbnNpdGlvbnMgb3Igd2hlbiB0aGUgZWxlbWVudCBpcyB0ZW1wb3JhcmlseSBoaWRkZW4uXG4gIC8vIFByb2Nlc3NpbmcgMC9uZWdhdGl2ZSBkaW1lbnNpb25zIHdvdWxkIGNvcnJ1cHQgYmFsbCBwb3NpdGlvbnMgKGFsbCBiZWNvbWUgMCkuXG4gIC8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuICBpZiAoY29udGFpbmVyV2lkdGggPD0gMCB8fCBjb250YWluZXJIZWlnaHQgPD0gMCkge1xuICAgIHJldHVybjtcbiAgfVxuICBcbiAgY29uc3QgY2FudmFzV2lkdGggPSBjb250YWluZXJXaWR0aDtcbiAgY29uc3QgY2FudmFzSGVpZ2h0ID0gY29udGFpbmVySGVpZ2h0O1xuICBcbiAgLy8gQ2FudmFzIGZpbGxzIGNvbnRhaW5lciAtIENTUyBoYW5kbGVzIG1vZGUtc3BlY2lmaWMgaGVpZ2h0c1xuICAvLyBCYWxsIEZpZWxkOiBDU1Mgc2V0cyAxNTB2aCwgT3RoZXIgbW9kZXM6IENTUyBzZXRzIDEwMCVcbiAgY29uc3Qgc2ltSGVpZ2h0ID0gY2FudmFzSGVpZ2h0O1xuICBcbiAgLy8gVXNlIGFkYXB0aXZlIERQUiBmb3IgcGVyZm9ybWFuY2UgKG1heSBiZSBsb3dlciB0aGFuIGRldmljZSBEUFIgb24gd2VhayBoYXJkd2FyZSlcbiAgY29uc3QgRFBSID0gZWZmZWN0aXZlRFBSO1xuICBcbiAgLy8gQ2FsY3VsYXRlIG5ldyBidWZmZXIgZGltZW5zaW9ucyAoY2VpbCB0byBwcmV2ZW50IHN1Yi1waXhlbCBnYXBzIGF0IGVkZ2VzKVxuICBjb25zdCBuZXdXaWR0aCA9IE1hdGguY2VpbChjYW52YXNXaWR0aCAqIERQUik7XG4gIGNvbnN0IG5ld0hlaWdodCA9IE1hdGguY2VpbChzaW1IZWlnaHQgKiBEUFIpO1xuICBcbiAgLy8gU2FmZXR5OiBlbnN1cmUgd2UgaGF2ZSB2YWxpZCBwb3NpdGl2ZSBkaW1lbnNpb25zIGFmdGVyIERQUiBzY2FsaW5nXG4gIGlmIChuZXdXaWR0aCA8PSAwIHx8IG5ld0hlaWdodCA8PSAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gRWFybHktb3V0IG9ubHkgaWYgbG9naWNhbCBzaXplIEFORCB0aGUgYmFja2luZyBzdG9yZSBhbHJlYWR5IG1hdGNoLiBBZnRlciBTUEEgcmVtb3VudCxcbiAgLy8gYG5ld1dpZHRoYCBtYXkgZXF1YWwgYHByZXYqYCB3aGlsZSBgY2FudmFzYCBpcyBhIG5ldyBkZWZhdWx0IDMwMMOXMTUwIOKAlCBtdXN0IG5vdCBza2lwLlxuICBpZiAoXG4gICAgbmV3V2lkdGggPT09IHByZXZDYW52YXNXaWR0aCAmJlxuICAgIG5ld0hlaWdodCA9PT0gcHJldkNhbnZhc0hlaWdodCAmJlxuICAgIGNhbnZhcy53aWR0aCA9PT0gbmV3V2lkdGggJiZcbiAgICBjYW52YXMuaGVpZ2h0ID09PSBuZXdIZWlnaHRcbiAgKSB7XG4gICAgc3luY1NpbXVsYXRpb25Db2xsaXNpb25Cb3VuZHMoZ2xvYmFscywgY29udGFpbmVyLCBjYW52YXMpO1xuICAgIHJldHVybjtcbiAgfVxuICBcbiAgLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4gIC8vIERZTkFNSUMgQkFMTCBSRVBPU0lUSU9OSU5HXG4gIC8vIFNjYWxlIGJhbGwgcG9zaXRpb25zIHByb3BvcnRpb25hbGx5IHdoZW4gY2FudmFzIGRpbWVuc2lvbnMgY2hhbmdlLlxuICAvLyBUaGlzIGtlZXBzIGJhbGxzIGluIHZhbGlkIHBvc2l0aW9ucyByZWxhdGl2ZSB0byB0aGUgbmV3IHZpZXdwb3J0IGJvdW5kcy5cbiAgLy9cbiAgLy8gUG9ydGZvbGlvIHBpdDogaWYgYmFsbHMgd2VyZSBzZWVkZWQgd2hpbGUgYHByZXZDYW52YXNXaWR0aGAgd2FzIHN0aWxsIDAgKFNQQSByZW1vdW50XG4gIC8vIG9yIGRlZmF1bHQgMzAww5cxNTAgYmFja2luZyBzdG9yZSksIHJlY2FsY3VsYXRlIHBvcnRmb2xpbyByYWRpaSBmcm9tIHRoZSBpbW11dGFibGVcbiAgLy8gc2VlZCBkaW1lbnNpb25zIHN0b3JlZCBvbiBlYWNoIGJvZHkgc28gcmVwZWF0ZWQgcmVzaXplIHBhc3NlcyBjYW5ub3QgY29tcG91bmQgc2l6ZS5cbiAgLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4gIGNvbnN0IHBpdFBvcnRmb2xpbyA9IGdsb2JhbHMuY3VycmVudE1vZGUgPT09IE1PREVTLlBPUlRGT0xJT19QSVQ7XG4gIGNvbnN0IGhhZFByZXZCdWZmZXIgPSBwcmV2Q2FudmFzV2lkdGggPiAwICYmIHByZXZDYW52YXNIZWlnaHQgPiAwO1xuICBsZXQgc2hvdWxkUmVsYXlvdXRQb3J0Zm9saW9MYWJlbHMgPSBmYWxzZTtcbiAgY29uc3QgbGVnYWN5UGl0QnVmZmVySnVtcCA9XG4gICAgcGl0UG9ydGZvbGlvICYmXG4gICAgIWhhZFByZXZCdWZmZXIgJiZcbiAgICBsZWdhY3lCYWNraW5nVyA+IDAgJiZcbiAgICBsZWdhY3lCYWNraW5nSCA+IDAgJiZcbiAgICBsZWdhY3lCYWNraW5nVyA8IG5ld1dpZHRoICogMC44MiAmJlxuICAgIGxlZ2FjeUJhY2tpbmdIIDwgbmV3SGVpZ2h0ICogMC44MjtcblxuICBjb25zdCBzY2FsZUZyb21XID0gaGFkUHJldkJ1ZmZlciA/IHByZXZDYW52YXNXaWR0aCA6IChsZWdhY3lQaXRCdWZmZXJKdW1wID8gbGVnYWN5QmFja2luZ1cgOiAwKTtcbiAgY29uc3Qgc2NhbGVGcm9tSCA9IGhhZFByZXZCdWZmZXIgPyBwcmV2Q2FudmFzSGVpZ2h0IDogKGxlZ2FjeVBpdEJ1ZmZlckp1bXAgPyBsZWdhY3lCYWNraW5nSCA6IDApO1xuXG4gIGlmIChzY2FsZUZyb21XID4gMCAmJiBzY2FsZUZyb21IID4gMCAmJiBnbG9iYWxzLmJhbGxzICYmIGdsb2JhbHMuYmFsbHMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHNjYWxlWCA9IG5ld1dpZHRoIC8gc2NhbGVGcm9tVztcbiAgICBjb25zdCBzY2FsZVkgPSBuZXdIZWlnaHQgLyBzY2FsZUZyb21IO1xuXG4gICAgLy8gU2FmZXR5OiBvbmx5IHJlcG9zaXRpb24gaWYgc2NhbGUgZmFjdG9ycyBhcmUgcmVhc29uYWJsZSAobm90IDAsIG5vdCBleHRyZW1lKVxuICAgIC8vIEV4dHJlbWUgc2NhbGVzICg+MTB4IG9yIDwwLjF4KSBsaWtlbHkgaW5kaWNhdGUgaW52YWxpZCBpbnRlcm1lZGlhdGUgc3RhdGVzXG4gICAgaWYgKHNjYWxlWCA+IDAuMSAmJiBzY2FsZVggPCAxMCAmJiBzY2FsZVkgPiAwLjEgJiYgc2NhbGVZIDwgMTApIHtcbiAgICAgIGNvbnN0IGJhbGxzID0gZ2xvYmFscy5iYWxscztcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYmFsbHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgYmFsbCA9IGJhbGxzW2ldO1xuICAgICAgICBpZiAoIWJhbGwpIGNvbnRpbnVlO1xuXG4gICAgICAgIC8vIFNjYWxlIHBvc2l0aW9uIHByb3BvcnRpb25hbGx5XG4gICAgICAgIGJhbGwueCAqPSBzY2FsZVg7XG4gICAgICAgIGJhbGwueSAqPSBzY2FsZVk7XG5cbiAgICAgICAgaWYgKHBpdFBvcnRmb2xpbyAmJiBiYWxsLnByb2plY3RJbmRleCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY29uc3QgbmV4dFJhZGl1cyA9IGdldFBvcnRmb2xpb0JvZHlSYWRpdXNGb3JSZXNpemUoYmFsbCwgYmFsbHMsIGdsb2JhbHMsIG5ld1dpZHRoLCBuZXdIZWlnaHQpO1xuICAgICAgICAgIGlmIChuZXh0UmFkaXVzICE9PSBudWxsKSB7XG4gICAgICAgICAgICBiYWxsLnIgPSBuZXh0UmFkaXVzO1xuICAgICAgICAgICAgYmFsbC5yQmFzZSA9IG5leHRSYWRpdXM7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xhbXAgdG8gZW5zdXJlIGJhbGwgc3RheXMgd2l0aGluIG5ldyBib3VuZHMgKHdpdGggcmFkaXVzIG1hcmdpbilcbiAgICAgICAgY29uc3QgciA9IGJhbGwuciB8fCAxMDtcbiAgICAgICAgYmFsbC54ID0gTWF0aC5tYXgociwgTWF0aC5taW4obmV3V2lkdGggLSByLCBiYWxsLngpKTtcbiAgICAgICAgYmFsbC55ID0gTWF0aC5tYXgociwgTWF0aC5taW4obmV3SGVpZ2h0IC0gciwgYmFsbC55KSk7XG5cbiAgICAgICAgLy8gV2FrZSBzbGVlcGluZyBiYWxscyBzbyB0aGV5IGNhbiBzZXR0bGUgaW50byBuZXcgcG9zaXRpb25zXG4gICAgICAgIGlmIChiYWxsLmlzU2xlZXBpbmcpIHtcbiAgICAgICAgICBiYWxsLmlzU2xlZXBpbmcgPSBmYWxzZTtcbiAgICAgICAgICBiYWxsLnNsZWVwVGltZXIgPSAwO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAocGl0UG9ydGZvbGlvKSB7XG4gICAgICAgIHN5bmNQaXRQb3J0Zm9saW9SYWRpdXNTdGF0c0Zyb21CYWxscygpO1xuICAgICAgICAvLyBLZWVwIHBvcnRmb2xpbyBTQVQgY29uc2VydmF0aXZlIGZvciBhIHNob3J0IHJlY292ZXJ5IHdpbmRvdyBhZnRlciByZXNpemUuXG4gICAgICAgIGdsb2JhbHMucG9ydGZvbGlvUmVzaXplUmVjb3ZlcnlGcmFtZXMgPSBNYXRoLm1heChcbiAgICAgICAgICBOdW1iZXIoZ2xvYmFscy5wb3J0Zm9saW9SZXNpemVSZWNvdmVyeUZyYW1lcykgfHwgMCxcbiAgICAgICAgICA2XG4gICAgICAgICk7XG4gICAgICAgIHNob3VsZFJlbGF5b3V0UG9ydGZvbGlvTGFiZWxzID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgXG4gIC8vIFN0b3JlIGRpbWVuc2lvbnMgZm9yIG5leHQgcmVzaXplIGNvbXBhcmlzb25cbiAgcHJldkNhbnZhc1dpZHRoID0gbmV3V2lkdGg7XG4gIHByZXZDYW52YXNIZWlnaHQgPSBuZXdIZWlnaHQ7XG4gIFxuICAvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbiAgLy8gQ0FOVkFTIERJTUVOU0lPTiBVUERBVEUgd2l0aCBmbGlja2VyIHByZXZlbnRpb25cbiAgLy8gU2V0dGluZyBjYW52YXMud2lkdGgvaGVpZ2h0IGNsZWFycyB0aGUgYnVmZmVyLiBUbyBwcmV2ZW50IGZsaWNrZXI6XG4gIC8vIDEuIE9ubHkgdXBkYXRlIGlmIGRpbWVuc2lvbnMgYWN0dWFsbHkgbmVlZCBjaGFuZ2luZ1xuICAvLyAyLiBJbW1lZGlhdGVseSByZW5kZXIgYWZ0ZXIgdXBkYXRlIChubyBnYXAgZm9yIHRyYW5zcGFyZW50IGZyYW1lKVxuICAvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbiAgXG4gIC8vIENoZWNrIGlmIGNhbnZhcyBidWZmZXIgZGltZW5zaW9ucyBuZWVkIHVwZGF0aW5nXG4gIGNvbnN0IG5lZWRzVXBkYXRlID0gY2FudmFzLndpZHRoICE9PSBuZXdXaWR0aCB8fCBjYW52YXMuaGVpZ2h0ICE9PSBuZXdIZWlnaHQ7XG4gIFxuICBpZiAobmVlZHNVcGRhdGUpIHtcbiAgICAvLyBTZXQgY2FudmFzIGJ1ZmZlciBzaXplIChoaWdoLURQSSkgLSB0aGlzIGNsZWFycyB0aGUgY2FudmFzIGJ1ZmZlclxuICAgIGNhbnZhcy53aWR0aCA9IG5ld1dpZHRoO1xuICAgIGNhbnZhcy5oZWlnaHQgPSBuZXdIZWlnaHQ7XG4gICAgXG4gICAgLy8gUmUtYXBwbHkgY29udGV4dCBvcHRpbWl6YXRpb25zIGFmdGVyIHJlc2l6ZSAoc29tZSBicm93c2VycyByZXNldCB0aGVtKVxuICAgIGlmIChjdHgpIHtcbiAgICAgIGN0eC5pbWFnZVNtb290aGluZ0VuYWJsZWQgPSBmYWxzZTtcbiAgICB9XG4gIH1cbiAgXG4gIC8vIFBoeXNpY3MgY29uc3VtZXMgdGhpcyBjYWNoZWQgaW5zZXQgYm91bmRhcnkuIFRoZSB2aXNpYmxlIGNhbnZhcyByZW1haW5zXG4gIC8vIGZ1bGwtc2l6ZSBhbmQgaXMgY2xpcHBlZCBzb2xlbHkgYnkgdGhlIENTUyB3YWxsIGNvbnRhaW5lci5cbiAgc3luY1NpbXVsYXRpb25Db2xsaXNpb25Cb3VuZHMoZ2xvYmFscywgY29udGFpbmVyLCBjYW52YXMpO1xuXG4gIGlmIChzaG91bGRSZWxheW91dFBvcnRmb2xpb0xhYmVscykge1xuICAgIHRyeSB7XG4gICAgICBnbG9iYWxzLnBvcnRmb2xpb1JlbGF5b3V0TGFiZWxzPy4oKTtcbiAgICB9IGNhdGNoIChlKSB7fVxuICB9XG4gIFxuICBpZiAobmVlZHNVcGRhdGUpIHtcbiAgICBhcHBseUNhbnZhc1NoYWRvdyhjYW52YXMpO1xuICAgIFxuICAgIC8vIEZvcmNlIGltbWVkaWF0ZSByZW5kZXIgYWZ0ZXIgY2FudmFzIGRpbWVuc2lvbiBjaGFuZ2UgdG8gcHJldmVudCBibGFuayBmcmFtZVxuICAgIGlmIChmb3JjZVJlbmRlckNhbGxiYWNrKSB7XG4gICAgICB0cnkge1xuICAgICAgICBmb3JjZVJlbmRlckNhbGxiYWNrKCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIElnbm9yZSByZW5kZXIgZXJyb3JzIGR1cmluZyByZXNpemVcbiAgICAgIH1cbiAgICB9XG4gIH1cblxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2FudmFzKCkge1xuICByZXR1cm4gY2FudmFzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29udGV4dCgpIHtcbiAgcmV0dXJuIGN0eDtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMs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QUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRixDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO0FBQ25ELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEYsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUc7QUFDaEMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7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SSxDQUFDLENBQUMsMEJBQTBCLENBQUM7QUFDN0QsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFVBQVU7QUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFNBQVM7QUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7QUFDbEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDeEUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQzs7QUFFRixDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2RCxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUU3RSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQUMsT0FBTyxDQUFDO0FBQzdELENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO0FBQ3pELENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO0FBQzFELENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQzs7QUFFL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6RixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVqRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDeEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDeEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQztBQUN6RixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxjQUFjLENBQUM7QUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDOztBQUUvQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2RixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU07QUFDNUQsQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSTtBQUNiOztBQUVBLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ2hGLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQztBQUNoRixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztBQUM5RSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSztBQUN6RSxDQUFDLENBQUM7QUFDRixRQUFRLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDO0FBQ3JDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLO0FBQ25ELENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSTtBQUN2RSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJO0FBQ25FLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hELENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0FBQ2xDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLO0FBQ2hCLENBQUMsQ0FBQztBQUNGOztBQUVBLE1BQU0sQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO0FBQ25DLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDdEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQztBQUMxRSxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMseUJBQXlCLENBQUMsQ0FBQztBQUNyRCxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVc7O0FBRS9DLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFD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LENBQUMsQ0FBQyxJQUFJO0FBQzNCLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7QUFDOUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUM7QUFDMUYsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2YsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUNsRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUk7QUFDYjs7QUFFQSxDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFH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QUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLO0FBQ2hCLENBQUMsQ0FBQzs7QUFFRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSztBQUNoRSxDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVU7QUFDOUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLElB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TUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07O0FBRXpDLENBQUMsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFM0MsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDOztBQUU5QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztBQUNyRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSTtBQUNqRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztBQUMzRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjO0FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSTtBQUNuRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUk7QUFDbkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVc7QUFDeEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVU7QUFDckYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVztBQUN2RCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVOztBQUV0RCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7QUFDakUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTTtBQUN2RixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNELENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRTVELENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEtBQUs7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUMzRCxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUMvRCxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNqRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3JELENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDakUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FB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QUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDN0QsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDbEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDO0FBQy9ELENBQUM7QUFDRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztBQUN0RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTTtBQUNyRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ2pGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEYsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25ELENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNWLENBQUMsQ0FBQztBQUNGLENBQUM7QUFDRCxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsY0FBYztBQUNwQyxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsZUFBZTtBQUN0QyxDQUFDO0FBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7QUFDeEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUc7QUFDMUQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFlBQVk7QUFDaEMsQ0FBQztBQUNELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRO0FBQ3BGLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxZQUFZO0FBQzFCLENBQUM7QUFDRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUs7QUFDN0UsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDL0MsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDOUMsQ0FBQztBQUNELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0FBQ2hFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDVixDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPO0FBQzFGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUk7QUFDekYsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RCLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUM3RCxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDVixDQUFDLENBQUM7QUFDRixDQUFDO0FBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLE1BQU07QUFDdEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTTtBQUM1RSxDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztBQUM3RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSTtBQUN2RixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMs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QyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQztBQUMzRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNwRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSztBQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUTs7QUFFM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUM7QUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNOztBQUV4QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUM3RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQztBQUN2RyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVU7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsVUFBVTtBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVSLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNO0FBQzNFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDOUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUU3RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7QUFDM0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUM3QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDeEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7QUFDOUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNO0FBQ25GLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHO0FBQ3hELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQzVDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQztBQUNGLENBQUM7QUFDRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztBQUN0QyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxRQUFRO0FBQzVCLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsU0FBUztBQUM5QixDQUFDO0FBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztBQUMxQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPO0FBQ3RFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztBQUNoRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEtBQUs7QUFDckUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRixDQUFDO0FBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO0FBQzVDLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO0FBQzlFLENBQUM7QUFDRCxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsV0FB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