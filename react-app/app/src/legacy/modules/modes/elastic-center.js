// Tension Loom: a draggable bead lattice that keeps the legacy `elastic-center`
// mode ID for compatibility.

import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { Ball } from '../physics/Ball.js';
import { pickRandomColorWithIndex, getColorByIndex } from '../visual/colors.js';
import { MODES } from '../core/constants.js';
import { subscribeScenePointer } from '../input/pointer.js';
import { randomRadiusForMode } from '../utils/ball-sizing.js';

const TAU = Math.PI * 2;
const MIN_DISTANCE = 0.001;

let unsubscribePointer = null;

const loom = {
  count: 0,
  time: 0,
  lastW: 0,
  lastH: 0,
  links: [],
  isDragging: false,
  dragPointerId: null,
  pointerX: 0,
  pointerY: 0,
  pointerVx: 0,
  pointerVy: 0,
  lastPointerX: 0,
  lastPointerY: 0,
  lastPointerTime: 0,
  pulseX: 0,
  pulseY: 0,
  pulseAge: 999,
  pulseColor: '#d7ff2f',
  reducedMotion: false
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampInt(value, min, max, fallback) {
  const next = Math.round(Number(value));
  if (!Number.isFinite(next)) return fallback;
  return Math.min(max, Math.max(min, next));
}

function prefersReducedMotion() {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  } catch (e) {
    return false;
  }
}

function getDpr(g) {
  return Number(g?.DPR) || 1;
}

function getLoomBounds(g) {
  const canvas = g.canvas;
  const dpr = getDpr(g);
  const maxR = Math.max(g.R_MAX || 14, g.R_MED || 12);
  const wallInset = Math.max(0, Number(g.wallInset) || 0) * dpr;
  const margin = Math.max(wallInset + maxR * 4.2, Math.min(canvas.width, canvas.height) * 0.07);
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  const spanX = Math.max(maxR * 8, (canvas.width - margin * 2) * 0.74);
  const spanY = Math.max(maxR * 8, (canvas.height - margin * 2) * 0.68);
  return { cx, cy, spanX, spanY };
}

function homePointFor(g, normX, normY) {
  const bounds = getLoomBounds(g);
  return {
    x: bounds.cx + normX * bounds.spanX * 0.5,
    y: bounds.cy + normY * bounds.spanY * 0.5
  };
}

function buildCandidates(count, canvas, density) {
  const aspect = clamp(canvas.width / Math.max(1, canvas.height), 0.65, 1.85);
  const columns = clampInt(Math.sqrt(count * aspect) * 1.2 * density, 9, 21, 14);
  const rows = clampInt(Math.ceil((count / columns) * 1.55), 8, 19, 12);
  const candidates = [];
  const xStep = columns > 1 ? 2 / (columns - 1) : 0;

  for (let row = 0; row < rows; row += 1) {
    const baseY = rows <= 1 ? 0 : -1 + (row / (rows - 1)) * 2;
    const rowOffset = row % 2 === 0 ? 0 : xStep * 0.5;

    for (let col = 0; col < columns; col += 1) {
      const baseX = columns <= 1 ? 0 : -1 + (col / (columns - 1)) * 2;
      const normX = clamp(baseX + rowOffset, -1.08, 1.08);
      const normY = baseY;
      const oval = normX * normX * 0.82 + normY * normY * 1.08;
      const diamond = Math.abs(normX) * 0.82 + Math.abs(normY) * 0.9;
      const shapeScore = oval * 0.62 + diamond * 0.38;

      candidates.push({
        row,
        col,
        normX,
        normY,
        shapeScore,
        pathPhase: (row * 0.79 + col * 1.31) % TAU
      });
    }
  }

  candidates.sort((a, b) => {
    if (a.shapeScore !== b.shapeScore) return a.shapeScore - b.shapeScore;
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  return candidates.slice(0, count).sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });
}

function addLink(a, b, balls) {
  if (a < 0 || b < 0 || a === b) return;
  const ballA = balls[a];
  const ballB = balls[b];
  if (!ballA?._tensionLoom || !ballB?._tensionLoom) return;

  const dx = ballB._tensionLoom.homeX - ballA._tensionLoom.homeX;
  const dy = ballB._tensionLoom.homeY - ballA._tensionLoom.homeY;
  const rest = Math.max(MIN_DISTANCE, Math.hypot(dx, dy));
  const linkAB = { index: b, rest };
  const linkBA = { index: a, rest };
  ballA._tensionLoom.links.push(linkAB);
  ballB._tensionLoom.links.push(linkBA);
  loom.links.push({ a, b, rest });
}

function buildLinks(balls) {
  loom.links = [];
  const byGrid = new Map();
  for (let i = 0; i < balls.length; i += 1) {
    const data = balls[i]?._tensionLoom;
    if (!data) continue;
    data.links = [];
    byGrid.set(`${data.row}:${data.col}`, i);
  }

  for (let i = 0; i < balls.length; i += 1) {
    const data = balls[i]?._tensionLoom;
    if (!data) continue;
    const right = byGrid.get(`${data.row}:${data.col + 1}`);
    const down = byGrid.get(`${data.row + 1}:${data.col}`);
    const diagA = byGrid.get(`${data.row + 1}:${data.col + 1}`);
    const diagB = byGrid.get(`${data.row + 1}:${data.col - 1}`);
    if (right !== undefined) addLink(i, right, balls);
    if (down !== undefined) addLink(i, down, balls);
    if (diagA !== undefined && (data.row + data.col) % 2 === 0) addLink(i, diagA, balls);
    if (diagB !== undefined && (data.row + data.col) % 2 !== 0) addLink(i, diagB, balls);
  }
}

function reflowHomes(g, force = false) {
  const canvas = g.canvas;
  if (!canvas) return;
  if (!force && canvas.width === loom.lastW && canvas.height === loom.lastH) return;

  const balls = g.balls || [];
  for (let i = 0; i < balls.length; i += 1) {
    const data = balls[i]?._tensionLoom;
    if (!data) continue;
    const home = homePointFor(g, data.normX, data.normY);
    data.homeX = home.x;
    data.homeY = home.y;
  }

  for (let i = 0; i < loom.links.length; i += 1) {
    const link = loom.links[i];
    const a = balls[link.a]?._tensionLoom;
    const b = balls[link.b]?._tensionLoom;
    if (!a || !b) continue;
    const rest = Math.max(MIN_DISTANCE, Math.hypot(b.homeX - a.homeX, b.homeY - a.homeY));
    link.rest = rest;
  }

  for (let i = 0; i < balls.length; i += 1) {
    const data = balls[i]?._tensionLoom;
    if (!data) continue;
    for (let j = 0; j < data.links.length; j += 1) {
      const neighbor = balls[data.links[j].index]?._tensionLoom;
      if (!neighbor) continue;
      data.links[j].rest = Math.max(MIN_DISTANCE, Math.hypot(neighbor.homeX - data.homeX, neighbor.homeY - data.homeY));
    }
  }

  loom.lastW = canvas.width;
  loom.lastH = canvas.height;
}

function resetDrag() {
  loom.isDragging = false;
  loom.dragPointerId = null;
  loom.pointerVx = 0;
  loom.pointerVy = 0;
  loom.lastPointerTime = 0;
  const g = getGlobals();
  const balls = g.balls || [];
  for (let i = 0; i < balls.length; i += 1) {
    const data = balls[i]?._tensionLoom;
    if (!data) continue;
    data.dragWeight = 0;
    data.dragOffsetX = 0;
    data.dragOffsetY = 0;
  }
}

function updatePointerKinematics(detail, smoothing = 0.45) {
  const now = Number(detail?.time) || performance.now();
  const x = Number(detail?.x) || 0;
  const y = Number(detail?.y) || 0;

  if (loom.lastPointerTime > 0) {
    const dt = Math.max(0.001, (now - loom.lastPointerTime) / 1000);
    const vx = (x - loom.lastPointerX) / dt;
    const vy = (y - loom.lastPointerY) / dt;
    loom.pointerVx += (vx - loom.pointerVx) * smoothing;
    loom.pointerVy += (vy - loom.pointerVy) * smoothing;
  } else {
    loom.pointerVx = 0;
    loom.pointerVy = 0;
  }

  loom.pointerX = x;
  loom.pointerY = y;
  loom.lastPointerX = x;
  loom.lastPointerY = y;
  loom.lastPointerTime = now;
}

function beginDrag(detail) {
  const g = getGlobals();
  const balls = g.balls || [];
  if (!detail?.inBounds || balls.length === 0) {
    resetDrag();
    return;
  }

  const dpr = getDpr(g);
  const radius = Math.max(24 * dpr, Number(g.tensionLoomDragRadius ?? 170) * dpr);
  const radiusSq = radius * radius;
  let nearest = -1;
  let nearestDistSq = Number.POSITIVE_INFINITY;

  for (let i = 0; i < balls.length; i += 1) {
    const dx = balls[i].x - detail.x;
    const dy = balls[i].y - detail.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < nearestDistSq) {
      nearest = i;
      nearestDistSq = distSq;
    }
  }

  if (nearest < 0 || nearestDistSq > radiusSq) {
    resetDrag();
    return;
  }

  loom.isDragging = true;
  loom.dragPointerId = detail.pointerId ?? null;
  updatePointerKinematics(detail, 1);

  for (let i = 0; i < balls.length; i += 1) {
    const ball = balls[i];
    const data = ball._tensionLoom;
    if (!data) continue;
    const dx = ball.x - detail.x;
    const dy = ball.y - detail.y;
    const distSq = dx * dx + dy * dy;
    const q = distSq < radiusSq ? 1 - distSq / radiusSq : 0;
    const weight = q > 0 ? q * q * (3 - 2 * q) : 0;
    data.dragWeight = weight;
    data.dragOffsetX = dx;
    data.dragOffsetY = dy;
    if (weight > 0) ball.isSleeping = false;
  }
}

function endDrag(cancelled = false) {
  if (!loom.isDragging) return;
  const g = getGlobals();
  const balls = g.balls || [];
  const dpr = getDpr(g);
  const maxSpeed = Math.max(240, Number(g.tensionLoomMaxSpeed ?? 1800)) * dpr;
  const speed = Math.hypot(loom.pointerVx, loom.pointerVy);
  const velocityScale = speed > maxSpeed && speed > MIN_DISTANCE ? maxSpeed / speed : 1;
  const releaseGain = cancelled ? 0 : clamp(Number(g.tensionLoomReleaseGain ?? 0.55), 0, 1.5);
  const releaseVx = loom.pointerVx * velocityScale * releaseGain;
  const releaseVy = loom.pointerVy * velocityScale * releaseGain;

  if (releaseGain > 0) {
    for (let i = 0; i < balls.length; i += 1) {
      const ball = balls[i];
      const data = ball?._tensionLoom;
      if (!data || data.dragWeight <= 0) continue;
      const transfer = data.dragWeight * (0.22 + data.dragWeight * 0.58);
      ball.vx += releaseVx * transfer;
      ball.vy += releaseVy * transfer;
      ball.isSleeping = false;
    }
  }

  loom.pulseX = loom.pointerX;
  loom.pulseY = loom.pointerY;
  loom.pulseAge = cancelled ? 999 : 0;
  resetDrag();
}

function handlePointer(type, detail) {
  const g = getGlobals();
  if (g.currentMode !== MODES.ELASTIC_CENTER) return;
  if (!detail) return;

  if (type === 'down') {
    beginDrag(detail);
    return;
  }

  if (type === 'move') {
    if (!loom.isDragging) return;
    if (loom.dragPointerId !== null && detail.pointerId !== null && detail.pointerId !== loom.dragPointerId) return;
    updatePointerKinematics(detail, 0.45);
    return;
  }

  if (type === 'up' || type === 'cancel') {
    if (loom.dragPointerId !== null && detail.pointerId !== null && detail.pointerId !== loom.dragPointerId) return;
    endDrag(type === 'cancel');
  }
}

function ensurePointerSubscription() {
  if (unsubscribePointer) return;
  unsubscribePointer = subscribeScenePointer(handlePointer);
}

export function initializeElasticCenter() {
  const g = getGlobals();
  clearBalls();
  ensurePointerSubscription();

  const canvas = g.canvas;
  if (!canvas) return;

  const targetCount = getMobileAdjustedCount(clampInt(g.tensionLoomBallCount ?? 132, 64, 180, 132));
  const density = clamp(Number(g.tensionLoomGridDensity ?? 1), 0.7, 1.35);
  const candidates = buildCandidates(targetCount, canvas, density);
  const balls = g.balls;

  loom.count = candidates.length;
  loom.time = 0;
  loom.lastW = 0;
  loom.lastH = 0;
  loom.reducedMotion = prefersReducedMotion();
  loom.pulseAge = 999;
  loom.pulseColor = getColorByIndex(5) || '#d7ff2f';
  resetDrag();

  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    const home = homePointFor(g, candidate.normX, candidate.normY);
    const r = randomRadiusForMode(g, MODES.ELASTIC_CENTER);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const ball = new Ball(home.x, home.y, r, color);
    const jitter = loom.reducedMotion ? 0 : r * 0.28;

    ball.x += (Math.random() - 0.5) * jitter;
    ball.y += (Math.random() - 0.5) * jitter;
    ball.vx = loom.reducedMotion ? 0 : (Math.random() - 0.5) * 22 * getDpr(g);
    ball.vy = loom.reducedMotion ? 0 : (Math.random() - 0.5) * 22 * getDpr(g);
    ball.omega = 0;
    ball.distributionIndex = distributionIndex;
    ball.m = g.MASS_BASELINE_KG * clamp(Number(g.tensionLoomMassMultiplier ?? 1.35), 0.5, 4);
    ball.isSleeping = false;
    ball._tensionLoom = {
      index: i,
      row: candidate.row,
      col: candidate.col,
      normX: candidate.normX,
      normY: candidate.normY,
      homeX: home.x,
      homeY: home.y,
      phase: candidate.pathPhase,
      baseRadius: r,
      baseColor: color,
      links: [],
      dragWeight: 0,
      dragOffsetX: 0,
      dragOffsetY: 0
    };
    balls.push(ball);
  }

  buildLinks(balls);
  reflowHomes(g, true);
}

export function applyElasticCenterForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.ELASTIC_CENTER || !ball?._tensionLoom || !g.canvas) return;

  const data = ball._tensionLoom;
  const dpr = getDpr(g);
  const reduced = loom.reducedMotion;
  const homeStrength = Math.max(0, Number(g.tensionLoomHomeStrength ?? 8.5)) * (reduced ? 1.35 : 1);
  const linkStrength = Math.max(0, Number(g.tensionLoomLinkStrength ?? 34)) * (reduced ? 0.72 : 1);
  const dragStrength = Math.max(0, Number(g.tensionLoomDragStrength ?? 64));
  const damping = clamp(Number(g.tensionLoomDamping ?? 0.965), 0.78, 0.995);
  const maxSpeed = Math.max(240, Number(g.tensionLoomMaxSpeed ?? 1800)) * dpr;

  const waveAmplitude = reduced ? 0 : Math.max(0, Number(g.tensionLoomIdleWavePx ?? 3.5)) * dpr;
  const waveX = Math.sin(loom.time * 0.86 + data.phase) * waveAmplitude;
  const waveY = Math.cos(loom.time * 0.72 + data.phase * 1.37) * waveAmplitude;
  const targetX = data.homeX + waveX;
  const targetY = data.homeY + waveY;

  ball.vx += (targetX - ball.x) * homeStrength * dt;
  ball.vy += (targetY - ball.y) * homeStrength * dt;

  const balls = g.balls || [];
  for (let i = 0; i < data.links.length; i += 1) {
    const link = data.links[i];
    const neighbor = balls[link.index];
    if (!neighbor) continue;
    const dx = neighbor.x - ball.x;
    const dy = neighbor.y - ball.y;
    const dist = Math.max(MIN_DISTANCE, Math.hypot(dx, dy));
    const stretch = dist - link.rest;
    const force = stretch * linkStrength * dt;
    ball.vx += (dx / dist) * force;
    ball.vy += (dy / dist) * force;
  }

  if (loom.isDragging && data.dragWeight > 0) {
    const targetDragX = loom.pointerX + data.dragOffsetX;
    const targetDragY = loom.pointerY + data.dragOffsetY;
    const dx = targetDragX - ball.x;
    const dy = targetDragY - ball.y;
    const weight = data.dragWeight;
    const positionBlend = clamp(0.04 + weight * 0.09, 0.04, 0.13);
    const maxStep = Math.max(2, data.baseRadius * (0.85 + weight * 0.8));
    let stepX = dx * positionBlend * weight;
    let stepY = dy * positionBlend * weight;
    const stepLen = Math.hypot(stepX, stepY);
    if (stepLen > maxStep && stepLen > MIN_DISTANCE) {
      const scale = maxStep / stepLen;
      stepX *= scale;
      stepY *= scale;
    }
    ball.x += stepX;
    ball.y += stepY;
    ball.vx += dx * dragStrength * weight * dt;
    ball.vy += dy * dragStrength * weight * dt;
    ball.isSleeping = false;
  } else if (g.mouseInCanvas) {
    const hoverRadius = Math.max(0, Number(g.tensionLoomHoverRadius ?? 165)) * dpr;
    if (hoverRadius > 0) {
      const dx = ball.x - g.mouseX;
      const dy = ball.y - g.mouseY;
      const distSq = dx * dx + dy * dy;
      if (distSq > MIN_DISTANCE && distSq < hoverRadius * hoverRadius) {
        const dist = Math.sqrt(distSq);
        const q = 1 - dist / hoverRadius;
        const strength = Math.max(0, Number(g.tensionLoomHoverStrength ?? 2600)) * q * q;
        ball.vx += (dx / dist) * strength * dt;
        ball.vy += (dy / dist) * strength * dt;
        ball.vx += (-dy / dist) * strength * 0.12 * dt;
        ball.vy += (dx / dist) * strength * 0.12 * dt;
        ball.isSleeping = false;
      }
    }
  }

  const dampingFactor = Math.pow(damping, dt * 60);
  ball.vx *= dampingFactor;
  ball.vy *= dampingFactor;

  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > maxSpeed && speed > MIN_DISTANCE) {
    const scale = maxSpeed / speed;
    ball.vx *= scale;
    ball.vy *= scale;
  }
}

export function updateElasticCenter(dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.ELASTIC_CENTER || !g.canvas) return;

  loom.time += dt;
  loom.reducedMotion = prefersReducedMotion();
  reflowHomes(g);

  const balls = g.balls || [];
  const dpr = getDpr(g);
  const pulseDuration = 0.72;
  const pulseSpeed = Math.max(180, Number(g.tensionLoomPulseSpeed ?? 620)) * dpr;
  const pulseWidth = Math.max(18, Number(g.tensionLoomPulseWidth ?? 58)) * dpr;
  const pulseStrength = clamp(Number(g.tensionLoomPulseStrength ?? 0.24), 0, 0.8);
  loom.pulseAge += dt;

  for (let i = 0; i < balls.length; i += 1) {
    const ball = balls[i];
    const data = ball?._tensionLoom;
    if (!data) continue;

    let pulse = 0;
    if (!loom.reducedMotion && loom.pulseAge < pulseDuration) {
      const waveRadius = loom.pulseAge * pulseSpeed;
      const dist = Math.hypot(ball.x - loom.pulseX, ball.y - loom.pulseY);
      const band = Math.abs(dist - waveRadius);
      if (band < pulseWidth) {
        const q = 1 - band / pulseWidth;
        const decay = 1 - loom.pulseAge / pulseDuration;
        pulse = q * q * decay;
      }
    }

    const radiusMul = 1 + pulse * pulseStrength;
    ball.r = data.baseRadius * radiusMul;
    ball.rBase = ball.r;
    ball.color = pulse > 0.42 ? loom.pulseColor : data.baseColor;
    ball.alpha = 1;
  }
}
