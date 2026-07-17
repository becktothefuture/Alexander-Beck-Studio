// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         MAIN RENDER LOOP (OPTIMIZED)                        ║
// ║              Electron-grade performance with adaptive throttling             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { updatePhysics, render } from "/src/legacy/modules/physics/engine.js";
import { trackFrame } from "/src/legacy/modules/utils/performance.js";
import { getGlobals } from "/src/legacy/modules/core/state.js";
import { isPitLikeMode, MODES } from "/src/legacy/modules/core/constants.js";

// ════════════════════════════════════════════════════════════════════════════════
// PERFORMANCE: Frame timing and throttling state
// ════════════════════════════════════════════════════════════════════════════════
let last = performance.now() / 1000;
let lastFrameTime = 0;
let lastAcceptedFrameTime = 0;
let isPageVisible = true;
let frameId = null;
let frameCounter = 0;
let visibilityListenerBound = false;
let cachedTargetFPS = 60;
// A real 60 Hz display commonly reports frame intervals just below 16.667 ms.
// Without this tolerance, the scheduler can reject every other frame and turn a
// healthy mobile 60 Hz cadence into a visibly sluggish 30 FPS cadence.
const FRAME_INTERVAL_TOLERANCE_MS = 0.75;
/** When true, visibility resume must not restart the loop (SPA left sim route). */
let mainLoopStopped = false;
/** Latest `frame` callback from `startMainLoop` (visibility handler registers only once). */
let runFrameRef = null;

// Adaptive throttling: if we detect sustained low FPS, reduce work
let recentFrameTimes = [];
const FPS_SAMPLE_SIZE = 30;
let adaptiveThrottleLevel = 0; // 0 = none, 1 = light, 2 = heavy
let adaptiveAverageFps = 60;

function clampNumber(value, min, max, fallback) {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  if (next < min) return min;
  if (next > max) return max;
  return next;
}

function getFrameDtCap(globals) {
  if (globals?.currentMode === MODES.PORTFOLIO_PIT) {
    const raw = Number(globals?.portfolioPitConfig?.motion?.maxFrameDt);
    if (Number.isFinite(raw)) return Math.min(0.066, Math.max(0.033, raw));
    return 0.05;
  }
  return 0.033;
}

function isDevRuntime() {
  try {
    if (typeof __DEV__ === 'boolean') return __DEV__;
  } catch (e) {}
  try {
    const port = String(globalThis?.location?.port ?? '');
    if (port === '8001' || port === '8012' || port === '8013') return true;
    const host = String(globalThis?.location?.hostname ?? '');
    return (host === 'localhost' || host === '127.0.0.1') && port !== '';
  } catch (e) {
    return false;
  }
}

function isReducedMotionPreferred() {
  try {
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  } catch (e) {
    return false;
  }
}

function getDeviceTierFpsCap(globals) {
  if (globals?.isMobile || globals?.isMobileViewport) return 60;
  const cores = Number(globalThis?.navigator?.hardwareConcurrency) || 4;
  const memory = Number(globalThis?.navigator?.deviceMemory) || 4;
  if (cores <= 4 || memory <= 4) return 60;
  if (cores <= 8 || memory <= 8) return 90;
  return 120;
}

function resolveTargetFPS(globals) {
  const schedulerEnabled = globals?.featureRenderSchedulerEnabled !== false;
  if (!schedulerEnabled) return 60;

  const desktopTarget = clampNumber(globals?.renderTargetFpsDesktop, 30, 60, 60);
  const mobileTarget = clampNumber(globals?.renderTargetFpsMobile, 30, 60, 60);
  const reducedMotionTarget = clampNumber(globals?.renderTargetFpsReducedMotion, 30, 60, 60);
  const targetFromDevice = (globals?.isMobile || globals?.isMobileViewport) ? mobileTarget : desktopTarget;

  // In production-safe mode, cap by hardware tier unless explicitly in performance mode.
  const tierCap = getDeviceTierFpsCap(globals);
  const enforceSafeCap = !isDevRuntime() && globals?.performanceModeEnabled !== true;
  let target = enforceSafeCap ? Math.min(targetFromDevice, tierCap) : targetFromDevice;

  if (isReducedMotionPreferred()) {
    target = Math.min(target, reducedMotionTarget);
  }

  // Hard safety cap: stale saved settings must never push runtime above 60 FPS.
  return clampNumber(target, 30, 60, 60);
}

/**
 * Reset adaptive throttle state - call when switching modes
 * Prevents stale FPS data from affecting new mode performance
 */
export function resetAdaptiveThrottle() {
  recentFrameTimes = [];
  adaptiveThrottleLevel = 0;
  adaptiveAverageFps = 60;
  frameCounter = 0;
  lastAcceptedFrameTime = 0;
}

function updateAdaptiveThrottle(frameTime, targetFPS) {
  recentFrameTimes.push(frameTime);
  if (recentFrameTimes.length > FPS_SAMPLE_SIZE) {
    recentFrameTimes.shift();
  }
  
  if (recentFrameTimes.length === FPS_SAMPLE_SIZE) {
    const avgFrameTime = recentFrameTimes.reduce((a, b) => a + b, 0) / FPS_SAMPLE_SIZE;
    const avgFPS = 1000 / Math.max(1, avgFrameTime);
    adaptiveAverageFps = avgFPS;

    const balancedThreshold = targetFPS * (57 / 60);
    const heavyThreshold = targetFPS * (50 / 60);
    const balancedRecoveryThreshold = targetFPS * (58 / 60);
    const heavyRecoveryThreshold = targetFPS * (55 / 60);
    let nextThrottleLevel = adaptiveThrottleLevel;

    if (avgFPS < heavyThreshold) {
      nextThrottleLevel = 2;
    } else if (avgFPS < balancedThreshold) {
      nextThrottleLevel = Math.max(nextThrottleLevel, 1);
    } else if (nextThrottleLevel === 2 && avgFPS > heavyRecoveryThreshold) {
      nextThrottleLevel = 1;
    } else if (nextThrottleLevel === 1 && avgFPS > balancedRecoveryThreshold) {
      nextThrottleLevel = 0;
    }

    if (nextThrottleLevel !== adaptiveThrottleLevel) {
      adaptiveThrottleLevel = nextThrottleLevel;
      if (isDevRuntime()) {
        console.log(`⚡ Adaptive throttle changed to level ${adaptiveThrottleLevel} (avg FPS: ${avgFPS.toFixed(1)})`);
      }
    }
  }
}

function getEffectiveAdaptiveThrottleLevel(globals) {
  const raw = Math.max(0, Math.min(2, adaptiveThrottleLevel));
  if (globals?.currentMode !== MODES.PORTFOLIO_PIT || globals?.portfolioPerformancePriority !== true) {
    return raw;
  }

  const summary = globals?.pitPerfSummary;
  const frameP95 = Number(summary?.frameP95Ms);
  const throttleShare = Number(summary?.throttleShare);
  if (!Number.isFinite(frameP95)) return Math.min(raw, 1);
  if (frameP95 <= 12 && (!Number.isFinite(throttleShare) || throttleShare <= 0.12)) return 0;
  if (frameP95 <= 18 && (!Number.isFinite(throttleShare) || throttleShare <= 0.25)) return Math.min(raw, 1);
  return raw;
}

function shouldRunPhysicsThisFrame(globals, throttleLevel) {
  // Pit-like modes must preserve simulation time. Skipping a physics frame here
  // drops that frame's dt entirely, which reads as weak gravity / slow motion.
  if (isPitLikeMode(globals?.currentMode)) return true;
  if (globals?.currentMode === MODES.FLUBBER_BLOB) return true;
  if (throttleLevel <= 0) return true;
  if (throttleLevel === 1) {
    // Light throttle: skip one in four physics steps.
    return (frameCounter % 4) !== 0;
  }
  // Heavy throttle: run every other physics step.
  return (frameCounter % 2) === 0;
}

/**
 * Cancel the physics/render rAF chain. Call when leaving a sim route or before rebinding canvas.
 * Idempotent. Next `startMainLoop` clears this gate.
 */
export function stopMainLoop() {
  mainLoopStopped = true;
  runFrameRef = null;
  if (frameId) {
    cancelAnimationFrame(frameId);
    frameId = null;
  }
}

export function startMainLoop(applyForcesFunc, { getForcesFn } = {}) {
  mainLoopStopped = false;
  if (frameId) {
    cancelAnimationFrame(frameId);
    frameId = null;
  }

  // Cached force applicator - resolved once per frame, not per particle
  let cachedForceFn = null;
  
  // ══════════════════════════════════════════════════════════════════════════════
  // PERFORMANCE: Visibility API - pause when tab is hidden
  // Saves CPU/battery when user isn't looking
  // ══════════════════════════════════════════════════════════════════════════════
  if (!visibilityListenerBound) {
    document.addEventListener('visibilitychange', () => {
      isPageVisible = !document.hidden;
      if (isPageVisible) {
        // Reset timing to prevent huge dt spike when resuming
        last = performance.now() / 1000;
        lastFrameTime = performance.now();
        lastAcceptedFrameTime = 0;
        if (isDevRuntime()) console.log('▶️ Animation resumed');
        if (!frameId && !mainLoopStopped && typeof runFrameRef === 'function') {
          frameId = requestAnimationFrame(runFrameRef);
        }
      } else {
        if (isDevRuntime()) console.log('⏸️ Animation paused (tab hidden)');
        // Cancel the next frame to fully pause
        if (frameId) {
          cancelAnimationFrame(frameId);
          frameId = null;
        }
      }
    }, { passive: true });
    visibilityListenerBound = true;
  }
  
  function frame(nowMs) {
    if (mainLoopStopped) {
      frameId = null;
      return;
    }
    // Skip if page not visible (belt and suspenders with visibility handler)
    if (!isPageVisible) {
      frameId = null;
      return;
    }

    frameCounter++;
    const globals = getGlobals();
    const targetFPS = resolveTargetFPS(globals);
    cachedTargetFPS = targetFPS;
    const minFrameInterval = 1000 / targetFPS;
    
    const elapsed = nowMs - lastFrameTime;
    if (elapsed + FRAME_INTERVAL_TOLERANCE_MS < minFrameInterval) {
      frameId = requestAnimationFrame(frame);
      return;
    }
    // Maintain timing accuracy without drift while allowing dynamic target FPS.
    lastFrameTime = nowMs - (elapsed % minFrameInterval);
    
    // Measure accepted render frames, not the scheduler's drift-corrected gate.
    // Using `elapsed` here makes a healthy 60 Hz loop look artificially slow
    // whenever the gate carries a small remainder into the next rAF callback.
    const acceptedFrameTime = lastAcceptedFrameTime > 0
      ? nowMs - lastAcceptedFrameTime
      : minFrameInterval;
    lastAcceptedFrameTime = nowMs;
    updateAdaptiveThrottle(acceptedFrameTime, targetFPS);
    const effectiveThrottleLevel = getEffectiveAdaptiveThrottleLevel(globals);
    globals.adaptiveThrottleLevel = effectiveThrottleLevel;
    globals.adaptiveAverageFps = adaptiveAverageFps;
    globals.currentTargetFps = targetFPS;
    
    const now = nowMs / 1000;
    let dt = Math.min(getFrameDtCap(globals), now - last);
    last = now;
    
    // PERF: Cache force applicator once per frame (not per particle)
    if (getForcesFn) {
      cachedForceFn = getForcesFn();
    }
    
    // Physics update (deterministic throttling when under sustained pressure)
    // Skip physics entirely while the portfolio drawer is open (bodies are frozen).
    const drawerOpen = globals?.currentMode === MODES.PORTFOLIO_PIT && globals.__portfolioDrawerOpen;
    const runPhysics = !drawerOpen && shouldRunPhysicsThisFrame(globals, effectiveThrottleLevel);
    if (runPhysics) {
      updatePhysics(dt, cachedForceFn ?? applyForcesFunc);
    }
    
    const isPitMode = isPitLikeMode(globals?.currentMode);
    if (globals) {
      globals.__pitFrameThrottled = isPitMode ? !runPhysics : false;
    }

    // Under heavy sustained pressure in Pit mode, skip rendering on frames
    // where physics is already skipped. This reduces paint/composite load.
    const skipRender = isPitMode && !runPhysics && effectiveThrottleLevel >= 2;
    if (!skipRender) {
      render();
    }
    
    // FPS tracking
    trackFrame(performance.now(), {
      targetFPS,
      throttleLevel: effectiveThrottleLevel,
      throttled: !runPhysics,
      rendered: !skipRender
    });
    
    frameId = requestAnimationFrame(frame);
  }

  runFrameRef = frame;
  lastAcceptedFrameTime = 0;
  frameId = requestAnimationFrame(frame);
  if (isDevRuntime()) {
    console.log('✓ Render loop started (adaptive target FPS, visibility-aware)');
  }
}

/**
 * Get current performance status
 */
export function getPerformanceStatus() {
  const avgFrameTime = recentFrameTimes.length > 0 
    ? recentFrameTimes.reduce((a, b) => a + b, 0) / recentFrameTimes.length 
    : 16.67;
  
  return {
    isPageVisible,
    adaptiveThrottleLevel,
    avgFPS: Math.round(1000 / Math.max(1, avgFrameTime)),
    avgFrameMs: avgFrameTime,
    targetFPS: cachedTargetFPS,
    throttled: adaptiveThrottleLevel > 0
  };
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxvb3AuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8g4pWU4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWXXG4vLyDilZEgICAgICAgICAgICAgICAgICAgICAgICAgTUFJTiBSRU5ERVIgTE9PUCAoT1BUSU1JWkVEKSAgICAgICAgICAgICAgICAgICAgICAgIOKVkVxuLy8g4pWRICAgICAgICAgICAgICBFbGVjdHJvbi1ncmFkZSBwZXJmb3JtYW5jZSB3aXRoIGFkYXB0aXZlIHRocm90dGxpbmcgICAgICAgICAgICAg4pWRXG4vLyDilZrilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZ1cblxuaW1wb3J0IHsgdXBkYXRlUGh5c2ljcywgcmVuZGVyIH0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvcGh5c2ljcy9lbmdpbmUuanNcIjtcbmltcG9ydCB7IHRyYWNrRnJhbWUgfSBmcm9tIFwiL3NyYy9sZWdhY3kvbW9kdWxlcy91dGlscy9wZXJmb3JtYW5jZS5qc1wiO1xuaW1wb3J0IHsgZ2V0R2xvYmFscyB9IGZyb20gXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL2NvcmUvc3RhdGUuanNcIjtcbmltcG9ydCB7IGlzUGl0TGlrZU1vZGUsIE1PREVTIH0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvY29yZS9jb25zdGFudHMuanNcIjtcblxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4vLyBQRVJGT1JNQU5DRTogRnJhbWUgdGltaW5nIGFuZCB0aHJvdHRsaW5nIHN0YXRlXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbmxldCBsYXN0ID0gcGVyZm9ybWFuY2Uubm93KCkgLyAxMDAwO1xubGV0IGxhc3RGcmFtZVRpbWUgPSAwO1xubGV0IGxhc3RBY2NlcHRlZEZyYW1lVGltZSA9IDA7XG5sZXQgaXNQYWdlVmlzaWJsZSA9IHRydWU7XG5sZXQgZnJhbWVJZCA9IG51bGw7XG5sZXQgZnJhbWVDb3VudGVyID0gMDtcbmxldCB2aXNpYmlsaXR5TGlzdGVuZXJCb3VuZCA9IGZhbHNlO1xubGV0IGNhY2hlZFRhcmdldEZQUyA9IDYwO1xuLy8gQSByZWFsIDYwIEh6IGRpc3BsYXkgY29tbW9ubHkgcmVwb3J0cyBmcmFtZSBpbnRlcnZhbHMganVzdCBiZWxvdyAxNi42NjcgbXMuXG4vLyBXaXRob3V0IHRoaXMgdG9sZXJhbmNlLCB0aGUgc2NoZWR1bGVyIGNhbiByZWplY3QgZXZlcnkgb3RoZXIgZnJhbWUgYW5kIHR1cm4gYVxuLy8gaGVhbHRoeSBtb2JpbGUgNjAgSHogY2FkZW5jZSBpbnRvIGEgdmlzaWJseSBzbHVnZ2lzaCAzMCBGUFMgY2FkZW5jZS5cbmNvbnN0IEZSQU1FX0lOVEVSVkFMX1RPTEVSQU5DRV9NUyA9IDAuNzU7XG4vKiogV2hlbiB0cnVlLCB2aXNpYmlsaXR5IHJlc3VtZSBtdXN0IG5vdCByZXN0YXJ0IHRoZSBsb29wIChTUEEgbGVmdCBzaW0gcm91dGUpLiAqL1xubGV0IG1haW5Mb29wU3RvcHBlZCA9IGZhbHNlO1xuLyoqIExhdGVzdCBgZnJhbWVgIGNhbGxiYWNrIGZyb20gYHN0YXJ0TWFpbkxvb3BgICh2aXNpYmlsaXR5IGhhbmRsZXIgcmVnaXN0ZXJzIG9ubHkgb25jZSkuICovXG5sZXQgcnVuRnJhbWVSZWYgPSBudWxsO1xuXG4vLyBBZGFwdGl2ZSB0aHJvdHRsaW5nOiBpZiB3ZSBkZXRlY3Qgc3VzdGFpbmVkIGxvdyBGUFMsIHJlZHVjZSB3b3JrXG5sZXQgcmVjZW50RnJhbWVUaW1lcyA9IFtdO1xuY29uc3QgRlBTX1NBTVBMRV9TSVpFID0gMzA7XG5sZXQgYWRhcHRpdmVUaHJvdHRsZUxldmVsID0gMDsgLy8gMCA9IG5vbmUsIDEgPSBsaWdodCwgMiA9IGhlYXZ5XG5sZXQgYWRhcHRpdmVBdmVyYWdlRnBzID0gNjA7XG5cbmZ1bmN0aW9uIGNsYW1wTnVtYmVyKHZhbHVlLCBtaW4sIG1heCwgZmFsbGJhY2spIHtcbiAgY29uc3QgbmV4dCA9IE51bWJlcih2YWx1ZSk7XG4gIGlmICghTnVtYmVyLmlzRmluaXRlKG5leHQpKSByZXR1cm4gZmFsbGJhY2s7XG4gIGlmIChuZXh0IDwgbWluKSByZXR1cm4gbWluO1xuICBpZiAobmV4dCA+IG1heCkgcmV0dXJuIG1heDtcbiAgcmV0dXJuIG5leHQ7XG59XG5cbmZ1bmN0aW9uIGdldEZyYW1lRHRDYXAoZ2xvYmFscykge1xuICBpZiAoZ2xvYmFscz8uY3VycmVudE1vZGUgPT09IE1PREVTLlBPUlRGT0xJT19QSVQpIHtcbiAgICBjb25zdCByYXcgPSBOdW1iZXIoZ2xvYmFscz8ucG9ydGZvbGlvUGl0Q29uZmlnPy5tb3Rpb24/Lm1heEZyYW1lRHQpO1xuICAgIGlmIChOdW1iZXIuaXNGaW5pdGUocmF3KSkgcmV0dXJuIE1hdGgubWluKDAuMDY2LCBNYXRoLm1heCgwLjAzMywgcmF3KSk7XG4gICAgcmV0dXJuIDAuMDU7XG4gIH1cbiAgcmV0dXJuIDAuMDMzO1xufVxuXG5mdW5jdGlvbiBpc0RldlJ1bnRpbWUoKSB7XG4gIHRyeSB7XG4gICAgaWYgKHR5cGVvZiBfX0RFVl9fID09PSAnYm9vbGVhbicpIHJldHVybiBfX0RFVl9fO1xuICB9IGNhdGNoIChlKSB7fVxuICB0cnkge1xuICAgIGNvbnN0IHBvcnQgPSBTdHJpbmcoZ2xvYmFsVGhpcz8ubG9jYXRpb24/LnBvcnQgPz8gJycpO1xuICAgIGlmIChwb3J0ID09PSAnODAwMScgfHwgcG9ydCA9PT0gJzgwMTInIHx8IHBvcnQgPT09ICc4MDEzJykgcmV0dXJuIHRydWU7XG4gICAgY29uc3QgaG9zdCA9IFN0cmluZyhnbG9iYWxUaGlzPy5sb2NhdGlvbj8uaG9zdG5hbWUgPz8gJycpO1xuICAgIHJldHVybiAoaG9zdCA9PT0gJ2xvY2FsaG9zdCcgfHwgaG9zdCA9PT0gJzEyNy4wLjAuMScpICYmIHBvcnQgIT09ICcnO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzUmVkdWNlZE1vdGlvblByZWZlcnJlZCgpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gQm9vbGVhbih3aW5kb3cubWF0Y2hNZWRpYT8uKCcocHJlZmVycy1yZWR1Y2VkLW1vdGlvbjogcmVkdWNlKScpPy5tYXRjaGVzKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXREZXZpY2VUaWVyRnBzQ2FwKGdsb2JhbHMpIHtcbiAgaWYgKGdsb2JhbHM/LmlzTW9iaWxlIHx8IGdsb2JhbHM/LmlzTW9iaWxlVmlld3BvcnQpIHJldHVybiA2MDtcbiAgY29uc3QgY29yZXMgPSBOdW1iZXIoZ2xvYmFsVGhpcz8ubmF2aWdhdG9yPy5oYXJkd2FyZUNvbmN1cnJlbmN5KSB8fCA0O1xuICBjb25zdCBtZW1vcnkgPSBOdW1iZXIoZ2xvYmFsVGhpcz8ubmF2aWdhdG9yPy5kZXZpY2VNZW1vcnkpIHx8IDQ7XG4gIGlmIChjb3JlcyA8PSA0IHx8IG1lbW9yeSA8PSA0KSByZXR1cm4gNjA7XG4gIGlmIChjb3JlcyA8PSA4IHx8IG1lbW9yeSA8PSA4KSByZXR1cm4gOTA7XG4gIHJldHVybiAxMjA7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVUYXJnZXRGUFMoZ2xvYmFscykge1xuICBjb25zdCBzY2hlZHVsZXJFbmFibGVkID0gZ2xvYmFscz8uZmVhdHVyZVJlbmRlclNjaGVkdWxlckVuYWJsZWQgIT09IGZhbHNlO1xuICBpZiAoIXNjaGVkdWxlckVuYWJsZWQpIHJldHVybiA2MDtcblxuICBjb25zdCBkZXNrdG9wVGFyZ2V0ID0gY2xhbXBOdW1iZXIoZ2xvYmFscz8ucmVuZGVyVGFyZ2V0RnBzRGVza3RvcCwgMzAsIDYwLCA2MCk7XG4gIGNvbnN0IG1vYmlsZVRhcmdldCA9IGNsYW1wTnVtYmVyKGdsb2JhbHM/LnJlbmRlclRhcmdldEZwc01vYmlsZSwgMzAsIDYwLCA2MCk7XG4gIGNvbnN0IHJlZHVjZWRNb3Rpb25UYXJnZXQgPSBjbGFtcE51bWJlcihnbG9iYWxzPy5yZW5kZXJUYXJnZXRGcHNSZWR1Y2VkTW90aW9uLCAzMCwgNjAsIDYwKTtcbiAgY29uc3QgdGFyZ2V0RnJvbURldmljZSA9IChnbG9iYWxzPy5pc01vYmlsZSB8fCBnbG9iYWxzPy5pc01vYmlsZVZpZXdwb3J0KSA/IG1vYmlsZVRhcmdldCA6IGRlc2t0b3BUYXJnZXQ7XG5cbiAgLy8gSW4gcHJvZHVjdGlvbi1zYWZlIG1vZGUsIGNhcCBieSBoYXJkd2FyZSB0aWVyIHVubGVzcyBleHBsaWNpdGx5IGluIHBlcmZvcm1hbmNlIG1vZGUuXG4gIGNvbnN0IHRpZXJDYXAgPSBnZXREZXZpY2VUaWVyRnBzQ2FwKGdsb2JhbHMpO1xuICBjb25zdCBlbmZvcmNlU2FmZUNhcCA9ICFpc0RldlJ1bnRpbWUoKSAmJiBnbG9iYWxzPy5wZXJmb3JtYW5jZU1vZGVFbmFibGVkICE9PSB0cnVlO1xuICBsZXQgdGFyZ2V0ID0gZW5mb3JjZVNhZmVDYXAgPyBNYXRoLm1pbih0YXJnZXRGcm9tRGV2aWNlLCB0aWVyQ2FwKSA6IHRhcmdldEZyb21EZXZpY2U7XG5cbiAgaWYgKGlzUmVkdWNlZE1vdGlvblByZWZlcnJlZCgpKSB7XG4gICAgdGFyZ2V0ID0gTWF0aC5taW4odGFyZ2V0LCByZWR1Y2VkTW90aW9uVGFyZ2V0KTtcbiAgfVxuXG4gIC8vIEhhcmQgc2FmZXR5IGNhcDogc3RhbGUgc2F2ZWQgc2V0dGluZ3MgbXVzdCBuZXZlciBwdXNoIHJ1bnRpbWUgYWJvdmUgNjAgRlBTLlxuICByZXR1cm4gY2xhbXBOdW1iZXIodGFyZ2V0LCAzMCwgNjAsIDYwKTtcbn1cblxuLyoqXG4gKiBSZXNldCBhZGFwdGl2ZSB0aHJvdHRsZSBzdGF0ZSAtIGNhbGwgd2hlbiBzd2l0Y2hpbmcgbW9kZXNcbiAqIFByZXZlbnRzIHN0YWxlIEZQUyBkYXRhIGZyb20gYWZmZWN0aW5nIG5ldyBtb2RlIHBlcmZvcm1hbmNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNldEFkYXB0aXZlVGhyb3R0bGUoKSB7XG4gIHJlY2VudEZyYW1lVGltZXMgPSBbXTtcbiAgYWRhcHRpdmVUaHJvdHRsZUxldmVsID0gMDtcbiAgYWRhcHRpdmVBdmVyYWdlRnBzID0gNjA7XG4gIGZyYW1lQ291bnRlciA9IDA7XG4gIGxhc3RBY2NlcHRlZEZyYW1lVGltZSA9IDA7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUFkYXB0aXZlVGhyb3R0bGUoZnJhbWVUaW1lLCB0YXJnZXRGUFMpIHtcbiAgcmVjZW50RnJhbWVUaW1lcy5wdXNoKGZyYW1lVGltZSk7XG4gIGlmIChyZWNlbnRGcmFtZVRpbWVzLmxlbmd0aCA+IEZQU19TQU1QTEVfU0laRSkge1xuICAgIHJlY2VudEZyYW1lVGltZXMuc2hpZnQoKTtcbiAgfVxuICBcbiAgaWYgKHJlY2VudEZyYW1lVGltZXMubGVuZ3RoID09PSBGUFNfU0FNUExFX1NJWkUpIHtcbiAgICBjb25zdCBhdmdGcmFtZVRpbWUgPSByZWNlbnRGcmFtZVRpbWVzLnJlZHVjZSgoYSwgYikgPT4gYSArIGIsIDApIC8gRlBTX1NBTVBMRV9TSVpFO1xuICAgIGNvbnN0IGF2Z0ZQUyA9IDEwMDAgLyBNYXRoLm1heCgxLCBhdmdGcmFtZVRpbWUpO1xuICAgIGFkYXB0aXZlQXZlcmFnZUZwcyA9IGF2Z0ZQUztcblxuICAgIGNvbnN0IGJhbGFuY2VkVGhyZXNob2xkID0gdGFyZ2V0RlBTICogKDU3IC8gNjApO1xuICAgIGNvbnN0IGhlYXZ5VGhyZXNob2xkID0gdGFyZ2V0RlBTICogKDUwIC8gNjApO1xuICAgIGNvbnN0IGJhbGFuY2VkUmVjb3ZlcnlUaHJlc2hvbGQgPSB0YXJnZXRGUFMgKiAoNTggLyA2MCk7XG4gICAgY29uc3QgaGVhdnlSZWNvdmVyeVRocmVzaG9sZCA9IHRhcmdldEZQUyAqICg1NSAvIDYwKTtcbiAgICBsZXQgbmV4dFRocm90dGxlTGV2ZWwgPSBhZGFwdGl2ZVRocm90dGxlTGV2ZWw7XG5cbiAgICBpZiAoYXZnRlBTIDwgaGVhdnlUaHJlc2hvbGQpIHtcbiAgICAgIG5leHRUaHJvdHRsZUxldmVsID0gMjtcbiAgICB9IGVsc2UgaWYgKGF2Z0ZQUyA8IGJhbGFuY2VkVGhyZXNob2xkKSB7XG4gICAgICBuZXh0VGhyb3R0bGVMZXZlbCA9IE1hdGgubWF4KG5leHRUaHJvdHRsZUxldmVsLCAxKTtcbiAgICB9IGVsc2UgaWYgKG5leHRUaHJvdHRsZUxldmVsID09PSAyICYmIGF2Z0ZQUyA+IGhlYXZ5UmVjb3ZlcnlUaHJlc2hvbGQpIHtcbiAgICAgIG5leHRUaHJvdHRsZUxldmVsID0gMTtcbiAgICB9IGVsc2UgaWYgKG5leHRUaHJvdHRsZUxldmVsID09PSAxICYmIGF2Z0ZQUyA+IGJhbGFuY2VkUmVjb3ZlcnlUaHJlc2hvbGQpIHtcbiAgICAgIG5leHRUaHJvdHRsZUxldmVsID0gMDtcbiAgICB9XG5cbiAgICBpZiAobmV4dFRocm90dGxlTGV2ZWwgIT09IGFkYXB0aXZlVGhyb3R0bGVMZXZlbCkge1xuICAgICAgYWRhcHRpdmVUaHJvdHRsZUxldmVsID0gbmV4dFRocm90dGxlTGV2ZWw7XG4gICAgICBpZiAoaXNEZXZSdW50aW1lKCkpIHtcbiAgICAgICAgY29uc29sZS5sb2coYOKaoSBBZGFwdGl2ZSB0aHJvdHRsZSBjaGFuZ2VkIHRvIGxldmVsICR7YWRhcHRpdmVUaHJvdHRsZUxldmVsfSAoYXZnIEZQUzogJHthdmdGUFMudG9GaXhlZCgxKX0pYCk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGdldEVmZmVjdGl2ZUFkYXB0aXZlVGhyb3R0bGVMZXZlbChnbG9iYWxzKSB7XG4gIGNvbnN0IHJhdyA9IE1hdGgubWF4KDAsIE1hdGgubWluKDIsIGFkYXB0aXZlVGhyb3R0bGVMZXZlbCkpO1xuICBpZiAoZ2xvYmFscz8uY3VycmVudE1vZGUgIT09IE1PREVTLlBPUlRGT0xJT19QSVQgfHwgZ2xvYmFscz8ucG9ydGZvbGlvUGVyZm9ybWFuY2VQcmlvcml0eSAhPT0gdHJ1ZSkge1xuICAgIHJldHVybiByYXc7XG4gIH1cblxuICBjb25zdCBzdW1tYXJ5ID0gZ2xvYmFscz8ucGl0UGVyZlN1bW1hcnk7XG4gIGNvbnN0IGZyYW1lUDk1ID0gTnVtYmVyKHN1bW1hcnk/LmZyYW1lUDk1TXMpO1xuICBjb25zdCB0aHJvdHRsZVNoYXJlID0gTnVtYmVyKHN1bW1hcnk/LnRocm90dGxlU2hhcmUpO1xuICBpZiAoIU51bWJlci5pc0Zpbml0ZShmcmFtZVA5NSkpIHJldHVybiBNYXRoLm1pbihyYXcsIDEpO1xuICBpZiAoZnJhbWVQOTUgPD0gMTIgJiYgKCFOdW1iZXIuaXNGaW5pdGUodGhyb3R0bGVTaGFyZSkgfHwgdGhyb3R0bGVTaGFyZSA8PSAwLjEyKSkgcmV0dXJuIDA7XG4gIGlmIChmcmFtZVA5NSA8PSAxOCAmJiAoIU51bWJlci5pc0Zpbml0ZSh0aHJvdHRsZVNoYXJlKSB8fCB0aHJvdHRsZVNoYXJlIDw9IDAuMjUpKSByZXR1cm4gTWF0aC5taW4ocmF3LCAxKTtcbiAgcmV0dXJuIHJhdztcbn1cblxuZnVuY3Rpb24gc2hvdWxkUnVuUGh5c2ljc1RoaXNGcmFtZShnbG9iYWxzLCB0aHJvdHRsZUxldmVsKSB7XG4gIC8vIFBpdC1saWtlIG1vZGVzIG11c3QgcHJlc2VydmUgc2ltdWxhdGlvbiB0aW1lLiBTa2lwcGluZyBhIHBoeXNpY3MgZnJhbWUgaGVyZVxuICAvLyBkcm9wcyB0aGF0IGZyYW1lJ3MgZHQgZW50aXJlbHksIHdoaWNoIHJlYWRzIGFzIHdlYWsgZ3Jhdml0eSAvIHNsb3cgbW90aW9uLlxuICBpZiAoaXNQaXRMaWtlTW9kZShnbG9iYWxzPy5jdXJyZW50TW9kZSkpIHJldHVybiB0cnVlO1xuICBpZiAoZ2xvYmFscz8uY3VycmVudE1vZGUgPT09IE1PREVTLkZMVUJCRVJfQkxPQikgcmV0dXJuIHRydWU7XG4gIGlmICh0aHJvdHRsZUxldmVsIDw9IDApIHJldHVybiB0cnVlO1xuICBpZiAodGhyb3R0bGVMZXZlbCA9PT0gMSkge1xuICAgIC8vIExpZ2h0IHRocm90dGxlOiBza2lwIG9uZSBpbiBmb3VyIHBoeXNpY3Mgc3RlcHMuXG4gICAgcmV0dXJuIChmcmFtZUNvdW50ZXIgJSA0KSAhPT0gMDtcbiAgfVxuICAvLyBIZWF2eSB0aHJvdHRsZTogcnVuIGV2ZXJ5IG90aGVyIHBoeXNpY3Mgc3RlcC5cbiAgcmV0dXJuIChmcmFtZUNvdW50ZXIgJSAyKSA9PT0gMDtcbn1cblxuLyoqXG4gKiBDYW5jZWwgdGhlIHBoeXNpY3MvcmVuZGVyIHJBRiBjaGFpbi4gQ2FsbCB3aGVuIGxlYXZpbmcgYSBzaW0gcm91dGUgb3IgYmVmb3JlIHJlYmluZGluZyBjYW52YXMuXG4gKiBJZGVtcG90ZW50LiBOZXh0IGBzdGFydE1haW5Mb29wYCBjbGVhcnMgdGhpcyBnYXRlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RvcE1haW5Mb29wKCkge1xuICBtYWluTG9vcFN0b3BwZWQgPSB0cnVlO1xuICBydW5GcmFtZVJlZiA9IG51bGw7XG4gIGlmIChmcmFtZUlkKSB7XG4gICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUoZnJhbWVJZCk7XG4gICAgZnJhbWVJZCA9IG51bGw7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0TWFpbkxvb3AoYXBwbHlGb3JjZXNGdW5jLCB7IGdldEZvcmNlc0ZuIH0gPSB7fSkge1xuICBtYWluTG9vcFN0b3BwZWQgPSBmYWxzZTtcbiAgaWYgKGZyYW1lSWQpIHtcbiAgICBjYW5jZWxBbmltYXRpb25GcmFtZShmcmFtZUlkKTtcbiAgICBmcmFtZUlkID0gbnVsbDtcbiAgfVxuXG4gIC8vIENhY2hlZCBmb3JjZSBhcHBsaWNhdG9yIC0gcmVzb2x2ZWQgb25jZSBwZXIgZnJhbWUsIG5vdCBwZXIgcGFydGljbGVcbiAgbGV0IGNhY2hlZEZvcmNlRm4gPSBudWxsO1xuICBcbiAgLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4gIC8vIFBFUkZPUk1BTkNFOiBWaXNpYmlsaXR5IEFQSSAtIHBhdXNlIHdoZW4gdGFiIGlzIGhpZGRlblxuICAvLyBTYXZlcyBDUFUvYmF0dGVyeSB3aGVuIHVzZXIgaXNuJ3QgbG9va2luZ1xuICAvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbiAgaWYgKCF2aXNpYmlsaXR5TGlzdGVuZXJCb3VuZCkge1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHljaGFuZ2UnLCAoKSA9PiB7XG4gICAgICBpc1BhZ2VWaXNpYmxlID0gIWRvY3VtZW50LmhpZGRlbjtcbiAgICAgIGlmIChpc1BhZ2VWaXNpYmxlKSB7XG4gICAgICAgIC8vIFJlc2V0IHRpbWluZyB0byBwcmV2ZW50IGh1Z2UgZHQgc3Bpa2Ugd2hlbiByZXN1bWluZ1xuICAgICAgICBsYXN0ID0gcGVyZm9ybWFuY2Uubm93KCkgLyAxMDAwO1xuICAgICAgICBsYXN0RnJhbWVUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgICAgIGxhc3RBY2NlcHRlZEZyYW1lVGltZSA9IDA7XG4gICAgICAgIGlmIChpc0RldlJ1bnRpbWUoKSkgY29uc29sZS5sb2coJ+KWtu+4jyBBbmltYXRpb24gcmVzdW1lZCcpO1xuICAgICAgICBpZiAoIWZyYW1lSWQgJiYgIW1haW5Mb29wU3RvcHBlZCAmJiB0eXBlb2YgcnVuRnJhbWVSZWYgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBmcmFtZUlkID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJ1bkZyYW1lUmVmKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGlzRGV2UnVudGltZSgpKSBjb25zb2xlLmxvZygn4o+477iPIEFuaW1hdGlvbiBwYXVzZWQgKHRhYiBoaWRkZW4pJyk7XG4gICAgICAgIC8vIENhbmNlbCB0aGUgbmV4dCBmcmFtZSB0byBmdWxseSBwYXVzZVxuICAgICAgICBpZiAoZnJhbWVJZCkge1xuICAgICAgICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKGZyYW1lSWQpO1xuICAgICAgICAgIGZyYW1lSWQgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSwgeyBwYXNzaXZlOiB0cnVlIH0pO1xuICAgIHZpc2liaWxpdHlMaXN0ZW5lckJvdW5kID0gdHJ1ZTtcbiAgfVxuICBcbiAgZnVuY3Rpb24gZnJhbWUobm93TXMpIHtcbiAgICBpZiAobWFpbkxvb3BTdG9wcGVkKSB7XG4gICAgICBmcmFtZUlkID0gbnVsbDtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gU2tpcCBpZiBwYWdlIG5vdCB2aXNpYmxlIChiZWx0IGFuZCBzdXNwZW5kZXJzIHdpdGggdmlzaWJpbGl0eSBoYW5kbGVyKVxuICAgIGlmICghaXNQYWdlVmlzaWJsZSkge1xuICAgICAgZnJhbWVJZCA9IG51bGw7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZnJhbWVDb3VudGVyKys7XG4gICAgY29uc3QgZ2xvYmFscyA9IGdldEdsb2JhbHMoKTtcbiAgICBjb25zdCB0YXJnZXRGUFMgPSByZXNvbHZlVGFyZ2V0RlBTKGdsb2JhbHMpO1xuICAgIGNhY2hlZFRhcmdldEZQUyA9IHRhcmdldEZQUztcbiAgICBjb25zdCBtaW5GcmFtZUludGVydmFsID0gMTAwMCAvIHRhcmdldEZQUztcbiAgICBcbiAgICBjb25zdCBlbGFwc2VkID0gbm93TXMgLSBsYXN0RnJhbWVUaW1lO1xuICAgIGlmIChlbGFwc2VkICsgRlJBTUVfSU5URVJWQUxfVE9MRVJBTkNFX01TIDwgbWluRnJhbWVJbnRlcnZhbCkge1xuICAgICAgZnJhbWVJZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZShmcmFtZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIE1haW50YWluIHRpbWluZyBhY2N1cmFjeSB3aXRob3V0IGRyaWZ0IHdoaWxlIGFsbG93aW5nIGR5bmFtaWMgdGFyZ2V0IEZQUy5cbiAgICBsYXN0RnJhbWVUaW1lID0gbm93TXMgLSAoZWxhcHNlZCAlIG1pbkZyYW1lSW50ZXJ2YWwpO1xuICAgIFxuICAgIC8vIE1lYXN1cmUgYWNjZXB0ZWQgcmVuZGVyIGZyYW1lcywgbm90IHRoZSBzY2hlZHVsZXIncyBkcmlmdC1jb3JyZWN0ZWQgZ2F0ZS5cbiAgICAvLyBVc2luZyBgZWxhcHNlZGAgaGVyZSBtYWtlcyBhIGhlYWx0aHkgNjAgSHogbG9vcCBsb29rIGFydGlmaWNpYWxseSBzbG93XG4gICAgLy8gd2hlbmV2ZXIgdGhlIGdhdGUgY2FycmllcyBhIHNtYWxsIHJlbWFpbmRlciBpbnRvIHRoZSBuZXh0IHJBRiBjYWxsYmFjay5cbiAgICBjb25zdCBhY2NlcHRlZEZyYW1lVGltZSA9IGxhc3RBY2NlcHRlZEZyYW1lVGltZSA+IDBcbiAgICAgID8gbm93TXMgLSBsYXN0QWNjZXB0ZWRGcmFtZVRpbWVcbiAgICAgIDogbWluRnJhbWVJbnRlcnZhbDtcbiAgICBsYXN0QWNjZXB0ZWRGcmFtZVRpbWUgPSBub3dNcztcbiAgICB1cGRhdGVBZGFwdGl2ZVRocm90dGxlKGFjY2VwdGVkRnJhbWVUaW1lLCB0YXJnZXRGUFMpO1xuICAgIGNvbnN0IGVmZmVjdGl2ZVRocm90dGxlTGV2ZWwgPSBnZXRFZmZlY3RpdmVBZGFwdGl2ZVRocm90dGxlTGV2ZWwoZ2xvYmFscyk7XG4gICAgZ2xvYmFscy5hZGFwdGl2ZVRocm90dGxlTGV2ZWwgPSBlZmZlY3RpdmVUaHJvdHRsZUxldmVsO1xuICAgIGdsb2JhbHMuYWRhcHRpdmVBdmVyYWdlRnBzID0gYWRhcHRpdmVBdmVyYWdlRnBzO1xuICAgIGdsb2JhbHMuY3VycmVudFRhcmdldEZwcyA9IHRhcmdldEZQUztcbiAgICBcbiAgICBjb25zdCBub3cgPSBub3dNcyAvIDEwMDA7XG4gICAgbGV0IGR0ID0gTWF0aC5taW4oZ2V0RnJhbWVEdENhcChnbG9iYWxzKSwgbm93IC0gbGFzdCk7XG4gICAgbGFzdCA9IG5vdztcbiAgICBcbiAgICAvLyBQRVJGOiBDYWNoZSBmb3JjZSBhcHBsaWNhdG9yIG9uY2UgcGVyIGZyYW1lIChub3QgcGVyIHBhcnRpY2xlKVxuICAgIGlmIChnZXRGb3JjZXNGbikge1xuICAgICAgY2FjaGVkRm9yY2VGbiA9IGdldEZvcmNlc0ZuKCk7XG4gICAgfVxuICAgIFxuICAgIC8vIFBoeXNpY3MgdXBkYXRlIChkZXRlcm1pbmlzdGljIHRocm90dGxpbmcgd2hlbiB1bmRlciBzdXN0YWluZWQgcHJlc3N1cmUpXG4gICAgLy8gU2tpcCBwaHlzaWNzIGVudGlyZWx5IHdoaWxlIHRoZSBwb3J0Zm9saW8gZHJhd2VyIGlzIG9wZW4gKGJvZGllcyBhcmUgZnJvemVuKS5cbiAgICBjb25zdCBkcmF3ZXJPcGVuID0gZ2xvYmFscz8uY3VycmVudE1vZGUgPT09IE1PREVTLlBPUlRGT0xJT19QSVQgJiYgZ2xvYmFscy5fX3BvcnRmb2xpb0RyYXdlck9wZW47XG4gICAgY29uc3QgcnVuUGh5c2ljcyA9ICFkcmF3ZXJPcGVuICYmIHNob3VsZFJ1blBoeXNpY3NUaGlzRnJhbWUoZ2xvYmFscywgZWZmZWN0aXZlVGhyb3R0bGVMZXZlbCk7XG4gICAgaWYgKHJ1blBoeXNpY3MpIHtcbiAgICAgIHVwZGF0ZVBoeXNpY3MoZHQsIGNhY2hlZEZvcmNlRm4gPz8gYXBwbHlGb3JjZXNGdW5jKTtcbiAgICB9XG4gICAgXG4gICAgY29uc3QgaXNQaXRNb2RlID0gaXNQaXRMaWtlTW9kZShnbG9iYWxzPy5jdXJyZW50TW9kZSk7XG4gICAgaWYgKGdsb2JhbHMpIHtcbiAgICAgIGdsb2JhbHMuX19waXRGcmFtZVRocm90dGxlZCA9IGlzUGl0TW9kZSA/ICFydW5QaHlzaWNzIDogZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gVW5kZXIgaGVhdnkgc3VzdGFpbmVkIHByZXNzdXJlIGluIFBpdCBtb2RlLCBza2lwIHJlbmRlcmluZyBvbiBmcmFtZXNcbiAgICAvLyB3aGVyZSBwaHlzaWNzIGlzIGFscmVhZHkgc2tpcHBlZC4gVGhpcyByZWR1Y2VzIHBhaW50L2NvbXBvc2l0ZSBsb2FkLlxuICAgIGNvbnN0IHNraXBSZW5kZXIgPSBpc1BpdE1vZGUgJiYgIXJ1blBoeXNpY3MgJiYgZWZmZWN0aXZlVGhyb3R0bGVMZXZlbCA+PSAyO1xuICAgIGlmICghc2tpcFJlbmRlcikge1xuICAgICAgcmVuZGVyKCk7XG4gICAgfVxuICAgIFxuICAgIC8vIEZQUyB0cmFja2luZ1xuICAgIHRyYWNrRnJhbWUocGVyZm9ybWFuY2Uubm93KCksIHtcbiAgICAgIHRhcmdldEZQUyxcbiAgICAgIHRocm90dGxlTGV2ZWw6IGVmZmVjdGl2ZVRocm90dGxlTGV2ZWwsXG4gICAgICB0aHJvdHRsZWQ6ICFydW5QaHlzaWNzLFxuICAgICAgcmVuZGVyZWQ6ICFza2lwUmVuZGVyXG4gICAgfSk7XG4gICAgXG4gICAgZnJhbWVJZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZShmcmFtZSk7XG4gIH1cblxuICBydW5GcmFtZVJlZiA9IGZyYW1lO1xuICBsYXN0QWNjZXB0ZWRGcmFtZVRpbWUgPSAwO1xuICBmcmFtZUlkID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZyYW1lKTtcbiAgaWYgKGlzRGV2UnVudGltZSgpKSB7XG4gICAgY29uc29sZS5sb2coJ+KckyBSZW5kZXIgbG9vcCBzdGFydGVkIChhZGFwdGl2ZSB0YXJnZXQgRlBTLCB2aXNpYmlsaXR5LWF3YXJlKScpO1xuICB9XG59XG5cbi8qKlxuICogR2V0IGN1cnJlbnQgcGVyZm9ybWFuY2Ugc3RhdHVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRQZXJmb3JtYW5jZVN0YXR1cygpIHtcbiAgY29uc3QgYXZnRnJhbWVUaW1lID0gcmVjZW50RnJhbWVUaW1lcy5sZW5ndGggPiAwIFxuICAgID8gcmVjZW50RnJhbWVUaW1lcy5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiLCAwKSAvIHJlY2VudEZyYW1lVGltZXMubGVuZ3RoIFxuICAgIDogMTYuNjc7XG4gIFxuICByZXR1cm4ge1xuICAgIGlzUGFnZVZpc2libGUsXG4gICAgYWRhcHRpdmVUaHJvdHRsZUxldmVsLFxuICAgIGF2Z0ZQUzogTWF0aC5yb3VuZCgxMDAwIC8gTWF0aC5tYXgoMSwgYXZnRnJhbWVUaW1lKSksXG4gICAgYXZnRnJhbWVNczogYXZnRnJhbWVUaW1lLFxuICAgIHRhcmdldEZQUzogY2FjaGVkVGFyZ2V0RlBTLFxuICAgIHRocm90dGxlZDogYWRhcHRpdmVUaHJvdHRsZUxldmVsID4gMFxuICB9O1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRWxGLE1BQU0sQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO0FBQzdFLE1BQU0sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO0FBQ3JFLE1BQU0sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO0FBQzlELE1BQU0sQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDOztBQUU1RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQztB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QyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUk7QUFDMUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdELENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLO0FBQ2hCLENBQUMsQ0FBQztBQUNGOztBQUVBLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7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QVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6RCxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDNUYsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzRyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUc7QUFDWjs7QUFFQSxRQUFRLENBQUMseUJBQXlCLENBQUMsT0FBTyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDM0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztBQUM1RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFD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QU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO0FBQ2hFLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQzFCLENBQUM7QUFDRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUM7QUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNO0FBQ3RDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO0FBQ3RELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFD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