// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║              BRAND LOGO – MODE CHANGE “CLICK-IN” MICRO-REACTION              ║
// ║      Trigger: simulation/mode switch only (no cursor position / proximity)   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * Design goals:
 * - Keep the logo visually anchored (no position changes, only transform scale).
 * - Feel “responsive + organic” with fast transitions and soft easing.
 * - Performance-safe: single element, tiny number of style writes per mode switch.
 * - Respect prefers-reduced-motion: no reactive animation (vars stay at 0).
 */

import { getGlobals } from '../core/state.js';

const CSS_VAR_IMPACT = '--abs-brand-logo-impact'; // unitless (0..1)
const CSS_VAR_SQUASH = '--abs-brand-logo-squash'; // unitless (0..1)
const CSS_VAR_IMPACT_DUR = '--abs-brand-logo-impact-dur'; // e.g. "100ms"
const CSS_VAR_IMPACT_MUL = '--abs-brand-logo-impact-mul';
const CSS_VAR_SQUASH_X_MUL = '--abs-brand-logo-squash-x-mul';
const CSS_VAR_SQUASH_Y_MUL = '--abs-brand-logo-squash-y-mul';
const CSS_VAR_TILT_DEG = '--abs-brand-logo-tilt-deg';
const CSS_VAR_SKEW_DEG = '--abs-brand-logo-skew-deg';

const BASE_SQUASH_X_MUL = 0.009;
const BASE_SQUASH_Y_MUL = 0.015;

let el = null;
let enabled = false;

let impactToken = 0;
let releaseTimeoutId = 0;

function prefersReducedMotion() {
  try {
    return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) {
    return false;
  }
}

function resolveTarget() {
  return (
    document.querySelector('#brand-logo') || null
  );
}

export function initBrandLogoReact() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Read tuning from global state (config + panel). Safe: state does not import UI.
  let g = null;
  try { g = getGlobals(); } catch (e) {}

  el = resolveTarget();
  if (!el) return;

  // Always seed vars so CSS has deterministic defaults.
  el.style.setProperty(CSS_VAR_IMPACT, '0');
  el.style.setProperty(CSS_VAR_SQUASH, '0');
  el.style.setProperty(CSS_VAR_IMPACT_DUR, '100ms');
  // Stamp tunable multipliers (if available) so config/panel changes apply.
  if (g) {
    if (g.brandLogoImpactMul !== undefined) {
      el.style.setProperty(CSS_VAR_IMPACT_MUL, String(g.brandLogoImpactMul));
    }
    const squashMul = Number(g.brandLogoSquashMul);
    if (Number.isFinite(squashMul)) {
      el.style.setProperty(CSS_VAR_SQUASH_X_MUL, String(BASE_SQUASH_X_MUL * squashMul));
      el.style.setProperty(CSS_VAR_SQUASH_Y_MUL, String(BASE_SQUASH_Y_MUL * squashMul));
    }
    if (g.brandLogoTiltDeg !== undefined) {
      el.style.setProperty(CSS_VAR_TILT_DEG, String(g.brandLogoTiltDeg));
    }
    if (g.brandLogoSkewDeg !== undefined) {
      el.style.setProperty(CSS_VAR_SKEW_DEG, String(g.brandLogoSkewDeg));
    }
  }

  // Respect reduced motion: keep stable/robust and do not animate.
  if (prefersReducedMotion()) return;

  enabled = true;

  // Mode change pulse (dispatched from mode-controller.js).
  window.addEventListener('bb:modeChanged', (e) => {
    // A bit stronger when explicitly changing modes (not on redundant setMode calls).
    // Detail is { prevMode, mode }.
    const detail = e?.detail || {};
    const didChange = detail.prevMode && detail.mode && detail.prevMode !== detail.mode;
    pulseBrandLogoImpact(didChange ? 1 : 0.75);
  }, { passive: true });
}

/**
 * Mode change pulse: “click-in” (press) → rebound → settle.
 *
 * We drive a single inherited CSS custom property:
 * - positive value: press (CSS maps it to a slight scale-down)
 * - negative value: rebound (CSS maps it to a slight overshoot)
 */
export function pulseBrandLogoImpact(strength = 1) {
  if (!enabled || !el) return;
  let g = null;
  try { g = getGlobals(); } catch (e) {}

  const s = Math.max(0, Math.min(1, Number(strength) || 0));
  const token = ++impactToken;

  if (releaseTimeoutId) {
    window.clearTimeout(releaseTimeoutId);
    releaseTimeoutId = 0;
  }

  // Hard-interrupt any in-flight transition so rapid clicks always restart.
  el.style.setProperty(CSS_VAR_IMPACT_DUR, '1ms');
  el.style.setProperty(CSS_VAR_IMPACT, '0');
  el.style.setProperty(CSS_VAR_SQUASH, '0');
  void el.offsetWidth; // flush

  // Press in quickly, hold briefly, then release quickly.
  // Press: fast. Release: longer + tiny overshoot for a softer “bounce out”.
  const pressMs = g?.brandLogoPressMs ?? 75;
  const holdMs = g?.brandLogoHoldMs ?? 55;
  const releaseMs = g?.brandLogoReleaseMs ?? 220;
  const overshoot = g?.brandLogoOvershoot ?? 0.22;
  const anticipation = g?.brandLogoAnticipation ?? 0.0;

  // Optional anticipation (micro pre-pop). Defaults to 0 (off).
  if (anticipation > 0) {
    el.style.setProperty(CSS_VAR_IMPACT_DUR, '45ms');
    el.style.setProperty(CSS_VAR_IMPACT, String(-Math.min(0.6, anticipation) * s));
    // Keep squash neutral during anticipation (avoids “wobble”).
    el.style.setProperty(CSS_VAR_SQUASH, '0');
  }

  window.requestAnimationFrame(() => {
    if (!enabled || !el) return;
    if (token !== impactToken) return;
    el.style.setProperty(CSS_VAR_IMPACT_DUR, `${Math.round(pressMs)}ms`);
    el.style.setProperty(CSS_VAR_IMPACT, String(s));
    el.style.setProperty(CSS_VAR_SQUASH, String(s));
  });

  // Release after a short “click” hold:
  // 1) switch to longer duration
  // 2) pop slightly past rest (overshoot)
  // 3) then settle to 0 over the longer ease-out
  releaseTimeoutId = window.setTimeout(() => {
    releaseTimeoutId = 0;
    if (!enabled || !el) return;
    if (token !== impactToken) return;
    el.style.setProperty(CSS_VAR_IMPACT_DUR, `${Math.round(releaseMs)}ms`);
    el.style.setProperty(CSS_VAR_IMPACT, String(-Math.abs(Number(overshoot) || 0) * s));
    el.style.setProperty(CSS_VAR_SQUASH, '0');

    window.requestAnimationFrame(() => {
      if (!enabled || !el) return;
      if (token !== impactToken) return;
      el.style.setProperty(CSS_VAR_IMPACT, '0');
    });
  }, Math.max(0, Math.round(holdMs)));
}


