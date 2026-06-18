// Pressure Crucible: disciplines compressed inside a bounded chamber.

import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { Ball, clampBallPositionToWallInterior } from '../physics/Ball.js';
import { MODES } from '../core/constants.js';
import { pickRandomColorWithIndex } from '../visual/colors.js';
import { randomRadiusForMode } from '../utils/ball-sizing.js';

const TAU = Math.PI * 2;
const INHALE_END = 0.45;
const HOLD_END = 0.65;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampInt(value, min, max, fallback) {
  const next = Math.round(Number(value));
  if (!Number.isFinite(next)) return fallback;
  return Math.min(max, Math.max(min, next));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep01(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function prefersReducedMotion() {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  } catch (e) {
    return false;
  }
}

function isCompactViewport(g, canvas) {
  return Boolean(g.isMobile || g.isMobileViewport || canvas.height > canvas.width * 1.12);
}

function getSafeRadius(g, canvas) {
  const dpr = g.DPR || 1;
  const maxR = Math.max(g.R_MAX || 18, g.R_MED || 18);
  const wi = Number(g.wallInset);
  const wallInset = Math.max(0, Number.isFinite(wi) ? wi : 0) * dpr;
  const edgeBreathingRoom = Math.max(maxR * 3.2, Math.min(canvas.width, canvas.height) * 0.055);
  return Math.max(maxR * 4, Math.min(canvas.width, canvas.height) * 0.5 - wallInset - edgeBreathingRoom);
}

function getCoreShift(g, canvas, pointerRadius) {
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  if (!g.mouseInCanvas || pointerRadius <= 0) return { x: cx, y: cy };

  const dx = cx - g.mouseX;
  const dy = cy - g.mouseY;
  const dist = Math.hypot(dx, dy);
  if (dist <= 1e-3) return { x: cx, y: cy };

  const minDim = Math.min(canvas.width, canvas.height);
  const q = 1 - clamp(dist / Math.max(pointerRadius, minDim * 0.42), 0, 1);
  const shift = minDim * 0.08 * q;
  return {
    x: cx + (dx / dist) * shift,
    y: cy + (dy / dist) * shift
  };
}

function prepareFrame(g, state, dt) {
  const canvas = g.canvas;
  const compact = isCompactViewport(g, canvas);
  const reduced = prefersReducedMotion();
  const dpr = g.DPR || 1;
  const cycleSeconds = Math.max(3.2, Number(g.pressureCrucibleCycleSeconds ?? 6.4));
  const phaseRaw = state.time / cycleSeconds;
  const cycleIndex = Math.floor(phaseRaw);
  const phase = phaseRaw - cycleIndex;

  let compression01;
  let rebound01 = 0;
  let radius01;
  if (phase < INHALE_END) {
    compression01 = smoothstep01(phase / INHALE_END);
    radius01 = lerp(0.82, 0.16, compression01);
  } else if (phase < HOLD_END) {
    const hold01 = smoothstep01((phase - INHALE_END) / (HOLD_END - INHALE_END));
    compression01 = 1;
    radius01 = lerp(0.16, 0.12, hold01);
  } else {
    rebound01 = smoothstep01((phase - HOLD_END) / (1 - HOLD_END));
    compression01 = 1 - rebound01;
    radius01 = lerp(0.12, 0.84, rebound01);
  }

  if (reduced) {
    radius01 = Math.max(radius01, 0.34);
    compression01 *= 0.42;
    rebound01 *= 0.35;
  }

  const pointerRadius = Math.max(0, Number(g.pressureCruciblePointerRadius ?? 240)) * dpr * (compact ? 0.82 : 1);
  const core = getCoreShift(g, canvas, pointerRadius);
  const safeRadius = getSafeRadius(g, canvas);
  const medR = Math.max(1, g.R_MED || 12);
  const count = Math.max(1, g.balls?.length || 1);
  const packedMinRadius = Math.sqrt(count) * medR * (compact ? 0.58 : 0.64);
  const baseTargetRadius = Math.max(packedMinRadius, safeRadius * radius01);
  const damping = clamp(Number(g.pressureCrucibleDamping ?? 0.965), 0.72, 0.995);

  state.frame = {
    compact,
    reduced,
    time: state.time,
    cycleIndex,
    phase,
    compression01,
    rebound01,
    coreX: core.x,
    coreY: core.y,
    baseTargetRadius,
    safeRadius,
    spin: state.time * (compact ? 0.08 : 0.11),
    angleWarp: (0.08 + compression01 * 0.11) * (compact ? 0.7 : 1),
    targetPull: Math.max(0, Number(g.pressureCrucibleCompressionStrength ?? 18)) * (compact ? 0.78 : 1) * (reduced ? 0.45 : 1),
    reboundAccel: Math.max(0, Number(g.pressureCrucibleReboundStrength ?? 26000)) * dpr * (compact ? 0.74 : 1) * (reduced ? 0.35 : 1),
    pointerRadius,
    pointerRadiusSq: pointerRadius * pointerRadius,
    pointerStrength: Math.max(0, Number(g.pressureCruciblePointerRepelStrength ?? 30000)) * (compact ? 0.76 : 1) * (reduced ? 0.35 : 1),
    pointerActive: g.mouseInCanvas && pointerRadius > 0,
    dampingFactor: Math.pow(damping, dt * 60),
    maxSpeed: Math.max(180, Number(g.pressureCrucibleMaxSpeed ?? 2100)) * dpr * (compact ? 0.8 : 1),
    impulseSpeed: Math.max(0, Number(g.pressureCrucibleReboundStrength ?? 26000)) * dpr * 0.028 * (compact ? 0.72 : 1) * (reduced ? 0.25 : 1)
  };

  state.frame.maxSpeedSq = state.frame.maxSpeed * state.frame.maxSpeed;
  return state.frame;
}

function getFrameState(g, ball, dt) {
  const state = g.pressureCrucibleState;
  if (!state) return null;
  if (ball === g.balls[0] || !state.frame) {
    state.time += dt;
    return prepareFrame(g, state, dt);
  }
  return state.frame;
}

function seedBall(g, index, count) {
  const canvas = g.canvas;
  const r = randomRadiusForMode(g, MODES.PRESSURE_CRUCIBLE);
  const { color, distributionIndex } = pickRandomColorWithIndex();
  const ball = new Ball(canvas.width * 0.5, canvas.height * 0.5, r, color);
  const safeRadius = getSafeRadius(g, canvas);
  const ring = (index + 0.5) / Math.max(1, count);
  const angle = index * (Math.PI * (3 - Math.sqrt(5)));
  const radialBias = 0.44 + Math.sqrt(ring) * 0.58;
  const spawnRadius = safeRadius * (0.52 + (index % 5) * 0.075);

  ball.x = canvas.width * 0.5 + Math.cos(angle) * spawnRadius;
  ball.y = canvas.height * 0.5 + Math.sin(angle) * spawnRadius;
  clampBallPositionToWallInterior(ball, canvas.width, canvas.height);
  ball.distributionIndex = distributionIndex;
  ball.m = (g.MASS_BASELINE_KG || g.ballMassKg || 240) * Math.max(0.5, Number(g.pressureCrucibleMassMultiplier ?? 1.8));
  ball.vx = -Math.cos(angle) * 60 * (g.DPR || 1);
  ball.vy = -Math.sin(angle) * 60 * (g.DPR || 1);
  ball.omega = 0;
  ball.alpha = 1;
  ball.isSleeping = false;
  ball._pressureCrucible = {
    angle,
    phase: Math.random() * TAU,
    radialBias,
    impulseCycle: -1,
    baseRadius: r
  };
  g.balls.push(ball);
}

export function initializePressureCrucible() {
  const g = getGlobals();
  clearBalls();

  const canvas = g.canvas;
  if (!canvas) return;

  const baseCount = clampInt(g.pressureCrucibleBallCount ?? 128, 48, 220, 128);
  const count = getMobileAdjustedCount(baseCount);
  if (count <= 0) return;

  g.pressureCrucibleState = {
    time: 0,
    frame: null
  };

  for (let i = 0; i < count; i++) {
    seedBall(g, i, count);
  }
}

export function applyPressureCrucibleForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.PRESSURE_CRUCIBLE || !ball?._pressureCrucible || !g.canvas) return;

  const frame = getFrameState(g, ball, dt);
  if (!frame) return;

  const meta = ball._pressureCrucible;
  const massScale = Math.max(0.25, ball.m / (g.MASS_BASELINE_KG || 240));
  const angle = meta.angle + frame.spin + Math.sin(frame.time * 0.74 + meta.phase) * frame.angleWarp;
  const radiusScale = 0.36 + meta.radialBias * 0.72;
  const targetRadius = frame.baseTargetRadius * radiusScale;
  const targetX = frame.coreX + Math.cos(angle) * targetRadius;
  const targetY = frame.coreY + Math.sin(angle) * targetRadius;
  const dx = targetX - ball.x;
  const dy = targetY - ball.y;
  const pullMul = 0.55 + frame.compression01 * 0.7 + frame.rebound01 * 0.18;
  ball.vx += dx * frame.targetPull * pullMul * dt / massScale;
  ball.vy += dy * frame.targetPull * pullMul * dt / massScale;

  const fromCoreX = ball.x - frame.coreX;
  const fromCoreY = ball.y - frame.coreY;
  const fromCoreDist = Math.max(1e-3, Math.hypot(fromCoreX, fromCoreY));
  const nx = fromCoreX / fromCoreDist;
  const ny = fromCoreY / fromCoreDist;

  if (frame.phase >= HOLD_END && meta.impulseCycle !== frame.cycleIndex) {
    const impulse = frame.impulseSpeed * (0.72 + meta.radialBias * 0.36);
    ball.vx += nx * impulse / massScale;
    ball.vy += ny * impulse / massScale;
    ball.omega += (meta.radialBias - 0.7) * 1.2;
    meta.impulseCycle = frame.cycleIndex;
  }

  if (frame.rebound01 > 0) {
    const q = Math.sin(frame.rebound01 * Math.PI);
    ball.vx += nx * frame.reboundAccel * q * dt / massScale;
    ball.vy += ny * frame.reboundAccel * q * dt / massScale;
  }

  if (frame.pointerActive) {
    const mdx = ball.x - g.mouseX;
    const mdy = ball.y - g.mouseY;
    const d2 = mdx * mdx + mdy * mdy;
    if (d2 > 0.01 && d2 < frame.pointerRadiusSq) {
      const dist = Math.sqrt(d2);
      const q = 1 - dist / frame.pointerRadius;
      const strength = frame.pointerStrength * q * q;
      ball.vx += (mdx / dist) * strength * dt / massScale;
      ball.vy += (mdy / dist) * strength * dt / massScale;
    }
  }

  ball.vx *= frame.dampingFactor;
  ball.vy *= frame.dampingFactor;

  const speedSq = ball.vx * ball.vx + ball.vy * ball.vy;
  if (speedSq > frame.maxSpeedSq) {
    const scale = frame.maxSpeed / Math.sqrt(speedSq);
    ball.vx *= scale;
    ball.vy *= scale;
  }

  ball.r = meta.baseRadius;
  ball.rBase = meta.baseRadius;
  ball.alpha = 1;
  ball.isSleeping = false;
}
