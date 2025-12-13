// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          RENDERER (OPTIMIZED)                               ║
// ║                 Canvas setup, resize, and rendering                          ║
// ║      Electron-grade performance optimizations for all browsers               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { CONSTANTS } from '../core/constants.js';
import { getGlobals, setEffectiveDPR } from '../core/state.js';
import { applyCanvasShadow } from './effects.js';

let canvas, ctx;

// ════════════════════════════════════════════════════════════════════════════════
// PERFORMANCE: Adaptive DPR based on device capability
// High-end: full DPR, Low-end: reduced for smooth 60fps
// ════════════════════════════════════════════════════════════════════════════════
let effectiveDPR = CONSTANTS.DPR;

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
  window.addEventListener('resize', resize);
  
  console.log(`✓ Renderer optimized (DPR: ${effectiveDPR.toFixed(2)}, desync: ${ctx.getContextAttributes?.()?.desynchronized ?? 'unknown'})`);
}

/**
 * Resize canvas to match container dimensions minus wall thickness.
 * 
 * The rubber wall system uses wall thickness as the inset for the canvas.
 * CSS handles positioning (top/left/right/bottom = wallThickness)
 * JS handles buffer dimensions for high-DPI rendering.
 */
export function resize() {
  if (!canvas) return;
  
  const globals = getGlobals();
  
  // Use container dimensions if available, fallback to window for safety
  const container = globals.container || document.getElementById('bravia-balls');
  const containerWidth = container ? container.clientWidth : window.innerWidth;
  const containerHeight = container ? container.clientHeight : window.innerHeight;
  
  // Canvas fills the container completely (rubber walls are drawn at the edges)
  // We removed the layout inset to fix the "double wall" visual issue
  const canvasWidth = containerWidth;
  const canvasHeight = containerHeight;
  
  // Canvas fills container - CSS handles mode-specific heights
  // Ball Pit: CSS sets 150vh, Other modes: CSS sets 100%
  const simHeight = canvasHeight;
  
  // Use adaptive DPR for performance (may be lower than device DPR on weak hardware)
  const DPR = effectiveDPR;
  
  // Set canvas buffer size (high-DPI)
  canvas.width = Math.floor(canvasWidth * DPR);
  canvas.height = Math.floor(simHeight * DPR);
  
  // Let CSS handle display sizing via var(--wall-thickness)
  // But set explicit values for consistency in non-CSS environments
  canvas.style.width = canvasWidth + 'px';
  canvas.style.height = simHeight + 'px';
  
  // Re-apply context optimizations after resize (some browsers reset them)
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
  }
  
  applyCanvasShadow(canvas);
}

export function getCanvas() {
  return canvas;
}

export function getContext() {
  return ctx;
}
