// Weave Field: discipline streams crossing into a bounded fabric.

import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { Ball } from '../physics/Ball.js';
import { MODES } from '../core/constants.js';
import { pickRandomColorWithIndex } from '../visual/colors.js';
import { randomRadiusForMode } from '../utils/ball-sizing.js';

const TAU = Math.PI * 2;
const HORIZONTAL = 0;
const VERTICAL = 1;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampInt(value, min, max, fallback) {
  const next = Math.round(Number(value));
  if (!Number.isFinite(next)) return fallback;
  return Math.min(max, Math.max(min, next));
}

function smoothstep01(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function wrap01(value) {
  return value - Math.floor(value);
}

function prefersReducedMotion() {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  } catch (e) {
    return false;
  }
}

function getLaneMargin(g, canvas) {
  const dpr = g.DPR || 1;
  const maxR = Math.max(g.R_MAX || 18, g.R_MED || 18);
  const wi = Number(g.wallInset);
  const wallInset = Math.max(0, Number.isFinite(wi) ? wi : 0) * dpr;
  const edgeRatio = Math.min(canvas.width, canvas.height) * 0.05;
  return Math.max(wallInset + maxR * 2.5, edgeRatio);
}

function getLaneBase(lane, lanes, min, span) {
  if (lanes <= 1) return min + span * 0.5;
  return min + ((lane + 0.5) / lanes) * span;
}

function isCompactWeaveViewport(g, canvas) {
  const isMobileClass = g.isMobile || g.isMobileViewport;
  const portrait = canvas.height > canvas.width * 1.12;
  return Boolean(isMobileClass || portrait);
}

function getEffectiveLaneCount(g, canvas, requestedLanes) {
  const lanes = clampInt(requestedLanes, 3, 9, 4);
  return isCompactWeaveViewport(g, canvas) ? Math.min(lanes, 3) : lanes;
}

function prepareFrame(g, state, dt) {
  const canvas = g.canvas;
  const compact = isCompactWeaveViewport(g, canvas);
  state.compact = compact;
  const lanes = state.lanes;
  const margin = getLaneMargin(g, canvas);
  const minX = margin;
  const minY = margin;
  const spanX = Math.max(1, canvas.width - margin * 2);
  const spanY = Math.max(1, canvas.height - margin * 2);
  const reduced = state.reducedMotion === true;
  const dpr = g.DPR || 1;
  const progressSeconds = Math.max(4, Number(g.weaveFieldProgressSeconds ?? 16));
  const weaveBlend = smoothstep01(state.time / progressSeconds);
  const pointerRadius = Math.max(0, Number(g.weaveFieldPointerRadius ?? 190)) * dpr * (compact ? 0.86 : 1);
  const damping = clamp(Number(g.weaveFieldDamping ?? 0.91), 0.7, 0.995);
  const maxSpeed = Math.max(1, Number(g.weaveFieldMaxSpeed ?? 920)) * dpr;

  state.frame = {
    lanes,
    minX,
    minY,
    spanX,
    spanY,
    flowSpeed: Math.max(0, Number(g.weaveFieldFlowSpeed ?? 74)) * dpr * (reduced ? 0.22 : 1) * (compact ? 0.88 : 1),
    progressSeconds,
    weaveBlend,
    weaveStrength: clamp(Number(g.weaveFieldWeaveStrength ?? 0.72), 0, 1.2) * weaveBlend * (reduced ? 0.45 : 1) * (compact ? 0.92 : 1),
    laneTension: Math.max(0, Number(g.weaveFieldLaneTension ?? 7.6)) * (compact ? 0.9 : 1),
    waveCount: Math.max(2, lanes - 1),
    centerPull: weaveBlend * (compact ? 0.06 : 0.045),
    amplitudeRatio: compact ? 0.28 : 0.34,
    pointerRadius,
    pointerRadiusSq: pointerRadius * pointerRadius,
    pointerStrength: Math.max(0, Number(g.weaveFieldPointerRepelStrength ?? 22000)),
    pointerActive: g.mouseInCanvas && pointerRadius > 0,
    dampingFactor: Math.pow(damping, dt * 60),
    maxSpeed,
    maxSpeedSq: maxSpeed * maxSpeed
  };

  return state.frame;
}

function getFrameState(g, ball, dt) {
  const state = g.weaveFieldState;
  if (!state) return null;
  if (ball === g.balls[0] || !state.frame) {
    state.time += dt;
    state.reducedMotion = prefersReducedMotion();
    return prepareFrame(g, state, dt);
  }
  return state.frame;
}

function seedBall(g, family, lane, groupSlot, groupCount, lanes) {
  const canvas = g.canvas;
  const r = randomRadiusForMode(g, MODES.WEAVE_FIELD);
  const { color, distributionIndex } = pickRandomColorWithIndex();
  const ball = new Ball(0, 0, r, color);
  const lanePhase = lanes > 1 ? lane / lanes : 0;
  const slotPhase = (groupSlot + 0.35) / Math.max(1, groupCount);
  const direction = ((lane + family) % 2 === 0) ? 1 : -1;

  ball.distributionIndex = distributionIndex;
  ball._weave = {
    family,
    lane,
    phase: wrap01(slotPhase + lanePhase * 0.37),
    direction,
    speedMul: 0.84 + Math.random() * 0.34,
    pathPhase: Math.random() * TAU + lane * 0.71,
    baseRadius: r
  };
  ball.vx = 0;
  ball.vy = 0;
  ball.omega = 0;
  ball.driftAx = 0;
  ball.driftTime = 0;
  ball._noSquash = true;
  ball.isSleeping = false;

  // Place on the initial straight stream so first paint is already composed.
  const margin = getLaneMargin(g, canvas);
  const minX = margin;
  const minY = margin;
  const spanX = Math.max(1, canvas.width - margin * 2);
  const spanY = Math.max(1, canvas.height - margin * 2);
  const p = ball._weave.direction > 0 ? ball._weave.phase : 1 - ball._weave.phase;
  if (family === HORIZONTAL) {
    ball.x = minX + p * spanX;
    ball.y = getLaneBase(lane, lanes, minY, spanY);
  } else {
    ball.x = getLaneBase(lane, lanes, minX, spanX);
    ball.y = minY + p * spanY;
  }

  g.balls.push(ball);
}

export function initializeWeaveField() {
  const g = getGlobals();
  clearBalls();

  const canvas = g.canvas;
  if (!canvas) return;

  const lanes = getEffectiveLaneCount(g, canvas, g.weaveFieldLaneCount ?? 4);
  const baseCount = clampInt(g.weaveFieldBallCount ?? 132, 48, 260, 132);
  const count = getMobileAdjustedCount(baseCount);
  if (count <= 0) return;

  g.weaveFieldState = {
    time: 0,
    compact: isCompactWeaveViewport(g, canvas),
    lanes,
    reducedMotion: prefersReducedMotion()
  };

  const groupCount = Math.ceil(count / Math.max(1, lanes * 2));
  const groupSlots = new Int16Array(lanes * 2);

  for (let i = 0; i < count; i++) {
    const group = i % (lanes * 2);
    const family = group % 2 === 0 ? HORIZONTAL : VERTICAL;
    const lane = Math.floor(group / 2);
    const slot = groupSlots[group]++;
    seedBall(g, family, lane, slot, groupCount, lanes);
  }
}

export function applyWeaveFieldForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.WEAVE_FIELD || !ball?._weave || !g.canvas) return;

  const canvas = g.canvas;
  const state = g.weaveFieldState;
  const frame = getFrameState(g, ball, dt);
  if (!state || !frame) return;

  const family = ball._weave.family;
  const pathLength = family === HORIZONTAL ? frame.spanX : frame.spanY;
  const travel = pathLength > 0 ? (state.time * frame.flowSpeed * ball._weave.speedMul) / pathLength : 0;
  const signedProgress = ball._weave.direction > 0
    ? ball._weave.phase + travel
    : ball._weave.phase - travel;
  const p = wrap01(signedProgress);
  const visualP = ball._weave.direction > 0 ? p : 1 - p;

  let targetX;
  let targetY;
  if (family === HORIZONTAL) {
    const baseY = getLaneBase(ball._weave.lane, frame.lanes, frame.minY, frame.spanY);
    const amp = (frame.spanY / Math.max(1, frame.lanes)) * frame.amplitudeRatio * frame.weaveStrength;
    targetX = frame.minX + visualP * frame.spanX;
    targetY = baseY + Math.sin(visualP * TAU * frame.waveCount + ball._weave.pathPhase) * amp;
  } else {
    const baseX = getLaneBase(ball._weave.lane, frame.lanes, frame.minX, frame.spanX);
    const amp = (frame.spanX / Math.max(1, frame.lanes)) * frame.amplitudeRatio * frame.weaveStrength;
    targetX = baseX + Math.sin(visualP * TAU * frame.waveCount + ball._weave.pathPhase + Math.PI * 0.5) * amp;
    targetY = frame.minY + visualP * frame.spanY;
  }

  targetX += (canvas.width * 0.5 - targetX) * frame.centerPull;
  targetY += (canvas.height * 0.5 - targetY) * frame.centerPull;

  const dx = targetX - ball.x;
  const dy = targetY - ball.y;
  ball.vx += dx * frame.laneTension * dt;
  ball.vy += dy * frame.laneTension * dt;

  if (frame.pointerActive) {
    const mdx = ball.x - g.mouseX;
    const mdy = ball.y - g.mouseY;
    const d2 = mdx * mdx + mdy * mdy;
    if (d2 > 0.01 && d2 < frame.pointerRadiusSq) {
      const dist = Math.sqrt(d2);
      const q = 1 - dist / frame.pointerRadius;
      const strength = frame.pointerStrength * q * q;
      const massScale = Math.max(0.25, ball.m / g.MASS_BASELINE_KG);
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

  ball.alpha = 1;
  ball.r = ball._weave.baseRadius;
  ball.rBase = ball._weave.baseRadius;
  ball.isSleeping = false;
}
