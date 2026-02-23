// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           MOUSE TRAIL (PERFORMANT)                           ║
// ║      Canvas-rendered pointer trail with pooled ring buffer + rAF draw         ║
// ║      - No DOM nodes, no allocations in hot path                               ║
// ║      - Respects prefers-reduced-motion                                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, getCursorBodyRadiusCanvasPx } from '../core/state.js';
import { getCursorColor } from '../rendering/cursor.js';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL STATE (pooled ring buffer)
// ═══════════════════════════════════════════════════════════════════════════════

let cap = 0;
let xs = null;
let ys = null;
let ts = null; // timestamps (ms)
let head = 0; // next write index
let size = 0; // number of valid samples (<= cap)
let lastSuppressed = false;

function isSuppressedByLinkHover() {
  try {
    return Boolean(document?.body?.classList?.contains?.('abs-link-hovering'));
  } catch (e) {
    return false;
  }
}

function syncSuppressedState() {
  const suppressed = isSuppressedByLinkHover();
  if (suppressed && !lastSuppressed) {
    // Drop all samples so the trail never “pops back” when leaving a link quickly.
    head = 0;
    size = 0;
  }
  lastSuppressed = suppressed;
  return suppressed;
}

function prefersReducedMotion() {
  try {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  } catch (e) {
    return false;
  }
}

function getTrailPerfProfile(g) {
  const throttle = Math.max(0, Number(g?.adaptiveThrottleLevel) || 0);
  const mobileLike = Boolean(g?.isMobile || g?.isMobileViewport);

  if (throttle >= 2 || mobileLike) {
    return {
      maxSamples: 8,
      ghostCount: 4,
      sizeMul: 0.8,
      alphaMul: 0.6,
      fadeMul: 0.7,
      sampleIntervalMs: 12,
      lagMul: 0.055
    };
  }

  if (throttle >= 1) {
    return {
      maxSamples: 10,
      ghostCount: 5,
      sizeMul: 0.9,
      alphaMul: 0.8,
      fadeMul: 0.85,
      sampleIntervalMs: 8,
      lagMul: 0.065
    };
  }

  return {
    maxSamples: 14,
    ghostCount: 6,
    sizeMul: 1,
    alphaMul: 1,
    fadeMul: 1,
    sampleIntervalMs: 0,
    lagMul: 0.075
  };
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

function getTrailFillStyle() {
  // Use the same color as the cursor dot
  // This ensures perfect synchronization between cursor and trail
  return getCursorColor();
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function distSq(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function pushSample(x, y, nowMs, minSampleIntervalMs = 0) {
  if (!cap) return;

  // Keep latest sample "alive" without over-enqueuing near-identical points.
  if (size > 0) {
    const lastIdx = (head - 1 + cap) % cap;
    const dt = nowMs - ts[lastIdx];
    const d2 = distSq(x, y, xs[lastIdx], ys[lastIdx]);
    if (d2 < 0.35 || (dt < minSampleIntervalMs && d2 < 6)) {
      xs[lastIdx] = x;
      ys[lastIdx] = y;
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

function stampFrameSample(g, nowMs) {
  if (!g?.mouseInCanvas) return;
  const x = Number(g.mouseX);
  const y = Number(g.mouseY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  // Paint-like trail: stamp cursor sample every rendered frame.
  pushSample(x, y, nowMs, 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API (called from pointer.js + render loop)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Record a pointer sample in canvas coordinates (DPR-scaled).
 * Called only for mouse-like pointers, and only when not over UI.
 */
export function notifyMouseTrailMove(x, y, nowMs, inBounds) {
  if (syncSuppressedState()) return;

  const g = getGlobals();
  if (!g?.mouseTrailEnabled) return;
  if (!inBounds) return;
  if (prefersReducedMotion()) return;
  const perf = getTrailPerfProfile(g);

  // Cap can be tuned live; only reallocate if needed (rare).
  const wanted = clamp((g.mouseTrailLength ?? 12) | 0, 6, 32);
  const effectiveWanted = clamp(Math.min(wanted, perf.maxSamples), 6, 32);
  ensureCapacity(effectiveWanted);
  if (!cap) return;

  const minSampleIntervalMs = Math.max(0, Number(perf.sampleIntervalMs) || 0);
  pushSample(x, y, nowMs, minSampleIntervalMs);
}

export function notifyMouseTrailLeave() {
  // Let existing samples fade naturally, but prevent new ones.
  // We don't hard-clear so the user sees a gentle tail-out.
}

/**
 * Draw the current trail. Call from the main render loop.
 */
export function drawMouseTrail(ctx) {
  if (syncSuppressedState()) return;

  const g = getGlobals();
  if (!g?.mouseTrailEnabled) return;
  if (prefersReducedMotion()) return;
  if (!ctx) return;
  const perf = getTrailPerfProfile(g);
  const wanted = clamp((g.mouseTrailLength ?? 12) | 0, 6, 32);
  const effectiveWanted = clamp(Math.min(wanted, perf.maxSamples), 6, 32);
  ensureCapacity(effectiveWanted);
  if (!cap) return;

  const now = performance.now();
  stampFrameSample(g, now);
  if (!size) return;

  const lifetimeMs = clamp(Number(g.mouseTrailFadeMs ?? 220) * perf.fadeMul, 40, 2000);
  const baseAlpha = clamp(Number(g.mouseTrailOpacity ?? 0.35) * perf.alphaMul, 0, 1);
  if (baseAlpha <= 0) return;

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
  const fill = getTrailFillStyle();
  const latest = (head - 1 + cap) % cap;
  const hx = xs[latest];
  const hy = ys[latest];
  const cursorBodyRadius = Math.max(0.5, getCursorBodyRadiusCanvasPx(g));
  const ghostCount = Math.min(size, Math.max(1, perf.ghostCount || 6));
  if (ghostCount <= 0) return;
  // Keep blur circles close to cursor body size for a subtle motion-blur look.
  const trailSizeMul = clamp(0.9 + Number(g.mouseTrailSize ?? 1.2) * 0.07, 0.96, 1.12) * perf.sizeMul;

  // Save minimal state; keep this effect isolated.
  const prevAlpha = ctx.globalAlpha;
  const prevComp = ctx.globalCompositeOperation;
  const prevFillStyle = ctx.fillStyle;

  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = fill;

  // Motion blur as subtle ghost circles:
  // - latest N samples
  // - hard lag clamp so copies stay attached
  // - fade by age + index
  for (let i = ghostCount - 1; i >= 0; i--) {
    const idx = (latest - i + cap) % cap;
    const age = now - ts[idx];
    const ageFade = clamp(1 - age / lifetimeMs, 0, 1);
    if (ageFade <= 0) continue;

    const norm = ghostCount <= 1 ? 0 : (i / (ghostCount - 1));
    const indexFade = 0.08 + Math.pow(1 - norm, 1.15) * 0.92;
    const alpha = baseAlpha * ageFade * indexFade;
    if (alpha <= 0.003) continue;

    // Clamp lag distance extremely hard so copies never detach into a thin string.
    const dx = xs[idx] - hx;
    const dy = ys[idx] - hy;
    const dist = Math.hypot(dx, dy);
    const maxLag = cursorBodyRadius * (Number(perf.lagMul) || 0.07);
    const lagScale = (dist > maxLag && dist > 0.001) ? (maxLag / dist) : 1;
    const pull = 1 - norm * 0.04;
    const gx = hx + dx * lagScale * pull;
    const gy = hy + dy * lagScale * pull;

    const radius = Math.max(0.35, cursorBodyRadius * trailSizeMul * (1 - norm * 0.03));

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(gx, gy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Restore
  ctx.globalAlpha = prevAlpha;
  ctx.globalCompositeOperation = prevComp;
  ctx.fillStyle = prevFillStyle;
}
