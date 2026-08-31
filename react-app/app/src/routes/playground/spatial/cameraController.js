import { positiveModulo } from './cameraMath.js';

export const POINTER_CLICK_DRAG_THRESHOLD_PX = 6;
export const TOUCH_CLICK_DRAG_THRESHOLD_PX = 10;

const DEFAULT_MAX_VELOCITY_PX_PER_SECOND = 3600;
const DEFAULT_KEYBOARD_STEP_PX = 96;
const INERTIA_STOP_VELOCITY_PX_PER_SECOND = 4;
const FRAME_DURATION_MS = 1000 / 60;
const CLICK_SUPPRESSION_WINDOW_MS = 700;
const WHEEL_RESPONSE_PER_FRAME = 0.3;
const WHEEL_SETTLE_EPSILON_PX = 0.08;
const DRAG_VELOCITY_RESPONSE = 0.38;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function didPointerTravelExceedThreshold(
  startX,
  startY,
  currentX,
  currentY,
  thresholdPx = POINTER_CLICK_DRAG_THRESHOLD_PX,
) {
  const deltaX = currentX - startX;
  const deltaY = currentY - startY;
  const threshold = Math.max(0, Number(thresholdPx) || 0);
  return ((deltaX * deltaX) + (deltaY * deltaY)) >= threshold * threshold;
}

export function normalizeWheelDelta(delta, deltaMode, viewportSizePx) {
  const value = finite(delta, 0);
  if (deltaMode === 1) return value * 16;
  if (deltaMode === 2) return value * Math.max(1, finite(viewportSizePx, 1));
  return value;
}

function isEditableTarget(target) {
  if (!target || typeof target !== 'object') return false;
  const tagName = String(target.tagName || '').toLowerCase();
  return target.isContentEditable === true
    || tagName === 'input'
    || tagName === 'textarea'
    || tagName === 'select';
}

function defaultShouldStartPointer(event) {
  return !event.target?.closest?.('[data-playground-pan-disabled]');
}

function isPrimaryPanPointer(event) {
  return event.isPrimary !== false
    && (event.pointerType === 'touch' || event.pointerType === 'pen' || event.button === 0);
}

/**
 * Creates one imperative input owner. The `onUpdate` callback receives the same
 * mutable state object every time so the camera hot path does not allocate.
 */
export function createPlaygroundCameraController({
  target,
  keyboardTarget = target,
  initialX = 0,
  initialY = 0,
  worldWidthPx = 1,
  worldHeightPx = 1,
  viewportWidthPx = 1,
  viewportHeightPx = 1,
  viewportCenterX = viewportWidthPx / 2,
  viewportCenterY = viewportHeightPx / 2,
  wheelSensitivity = 0.82,
  dragMomentum = 0.88,
  worldScale = 1,
  maximumVelocityPxPerSecond = DEFAULT_MAX_VELOCITY_PX_PER_SECOND,
  keyboardStepPx = DEFAULT_KEYBOARD_STEP_PX,
  shouldStartPointer = defaultShouldStartPointer,
  onUpdate = () => {},
  onDragStateChange = () => {},
  onClickSuppressed = () => {},
  windowObject = globalThis.window,
  documentObject = globalThis.document,
  reducedMotionQuery = windowObject?.matchMedia?.('(prefers-reduced-motion: reduce)') || null,
} = {}) {
  if (!target?.addEventListener || !target?.removeEventListener) {
    throw new TypeError('A camera event target is required.');
  }
  if (!keyboardTarget?.addEventListener || !keyboardTarget?.removeEventListener) {
    throw new TypeError('A keyboard event target is required.');
  }
  if (!windowObject?.requestAnimationFrame || !windowObject?.cancelAnimationFrame) {
    throw new TypeError('A window-like animation frame owner is required.');
  }
  if (typeof onUpdate !== 'function') throw new TypeError('onUpdate must be a function.');
  if (typeof shouldStartPointer !== 'function') {
    throw new TypeError('shouldStartPointer must be a function.');
  }
  if (typeof onDragStateChange !== 'function' || typeof onClickSuppressed !== 'function') {
    throw new TypeError('Camera interaction callbacks must be functions.');
  }

  let disposed = false;
  let detachObserver = null;
  let enabled = true;
  let paused = false;
  let pointerActive = false;
  let dragging = false;
  let activePointerId = -1;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let lastPointerAt = 0;
  let pointerThreshold = POINTER_CLICK_DRAG_THRESHOLD_PX;
  let frameId = 0;
  let lastFrameAt = 0;
  let dirty = true;
  let inertiaActive = false;
  let wheelActive = false;
  let wheelTargetX = finite(initialX, 0);
  let wheelTargetY = finite(initialY, 0);
  let cameraAnimation = null;
  let suppressClickUntil = 0;
  let resolvedWheelSensitivity = clamp(finite(wheelSensitivity, 0.82), 0, 8);
  let resolvedDragMomentum = clamp(finite(dragMomentum, 0.88), 0, 0.98);
  let resolvedWorldScale = clamp(finite(worldScale, 1), 0.5, 1);
  let resolvedMaximumVelocity = clamp(
    finite(maximumVelocityPxPerSecond, DEFAULT_MAX_VELOCITY_PX_PER_SECOND),
    120,
    12000,
  );
  let resolvedKeyboardStep = clamp(
    finite(keyboardStepPx, DEFAULT_KEYBOARD_STEP_PX),
    8,
    640,
  );
  let reducedMotion = reducedMotionQuery?.matches === true;

  const state = {
    logicalX: finite(initialX, 0),
    logicalY: finite(initialY, 0),
    renderedX: 0,
    renderedY: 0,
    velocityX: 0,
    velocityY: 0,
    worldWidthPx: Math.max(1, finite(worldWidthPx, 1)),
    worldHeightPx: Math.max(1, finite(worldHeightPx, 1)),
    viewportWidthPx: Math.max(1, finite(viewportWidthPx, 1)),
    viewportHeightPx: Math.max(1, finite(viewportHeightPx, 1)),
    viewportCenterX: finite(viewportCenterX, viewportWidthPx / 2),
    viewportCenterY: finite(viewportCenterY, viewportHeightPx / 2),
    dragging: false,
    inertiaActive: false,
    reducedMotion,
    enabled,
    paused,
  };

  function updateProjection() {
    state.renderedX = positiveModulo(state.logicalX, state.worldWidthPx);
    state.renderedY = positiveModulo(state.logicalY, state.worldHeightPx);
    state.velocityX = inertiaActive || pointerActive ? state.velocityX : 0;
    state.velocityY = inertiaActive || pointerActive ? state.velocityY : 0;
    state.dragging = dragging;
    state.inertiaActive = inertiaActive;
    state.reducedMotion = reducedMotion;
    state.enabled = enabled;
    state.paused = paused;
    dirty = false;
    onUpdate(state);
  }

  function cancelFrame() {
    if (frameId) windowObject.cancelAnimationFrame(frameId);
    frameId = 0;
    lastFrameAt = 0;
  }

  function scheduleFrame() {
    if (disposed || paused || frameId) return;
    frameId = windowObject.requestAnimationFrame(handleFrame);
  }

  function stopInertia() {
    inertiaActive = false;
    state.velocityX = 0;
    state.velocityY = 0;
    if (!wheelActive) lastFrameAt = 0;
  }

  function stopWheel() {
    wheelActive = false;
    wheelTargetX = state.logicalX;
    wheelTargetY = state.logicalY;
    if (!inertiaActive) lastFrameAt = 0;
  }

  function cancelCameraAnimation(completed = false) {
    if (!cameraAnimation) return false;
    const resolve = cameraAnimation.resolve;
    cameraAnimation = null;
    resolve(completed);
    return true;
  }

  function handleFrame(timestamp) {
    frameId = 0;
    if (disposed || paused) return;
    if (cameraAnimation) {
      if (cameraAnimation.startedAt == null) cameraAnimation.startedAt = timestamp;
      const elapsed = Math.max(0, timestamp - cameraAnimation.startedAt);
      const progress = clamp(elapsed / cameraAnimation.durationMs, 0, 1);
      const eased = clamp(cameraAnimation.easing(progress), 0, 1);
      state.logicalX = cameraAnimation.startX
        + ((cameraAnimation.targetX - cameraAnimation.startX) * eased);
      state.logicalY = cameraAnimation.startY
        + ((cameraAnimation.targetY - cameraAnimation.startY) * eased);
      if (progress >= 1) {
        state.logicalX = cameraAnimation.targetX;
        state.logicalY = cameraAnimation.targetY;
        cancelCameraAnimation(true);
      }
      dirty = true;
    } else if ((inertiaActive || wheelActive) && !reducedMotion && enabled) {
      const deltaMs = lastFrameAt
        ? clamp(timestamp - lastFrameAt, 1, 50)
        : FRAME_DURATION_MS;
      lastFrameAt = timestamp;
      if (wheelActive) {
        const response = 1 - ((1 - WHEEL_RESPONSE_PER_FRAME) ** (deltaMs / FRAME_DURATION_MS));
        state.logicalX += (wheelTargetX - state.logicalX) * response;
        state.logicalY += (wheelTargetY - state.logicalY) * response;
        if (Math.abs(wheelTargetX - state.logicalX) < WHEEL_SETTLE_EPSILON_PX
          && Math.abs(wheelTargetY - state.logicalY) < WHEEL_SETTLE_EPSILON_PX) {
          state.logicalX = wheelTargetX;
          state.logicalY = wheelTargetY;
          stopWheel();
        }
      } else {
        state.logicalX += state.velocityX * (deltaMs / 1000);
        state.logicalY += state.velocityY * (deltaMs / 1000);
        const damping = resolvedDragMomentum ** (deltaMs / FRAME_DURATION_MS);
        state.velocityX *= damping;
        state.velocityY *= damping;
        if (Math.abs(state.velocityX) < INERTIA_STOP_VELOCITY_PX_PER_SECOND
          && Math.abs(state.velocityY) < INERTIA_STOP_VELOCITY_PX_PER_SECOND) {
          stopInertia();
        }
      }
      dirty = true;
    }
    if (dirty) {
      updateProjection();
    }
    if (cameraAnimation || inertiaActive || wheelActive) scheduleFrame();
  }

  function requestUpdate() {
    if (disposed || paused) return false;
    dirty = true;
    scheduleFrame();
    return true;
  }

  function cancelPointer() {
    if (!pointerActive) return;
    if (activePointerId >= 0 && target.hasPointerCapture?.(activePointerId)) {
      target.releasePointerCapture?.(activePointerId);
    }
    pointerActive = false;
    activePointerId = -1;
    if (dragging) onDragStateChange(false);
    dragging = false;
    stopWheel();
    stopInertia();
    dirty = true;
    scheduleFrame();
  }

  function handlePointerDown(event) {
    if (disposed || !enabled || paused || pointerActive) return;
    if (!isPrimaryPanPointer(event) || !shouldStartPointer(event)) return;
    cancelCameraAnimation(false);
    stopWheel();
    stopInertia();
    pointerActive = true;
    activePointerId = event.pointerId;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    lastPointerAt = event.timeStamp || performance.now();
    pointerThreshold = event.pointerType === 'touch'
      ? TOUCH_CLICK_DRAG_THRESHOLD_PX
      : POINTER_CLICK_DRAG_THRESHOLD_PX;
  }

  function handlePointerMove(event) {
    if (!pointerActive || event.pointerId !== activePointerId || paused || !enabled) return;
    if (!dragging && didPointerTravelExceedThreshold(
      pointerStartX,
      pointerStartY,
      event.clientX,
      event.clientY,
      pointerThreshold,
    )) {
      dragging = true;
      lastPointerX = pointerStartX;
      lastPointerY = pointerStartY;
      lastPointerAt = event.timeStamp || performance.now();
      target.setPointerCapture?.(event.pointerId);
      onDragStateChange(true);
    }
    if (!dragging) return;
    event.preventDefault();
    const now = event.timeStamp || performance.now();
    const deltaX = event.clientX - lastPointerX;
    const deltaY = event.clientY - lastPointerY;
    const deltaMs = clamp(now - lastPointerAt, 1, 64);
    const scaledDeltaX = deltaX / resolvedWorldScale;
    const scaledDeltaY = deltaY / resolvedWorldScale;
    state.logicalX -= scaledDeltaX;
    state.logicalY -= scaledDeltaY;
    const nextVelocityX = clamp(
      (-scaledDeltaX / deltaMs) * 1000,
      -resolvedMaximumVelocity,
      resolvedMaximumVelocity,
    );
    const nextVelocityY = clamp(
      (-scaledDeltaY / deltaMs) * 1000,
      -resolvedMaximumVelocity,
      resolvedMaximumVelocity,
    );
    state.velocityX += (nextVelocityX - state.velocityX) * DRAG_VELOCITY_RESPONSE;
    state.velocityY += (nextVelocityY - state.velocityY) * DRAG_VELOCITY_RESPONSE;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    lastPointerAt = now;
    dirty = true;
    scheduleFrame();
  }

  function finishPointer(event, cancelled) {
    if (!pointerActive || event.pointerId !== activePointerId) return;
    if (target.hasPointerCapture?.(activePointerId)) {
      target.releasePointerCapture?.(activePointerId);
    }
    pointerActive = false;
    activePointerId = -1;
    if (dragging) {
      suppressClickUntil = (event.timeStamp || performance.now()) + CLICK_SUPPRESSION_WINDOW_MS;
      onDragStateChange(false);
      dragging = false;
      inertiaActive = !cancelled
        && !reducedMotion
        && resolvedDragMomentum > 0
        && (Math.abs(state.velocityX) >= INERTIA_STOP_VELOCITY_PX_PER_SECOND
          || Math.abs(state.velocityY) >= INERTIA_STOP_VELOCITY_PX_PER_SECOND);
      if (!inertiaActive) stopInertia();
    } else {
      stopInertia();
    }
    dirty = true;
    scheduleFrame();
  }

  function handlePointerUp(event) {
    finishPointer(event, false);
  }

  function handlePointerCancel(event) {
    finishPointer(event, true);
  }

  function handleClick(event) {
    const now = event.timeStamp || performance.now();
    if (suppressClickUntil <= 0 || now > suppressClickUntil) return;
    suppressClickUntil = 0;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    onClickSuppressed(event);
  }

  function handleWheel(event) {
    if (disposed || !enabled || paused || event.ctrlKey || event.metaKey) return;
    const deltaX = normalizeWheelDelta(event.deltaX, event.deltaMode, state.viewportWidthPx);
    const deltaY = normalizeWheelDelta(event.deltaY, event.deltaMode, state.viewportHeightPx);
    if (deltaX === 0 && deltaY === 0) return;
    event.preventDefault();
    cancelCameraAnimation(false);
    stopInertia();
    if (reducedMotion) {
      stopWheel();
      state.logicalX += (deltaX * resolvedWheelSensitivity) / resolvedWorldScale;
      state.logicalY += (deltaY * resolvedWheelSensitivity) / resolvedWorldScale;
    } else {
      if (!wheelActive) {
        wheelTargetX = state.logicalX;
        wheelTargetY = state.logicalY;
      }
      wheelTargetX += (deltaX * resolvedWheelSensitivity) / resolvedWorldScale;
      wheelTargetY += (deltaY * resolvedWheelSensitivity) / resolvedWorldScale;
      wheelActive = true;
    }
    dirty = true;
    scheduleFrame();
  }

  function handleKeyDown(event) {
    if (disposed || !enabled || paused || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    if (isEditableTarget(event.target)) return;
    const key = String(event.key || '').toLowerCase();
    const step = (resolvedKeyboardStep * (event.shiftKey ? 2 : 1)) / resolvedWorldScale;
    let deltaX = 0;
    let deltaY = 0;
    let handled = true;
    if (key === 'arrowleft' || key === 'a') deltaX = -step;
    else if (key === 'arrowright' || key === 'd') deltaX = step;
    else if (key === 'arrowup' || key === 'w') deltaY = -step;
    else if (key === 'arrowdown' || key === 's') deltaY = step;
    else if (key === 'home') {
      state.logicalX = 0;
      state.logicalY = 0;
    } else handled = false;
    if (!handled) return;
    event.preventDefault();
    cancelCameraAnimation(false);
    stopWheel();
    stopInertia();
    state.logicalX += deltaX;
    state.logicalY += deltaY;
    dirty = true;
    scheduleFrame();
  }

  function handleReducedMotionChange(event) {
    reducedMotion = event.matches === true;
    if (reducedMotion) {
      if (cameraAnimation) {
        state.logicalX = cameraAnimation.targetX;
        state.logicalY = cameraAnimation.targetY;
        cancelCameraAnimation(true);
      }
      stopWheel();
      stopInertia();
    }
    dirty = true;
    scheduleFrame();
  }

  function handleVisibilityChange() {
    const hidden = documentObject?.visibilityState === 'hidden';
    paused = hidden;
    state.paused = paused;
    if (hidden) {
      cancelCameraAnimation(false);
      cancelFrame();
      cancelPointer();
      stopWheel();
      stopInertia();
    } else {
      dirty = true;
      scheduleFrame();
    }
  }

  function handleWindowBlur() {
    cancelCameraAnimation(false);
    cancelPointer();
    stopWheel();
    stopInertia();
    dirty = true;
    scheduleFrame();
  }

  function setCamera(x, y, { immediate = false } = {}) {
    cancelCameraAnimation(false);
    state.logicalX = finite(x, state.logicalX);
    state.logicalY = finite(y, state.logicalY);
    stopWheel();
    stopInertia();
    dirty = true;
    if (immediate && !paused) updateProjection();
    else scheduleFrame();
  }

  function animateTo(x, y, {
    durationMs = 520,
    easing = (progress) => 1 - ((1 - progress) ** 4),
  } = {}) {
    const targetX = finite(x, state.logicalX);
    const targetY = finite(y, state.logicalY);
    const duration = Math.max(0, finite(durationMs, 520));
    if (disposed || paused || !enabled) return Promise.resolve(false);
    cancelCameraAnimation(false);
    stopWheel();
    stopInertia();
    if (reducedMotion || duration === 0
      || (Math.abs(targetX - state.logicalX) < 0.01
        && Math.abs(targetY - state.logicalY) < 0.01)) {
      state.logicalX = targetX;
      state.logicalY = targetY;
      dirty = true;
      updateProjection();
      return Promise.resolve(true);
    }
    const easingFunction = typeof easing === 'function'
      ? easing
      : (progress) => 1 - ((1 - progress) ** 4);
    return new Promise((resolve) => {
      cameraAnimation = {
        startX: state.logicalX,
        startY: state.logicalY,
        targetX,
        targetY,
        durationMs: duration,
        easing: easingFunction,
        startedAt: null,
        resolve,
      };
      dirty = true;
      scheduleFrame();
    });
  }

  function recenter(options) {
    setCamera(0, 0, options);
  }

  function setWorldSize(width, height) {
    const nextWidth = Number(width);
    const nextHeight = Number(height);
    if (!Number.isFinite(nextWidth) || nextWidth <= 0
      || !Number.isFinite(nextHeight) || nextHeight <= 0) {
      throw new RangeError('World dimensions must be finite numbers greater than zero.');
    }
    state.worldWidthPx = nextWidth;
    state.worldHeightPx = nextHeight;
    dirty = true;
    scheduleFrame();
  }

  function resizeViewport(width, height, centerX = width / 2, centerY = height / 2) {
    const nextWidth = Number(width);
    const nextHeight = Number(height);
    const nextCenterX = Number(centerX);
    const nextCenterY = Number(centerY);
    if (![nextWidth, nextHeight, nextCenterX, nextCenterY].every(Number.isFinite)
      || nextWidth <= 0 || nextHeight <= 0) {
      throw new RangeError('Viewport geometry must be finite and have positive dimensions.');
    }
    // logicalX/Y already identify the point beneath the usable centre. Keeping
    // them unchanged preserves that world point when the usable centre moves.
    state.viewportWidthPx = nextWidth;
    state.viewportHeightPx = nextHeight;
    state.viewportCenterX = nextCenterX;
    state.viewportCenterY = nextCenterY;
    dirty = true;
    scheduleFrame();
  }

  function configure(nextOptions = {}) {
    resolvedWheelSensitivity = clamp(
      finite(nextOptions.wheelSensitivity, resolvedWheelSensitivity),
      0,
      8,
    );
    resolvedDragMomentum = clamp(
      finite(nextOptions.dragMomentum, resolvedDragMomentum),
      0,
      0.98,
    );
    resolvedWorldScale = clamp(
      finite(nextOptions.worldScale, resolvedWorldScale),
      0.5,
      1,
    );
    resolvedMaximumVelocity = clamp(
      finite(nextOptions.maximumVelocityPxPerSecond, resolvedMaximumVelocity),
      120,
      12000,
    );
    resolvedKeyboardStep = clamp(
      finite(nextOptions.keyboardStepPx, resolvedKeyboardStep),
      8,
      640,
    );
    if (resolvedDragMomentum === 0) stopInertia();
    dirty = true;
    scheduleFrame();
  }

  function setEnabled(nextEnabled, { preserveAnimation = false } = {}) {
    enabled = nextEnabled !== false;
    state.enabled = enabled;
    if (!enabled) {
      if (!preserveAnimation) cancelCameraAnimation(false);
      cancelPointer();
      stopWheel();
      stopInertia();
    }
    dirty = true;
    scheduleFrame();
  }

  function setPaused(nextPaused) {
    paused = nextPaused === true;
    state.paused = paused;
    if (paused) {
      cancelCameraAnimation(false);
      cancelFrame();
      cancelPointer();
      stopWheel();
      stopInertia();
    } else {
      dirty = true;
      scheduleFrame();
    }
  }

  function getSnapshot() {
    return {
      logicalX: state.logicalX,
      logicalY: state.logicalY,
      renderedX: state.renderedX,
      renderedY: state.renderedY,
      velocityX: state.velocityX,
      velocityY: state.velocityY,
      worldWidthPx: state.worldWidthPx,
      worldHeightPx: state.worldHeightPx,
      worldScale: resolvedWorldScale,
      viewportWidthPx: state.viewportWidthPx,
      viewportHeightPx: state.viewportHeightPx,
      viewportCenterX: state.viewportCenterX,
      viewportCenterY: state.viewportCenterY,
      dragging,
      inertiaActive,
      wheelActive,
      cameraAnimationActive: Boolean(cameraAnimation),
      reducedMotion,
      enabled,
      paused,
      frameScheduled: frameId !== 0,
    };
  }

  function destroy() {
    if (disposed) return;
    disposed = true;
    cancelCameraAnimation(false);
    detachObserver?.disconnect();
    detachObserver = null;
    cancelFrame();
    cancelPointer();
    target.removeEventListener('pointerdown', handlePointerDown);
    target.removeEventListener('pointermove', handlePointerMove);
    target.removeEventListener('pointerup', handlePointerUp);
    target.removeEventListener('pointercancel', handlePointerCancel);
    target.removeEventListener('wheel', handleWheel);
    target.removeEventListener('click', handleClick, true);
    keyboardTarget.removeEventListener('keydown', handleKeyDown);
    windowObject.removeEventListener?.('blur', handleWindowBlur);
    documentObject?.removeEventListener?.('visibilitychange', handleVisibilityChange);
    reducedMotionQuery?.removeEventListener?.('change', handleReducedMotionChange);
  }

  target.addEventListener('pointerdown', handlePointerDown);
  target.addEventListener('pointermove', handlePointerMove, { passive: false });
  target.addEventListener('pointerup', handlePointerUp);
  target.addEventListener('pointercancel', handlePointerCancel);
  target.addEventListener('wheel', handleWheel, { passive: false });
  target.addEventListener('click', handleClick, true);
  keyboardTarget.addEventListener('keydown', handleKeyDown);
  windowObject.addEventListener?.('blur', handleWindowBlur);
  documentObject?.addEventListener?.('visibilitychange', handleVisibilityChange);
  reducedMotionQuery?.addEventListener?.('change', handleReducedMotionChange);
  const DetachObserver = windowObject?.MutationObserver || globalThis.MutationObserver;
  if (target.isConnected === true && typeof DetachObserver === 'function') {
    detachObserver = new DetachObserver(() => {
      if (target.isConnected === false) destroy();
    });
    detachObserver.observe(documentObject.documentElement, {
      childList: true,
      subtree: true,
    });
  }
  updateProjection();

  return Object.freeze({
    setCamera,
    animateTo,
    recenter,
    setWorldSize,
    resizeViewport,
    requestUpdate,
    configure,
    setEnabled,
    setPaused,
    getSnapshot,
    destroy,
  });
}
