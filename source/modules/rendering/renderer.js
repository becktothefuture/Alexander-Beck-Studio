// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          RENDERER (COMPLETE)                                 ║
// ║                 Canvas setup, resize, and rendering                          ║
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
  
  resize();
  window.addEventListener('resize', resize);
}

export function resize() {
  if (!canvas) return;
  
  const globals = getGlobals();
  const heightMultiplier = (globals.currentMode === MODES.PIT)
    ? CONSTANTS.CANVAS_HEIGHT_VH_PIT
    : CONSTANTS.CANVAS_HEIGHT_VH_DEFAULT;
  
  const simHeight = window.innerHeight * heightMultiplier;
  const DPR = CONSTANTS.DPR;
  
  canvas.width = Math.floor(window.innerWidth * DPR);
  canvas.height = Math.floor(simHeight * DPR);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = simHeight + 'px';
  applyCanvasShadow(canvas);
}

export function getCanvas() {
  return canvas;
}

export function getContext() {
  return ctx;
}
