// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      MOUSE/TOUCH TRACKING (COMPLETE)                         ║
// ║              Unified document-level pointer system for all modes             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { CONSTANTS, MODES, NARRATIVE_MODE_SEQUENCE } from '../core/constants.js';
import { updateCursorPosition, hideCursor, showCursor } from '../rendering/cursor.js';
import { notifyMouseTrailMove } from '../visual/mouse-trail.js';
import { isOverlayActive } from '../ui/modal-overlay.js';
import { sceneImpactPress, sceneImpactRelease } from '../ui/scene-impact-react.js';

let createWaterRippleFn = null;
let waterRippleLoadPromise = null;

function triggerWaterRipple(x, y, velocityFactor) {
  if (typeof createWaterRippleFn === 'function') {
    createWaterRippleFn(x, y, velocityFactor);
    return;
  }

  if (!waterRippleLoadPromise) {
    waterRippleLoadPromise = import('../modes/water.js')
      .then((mod) => {
        createWaterRippleFn = typeof mod.createWaterRipple === 'function' ? mod.createWaterRipple : null;
      })
      .catch(() => {});
  }

  waterRippleLoadPromise.then(() => {
    if (typeof createWaterRippleFn === 'function') {
      createWaterRippleFn(x, y, velocityFactor);
    }
  }).catch(() => {});
}

// Mouse velocity tracking for water ripples and cursor explosion
let lastMouseX = 0;
let lastMouseY = 0;
let lastMoveTime = 0;
let mouseVelocity = 0;
let mouseDirX = 0; // Normalized direction X (-1 to 1)
let mouseDirY = 0; // Normalized direction Y (-1 to 1)
let lastTapTime = 0;
// Simple click tracking - just debounce to prevent rapid clicks
let lastClickTime = 0;
const CLICK_DEBOUNCE_MS = 150; // Prevent duplicate clicks within 150ms

function cycleMode() {
  const globals = getGlobals();
  const current = globals.currentMode;
  const seq = NARRATIVE_MODE_SEQUENCE;
  const idx = seq.indexOf(current);
  const base = idx >= 0 ? idx : 0;
  const next = seq[(base + 1) % seq.length];

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
  
  // Click-cycle permanently disabled in Daily Simulation mode
  globals.clickCycleEnabled = false;
  
  if (!canvas) {
    console.error('Canvas not available for pointer setup');
    return;
  }

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
      target.closest('.panel') ||
      target.closest('#expertise-legend') ||  // Legend area is UI
      target.closest('.legend__item')  // Individual legend items
    );
  }
  
  /**
   * Get mouse position relative to canvas from any event
   */
  function getCanvasPosition(clientX, clientY) {
    // SIMPLICITY > cleverness:
    // Always compute the rect at the time of the event, then map into the canvas buffer.
    // This guarantees cursor + trail alignment even during fast motion and scene transforms
    // (gate depth, impact reactions, etc.) that change rect dimensions without resize events.
    const rect = canvas.getBoundingClientRect();
    const rw = rect.width || 1;
    const rh = rect.height || 1;
    const sx = canvas.width / rw;
    const sy = canvas.height / rh;
    return {
      x: (clientX - rect.left) * sx,
      y: (clientY - rect.top) * sy,
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
    const pos = getCanvasPosition(clientX, clientY);
    
    // Calculate mouse velocity early (for cursor effects and water ripples)
    const now = performance.now();
    const dt = now - lastMoveTime;
    if (dt > 0 && lastMoveTime > 0) {
      const dx = pos.x - lastMouseX;
      const dy = pos.y - lastMouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      mouseVelocity = dist / dt;
      
      // Normalize direction for explosion bias
      if (dist > 0.1) {
        mouseDirX = dx / dist;
        mouseDirY = dy / dist;
      }
    }
    
    // Update custom cursor position only for mouse-like pointers
    if (isMouseLike) {
      updateCursorPosition(clientX, clientY);
    } else {
      // Ensure cursor is hidden for touch/pen inputs that aren't mouse-like
      hideCursor();
    }

    // Don't track simulation interactions if the user is over the panel UI.
    if (isEventOnUI(target)) return;
    
    // Don't track simulation interactions when gates/overlay are active
    if (isOverlayActive()) return;

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

    // Mouse trail (canvas-rendered): record only for mouse-like pointers and real movement.
    if (isMouseLike && movedPx > 0.5) {
      notifyMouseTrailMove(pos.x, pos.y, now, pos.inBounds);
    }

    // WATER MODE: Create ripples based on mouse movement velocity
    if (globals.currentMode === MODES.WATER && pos.inBounds) {
      if (mouseVelocity > 0.3 && (now - lastRippleTime) > RIPPLE_THROTTLE_MS) {
        const velocityFactor = Math.min(mouseVelocity * 2, 3);
        triggerWaterRipple(pos.x, pos.y, velocityFactor);
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
   * Document-level press handler (pointerdown/up)
   * - Press in + switch sim on down
   * - Bounce out on release
   */
  function isTargetInteractive(el) {
    if (!el || !el.closest) return false;
    return Boolean(
      el.closest('a') ||
      el.closest('button') ||
      el.closest('input') ||
      el.closest('select') ||
      el.closest('textarea') ||
      el.closest('[role="button"]') ||  // ARIA buttons (e.g., legend items)
      el.closest('.legend__item--interactive')  // Interactive legend items
    );
  }

  // Click-to-cycle disabled in Daily Simulation mode
  
  /**
   * Touch move tracking for mobile
   */
  document.addEventListener('touchmove', (e) => {
    // Ignore touch when gates/overlay are active
    if (isOverlayActive()) return;
    
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
   * Touch tap handler for mobile - simple tap to cycle forward
   * Touch events fire click events, so they're already handled by handleModeCycleClick
   * This just handles cursor hiding for touch
   */
  document.addEventListener('touchstart', (e) => {
    if (window.PointerEvent) return; // Pointer events handle this
    if (isEventOnUI(e.target)) return;
    if (isOverlayActive()) return;
    
    // Hide cursor on touch
    hideCursor();
    
    // Touch taps will fire click events which are handled by handleModeCycleClick
    // For touch, click events have button === 0 (left), so they'll go forward
  }, { passive: true });

  /**
   * Reset mouse when leaving window
   */
  document.addEventListener('mouseleave', () => {
    globals.mouseX = CONSTANTS.OFFSCREEN_MOUSE;
    globals.mouseY = CONSTANTS.OFFSCREEN_MOUSE;
    globals.mouseInCanvas = false;
    mouseVelocity = 0;
    mouseDirX = 0;
    mouseDirY = 0;
    if (typeof window !== 'undefined') window.mouseInCanvas = false;
    hideCursor();
  }, { passive: true });
  
  /**
   * Show cursor when mouse enters window
   */
  document.addEventListener('mouseenter', () => {
    showCursor();
  }, { passive: true });
  
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
/**
 * Get current mouse velocity (px/ms)
 * Used for impact-based cursor explosion
 */
export function getMouseVelocity() {
  return mouseVelocity || 0;
}

/**
 * Get current mouse direction (normalized vector)
 * Returns {x, y} with magnitude ~1.0, or {x: 0, y: 0} if no movement
 */
export function getMouseDirection() {
  return { x: mouseDirX || 0, y: mouseDirY || 0 };
}

export function setClickCycleEnabled(enabled) {
  // Sync to global state
  const globals = getGlobals();
  globals.clickCycleEnabled = enabled;
}
