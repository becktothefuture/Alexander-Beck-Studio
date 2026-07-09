// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           KALEIDOSCOPE MODE (NEW)                            ║
// ║    Center-anchored mirrored wedges; mouse-reactive rotation; circle style     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { MODES } from '../core/constants.js';
import { Ball } from '../physics/Ball.js';
import {
  PALETTE_BRIGHT_ACCENT_INDICES,
  PALETTE_CHROMATIC_INDICES,
  PALETTE_NEUTRAL_INDICES,
  pickRandomColorWithIndex,
} from '../visual/colors.js';
import { randomRadiusForKaleidoscopeVh } from '../utils/ball-sizing.js';
import { drawPebbleBody } from '../visual/pebble-body.js';
import { triggerDetent } from '../audio/simulation-audio-adapter.js';

const TAU = Math.PI * 2;
const EPS = 1e-6;
const MOBILE_SOURCE_COUNT_FACTOR = 0.46;
const MOBILE_SOURCE_SPREAD_MUL = 1.38;
const MOBILE_FORCE_RESPONSE_SCALE = 1.22;
const MOBILE_MORPH_SCALE = 1.16;
const MOBILE_TOUCH_MORPH_SCALE = 1.32;
const RIFT_MOBILE_COUNT_FACTOR = 0.82;

// Render-time smoothing state (mouse-driven rotation should ease-in/out)
let _lastRenderMs = 0;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function pickWeightedRow(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  let total = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const weight = Number(rows[i]?.weight);
    if (Number.isFinite(weight) && weight > 0) total += weight;
  }
  if (total <= 0) return rows[0] || null;
  let roll = Math.random() * total;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const weight = Number(row?.weight);
    if (!Number.isFinite(weight) || weight <= 0) continue;
    roll -= weight;
    if (roll <= 0) return row;
  }
  return rows[rows.length - 1] || null;
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

function wrapAngleSigned(value) {
  if (!Number.isFinite(value)) return 0;
  const wrapped = ((value + Math.PI) % TAU + TAU) % TAU;
  return wrapped - Math.PI;
}

function getWedgeTrigCache(g, wedges, wedgeAngle) {
  const cache = g._kaleiWedgeCache;
  if (cache && cache.wedges === wedges) return cache;

  const cos = new Float32Array(wedges);
  const sin = new Float32Array(wedges);
  for (let wi = 0; wi < wedges; wi++) {
    const baseAngle = wi * wedgeAngle;
    cos[wi] = Math.cos(baseAngle);
    sin[wi] = Math.sin(baseAngle);
  }

  const nextCache = { wedges, cos, sin };
  g._kaleiWedgeCache = nextCache;
  return nextCache;
}

export function applyKaleidoscopeBounds(ball, w, h, dt) {
  // Bounds for Kaleidoscope only:
  // - Keep balls inside the canvas
  // - No sounds, no rubber wall impacts, no corner repellers
  // - Gentle reflection with mild energy loss for stability
  const g = getGlobals();
  const wiK = Number(g.wallInset);
  const inset = Math.max(2, Number.isFinite(wiK) ? Math.max(0, wiK) : 3) * (g.DPR || 1);
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
  // Use KALEIDOSCOPE_3 parameters (now the only kaleidoscope mode)
  return {
    count: g.kaleidoscope3BallCount ?? g.kaleidoscopeBallCount ?? 150,
    wedges: g.kaleidoscope3Wedges ?? g.kaleidoscopeWedges ?? 10,
    speed: g.kaleidoscope3Speed ?? g.kaleidoscopeSpeed ?? 1.2,
    complexity: 1.55,
    spawnAreaMul: g.kaleidoscope3SpawnAreaMul ?? g.kaleidoscopeSpawnAreaMul ?? 1.05,
    sizeVariance: g.kaleidoscope3SizeVariance ?? g.kaleidoscopeSizeVariance ?? 0.5
  };
}

function getKaleidoscopeRiftParams(g) {
  return {
    count: g.kaleidoscopeRiftBallCount ?? 48,
    spokes: g.kaleidoscopeRiftSpokes ?? 8,
    mobileSpokes: g.kaleidoscopeRiftSpokesMobile ?? 5,
    rings: g.kaleidoscopeRiftRings ?? 5,
    speed: g.kaleidoscopeRiftSpeed ?? 1.15,
    shear: g.kaleidoscopeRiftShear ?? 0.72,
    dotSizeVh: g.kaleidoscopeRiftDotSizeVh ?? 1.05,
    dotAreaMul: g.kaleidoscopeRiftDotAreaMul ?? 1.05,
    sizeVariance: g.kaleidoscopeRiftSizeVariance ?? 0.24
  };
}

function getKaleidoscopeAdjustedCount(g, baseCount) {
  const count = getMobileAdjustedCount(baseCount);
  if (!(g.isMobile || g.isMobileViewport)) return count;
  return Math.max(0, Math.round(count * MOBILE_SOURCE_COUNT_FACTOR));
}

function getKaleidoscopeRiftAdjustedCount(g, baseCount) {
  const count = getMobileAdjustedCount(baseCount);
  if (!(g.isMobile || g.isMobileViewport)) return count;
  return Math.max(0, Math.round(count * RIFT_MOBILE_COUNT_FACTOR));
}

function randomRadiusForKaleidoscopeRift(g) {
  const canvas = g?.canvas;
  const h = canvas?.height || 0;
  const params = getKaleidoscopeRiftParams(g);
  const vh = clamp(Number(params.dotSizeVh), 0.1, 4.0);
  const areaMul = clamp(Number(params.dotAreaMul), 0.1, 2.0);
  const base = Math.max(1, (vh * 0.01) * h * Math.sqrt(areaMul));
  const variance = clamp(Number(params.sizeVariance) * 0.5, 0, 0.2);
  return base * (1 - variance + Math.random() * variance * 2);
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
  const isMobile = g.isMobile || g.isMobileViewport;
  const spawnAreaMul = clamp(params.spawnAreaMul ?? 1.0, 0.2, 2.0) * (isMobile ? MOBILE_SOURCE_SPREAD_MUL : 1);

  // Spawn as a ring so the first frame is already "kaleidoscopic".
  // SpawnAreaMul controls density: smaller = tighter/denser, larger = more spread.
  const viewportSize = Math.min(w, h);
  const ringMin = viewportSize * 0.05;
  const ringMax = viewportSize * 2.2 * spawnAreaMul;

  // Non-overlapping spawn (one-time O(n²), acceptable at init)
  const placed = [];
  const maxAttemptsPerBall = 90;
  const wiM = Number(g.wallInset);
  const margin = Math.max(2, Number.isFinite(wiM) ? Math.max(0, wiM) : 3) * g.DPR;

  const palette = Array.isArray(g.currentColors) ? g.currentColors : [];
  const distribution = Array.isArray(g.colorDistribution) ? g.colorDistribution : [];

  const categorizedRows = distribution.reduce((acc, row, distributionIndex) => {
    const colorIndex = Math.max(0, Math.min(7, Number(row?.colorIndex) || 0));
    const entry = { colorIndex, distributionIndex, weight: Number(row?.weight) || 0 };
    if (PALETTE_BRIGHT_ACCENT_INDICES.includes(colorIndex)) acc.bright.push(entry);
    else if (PALETTE_CHROMATIC_INDICES.includes(colorIndex)) acc.chromatic.push(entry);
    else if (PALETTE_NEUTRAL_INDICES.includes(colorIndex)) acc.neutral.push(entry);
    else acc.neutral.push(entry);
    acc.all.push(entry);
    return acc;
  }, { neutral: [], chromatic: [], bright: [], all: [] });

  function pickBiasedColor(rr) {
    const rNorm = Math.max(0, Math.min(1, rr / Math.max(ringMax, 1)));
    const bucketWeights = rNorm <= 0.4
      ? { neutral: 42, chromatic: 43, bright: 15 }
      : rNorm <= 0.75
        ? { neutral: 54, chromatic: 34, bright: 12 }
        : { neutral: 70, chromatic: 22, bright: 8 };

    const bucketPool = [];
    if (categorizedRows.neutral.length) bucketPool.push({ key: 'neutral', weight: bucketWeights.neutral });
    if (categorizedRows.chromatic.length) bucketPool.push({ key: 'chromatic', weight: bucketWeights.chromatic });
    if (categorizedRows.bright.length) bucketPool.push({ key: 'bright', weight: bucketWeights.bright });

    let pickedRow = null;
    if (bucketPool.length) {
      let total = 0;
      for (let i = 0; i < bucketPool.length; i += 1) total += bucketPool[i].weight;
      let roll = Math.random() * Math.max(total, 1);
      for (let i = 0; i < bucketPool.length; i += 1) {
        roll -= bucketPool[i].weight;
        if (roll <= 0) {
          pickedRow = pickWeightedRow(categorizedRows[bucketPool[i].key]);
          break;
        }
      }
    }

    pickedRow = pickedRow || pickWeightedRow(categorizedRows.all);
    if (!pickedRow) return pickRandomColorWithIndex();
    return {
      color: palette[pickedRow.colorIndex] || palette[0] || "var(--color-brand-white)",
      distributionIndex: pickedRow.distributionIndex
    };
  }

  function spawnOne() {
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
        const { color, distributionIndex } = pickBiasedColor(rr);
        const b = new Ball(x, y, radius, color);
        b.distributionIndex = distributionIndex;
        b._kaleiSeed = Math.random() * TAU;
        // Lock in an individual "orbit band" so the system stays distributed
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
    const { color, distributionIndex } = pickBiasedColor(rr);
    const b = new Ball(x, y, radius, color);
    b.distributionIndex = distributionIndex;
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

  for (let i = 0; i < clampedCount; i++) {
    spawnOne();
  }
}

export function initializeKaleidoscope() {
  const g = getGlobals();
  const count = getKaleidoscopeAdjustedCount(g, g.kaleidoscope3BallCount ?? g.kaleidoscopeBallCount ?? 150);
  initializeKaleidoscopeWithCount(count, MODES.KALEIDOSCOPE);
}

export function initializeKaleidoscopeRift() {
  const g = getGlobals();
  clearBalls();

  const canvas = g.canvas;
  if (!canvas) return;

  const params = getKaleidoscopeRiftParams(g);
  const count = getKaleidoscopeRiftAdjustedCount(g, params.count);
  const clampedCount = clamp(Math.max(0, count | 0), 0, g.maxBalls || 300);
  if (clampedCount <= 0) return;

  const w = canvas.width;
  const h = canvas.height;
  const cx = w * 0.5;
  const cy = h * 0.5;
  const minDim = Math.min(w, h);
  const isMobile = g.isMobile || g.isMobileViewport;
  const spokes = clamp(Math.round(isMobile ? params.mobileSpokes : params.spokes), 3, 16);
  const wedgeAngle = TAU / spokes;
  const ringCount = clamp(Math.round(params.rings), 2, 9);
  const slotsPerRing = Math.max(2, Math.ceil(clampedCount / ringCount));
  const inner = minDim * (isMobile ? 0.11 : 0.09);
  const outer = minDim * (isMobile ? 0.46 : 0.43);

  g._kaleidoRift = null;

  for (let i = 0; i < clampedCount; i += 1) {
    const ring = i % ringCount;
    const slot = Math.floor(i / ringCount);
    const ringT = ringCount <= 1 ? 0.5 : ring / (ringCount - 1);
    const slotOffset = (slot + 0.5 + (ring % 2) * 0.48) / slotsPerRing;
    const theta0 = wedgeAngle * (0.13 + 0.74 * (slotOffset % 1));
    const radiusBase = inner + (outer - inner) * Math.pow(ringT, 0.82);
    const radius = randomRadiusForKaleidoscopeRift(g);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const b = new Ball(cx + Math.cos(theta0) * radiusBase, cy + Math.sin(theta0) * radiusBase, radius, color);
    b.distributionIndex = distributionIndex;
    b._riftRing = ring;
    b._riftRingT = ringT;
    b._riftTheta0 = theta0;
    b._riftRadiusBase = radiusBase;
    b._riftSeed = (i * 0.61803398875 + Math.random() * 0.2) * TAU;
    b._kaleiSeed = b._riftSeed;
    b.vx = 0;
    b.vy = 0;
    g.balls.push(b);
  }
}

// Helper to check if we're in kaleidoscope mode
function isKaleidoscopeMode(mode) {
  return mode === MODES.KALEIDOSCOPE;
}

function isKaleidoscopeRiftMode(mode) {
  return mode === MODES.KALEIDOSCOPE_RIFT;
}

// Get complexity level for current mode (affects morph intensity)
function getKaleidoscopeComplexity(g) {
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
  const mobileResponseScale = (g.isMobile || g.isMobileViewport) ? MOBILE_FORCE_RESPONSE_SCALE : 1;

  // ───────────────────────────────────────────────────────────────────────────
  // Activity envelope: ramps up when mouse moves, decays to zero when idle.
  // This makes the kaleidoscope perfectly still when you stop moving.
  // ───────────────────────────────────────────────────────────────────────────
  const nowMs = performance.now();
  const sinceMoveMs = nowMs - (g.lastPointerMoveMs || 0);
  const movingRecently = sinceMoveMs < 180; // grace window for smooth release

  if (g._kaleiActivity === undefined) g._kaleiActivity = 0;
  const targetActivity = movingRecently ? 1 : 0;
  const tauIn = 0.22;   // ramp-up time constant (seconds)
  const tauOut = 0.55;  // decay time constant (seconds)
  const tau = targetActivity > g._kaleiActivity ? tauIn : tauOut;
  const k = 1 - Math.exp(-dt / Math.max(1e-4, tau));
  g._kaleiActivity += (targetActivity - g._kaleiActivity) * k;

  const activity = g._kaleiActivity;
  const complexity = getKaleidoscopeComplexity(g);

  if (ball === g.balls[0] && activity > 0.14) {
    const angularVelocity = speed * activity * complexity;
    g._kaleiAudioPhase = (g._kaleiAudioPhase || 0) + angularVelocity * dt;
    triggerDetent({
      id: 'kaleidoscope-3:phase',
      value: g._kaleiAudioPhase,
      step: Math.PI / 12,
      velocity: angularVelocity,
      minVelocity: 0.18,
      minIntervalMs: 58,
      gain: 0.048,
      filterHz: 2100,
    });
  }

  // Very subtle idle movement: gentle drift keeps scene alive when pointer rests.
  const idleBase = Math.max(0, g.kaleidoscopeIdleDrift ?? 0.012);
  const idleStrength = g.prefersReducedMotion ? 0 : idleBase * complexity * (1 - Math.min(1, activity * 0.7));

  if (idleStrength > 0) {
    const t = nowMs * 0.00035;
    const seed = (ball._kaleiSeed ?? 0) + ball.age * 0.02;
    const driftAngle = seed + t;
    const driftX = Math.cos(driftAngle) * idleStrength * 9;
    const driftY = Math.sin(driftAngle * 1.1) * idleStrength * 9;
    ball.vx += driftX * dt;
    ball.vy += driftY * dt;
  }

  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const dist = Math.max(EPS, Math.sqrt(dx * dx + dy * dy));
  const nx = dx / dist;
  const ny = dy / dist;

  const tx = -ny;
  const ty = nx;

  // Tangential swirl accel (px/s²). The `unit` keeps it consistent across viewports.
  const swirlA = (52 * unit) * speed * activity * mobileResponseScale;

  // Radial band stabilizer: each ball keeps its own orbit radius (seeded at spawn)
  // so the pattern remains distributed (no single "ring lock").
  const targetR = (ball._kaleiR0 !== undefined) ? ball._kaleiR0 : dist;
  const radialError = dist - targetR;
  const radialA = -(radialError * (3.4 * speed * activity * mobileResponseScale));

  // Apply accelerations
  ball.vx += (tx * swirlA + nx * radialA) * dt;
  ball.vy += (ty * swirlA + ny * radialA) * dt;

  // Gentle damping to prevent runaway energy
  const damp = 0.992;
  ball.vx *= damp;
  ball.vy *= damp;
}

function updateKaleidoscopeRiftMotion(g, dt) {
  if (!g._kaleidoRift) {
    g._kaleidoRift = {
      activity: { x: 0, v: 0 },
      shear: { x: 0, v: 0 },
      open: { x: 0, v: 0 },
      phase: 0,
      pointerAngle: 0,
      lastUpdateMs: 0
    };
  }

  const state = g._kaleidoRift;
  const nowMs = performance.now();
  if (state.lastUpdateMs && nowMs - state.lastUpdateMs < 1) return state;
  const updateDt = state.lastUpdateMs
    ? clamp((nowMs - state.lastUpdateMs) / 1000, 0, 0.05)
    : clamp(dt, 0, 0.05);
  state.lastUpdateMs = nowMs;

  const canvas = g.canvas;
  if (!canvas) return state;

  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  const pointerInCanvas = g.pointerInCanvas ?? g.mouseInCanvas;
  const inputX = Number.isFinite(g.pointerX) ? g.pointerX : g.mouseX;
  const inputY = Number.isFinite(g.pointerY) ? g.pointerY : g.mouseY;
  const pointerValid = pointerInCanvas && Number.isFinite(inputX) && Number.isFinite(inputY);
  const dx = pointerValid ? inputX - cx : 0;
  const dy = pointerValid ? inputY - cy : 0;
  const mDistN = pointerValid
    ? clamp(Math.hypot(dx, dy) / Math.max(1, Math.min(canvas.width, canvas.height) * 0.5), 0, 1)
    : 0;
  const isTouchDrag = pointerValid && g.pointerActive === true && (g.pointerType === 'touch' || g.pointerType === 'pen');
  const recentWindowMs = isTouchDrag ? 420 : 220;
  const movingRecently = nowMs - (g.lastPointerMoveMs || 0) < recentWindowMs;
  const motionTarget = pointerValid
    ? clamp(Math.max(Math.pow(mDistN, 0.75), movingRecently ? (isTouchDrag ? 0.92 : 0.74) : 0.18), 0, 1)
    : 0;
  const reducedMul = g.prefersReducedMotion ? 0.28 : 1;
  const activityTarget = motionTarget * reducedMul;
  const shearTarget = pointerValid
    ? clamp(((dx / Math.max(1, canvas.width * 0.5)) * 0.72) + ((dy / Math.max(1, canvas.height * 0.5)) * 0.38), -1, 1) * reducedMul
    : 0;

  springTo(state.activity, activityTarget, updateDt, isTouchDrag ? 7.2 : 5.4);
  springTo(state.shear, shearTarget, updateDt, isTouchDrag ? 6.4 : 4.8);
  springTo(state.open, mDistN * activityTarget, updateDt, isTouchDrag ? 5.8 : 4.2);
  if (pointerValid) state.pointerAngle = Math.atan2(dy, dx);

  const params = getKaleidoscopeRiftParams(g);
  const speed = clamp(params.speed, 0.2, 2.4);
  const idleRate = g.prefersReducedMotion ? 0.025 : 0.12;
  const activeRate = state.activity.x * speed * 0.34;
  state.phase = wrapAngleSigned(state.phase + (idleRate + activeRate) * updateDt);

  return state;
}

export function applyKaleidoscopeRiftForces(ball, dt) {
  const g = getGlobals();
  if (!isKaleidoscopeRiftMode(g.currentMode)) return;

  const canvas = g.canvas;
  if (!canvas || !ball) return;

  const params = getKaleidoscopeRiftParams(g);
  const state = updateKaleidoscopeRiftMotion(g, dt);
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  const ringT = clamp(ball._riftRingT ?? 0.5, 0, 1);
  const ringDir = (ball._riftRing || 0) % 2 === 0 ? 1 : -1;
  const seed = ball._riftSeed ?? 0;
  const shear = state.shear.x * params.shear * ringDir * (0.36 + ringT * 0.9);
  const wave = Math.sin(state.phase * 2.4 + seed + ringT * TAU) * state.open.x * 0.16;
  const theta = (ball._riftTheta0 ?? 0) + shear + wave;
  const radialWave = Math.cos((state.pointerAngle - theta) * 2 + seed) * state.open.x * (0.08 + ringT * 0.12);
  const targetR = (ball._riftRadiusBase ?? Math.min(canvas.width, canvas.height) * 0.25) * (1 + radialWave);
  const targetX = cx + Math.cos(theta) * targetR;
  const targetY = cy + Math.sin(theta) * targetR;
  const speed = clamp(params.speed, 0.2, 2.4);
  const spring = 16 + speed * 16;
  const damp = 7.5 + speed * 3.5;

  ball.vx += ((targetX - ball.x) * spring - ball.vx * damp) * dt;
  ball.vy += ((targetY - ball.y) * spring - ball.vy * damp) * dt;
  ball.vx *= 0.996;
  ball.vy *= 0.996;
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

  // Use reduced wedge count on mobile for performance (50% fewer draw calls)
  const isMobile = g.isMobile || g.isMobileViewport;
  const wedgesRaw = isMobile
    ? (g.kaleidoscope3WedgesMobile ?? 5)
    : (getKaleidoscopeParams(g).wedges ?? 12);
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
  const pointerInCanvas = g.pointerInCanvas ?? g.mouseInCanvas;
  const inputX = Number.isFinite(g.pointerX) ? g.pointerX : g.mouseX;
  const inputY = Number.isFinite(g.pointerY) ? g.pointerY : g.mouseY;
  const pointerValid = pointerInCanvas && Number.isFinite(inputX) && Number.isFinite(inputY);
  const pointerSequence = g.pointerSequence || 0;
  const mx = pointerValid ? inputX : cx;
  const my = pointerValid ? inputY : cy;
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
      pointerX: { x: 0, v: 0 },
      pointerY: { x: 0, v: 0 },
      influence: { x: 0, v: 0 },
      idlePhase: 0,
      pointerWasValid: false,
      lastPointerSequence: null
    };
  }
  const morph = g._kaleiMorph;

  const speed = clamp(getKaleidoscopeParams(g).speed ?? 1.0, 0.2, 2.0);
  const complexity = getKaleidoscopeComplexity(g);
  const movementActivity = clamp(g._kaleiActivity ?? 0, 0, 1);
  const touchDragActive = Boolean(isMobile && pointerValid && g.pointerActive === true && (g.pointerType === 'touch' || g.pointerType === 'pen'));
  const mobileMorphScale = isMobile
    ? (touchDragActive ? MOBILE_TOUCH_MORPH_SCALE : MOBILE_MORPH_SCALE)
    : 1;
  const activityFloor = movementActivity * (touchDragActive ? 0.68 : 0.5);
  const pointerStrengthTarget = pointerValid
    ? clamp(
      Math.max(
        Math.pow(mDistN, 0.85) * mobileMorphScale,
        activityFloor * mobileMorphScale
      ),
      0,
      1
    )
    : 0;
  const pointerXNormTarget = pointerValid ? clamp(mdx / Math.max(1, w * 0.5), -1, 1) : 0;
  const pointerYNormTarget = pointerValid ? clamp(mdy / Math.max(1, h * 0.5), -1, 1) : 0;

  if (pointerValid && (!morph.pointerWasValid || morph.lastPointerSequence !== pointerSequence || g.pointerJustEnteredCanvas === true)) {
    morph.influence.x = pointerStrengthTarget;
    morph.influence.v = 0;
    morph.pointerX.x = pointerXNormTarget;
    morph.pointerX.v = 0;
    morph.pointerY.x = pointerYNormTarget;
    morph.pointerY.v = 0;
    morph.lastPointerSequence = pointerSequence;
  }
  morph.pointerWasValid = pointerValid;

  // Smooth normalized pointer intent first so the visual fold reacts to motion as a glide
  // instead of binding directly to raw cursor position.
  springTo(morph.influence, pointerStrengthTarget, dt, pointerValid ? 5.2 : 2.4);
  springTo(morph.pointerX, pointerXNormTarget, dt, 4.4);
  springTo(morph.pointerY, pointerYNormTarget, dt, 4.4);

  const pointerStrength = clamp(morph.influence.x, 0, 1);
  const pointerXNorm = morph.pointerX.x;
  const pointerYNorm = morph.pointerY.x;

  // Idle evolution: slow continuous rotation when mouse isn't moving
  // This keeps the kaleidoscope "alive" and mesmerizing even when idle
  const idleSpeed = g.kaleidoscopeIdleSpeed ?? 0.08; // radians per second base
  const idleSpeedScaled = idleSpeed * complexity * (g.prefersReducedMotion ? 0 : 1) * (1 - pointerStrength * 0.85);
  morph.idlePhase = wrapAngleSigned(morph.idlePhase + idleSpeedScaled * dt);

  const panRangePx = Math.min(w, h) * (0.085 + 0.07 * speed) * mobileMorphScale;
  const panStrength = (0.72 + 0.2 * complexity) * pointerStrength;
  const panXTarget = pointerXNorm * panRangePx * panStrength;
  const panYTarget = pointerYNorm * panRangePx * panStrength;
  const phaseAmplitude = (0.34 + 0.11 * complexity) * mobileMorphScale;
  const phaseOffset = ((pointerXNorm * 0.32) + (pointerYNorm * 0.18)) * mobileMorphScale;
  const phaseTarget = morph.idlePhase + (mouseAngle * phaseAmplitude + phaseOffset) * pointerStrength;

  springTo(morph.phase, phaseTarget, dt, 4.2);
  springTo(morph.panX, panXTarget, dt, 4.8);
  springTo(morph.panY, panYTarget, dt, 4.8);

  const phase = morph.phase.x;
  const panX = morph.panX.x;
  const panY = morph.panY.x;

  // "Breathing" depth: as you move the mouse outward/inward, the rings zoom.
  const speed01 = clamp((speed - 0.2) / 1.8, 0, 1);
  const zoomRange = (0.3 + 0.2 * speed01) * (isMobile ? 0.94 : 1); // desktop 0.30..0.50
  const zoom = 1 - zoomRange + (1 - mDistN) * (2 * zoomRange); // maps to [1-zoomRange, 1+zoomRange]

  const { cos: wedgeCos, sin: wedgeSin } = getWedgeTrigCache(g, wedges, wedgeAngle);

  // Draw
  for (let bi = 0; bi < balls.length; bi++) {
    const ball = balls[bi];
    const visualRadius = ball.r * Math.max(0, Math.min(1, ball.visualScale ?? 1));
    if (visualRadius <= 0.05) continue;
    const cullMargin = visualRadius + 4 * (g.DPR || 1);

    // Center-relative coords WITH pan offset. Pan shifts which part gets sampled = morphing.
    const rx = (ball.x - cx) + panX;
    const ry = (ball.y - cy) + panY;
    // Scale radius to fill entire screen. Increased from 1.8 to 3.7 to cover full viewport
    // and beyond (accounts for expanded spawn area and ensures no empty edges).
    const fillScale = (isMobile ? 4.05 : 3.7) * unit;
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

    // Replicate across wedges using precomputed cos/sin + angle addition formula
    // cos(a+b) = cos(a)cos(b) - sin(a)sin(b)
    // sin(a+b) = sin(a)cos(b) + cos(a)sin(b)
    const localCos = Math.cos(local);
    const localSin = Math.sin(local);
    
    for (let wi = 0; wi < wedges; wi++) {
      // Use angle addition formula instead of Math.cos/sin(outA)
      const baseCos = wedgeCos[wi];
      const baseSin = wedgeSin[wi];
      const outCos = baseCos * localCos - baseSin * localSin;
      const outSin = baseSin * localCos + baseCos * localSin;

      const x = cx + outCos * r;
      const y = cy + outSin * r;
      if (x < -cullMargin || x > w + cullMargin || y < -cullMargin || y > h + cullMargin) continue;

      // Draw the shared pebble silhouette in the mirrored wedge.
      drawPebbleBody(ctx, ball, x, y, visualRadius, ball.color, g, {
        alpha: ball.alpha < 1 ? ball.alpha : 1,
        rotationRad: ball.theta || 0,
      });
    }
  }
}

export function renderKaleidoscopeRift(ctx) {
  const g = getGlobals();
  if (!isKaleidoscopeRiftMode(g.currentMode)) return;

  const canvas = g.canvas;
  if (!canvas) return;

  const balls = g.balls;
  const w = canvas.width;
  const h = canvas.height;
  const isMobile = g.isMobile || g.isMobileViewport;
  const params = getKaleidoscopeRiftParams(g);
  const spokesRaw = isMobile ? params.mobileSpokes : params.spokes;
  const spokes = clamp(Math.round(spokesRaw), 3, 16);
  const wedgeAngle = TAU / spokes;
  const cx = getLensCenterX(canvas);
  const cy = getLensCenterY(canvas);
  const dt = getRenderDtSeconds();
  const state = updateKaleidoscopeRiftMotion(g, dt);
  const cullPad = 18 * (g.DPR || 1);
  const period = 2 * wedgeAngle;
  const phase = state.phase * 0.18;
  const open = clamp(state.open.x, 0, 1);

  for (let bi = 0; bi < balls.length; bi += 1) {
    const ball = balls[bi];
    const visualRadius = ball.r * Math.max(0, Math.min(1, ball.visualScale ?? 1));
    if (visualRadius <= 0.05) continue;

    const rx = ball.x - cx;
    const ry = ball.y - cy;
    let local = Math.atan2(ry, rx);
    local = ((local % period) + period) % period;
    if (local > wedgeAngle) local = period - local;
    const baseR = Math.max(EPS, Math.hypot(rx, ry));
    const ringT = clamp(ball._riftRingT ?? 0.5, 0, 1);
    const seed = ball._riftSeed ?? 0;
    const radiusPulse = 1 + Math.sin(state.phase * 3 + seed) * open * 0.045;
    const drawRadius = visualRadius * (0.9 + ringT * 0.18);
    const alpha = ball.alpha < 1 ? ball.alpha : 1;

    for (let wi = 0; wi < spokes; wi += 1) {
      const mirroredLocal = wi % 2 === 0 ? local : wedgeAngle - local;
      const ringDrift = phase * (wi % 2 === 0 ? 1 : -1) * (0.35 + ringT);
      const outA = wi * wedgeAngle + mirroredLocal + ringDrift;
      const outR = baseR * radiusPulse * (1 + Math.sin(wi * 1.7 + seed + state.phase) * open * 0.025);
      const x = cx + Math.cos(outA) * outR;
      const y = cy + Math.sin(outA) * outR;

      if (x < -cullPad || x > w + cullPad || y < -cullPad || y > h + cullPad) continue;

      drawPebbleBody(ctx, ball, x, y, drawRadius, ball.color, g, {
        alpha,
        rotationRad: (ball.theta || 0) + outA * 0.12,
      });
    }
  }
}
