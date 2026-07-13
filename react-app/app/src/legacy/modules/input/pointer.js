// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      MOUSE/TOUCH TRACKING (COMPLETE)                         ║
// ║              Unified document-level pointer system for all modes             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { CONSTANTS, MODES, NARRATIVE_MODE_SEQUENCE } from '../core/constants.js';
import { setMode } from '../modes/mode-controller.js';
import { updateCursorPosition, hideCursor, showCursor } from '../rendering/cursor.js';
import { isOverlayActive } from '../ui/modal-overlay.js';
import { sceneImpactPress, sceneImpactRelease } from '../ui/scene-impact-react.js';
import { updateModeButtonsUI } from '../ui/controls.js';

let createWaterRippleFn = null;
let waterRippleLoadPromise = null;
const scenePointerSubscribers = new Set();

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
