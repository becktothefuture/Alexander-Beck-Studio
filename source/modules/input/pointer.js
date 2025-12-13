// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      MOUSE/TOUCH TRACKING (COMPLETE)                         ║
// ║              Unified document-level pointer system for all modes             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { CONSTANTS, MODES } from '../core/constants.js';
import { createWaterRipple } from '../modes/water.js';
import { updateBrandLogoCursorScaleFromClient } from '../ui/brand-logo-cursor-scale.js';
import { updateCursorPosition, hideCursor, showCursor } from '../rendering/cursor.js';

// Mouse velocity tracking for water ripples
let lastMouseX = 0;
let lastMouseY = 0;
let lastMoveTime = 0;
let mouseVelocity = 0;
let lastTapTime = 0;
let clickCycleEnabled = false; // DISABLED by default - click/tap cycles through modes

const MODE_CYCLE = [
  MODES.PIT,
  MODES.FLIES,
  MODES.WEIGHTLESS,
  MODES.WATER,
  MODES.VORTEX,
  MODES.PING_PONG,
  MODES.MAGNETIC,
  MODES.BUBBLES
];

function cycleMode() {
  const globals = getGlobals();
  const current = globals.currentMode;
  const idx = MODE_CYCLE.indexOf(current);
  const next = MODE_CYCLE[(idx + 1) % MODE_CYCLE.length] || MODE_CYCLE[0];
  import('../modes/mode-controller.js').then(({ setMode }) => {
    setMode(next);
  });
  import('../ui/controls.js').then(({ updateModeButtonsUI }) => {
    updateModeButtonsUI(next);
  });
}

// Throttle for water ripple creation
let lastRippleTime = 0;
const RIPPLE_THROTTLE_MS = 80; // Create ripple every 80ms max

/**
 * GLOBAL UNIFIED MOUSE SYSTEM
 * Handles all mouse/touch interactions at document level
 * Works regardless of canvas z-index or pointer-events
 */
export function setupPointer() {
  const globals = getGlobals();
  const canvas = globals.canvas;
  
  // Initialize clickCycleEnabled from global state
  clickCycleEnabled = globals.clickCycleEnabled || false;
  
  if (!canvas) {
    console.error('Canvas not available for pointer setup');
    return;
  }
  
  const DPR = globals.DPR;
  
  /**
   * Get mouse position relative to canvas from any event
   */
  function getCanvasPosition(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * DPR,
      y: (clientY - rect.top) * DPR,
      inBounds: clientX >= rect.left && clientX <= rect.right && 
                clientY >= rect.top && clientY <= rect.bottom
    };
  }
  
  /**
   * Document-level mouse move tracking
   * Works even when canvas is behind content (z-index: -1)
   * PASSIVE - doesn't interfere with panel interactions
   */
  document.addEventListener('mousemove', (e) => {
    // Title/logo micro-interaction (viewport based) — keep responsive even over UI.
    updateBrandLogoCursorScaleFromClient(e.clientX, e.clientY);
    
    // Update custom cursor position
    updateCursorPosition(e.clientX, e.clientY);

    // Don't track if over panel
    if (e.target.closest('#controlPanel')) return;
    
    const pos = getCanvasPosition(e.clientX, e.clientY);
  
    // Calculate mouse velocity for water ripples
    const now = performance.now();
    const dt = now - lastMoveTime;
    if (dt > 0 && lastMoveTime > 0) {
      const dx = pos.x - lastMouseX;
      const dy = pos.y - lastMouseY;
      mouseVelocity = Math.sqrt(dx * dx + dy * dy) / dt;
    }
    
    // Update globals with 1:1 mouse position
    globals.mouseX = pos.x;
    globals.mouseY = pos.y;
    globals.mouseInCanvas = pos.inBounds;
    if (typeof window !== 'undefined') window.mouseInCanvas = pos.inBounds;
    
    // ════════════════════════════════════════════════════════════════════════
    // WATER MODE: Create ripples based on mouse movement velocity
    // ════════════════════════════════════════════════════════════════════════
    if (globals.currentMode === MODES.WATER && pos.inBounds) {
      // Only create ripple if moving fast enough and throttle time passed
      if (mouseVelocity > 0.3 && (now - lastRippleTime) > RIPPLE_THROTTLE_MS) {
        // Scale ripple strength based on velocity (faster = stronger)
        const velocityFactor = Math.min(mouseVelocity * 2, 3);
        createWaterRipple(pos.x, pos.y, velocityFactor);
        lastRippleTime = now;
      }
    }

    
    // Store for velocity calculation
    lastMouseX = pos.x;
    lastMouseY = pos.y;
    lastMoveTime = now;
  }, { passive: true });
  
  /**
   * Document-level click handler
   * Responds to mode-specific interactions
   */
  document.addEventListener('click', (e) => {
    // Ignore clicks on panel or interactive elements
    if (e.target.closest('#controlPanel')) return;
    if (e.target.closest('a')) return;
    if (e.target.closest('button')) return;
    
    const pos = getCanvasPosition(e.clientX, e.clientY);
    
    // Only process if click is within canvas bounds
    if (!pos.inBounds) return;
    
    // NO click effects on any simulation - only mouse movement triggers interactions
    // Click cycles mode (if enabled)
    if (clickCycleEnabled) {
      cycleMode();
    }
  });
  
  /**
   * Touch move tracking for mobile
   */
  document.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      const pos = getCanvasPosition(e.touches[0].clientX, e.touches[0].clientY);
      globals.mouseX = pos.x;
      globals.mouseY = pos.y;
      globals.mouseInCanvas = pos.inBounds;
      
      // Water mode: create ripples on touch move
      const now = performance.now();
      if (globals.currentMode === MODES.WATER && pos.inBounds) {
        if ((now - lastRippleTime) > RIPPLE_THROTTLE_MS) {
          createWaterRipple(pos.x, pos.y, 2);
          lastRippleTime = now;
        }
      }
    }
  }, { passive: true });
  
  /**
   * Touch tap handler for mobile interactions
   * Water creates ripple on tap
   */
  document.addEventListener('touchstart', (e) => {
    // Ignore touches on panel
    if (e.target.closest('#controlPanel')) return;
    if (e.target.closest('a')) return;
    if (e.target.closest('button')) return;
    
    if (e.touches && e.touches[0]) {
      const pos = getCanvasPosition(e.touches[0].clientX, e.touches[0].clientY);
      
      if (!pos.inBounds) return;
      
      // NO tap effects on any simulation - only finger drag triggers interactions
      // Double-tap cycles mode (if enabled)
      const now = performance.now();
      if (now - lastTapTime < 300 && clickCycleEnabled) {
        cycleMode();
      }
      lastTapTime = now;
    }
  }, { passive: true });
  
  /**
   * Reset mouse when leaving window
   */
  document.addEventListener('mouseleave', () => {
    globals.mouseX = CONSTANTS.OFFSCREEN_MOUSE;
    globals.mouseY = CONSTANTS.OFFSCREEN_MOUSE;
    globals.mouseInCanvas = false;
    mouseVelocity = 0;
    if (typeof window !== 'undefined') window.mouseInCanvas = false;
    hideCursor();
  });
  
  /**
   * Show cursor when mouse enters window
   */
  document.addEventListener('mouseenter', () => {
    showCursor();
  });
  
  /**
   * Touch end - reset tracking
   */
  document.addEventListener('touchend', () => {
    globals.mouseX = CONSTANTS.OFFSCREEN_MOUSE;
    globals.mouseY = CONSTANTS.OFFSCREEN_MOUSE;
    globals.mouseInCanvas = false;
  }, { passive: true });
  
  console.log('✓ Unified pointer system configured (document-level)');
}

/**
 * Enable/disable click-to-cycle mode switching
 */
export function setClickCycleEnabled(enabled) {
  clickCycleEnabled = enabled;
  // Sync to global state
  const globals = getGlobals();
  globals.clickCycleEnabled = enabled;
}
