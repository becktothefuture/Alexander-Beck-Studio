// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║               SCENE – MODE CHANGE “CLICK-IN” MICRO-REACTION                  ║
// ║      Trigger: simulation/mode switch only (no cursor position / proximity)   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * Design goals:
 * - Move the *entire scene* (all layers) as a single GPU transform.
 * - Performance-safe: one element, small number of style writes per mode switch.
 * - Keep click-to-change-sim behavior unchanged (this is purely visual).
 * - Respect prefers-reduced-motion: no reactive animation (vars stay at 0).
 */

import { getGlobals } from '../core/state.js';

const CSS_VAR_IMPACT = '--abs-scene-impact'; // unitless (can be +/- for rebound)
const CSS_VAR_IMPACT_DUR = '--abs-scene-impact-dur'; // e.g. "100ms"
const CSS_VAR_IMPACT_MUL = '--abs-scene-impact-mul';

let el = null;
let enabled = false;

let impactToken = 0;
let releaseTimeoutId = 0;
let cleanupTimeoutId = 0;
let manualArmed = false;

function prefersReducedMotion() {
  try {
    return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) {
    return false;
  }
}

function resolveTarget() {
  return (
    document.querySelector('#abs-scene') || null
  );
}

function clearTimers() {
  if (releaseTimeoutId) {
    window.clearTimeout(releaseTimeoutId);
    releaseTimeoutId = 0;
  }
  if (cleanupTimeoutId) {
    window.clearTimeout(cleanupTimeoutId);
    cleanupTimeoutId = 0;
  }
}

export function initSceneImpactReact() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  let g = null;
  try { g = getGlobals(); } catch (e) {}

  el = resolveTarget();
  if (!el) return;

  // Always seed vars so CSS has deterministic defaults.
  el.style.setProperty(CSS_VAR_IMPACT, '0');
  el.style.setProperty(CSS_VAR_IMPACT_DUR, '100ms');

  // Stamp tunable multipliers (if available) so config/panel changes apply.
  if (g) {
    if (g.sceneImpactMul !== undefined) {
      el.style.setProperty(CSS_VAR_IMPACT_MUL, String(g.sceneImpactMul));
    }
  }

  // Respect reduced motion: keep stable/robust and do not animate.
  if (prefersReducedMotion()) return;

  enabled = true;

  // Mode change pulse (dispatched from mode-controller.js).
  window.addEventListener('bb:modeChanged', (e) => {
    const globals = getGlobals();
    if (globals?.sceneImpactEnabled === false) return;
    if (manualArmed) {
      // Pointer-driven mode switching uses explicit press/release calls.
      manualArmed = false;
      return;
    }

    const detail = e?.detail || {};
    const didChange = detail.prevMode && detail.mode && detail.prevMode !== detail.mode;
    sceneImpactPress(didChange ? 1 : 0.75, { armManual: false });
  }, { passive: true });
}

/**
 * Mode change pulse: “click-in” (press) → rebound → settle.
 */
export function pulseSceneImpact(strength = 1) {
  sceneImpactPress(strength, { armManual: false });
}

/**
 * Press-in only (used for pointer-down “real click” feel).
 * @param {number} strength 0..1
 * @param {{ armManual?: boolean }} opts
 */
export function sceneImpactPress(strength = 1, opts = {}) {
  if (!enabled || !el) return;

  const g = getGlobals();
  if (g?.sceneImpactEnabled === false) return;

  const scheduleRelease = opts?.scheduleRelease !== false;
  const s = Math.max(0, Math.min(1, Number(strength) || 0));
  const token = ++impactToken;

  clearTimers();

  // Mark as animating to opt-in to will-change only during the pulse.
  el.classList.add('abs-scene--animating');
  el.classList.add('abs-scene--impact');

  if (opts?.armManual) manualArmed = true;

  const pressMs = g?.sceneImpactPressMs ?? 75;
  const releaseMs = g?.sceneImpactReleaseMs ?? 220;

  // Smooth press-in: set duration then animate impact.
  // No hard reset - let in-flight transitions blend naturally.
  el.style.setProperty(CSS_VAR_IMPACT_DUR, `${Math.round(pressMs)}ms`);
  
  window.requestAnimationFrame(() => {
    if (!enabled || !el) return;
    if (token !== impactToken) return;
    el.style.setProperty(CSS_VAR_IMPACT, String(s));
  });

  if (scheduleRelease) {
    releaseTimeoutId = window.setTimeout(() => {
      applySceneImpactRelease({ token, releaseMs });
    }, 0);

    cleanupTimeoutId = window.setTimeout(() => {
      cleanupTimeoutId = 0;
      if (!el) return;
      // Return to non-impact transition rules once we’ve settled.
      el.classList.remove('abs-scene--impact');
      el.classList.remove('abs-scene--animating');
    }, Math.max(0, Math.round(releaseMs) + 80));
  }
}

/**
 * Release/bounce-out only (used for pointer-up “real click” feel).
 * @param {number} strength 0..1
 */
export function sceneImpactRelease(strength = 1) {
  if (!enabled || !el) return;
  const g = getGlobals();
  if (g?.sceneImpactEnabled === false) return;
  const token = impactToken;
  const releaseMs = g?.sceneImpactReleaseMs ?? 220;
  // Release always returns smoothly to rest (no overshoot).
  return applySceneImpactRelease({ token, releaseMs });
}

function applySceneImpactRelease({ token, releaseMs }) {
  clearTimers();
  if (!enabled || !el) return;
  if (token !== impactToken) return;

  el.style.setProperty(CSS_VAR_IMPACT_DUR, `${Math.round(releaseMs)}ms`);
  // Smooth return to rest (no bounce): animate impact back to 0.
  window.requestAnimationFrame(() => {
    if (!enabled || !el) return;
    if (token !== impactToken) return;
    el.style.setProperty(CSS_VAR_IMPACT, '0');
  });

  // Ensure we always drop will-change after release (covers pointer-hold path).
  cleanupTimeoutId = window.setTimeout(() => {
    cleanupTimeoutId = 0;
    if (!el) return;
    el.classList.remove('abs-scene--impact');
    el.classList.remove('abs-scene--animating');
  }, Math.max(0, Math.round(releaseMs) + 80));
}


