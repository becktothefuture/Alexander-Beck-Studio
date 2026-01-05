// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      MOUSE/TOUCH TRACKING (COMPLETE)                         ║
// ║              Unified document-level pointer system for all modes             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { CONSTANTS, MODES, NARRATIVE_MODE_SEQUENCE } from '../core/constants.js';
import { createWaterRipple } from '../modes/water.js';
import { updateCursorPosition, hideCursor, showCursor } from '../rendering/cursor.js';
import { notifyMouseTrailMove } from '../visual/mouse-trail.js';
import { isOverlayActive } from '../ui/gate-overlay.js';
import { sceneImpactPress, sceneImpactRelease } from '../ui/scene-impact-react.js';

// Mouse velocity tracking for water ripples
let lastMouseX = 0;
let lastMouseY = 0;
let lastMoveTime = 0;
let mouseVelocity = 0;
let lastTapTime = 0;
// Click/tap cycles through modes (value stored on globals; avoid caching so modes can override).
let pressCycleActive = false;
let pressCyclePointerId = null;
// Touch drag detection: track start position and total movement to distinguish tap vs drag
let pressCycleStartX = 0;
let pressCycleStartY = 0;
let pressCycleTotalMove = 0;
const TAP_MOVE_THRESHOLD = 15; // px: movement below this is considered a tap, above is a drag
let pressCycleDidPress = false;
let mobilePulseTimeoutId = 0;

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
  
  // Ensure the flag exists (some modes may override it at runtime).
  if (globals.clickCycleEnabled === undefined) globals.clickCycleEnabled = false;
  
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
      mouseVelocity = Math.sqrt(dx * dx + dy * dy) / dt;
    }
    
    // Update custom cursor position only for mouse-like pointers
    if (isMouseLike) {
      updateCursorPosition(clientX, clientY);
    } else {
      // Ensure cursor is hidden for touch/pen inputs that aren't mouse-like
      hideCursor();
    }

    // Don't track simulation interactions if the user is over the panel UI.
    // EXCEPTION: Orbit modes should always follow the cursor, even when UI overlays intercept pointer events.
    const isOrbitMode = globals.currentMode === MODES.ORBIT_3D || globals.currentMode === MODES.ORBIT_3D_2;
    if (!isOrbitMode && isEventOnUI(target)) return;
    
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

  function isMobileViewportNow() {
    // Prefer state flags (kept current by renderer.resize()).
    if (globals?.isMobile || globals?.isMobileViewport) return true;
    // Fallback for edge cases / devtools emulation.
    try {
      return Boolean(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
    } catch (e) {
      return false;
    }
  }

  function clearMobilePulseTimeout() {
    if (!mobilePulseTimeoutId) return;
    try { window.clearTimeout(mobilePulseTimeoutId); } catch (e) {}
    mobilePulseTimeoutId = 0;
  }

  function tryPressCycleStart(clientX, clientY, target, pointerId = null, pointerType = 'mouse') {
    if (pressCycleActive) return;
    if (isEventOnUI(target)) return;
    if (isTargetInteractive(target)) return;
    if (isOverlayActive()) return;
    if (!globals.clickCycleEnabled) return;

    const pos = getCanvasPosition(clientX, clientY);
    if (!pos.inBounds) return;

    pressCycleActive = true;
    pressCyclePointerId = pointerId;
    // Record start position for drag detection (touch only)
    pressCycleStartX = clientX;
    pressCycleStartY = clientY;
    pressCycleTotalMove = 0;
    pressCycleDidPress = false;

    // Desktop behavior: press-in immediately on down, hold until release.
    // Mobile behavior: do NOT press on down (scroll/drag should never push the scene).
    clearMobilePulseTimeout();
    if (!isMobileViewportNow()) {
      pressCycleDidPress = true;
      sceneImpactPress(1, { armManual: true, scheduleRelease: false });
    }
  }

  function tryPressCycleEnd(pointerId = null, pointerType = 'mouse') {
    if (!pressCycleActive) return;
    if (pressCyclePointerId !== null && pointerId !== null && pointerId !== pressCyclePointerId) return;
    
    const wasActive = pressCycleActive;
    const totalMove = pressCycleTotalMove;
    pressCycleActive = false;
    pressCyclePointerId = null;
    pressCycleTotalMove = 0;
    const didPress = pressCycleDidPress;
    pressCycleDidPress = false;
    
    // On touch devices: only cycle mode if it was a tap (minimal movement), not a drag
    const isTouch = pointerType === 'touch' || pointerType === 'pen';
    if (isTouch && totalMove > TAP_MOVE_THRESHOLD) {
      // It was a drag, not a tap - do not change modes.
      // If we were in a desktop press-hold path, ensure we release the scene.
      if (didPress) sceneImpactRelease(1);
      return;
    }

    // Mobile: click/tap triggers BOTH parts (press then return) in sequence.
    // Mode changes when the return begins.
    if (isMobileViewportNow()) {
      sceneImpactPress(1, { armManual: true, scheduleRelease: false });
      const pressMsBase = globals.sceneImpactPressMs ?? 75;
      const pressMs = Math.max(1, Math.round((Number(pressMsBase) || 0) * 0.8)); // must match scene-impact-react
      const holdMs = Math.round(Math.min(80, Math.max(0, (Number(pressMs) || 0) * 0.4)));
      clearMobilePulseTimeout();
      mobilePulseTimeoutId = window.setTimeout(() => {
        mobilePulseTimeoutId = 0;
        cycleMode();
        sceneImpactRelease(1);
      }, Math.max(0, Math.round(pressMs) + holdMs));
      return;
    }

    // Desktop: mode changes on release while the scene returns.
    cycleMode();
    sceneImpactRelease(1);
  }

  function tryPressCycleCancel(pointerId = null) {
    if (!pressCycleActive) return;
    if (pressCyclePointerId !== null && pointerId !== null && pointerId !== pressCyclePointerId) return;
    pressCycleActive = false;
    pressCyclePointerId = null;
    pressCycleTotalMove = 0;
    clearMobilePulseTimeout();
    if (pressCycleDidPress) sceneImpactRelease(1);
    pressCycleDidPress = false;
  }

  if (window.PointerEvent) {
    document.addEventListener('pointerdown', (e) => {
      tryPressCycleStart(e.clientX, e.clientY, e.target, e.pointerId, e.pointerType);
    }, { passive: true });

    document.addEventListener('pointermove', (e) => {
      // Track movement during active press cycle (for tap vs drag detection)
      if (pressCycleActive && pressCyclePointerId === e.pointerId) {
        const dx = e.clientX - pressCycleStartX;
        const dy = e.clientY - pressCycleStartY;
        pressCycleTotalMove = Math.max(pressCycleTotalMove, Math.hypot(dx, dy));
      }
    }, { passive: true });

    document.addEventListener('pointerup', (e) => {
      tryPressCycleEnd(e.pointerId, e.pointerType);
    }, { passive: true });

    document.addEventListener('pointercancel', (e) => {
      tryPressCycleCancel(e.pointerId);
    }, { passive: true });
  } else {
    // Fallbacks for older browsers without Pointer Events
    document.addEventListener('mousedown', (e) => {
      tryPressCycleStart(e.clientX, e.clientY, e.target, null, 'mouse');
    }, { passive: true });

    document.addEventListener('mouseup', () => {
      tryPressCycleEnd(null, 'mouse');
    }, { passive: true });
  }
  
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
   * Touch tap handler for mobile interactions
   * Water creates ripple on tap
   */
  document.addEventListener('touchstart', (e) => {
    // If Pointer Events are supported, touch is handled by pointerdown/up above.
    if (window.PointerEvent) return;
    // Ignore touches on panel
    if (isEventOnUI(e.target)) return;
    
    // Ignore touches when gates/overlay are active
    if (isOverlayActive()) return;
    
    // Explicitly hide cursor on touch start to prevent it getting stuck
    hideCursor();

    if (e.target.closest('a')) return;
    if (e.target.closest('button')) return;
    if (e.target.closest('input')) return;
    if (e.target.closest('select')) return;
    if (e.target.closest('textarea')) return;
    
    if (e.touches && e.touches[0]) {
      const touch = e.touches[0];
      const pos = getCanvasPosition(touch.clientX, touch.clientY);
      
      if (!pos.inBounds) return;

      if (globals.clickCycleEnabled) {
        pressCycleActive = true;
        pressCyclePointerId = null;
        // Record start position for drag detection
        pressCycleStartX = touch.clientX;
        pressCycleStartY = touch.clientY;
        pressCycleTotalMove = 0;
      }
    }
  }, { passive: true });

  // Track touch movement for tap vs drag detection (fallback for no PointerEvent)
  document.addEventListener('touchmove', (e) => {
    if (window.PointerEvent) return;
    if (pressCycleActive && e.touches && e.touches[0]) {
      const touch = e.touches[0];
      const dx = touch.clientX - pressCycleStartX;
      const dy = touch.clientY - pressCycleStartY;
      pressCycleTotalMove = Math.max(pressCycleTotalMove, Math.hypot(dx, dy));
    }
  }, { passive: true });

  document.addEventListener('touchend', () => {
    if (window.PointerEvent) return;
    tryPressCycleEnd(null, 'touch');
  }, { passive: true });

  document.addEventListener('touchcancel', () => {
    if (window.PointerEvent) return;
    tryPressCycleCancel(null);
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
  // Sync to global state
  const globals = getGlobals();
  globals.clickCycleEnabled = enabled;
}
