// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      MOUSE/TOUCH TRACKING (COMPLETE)                         ║
// ║              Unified document-level pointer system for all modes             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from "/src/legacy/modules/core/state.js";
import { CONSTANTS, MODES, NARRATIVE_MODE_SEQUENCE } from "/src/legacy/modules/core/constants.js";
import { setMode } from "/src/legacy/modules/modes/mode-controller.js";
import { updateCursorPosition, hideCursor, showCursor } from "/src/legacy/modules/rendering/cursor.js";
import { isOverlayActive } from "/src/legacy/modules/ui/modal-overlay.js";
import { sceneImpactPress, sceneImpactRelease } from "/src/legacy/modules/ui/scene-impact-react.js";
import { updateModeButtonsUI } from "/src/legacy/modules/ui/controls.js";

let createWaterRippleFn = null;
let waterRippleLoadPromise = null;
const scenePointerSubscribers = new Set();

function triggerWaterRipple(x, y, velocityFactor) {
  if (typeof createWaterRippleFn === 'function') {
    createWaterRippleFn(x, y, velocityFactor);
    return;
  }

  if (!waterRippleLoadPromise) {
    waterRippleLoadPromise = import("/src/legacy/modules/modes/water.js")
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

  setMode(next);
  updateModeButtonsUI(next);
}

// Throttle for water ripple creation
let lastRippleTime = 0;
const RIPPLE_THROTTLE_MS = 80; // Create ripple every 80ms max

export function subscribeScenePointer(handler) {
  if (typeof handler !== 'function') return () => {};
  scenePointerSubscribers.add(handler);
  return () => {
    scenePointerSubscribers.delete(handler);
  };
}

function emitScenePointer(type, detail) {
  if (scenePointerSubscribers.size === 0) return;
  for (const handler of scenePointerSubscribers) {
    try {
      handler(type, detail);
    } catch (e) {}
  }
}

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

  if (globals.__pointerReady === true) {
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
      target.closest('.panel-toggle-btn') ||
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

  function setLegacyMousePosition(pos) {
    globals.mouseX = pos.x;
    globals.mouseY = pos.y;
    globals.mouseInCanvas = pos.inBounds;
    if (typeof window !== 'undefined') window.mouseInCanvas = pos.inBounds;
  }

  function updatePointerState(pos, {
    pointerId = null,
    pointerType = 'mouse',
    active = globals.pointerActive === true,
    eventType = 'move',
    time = performance.now()
  } = {}) {
    const wasInCanvas = globals.pointerInCanvas === true;
    const isInCanvas = pos.inBounds === true;
    const inputBecameValid = isInCanvas && (!wasInCanvas || eventType === 'down');

    setLegacyMousePosition(pos);
    globals.pointerX = pos.x;
    globals.pointerY = pos.y;
    globals.pointerInCanvas = isInCanvas;
    globals.pointerActive = Boolean(active);
    globals.pointerType = pointerType || 'mouse';
    globals.pointerInputId = pointerId ?? null;
    globals.pointerLastEventMs = time;
    globals.pointerJustEnteredCanvas = inputBecameValid;
    if (eventType === 'down') globals.pointerLastDownMs = time;
    if (eventType === 'move') globals.pointerLastMoveMs = time;
    if (inputBecameValid) globals.pointerSequence = (globals.pointerSequence || 0) + 1;

    return inputBecameValid;
  }

  function resetPointerState({ keepCoordinates = false, time = performance.now() } = {}) {
    if (!keepCoordinates) {
      globals.mouseX = CONSTANTS.OFFSCREEN_MOUSE;
      globals.mouseY = CONSTANTS.OFFSCREEN_MOUSE;
      globals.pointerX = CONSTANTS.OFFSCREEN_MOUSE;
      globals.pointerY = CONSTANTS.OFFSCREEN_MOUSE;
    }
    globals.mouseInCanvas = false;
    globals.pointerInCanvas = false;
    globals.pointerActive = false;
    globals.pointerInputId = null;
    globals.pointerJustEnteredCanvas = false;
    globals.pointerLastEventMs = time;
    if (typeof window !== 'undefined') window.mouseInCanvas = false;
  }

  /**
   * Shared move handler (mouse + pointer).
   * Mobile Playwright projects may not emit `mousemove` reliably; `pointermove`
   * is the canonical cross-input signal.
   */
  function handleMove(clientX, clientY, target, { isMouseLike, pointerId, pointerType } = { isMouseLike: true, pointerId: null, pointerType: 'mouse' }) {
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
    if (isEventOnUI(target)) {
      cancelActivePointer(target, { keepCoordinates: true, time: now });
      return;
    }
    
    // Don't track simulation interactions when gates/overlay are active
    if (isOverlayActive()) {
      cancelActivePointer(target, { keepCoordinates: true, time: now });
      return;
    }

    updatePointerState(pos, {
      pointerId,
      pointerType: pointerType || (isMouseLike ? 'mouse' : 'touch'),
      active: globals.pointerActive === true,
      eventType: 'move',
      time: now
    });

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
        triggerWaterRipple(pos.x, pos.y, velocityFactor);
        lastRippleTime = now;
      }
    }

    emitScenePointer('move', {
      x: pos.x,
      y: pos.y,
      clientX,
      clientY,
      inBounds: pos.inBounds,
      target,
      pointerId: pointerId ?? null,
      pointerType: pointerType || (isMouseLike ? 'mouse' : 'touch'),
      time: now,
      velocity: mouseVelocity,
      dirX: mouseDirX,
      dirY: mouseDirY,
      active: globals.pointerActive === true,
      sequence: globals.pointerSequence || 0,
      justEnteredCanvas: globals.pointerJustEnteredCanvas === true
    });

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
    
    handleMove(e.clientX, e.clientY, e.target, { isMouseLike: true, pointerId: null, pointerType: 'mouse' });
  }, { passive: true });

  document.addEventListener('pointermove', (e) => {
    if (!e.isPrimary) return;
    const isMouseLike = e.pointerType === 'mouse' || e.pointerType === 'pen';
    handleMove(e.clientX, e.clientY, e.target, {
      isMouseLike,
      pointerId: e.pointerId,
      pointerType: e.pointerType || (isMouseLike ? 'mouse' : 'touch')
    });
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

  document.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (isEventOnUI(e.target) || isTargetInteractive(e.target) || isOverlayActive()) {
      cancelActivePointer(e.target, { keepCoordinates: true });
      return;
    }

    const pos = getCanvasPosition(e.clientX, e.clientY);
    const now = performance.now();
    updatePointerState(pos, {
      pointerId: e.pointerId,
      pointerType: e.pointerType || 'mouse',
      active: true,
      eventType: 'down',
      time: now
    });
    if (e.pointerType === 'touch') hideCursor();

    emitScenePointer('down', {
      x: pos.x,
      y: pos.y,
      clientX: e.clientX,
      clientY: e.clientY,
      inBounds: pos.inBounds,
      target: e.target,
      pointerId: e.pointerId,
      pointerType: e.pointerType || 'mouse',
      time: now,
      velocity: mouseVelocity,
      dirX: mouseDirX,
      dirY: mouseDirY,
      active: true,
      sequence: globals.pointerSequence || 0,
      justEnteredCanvas: globals.pointerJustEnteredCanvas === true
    });
  }, { passive: true });

  const handlePointerEnd = (e, type) => {
    const now = performance.now();
    const hasFiniteClientPosition = Number.isFinite(e?.clientX) && Number.isFinite(e?.clientY);
    const hasMissingTouchEndPosition = e?.pointerType === 'touch'
      && e.clientX === 0
      && e.clientY === 0
      && globals.pointerInCanvas === true;
    const hasClientPosition = hasFiniteClientPosition && !hasMissingTouchEndPosition;
    const pos = hasClientPosition
      ? getCanvasPosition(e.clientX, e.clientY)
      : {
        x: globals.pointerX,
        y: globals.pointerY,
        inBounds: globals.pointerInCanvas === true
      };
    if (hasClientPosition) {
      updatePointerState(pos, {
        pointerId: e.pointerId,
        pointerType: e.pointerType || globals.pointerType || 'mouse',
        active: false,
        eventType: type,
        time: now
      });
    }
    emitScenePointer(type, {
      x: pos.x,
      y: pos.y,
      clientX: e.clientX,
      clientY: e.clientY,
      inBounds: pos.inBounds,
      target: e.target,
      pointerId: e.pointerId,
      pointerType: e.pointerType || 'mouse',
      time: now,
      velocity: mouseVelocity,
      dirX: mouseDirX,
      dirY: mouseDirY,
      active: false,
      sequence: globals.pointerSequence || 0,
      justEnteredCanvas: false
    });
    globals.pointerActive = false;
    globals.pointerInputId = null;
    globals.pointerJustEnteredCanvas = false;
  };

  const cancelActivePointer = (target = document, { keepCoordinates = false, time = performance.now() } = {}) => {
    if (globals.pointerActive === true || globals.pointerInputId !== null) {
      emitScenePointer('cancel', {
        x: globals.pointerX,
        y: globals.pointerY,
        clientX: null,
        clientY: null,
        inBounds: false,
        target,
        pointerId: globals.pointerInputId,
        pointerType: globals.pointerType || 'mouse',
        time,
        velocity: 0,
        dirX: 0,
        dirY: 0,
        active: false,
        sequence: globals.pointerSequence || 0,
        justEnteredCanvas: false
      });
    }
    resetPointerState({ keepCoordinates, time });
  };

  document.addEventListener('pointerup', (e) => {
    if (!e.isPrimary) return;
    handlePointerEnd(e, 'up');
  }, { passive: true });

  document.addEventListener('pointercancel', (e) => {
    handlePointerEnd(e, 'cancel');
  }, { passive: true });

  // Click-to-cycle disabled in Daily Simulation mode
  
  /**
   * Touch move tracking for mobile
   */
  document.addEventListener('touchmove', (e) => {
    if (window.PointerEvent) return;
    // Ignore touch when gates/overlay are active
    if (isOverlayActive() || isEventOnUI(e.target) || isTargetInteractive(e.target)) {
      resetPointerState({ keepCoordinates: true });
      return;
    }
    
    if (e.touches && e.touches[0]) {
      const touch = e.touches[0];
      const pos = getCanvasPosition(touch.clientX, touch.clientY);
      const now = performance.now();
      updatePointerState(pos, {
        pointerId: touch.identifier ?? null,
        pointerType: 'touch',
        active: true,
        eventType: 'move',
        time: now
      });
      const movedPx = Math.hypot(pos.x - (globals.lastPointerMoveX ?? pos.x), pos.y - (globals.lastPointerMoveY ?? pos.y));
      if (movedPx > 0.5) {
        globals.lastPointerMoveMs = now;
        globals.lastPointerMoveX = pos.x;
        globals.lastPointerMoveY = pos.y;
      }
      
      // Water mode: create ripples on touch move
      if (globals.currentMode === MODES.WATER && pos.inBounds) {
        if ((now - lastRippleTime) > RIPPLE_THROTTLE_MS) {
          triggerWaterRipple(pos.x, pos.y, 2);
          lastRippleTime = now;
        }
      }

      emitScenePointer('move', {
        x: pos.x,
        y: pos.y,
        clientX: touch.clientX,
        clientY: touch.clientY,
        inBounds: pos.inBounds,
        target: e.target,
        pointerId: touch.identifier ?? null,
        pointerType: 'touch',
        time: now,
        velocity: mouseVelocity,
        dirX: mouseDirX,
        dirY: mouseDirY,
        active: true,
        sequence: globals.pointerSequence || 0,
        justEnteredCanvas: globals.pointerJustEnteredCanvas === true
      });
    }
  }, { passive: true });
  
  /**
   * Touch tap handler for mobile - simple tap to cycle forward
   * Touch events fire click events, so they're already handled by handleModeCycleClick
   * This just handles cursor hiding for touch
   */
  document.addEventListener('touchstart', (e) => {
    if (window.PointerEvent) return; // Pointer events handle this
    if (isEventOnUI(e.target) || isTargetInteractive(e.target) || isOverlayActive()) {
      resetPointerState({ keepCoordinates: true });
      return;
    }
    
    // Hide cursor on touch
    hideCursor();

    if (e.touches && e.touches[0]) {
      const touch = e.touches[0];
      const pos = getCanvasPosition(touch.clientX, touch.clientY);
      const now = performance.now();
      updatePointerState(pos, {
        pointerId: touch.identifier ?? null,
        pointerType: 'touch',
        active: true,
        eventType: 'down',
        time: now
      });

      emitScenePointer('down', {
        x: pos.x,
        y: pos.y,
        clientX: touch.clientX,
        clientY: touch.clientY,
        inBounds: pos.inBounds,
        target: e.target,
        pointerId: touch.identifier ?? null,
        pointerType: 'touch',
        time: now,
        velocity: mouseVelocity,
        dirX: mouseDirX,
        dirY: mouseDirY,
        active: true,
        sequence: globals.pointerSequence || 0,
        justEnteredCanvas: globals.pointerJustEnteredCanvas === true
      });
    }
  }, { passive: true });

  /**
   * Reset mouse when leaving window
   */
  document.addEventListener('mouseleave', (event) => {
    cancelActivePointer(event.target || document);
    resetPointerState();
    mouseVelocity = 0;
    mouseDirX = 0;
    mouseDirY = 0;
    hideCursor();
  }, { passive: true });

  window.addEventListener('blur', () => {
    cancelActivePointer(window);
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelActivePointer(document);
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
  document.addEventListener('touchend', (e) => {
    if (window.PointerEvent) return;
    const now = performance.now();
    if (e.touches && e.touches.length > 0) return;
    emitScenePointer('up', {
      x: globals.mouseX,
      y: globals.mouseY,
      clientX: null,
      clientY: null,
      inBounds: globals.mouseInCanvas,
      target: e.target,
      pointerId: null,
      pointerType: 'touch',
      time: now,
      velocity: mouseVelocity,
      dirX: mouseDirX,
      dirY: mouseDirY,
      active: false,
      sequence: globals.pointerSequence || 0,
      justEnteredCanvas: false
    });
    resetPointerState({ time: now });
  }, { passive: true });

  document.addEventListener('touchcancel', (e) => {
    if (window.PointerEvent) return;
    resetPointerState();
    emitScenePointer('cancel', {
      x: globals.mouseX,
      y: globals.mouseY,
      clientX: null,
      clientY: null,
      inBounds: false,
      target: e.target,
      pointerId: null,
      pointerType: 'touch',
      time: performance.now(),
      velocity: 0,
      dirX: 0,
      dirY: 0,
      active: false,
      sequence: globals.pointerSequence || 0,
      justEnteredCanvas: false
    });
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInBvaW50ZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8g4pWU4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWXXG4vLyDilZEgICAgICAgICAgICAgICAgICAgICAgTU9VU0UvVE9VQ0ggVFJBQ0tJTkcgKENPTVBMRVRFKSAgICAgICAgICAgICAgICAgICAgICAgICDilZFcbi8vIOKVkSAgICAgICAgICAgICAgVW5pZmllZCBkb2N1bWVudC1sZXZlbCBwb2ludGVyIHN5c3RlbSBmb3IgYWxsIG1vZGVzICAgICAgICAgICAgIOKVkVxuLy8g4pWa4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWdXG5cbmltcG9ydCB7IGdldEdsb2JhbHMgfSBmcm9tIFwiL3NyYy9sZWdhY3kvbW9kdWxlcy9jb3JlL3N0YXRlLmpzXCI7XG5pbXBvcnQgeyBDT05TVEFOVFMsIE1PREVTLCBOQVJSQVRJVkVfTU9ERV9TRVFVRU5DRSB9IGZyb20gXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL2NvcmUvY29uc3RhbnRzLmpzXCI7XG5pbXBvcnQgeyBzZXRNb2RlIH0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvbW9kZXMvbW9kZS1jb250cm9sbGVyLmpzXCI7XG5pbXBvcnQgeyB1cGRhdGVDdXJzb3JQb3NpdGlvbiwgaGlkZUN1cnNvciwgc2hvd0N1cnNvciB9IGZyb20gXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL3JlbmRlcmluZy9jdXJzb3IuanNcIjtcbmltcG9ydCB7IGlzT3ZlcmxheUFjdGl2ZSB9IGZyb20gXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL3VpL21vZGFsLW92ZXJsYXkuanNcIjtcbmltcG9ydCB7IHNjZW5lSW1wYWN0UHJlc3MsIHNjZW5lSW1wYWN0UmVsZWFzZSB9IGZyb20gXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL3VpL3NjZW5lLWltcGFjdC1yZWFjdC5qc1wiO1xuaW1wb3J0IHsgdXBkYXRlTW9kZUJ1dHRvbnNVSSB9IGZyb20gXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL3VpL2NvbnRyb2xzLmpzXCI7XG5cbmxldCBjcmVhdGVXYXRlclJpcHBsZUZuID0gbnVsbDtcbmxldCB3YXRlclJpcHBsZUxvYWRQcm9taXNlID0gbnVsbDtcbmNvbnN0IHNjZW5lUG9pbnRlclN1YnNjcmliZXJzID0gbmV3IFNldCgpO1xuXG5mdW5jdGlvbiB0cmlnZ2VyV2F0ZXJSaXBwbGUoeCwgeSwgdmVsb2NpdHlGYWN0b3IpIHtcbiAgaWYgKHR5cGVvZiBjcmVhdGVXYXRlclJpcHBsZUZuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY3JlYXRlV2F0ZXJSaXBwbGVGbih4LCB5LCB2ZWxvY2l0eUZhY3Rvcik7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKCF3YXRlclJpcHBsZUxvYWRQcm9taXNlKSB7XG4gICAgd2F0ZXJSaXBwbGVMb2FkUHJvbWlzZSA9IGltcG9ydChcIi9zcmMvbGVnYWN5L21vZHVsZXMvbW9kZXMvd2F0ZXIuanNcIilcbiAgICAgIC50aGVuKChtb2QpID0+IHtcbiAgICAgICAgY3JlYXRlV2F0ZXJSaXBwbGVGbiA9IHR5cGVvZiBtb2QuY3JlYXRlV2F0ZXJSaXBwbGUgPT09ICdmdW5jdGlvbicgPyBtb2QuY3JlYXRlV2F0ZXJSaXBwbGUgOiBudWxsO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoKSA9PiB7fSk7XG4gIH1cblxuICB3YXRlclJpcHBsZUxvYWRQcm9taXNlLnRoZW4oKCkgPT4ge1xuICAgIGlmICh0eXBlb2YgY3JlYXRlV2F0ZXJSaXBwbGVGbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY3JlYXRlV2F0ZXJSaXBwbGVGbih4LCB5LCB2ZWxvY2l0eUZhY3Rvcik7XG4gICAgfVxuICB9KS5jYXRjaCgoKSA9PiB7fSk7XG59XG5cbi8vIE1vdXNlIHZlbG9jaXR5IHRyYWNraW5nIGZvciB3YXRlciByaXBwbGVzIGFuZCBjdXJzb3IgZXhwbG9zaW9uXG5sZXQgbGFzdE1vdXNlWCA9IDA7XG5sZXQgbGFzdE1vdXNlWSA9IDA7XG5sZXQgbGFzdE1vdmVUaW1lID0gMDtcbmxldCBtb3VzZVZlbG9jaXR5ID0gMDtcbmxldCBtb3VzZURpclggPSAwOyAvLyBOb3JtYWxpemVkIGRpcmVjdGlvbiBYICgtMSB0byAxKVxubGV0IG1vdXNlRGlyWSA9IDA7IC8vIE5vcm1hbGl6ZWQgZGlyZWN0aW9uIFkgKC0xIHRvIDEpXG5sZXQgbGFzdFRhcFRpbWUgPSAwO1xuLy8gU2ltcGxlIGNsaWNrIHRyYWNraW5nIC0ganVzdCBkZWJvdW5jZSB0byBwcmV2ZW50IHJhcGlkIGNsaWNrc1xubGV0IGxhc3RDbGlja1RpbWUgPSAwO1xuY29uc3QgQ0xJQ0tfREVCT1VOQ0VfTVMgPSAxNTA7IC8vIFByZXZlbnQgZHVwbGljYXRlIGNsaWNrcyB3aXRoaW4gMTUwbXNcblxuZnVuY3Rpb24gY3ljbGVNb2RlKCkge1xuICBjb25zdCBnbG9iYWxzID0gZ2V0R2xvYmFscygpO1xuICBjb25zdCBjdXJyZW50ID0gZ2xvYmFscy5jdXJyZW50TW9kZTtcbiAgY29uc3Qgc2VxID0gTkFSUkFUSVZFX01PREVfU0VRVUVOQ0U7XG4gIGNvbnN0IGlkeCA9IHNlcS5pbmRleE9mKGN1cnJlbnQpO1xuICBjb25zdCBiYXNlID0gaWR4ID49IDAgPyBpZHggOiAwO1xuICBjb25zdCBuZXh0ID0gc2VxWyhiYXNlICsgMSkgJSBzZXEubGVuZ3RoXTtcblxuICBzZXRNb2RlKG5leHQpO1xuICB1cGRhdGVNb2RlQnV0dG9uc1VJKG5leHQpO1xufVxuXG4vLyBUaHJvdHRsZSBmb3Igd2F0ZXIgcmlwcGxlIGNyZWF0aW9uXG5sZXQgbGFzdFJpcHBsZVRpbWUgPSAwO1xuY29uc3QgUklQUExFX1RIUk9UVExFX01TID0gODA7IC8vIENyZWF0ZSByaXBwbGUgZXZlcnkgODBtcyBtYXhcblxuZXhwb3J0IGZ1bmN0aW9uIHN1YnNjcmliZVNjZW5lUG9pbnRlcihoYW5kbGVyKSB7XG4gIGlmICh0eXBlb2YgaGFuZGxlciAhPT0gJ2Z1bmN0aW9uJykgcmV0dXJuICgpID0+IHt9O1xuICBzY2VuZVBvaW50ZXJTdWJzY3JpYmVycy5hZGQoaGFuZGxlcik7XG4gIHJldHVybiAoKSA9PiB7XG4gICAgc2NlbmVQb2ludGVyU3Vic2NyaWJlcnMuZGVsZXRlKGhhbmRsZXIpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBlbWl0U2NlbmVQb2ludGVyKHR5cGUsIGRldGFpbCkge1xuICBpZiAoc2NlbmVQb2ludGVyU3Vic2NyaWJlcnMuc2l6ZSA9PT0gMCkgcmV0dXJuO1xuICBmb3IgKGNvbnN0IGhhbmRsZXIgb2Ygc2NlbmVQb2ludGVyU3Vic2NyaWJlcnMpIHtcbiAgICB0cnkge1xuICAgICAgaGFuZGxlcih0eXBlLCBkZXRhaWwpO1xuICAgIH0gY2F0Y2ggKGUpIHt9XG4gIH1cbn1cblxuLyoqXG4gKiBHTE9CQUwgVU5JRklFRCBNT1VTRSBTWVNURU1cbiAqIEhhbmRsZXMgYWxsIG1vdXNlL3RvdWNoIGludGVyYWN0aW9ucyBhdCBkb2N1bWVudCBsZXZlbFxuICogV29ya3MgcmVnYXJkbGVzcyBvZiBjYW52YXMgei1pbmRleCBvciBwb2ludGVyLWV2ZW50c1xuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBQb2ludGVyKCkge1xuICBjb25zdCBnbG9iYWxzID0gZ2V0R2xvYmFscygpO1xuICBjb25zdCBjYW52YXMgPSBnbG9iYWxzLmNhbnZhcztcblxuICAvLyBDbGljay1jeWNsZSBwZXJtYW5lbnRseSBkaXNhYmxlZCBpbiBEYWlseSBTaW11bGF0aW9uIG1vZGVcbiAgZ2xvYmFscy5jbGlja0N5Y2xlRW5hYmxlZCA9IGZhbHNlO1xuXG4gIGlmICghY2FudmFzKSB7XG4gICAgY29uc29sZS5lcnJvcignQ2FudmFzIG5vdCBhdmFpbGFibGUgZm9yIHBvaW50ZXIgc2V0dXAnKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoZ2xvYmFscy5fX3BvaW50ZXJSZWFkeSA9PT0gdHJ1ZSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYW5lbC9VSSBoaXQtdGVzdDogd2hlbiBpbnRlcmFjdGluZyB3aXRoIHRoZSBzZXR0aW5ncyBVSSwgd2UgbXVzdCBOT1RcbiAgICogdXBkYXRlIHNpbXVsYXRpb24gbW91c2Ugc3RhdGUgKHJlcGVsL2F0dHJhY3QpLCBhbmQgdGhlIFVJIG11c3QgcmVjZWl2ZVxuICAgKiBwb2ludGVyIGV2ZW50cyBub3JtYWxseS5cbiAgICovXG4gIGZ1bmN0aW9uIGlzRXZlbnRPblVJKHRhcmdldCkge1xuICAgIGlmICghdGFyZ2V0IHx8ICF0YXJnZXQuY2xvc2VzdCkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiBCb29sZWFuKFxuICAgICAgdGFyZ2V0LmNsb3Nlc3QoJyNwYW5lbERvY2snKSB8fFxuICAgICAgdGFyZ2V0LmNsb3Nlc3QoJyNtYXN0ZXJQYW5lbCcpIHx8XG4gICAgICB0YXJnZXQuY2xvc2VzdCgnI2RvY2tUb2dnbGUnKSB8fFxuICAgICAgdGFyZ2V0LmNsb3Nlc3QoJy5wYW5lbC10b2dnbGUtYnRuJykgfHxcbiAgICAgIHRhcmdldC5jbG9zZXN0KCcucGFuZWwtZG9jaycpIHx8XG4gICAgICB0YXJnZXQuY2xvc2VzdCgnLnBhbmVsJykgfHxcbiAgICAgIHRhcmdldC5jbG9zZXN0KCcjZXhwZXJ0aXNlLWxlZ2VuZCcpIHx8ICAvLyBMZWdlbmQgYXJlYSBpcyBVSVxuICAgICAgdGFyZ2V0LmNsb3Nlc3QoJy5sZWdlbmRfX2l0ZW0nKSAgLy8gSW5kaXZpZHVhbCBsZWdlbmQgaXRlbXNcbiAgICApO1xuICB9XG4gIFxuICAvKipcbiAgICogR2V0IG1vdXNlIHBvc2l0aW9uIHJlbGF0aXZlIHRvIGNhbnZhcyBmcm9tIGFueSBldmVudFxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0Q2FudmFzUG9zaXRpb24oY2xpZW50WCwgY2xpZW50WSkge1xuICAgIC8vIFNJTVBMSUNJVFkgPiBjbGV2ZXJuZXNzOlxuICAgIC8vIEFsd2F5cyBjb21wdXRlIHRoZSByZWN0IGF0IHRoZSB0aW1lIG9mIHRoZSBldmVudCwgdGhlbiBtYXAgaW50byB0aGUgY2FudmFzIGJ1ZmZlci5cbiAgICAvLyBUaGlzIGd1YXJhbnRlZXMgY3Vyc29yICsgdHJhaWwgYWxpZ25tZW50IGV2ZW4gZHVyaW5nIGZhc3QgbW90aW9uIGFuZCBzY2VuZSB0cmFuc2Zvcm1zXG4gICAgLy8gKGdhdGUgZGVwdGgsIGltcGFjdCByZWFjdGlvbnMsIGV0Yy4pIHRoYXQgY2hhbmdlIHJlY3QgZGltZW5zaW9ucyB3aXRob3V0IHJlc2l6ZSBldmVudHMuXG4gICAgY29uc3QgcmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBjb25zdCBydyA9IHJlY3Qud2lkdGggfHwgMTtcbiAgICBjb25zdCByaCA9IHJlY3QuaGVpZ2h0IHx8IDE7XG4gICAgY29uc3Qgc3ggPSBjYW52YXMud2lkdGggLyBydztcbiAgICBjb25zdCBzeSA9IGNhbnZhcy5oZWlnaHQgLyByaDtcbiAgICByZXR1cm4ge1xuICAgICAgeDogKGNsaWVudFggLSByZWN0LmxlZnQpICogc3gsXG4gICAgICB5OiAoY2xpZW50WSAtIHJlY3QudG9wKSAqIHN5LFxuICAgICAgaW5Cb3VuZHM6IGNsaWVudFggPj0gcmVjdC5sZWZ0ICYmIGNsaWVudFggPD0gcmVjdC5yaWdodCAmJiBcbiAgICAgICAgICAgICAgICBjbGllbnRZID49IHJlY3QudG9wICYmIGNsaWVudFkgPD0gcmVjdC5ib3R0b21cbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0TGVnYWN5TW91c2VQb3NpdGlvbihwb3MpIHtcbiAgICBnbG9iYWxzLm1vdXNlWCA9IHBvcy54O1xuICAgIGdsb2JhbHMubW91c2VZID0gcG9zLnk7XG4gICAgZ2xvYmFscy5tb3VzZUluQ2FudmFzID0gcG9zLmluQm91bmRzO1xuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgd2luZG93Lm1vdXNlSW5DYW52YXMgPSBwb3MuaW5Cb3VuZHM7XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGVQb2ludGVyU3RhdGUocG9zLCB7XG4gICAgcG9pbnRlcklkID0gbnVsbCxcbiAgICBwb2ludGVyVHlwZSA9ICdtb3VzZScsXG4gICAgYWN0aXZlID0gZ2xvYmFscy5wb2ludGVyQWN0aXZlID09PSB0cnVlLFxuICAgIGV2ZW50VHlwZSA9ICdtb3ZlJyxcbiAgICB0aW1lID0gcGVyZm9ybWFuY2Uubm93KClcbiAgfSA9IHt9KSB7XG4gICAgY29uc3Qgd2FzSW5DYW52YXMgPSBnbG9iYWxzLnBvaW50ZXJJbkNhbnZhcyA9PT0gdHJ1ZTtcbiAgICBjb25zdCBpc0luQ2FudmFzID0gcG9zLmluQm91bmRzID09PSB0cnVlO1xuICAgIGNvbnN0IGlucHV0QmVjYW1lVmFsaWQgPSBpc0luQ2FudmFzICYmICghd2FzSW5DYW52YXMgfHwgZXZlbnRUeXBlID09PSAnZG93bicpO1xuXG4gICAgc2V0TGVnYWN5TW91c2VQb3NpdGlvbihwb3MpO1xuICAgIGdsb2JhbHMucG9pbnRlclggPSBwb3MueDtcbiAgICBnbG9iYWxzLnBvaW50ZXJZID0gcG9zLnk7XG4gICAgZ2xvYmFscy5wb2ludGVySW5DYW52YXMgPSBpc0luQ2FudmFzO1xuICAgIGdsb2JhbHMucG9pbnRlckFjdGl2ZSA9IEJvb2xlYW4oYWN0aXZlKTtcbiAgICBnbG9iYWxzLnBvaW50ZXJUeXBlID0gcG9pbnRlclR5cGUgfHwgJ21vdXNlJztcbiAgICBnbG9iYWxzLnBvaW50ZXJJbnB1dElkID0gcG9pbnRlcklkID8/IG51bGw7XG4gICAgZ2xvYmFscy5wb2ludGVyTGFzdEV2ZW50TXMgPSB0aW1lO1xuICAgIGdsb2JhbHMucG9pbnRlckp1c3RFbnRlcmVkQ2FudmFzID0gaW5wdXRCZWNhbWVWYWxpZDtcbiAgICBpZiAoZXZlbnRUeXBlID09PSAnZG93bicpIGdsb2JhbHMucG9pbnRlckxhc3REb3duTXMgPSB0aW1lO1xuICAgIGlmIChldmVudFR5cGUgPT09ICdtb3ZlJykgZ2xvYmFscy5wb2ludGVyTGFzdE1vdmVNcyA9IHRpbWU7XG4gICAgaWYgKGlucHV0QmVjYW1lVmFsaWQpIGdsb2JhbHMucG9pbnRlclNlcXVlbmNlID0gKGdsb2JhbHMucG9pbnRlclNlcXVlbmNlIHx8IDApICsgMTtcblxuICAgIHJldHVybiBpbnB1dEJlY2FtZVZhbGlkO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVzZXRQb2ludGVyU3RhdGUoeyBrZWVwQ29vcmRpbmF0ZXMgPSBmYWxzZSwgdGltZSA9IHBlcmZvcm1hbmNlLm5vdygpIH0gPSB7fSkge1xuICAgIGlmICgha2VlcENvb3JkaW5hdGVzKSB7XG4gICAgICBnbG9iYWxzLm1vdXNlWCA9IENPTlNUQU5UUy5PRkZTQ1JFRU5fTU9VU0U7XG4gICAgICBnbG9iYWxzLm1vdXNlWSA9IENPTlNUQU5UUy5PRkZTQ1JFRU5fTU9VU0U7XG4gICAgICBnbG9iYWxzLnBvaW50ZXJYID0gQ09OU1RBTlRTLk9GRlNDUkVFTl9NT1VTRTtcbiAgICAgIGdsb2JhbHMucG9pbnRlclkgPSBDT05TVEFOVFMuT0ZGU0NSRUVOX01PVVNFO1xuICAgIH1cbiAgICBnbG9iYWxzLm1vdXNlSW5DYW52YXMgPSBmYWxzZTtcbiAgICBnbG9iYWxzLnBvaW50ZXJJbkNhbnZhcyA9IGZhbHNlO1xuICAgIGdsb2JhbHMucG9pbnRlckFjdGl2ZSA9IGZhbHNlO1xuICAgIGdsb2JhbHMucG9pbnRlcklucHV0SWQgPSBudWxsO1xuICAgIGdsb2JhbHMucG9pbnRlckp1c3RFbnRlcmVkQ2FudmFzID0gZmFsc2U7XG4gICAgZ2xvYmFscy5wb2ludGVyTGFzdEV2ZW50TXMgPSB0aW1lO1xuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgd2luZG93Lm1vdXNlSW5DYW52YXMgPSBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTaGFyZWQgbW92ZSBoYW5kbGVyIChtb3VzZSArIHBvaW50ZXIpLlxuICAgKiBNb2JpbGUgUGxheXdyaWdodCBwcm9qZWN0cyBtYXkgbm90IGVtaXQgYG1vdXNlbW92ZWAgcmVsaWFibHk7IGBwb2ludGVybW92ZWBcbiAgICogaXMgdGhlIGNhbm9uaWNhbCBjcm9zcy1pbnB1dCBzaWduYWwuXG4gICAqL1xuICBmdW5jdGlvbiBoYW5kbGVNb3ZlKGNsaWVudFgsIGNsaWVudFksIHRhcmdldCwgeyBpc01vdXNlTGlrZSwgcG9pbnRlcklkLCBwb2ludGVyVHlwZSB9ID0geyBpc01vdXNlTGlrZTogdHJ1ZSwgcG9pbnRlcklkOiBudWxsLCBwb2ludGVyVHlwZTogJ21vdXNlJyB9KSB7XG4gICAgY29uc3QgcG9zID0gZ2V0Q2FudmFzUG9zaXRpb24oY2xpZW50WCwgY2xpZW50WSk7XG4gICAgXG4gICAgLy8gQ2FsY3VsYXRlIG1vdXNlIHZlbG9jaXR5IGVhcmx5IChmb3IgY3Vyc29yIGVmZmVjdHMgYW5kIHdhdGVyIHJpcHBsZXMpXG4gICAgY29uc3Qgbm93ID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgY29uc3QgZHQgPSBub3cgLSBsYXN0TW92ZVRpbWU7XG4gICAgaWYgKGR0ID4gMCAmJiBsYXN0TW92ZVRpbWUgPiAwKSB7XG4gICAgICBjb25zdCBkeCA9IHBvcy54IC0gbGFzdE1vdXNlWDtcbiAgICAgIGNvbnN0IGR5ID0gcG9zLnkgLSBsYXN0TW91c2VZO1xuICAgICAgY29uc3QgZGlzdCA9IE1hdGguc3FydChkeCAqIGR4ICsgZHkgKiBkeSk7XG4gICAgICBtb3VzZVZlbG9jaXR5ID0gZGlzdCAvIGR0O1xuICAgICAgXG4gICAgICAvLyBOb3JtYWxpemUgZGlyZWN0aW9uIGZvciBleHBsb3Npb24gYmlhc1xuICAgICAgaWYgKGRpc3QgPiAwLjEpIHtcbiAgICAgICAgbW91c2VEaXJYID0gZHggLyBkaXN0O1xuICAgICAgICBtb3VzZURpclkgPSBkeSAvIGRpc3Q7XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vIFVwZGF0ZSBjdXN0b20gY3Vyc29yIHBvc2l0aW9uIG9ubHkgZm9yIG1vdXNlLWxpa2UgcG9pbnRlcnNcbiAgICBpZiAoaXNNb3VzZUxpa2UpIHtcbiAgICAgIHVwZGF0ZUN1cnNvclBvc2l0aW9uKGNsaWVudFgsIGNsaWVudFkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBFbnN1cmUgY3Vyc29yIGlzIGhpZGRlbiBmb3IgdG91Y2gvcGVuIGlucHV0cyB0aGF0IGFyZW4ndCBtb3VzZS1saWtlXG4gICAgICBoaWRlQ3Vyc29yKCk7XG4gICAgfVxuXG4gICAgLy8gRG9uJ3QgdHJhY2sgc2ltdWxhdGlvbiBpbnRlcmFjdGlvbnMgaWYgdGhlIHVzZXIgaXMgb3ZlciB0aGUgcGFuZWwgVUkuXG4gICAgaWYgKGlzRXZlbnRPblVJKHRhcmdldCkpIHtcbiAgICAgIGNhbmNlbEFjdGl2ZVBvaW50ZXIodGFyZ2V0LCB7IGtlZXBDb29yZGluYXRlczogdHJ1ZSwgdGltZTogbm93IH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBcbiAgICAvLyBEb24ndCB0cmFjayBzaW11bGF0aW9uIGludGVyYWN0aW9ucyB3aGVuIGdhdGVzL292ZXJsYXkgYXJlIGFjdGl2ZVxuICAgIGlmIChpc092ZXJsYXlBY3RpdmUoKSkge1xuICAgICAgY2FuY2VsQWN0aXZlUG9pbnRlcih0YXJnZXQsIHsga2VlcENvb3JkaW5hdGVzOiB0cnVlLCB0aW1lOiBub3cgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdXBkYXRlUG9pbnRlclN0YXRlKHBvcywge1xuICAgICAgcG9pbnRlcklkLFxuICAgICAgcG9pbnRlclR5cGU6IHBvaW50ZXJUeXBlIHx8IChpc01vdXNlTGlrZSA/ICdtb3VzZScgOiAndG91Y2gnKSxcbiAgICAgIGFjdGl2ZTogZ2xvYmFscy5wb2ludGVyQWN0aXZlID09PSB0cnVlLFxuICAgICAgZXZlbnRUeXBlOiAnbW92ZScsXG4gICAgICB0aW1lOiBub3dcbiAgICB9KTtcblxuICAgIC8vIFRyYWNrIHJlYWwgbW92ZW1lbnQgZm9yIOKAnG9ubHkgbW92ZSB3aGVuIG1vdXNlIG1vdmVz4oCdIG1vZGVzIChLYWxlaWRvc2NvcGUpXG4gICAgLy8gVXNlIGEgc21hbGwgdGhyZXNob2xkIHRvIGlnbm9yZSBzdWJwaXhlbCBqaXR0ZXIuXG4gICAgY29uc3QgbW92ZWRQeCA9IE1hdGguaHlwb3QocG9zLnggLSAoZ2xvYmFscy5sYXN0UG9pbnRlck1vdmVYID8/IHBvcy54KSwgcG9zLnkgLSAoZ2xvYmFscy5sYXN0UG9pbnRlck1vdmVZID8/IHBvcy55KSk7XG4gICAgaWYgKG1vdmVkUHggPiAwLjUpIHtcbiAgICAgIGdsb2JhbHMubGFzdFBvaW50ZXJNb3ZlTXMgPSBub3c7XG4gICAgICBnbG9iYWxzLmxhc3RQb2ludGVyTW92ZVggPSBwb3MueDtcbiAgICAgIGdsb2JhbHMubGFzdFBvaW50ZXJNb3ZlWSA9IHBvcy55O1xuICAgIH1cblxuICAgIC8vIFdBVEVSIE1PREU6IENyZWF0ZSByaXBwbGVzIGJhc2VkIG9uIG1vdXNlIG1vdmVtZW50IHZlbG9jaXR5XG4gICAgaWYgKGdsb2JhbHMuY3VycmVudE1vZGUgPT09IE1PREVTLldBVEVSICYmIHBvcy5pbkJvdW5kcykge1xuICAgICAgaWYgKG1vdXNlVmVsb2NpdHkgPiAwLjMgJiYgKG5vdyAtIGxhc3RSaXBwbGVUaW1lKSA+IFJJUFBMRV9USFJPVFRMRV9NUykge1xuICAgICAgICBjb25zdCB2ZWxvY2l0eUZhY3RvciA9IE1hdGgubWluKG1vdXNlVmVsb2NpdHkgKiAyLCAzKTtcbiAgICAgICAgdHJpZ2dlcldhdGVyUmlwcGxlKHBvcy54LCBwb3MueSwgdmVsb2NpdHlGYWN0b3IpO1xuICAgICAgICBsYXN0UmlwcGxlVGltZSA9IG5vdztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBlbWl0U2NlbmVQb2ludGVyKCdtb3ZlJywge1xuICAgICAgeDogcG9zLngsXG4gICAgICB5OiBwb3MueSxcbiAgICAgIGNsaWVudFgsXG4gICAgICBjbGllbnRZLFxuICAgICAgaW5Cb3VuZHM6IHBvcy5pbkJvdW5kcyxcbiAgICAgIHRhcmdldCxcbiAgICAgIHBvaW50ZXJJZDogcG9pbnRlcklkID8/IG51bGwsXG4gICAgICBwb2ludGVyVHlwZTogcG9pbnRlclR5cGUgfHwgKGlzTW91c2VMaWtlID8gJ21vdXNlJyA6ICd0b3VjaCcpLFxuICAgICAgdGltZTogbm93LFxuICAgICAgdmVsb2NpdHk6IG1vdXNlVmVsb2NpdHksXG4gICAgICBkaXJYOiBtb3VzZURpclgsXG4gICAgICBkaXJZOiBtb3VzZURpclksXG4gICAgICBhY3RpdmU6IGdsb2JhbHMucG9pbnRlckFjdGl2ZSA9PT0gdHJ1ZSxcbiAgICAgIHNlcXVlbmNlOiBnbG9iYWxzLnBvaW50ZXJTZXF1ZW5jZSB8fCAwLFxuICAgICAganVzdEVudGVyZWRDYW52YXM6IGdsb2JhbHMucG9pbnRlckp1c3RFbnRlcmVkQ2FudmFzID09PSB0cnVlXG4gICAgfSk7XG5cbiAgICAvLyBTdG9yZSBmb3IgdmVsb2NpdHkgY2FsY3VsYXRpb25cbiAgICBsYXN0TW91c2VYID0gcG9zLng7XG4gICAgbGFzdE1vdXNlWSA9IHBvcy55O1xuICAgIGxhc3RNb3ZlVGltZSA9IG5vdztcbiAgfVxuICBcbiAgLyoqXG4gICAqIERvY3VtZW50LWxldmVsIG1vdXNlIG1vdmUgdHJhY2tpbmdcbiAgICogV29ya3MgZXZlbiB3aGVuIGNhbnZhcyBpcyBiZWhpbmQgY29udGVudCAoei1pbmRleDogLTEpXG4gICAqIFBBU1NJVkUgLSBkb2Vzbid0IGludGVyZmVyZSB3aXRoIHBhbmVsIGludGVyYWN0aW9uc1xuICAgKi9cbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgKGUpID0+IHtcbiAgICAvLyBJZiBQb2ludGVyIEV2ZW50cyBhcmUgc3VwcG9ydGVkLCB0aGV5IGhhbmRsZSB0aGlzIHdpdGggYmV0dGVyIGdyYW51bGFyaXR5IChwb2ludGVyVHlwZSlcbiAgICAvLyBUaGlzIHByZXZlbnRzIHN5bnRoZXRpYyBtb3VzZW1vdmUgZXZlbnRzIGZyb20gdG91Y2ggaW50ZXJhY3Rpb25zIGZyb20gc2hvd2luZyB0aGUgY3Vyc29yXG4gICAgaWYgKHdpbmRvdy5Qb2ludGVyRXZlbnQpIHJldHVybjtcbiAgICBcbiAgICBoYW5kbGVNb3ZlKGUuY2xpZW50WCwgZS5jbGllbnRZLCBlLnRhcmdldCwgeyBpc01vdXNlTGlrZTogdHJ1ZSwgcG9pbnRlcklkOiBudWxsLCBwb2ludGVyVHlwZTogJ21vdXNlJyB9KTtcbiAgfSwgeyBwYXNzaXZlOiB0cnVlIH0pO1xuXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJtb3ZlJywgKGUpID0+IHtcbiAgICBpZiAoIWUuaXNQcmltYXJ5KSByZXR1cm47XG4gICAgY29uc3QgaXNNb3VzZUxpa2UgPSBlLnBvaW50ZXJUeXBlID09PSAnbW91c2UnIHx8IGUucG9pbnRlclR5cGUgPT09ICdwZW4nO1xuICAgIGhhbmRsZU1vdmUoZS5jbGllbnRYLCBlLmNsaWVudFksIGUudGFyZ2V0LCB7XG4gICAgICBpc01vdXNlTGlrZSxcbiAgICAgIHBvaW50ZXJJZDogZS5wb2ludGVySWQsXG4gICAgICBwb2ludGVyVHlwZTogZS5wb2ludGVyVHlwZSB8fCAoaXNNb3VzZUxpa2UgPyAnbW91c2UnIDogJ3RvdWNoJylcbiAgICB9KTtcbiAgfSwgeyBwYXNzaXZlOiB0cnVlIH0pO1xuICBcbiAgLyoqXG4gICAqIERvY3VtZW50LWxldmVsIHByZXNzIGhhbmRsZXIgKHBvaW50ZXJkb3duL3VwKVxuICAgKiAtIFByZXNzIGluICsgc3dpdGNoIHNpbSBvbiBkb3duXG4gICAqIC0gQm91bmNlIG91dCBvbiByZWxlYXNlXG4gICAqL1xuICBmdW5jdGlvbiBpc1RhcmdldEludGVyYWN0aXZlKGVsKSB7XG4gICAgaWYgKCFlbCB8fCAhZWwuY2xvc2VzdCkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiBCb29sZWFuKFxuICAgICAgZWwuY2xvc2VzdCgnYScpIHx8XG4gICAgICBlbC5jbG9zZXN0KCdidXR0b24nKSB8fFxuICAgICAgZWwuY2xvc2VzdCgnaW5wdXQnKSB8fFxuICAgICAgZWwuY2xvc2VzdCgnc2VsZWN0JykgfHxcbiAgICAgIGVsLmNsb3Nlc3QoJ3RleHRhcmVhJykgfHxcbiAgICAgIGVsLmNsb3Nlc3QoJ1tyb2xlPVwiYnV0dG9uXCJdJykgfHwgIC8vIEFSSUEgYnV0dG9ucyAoZS5nLiwgbGVnZW5kIGl0ZW1zKVxuICAgICAgZWwuY2xvc2VzdCgnLmxlZ2VuZF9faXRlbS0taW50ZXJhY3RpdmUnKSAgLy8gSW50ZXJhY3RpdmUgbGVnZW5kIGl0ZW1zXG4gICAgKTtcbiAgfVxuXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJkb3duJywgKGUpID0+IHtcbiAgICBpZiAoIWUuaXNQcmltYXJ5KSByZXR1cm47XG4gICAgaWYgKGUucG9pbnRlclR5cGUgPT09ICdtb3VzZScgJiYgZS5idXR0b24gIT09IDApIHJldHVybjtcbiAgICBpZiAoaXNFdmVudE9uVUkoZS50YXJnZXQpIHx8IGlzVGFyZ2V0SW50ZXJhY3RpdmUoZS50YXJnZXQpIHx8IGlzT3ZlcmxheUFjdGl2ZSgpKSB7XG4gICAgICBjYW5jZWxBY3RpdmVQb2ludGVyKGUudGFyZ2V0LCB7IGtlZXBDb29yZGluYXRlczogdHJ1ZSB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBwb3MgPSBnZXRDYW52YXNQb3NpdGlvbihlLmNsaWVudFgsIGUuY2xpZW50WSk7XG4gICAgY29uc3Qgbm93ID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgdXBkYXRlUG9pbnRlclN0YXRlKHBvcywge1xuICAgICAgcG9pbnRlcklkOiBlLnBvaW50ZXJJZCxcbiAgICAgIHBvaW50ZXJUeXBlOiBlLnBvaW50ZXJUeXBlIHx8ICdtb3VzZScsXG4gICAgICBhY3RpdmU6IHRydWUsXG4gICAgICBldmVudFR5cGU6ICdkb3duJyxcbiAgICAgIHRpbWU6IG5vd1xuICAgIH0pO1xuICAgIGlmIChlLnBvaW50ZXJUeXBlID09PSAndG91Y2gnKSBoaWRlQ3Vyc29yKCk7XG5cbiAgICBlbWl0U2NlbmVQb2ludGVyKCdkb3duJywge1xuICAgICAgeDogcG9zLngsXG4gICAgICB5OiBwb3MueSxcbiAgICAgIGNsaWVudFg6IGUuY2xpZW50WCxcbiAgICAgIGNsaWVudFk6IGUuY2xpZW50WSxcbiAgICAgIGluQm91bmRzOiBwb3MuaW5Cb3VuZHMsXG4gICAgICB0YXJnZXQ6IGUudGFyZ2V0LFxuICAgICAgcG9pbnRlcklkOiBlLnBvaW50ZXJJZCxcbiAgICAgIHBvaW50ZXJUeXBlOiBlLnBvaW50ZXJUeXBlIHx8ICdtb3VzZScsXG4gICAgICB0aW1lOiBub3csXG4gICAgICB2ZWxvY2l0eTogbW91c2VWZWxvY2l0eSxcbiAgICAgIGRpclg6IG1vdXNlRGlyWCxcbiAgICAgIGRpclk6IG1vdXNlRGlyWSxcbiAgICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICAgIHNlcXVlbmNlOiBnbG9iYWxzLnBvaW50ZXJTZXF1ZW5jZSB8fCAwLFxuICAgICAganVzdEVudGVyZWRDYW52YXM6IGdsb2JhbHMucG9pbnRlckp1c3RFbnRlcmVkQ2FudmFzID09PSB0cnVlXG4gICAgfSk7XG4gIH0sIHsgcGFzc2l2ZTogdHJ1ZSB9KTtcblxuICBjb25zdCBoYW5kbGVQb2ludGVyRW5kID0gKGUsIHR5cGUpID0+IHtcbiAgICBjb25zdCBub3cgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICBjb25zdCBoYXNGaW5pdGVDbGllbnRQb3NpdGlvbiA9IE51bWJlci5pc0Zpbml0ZShlPy5jbGllbnRYKSAmJiBOdW1iZXIuaXNGaW5pdGUoZT8uY2xpZW50WSk7XG4gICAgY29uc3QgaGFzTWlzc2luZ1RvdWNoRW5kUG9zaXRpb24gPSBlPy5wb2ludGVyVHlwZSA9PT0gJ3RvdWNoJ1xuICAgICAgJiYgZS5jbGllbnRYID09PSAwXG4gICAgICAmJiBlLmNsaWVudFkgPT09IDBcbiAgICAgICYmIGdsb2JhbHMucG9pbnRlckluQ2FudmFzID09PSB0cnVlO1xuICAgIGNvbnN0IGhhc0NsaWVudFBvc2l0aW9uID0gaGFzRmluaXRlQ2xpZW50UG9zaXRpb24gJiYgIWhhc01pc3NpbmdUb3VjaEVuZFBvc2l0aW9uO1xuICAgIGNvbnN0IHBvcyA9IGhhc0NsaWVudFBvc2l0aW9uXG4gICAgICA/IGdldENhbnZhc1Bvc2l0aW9uKGUuY2xpZW50WCwgZS5jbGllbnRZKVxuICAgICAgOiB7XG4gICAgICAgIHg6IGdsb2JhbHMucG9pbnRlclgsXG4gICAgICAgIHk6IGdsb2JhbHMucG9pbnRlclksXG4gICAgICAgIGluQm91bmRzOiBnbG9iYWxzLnBvaW50ZXJJbkNhbnZhcyA9PT0gdHJ1ZVxuICAgICAgfTtcbiAgICBpZiAoaGFzQ2xpZW50UG9zaXRpb24pIHtcbiAgICAgIHVwZGF0ZVBvaW50ZXJTdGF0ZShwb3MsIHtcbiAgICAgICAgcG9pbnRlcklkOiBlLnBvaW50ZXJJZCxcbiAgICAgICAgcG9pbnRlclR5cGU6IGUucG9pbnRlclR5cGUgfHwgZ2xvYmFscy5wb2ludGVyVHlwZSB8fCAnbW91c2UnLFxuICAgICAgICBhY3RpdmU6IGZhbHNlLFxuICAgICAgICBldmVudFR5cGU6IHR5cGUsXG4gICAgICAgIHRpbWU6IG5vd1xuICAgICAgfSk7XG4gICAgfVxuICAgIGVtaXRTY2VuZVBvaW50ZXIodHlwZSwge1xuICAgICAgeDogcG9zLngsXG4gICAgICB5OiBwb3MueSxcbiAgICAgIGNsaWVudFg6IGUuY2xpZW50WCxcbiAgICAgIGNsaWVudFk6IGUuY2xpZW50WSxcbiAgICAgIGluQm91bmRzOiBwb3MuaW5Cb3VuZHMsXG4gICAgICB0YXJnZXQ6IGUudGFyZ2V0LFxuICAgICAgcG9pbnRlcklkOiBlLnBvaW50ZXJJZCxcbiAgICAgIHBvaW50ZXJUeXBlOiBlLnBvaW50ZXJUeXBlIHx8ICdtb3VzZScsXG4gICAgICB0aW1lOiBub3csXG4gICAgICB2ZWxvY2l0eTogbW91c2VWZWxvY2l0eSxcbiAgICAgIGRpclg6IG1vdXNlRGlyWCxcbiAgICAgIGRpclk6IG1vdXNlRGlyWSxcbiAgICAgIGFjdGl2ZTogZmFsc2UsXG4gICAgICBzZXF1ZW5jZTogZ2xvYmFscy5wb2ludGVyU2VxdWVuY2UgfHwgMCxcbiAgICAgIGp1c3RFbnRlcmVkQ2FudmFzOiBmYWxzZVxuICAgIH0pO1xuICAgIGdsb2JhbHMucG9pbnRlckFjdGl2ZSA9IGZhbHNlO1xuICAgIGdsb2JhbHMucG9pbnRlcklucHV0SWQgPSBudWxsO1xuICAgIGdsb2JhbHMucG9pbnRlckp1c3RFbnRlcmVkQ2FudmFzID0gZmFsc2U7XG4gIH07XG5cbiAgY29uc3QgY2FuY2VsQWN0aXZlUG9pbnRlciA9ICh0YXJnZXQgPSBkb2N1bWVudCwgeyBrZWVwQ29vcmRpbmF0ZXMgPSBmYWxzZSwgdGltZSA9IHBlcmZvcm1hbmNlLm5vdygpIH0gPSB7fSkgPT4ge1xuICAgIGlmIChnbG9iYWxzLnBvaW50ZXJBY3RpdmUgPT09IHRydWUgfHwgZ2xvYmFscy5wb2ludGVySW5wdXRJZCAhPT0gbnVsbCkge1xuICAgICAgZW1pdFNjZW5lUG9pbnRlcignY2FuY2VsJywge1xuICAgICAgICB4OiBnbG9iYWxzLnBvaW50ZXJYLFxuICAgICAgICB5OiBnbG9iYWxzLnBvaW50ZXJZLFxuICAgICAgICBjbGllbnRYOiBudWxsLFxuICAgICAgICBjbGllbnRZOiBudWxsLFxuICAgICAgICBpbkJvdW5kczogZmFsc2UsXG4gICAgICAgIHRhcmdldCxcbiAgICAgICAgcG9pbnRlcklkOiBnbG9iYWxzLnBvaW50ZXJJbnB1dElkLFxuICAgICAgICBwb2ludGVyVHlwZTogZ2xvYmFscy5wb2ludGVyVHlwZSB8fCAnbW91c2UnLFxuICAgICAgICB0aW1lLFxuICAgICAgICB2ZWxvY2l0eTogMCxcbiAgICAgICAgZGlyWDogMCxcbiAgICAgICAgZGlyWTogMCxcbiAgICAgICAgYWN0aXZlOiBmYWxzZSxcbiAgICAgICAgc2VxdWVuY2U6IGdsb2JhbHMucG9pbnRlclNlcXVlbmNlIHx8IDAsXG4gICAgICAgIGp1c3RFbnRlcmVkQ2FudmFzOiBmYWxzZVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJlc2V0UG9pbnRlclN0YXRlKHsga2VlcENvb3JkaW5hdGVzLCB0aW1lIH0pO1xuICB9O1xuXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJ1cCcsIChlKSA9PiB7XG4gICAgaWYgKCFlLmlzUHJpbWFyeSkgcmV0dXJuO1xuICAgIGhhbmRsZVBvaW50ZXJFbmQoZSwgJ3VwJyk7XG4gIH0sIHsgcGFzc2l2ZTogdHJ1ZSB9KTtcblxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVyY2FuY2VsJywgKGUpID0+IHtcbiAgICBoYW5kbGVQb2ludGVyRW5kKGUsICdjYW5jZWwnKTtcbiAgfSwgeyBwYXNzaXZlOiB0cnVlIH0pO1xuXG4gIC8vIENsaWNrLXRvLWN5Y2xlIGRpc2FibGVkIGluIERhaWx5IFNpbXVsYXRpb24gbW9kZVxuICBcbiAgLyoqXG4gICAqIFRvdWNoIG1vdmUgdHJhY2tpbmcgZm9yIG1vYmlsZVxuICAgKi9cbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgKGUpID0+IHtcbiAgICBpZiAod2luZG93LlBvaW50ZXJFdmVudCkgcmV0dXJuO1xuICAgIC8vIElnbm9yZSB0b3VjaCB3aGVuIGdhdGVzL292ZXJsYXkgYXJlIGFjdGl2ZVxuICAgIGlmIChpc092ZXJsYXlBY3RpdmUoKSB8fCBpc0V2ZW50T25VSShlLnRhcmdldCkgfHwgaXNUYXJnZXRJbnRlcmFjdGl2ZShlLnRhcmdldCkpIHtcbiAgICAgIHJlc2V0UG9pbnRlclN0YXRlKHsga2VlcENvb3JkaW5hdGVzOiB0cnVlIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBcbiAgICBpZiAoZS50b3VjaGVzICYmIGUudG91Y2hlc1swXSkge1xuICAgICAgY29uc3QgdG91Y2ggPSBlLnRvdWNoZXNbMF07XG4gICAgICBjb25zdCBwb3MgPSBnZXRDYW52YXNQb3NpdGlvbih0b3VjaC5jbGllbnRYLCB0b3VjaC5jbGllbnRZKTtcbiAgICAgIGNvbnN0IG5vdyA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgdXBkYXRlUG9pbnRlclN0YXRlKHBvcywge1xuICAgICAgICBwb2ludGVySWQ6IHRvdWNoLmlkZW50aWZpZXIgPz8gbnVsbCxcbiAgICAgICAgcG9pbnRlclR5cGU6ICd0b3VjaCcsXG4gICAgICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICAgICAgZXZlbnRUeXBlOiAnbW92ZScsXG4gICAgICAgIHRpbWU6IG5vd1xuICAgICAgfSk7XG4gICAgICBjb25zdCBtb3ZlZFB4ID0gTWF0aC5oeXBvdChwb3MueCAtIChnbG9iYWxzLmxhc3RQb2ludGVyTW92ZVggPz8gcG9zLngpLCBwb3MueSAtIChnbG9iYWxzLmxhc3RQb2ludGVyTW92ZVkgPz8gcG9zLnkpKTtcbiAgICAgIGlmIChtb3ZlZFB4ID4gMC41KSB7XG4gICAgICAgIGdsb2JhbHMubGFzdFBvaW50ZXJNb3ZlTXMgPSBub3c7XG4gICAgICAgIGdsb2JhbHMubGFzdFBvaW50ZXJNb3ZlWCA9IHBvcy54O1xuICAgICAgICBnbG9iYWxzLmxhc3RQb2ludGVyTW92ZVkgPSBwb3MueTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gV2F0ZXIgbW9kZTogY3JlYXRlIHJpcHBsZXMgb24gdG91Y2ggbW92ZVxuICAgICAgaWYgKGdsb2JhbHMuY3VycmVudE1vZGUgPT09IE1PREVTLldBVEVSICYmIHBvcy5pbkJvdW5kcykge1xuICAgICAgICBpZiAoKG5vdyAtIGxhc3RSaXBwbGVUaW1lKSA+IFJJUFBMRV9USFJPVFRMRV9NUykge1xuICAgICAgICAgIHRyaWdnZXJXYXRlclJpcHBsZShwb3MueCwgcG9zLnksIDIpO1xuICAgICAgICAgIGxhc3RSaXBwbGVUaW1lID0gbm93O1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGVtaXRTY2VuZVBvaW50ZXIoJ21vdmUnLCB7XG4gICAgICAgIHg6IHBvcy54LFxuICAgICAgICB5OiBwb3MueSxcbiAgICAgICAgY2xpZW50WDogdG91Y2guY2xpZW50WCxcbiAgICAgICAgY2xpZW50WTogdG91Y2guY2xpZW50WSxcbiAgICAgICAgaW5Cb3VuZHM6IHBvcy5pbkJvdW5kcyxcbiAgICAgICAgdGFyZ2V0OiBlLnRhcmdldCxcbiAgICAgICAgcG9pbnRlcklkOiB0b3VjaC5pZGVudGlmaWVyID8/IG51bGwsXG4gICAgICAgIHBvaW50ZXJUeXBlOiAndG91Y2gnLFxuICAgICAgICB0aW1lOiBub3csXG4gICAgICAgIHZlbG9jaXR5OiBtb3VzZVZlbG9jaXR5LFxuICAgICAgICBkaXJYOiBtb3VzZURpclgsXG4gICAgICAgIGRpclk6IG1vdXNlRGlyWSxcbiAgICAgICAgYWN0aXZlOiB0cnVlLFxuICAgICAgICBzZXF1ZW5jZTogZ2xvYmFscy5wb2ludGVyU2VxdWVuY2UgfHwgMCxcbiAgICAgICAganVzdEVudGVyZWRDYW52YXM6IGdsb2JhbHMucG9pbnRlckp1c3RFbnRlcmVkQ2FudmFzID09PSB0cnVlXG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHsgcGFzc2l2ZTogdHJ1ZSB9KTtcbiAgXG4gIC8qKlxuICAgKiBUb3VjaCB0YXAgaGFuZGxlciBmb3IgbW9iaWxlIC0gc2ltcGxlIHRhcCB0byBjeWNsZSBmb3J3YXJkXG4gICAqIFRvdWNoIGV2ZW50cyBmaXJlIGNsaWNrIGV2ZW50cywgc28gdGhleSdyZSBhbHJlYWR5IGhhbmRsZWQgYnkgaGFuZGxlTW9kZUN5Y2xlQ2xpY2tcbiAgICogVGhpcyBqdXN0IGhhbmRsZXMgY3Vyc29yIGhpZGluZyBmb3IgdG91Y2hcbiAgICovXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCAoZSkgPT4ge1xuICAgIGlmICh3aW5kb3cuUG9pbnRlckV2ZW50KSByZXR1cm47IC8vIFBvaW50ZXIgZXZlbnRzIGhhbmRsZSB0aGlzXG4gICAgaWYgKGlzRXZlbnRPblVJKGUudGFyZ2V0KSB8fCBpc1RhcmdldEludGVyYWN0aXZlKGUudGFyZ2V0KSB8fCBpc092ZXJsYXlBY3RpdmUoKSkge1xuICAgICAgcmVzZXRQb2ludGVyU3RhdGUoeyBrZWVwQ29vcmRpbmF0ZXM6IHRydWUgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIFxuICAgIC8vIEhpZGUgY3Vyc29yIG9uIHRvdWNoXG4gICAgaGlkZUN1cnNvcigpO1xuXG4gICAgaWYgKGUudG91Y2hlcyAmJiBlLnRvdWNoZXNbMF0pIHtcbiAgICAgIGNvbnN0IHRvdWNoID0gZS50b3VjaGVzWzBdO1xuICAgICAgY29uc3QgcG9zID0gZ2V0Q2FudmFzUG9zaXRpb24odG91Y2guY2xpZW50WCwgdG91Y2guY2xpZW50WSk7XG4gICAgICBjb25zdCBub3cgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICAgIHVwZGF0ZVBvaW50ZXJTdGF0ZShwb3MsIHtcbiAgICAgICAgcG9pbnRlcklkOiB0b3VjaC5pZGVudGlmaWVyID8/IG51bGwsXG4gICAgICAgIHBvaW50ZXJUeXBlOiAndG91Y2gnLFxuICAgICAgICBhY3RpdmU6IHRydWUsXG4gICAgICAgIGV2ZW50VHlwZTogJ2Rvd24nLFxuICAgICAgICB0aW1lOiBub3dcbiAgICAgIH0pO1xuXG4gICAgICBlbWl0U2NlbmVQb2ludGVyKCdkb3duJywge1xuICAgICAgICB4OiBwb3MueCxcbiAgICAgICAgeTogcG9zLnksXG4gICAgICAgIGNsaWVudFg6IHRvdWNoLmNsaWVudFgsXG4gICAgICAgIGNsaWVudFk6IHRvdWNoLmNsaWVudFksXG4gICAgICAgIGluQm91bmRzOiBwb3MuaW5Cb3VuZHMsXG4gICAgICAgIHRhcmdldDogZS50YXJnZXQsXG4gICAgICAgIHBvaW50ZXJJZDogdG91Y2guaWRlbnRpZmllciA/PyBudWxsLFxuICAgICAgICBwb2ludGVyVHlwZTogJ3RvdWNoJyxcbiAgICAgICAgdGltZTogbm93LFxuICAgICAgICB2ZWxvY2l0eTogbW91c2VWZWxvY2l0eSxcbiAgICAgICAgZGlyWDogbW91c2VEaXJYLFxuICAgICAgICBkaXJZOiBtb3VzZURpclksXG4gICAgICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICAgICAgc2VxdWVuY2U6IGdsb2JhbHMucG9pbnRlclNlcXVlbmNlIHx8IDAsXG4gICAgICAgIGp1c3RFbnRlcmVkQ2FudmFzOiBnbG9iYWxzLnBvaW50ZXJKdXN0RW50ZXJlZENhbnZhcyA9PT0gdHJ1ZVxuICAgICAgfSk7XG4gICAgfVxuICB9LCB7IHBhc3NpdmU6IHRydWUgfSk7XG5cbiAgLyoqXG4gICAqIFJlc2V0IG1vdXNlIHdoZW4gbGVhdmluZyB3aW5kb3dcbiAgICovXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbGVhdmUnLCAoZXZlbnQpID0+IHtcbiAgICBjYW5jZWxBY3RpdmVQb2ludGVyKGV2ZW50LnRhcmdldCB8fCBkb2N1bWVudCk7XG4gICAgcmVzZXRQb2ludGVyU3RhdGUoKTtcbiAgICBtb3VzZVZlbG9jaXR5ID0gMDtcbiAgICBtb3VzZURpclggPSAwO1xuICAgIG1vdXNlRGlyWSA9IDA7XG4gICAgaGlkZUN1cnNvcigpO1xuICB9LCB7IHBhc3NpdmU6IHRydWUgfSk7XG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2JsdXInLCAoKSA9PiB7XG4gICAgY2FuY2VsQWN0aXZlUG9pbnRlcih3aW5kb3cpO1xuICB9LCB7IHBhc3NpdmU6IHRydWUgfSk7XG5cbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigndmlzaWJpbGl0eWNoYW5nZScsICgpID0+IHtcbiAgICBpZiAoZG9jdW1lbnQuaGlkZGVuKSBjYW5jZWxBY3RpdmVQb2ludGVyKGRvY3VtZW50KTtcbiAgfSwgeyBwYXNzaXZlOiB0cnVlIH0pO1xuICBcbiAgLyoqXG4gICAqIFNob3cgY3Vyc29yIHdoZW4gbW91c2UgZW50ZXJzIHdpbmRvd1xuICAgKi9cbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VlbnRlcicsICgpID0+IHtcbiAgICBzaG93Q3Vyc29yKCk7XG4gIH0sIHsgcGFzc2l2ZTogdHJ1ZSB9KTtcbiAgXG4gIC8qKlxuICAgKiBUb3VjaCBlbmQgLSByZXNldCB0cmFja2luZ1xuICAgKi9cbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCAoZSkgPT4ge1xuICAgIGlmICh3aW5kb3cuUG9pbnRlckV2ZW50KSByZXR1cm47XG4gICAgY29uc3Qgbm93ID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgaWYgKGUudG91Y2hlcyAmJiBlLnRvdWNoZXMubGVuZ3RoID4gMCkgcmV0dXJuO1xuICAgIGVtaXRTY2VuZVBvaW50ZXIoJ3VwJywge1xuICAgICAgeDogZ2xvYmFscy5tb3VzZVgsXG4gICAgICB5OiBnbG9iYWxzLm1vdXNlWSxcbiAgICAgIGNsaWVudFg6IG51bGwsXG4gICAgICBjbGllbnRZOiBudWxsLFxuICAgICAgaW5Cb3VuZHM6IGdsb2JhbHMubW91c2VJbkNhbnZhcyxcbiAgICAgIHRhcmdldDogZS50YXJnZXQsXG4gICAgICBwb2ludGVySWQ6IG51bGwsXG4gICAgICBwb2ludGVyVHlwZTogJ3RvdWNoJyxcbiAgICAgIHRpbWU6IG5vdyxcbiAgICAgIHZlbG9jaXR5OiBtb3VzZVZlbG9jaXR5LFxuICAgICAgZGlyWDogbW91c2VEaXJYLFxuICAgICAgZGlyWTogbW91c2VEaXJZLFxuICAgICAgYWN0aXZlOiBmYWxzZSxcbiAgICAgIHNlcXVlbmNlOiBnbG9iYWxzLnBvaW50ZXJTZXF1ZW5jZSB8fCAwLFxuICAgICAganVzdEVudGVyZWRDYW52YXM6IGZhbHNlXG4gICAgfSk7XG4gICAgcmVzZXRQb2ludGVyU3RhdGUoeyB0aW1lOiBub3cgfSk7XG4gIH0sIHsgcGFzc2l2ZTogdHJ1ZSB9KTtcblxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGNhbmNlbCcsIChlKSA9PiB7XG4gICAgaWYgKHdpbmRvdy5Qb2ludGVyRXZlbnQpIHJldHVybjtcbiAgICByZXNldFBvaW50ZXJTdGF0ZSgpO1xuICAgIGVtaXRTY2VuZVBvaW50ZXIoJ2NhbmNlbCcsIHtcbiAgICAgIHg6IGdsb2JhbHMubW91c2VYLFxuICAgICAgeTogZ2xvYmFscy5tb3VzZVksXG4gICAgICBjbGllbnRYOiBudWxsLFxuICAgICAgY2xpZW50WTogbnVsbCxcbiAgICAgIGluQm91bmRzOiBmYWxzZSxcbiAgICAgIHRhcmdldDogZS50YXJnZXQsXG4gICAgICBwb2ludGVySWQ6IG51bGwsXG4gICAgICBwb2ludGVyVHlwZTogJ3RvdWNoJyxcbiAgICAgIHRpbWU6IHBlcmZvcm1hbmNlLm5vdygpLFxuICAgICAgdmVsb2NpdHk6IDAsXG4gICAgICBkaXJYOiAwLFxuICAgICAgZGlyWTogMCxcbiAgICAgIGFjdGl2ZTogZmFsc2UsXG4gICAgICBzZXF1ZW5jZTogZ2xvYmFscy5wb2ludGVyU2VxdWVuY2UgfHwgMCxcbiAgICAgIGp1c3RFbnRlcmVkQ2FudmFzOiBmYWxzZVxuICAgIH0pO1xuICB9LCB7IHBhc3NpdmU6IHRydWUgfSk7XG4gIFxuICBjb25zb2xlLmxvZygn4pyTIFVuaWZpZWQgcG9pbnRlciBzeXN0ZW0gY29uZmlndXJlZCAoZG9jdW1lbnQtbGV2ZWwpJyk7XG5cbiAgLy8gVGVzdCBob29rOiBhbGxvdyBQbGF5d3JpZ2h0IHRvIHdhaXQgZm9yIHBvaW50ZXIgd2lyaW5nIGFjcm9zcyBlbmdpbmVzLlxuICBnbG9iYWxzLl9fcG9pbnRlclJlYWR5ID0gdHJ1ZTtcbiAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB3aW5kb3cuX19wb2ludGVyUmVhZHkgPSB0cnVlO1xufVxuXG4vKipcbiAqIEVuYWJsZS9kaXNhYmxlIGNsaWNrLXRvLWN5Y2xlIG1vZGUgc3dpdGNoaW5nXG4gKi9cbi8qKlxuICogR2V0IGN1cnJlbnQgbW91c2UgdmVsb2NpdHkgKHB4L21zKVxuICogVXNlZCBmb3IgaW1wYWN0LWJhc2VkIGN1cnNvciBleHBsb3Npb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldE1vdXNlVmVsb2NpdHkoKSB7XG4gIHJldHVybiBtb3VzZVZlbG9jaXR5IHx8IDA7XG59XG5cbi8qKlxuICogR2V0IGN1cnJlbnQgbW91c2UgZGlyZWN0aW9uIChub3JtYWxpemVkIHZlY3RvcilcbiAqIFJldHVybnMge3gsIHl9IHdpdGggbWFnbml0dWRlIH4xLjAsIG9yIHt4OiAwLCB5OiAwfSBpZiBubyBtb3ZlbWVudFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0TW91c2VEaXJlY3Rpb24oKSB7XG4gIHJldHVybiB7IHg6IG1vdXNlRGlyWCB8fCAwLCB5OiBtb3VzZURpclkgfHwgMCB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0Q2xpY2tDeWNsZUVuYWJsZWQoZW5hYmxlZCkge1xuICAvLyBTeW5jIHRvIGdsb2JhbCBzdGF0ZVxuICBjb25zdCBnbG9iYWxzID0gZ2V0R2xvYmFscygpO1xuICBnbG9iYWxzLmNsaWNrQ3ljbGVFbmFibGVkID0gZW5hYmxlZDtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFbEYsTUFBTSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7QUFDOUQsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztBQUNqRyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7QUFDdEUsTUFBTSxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztBQUN0RyxNQUFNLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7QUFD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QU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDO0FBQ3BFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVE7QUFDNUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUs7QUFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTztBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO0FBQ2hFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDO0FBQzVELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQztBQUNGLENBQUM7QUFDRCxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7QUFDcEQsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVU7QUFDOUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU07QUFDeEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztBQUNsRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU07QUFDN0YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ2pDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ1gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFD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QyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEosQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDbkQsQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTztBQUMzRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsWUFBWTtBQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVTtBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUk7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO0FBQ3pELENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMs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Q0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQzVFLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVc7QUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7QUFDNUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDcEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDdkIsQ0FBQztBQUNELENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUU7QUFDakQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztBQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO0FBQ3JCLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUs7QUFDeEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTztBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUs7QUFDM0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUM7QUFDdEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDM0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQzlELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDWixDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVKLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFD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QUFDLElBQUksQ0FBQztBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxSCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUks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