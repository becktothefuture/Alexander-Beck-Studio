// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                 BRAND LOGO – CURSOR DISTANCE SCALE (SUBTLE)                  ║
// ║     Inner ellipse (½ viewport) → 0.9x | Outer band (min side) → 1.1x         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * Performance posture:
 * - No continuous loop.
 * - Pointer updates are rAF-throttled (max 1 style write per frame).
 * - Only a single element is updated via a CSS custom property.
 */

const CSS_VAR = '--abs-brand-logo-scale';
const DEFAULT_SCALE = 1;
const MIN_SCALE = 0.98;
const MAX_SCALE = 1.02;
const EPSILON = 0.001;

let targetEl = null;
let isEnabled = false;

let viewportW = 0;
let viewportH = 0;
let outerRadius = 1;
let innerRx = 1;
let innerRy = 1;

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

  // OUTER BAND: circle radius = half the shortest viewport side (distance to nearest edge)
  outerRadius = Math.max(1, Math.min(viewportW, viewportH) * 0.5);

  // INNER BAND: centered ellipse with ½ the viewport size (so radii are ¼ of viewport)
  innerRx = Math.max(1, viewportW * 0.25);
  innerRy = Math.max(1, viewportH * 0.25);
}

function applyPending() {
  rafId = 0;
  if (!isEnabled || !targetEl) return;
  if (pendingClientX == null || pendingClientY == null) return;

  const dx = pendingClientX - viewportW * 0.5;
  const dy = pendingClientY - viewportH * 0.5;

  // Distance from center in CSS pixels
  const r = Math.hypot(dx, dy);

  // Inner ellipse boundary distance along the cursor ray (dx,dy).
  // For a ray from origin: (x,y) = u*(dx,dy)
  // Ellipse equation: (x/rx)^2 + (y/ry)^2 = 1 -> u = 1 / sqrt((dx^2/rx^2 + dy^2/ry^2))
  let rInner = 0;
  if (r > 0) {
    const denom = Math.sqrt((dx * dx) / (innerRx * innerRx) + (dy * dy) / (innerRy * innerRy));
    rInner = denom > 0 ? 1 / denom : 0;
  }

  // Band mapping:
  // - Inside inner ellipse: clamp to MIN_SCALE (0.9)
  // - Between inner ellipse and outer circle: lerp MIN→MAX
  // - Beyond outer circle: clamp to MAX_SCALE (1.1)
  let t = 0;
  if (r <= rInner) {
    t = 0;
  } else if (r >= outerRadius) {
    t = 1;
  } else {
    const span = Math.max(1e-6, outerRadius - rInner);
    t = clamp01((r - rInner) / span);
  }

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

  // Prefer scaling the inner wrapper so we don't override any legacy exported transforms on #brand-logo.
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


