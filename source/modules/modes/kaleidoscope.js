// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           KALEIDOSCOPE MODE (NEW)                            ║
// ║    Center-anchored mirrored wedges; mouse-reactive rotation; circle style     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { MODES } from '../core/constants.js';
import { Ball } from '../physics/Ball.js';
import { pickRandomColor } from '../visual/colors.js';
import { randomRadiusForKaleidoscopeVh } from '../utils/ball-sizing.js';

const TAU = Math.PI * 2;
const EPS = 1e-6;

// Render-time smoothing state (mouse-driven rotation should ease-in/out)
let _lastRenderMs = 0;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function getLensCenterX(canvas) {
  return canvas.width * 0.5;
}

function getLensCenterY(canvas) {
  return canvas.height * 0.5;
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

function getKaleidoscopeParams(g) {
  // Each variant has its own parameters; base Kaleidoscope uses the original keys.
  if (g.currentMode === MODES.KALEIDOSCOPE_1) {
    return {
      count: g.kaleidoscope1BallCount ?? 18,
      wedges: g.kaleidoscope1Wedges ?? g.kaleidoscopeWedges ?? 12,
      speed: g.kaleidoscope1Speed ?? 0.8,
      complexity: 0.55,
      spawnAreaMul: g.kaleidoscope1SpawnAreaMul ?? 1.0,
      sizeVariance: g.kaleidoscope1SizeVariance ?? 0.3
    };
  }
  if (g.currentMode === MODES.KALEIDOSCOPE_2) {
    return {
      count: g.kaleidoscope2BallCount ?? 36,
      wedges: g.kaleidoscope2Wedges ?? g.kaleidoscopeWedges ?? 12,
      speed: g.kaleidoscope2Speed ?? 1.15,
      complexity: 0.95,
      spawnAreaMul: g.kaleidoscope2SpawnAreaMul ?? 1.0,
      sizeVariance: g.kaleidoscope2SizeVariance ?? 0.3
    };
  }
  if (g.currentMode === MODES.KALEIDOSCOPE_3) {
    return {
      count: g.kaleidoscope3BallCount ?? 54,
      wedges: g.kaleidoscope3Wedges ?? g.kaleidoscopeWedges ?? 12,
      speed: g.kaleidoscope3Speed ?? 1.55,
      complexity: 1.35,
      spawnAreaMul: g.kaleidoscope3SpawnAreaMul ?? 1.0,
      sizeVariance: g.kaleidoscope3SizeVariance ?? 0.3
    };
  }
  return {
    count: g.kaleidoscopeBallCount ?? 23,
    wedges: g.kaleidoscopeWedges ?? g.kaleidoscopeSegments ?? 12,
    speed: g.kaleidoscopeSpeed ?? 1.0,
    complexity: 0.75,
    spawnAreaMul: g.kaleidoscopeSpawnAreaMul ?? 1.0,
    sizeVariance: g.kaleidoscopeSizeVariance ?? 0.3
  };
}

// Initialize with specific ball count (used by all kaleidoscope variants)
function initializeKaleidoscopeWithCount(count, mode) {
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
  const clampedCount = clamp(Math.max(0, count | 0), 0, maxBalls);
  if (clampedCount <= 0) return;

  // Get mode-specific params including spawn area multiplier
  const params = getKaleidoscopeParams(g);
  const spawnAreaMul = clamp(params.spawnAreaMul ?? 1.0, 0.2, 2.0);

  // Spawn as a loose ring so the first frame is already "kaleidoscopic".
  // SpawnAreaMul controls density: smaller = tighter/denser, larger = more spread
  const viewportSize = Math.min(w, h);
  const ringMin = viewportSize * 0.05;
  // Base ringMax at 2.8, scaled by spawn area multiplier
  const ringMax = viewportSize * 2.8 * spawnAreaMul;

  // Non-overlapping spawn (one-time O(n²), acceptable at init)
  const placed = [];
  const maxAttemptsPerBall = 90;
  const margin = Math.max(2, g.wallInset || 3) * g.DPR;

  function spawnOne(color) {
    const radius = randomRadiusForKaleidoscopeVh(g, mode);
    // Allow spawning well beyond viewport bounds (for 200% more surface area)
    const spawnMargin = ringMax * 1.2; // Extra margin beyond max radius
    const minX = centerX - spawnMargin;
    const maxX = centerX + spawnMargin;
    const minY = centerY - spawnMargin;
    const maxY = centerY + spawnMargin;

    for (let attempt = 0; attempt < maxAttemptsPerBall; attempt++) {
      const a = Math.random() * TAU;
      const rr = ringMin + Math.random() * (ringMax - ringMin);
      const x = clamp(centerX + Math.cos(a) * rr, minX, maxX);
      const y = clamp(centerY + Math.sin(a) * rr, minY, maxY);
      // Spacing is now a ratio of ball radius (e.g., 0.1 = 10% of radius)
      const spacedRadius = radius * (1 + (g.ballSpacing || 0));
      if (!isOverlapping(placed, x, y, spacedRadius)) {
        placed.push({ x, y, r: spacedRadius });
        const b = new Ball(x, y, radius, color);
        b._kaleiSeed = Math.random() * TAU;
        // Lock in an individual “orbit band” so the system stays distributed
        // (prevents everything collapsing into a single ring).
        const ddx = x - centerX;
        const ddy = y - centerY;
        b._kaleiR0 = Math.sqrt(ddx * ddx + ddy * ddy);
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
    const ddx = x - centerX;
    const ddy = y - centerY;
    b._kaleiR0 = Math.sqrt(ddx * ddx + ddy * ddy);
    const speed = (12 + Math.random() * 12) * unit;
    b.vx = -Math.sin(a) * speed;
    b.vy = Math.cos(a) * speed;
    b.driftAx = 0;
    b.driftTime = 0;
    g.balls.push(b);
  }

  // Ensure at least one of each palette color (if we have enough balls)
  const colorCount = Math.min(8, clampedCount);
  for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
    spawnOne(pickRandomColor());
  }

  for (let i = colorCount; i < clampedCount; i++) {
    spawnOne(pickRandomColor());
  }
}

export function initializeKaleidoscope() {
  const g = getGlobals();
  const count = getMobileAdjustedCount(g.kaleidoscopeBallCount ?? 23);
  initializeKaleidoscopeWithCount(count, MODES.KALEIDOSCOPE);
}

export function initializeKaleidoscope1() {
  const g = getGlobals();
  const count = getMobileAdjustedCount(g.kaleidoscope1BallCount ?? 18);
  initializeKaleidoscopeWithCount(count, MODES.KALEIDOSCOPE_1);
}

export function initializeKaleidoscope2() {
  const g = getGlobals();
  const count = getMobileAdjustedCount(g.kaleidoscope2BallCount ?? 36);
  initializeKaleidoscopeWithCount(count, MODES.KALEIDOSCOPE_2);
}

export function initializeKaleidoscope3() {
  const g = getGlobals();
  const count = getMobileAdjustedCount(g.kaleidoscope3BallCount ?? 54);
  initializeKaleidoscopeWithCount(count, MODES.KALEIDOSCOPE_3);
}

// Helper to check if we're in any kaleidoscope mode
function isKaleidoscopeMode(mode) {
  return mode === MODES.KALEIDOSCOPE || 
         mode === MODES.KALEIDOSCOPE_1 || 
         mode === MODES.KALEIDOSCOPE_2 || 
         mode === MODES.KALEIDOSCOPE_3;
}

// Get complexity level for current mode (affects morph intensity)
function getKaleidoscopeComplexity(g) {
  // This is the “intensity ladder” (I → II → III), tunable via per-variant params:
  // - density: ball counts (III defaults to 3× I)
  // - movement: per-variant speed, plus this complexity multiplier
  return getKaleidoscopeParams(g).complexity;
}

export function applyKaleidoscopeForces(ball, dt) {
  const g = getGlobals();
  if (!isKaleidoscopeMode(g.currentMode)) return;

  const canvas = g.canvas;
  if (!canvas) return;

  // IMPORTANT:
  // - Keep this force model simple and predictable.
  // - User-facing control is `kaleidoscopeSpeed` (config + panel).
  // - No per-frame allocations in this hot path.
  // - Movement ONLY when mouse is moving; still when idle.

  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  const unit = getViewportUnit(g);
  const speed = clamp(getKaleidoscopeParams(g).speed ?? 1.0, 0.2, 2.0);

  // ───────────────────────────────────────────────────────────────────────────
  // Activity envelope: ramps up when mouse moves, decays to zero when idle.
  // This makes the kaleidoscope perfectly still when you stop moving.
  // ───────────────────────────────────────────────────────────────────────────
  const nowMs = performance.now();
  const sinceMoveMs = nowMs - (g.lastPointerMoveMs || 0);
  const movingRecently = sinceMoveMs < 120; // grace window for smooth release

  if (g._kaleiActivity === undefined) g._kaleiActivity = 0;
  const targetActivity = movingRecently ? 1 : 0;
  const tauIn = 0.45;   // ramp-up time constant (seconds) - much smoother eased start
  const tauOut = 0.65;  // decay time constant (seconds) - very gentle stop
  const tau = targetActivity > g._kaleiActivity ? tauIn : tauOut;
  const k = 1 - Math.exp(-dt / Math.max(1e-4, tau));
  g._kaleiActivity += (targetActivity - g._kaleiActivity) * k;

  const activity = g._kaleiActivity;
  const complexity = getKaleidoscopeComplexity(g);

  // Very subtle idle movement: gentle drift when activity is low (but not zero)
  // This keeps the kaleidoscope "alive" even when mouse isn't moving.
  const idleDriftStrength = 0.008 * complexity; // Very subtle
  const idleDrift = activity < 0.15 ? idleDriftStrength : 0;

  // When completely idle (activity ≈ 0), apply subtle drift + damping
  if (activity < 0.01) {
    // Very gentle per-ball drift (uses seed for organic variation)
    const t = nowMs * 0.0003; // Slow time scale
    const seed = (ball._kaleiSeed ?? 0) + ball.age * 0.02;
    const driftAngle = seed + t;
    const driftX = Math.cos(driftAngle) * idleDriftStrength * 8;
    const driftY = Math.sin(driftAngle) * idleDriftStrength * 8;
    ball.vx += driftX * dt;
    ball.vy += driftY * dt;
    ball.vx *= 0.96; // Lighter damping when idle (allows subtle drift)
    ball.vy *= 0.96;
    return;
  }

  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const dist = Math.max(EPS, Math.sqrt(dx * dx + dy * dy));
  const nx = dx / dist;
  const ny = dy / dist;

  const tx = -ny;
  const ty = nx;

  // Tangential swirl accel (px/s²). 6x slower than before (30 vs 180).
  // The `unit` keeps it consistent across viewports.
  const swirlA = (30 * unit) * speed * activity;

  // Radial band stabilizer: each ball keeps its own orbit radius (seeded at spawn)
  // so the pattern remains distributed (no single "ring lock").
  const targetR = (ball._kaleiR0 !== undefined) ? ball._kaleiR0 : dist;
  const radialError = dist - targetR;
  const radialA = -(radialError * (2.5 * speed * activity)); // gentler spring

  // Apply accelerations
  ball.vx += (tx * swirlA + nx * radialA) * dt;
  ball.vy += (ty * swirlA + ny * radialA) * dt;

  // Gentle damping to prevent runaway energy
  const damp = 0.992;
  ball.vx *= damp;
  ball.vy *= damp;
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
  if (!isKaleidoscopeMode(g.currentMode)) return;

  const canvas = g.canvas;
  if (!canvas) return;

  const dt = getRenderDtSeconds();

  const balls = g.balls;
  const w = canvas.width;
  const h = canvas.height;
  const unit = getViewportUnit(g);

  const wedgesRaw = getKaleidoscopeParams(g).wedges ?? 12;
  const wedges = clamp(Math.round(wedgesRaw), 3, 24);
  const mirror = Boolean(g.kaleidoscopeMirror ?? true);

  const cx = getLensCenterX(canvas);
  const cy = getLensCenterY(canvas);

  // “Proper” kaleidoscope mapping:
  // Fold polar angle into a single wedge, mirror within wedge, then replicate across wedges.
  // Mouse affects the mapping (pan + phase), not the kaleidoscope center position.

  const wedgeAngle = TAU / wedges;
  const seamEps = Math.max(1e-5, wedgeAngle * 1e-4); // keep away from exact seam angles

  // Mouse-driven mapping offsets
  const mx = g.mouseInCanvas ? g.mouseX : cx;
  const my = g.mouseInCanvas ? g.mouseY : cy;
  const mdx = mx - cx;
  const mdy = my - cy;
  const mouseAngle = Math.atan2(mdy, mdx);
  const mDist = Math.hypot(mdx, mdy);
  const mDistN = clamp(mDist / Math.max(1, Math.min(w, h) * 0.5), 0, 1);

  // Real kaleidoscope morphing: mouse position shifts which part of the source pattern
  // gets sampled, creating transformation (not just rotation).
  // We need both phase (rotation) and pan (position shift) for true morphing.
  if (!g._kaleiMorph) {
    g._kaleiMorph = {
      phase: { x: 0, v: 0 },
      panX: { x: 0, v: 0 },
      panY: { x: 0, v: 0 },
      lastMouseX: mx,
      lastMouseY: my,
      lastInCanvas: Boolean(g.mouseInCanvas)
    };
  }
  const morph = g._kaleiMorph;
  const inCanvasNow = Boolean(g.mouseInCanvas);
  const movedPx = Math.hypot(mx - morph.lastMouseX, my - morph.lastMouseY);
  const moved = movedPx > 0.5 || inCanvasNow !== morph.lastInCanvas;

  // Pan strength: how much mouse movement shifts the sampling point (creates morphing).
  // Complexity affects morph intensity (more complex = more dramatic transformations).
  // Increased base values for more complex movement.
  const speed = clamp(getKaleidoscopeParams(g).speed ?? 1.0, 0.2, 2.0);
  const complexity = getKaleidoscopeComplexity(g);
  const panStrength = 0.65 * speed * complexity; // Increased from 0.35 for more complex movement
  const panXTarget = mdx * panStrength * (g.mouseInCanvas ? 1 : 0);
  const panYTarget = mdy * panStrength * (g.mouseInCanvas ? 1 : 0);
  const phaseTarget = mouseAngle * (0.7 * complexity) * (g.mouseInCanvas ? 1 : 0); // Increased from 0.4 for more rotation

  if (moved) {
    morph.lastMouseX = mx;
    morph.lastMouseY = my;
    morph.lastInCanvas = inCanvasNow;
    springTo(morph.phase, phaseTarget, dt, 4.5); // Slow eased rotation
    springTo(morph.panX, panXTarget, dt, 5.0);   // Slow eased pan X
    springTo(morph.panY, panYTarget, dt, 5.0);   // Slow eased pan Y
  } else {
    morph.phase.v = 0;
    morph.panX.v = 0;
    morph.panY.v = 0;
  }

  const phase = morph.phase.x;
  const panX = morph.panX.x;
  const panY = morph.panY.x;

  // "Breathing" depth: as you move the mouse outward/inward, the rings zoom.
  const speed01 = clamp((speed - 0.2) / 1.8, 0, 1);
  const zoomRange = 0.22 + 0.18 * speed01; // 0.22..0.40
  const zoom = 1 - zoomRange + (1 - mDistN) * (2 * zoomRange); // maps to [1-zoomRange, 1+zoomRange]

  // Draw
  for (let bi = 0; bi < balls.length; bi++) {
    const ball = balls[bi];

    // Center-relative coords WITH pan offset. Pan shifts which part gets sampled = morphing.
    const rx = (ball.x - cx) + panX;
    const ry = (ball.y - cy) + panY;
    // Scale radius to fill entire screen. Increased from 1.8 to 3.5 to cover full viewport
    // and beyond (accounts for expanded spawn area and ensures no empty edges).
    const fillScale = 3.5 * unit;
    const r = Math.hypot(rx, ry) * fillScale * zoom;
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
    for (let wi = 0; wi < wedges; wi++) {
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


