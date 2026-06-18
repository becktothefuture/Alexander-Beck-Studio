import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { Ball, clampBallPositionToWallInterior } from '../physics/Ball.js';
import { MODES } from '../core/constants.js';
import { pickRandomColorWithIndex } from '../visual/colors.js';

const TAU = Math.PI * 2;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampInt(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep01(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function fract(value) {
  return value - Math.floor(value);
}

function hash01(seed) {
  return fract(Math.sin(seed * 127.1 + 311.7) * 43758.5453123);
}

function signedHash(seed) {
  return hash01(seed) * 2 - 1;
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isCompactViewport(g) {
  const dpr = Math.max(1, g.DPR || 1);
  const canvas = g.canvas;
  const width = Number(g.W || (canvas ? canvas.width / dpr : 0)) || 0;
  const height = Number(g.H || (canvas ? canvas.height / dpr : 0)) || 0;
  return Boolean(g.isMobile || g.isMobileViewport) || Math.min(width, height) <= 720 || height > width * 1.12;
}

function getCanvasCenter(canvas) {
  return {
    x: canvas.width * 0.5,
    y: canvas.height * 0.5,
  };
}

function getInteriorMargin(g, canvas, extra = 0) {
  const dpr = Math.max(1, g.DPR || 1);
  const inset = Math.max(0, (g.wallInset ?? 0) * dpr);
  return Math.max(inset + extra, (g.R_MAX || 18) * 3);
}

function clampPointToInterior(g, canvas, x, y, pad = 0) {
  const margin = getInteriorMargin(g, canvas, pad);
  return {
    x: clamp(x, margin, Math.max(margin, canvas.width - margin)),
    y: clamp(y, margin, Math.max(margin, canvas.height - margin)),
  };
}

function getFluxAnchor(g, canvas, compact) {
  const center = getCanvasCenter(canvas);
  const dpr = Math.max(1, g.DPR || 1);
  const minDim = Math.min(canvas.width, canvas.height);
  const x = compact ? center.x : center.x + canvas.width * 0.06;
  const y = compact ? center.y - canvas.height * 0.235 : center.y - canvas.height * 0.16;
  return clampPointToInterior(g, canvas, x, y, 88 * dpr);
}

function getFluxState() {
  const g = getGlobals();
  if (!g.pressureCrucibleState) {
    g.pressureCrucibleState = createFluxState();
  }
  return g.pressureCrucibleState;
}

function createFluxState() {
  return {
    time: 0,
    frameId: 0,
    axisX: 1,
    axisY: 0,
    pointerX: 0,
    pointerY: 0,
    pointerVx: 0,
    pointerVy: 0,
    pointerSpeed: 0,
    pointerSpeed01: 0,
    lastPointerX: Number.NaN,
    lastPointerY: Number.NaN,
    pointerActive: false,
    positiveX: 0,
    positiveY: 0,
    negativeX: 0,
    negativeY: 0,
    anchorX: 0,
    anchorY: 0,
    influence01: 0,
    reducedMotion: false,
    compact: false,
    particleSize: 4,
    centroidX: 0,
    centroidY: 0,
    averageVx: 0,
    averageVy: 0,
    neighborRadius: 0,
    gridCellSize: 1,
    grid: new Map(),
    gridBuckets: [],
    gridBucketCount: 0,
  };
}

function getParticleSize(g, compact) {
  const dpr = Math.max(1, g.DPR || 1);
  const size = clamp(Number(g.pressureCrucibleParticleSize ?? 5.9) || 5.9, 1.5, 10);
  return size * dpr * (compact ? 0.86 : 1);
}

function prepareFrame(g, state, dt) {
  const canvas = g.canvas;
  if (!canvas) return null;

  const step = Math.max(1 / 240, Math.min(dt || 0, 1 / 20));
  state.time += step;
  state.frameId += 1;

  const dpr = Math.max(1, g.DPR || 1);
  const compact = isCompactViewport(g);
  const reducedMotion = prefersReducedMotion();
  const anchor = getFluxAnchor(g, canvas, compact);
  const pointerActive = Boolean(g.mouseInCanvas);
  const idleTime = state.time * (reducedMotion ? 0.35 : 1);
  const idleRadius = Math.min(canvas.width, canvas.height) * (compact ? 0.065 : 0.105);
  const idleDriftX = (
    Math.sin(idleTime * 0.31 + 0.7) +
    Math.sin(idleTime * 0.13 + 2.4) * 0.58 +
    Math.sin(idleTime * 0.071 + 5.1) * 0.32
  ) * idleRadius * 0.62;
  const idleDriftY = (
    Math.sin(idleTime * 0.23 + 1.8) +
    Math.sin(idleTime * 0.097 + 0.2) * 0.52 +
    Math.sin(idleTime * 0.053 + 3.6) * 0.28
  ) * idleRadius * 0.42;
  const targetPointerX = pointerActive ? g.mouseX : anchor.x + idleDriftX;
  const targetPointerY = pointerActive ? g.mouseY : anchor.y + idleDriftY;
  const previousX = Number.isFinite(state.lastPointerX) ? state.lastPointerX : targetPointerX;
  const previousY = Number.isFinite(state.lastPointerY) ? state.lastPointerY : targetPointerY;
  const pointerVx = (targetPointerX - previousX) / step;
  const pointerVy = (targetPointerY - previousY) / step;
  const pointerSpeed = Math.hypot(pointerVx, pointerVy);
  const pointerSpeed01 = clamp(pointerSpeed / (2600 * dpr), 0, 1);

  let axisX = state.axisX || 1;
  let axisY = state.axisY || 0;
  if (pointerSpeed > 24 * dpr) {
    axisX = pointerVx / pointerSpeed;
    axisY = pointerVy / pointerSpeed;
  } else if (!pointerActive) {
    axisX = Math.cos(idleTime * 0.19 + 0.4) + Math.sin(idleTime * 0.061 + 2.1) * 0.38;
    axisY = Math.sin(idleTime * 0.29 + 1.2) + Math.cos(idleTime * 0.083 + 4.4) * 0.34;
  } else {
    const dx = targetPointerX - anchor.x;
    const dy = targetPointerY - anchor.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 24 * dpr) {
      axisX = lerp(axisX, dx / distance, 0.08);
      axisY = lerp(axisY, dy / distance, 0.08);
    }
  }
  const axisLength = Math.hypot(axisX, axisY) || 1;
  axisX /= axisLength;
  axisY /= axisLength;

  const pointerRadius = clamp(Number(g.pressureCruciblePointerRadius ?? 330) || 330, 120, 760) * dpr * (compact ? 0.72 : 1);
  const separation = clamp(Number(g.pressureCruciblePolaritySeparation ?? 170) || 170, 40, 420) * dpr * (compact ? 0.72 : 1);
  const idleFluxStrength = clamp(Number(g.pressureCrucibleIdleFluxStrength ?? 0.05) || 0.05, 0, 1);
  const influence01 = pointerActive
    ? clamp(0.55 + pointerSpeed01 * 0.65, 0, 1.2)
    : Math.min(idleFluxStrength, 0.12) * (reducedMotion ? 0.2 : 0.35);
  const pointerPoint = clampPointToInterior(g, canvas, targetPointerX, targetPointerY, pointerRadius * 0.2);

  state.axisX = axisX;
  state.axisY = axisY;
  state.canvasWidth = canvas.width;
  state.canvasHeight = canvas.height;
  state.pointerX = pointerPoint.x;
  state.pointerY = pointerPoint.y;
  state.pointerVx = pointerVx;
  state.pointerVy = pointerVy;
  state.pointerSpeed = pointerSpeed;
  state.pointerSpeed01 = pointerSpeed01;
  state.lastPointerX = targetPointerX;
  state.lastPointerY = targetPointerY;
  state.pointerActive = pointerActive;
  state.anchorX = anchor.x;
  state.anchorY = anchor.y;
  state.positiveX = pointerPoint.x + axisX * separation * 0.5;
  state.positiveY = pointerPoint.y + axisY * separation * 0.5;
  state.negativeX = pointerPoint.x - axisX * separation * 0.5;
  state.negativeY = pointerPoint.y - axisY * separation * 0.5;
  state.pointerRadius = pointerRadius;
  state.influence01 = influence01;
  state.reducedMotion = reducedMotion;
  state.compact = compact;
  state.particleSize = getParticleSize(g, compact);
  buildFluxFrameStats(g, state);
  return state;
}

function getFrameState(g, ball, dt) {
  const state = getFluxState();
  const balls = g.balls || [];
  if (!state.frameId || ball === balls[0]) {
    return prepareFrame(g, state, dt);
  }
  return state;
}

function fieldVectorAt(x, y, state, polarity, dpr) {
  const soft = Math.max(36 * dpr, state.pointerRadius * 0.08);
  const softSq = soft * soft;
  const px = x - state.positiveX;
  const py = y - state.positiveY;
  const nx = x - state.negativeX;
  const ny = y - state.negativeY;
  const pSq = px * px + py * py + softSq;
  const nSq = nx * nx + ny * ny + softSq;
  const pInv = 1 / Math.pow(pSq, 0.72);
  const nInv = 1 / Math.pow(nSq, 0.72);
  const fieldX = (px * pInv) - (nx * nInv);
  const fieldY = (py * pInv) - (ny * nInv);
  return {
    x: fieldX * polarity,
    y: fieldY * polarity,
  };
}

function getSwarmShape(g, canvas, compact) {
  const anchor = getFluxAnchor(g, canvas, compact);
  const minDim = Math.min(canvas.width, canvas.height);
  return {
    x: anchor.x,
    y: anchor.y,
    rx: minDim * (compact ? 0.255 : 0.3),
    ry: minDim * (compact ? 0.115 : 0.148),
    tilt: compact ? -0.04 : -0.12,
  };
}

function getFilledSwarmHome(g, canvas, index, count) {
  const compact = isCompactViewport(g);
  const shape = getSwarmShape(g, canvas, compact);
  const dpr = Math.max(1, g.DPR || 1);
  const angle = TAU * hash01(index * 11.73 + 0.19);
  const band = hash01(index * 3.97 + 7.3);
  const radialSeed = hash01(index * 17.17 + 2.1);
  const coreBias = band < 0.45 ? 1.35 : (band < 0.88 ? 0.72 : 0.48);
  const radius = Math.pow(radialSeed, coreBias) * (band < 0.45 ? 0.62 : 0.98);
  const edgeT = band > 0.9 ? smoothstep01((band - 0.9) * 10) : 0;
  const scallop = 1 + Math.sin(angle * 3.0 + index * 0.37) * 0.055 + Math.sin(angle * 5.0 + 1.4) * 0.035;
  const countT = count > 1 ? index / (count - 1) : 0;
  const localNoiseX = signedHash(index * 23.11 + 3.9) * shape.rx * (compact ? 0.032 : 0.042) * (1 - edgeT * 0.35);
  const localNoiseY = signedHash(index * 29.43 + 0.8) * shape.ry * (compact ? 0.05 : 0.065) * (1 - edgeT * 0.25);
  const localX = Math.cos(angle) * shape.rx * radius * scallop + localNoiseX;
  const localY = Math.sin(angle) * shape.ry * radius * (1 + edgeT * 0.12) + localNoiseY;
  const tiltSin = Math.sin(shape.tilt);
  const tiltCos = Math.cos(shape.tilt);
  const driftBiasX = signedHash(index * 5.91 + count * 0.07) * shape.rx * 0.035;
  const driftBiasY = Math.sin(countT * TAU * 2.0 + 0.8) * shape.ry * 0.045;
  const point = clampPointToInterior(
    g,
    canvas,
    shape.x + localX * tiltCos - localY * tiltSin + driftBiasX,
    shape.y + localX * tiltSin + localY * tiltCos + driftBiasY,
    96 * dpr
  );
  return {
    x: point.x,
    y: point.y,
    shapeX: shape.x,
    shapeY: shape.y,
    spreadT: clamp(radius, 0, 1),
    coreT: 1 - clamp(radius, 0, 1),
    phase: TAU * hash01(index * 9.31 + 1.4),
  };
}

function clearFluxGrid(state) {
  for (let i = 0; i < state.gridBucketCount; i += 1) {
    state.gridBuckets[i].length = 0;
  }
  state.grid.clear();
  state.gridBucketCount = 0;
}

function fluxGridKey(cellX, cellY) {
  return cellX * 8192 + cellY;
}

function addBallToFluxGrid(state, ball, cellSize) {
  const cellX = Math.floor(ball.x / cellSize);
  const cellY = Math.floor(ball.y / cellSize);
  const key = fluxGridKey(cellX, cellY);
  let bucket = state.grid.get(key);
  if (!bucket) {
    bucket = state.gridBuckets[state.gridBucketCount];
    if (!bucket) {
      bucket = [];
      state.gridBuckets[state.gridBucketCount] = bucket;
    }
    state.gridBucketCount += 1;
    state.grid.set(key, bucket);
  }
  bucket.push(ball);
}

function buildFluxFrameStats(g, state) {
  const balls = g.balls || [];
  const canvas = g.canvas;
  const dpr = Math.max(1, g.DPR || 1);
  const minDim = canvas ? Math.min(canvas.width, canvas.height) : 0;
  const neighborRadius = clamp(minDim * (state.compact ? 0.064 : 0.052), 48 * dpr, 132 * dpr);
  const cellSize = Math.max(1, neighborRadius);
  let sumX = 0;
  let sumY = 0;
  let sumVx = 0;
  let sumVy = 0;
  let count = 0;

  clearFluxGrid(state);
  state.neighborRadius = neighborRadius;
  state.gridCellSize = cellSize;

  for (let i = 0; i < balls.length; i += 1) {
    const ball = balls[i];
    if (!ball?._pressureFlux) continue;
    sumX += ball.x;
    sumY += ball.y;
    sumVx += ball.vx;
    sumVy += ball.vy;
    count += 1;
    addBallToFluxGrid(state, ball, cellSize);
  }

  state.centroidX = count > 0 ? sumX / count : state.anchorX;
  state.centroidY = count > 0 ? sumY / count : state.anchorY;
  state.averageVx = count > 0 ? sumVx / count : 0;
  state.averageVy = count > 0 ? sumVy / count : 0;
}

function applyLocalSwarmSteering(ball, state, step, maxSpeed, dpr, pressureQ = 0) {
  const radius = state.neighborRadius || (72 * dpr);
  const cellSize = state.gridCellSize || radius;
  const radiusSq = radius * radius;
  const separationRadius = Math.max(radius * 0.36, state.particleSize * 5.8);
  const separationSq = separationRadius * separationRadius;
  const cellX = Math.floor(ball.x / cellSize);
  const cellY = Math.floor(ball.y / cellSize);
  let neighborCount = 0;
  let alignX = 0;
  let alignY = 0;
  let centerX = 0;
  let centerY = 0;
  let separationX = 0;
  let separationY = 0;

  for (let y = cellY - 1; y <= cellY + 1; y += 1) {
    for (let x = cellX - 1; x <= cellX + 1; x += 1) {
      const bucket = state.grid.get(fluxGridKey(x, y));
      if (!bucket) continue;
      for (let i = 0; i < bucket.length; i += 1) {
        const other = bucket[i];
        if (other === ball) continue;
        const dx = ball.x - other.x;
        const dy = ball.y - other.y;
        const distSq = dx * dx + dy * dy;
        if (distSq <= 0.0001 || distSq > radiusSq) continue;
        neighborCount += 1;
        alignX += other.vx;
        alignY += other.vy;
        centerX += other.x;
        centerY += other.y;
        if (distSq < separationSq) {
          const dist = Math.sqrt(distSq);
          const q = 1 - dist / separationRadius;
          const push = q * q;
          separationX += (dx / dist) * push;
          separationY += (dy / dist) * push;
        }
      }
    }
  }

  if (neighborCount <= 0) return;

  const averageX = alignX / neighborCount;
  const averageY = alignY / neighborCount;
  const localCenterX = centerX / neighborCount;
  const localCenterY = centerY / neighborCount;
  const alignStrength = state.reducedMotion ? 0.26 : lerp(0.58, 0.38, pressureQ);
  const cohesionStrength = lerp(0.32, 0.18, pressureQ);
  const separationStrength = lerp(0.48, 0.72, pressureQ);

  ball.vx += (averageX - ball.vx) * alignStrength * step;
  ball.vy += (averageY - ball.vy) * alignStrength * step;
  ball.vx += (localCenterX - ball.x) * cohesionStrength * step;
  ball.vy += (localCenterY - ball.y) * cohesionStrength * step;
  ball.vx += separationX * maxSpeed * separationStrength * step;
  ball.vy += separationY * maxSpeed * separationStrength * step;
}

function seedFluxParticle(g, canvas, index, count, particleSize) {
  const dpr = Math.max(1, g.DPR || 1);
  const home = getFilledSwarmHome(g, canvas, index, count);
  const colorInfo = pickRandomColorWithIndex(g);
  const ball = new Ball(home.x, home.y, particleSize, colorInfo.color);
  ball.colorIndex = colorInfo.index;
  ball.r = particleSize;
  ball.rBase = particleSize;
  ball.m = 1;
  ball.vx = signedHash(index * 2.31 + 4.7) * (38 + home.spreadT * 44) * dpr;
  ball.vy = signedHash(index * 3.03 + 1.2) * (30 + home.spreadT * 34) * dpr;
  ball.alpha = 0.92;
  ball.isSleeping = false;
  ball.sleepTimer = 0;
  ball._pressureFlux = {
    homeX: home.x,
    homeY: home.y,
    spreadT: home.spreadT,
    coreT: home.coreT,
    phase: home.phase,
    polarity: index % 2 === 0 ? 1 : -1,
    baseRadius: particleSize,
  };
  clampBallPositionToWallInterior(ball, canvas.width, canvas.height);
  return ball;
}

export function initializePressureCrucible() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  clearBalls();
  g.currentMode = MODES.PRESSURE_CRUCIBLE;
  g.pressureCrucibleState = createFluxState();

  const compact = isCompactViewport(g);
  const requested = clampInt(g.pressureCrucibleBallCount ?? 144, 48, 220, 144);
  const budgeted = compact ? Math.min(requested, 96) : requested;
  const count = getMobileAdjustedCount(budgeted);
  const particleSize = getParticleSize(g, compact);
  for (let i = 0; i < count; i += 1) {
    g.balls.push(seedFluxParticle(g, canvas, i, count, particleSize));
  }
}

export function applyPressureCrucibleForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.PRESSURE_CRUCIBLE) return;

  const state = getFrameState(g, ball, dt);
  const meta = ball._pressureFlux;
  if (!state || !meta) return;

  const dpr = Math.max(1, g.DPR || 1);
  const step = Math.max(0, Math.min(dt || 0, 1 / 20));
  if (step <= 0) return;

  meta.baseRadius = state.particleSize;
  ball.rBase = state.particleSize;
  const spreadT = Number.isFinite(meta.spreadT) ? meta.spreadT : 0.5;
  const coreT = Number.isFinite(meta.coreT) ? meta.coreT : 0.35;

  const fluxStrength = clamp(Number(g.pressureCrucibleFluxStrength ?? 92000) || 92000, 0, 180000) * dpr;
  const wakeStrength = clamp(Number(g.pressureCrucibleWakeStrength ?? 1) || 1, 0, 3) * (state.reducedMotion ? 0.45 : 1);
  const maxSpeed = clamp(Number(g.pressureCrucibleMaxSpeed ?? 3800) || 3800, 300, 5200) * dpr * (state.reducedMotion ? 0.58 : 1);
  const damping = clamp(Number(g.pressureCrucibleDamping ?? 0.968) || 0.968, 0.88, 0.996);
  const influence = state.influence01;
  const toPointerX = ball.x - state.pointerX;
  const toPointerY = ball.y - state.pointerY;
  const pointerDistance = Math.hypot(toPointerX, toPointerY) || 1;
  const pointerQ = state.pointerActive && pointerDistance < state.pointerRadius
    ? smoothstep01(1 - pointerDistance / state.pointerRadius)
    : 0;
  const field = fieldVectorAt(ball.x, ball.y, state, meta.polarity, dpr);
  const fieldSpeed = Math.hypot(field.x, field.y);
  const fieldNx = fieldSpeed > 0.0001 ? field.x / fieldSpeed : 0;
  const fieldNy = fieldSpeed > 0.0001 ? field.y / fieldSpeed : 0;
  const tangentX = -fieldNy * meta.polarity;
  const tangentY = fieldNx * meta.polarity;
  const pulse = 0.72 + Math.sin(state.time * 1.9 + meta.phase) * 0.18;

  const fieldInfluence = state.pointerActive ? influence * pointerQ : influence * 0.12;
  const tangentScale = state.pointerActive ? 0.01 * pointerQ : 0.0007;
  ball.vx += field.x * fluxStrength * fieldInfluence * pulse * step;
  ball.vy += field.y * fluxStrength * fieldInfluence * pulse * step;
  ball.vx += tangentX * fluxStrength * tangentScale * (0.35 + fieldInfluence) * step;
  ball.vy += tangentY * fluxStrength * tangentScale * (0.35 + fieldInfluence) * step;

  if (pointerQ > 0) {
    const sideX = -state.axisY;
    const sideY = state.axisX;
    const radialX = toPointerX / pointerDistance;
    const radialY = toPointerY / pointerDistance;
    const sideSign = Math.sign(toPointerX * sideX + toPointerY * sideY) || meta.polarity;
    const carve = pointerQ * pointerQ * wakeStrength * (0.72 + state.pointerSpeed01 * 1.15);
    ball.vx += sideX * sideSign * maxSpeed * 3.35 * carve * step;
    ball.vy += sideY * sideSign * maxSpeed * 3.35 * carve * step;
    ball.vx += radialX * maxSpeed * 1.75 * pointerQ * wakeStrength * step;
    ball.vy += radialY * maxSpeed * 1.75 * pointerQ * wakeStrength * step;
    ball.vx += state.axisX * maxSpeed * 1.05 * state.pointerSpeed01 * pointerQ * step;
    ball.vy += state.axisY * maxSpeed * 1.05 * state.pointerSpeed01 * pointerQ * step;
    ball.r = meta.baseRadius * (1 + pointerQ * 1.38 + state.pointerSpeed01 * 0.42);
    ball.alpha = clamp(0.58 + pointerQ * 0.42, 0.58, 1);
  } else {
    ball.r = meta.baseRadius * (1 + (state.pointerActive ? 0 : influence * 0.08));
    ball.alpha = state.reducedMotion ? 0.78 : 0.86;
  }

  applyLocalSwarmSteering(ball, state, step, maxSpeed, dpr, pointerQ);

  const centroidPull = lerp(0.42, 0.18, pointerQ);
  const centroidWeight = 0.2 + spreadT * 0.22 + coreT * 0.18;
  ball.vx += (state.centroidX - ball.x) * centroidPull * centroidWeight * step;
  ball.vy += (state.centroidY - ball.y) * centroidPull * centroidWeight * step;

  const homePull = lerp(7.2, 1.75, pointerQ);
  const homeWander = lerp(0.42, 0.17, pointerQ);
  const wanderX = (
    Math.sin(state.time * (0.23 + spreadT * 0.08) + meta.phase) +
    Math.sin(state.time * 0.071 + meta.phase * 0.43) * 0.55
  ) * state.particleSize * (8.6 + coreT * 2.2) * homeWander;
  const wanderY = (
    Math.sin(state.time * (0.17 + spreadT * 0.06) + meta.phase * 1.31) +
    Math.sin(state.time * 0.093 + meta.phase * 0.71) * 0.46
  ) * state.particleSize * (6.4 + spreadT * 2.2) * homeWander;
  const homeX = meta.homeX + wanderX;
  const homeY = meta.homeY + wanderY;
  ball.vx += (homeX - ball.x) * homePull * step;
  ball.vy += (homeY - ball.y) * homePull * step;

  const margin = getInteriorMargin(g, g.canvas, state.particleSize * 4);
  if (ball.x < margin) ball.vx += (margin - ball.x) * 24 * step;
  if (ball.x > state.canvasWidth - margin) ball.vx -= (ball.x - (state.canvasWidth - margin)) * 24 * step;
  if (ball.y < margin) ball.vy += (margin - ball.y) * 24 * step;
  if (ball.y > state.canvasHeight - margin) ball.vy -= (ball.y - (state.canvasHeight - margin)) * 24 * step;
  if (state.compact) {
    const compactFloor = state.canvasHeight * 0.43;
    const pointerIsCuttingLow = state.pointerActive && state.pointerY > compactFloor - state.pointerRadius * 0.18;
    if (!pointerIsCuttingLow && ball.y > compactFloor) {
      ball.vy -= (ball.y - compactFloor) * 34 * step;
    }
  } else if (pointerQ < 0.18) {
    const heroClearY = state.canvasHeight * 0.415;
    if (ball.y > heroClearY) {
      ball.vy -= (ball.y - heroClearY) * 48 * (1 - pointerQ / 0.18) * step;
    }
  }

  ball.vx *= damping;
  ball.vy *= damping;
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > maxSpeed) {
    const speedScale = maxSpeed / speed;
    ball.vx *= speedScale;
    ball.vy *= speedScale;
  }
  ball.isSleeping = false;
  ball.sleepTimer = 0;
}

function fillColorWithAlpha(ctx, color, alpha) {
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
}

function drawFluxParticles(ctx, balls, state) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < balls.length; i += 1) {
    const ball = balls[i];
    const meta = ball._pressureFlux;
    if (!meta) continue;
    ctx.beginPath();
    fillColorWithAlpha(ctx, ball.color, ball.alpha ?? 0.9);
    ctx.arc(ball.x, ball.y, ball.r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function renderPressureCrucible(ctx) {
  const g = getGlobals();
  if (g.currentMode !== MODES.PRESSURE_CRUCIBLE) return;
  const state = getFluxState();
  const balls = g.balls || [];
  drawFluxParticles(ctx, balls, state);
}
