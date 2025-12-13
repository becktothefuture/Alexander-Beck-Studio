// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║               BRAND LOGO – “MAKE SPACE FOR BALLS” (RETREAT)                   ║
// ║       Ball proximity near logo → logo subtly recedes (scale/offset)           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

/**
 * Exposed CSS var: 0..1
 * - 0: no retreat (logo at rest)
 * - 1: maximum retreat (logo yields space)
 */
const CSS_VAR_RETREAT = '--abs-brand-logo-retreat';

// Throttle heavy work (ball scan) – keeps overhead negligible.
const UPDATE_INTERVAL_MS = 90; // ~11Hz

// Mapping tuning (in CSS pixels, then converted to canvas pixels via DPR)
const INNER_PADDING_PX = 18; // how close balls can get before logo yields strongly

let el = null;
let isEnabled = false;

let lastUpdateMs = 0;
let lastApplied = null;

// Cached geometry
let logoCxClient = 0;
let logoCyClient = 0;
let logoInnerRadiusClient = 1; // based on logo box

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function refreshLogoGeometry() {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  logoCxClient = rect.left + rect.width * 0.5;
  logoCyClient = rect.top + rect.height * 0.5;
  // Inner “personal space” radius derived from logo size (feels natural across breakpoints)
  logoInnerRadiusClient = Math.max(1, Math.min(rect.width, rect.height) * 0.6);
}

/**
 * Initialize once during app bootstrap.
 * Safe no-op if logo isn’t present.
 */
export function initBrandLogoBallSpace() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  el =
    document.querySelector('#brand-logo .hero__text') ||
    document.querySelector('#brand-logo') ||
    null;

  if (!el) return;

  refreshLogoGeometry();
  window.addEventListener('resize', refreshLogoGeometry, { passive: true });

  // Seed
  el.style.setProperty(CSS_VAR_RETREAT, '0');
  isEnabled = true;
}

/**
 * Called from the main loop. Cheap early returns + throttled scan.
 */
export function tickBrandLogoBallSpace(nowMs) {
  if (!isEnabled || !el) return;
  if ((nowMs - lastUpdateMs) < UPDATE_INTERVAL_MS) return;
  lastUpdateMs = nowMs;

  const g = getGlobals();
  const balls = g.balls || [];
  const canvas = g.canvas;
  if (!canvas || balls.length === 0) {
    if (lastApplied !== 0) {
      el.style.setProperty(CSS_VAR_RETREAT, '0');
      lastApplied = 0;
    }
    return;
  }

  // Convert logo center (client) → canvas space
  const rect = canvas.getBoundingClientRect();
  const dpr = g.DPR || 1;
  const cx = (logoCxClient - rect.left) * dpr;
  const cy = (logoCyClient - rect.top) * dpr;

  // OUTER BAND: “shortest side of viewport” (in canvas space)
  // i.e. distance from center to nearest edge in client px, then scale by DPR.
  const outerRadius = Math.max(1, Math.min(window.innerWidth, window.innerHeight) * 0.5 * dpr);

  // INNER BAND: based on logo size + padding (in canvas space)
  const innerRadius = (logoInnerRadiusClient + INNER_PADDING_PX) * dpr;

  // Measure nearest ball edge distance to logo center
  let nearestEdge = Infinity;
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    const dx = b.x - cx;
    const dy = b.y - cy;
    const centerDist = Math.hypot(dx, dy);
    const edgeDist = Math.max(0, centerDist - (b.r || 0));
    if (edgeDist < nearestEdge) nearestEdge = edgeDist;
    // Early exit: if already “inside” the inner zone, we’re done.
    if (nearestEdge <= innerRadius) break;
  }

  // Map to retreat factor:
  // - nearestEdge <= innerRadius => 1 (logo yields)
  // - nearestEdge >= outerRadius => 0 (at rest)
  // - in between => smooth interpolation
  let retreat = 0;
  if (nearestEdge <= innerRadius) {
    retreat = 1;
  } else if (nearestEdge >= outerRadius) {
    retreat = 0;
  } else {
    retreat = 1 - clamp01((nearestEdge - innerRadius) / Math.max(1e-6, outerRadius - innerRadius));
  }

  // Quantize tiny changes to avoid style churn
  const q = Number(retreat.toFixed(3));
  if (lastApplied != null && Math.abs(q - lastApplied) < 0.001) return;
  el.style.setProperty(CSS_VAR_RETREAT, String(q));
  lastApplied = q;
}


