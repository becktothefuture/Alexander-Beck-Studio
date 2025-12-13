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
  
  // Canvas sits inside the rubber walls (wall thickness is the inset)
  const wallThickness = globals.wallThickness || 0;
  const canvasWidth = containerWidth - (wallThickness * 2);
  const canvasHeight = containerHeight - (wallThickness * 2);
  
  // Canvas fills container - CSS handles mode-specific heights
  // Ball Pit: CSS sets 150vh, Other modes: CSS sets 100%
  const simHeight = canvasHeight;
  const DPR = CONSTANTS.DPR;
  
  // Set canvas buffer size (high-DPI)
  canvas.width = Math.floor(canvasWidth * DPR);
  canvas.height = Math.floor(simHeight * DPR);
  
  // Let CSS handle display sizing via var(--wall-thickness)
  // But set explicit values for consistency in non-CSS environments
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
