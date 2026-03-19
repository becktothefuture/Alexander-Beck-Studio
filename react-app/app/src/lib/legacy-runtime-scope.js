const NATIVE_SET_TIMEOUT_KEY = '__ABS_NATIVE_SET_TIMEOUT__';
const NATIVE_CLEAR_TIMEOUT_KEY = '__ABS_NATIVE_CLEAR_TIMEOUT__';

function ensureNativeTimerRefs() {
  if (typeof window === 'undefined') {
    return {
      nativeSetTimeout: null,
      nativeClearTimeout: null,
    };
  }

  if (typeof window[NATIVE_SET_TIMEOUT_KEY] !== 'function') {
    window[NATIVE_SET_TIMEOUT_KEY] = window.setTimeout.bind(window);
  }

  if (typeof window[NATIVE_CLEAR_TIMEOUT_KEY] !== 'function') {
    window[NATIVE_CLEAR_TIMEOUT_KEY] = window.clearTimeout.bind(window);
  }

  return {
    nativeSetTimeout: window[NATIVE_SET_TIMEOUT_KEY],
    nativeClearTimeout: window[NATIVE_CLEAR_TIMEOUT_KEY],
  };
}

export function setStableTimeout(handler, timeout, ...args) {
  const { nativeSetTimeout } = ensureNativeTimerRefs();
  const schedule = nativeSetTimeout || window.setTimeout.bind(window);
  return schedule(handler, timeout, ...args);
}

export function clearStableTimeout(timeoutId) {
  const { nativeClearTimeout } = ensureNativeTimerRefs();
  const cancel = nativeClearTimeout || window.clearTimeout.bind(window);
  return cancel(timeoutId);
}

function createCancelableSet() {
  return {
    items: new Set(),
    add(id) {
      this.items.add(id);
      return id;
    },
    delete(id) {
      this.items.delete(id);
    },
    clear(cancel) {
      for (const id of this.items) {
        try {
          cancel(id);
        } catch {
          // Ignore individual cleanup failures.
        }
      }
      this.items.clear();
    },
  };
}

export function createLegacyRuntimeScope() {
  const listeners = [];
  const timeouts = createCancelableSet();
  const intervals = createCancelableSet();
  const animationFrames = createCancelableSet();
  const idleCallbacks = createCancelableSet();

  const originalAddEventListener = EventTarget.prototype.addEventListener;
  const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
  const originalSetTimeout = window.setTimeout.bind(window);
  const originalClearTimeout = window.clearTimeout.bind(window);
  const originalSetInterval = window.setInterval.bind(window);
  const originalClearInterval = window.clearInterval.bind(window);
  const originalRequestAnimationFrame = window.requestAnimationFrame?.bind(window) || null;
  const originalCancelAnimationFrame = window.cancelAnimationFrame?.bind(window) || null;
  const originalRequestIdleCallback = window.requestIdleCallback?.bind(window) || null;
  const originalCancelIdleCallback = window.cancelIdleCallback?.bind(window) || null;

  ensureNativeTimerRefs();

  EventTarget.prototype.addEventListener = function patchedAddEventListener(type, listener, options) {
    if (listener) {
      listeners.push([this, type, listener, options]);
    }
    return originalAddEventListener.call(this, type, listener, options);
  };

  EventTarget.prototype.removeEventListener = function patchedRemoveEventListener(type, listener, options) {
    return originalRemoveEventListener.call(this, type, listener, options);
  };

  window.setTimeout = function patchedSetTimeout(handler, timeout, ...args) {
    const id = originalSetTimeout(handler, timeout, ...args);
    return timeouts.add(id);
  };

  window.clearTimeout = function patchedClearTimeout(id) {
    timeouts.delete(id);
    return originalClearTimeout(id);
  };

  window.setInterval = function patchedSetInterval(handler, timeout, ...args) {
    const id = originalSetInterval(handler, timeout, ...args);
    return intervals.add(id);
  };

  window.clearInterval = function patchedClearInterval(id) {
    intervals.delete(id);
    return originalClearInterval(id);
  };

  if (originalRequestAnimationFrame && originalCancelAnimationFrame) {
    window.requestAnimationFrame = function patchedRequestAnimationFrame(callback) {
      const id = originalRequestAnimationFrame(callback);
      return animationFrames.add(id);
    };

    window.cancelAnimationFrame = function patchedCancelAnimationFrame(id) {
      animationFrames.delete(id);
      return originalCancelAnimationFrame(id);
    };
  }

  if (originalRequestIdleCallback && originalCancelIdleCallback) {
    window.requestIdleCallback = function patchedRequestIdleCallback(callback, options) {
      const id = originalRequestIdleCallback(callback, options);
      return idleCallbacks.add(id);
    };

    window.cancelIdleCallback = function patchedCancelIdleCallback(id) {
      idleCallbacks.delete(id);
      return originalCancelIdleCallback(id);
    };
  }

  return {
    cleanup() {
      EventTarget.prototype.addEventListener = originalAddEventListener;
      EventTarget.prototype.removeEventListener = originalRemoveEventListener;
      window.setTimeout = originalSetTimeout;
      window.clearTimeout = originalClearTimeout;
      window.setInterval = originalSetInterval;
      window.clearInterval = originalClearInterval;

      if (originalRequestAnimationFrame && originalCancelAnimationFrame) {
        window.requestAnimationFrame = originalRequestAnimationFrame;
        window.cancelAnimationFrame = originalCancelAnimationFrame;
      }

      if (originalRequestIdleCallback && originalCancelIdleCallback) {
        window.requestIdleCallback = originalRequestIdleCallback;
        window.cancelIdleCallback = originalCancelIdleCallback;
      }

      for (let index = listeners.length - 1; index >= 0; index -= 1) {
        const [target, type, listener, options] = listeners[index];
        try {
          originalRemoveEventListener.call(target, type, listener, options);
        } catch {
          // Ignore listener cleanup failures.
        }
      }

      timeouts.clear(originalClearTimeout);
      intervals.clear(originalClearInterval);

      if (originalCancelAnimationFrame) {
        animationFrames.clear(originalCancelAnimationFrame);
      }

      if (originalCancelIdleCallback) {
        idleCallbacks.clear(originalCancelIdleCallback);
      }
    },
  };
}
