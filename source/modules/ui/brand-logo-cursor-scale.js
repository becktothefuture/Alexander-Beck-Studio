// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                 BRAND LOGO – CURSOR DISTANCE SCALE (SUBTLE)                  ║
// ║          Center of viewport → 0.9x | Farthest (corner) → 1.1x                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * Performance posture:
 * - No continuous loop.
 * - Pointer updates are rAF-throttled (max 1 style write per frame).
 * - Only a single element is updated via a CSS custom property.
 */

const CSS_VAR = '--abs-brand-logo-scale';
const DEFAULT_SCALE = 1;
const MIN_SCALE = 0.9;
const MAX_SCALE = 1.1;
const EPSILON = 0.001;

let targetEl = null;
let isEnabled = false;

let viewportW = 0;
let viewportH = 0;
let maxDist = 1;

let pendingClientX = null;
let pendingClientY = null;
let rafId = 0;
let lastAppliedScale = null;

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function recomputeViewport() {
  viewportW = window.innerWidth || 0;
  viewportH = window.innerHeight || 0;
  maxDist = Math.hypot(viewportW * 0.5, viewportH * 0.5) || 1;
}

function applyPending() {
  rafId = 0;
  if (!isEnabled || !targetEl) return;
  if (pendingClientX == null || pendingClientY == null) return;

  const dx = pendingClientX - viewportW * 0.5;
  const dy = pendingClientY - viewportH * 0.5;
  const t = clamp01(Math.hypot(dx, dy) / maxDist);
  const scale = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * t;

  if (lastAppliedScale != null && Math.abs(scale - lastAppliedScale) < EPSILON) return;

  targetEl.style.setProperty(CSS_VAR, scale.toFixed(4));
  lastAppliedScale = scale;
}

/**
 * Initialize once during app bootstrap.
 * Safe no-op if the element isn't present (e.g., dev pages).
 */
export function initBrandLogoCursorScale() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Prefer scaling the inner wrapper so we don't override any Webflow transforms on #brand-logo.
  targetEl =
    document.querySelector('#brand-logo .hero__text') ||
    document.querySelector('#brand-logo') ||
    null;

  if (!targetEl) return;

  recomputeViewport();
  isEnabled = true;

  // Seed with a neutral default until the first mousemove arrives.
  targetEl.style.setProperty(CSS_VAR, String(DEFAULT_SCALE));

  window.addEventListener('resize', recomputeViewport, { passive: true });
}

/**
 * Feed pointer positions in CSS pixels (clientX/clientY).
 * rAF throttles updates to avoid per-event style writes.
 */
export function updateBrandLogoCursorScaleFromClient(clientX, clientY) {
  if (!isEnabled || !targetEl) return;

  pendingClientX = clientX;
  pendingClientY = clientY;

  if (rafId) return;
  rafId = window.requestAnimationFrame(applyPending);
}


