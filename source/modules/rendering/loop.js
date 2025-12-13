// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         MAIN RENDER LOOP (OPTIMIZED)                        ║
// ║              Electron-grade performance with adaptive throttling             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { updatePhysics, render } from '../physics/engine.js';
import { trackFrame } from '../utils/performance.js';
import { tickBrandLogoBallSpace } from '../ui/brand-logo-ball-space.js';

// ════════════════════════════════════════════════════════════════════════════════
// PERFORMANCE: Frame timing and throttling state
// ════════════════════════════════════════════════════════════════════════════════
let last = performance.now() / 1000;
let lastFrameTime = 0;
let isPageVisible = true;
let frameId = null;

// Target 60fps (16.67ms) - prevents 120Hz displays from doubling CPU work
const TARGET_FPS = 60;
const MIN_FRAME_INTERVAL = 1000 / TARGET_FPS;

// Adaptive throttling: if we detect sustained low FPS, reduce work
let recentFrameTimes = [];
const FPS_SAMPLE_SIZE = 30;
let adaptiveThrottleLevel = 0; // 0 = none, 1 = light, 2 = heavy

function updateAdaptiveThrottle(frameTime) {
  recentFrameTimes.push(frameTime);
  if (recentFrameTimes.length > FPS_SAMPLE_SIZE) {
    recentFrameTimes.shift();
  }
  
  if (recentFrameTimes.length === FPS_SAMPLE_SIZE) {
    const avgFrameTime = recentFrameTimes.reduce((a, b) => a + b, 0) / FPS_SAMPLE_SIZE;
    const avgFPS = 1000 / avgFrameTime;
    
    // Adjust throttle level based on sustained performance
    if (avgFPS < 30 && adaptiveThrottleLevel < 2) {
      adaptiveThrottleLevel++;
      console.log(`⚡ Adaptive throttle increased to level ${adaptiveThrottleLevel} (avg FPS: ${avgFPS.toFixed(1)})`);
    } else if (avgFPS > 55 && adaptiveThrottleLevel > 0) {
      adaptiveThrottleLevel--;
      console.log(`⚡ Adaptive throttle decreased to level ${adaptiveThrottleLevel} (avg FPS: ${avgFPS.toFixed(1)})`);
    }
  }
}

export function startMainLoop(applyForcesFunc) {
  // ══════════════════════════════════════════════════════════════════════════════
  // PERFORMANCE: Visibility API - pause when tab is hidden
  // Saves CPU/battery when user isn't looking
  // ══════════════════════════════════════════════════════════════════════════════
  document.addEventListener('visibilitychange', () => {
    isPageVisible = !document.hidden;
    if (isPageVisible) {
      // Reset timing to prevent huge dt spike when resuming
      last = performance.now() / 1000;
      lastFrameTime = performance.now();
      console.log('▶️ Animation resumed');
      // Restart the loop if it was stopped
      if (!frameId) {
        frameId = requestAnimationFrame(frame);
      }
    } else {
      console.log('⏸️ Animation paused (tab hidden)');
      // Cancel the next frame to fully pause
      if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
    }
  });
  
  function frame(nowMs) {
    // Skip if page not visible (belt and suspenders with visibility handler)
    if (!isPageVisible) {
      frameId = null;
      return;
    }
    
    // ════════════════════════════════════════════════════════════════════════════
    // PERFORMANCE: 60fps throttle - prevents 120Hz displays from wasting CPU
    // On a 120Hz display, this skips every other frame (rendering at 60Hz)
    // ════════════════════════════════════════════════════════════════════════════
    const elapsed = nowMs - lastFrameTime;
    if (elapsed < MIN_FRAME_INTERVAL) {
      frameId = requestAnimationFrame(frame);
      return;
    }
    lastFrameTime = nowMs - (elapsed % MIN_FRAME_INTERVAL); // Maintain timing accuracy
    
    // Track frame time for adaptive throttling
    updateAdaptiveThrottle(elapsed);
    
    const now = nowMs / 1000;
    let dt = Math.min(0.033, now - last);
    last = now;
    
    // Physics update (may be throttled at level 2)
    if (adaptiveThrottleLevel < 2 || Math.random() > 0.5) {
      updatePhysics(dt, applyForcesFunc);
    }
    
    // Render
    render();

    // UI micro-interactions driven by simulation state (throttled internally)
    // Skip at heavy throttle level
    if (adaptiveThrottleLevel < 2) {
      tickBrandLogoBallSpace(nowMs);
    }
    
    // FPS tracking
    trackFrame(performance.now());
    
    frameId = requestAnimationFrame(frame);
  }
  
  frameId = requestAnimationFrame(frame);
  console.log('✓ Render loop started (60fps throttle, visibility-aware)');
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
    avgFPS: Math.round(1000 / avgFrameTime),
    targetFPS: TARGET_FPS
  };
}

