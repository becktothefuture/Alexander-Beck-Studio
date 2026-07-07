import { WebHaptics } from 'web-haptics';
import { getTransitionPhase, isRouteTransitionPhase } from './transition-phase.js';

export const HAPTICS_OPT_OUT_STORAGE_KEY = 'abs_haptics_disabled';

const HAPTIC_PATTERNS = Object.freeze({
  hover: { input: 'selection', intensity: 0.24, minIntervalMs: 180 },
  tap: { input: 'light', intensity: 0.38, minIntervalMs: 90 },
  step: { input: 'selection', intensity: 0.48, minIntervalMs: 150 },
  open: { input: 'medium', intensity: 0.56, minIntervalMs: 180 },
  close: { input: 'soft', intensity: 0.36, minIntervalMs: 180 },
  success: { input: 'success', intensity: 0.7, minIntervalMs: 320 },
  error: { input: 'error', intensity: 0.68, minIntervalMs: 420 },
});

let hapticsInstance = null;
let reduceMotionMedia = null;
const lastTriggerAtByType = new Map();

function hasWindow() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function isSupported() {
  return hasWindow() && WebHaptics.isSupported === true;
}

function isOptedOut() {
  if (!hasWindow()) return true;
  try {
    return window.localStorage?.getItem(HAPTICS_OPT_OUT_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function prefersReducedMotion() {
  if (!hasWindow()) return false;
  if (!reduceMotionMedia) {
    reduceMotionMedia = window.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
  }
  return reduceMotionMedia?.matches === true;
}

function getHapticsInstance() {
  if (!isSupported() || isOptedOut()) return null;
  if (!hapticsInstance) {
    hapticsInstance = new WebHaptics({
      debug: false,
      showSwitch: false,
    });
  }
  return hapticsInstance;
}

function isTransitionSuppressed(options) {
  if (options.allowDuringTransition === true || !hasWindow()) return false;
  return isRouteTransitionPhase(getTransitionPhase());
}

export function triggerHaptic(type = 'tap', options = {}) {
  const preset = HAPTIC_PATTERNS[type] || HAPTIC_PATTERNS.tap;
  if (options.event && options.event.isTrusted === false) return false;
  if (isTransitionSuppressed(options)) return false;

  const instance = getHapticsInstance();
  if (!instance) return false;

  const now = performance.now();
  const minIntervalMs = options.minIntervalMs ?? preset.minIntervalMs;
  const lastAt = lastTriggerAtByType.get(type) || 0;
  if (now - lastAt < minIntervalMs) return false;
  lastTriggerAtByType.set(type, now);

  const reducedFactor = prefersReducedMotion() ? 0.55 : 1;
  const intensity = Math.max(0, Math.min(1, (options.intensity ?? preset.intensity) * reducedFactor));
  void instance.trigger(options.input ?? preset.input, { intensity }).catch(() => {});
  return true;
}

export function cancelHaptics() {
  hapticsInstance?.cancel();
}

export function destroyHaptics() {
  hapticsInstance?.destroy();
  hapticsInstance = null;
  lastTriggerAtByType.clear();
}

export function areHapticsAvailable() {
  return isSupported() && !isOptedOut();
}
