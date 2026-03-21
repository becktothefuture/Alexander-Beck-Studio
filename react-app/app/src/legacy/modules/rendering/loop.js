// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         MAIN RENDER LOOP (OPTIMIZED)                        ║
// ║              Electron-grade performance with adaptive throttling             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { updatePhysics, render } from '../physics/engine.js';
import { trackFrame } from '../utils/performance.js';
import { getGlobals } from '../core/state.js';
import { isPitLikeMode, MODES } from '../core/constants.js';

// ════════════════════════════════════════════════════════════════════════════════
// PERFORMANCE: Frame timing and throttling state
// ════════════════════════════════════════════════════════════════════════════════
let last = performance.now() / 1000;
let lastFrameTime = 0;
let isPageVisible = true;
let frameId = null;
let frameCounter = 0;
let visibilityListenerBound = false;
let cachedTargetFPS = 60;
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

    const lowThreshold = Math.max(22, targetFPS * 0.5);
    const highThreshold = Math.max(45, targetFPS * 0.8);
    
    // Adjust throttle level based on sustained performance
    if (avgFPS < lowThreshold && adaptiveThrottleLevel < 2) {
      adaptiveThrottleLevel++;
      if (isDevRuntime()) {
        console.log(`⚡ Adaptive throttle increased to level ${adaptiveThrottleLevel} (avg FPS: ${avgFPS.toFixed(1)})`);
      }
    } else if (avgFPS > highThreshold && adaptiveThrottleLevel > 0) {
      adaptiveThrottleLevel--;
      if (isDevRuntime()) {
        console.log(`⚡ Adaptive throttle decreased to level ${adaptiveThrottleLevel} (avg FPS: ${avgFPS.toFixed(1)})`);
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
  // Large SAT hulls + low body count: skipping physics or cutting solver iterations
  // under adaptive throttle caused visible tunneling / interpenetration.
  if (globals?.currentMode === MODES.PORTFOLIO_PIT) return true;
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
    if (elapsed < minFrameInterval) {
      frameId = requestAnimationFrame(frame);
      return;
    }
    // Maintain timing accuracy without drift while allowing dynamic target FPS.
    lastFrameTime = nowMs - (elapsed % minFrameInterval);
    
    // Track frame time for adaptive throttling
    updateAdaptiveThrottle(elapsed, targetFPS);
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
