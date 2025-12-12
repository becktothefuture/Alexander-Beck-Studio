// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          RENDERER (COMPLETE)                                 ║
// ║                 Canvas setup, resize, and rendering                          ║
// ║      Sizes relative to container (supports frame padding/border)             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { CONSTANTS } from '../core/constants.js';
import { getGlobals } from '../core/state.js';
import { applyCanvasShadow } from './effects.js';

let canvas, ctx;

export function setupRenderer() {
  canvas = document.getElementById('c');
  ctx = canvas ? canvas.getContext('2d') : null;
  
  if (!canvas || !ctx) {
    console.error('Canvas not found');
    return;
  }
  
  // NOTE: Don't call resize() here - globals.container may not be set yet
  // main.js will call resize() after setCanvas() to ensure container is available
  window.addEventListener('resize', resize);
}

/**
 * Resize canvas to match container dimensions minus simulation padding.
 * 
 * Two-level padding system:
 * 1. containerBorder: already handled by CSS (insets #bravia-balls from viewport)
 * 2. simulationPadding: canvas is inset from container edges (handled here + CSS)
 */
export function resize() {
  if (!canvas) return;
  
  const globals = getGlobals();
  
  // Use container dimensions if available, fallback to window for safety
  const container = globals.container || document.getElementById('bravia-balls');
  const containerWidth = container ? container.clientWidth : window.innerWidth;
  const containerHeight = container ? container.clientHeight : window.innerHeight;
  
  // Simulation padding: canvas is inset from container edges
  const simPad = globals.simulationPadding || 0;
  const canvasWidth = containerWidth - (simPad * 2);
  const canvasHeight = containerHeight - (simPad * 2);
  
  // Canvas fills container - CSS handles mode-specific heights
  // Ball Pit: CSS sets 150vh (border-adjusted), Other modes: CSS sets 100%
  // No JS multiplier needed since container dimensions are already correct
  const simHeight = canvasHeight;
  const DPR = CONSTANTS.DPR;
  
  // Set canvas buffer size (high-DPI)
  canvas.width = Math.floor(canvasWidth * DPR);
  canvas.height = Math.floor(simHeight * DPR);
  
  // CSS handles display size via calc(100% - padding * 2), but we set explicit values for consistency
  canvas.style.width = canvasWidth + 'px';
  canvas.style.height = simHeight + 'px';
  
  applyCanvasShadow(canvas);
}

export function getCanvas() {
  return canvas;
}

export function getContext() {
  return ctx;
}
