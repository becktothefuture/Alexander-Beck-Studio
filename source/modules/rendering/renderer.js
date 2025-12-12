// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          RENDERER (COMPLETE)                                 ║
// ║                 Canvas setup, resize, and rendering                          ║
// ║      Sizes relative to container (supports frame padding/border)             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { CONSTANTS, MODES } from '../core/constants.js';
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
 * Resize canvas to match container dimensions (not window/viewport).
 * Accounts for simulation padding (space inside container around canvas).
 * Container border is handled by CSS inset positioning on #bravia-balls.
 * Also calculates container radius in pixels for physics corner collisions.
 */
export function resize() {
  if (!canvas) return;
  
  const globals = getGlobals();
  
  // Use container dimensions if available, fallback to window for safety
  const container = globals.container || document.getElementById('bravia-balls');
  const containerWidth = container ? container.clientWidth : window.innerWidth;
  const containerHeight = container ? container.clientHeight : window.innerHeight;
  
  // Calculate container radius in pixels (12vh → px)
  // Use viewport height for vh calculation
  const viewportHeight = window.innerHeight;
  globals.containerRadiusPx = (globals.containerRadiusVh / 100) * viewportHeight;
  
  // Account for simulation padding (reduces available space for canvas)
  const simPad = globals.simulationPadding || 0;
  const availableWidth = Math.max(0, containerWidth - (simPad * 2));
  const availableHeight = Math.max(0, containerHeight - (simPad * 2));
  
  // Ball Pit mode uses 150% height (spawn area above viewport)
  const heightMultiplier = (globals.currentMode === MODES.PIT)
    ? CONSTANTS.CANVAS_HEIGHT_VH_PIT
    : CONSTANTS.CANVAS_HEIGHT_VH_DEFAULT;
  
  const simHeight = availableHeight * heightMultiplier;
  const DPR = CONSTANTS.DPR;
  
  // Set canvas buffer size (high-DPI) - uses available space after simulation padding
  canvas.width = Math.floor(availableWidth * DPR);
  canvas.height = Math.floor(simHeight * DPR);
  
  // Set CSS display size (container-relative, accounting for simulation padding)
  canvas.style.width = availableWidth + 'px';
  canvas.style.height = simHeight + 'px';
  
  applyCanvasShadow(canvas);
}

export function getCanvas() {
  return canvas;
}

export function getContext() {
  return ctx;
}
