// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      MOUSE/TOUCH TRACKING (COMPLETE)                         ║
// ║              Extracted from balls-source.html lines 2836-2856                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { CONSTANTS } from '../core/constants.js';

export function setupPointer() {
  const globals = getGlobals();
  const canvas = globals.canvas;
  
  if (!canvas) {
    console.error('Canvas not available for pointer setup');
    return;
  }
  
  const DPR = globals.DPR;
  
  // Mouse move handler
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    globals.mouseX = (e.clientX - rect.left) * DPR;
    globals.mouseY = (e.clientY - rect.top) * DPR;
    // Do not set mouseInCanvas true here; only in mouseenter
  });
  
  // Mouse enter handler
  canvas.addEventListener('mouseenter', () => {
    globals.mouseInCanvas = true;
    if (typeof window !== 'undefined') window.mouseInCanvas = true;
  });
  
  // Mouse leave handler
  canvas.addEventListener('mouseleave', () => {
    globals.mouseX = CONSTANTS.OFFSCREEN_MOUSE;
    globals.mouseY = CONSTANTS.OFFSCREEN_MOUSE;
    globals.mouseInCanvas = false;
    if (typeof window !== 'undefined') {
      window.mouseInCanvas = false;
    }
  });
  
  // Touch handlers for mobile
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      const rect = canvas.getBoundingClientRect();
      globals.mouseX = (e.touches[0].clientX - rect.left) * DPR;
      globals.mouseY = (e.touches[0].clientY - rect.top) * DPR;
      globals.mouseInCanvas = true;
    }
  }, { passive: true });
  
  canvas.addEventListener('touchend', () => {
    globals.mouseX = CONSTANTS.OFFSCREEN_MOUSE;
    globals.mouseY = CONSTANTS.OFFSCREEN_MOUSE;
    globals.mouseInCanvas = false;
  });
  
  console.log('✓ Pointer tracking configured');
}
