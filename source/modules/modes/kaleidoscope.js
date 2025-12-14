// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           KALEIDOSCOPE MODE (NEW)                            ║
// ║    Center-anchored mirrored wedges; mouse-reactive rotation; circle style     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls } from '../core/state.js';
import { MODES } from '../core/constants.js';
import { Ball } from '../physics/Ball.js';
import { getColorByIndex, pickRandomColor } from '../visual/colors.js';

const TAU = Math.PI * 2;
const EPS = 1e-6;

// Render-time smoothing state (mouse-driven mapping should ease-in/out)
let _lastRenderMs = 0;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function getLensCenter(g) {
  const canvas = g.canvas;
  // IMPORTANT: The kaleidoscope origin is always anchored at viewport center.
  // Mouse still affects the image via rotation/phase, but the lens does not follow.
  return { x: canvas.width * 0.5, y: canvas.height * 0.5 };
}

function getViewportUnit(g) {
  // Use 1000px as a neutral baseline. Values scale proportionally with viewport size.
  const canvas = g.canvas;
  if (!canvas) return 1;
  return clamp(Math.min(canvas.width, canvas.height) / 1000, 0.35, 3.0);
}

function isOverlapping(existing, x, y, r) {
  for (let i = 0; i < existing.length; i++) {
    const o = existing[i];
    const dx = x - o.x;
    const dy = y - o.y;
    const rr = r + o.r;
    if (dx * dx + dy * dy < rr * rr) return true;
  }
  return false;
}

function getRenderDtSeconds() {
  const now = performance.now();
  const last = _lastRenderMs || now;
  _lastRenderMs = now;
  // Clamp dt to avoid big spikes when tab regains focus
  return clamp((now - last) / 1000, 0, 0.05);
}

function springTo(state, target, dt, omega = 10) {
  // Critically damped spring: natural ease-in/out, no overshoot.
  // omega controls responsiveness (higher = snappier).
  const k = omega * omega;
  const c = 2 * omega;
  state.v += (target - state.x) * k * dt;
  state.v *= Math.max(0, 1 - c * dt);
  state.x += state.v * dt;
  return state.x;
}

export function applyKaleidoscopeBounds(ball, w, h, dt) {
  // Bounds for Kaleidoscope only:
  // - Keep balls inside the canvas
  // - No sounds, no rubber wall impacts, no corner repellers
  // - Gentle reflection with mild energy loss for stability
  const g = getGlobals();
  const inset = Math.max(2, (g.wallInset || 3)) * (g.DPR || 1);
  const minX = inset + ball.r;
  const maxX = w - inset - ball.r;
  const minY = inset + ball.r;
  const maxY = h - inset - ball.r;

  const rest = 0.92;
  const damp = Math.max(0.0, 1 - 0.15 * dt); // mild per-second damping on bounces

  if (ball.x < minX) {
    ball.x = minX;
    ball.vx = Math.abs(ball.vx) * rest * damp;
  } else if (ball.x > maxX) {
    ball.x = maxX;
    ball.vx = -Math.abs(ball.vx) * rest * damp;
  }

  if (ball.y < minY) {
    ball.y = minY;
    ball.vy = Math.abs(ball.vy) * rest * damp;
  } else if (ball.y > maxY) {
    ball.y = maxY;
    ball.vy = -Math.abs(ball.vy) * rest * damp;
  }
}

export function initializeKaleidoscope() {
  const g = getGlobals();
  clearBalls();

  const canvas = g.canvas;
  if (!canvas) return;

  const w = canvas.width;
  const h = canvas.height;
  const centerX = w * 0.5;
  const centerY = h * 0.5;
  const unit = getViewportUnit(g);

  const maxBalls = g.maxBalls || 300;
  const count = clamp(g.kaleidoscopeBallCount ?? 23, 10, maxBalls);

  // Spawn as a loose ring so the first frame is already “kaleidoscopic”.
  // Wide range ensures coverage across the whole viewport without central clumping
  // (spacing + non-overlap keeps it airy).
  const ringMin = Math.min(w, h) * 0.10;
  const ringMax = Math.min(w, h) * 0.95;

  // Non-overlapping spawn (one-time O(n²), acceptable at init)
  const placed = [];
  const maxAttemptsPerBall = 90;
  const margin = Math.max(2, g.wallInset || 3) * g.DPR;

  function spawnOne(color) {
    const radius = g.R_MIN + Math.random() * (g.R_MAX - g.R_MIN);
    const minX = margin + radius;
    const maxX = w - margin - radius;
    const minY = margin + radius;
    const maxY = h - margin - radius;

    for (let attempt = 0; attempt < maxAttemptsPerBall; attempt++) {
      const a = Math.random() * TAU;
      const rr = ringMin + Math.random() * (ringMax - ringMin);
      const x = clamp(centerX + Math.cos(a) * rr, minX, maxX);
      const y = clamp(centerY + Math.sin(a) * rr, minY, maxY);
      if (!isOverlapping(placed, x, y, radius + g.ballSpacing * g.DPR)) {
        placed.push({ x, y, r: radius + g.ballSpacing * g.DPR });
        const b = new Ball(x, y, radius, color);
        b._kaleiSeed = Math.random() * TAU;
        // Viewport-relative tangential speed (baseline: 12–24 at 1000px min-dim).
        const speed = (12 + Math.random() * 12) * unit;
        b.vx = -Math.sin(a) * speed;
        b.vy = Math.cos(a) * speed;
        b.driftAx = 0;
        b.driftTime = 0;
        g.balls.push(b);
        return;
      }
    }

    // Fallback: accept overlap if we couldn't place it (rare at sane counts)
    const a = Math.random() * TAU;
    const rr = ringMin + Math.random() * (ringMax - ringMin);
    const x = centerX + Math.cos(a) * rr;
    const y = centerY + Math.sin(a) * rr;
    const b = new Ball(x, y, radius, color);
    b._kaleiSeed = Math.random() * TAU;
    const speed = (12 + Math.random() * 12) * unit;
    b.vx = -Math.sin(a) * speed;
    b.vy = Math.cos(a) * speed;
    b.driftAx = 0;
    b.driftTime = 0;
    g.balls.push(b);
  }

  // Ensure at least one of each palette color
  for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
    spawnOne(getColorByIndex(colorIndex));
  }

  for (let i = 8; i < count; i++) {
    spawnOne(pickRandomColor());
  }
}

export function applyKaleidoscopeForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.KALEIDOSCOPE) return;

  const canvas = g.canvas;
  if (!canvas) return;

  const { x: cx, y: cy } = getLensCenter(g);
  const unit = getViewportUnit(g);
  const nowMs = performance.now();
  const sinceMoveMs = nowMs - (g.lastPointerMoveMs || 0);
  const movingRecently = sinceMoveMs < 90; // small grace window for smooth release

  // Smooth activity envelope: ramps in/out with easing (no snapping).
  if (g._kaleiActivity === undefined) g._kaleiActivity = 0;
  const target = movingRecently ? 1 : 0;
  const tauIn = 0.08;
  const tauOut = 0.22;
  const tau = target > g._kaleiActivity ? tauIn : tauOut;
  const k = 1 - Math.exp(-dt / Math.max(1e-4, tau));
  g._kaleiActivity += (target - g._kaleiActivity) * k;

  // Idle baseline is intentionally tiny; motion is mostly driven by activity.
  const idleBase = clamp(g.kaleidoscopeIdleMotion ?? 0.03, 0, 1);
  const motionFactor = idleBase + g._kaleiActivity * (1 - idleBase);

  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const dist = Math.max(EPS, Math.hypot(dx, dy));
  const nx = dx / dist;
  const ny = dy / dist;

  const tx = -ny;
  const ty = nx;

  // Distance falloff keeps the field controllable across screen sizes.
  const farFalloff = 1 / Math.max(240, Math.min(canvas.width, canvas.height) * 0.65);
  const inv = 1 / (1 + dist * farFalloff);

  const swirlStrength = (g.kaleidoscopeSwirlStrength ?? 52) * unit * inv * motionFactor;
  const radialPull = (g.kaleidoscopeRadialPull ?? 260) * unit * inv * motionFactor;

  // Organic drift: per-ball low-frequency wander that gently perturbs direction.
  const t = nowMs * 0.001;
  const seed = (ball._kaleiSeed ?? 0) + ball.age * 0.07;
  const wanderAmt = clamp(g.kaleidoscopeWander ?? 0.25, 0, 1) * inv * motionFactor;
  const rot = Math.sin(t * 0.35 + seed) * (0.55 * wanderAmt); // radians
  const cr = Math.cos(rot);
  const sr = Math.sin(rot);
  // Rotate tangential direction slightly toward/away from radial for “organic” flow
  const tRx = tx * cr - nx * sr;
  const tRy = ty * cr - ny * sr;

  // Mild inward pull (negative radial)
  const dvxTarget = (tRx * swirlStrength - nx * radialPull) * dt;
  const dvyTarget = (tRy * swirlStrength - ny * radialPull) * dt;

  // Ease velocity changes (frame-rate independent)
  const ease = clamp(g.kaleidoscopeEase ?? 0.18, 0, 1);
  const alpha = 1 - Math.pow(1 - ease, dt * 60);
  ball.vx += dvxTarget * alpha;
  ball.vy += dvyTarget * alpha;

  // Gentle damping to prevent runaway energy
  // Idle should be a slow, continuous loop (no start/stop).
  // Too much damping causes velocities to die, then collision correction "kicks" them (visible pops).
  const damp = (g._kaleiActivity < 0.05) ? 0.9985 : 0.996;
  ball.vx *= damp;
  ball.vy *= damp;

  // Soft speed clamp (user-tunable)
  const maxSpeed = clamp((g.kaleidoscopeMaxSpeed ?? 2600) * unit, 300, 12000);
  const s2 = ball.vx * ball.vx + ball.vy * ball.vy;
  if (s2 > maxSpeed * maxSpeed) {
    const s = Math.sqrt(s2);
    const k = maxSpeed / Math.max(EPS, s);
    ball.vx *= k;
    ball.vy *= k;
  }
}

function drawBallCircleOnly(ctx, ball) {
  // Preserve “same circle style”: filled circles with palette colors.
  // We intentionally skip squash transforms here to keep the kaleidoscope fast.
  if (ball.alpha < 1) ctx.globalAlpha = ball.alpha;
  ctx.fillStyle = ball.color;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, TAU);
  ctx.fill();
  if (ball.alpha < 1) ctx.globalAlpha = 1;
}

export function renderKaleidoscope(ctx) {
  const g = getGlobals();
  if (g.currentMode !== MODES.KALEIDOSCOPE) return;

  const canvas = g.canvas;
  if (!canvas) return;

  const dt = getRenderDtSeconds();

  const balls = g.balls;
  const w = canvas.width;
  const h = canvas.height;
  const unit = getViewportUnit(g);

  const segmentsRaw = g.kaleidoscopeSegments ?? 12;
  const segments = clamp(Math.round(segmentsRaw), 3, 24);
  const mirror = Boolean(g.kaleidoscopeMirror ?? true);

  const { x: cx, y: cy } = getLensCenter(g);

  // “Proper” kaleidoscope mapping:
  // Fold polar angle into a single wedge, mirror within wedge, then replicate across wedges.
  // Mouse affects the mapping (pan + phase), not the kaleidoscope center position.

  const wedgeAngle = TAU / segments;
  const rotationFollow = clamp(g.kaleidoscopeRotationFollow ?? 1.0, 0, 3);
  const seamEps = Math.max(1e-5, wedgeAngle * 1e-4); // keep away from exact seam angles

  // Mouse-driven mapping offsets
  const mx = g.mouseInCanvas ? g.mouseX : cx;
  const my = g.mouseInCanvas ? g.mouseY : cy;
  const mdx = mx - cx;
  const mdy = my - cy;
  const mAngle = Math.atan2(mdy, mdx);
  const mDist = Math.hypot(mdx, mdy);
  const mDistN = clamp(mDist / Math.max(1, Math.min(w, h) * 0.5), 0, 1);
  const invertT = g.mouseInCanvas ? (1 - mDistN) : 0; // Inverted interaction: outside => “center” (neutral)

  // Phase controls which “slice” you see; distance contributes a zoom-ish feel.
  const phaseTarget = (mAngle * 0.6 * invertT + invertT * 1.2) * rotationFollow;

  // Pan: shifts the sampling field so the kaleidoscope changes, not just rotates.
  const panStrength = clamp(g.kaleidoscopePanStrength ?? 0.75, 0, 2);
  const panXTarget = mdx * panStrength * invertT;
  const panYTarget = mdy * panStrength * invertT;

  // Smooth pan + phase so direction changes ease-in/out (no snappy reversals)
  if (!g._kaleiEase) {
    g._kaleiEase = {
      panX: { x: 0, v: 0 },
      panY: { x: 0, v: 0 },
      phase: { x: 0, v: 0 },
      lastMouseX: mx,
      lastMouseY: my,
      lastInCanvas: Boolean(g.mouseInCanvas),
    };
  }

  // Slightly different responsiveness for pan vs phase feels best
  const ex = g._kaleiEase;
  const inCanvasNow = Boolean(g.mouseInCanvas);
  const movedPx = Math.hypot(mx - ex.lastMouseX, my - ex.lastMouseY);
  const moved = movedPx > 0.5 || inCanvasNow !== ex.lastInCanvas; // includes enter/leave

  let panX = ex.panX.x;
  let panY = ex.panY.x;
  let phase = ex.phase.x;

  if (moved) {
    ex.lastMouseX = mx;
    ex.lastMouseY = my;
    ex.lastInCanvas = inCanvasNow;

    panX = springTo(ex.panX, panXTarget, dt, 9);
    panY = springTo(ex.panY, panYTarget, dt, 9);
    phase = springTo(ex.phase, phaseTarget, dt, 11);
  } else {
    // Freeze when the mouse isn't moving: no settling/inertia.
    ex.panX.v = 0;
    ex.panY.v = 0;
    ex.phase.v = 0;
  }

  // Draw
  for (let bi = 0; bi < balls.length; bi++) {
    const ball = balls[bi];

    // Map into center-relative coords, then apply pan (mouse changes mapping).
    const rx = (ball.x - cx) + panX;
    const ry = (ball.y - cy) + panY;
    // Scale radius to ensure full-viewport coverage (and spill beyond edges if needed).
    const fillScale = 1.8 * unit;
    const r = Math.hypot(rx, ry) * fillScale;
    if (r < EPS) continue;

    // Canonical kaleidoscope fold:
    // - If mirror is enabled: fold angle into [0, wedgeAngle] using a 2*wedgeAngle period reflection.
    //   This guarantees continuity across wedge boundaries (no “flip seams”).
    // - If mirror is disabled: simple modulo into [0, wedgeAngle).
    const period = mirror ? (2 * wedgeAngle) : wedgeAngle;
    let local = Math.atan2(ry, rx) + phase;
    local = ((local % period) + period) % period; // wrap to [0, period)
    if (mirror && local > wedgeAngle) local = period - local; // reflect into [0, wedgeAngle]

    // Avoid exact seam angles (helps prevent razor-thin discontinuities from float/AA).
    local = clamp(local, seamEps, wedgeAngle - seamEps);

    // Replicate across wedges
    for (let wi = 0; wi < segments; wi++) {
      const outA = (wi * wedgeAngle) + local;

      const x = cx + Math.cos(outA) * r;
      const y = cy + Math.sin(outA) * r;

      // Draw circle (same style)
      if (ball.alpha < 1) ctx.globalAlpha = ball.alpha;
      ctx.fillStyle = ball.color;
      ctx.beginPath();
      ctx.arc(x, y, ball.r, 0, TAU);
      ctx.fill();
      if (ball.alpha < 1) ctx.globalAlpha = 1;
    }
  }
}


