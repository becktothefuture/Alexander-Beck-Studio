// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          RENDERER (OPTIMIZED)                               ║
// ║                 Canvas setup, resize, and rendering                          ║
// ║      Electron-grade performance optimizations for all browsers               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { CONSTANTS } from '../core/constants.js';
import { getGlobals, setEffectiveDPR, applyLayoutFromVwToPx, applyLayoutCSSVars, detectResponsiveScale } from '../core/state.js';
import { applyCanvasShadow } from './effects.js';

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

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
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

function detectOptimalDPR() {
  const baseDPR = window.devicePixelRatio || 1;
  
  // Check for low-power hints
  const isLowPower = navigator.connection?.saveData || 
                     navigator.hardwareConcurrency <= 4 ||
                     /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  // Cap DPR more aggressively on mobile/low-power devices
  if (isLowPower && baseDPR > 1.5) {
    effectiveDPR = 1.5;
    console.log('⚡ Adaptive DPR: Reduced to 1.5x for performance');
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

export function setupRenderer() {
  canvas = document.getElementById('c');
  
  if (!canvas) {
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
  ctx = canvas.getContext('2d', {
    alpha: true,               // Keep transparency for page background
    desynchronized: true,      // Bypass compositor for lower latency
    willReadFrequently: false  // We never read pixels back
  });
  
  if (!ctx) {
    // Fallback for browsers that don't support all options
    ctx = canvas.getContext('2d');
    console.warn('⚠️ Desynchronized mode unavailable, using standard context');
  }
  
  // Detect optimal DPR for this device
  detectOptimalDPR();
  
  // ══════════════════════════════════════════════════════════════════════════════
  // PERFORMANCE: Disable image smoothing for crisp, fast circle rendering
  // Circles are mathematically perfect, no interpolation needed
  // ══════════════════════════════════════════════════════════════════════════════
  ctx.imageSmoothingEnabled = false;
  
  // NOTE: Don't call resize() here - globals.container may not be set yet
  // main.js will call resize() after setCanvas() to ensure container is available
  
  // Debounced resize handler for smooth continuous resize (e.g., drag resize)
  const debouncedResize = () => {
    if (resizeDebounceId) cancelAnimationFrame(resizeDebounceId);
    resizeDebounceId = requestAnimationFrame(() => {
      resize();
      resizeDebounceId = null;
    });
  };
  
  window.addEventListener('resize', debouncedResize);
  
  // Enhanced responsiveness: handle edge cases where 'resize' event doesn't fire
  // - iOS Safari: virtual keyboard, safe area changes, rotation quirks
  // - Android: virtual keyboard showing/hiding
  // - Desktop: browser DevTools dock changes
  window.addEventListener('orientationchange', () => {
    // iOS needs a delay after orientation change for accurate dimensions
    setTimeout(resize, 100);
    setTimeout(resize, 300); // Fallback for slow devices
  });
  
  // Visual Viewport API: catches more edge cases (iOS notch, virtual keyboard)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', debouncedResize);
    window.visualViewport.addEventListener('scroll', debouncedResize); // For notch/safe-area shifts
  }
  
  // ResizeObserver: catches CSS-driven size changes that don't trigger window resize
  // (e.g., DevTools open/close, dynamic padding changes, CSS transitions)
  if (typeof ResizeObserver !== 'undefined') {
    const container = document.getElementById('bravia-balls');
    if (container) {
      const resizeObserver = new ResizeObserver((entries) => {
        // Debounce to avoid thrashing during CSS transitions
        debouncedResize();
      });
      resizeObserver.observe(container);
    }
  }
  
  console.log(`✓ Renderer optimized (DPR: ${effectiveDPR.toFixed(2)}, desync: ${ctx.getContextAttributes?.()?.desynchronized ?? 'unknown'})`);
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
  if (!canvas) return;
  
  const globals = getGlobals();

  // Keep vw-based layout responsive: on any resize we recompute derived px and
  // restamp CSS vars before measuring container dimensions.
  try {
    applyLayoutFromVwToPx();
    applyLayoutCSSVars();
  } catch (e) {}

  // Keep "mobile scaling" responsive to viewport width (safe: early-outs unless breakpoint changes).
  try { detectResponsiveScale(); } catch (e) {}
  
  // Use container dimensions if available, fallback to window for safety
  const container = globals.container || document.getElementById('bravia-balls');
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
  
  // Canvas fills the container completely (rubber walls are drawn at the edges)
  // We removed the layout inset to fix the "double wall" visual issue
  const canvasWidth = containerWidth;
  const canvasHeight = containerHeight;
  
  // Canvas fills container - CSS handles mode-specific heights
  // Ball Pit: CSS sets 150vh, Other modes: CSS sets 100%
  const simHeight = canvasHeight;
  
  // Use adaptive DPR for performance (may be lower than device DPR on weak hardware)
  const DPR = effectiveDPR;
  
  // Calculate new buffer dimensions
  const newWidth = Math.floor(canvasWidth * DPR);
  const newHeight = Math.floor(simHeight * DPR);
  
  // Safety: ensure we have valid positive dimensions after DPR scaling
  if (newWidth <= 0 || newHeight <= 0) {
    return;
  }
  
  // Early-out if dimensions haven't changed (prevents unnecessary canvas clearing)
  if (newWidth === prevCanvasWidth && newHeight === prevCanvasHeight) {
    return;
  }
  
  // ══════════════════════════════════════════════════════════════════════════════
  // DYNAMIC BALL REPOSITIONING
  // Scale ball positions proportionally when canvas dimensions change.
  // This keeps balls in valid positions relative to the new viewport bounds.
  // ══════════════════════════════════════════════════════════════════════════════
  if (prevCanvasWidth > 0 && prevCanvasHeight > 0 && globals.balls && globals.balls.length > 0) {
    const scaleX = newWidth / prevCanvasWidth;
    const scaleY = newHeight / prevCanvasHeight;
    
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
  // Radius comes from state (container radius - simulation padding), then DPR-scaled.
  try {
    const rCssPx = (typeof globals.getCanvasCornerRadius === 'function')
      ? globals.getCanvasCornerRadius()
      : (globals.cornerRadius ?? globals.wallRadius ?? 0);
    const rCanvasPx = Math.max(0, (Number(rCssPx) || 0) * (globals.DPR || 1));
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
