// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           MOUSE TRAIL (PERFORMANT)                           ║
// ║      Canvas-rendered pointer trail with pooled ring buffer + rAF draw         ║
// ║      - No DOM nodes, no allocations in hot path                               ║
// ║      - Respects prefers-reduced-motion                                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL STATE (pooled ring buffer)
// ═══════════════════════════════════════════════════════════════════════════════

let cap = 0;
let xs = null;
let ys = null;
let ts = null; // timestamps (ms)
let head = 0; // next write index
let size = 0; // number of valid samples (<= cap)

function prefersReducedMotion() {
  try {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  } catch (e) {
    return false;
  }
}

function ensureCapacity(nextCap) {
  const c = Math.max(0, nextCap | 0);
  if (c <= 0) return;
  if (cap === c && xs && ys && ts) return;

  cap = c;
  xs = new Float32Array(cap);
  ys = new Float32Array(cap);
  ts = new Float64Array(cap);
  head = 0;
  size = 0;
}

function getStrokeStyle() {
  // Match the custom cursor’s “circle” language (solid black).
  // User explicitly requested black even in dark mode.
  return '#000000';
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function distSq(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API (called from pointer.js + render loop)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Record a pointer sample in canvas coordinates (DPR-scaled).
 * Called only for mouse-like pointers, and only when not over UI.
 */
export function notifyMouseTrailMove(x, y, nowMs, inBounds) {
  const g = getGlobals();
  if (!g?.mouseTrailEnabled) return;
  if (!inBounds) return;
  if (prefersReducedMotion()) return;

  // Cap can be tuned live; only reallocate if needed (rare).
  const wanted = clamp((g.mouseTrailLength ?? 18) | 0, 4, 96);
  ensureCapacity(wanted);
  if (!cap) return;

  // Implicit spacing: derived from size.
  // Keep this tight so the stroke reads continuous at small sizes.
  const dpr = g.DPR || 1;
  const widthPx = clamp(Number(g.mouseTrailSize ?? 1.3), 0.5, 10) * dpr;
  const minDist = Math.max(0.35, widthPx * 0.55);
  const minDistSq = minDist * minDist;

  if (size > 0) {
    const lastIdx = (head - 1 + cap) % cap;
    if (distSq(x, y, xs[lastIdx], ys[lastIdx]) < minDistSq) {
      // Update the last timestamp so the head doesn't "die" while hovering.
      ts[lastIdx] = nowMs;
      return;
    }
  }

  xs[head] = x;
  ys[head] = y;
  ts[head] = nowMs;
  head = (head + 1) % cap;
  if (size < cap) size++;
}

export function notifyMouseTrailLeave() {
  // Let existing samples fade naturally, but prevent new ones.
  // We don't hard-clear so the user sees a gentle tail-out.
}

/**
 * Draw the current trail. Call from the main render loop.
 */
export function drawMouseTrail(ctx) {
  const g = getGlobals();
  if (!g?.mouseTrailEnabled) return;
  if (prefersReducedMotion()) return;
  if (!ctx || !size || !cap) return;

  const now = performance.now();
  const lifetimeMs = clamp(Number(g.mouseTrailFadeMs ?? 220), 40, 2000);
  const baseAlpha = clamp(Number(g.mouseTrailOpacity ?? 0.35), 0, 1);
  if (baseAlpha <= 0) return;

  const dpr = g.DPR || 1;
  const widthPx = clamp(Number(g.mouseTrailSize ?? 1.3), 0.5, 10) * dpr;

  // Cull expired points from the tail side (oldest).
  // We do this lazily: walk from oldest forward while expired.
  // Oldest index is (head - size).
  while (size > 0) {
    const oldest = (head - size + cap) % cap;
    const age = now - ts[oldest];
    if (age <= lifetimeMs) break;
    size--;
  }
  if (!size) return;

  // If only one sample remains, skip drawing (avoids “dot” artifacts).
  if (size < 2) return;

  const stroke = getStrokeStyle();

  // Save minimal state; keep this effect isolated.
  const prevAlpha = ctx.globalAlpha;
  const prevComp = ctx.globalCompositeOperation;
  const prevLineCap = ctx.lineCap;
  const prevLineJoin = ctx.lineJoin;
  const prevStrokeStyle = ctx.strokeStyle;
  const prevLineWidth = ctx.lineWidth;

  ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke;
  ctx.lineWidth = widthPx;
  ctx.globalAlpha = baseAlpha;

  // Smooth stroke through samples (no stamping, no visible connector dots).
  const count = size;
  const start = (head - count + cap) % cap;

  ctx.beginPath();
  const x0 = xs[start];
  const y0 = ys[start];
  ctx.moveTo(x0, y0);

  if (count === 2) {
    const x1 = xs[(start + 1) % cap];
    const y1 = ys[(start + 1) % cap];
    ctx.lineTo(x1, y1);
  } else {
    // Quadratic smoothing via midpoints
    for (let i = 1; i < count - 1; i++) {
      const iCurr = (start + i) % cap;
      const iNext = (start + i + 1) % cap;
      const cx = xs[iCurr];
      const cy = ys[iCurr];
      const mx = (cx + xs[iNext]) * 0.5;
      const my = (cy + ys[iNext]) * 0.5;
      ctx.quadraticCurveTo(cx, cy, mx, my);
    }
    // Finish to last point
    const iLast = (start + count - 1) % cap;
    ctx.lineTo(xs[iLast], ys[iLast]);
  }

  ctx.stroke();

  // Restore
  ctx.globalAlpha = prevAlpha;
  ctx.globalCompositeOperation = prevComp;
  ctx.lineCap = prevLineCap;
  ctx.lineJoin = prevLineJoin;
  ctx.strokeStyle = prevStrokeStyle;
  ctx.lineWidth = prevLineWidth;
}


