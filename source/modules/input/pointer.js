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
import { emitCursorPulse, getCurrentCursorPosition } from '../ui/cursor-pulse.js';

// Mouse velocity tracking for water ripples
let lastMouseX = 0;
let lastMouseY = 0;
let lastMoveTime = 0;
let mouseVelocity = 0;
let lastTapTime = 0;
// Track last cursor position for pulse effect
let lastCursorX = 0;
let lastCursorY = 0;
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

  // Cursor pulse effect disabled
  // const cursorPos = getCurrentCursorPosition();
  // if (cursorPos) {
  //   emitCursorPulse(cursorPos.x, cursorPos.y);
  // } else if (lastCursorX > 0 || lastCursorY > 0) {
  //   emitCursorPulse(lastCursorX, lastCursorY);
  // }

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
  
  const DPR = globals.DPR;

  // Cache canvas rect to avoid layout reads on every pointermove.
  // Invalidate on resize (and on first use).
  let cachedCanvasRect = null;
  let rectInvalidated = true;
  
  // Initialize canvas rect immediately to ensure cursor and trail alignment from the start
  // This prevents misalignment on page load where cursor updates before trail gets accurate rect
  try {
    cachedCanvasRect = canvas.getBoundingClientRect();
    rectInvalidated = false;
  } catch (e) {
    // Fallback: will be calculated on first mouse move
    rectInvalidated = true;
  }
  
  // Force rect recalculation after initial layout settles (catches any delayed layout shifts)
  // This ensures cursor and trail stay aligned even if canvas position shifts slightly after load
  try {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Double rAF ensures layout has settled
        cachedCanvasRect = canvas.getBoundingClientRect();
        rectInvalidated = false;
      });
    });
  } catch (e) {}

  // During layout/transform transitions (scene depth + frame inset), the canvas'
  // bounding rect changes continuously. If we cache a single rect through that
  // window, the canvas-space cursor (and trail) will be offset until the
  // transition ends. Keep caching for steady-state perf, but disable caching
  // while relevant transitions are active.
  let rectTransitionActive = 0;
  let rectDynamicUntilMs = 0;
  function markRectDynamicForAWhile(ms = 1200) {
    rectInvalidated = true;
    const now = performance.now();
    rectDynamicUntilMs = Math.max(rectDynamicUntilMs, now + ms);
  }
  function shouldUseDynamicRect() {
    if (rectTransitionActive > 0) return true;
    return performance.now() < rectDynamicUntilMs;
  }

  try {
    window.addEventListener('resize', () => {
      rectInvalidated = true;
    }, { passive: true });
  } catch (e) {}

  // IMPORTANT:
  // The index page applies scene-level transforms on `#abs-scene` (gate depth + click-in impact).
  // Those transforms change the canvas' bounding rect WITHOUT a window resize event.
  // If we cache the rect through a transform transition, the simulation-space mouse (and trail)
  // will drift relative to the viewport-space cursor dot until the next resize.
  //
  // Fix: invalidate cached rect whenever the scene transform transitions, and
  // disable rect caching while the transition is running.
  try {
    const wantsDynamicProp = (p) => {
      // Properties that can affect canvas rect / coordinate mapping.
      // - abs-scene: transform
      // - bravia-balls: top/left/right/bottom/width/height (inset + responsive frame)
      // If propertyName is missing, be conservative and assume it matters.
      if (!p) return true;
      return (
        p === 'transform' ||
        p === 'top' ||
        p === 'left' ||
        p === 'right' ||
        p === 'bottom' ||
        p === 'width' ||
        p === 'height'
      );
    };

    const attachTransitionRectWatcher = (el, dynamicMs) => {
      if (!el || !el.addEventListener) return;

      el.addEventListener('transitionrun', (e) => {
        if (!wantsDynamicProp(e?.propertyName)) return;
        rectTransitionActive++;
        markRectDynamicForAWhile(dynamicMs);
      });

      const onEnd = (e) => {
        if (!wantsDynamicProp(e?.propertyName)) return;
        rectTransitionActive = Math.max(0, rectTransitionActive - 1);
        markRectDynamicForAWhile(120); // ensure we snap to the final rect
      };
      el.addEventListener('transitionend', onEnd);
      el.addEventListener('transitioncancel', onEnd);
    };

    attachTransitionRectWatcher(document.getElementById('abs-scene'), 600);
    // #bravia-balls transitions inset geometry with --duration-resize (600ms default).
    attachTransitionRectWatcher(document.getElementById('bravia-balls'), 1200);
  } catch (e) {}

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
    if (shouldUseDynamicRect()) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * DPR,
        y: (clientY - rect.top) * DPR,
        inBounds: clientX >= rect.left && clientX <= rect.right && 
                  clientY >= rect.top && clientY <= rect.bottom
      };
    }

    if (rectInvalidated || !cachedCanvasRect) {
      cachedCanvasRect = canvas.getBoundingClientRect();
      rectInvalidated = false;
    }
    const rect = cachedCanvasRect;
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
      // Track cursor position for pulse effect
      lastCursorX = clientX;
      lastCursorY = clientY;
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
      el.closest('textarea')
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
      // Track touch position for pulse effect
      if (pressCycleStartX > 0 || pressCycleStartY > 0) {
        lastCursorX = pressCycleStartX;
        lastCursorY = pressCycleStartY;
      }
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
