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
let clickCycleEnabled = true; // Click/tap cycles through modes

const MODE_CYCLE = [
  MODES.PIT,
  MODES.FLIES,
  MODES.WEIGHTLESS,
  MODES.WATER,
  MODES.VORTEX,
  MODES.PING_PONG,
  MODES.MAGNETIC,
  MODES.BUBBLES,
  MODES.KALEIDOSCOPE
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
   * Panel/UI hit-test: when interacting with the settings UI, we must NOT
   * update simulation mouse state (repel/attract), and the UI must receive
   * pointer events normally.
   */
  function isEventOnUI(target) {
    if (!target || !target.closest) return false;
    return Boolean(
      target.closest('#panelDock') ||
      target.closest('#masterPanel') ||
      target.closest('#dockToggle') ||
      target.closest('.panel-dock') ||
      target.closest('.panel')
    );
  }
  
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
   * Shared move handler (mouse + pointer).
   * Mobile Playwright projects may not emit `mousemove` reliably; `pointermove`
   * is the canonical cross-input signal.
   */
  function handleMove(clientX, clientY, target, { isMouseLike } = { isMouseLike: true }) {
    // Title/logo micro-interaction (viewport based) — keep responsive even over UI.
    updateBrandLogoCursorScaleFromClient(clientX, clientY);

    // Update custom cursor position only for mouse-like pointers.
    if (isMouseLike) {
      updateCursorPosition(clientX, clientY);
    } else {
      // Ensure cursor is hidden for touch/pen inputs that aren't mouse-like
      hideCursor();
    }

    // Don't track simulation interactions if the user is over the panel UI
    if (isEventOnUI(target)) return;

    const pos = getCanvasPosition(clientX, clientY);

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

    // Track real movement for “only move when mouse moves” modes (Kaleidoscope)
    // Use a small threshold to ignore subpixel jitter.
    const movedPx = Math.hypot(pos.x - (globals.lastPointerMoveX ?? pos.x), pos.y - (globals.lastPointerMoveY ?? pos.y));
    if (movedPx > 0.5) {
      globals.lastPointerMoveMs = now;
      globals.lastPointerMoveX = pos.x;
      globals.lastPointerMoveY = pos.y;
    }

    // WATER MODE: Create ripples based on mouse movement velocity
    if (globals.currentMode === MODES.WATER && pos.inBounds) {
      if (mouseVelocity > 0.3 && (now - lastRippleTime) > RIPPLE_THROTTLE_MS) {
        const velocityFactor = Math.min(mouseVelocity * 2, 3);
        createWaterRipple(pos.x, pos.y, velocityFactor);
        lastRippleTime = now;
      }
    }

    // Store for velocity calculation
    lastMouseX = pos.x;
    lastMouseY = pos.y;
    lastMoveTime = now;
  }
  
  /**
   * Document-level mouse move tracking
   * Works even when canvas is behind content (z-index: -1)
   * PASSIVE - doesn't interfere with panel interactions
   */
  document.addEventListener('mousemove', (e) => {
    // If Pointer Events are supported, they handle this with better granularity (pointerType)
    // This prevents synthetic mousemove events from touch interactions from showing the cursor
    if (window.PointerEvent) return;
    
    handleMove(e.clientX, e.clientY, e.target, { isMouseLike: true });
  }, { passive: true });

  document.addEventListener('pointermove', (e) => {
    const isMouseLike = e.pointerType === 'mouse' || e.pointerType === 'pen';
    handleMove(e.clientX, e.clientY, e.target, { isMouseLike });
  }, { passive: true });
  
  /**
   * Document-level click handler
   * Responds to mode-specific interactions
   */
  document.addEventListener('click', (e) => {
    // Ignore clicks on panel or interactive elements
    if (isEventOnUI(e.target)) return;
    if (e.target.closest('a')) return;
    if (e.target.closest('button')) return;
    if (e.target.closest('input')) return;
    if (e.target.closest('select')) return;
    if (e.target.closest('textarea')) return;
    
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
      const now = performance.now();
      const movedPx = Math.hypot(pos.x - (globals.lastPointerMoveX ?? pos.x), pos.y - (globals.lastPointerMoveY ?? pos.y));
      if (movedPx > 0.5) {
        globals.lastPointerMoveMs = now;
        globals.lastPointerMoveX = pos.x;
        globals.lastPointerMoveY = pos.y;
      }
      
      // Water mode: create ripples on touch move
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
    if (isEventOnUI(e.target)) return;
    
    // Explicitly hide cursor on touch start to prevent it getting stuck
    hideCursor();

    if (e.target.closest('a')) return;
    if (e.target.closest('button')) return;
    if (e.target.closest('input')) return;
    if (e.target.closest('select')) return;
    if (e.target.closest('textarea')) return;
    
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

  // Test hook: allow Playwright to wait for pointer wiring across engines.
  globals.__pointerReady = true;
  if (typeof window !== 'undefined') window.__pointerReady = true;
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
