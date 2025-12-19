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
const CSS_VAR_LOGO_COMP_MUL = '--abs-scene-impact-logo-comp-mul';
const CSS_VAR_LOGO_SCALE = '--abs-scene-impact-logo-scale';

let el = null;
let enabled = false;

let impactToken = 0;
let releaseTimeoutId = 0;
let cleanupTimeoutId = 0;
let manualArmed = false;

function isMobileNow(g) {
  // Prefer state flags (kept current by renderer.resize() → detectResponsiveScale()).
  if (g?.isMobile || g?.isMobileViewport) return true;
  // Fallback for edge cases (devtools emulation / early init).
  try {
    return Boolean(window.matchMedia && window.matchMedia('(max-width: 600px)').matches);
  } catch (e) {
    return false;
  }
}

function computeEffectiveImpactMul(g) {
  const base = Number(g?.sceneImpactMul);
  const baseMul = Number.isFinite(base) ? base : 0;
  const f = Number(g?.sceneImpactMobileMulFactor);
  const factor = (Number.isFinite(f) && f > 0) ? f : 1.0;
  return baseMul * (isMobileNow(g) ? factor : 1.0);
}

function applyImpactMulFromGlobals() {
  if (!el) return;
  let g = null;
  try { g = getGlobals(); } catch (e) {}
  if (!g) return;
  const eff = computeEffectiveImpactMul(g);
  el.style.setProperty(CSS_VAR_IMPACT_MUL, String(eff));

  // Keep logo counter-scale gain synced from config/panel.
  // Applied to #abs-scene so #brand-logo (descendant) inherits it.
  const comp = Number(g.sceneImpactLogoCompMul);
  if (Number.isFinite(comp) && comp > 0) {
    el.style.setProperty(CSS_VAR_LOGO_COMP_MUL, String(comp));
  }
}

function computeLogoScaleFromImpact(impact01, g) {
  const effMul = computeEffectiveImpactMul(g);
  // Must match CSS: scale(1 - (impact * mul))
  // Note: `0.008` in CSS is only the fallback value for `--abs-scene-impact-mul`.
  const x = Math.max(0, Number(impact01) || 0) * effMul;
  const sceneScale = Math.max(0.001, 1 - x);
  const exactComp = 1 / sceneScale;

  // Extra anchoring beyond exact compensation (still derived from same x),
  // so motion stays visually “connected”.
  const compMul = Number(g?.sceneImpactLogoCompMul);
  const gain = (Number.isFinite(compMul) && compMul > 0) ? compMul : 1.0;
  const extra = 1 + ((gain - 1) * x);

  // Defensive clamp (UI-only)
  const out = exactComp * extra;
  return Math.max(0.5, Math.min(4.0, out));
}

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
  el.style.setProperty(CSS_VAR_LOGO_SCALE, '1');

  // Stamp tunable multipliers (if available) so config/panel changes apply.
  applyImpactMulFromGlobals();

  // Respect reduced motion: keep stable/robust and do not animate.
  if (prefersReducedMotion()) return;

  enabled = true;

  // Keep impact transition rules stable to prevent end-of-animation snapping.
  // Gate-depth can still override via `.gate-depth-active`.
  el.classList.add('abs-scene--impact');

  // Keep multiplier responsive across mobile breakpoints (resize-driven).
  // Cheap: only a single style write per resize.
  try {
    window.addEventListener('resize', applyImpactMulFromGlobals, { passive: true });
  } catch (e) {}

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
    pulseSceneImpact(didChange ? 1 : 0.75, { armManual: false });
  }, { passive: true });
}

/**
 * Mode change pulse: “click-in” (press) → rebound → settle.
 */
export function pulseSceneImpact(strength = 1, opts = {}) {
  if (!enabled || !el) return;

  const g = getGlobals();
  if (g?.sceneImpactEnabled === false) return;

  const s = Math.max(0, Math.min(1, Number(strength) || 0));
  const token = ++impactToken;

  clearTimers();

  // Mark as animating to opt-in to will-change only during the pulse.
  el.classList.add('abs-scene--animating');
  // `.abs-scene--impact` is kept on permanently (init) to avoid transition swaps.

  if (opts?.armManual) manualArmed = true;

  const pressMsBase = g?.sceneImpactPressMs ?? 75;
  const releaseMsBase = g?.sceneImpactReleaseMs ?? 220;
  // Timing skew (requested): press in faster, return slower.
  const pressMs = Math.max(1, Math.round((Number(pressMsBase) || 0) * 0.8));
  const releaseMs = Math.max(1, Math.round((Number(releaseMsBase) || 0) * 1.2));
  // No standalone config for hold: derive from press duration so the “click” feel
  // stays consistent when users tune pressMs.
  const holdMs = Math.round(Math.min(80, Math.max(0, (Number(pressMs) || 0) * 0.4)));

  // Press in.
  el.style.setProperty(CSS_VAR_IMPACT_DUR, `${Math.round(pressMs)}ms`);
  window.requestAnimationFrame(() => {
    if (!enabled || !el) return;
    if (token !== impactToken) return;
    el.style.setProperty(CSS_VAR_IMPACT, String(s));
    el.style.setProperty(CSS_VAR_LOGO_SCALE, String(computeLogoScaleFromImpact(s, g)));
  });

  // Hold briefly at full press, then release out.
  releaseTimeoutId = window.setTimeout(() => {
    applySceneImpactRelease({ token, releaseMs });
  }, Math.max(0, Math.round(pressMs) + holdMs));

  cleanupTimeoutId = window.setTimeout(() => {
    cleanupTimeoutId = 0;
    if (!el) return;
    // Keep `.abs-scene--impact` to prevent transition swaps that can cause snapping.
    el.classList.remove('abs-scene--animating');
  }, Math.max(0, Math.round(pressMs) + holdMs + Math.round(releaseMs) + 80));
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
  // `.abs-scene--impact` is kept on permanently (init) to avoid transition swaps.

  if (opts?.armManual) manualArmed = true;

  const pressMsBase = g?.sceneImpactPressMs ?? 75;
  const releaseMsBase = g?.sceneImpactReleaseMs ?? 220;
  // Timing skew (requested): press in faster, return slower.
  const pressMs = Math.max(1, Math.round((Number(pressMsBase) || 0) * 0.8));
  const releaseMs = Math.max(1, Math.round((Number(releaseMsBase) || 0) * 1.2));

  // Smooth press-in: set duration then animate impact.
  // No hard reset - let in-flight transitions blend naturally.
  el.style.setProperty(CSS_VAR_IMPACT_DUR, `${Math.round(pressMs)}ms`);
  
  window.requestAnimationFrame(() => {
    if (!enabled || !el) return;
    if (token !== impactToken) return;
    el.style.setProperty(CSS_VAR_IMPACT, String(s));
    el.style.setProperty(CSS_VAR_LOGO_SCALE, String(computeLogoScaleFromImpact(s, g)));
  });

  if (scheduleRelease) {
    releaseTimeoutId = window.setTimeout(() => {
      applySceneImpactRelease({ token, releaseMs });
    }, 0);

    cleanupTimeoutId = window.setTimeout(() => {
      cleanupTimeoutId = 0;
      if (!el) return;
      // Keep `.abs-scene--impact` to prevent transition swaps that can cause snapping.
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
  const releaseMsBase = g?.sceneImpactReleaseMs ?? 220;
  // Timing skew (requested): return slower.
  const releaseMs = Math.max(1, Math.round((Number(releaseMsBase) || 0) * 1.2));
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
    el.style.setProperty(CSS_VAR_LOGO_SCALE, '1');
  });

  // Ensure we always drop will-change after release (covers pointer-hold path).
  cleanupTimeoutId = window.setTimeout(() => {
    cleanupTimeoutId = 0;
    if (!el) return;
    // Keep `.abs-scene--impact` to prevent transition swaps that can cause snapping.
    el.classList.remove('abs-scene--animating');
  }, Math.max(0, Math.round(releaseMs) + 80));
}


