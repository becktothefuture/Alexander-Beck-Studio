// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         FLUBBER BLOB MODE                                   ║
// ║     Soft silicone-gel raft with embedded fixed-size circular beads           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { MODES } from '../core/constants.js';
import { Ball } from '../physics/Ball.js';
import { pickRandomColorWithIndex } from '../visual/colors.js';
import { subscribeScenePointer } from '../input/pointer.js';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const TWO_PI = Math.PI * 2;
const MIN_DT = 1 / 240;
const MAX_DT = 1 / 30;
const OVERLAP_EPS = 1e-6;
const GEL_TARGET_NEIGHBORS = 7;
const GEL_MAX_NEIGHBORS = 10;

let spawnX = new Float32Array(0);
let spawnY = new Float32Array(0);
let prevX = new Float32Array(0);
let prevY = new Float32Array(0);
let grabOffsetX = new Float32Array(0);
let grabOffsetY = new Float32Array(0);
let grabWeight = new Float32Array(0);
let phase = new Float32Array(0);
let gridHead = new Int32Array(0);
let gridNext = new Int32Array(0);
let visited = new Uint16Array(0);
let queue = new Int32Array(0);
let gelLinkA = new Int16Array(0);
let gelLinkB = new Int16Array(0);
let gelLinkRest = new Float32Array(0);
let gelLinkBaseRest = new Float32Array(0);
let gelLinkSoftness = new Float32Array(0);
let gelLinkStretch = new Float32Array(0);
let gelLinkWorkStretch = new Float32Array(0);
let gelAdjHead = new Int32Array(0);
let gelAdjNext = new Int32Array(0);
let gelAdjOther = new Int16Array(0);
let gelAdjLink = new Int16Array(0);

const wallHit = { nx: 0, ny: 0, penetration: 0 };
const centerStats = { x: 0, y: 0, vx: 0, vy: 0, radius: 1 };
const auditMetrics = {
  mode: MODES.FLUBBER_BLOB,
  particleCount: 0,
  linkCount: 0,
  maxOverlapPx: 0,
  connectedComponentCount: 0,
  maxLinkStretch: 0,
  averageSpeed: 0,
  centerX: 0,
  centerY: 0,
  radius: 0
};

const blob = {
  count: 0,
  ballRadius: 0,
  spawnRadius: 0,
  lastW: 0,
  lastH: 0,
  time: 0,
  frame: 0,
  gridCellSize: 1,
  gridCols: 1,
  gridRows: 1,
  gridCellCount: 1,
  linkCount: 0,
  maxOverlap: 0,
  maxLinkStretch: 1,
  connectedComponents: 1,
  averageSpeed: 0,
  pointerX: 0,
  pointerY: 0,
  pointerVx: 0,
  pointerVy: 0,
  lastPointerX: 0,
  lastPointerY: 0,
  lastPointerTime: 0,
  pointerActive: false,
  isDragging: false,
  dragPointerId: null,
  dragWeightTotal: 0
};

let unsubscribePointer = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampInt(value, min, max) {
  return Math.round(clamp(Number(value) || 0, min, max));
}

function smoothstep01(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function ensureCapacity(count) {
  if (
    spawnX.length >= count &&
    prevX.length >= count &&
    grabOffsetX.length >= count &&
    gridNext.length >= count &&
    visited.length >= count &&
    queue.length >= count
  ) {
    return;
  }
  spawnX = new Float32Array(count);
  spawnY = new Float32Array(count);
  prevX = new Float32Array(count);
  prevY = new Float32Array(count);
  grabOffsetX = new Float32Array(count);
  grabOffsetY = new Float32Array(count);
  grabWeight = new Float32Array(count);
  phase = new Float32Array(count);
  gridNext = new Int32Array(count);
  visited = new Uint16Array(count);
  queue = new Int32Array(count);
}

function ensureGelLinkCapacity(count) {
  const needed = Math.max(1, count * GEL_MAX_NEIGHBORS);
  if (gelLinkA.length < needed) {
    gelLinkA = new Int16Array(needed);
    gelLinkB = new Int16Array(needed);
    gelLinkRest = new Float32Array(needed);
    gelLinkBaseRest = new Float32Array(needed);
    gelLinkSoftness = new Float32Array(needed);
    gelLinkStretch = new Float32Array(needed);
    gelLinkWorkStretch = new Float32Array(needed);
  }
  if (gelAdjHead.length < count) gelAdjHead = new Int32Array(count);
  const adjacencyNeeded = needed * 2;
  if (gelAdjNext.length < adjacencyNeeded) {
    gelAdjNext = new Int32Array(adjacencyNeeded);
    gelAdjOther = new Int16Array(adjacencyNeeded);
    gelAdjLink = new Int16Array(adjacencyNeeded);
  }
}

function ensureGridCapacity(cellCount) {
  if (gridHead.length >= cellCount) return;
  gridHead = new Int32Array(cellCount);
}

function computeSpawnRadius(count, ballRadius, w, h) {
  const minDim = Math.max(1, Math.min(w, h));
  const portrait = h > w * 1.18;
  const packedRadius = Math.sqrt(Math.max(1, count)) * ballRadius * 1.36;
  const minRatio = portrait ? 0.15 : 0.18;
  const maxRatio = portrait ? 0.3 : 0.36;
  return clamp(packedRadius, minDim * minRatio, minDim * maxRatio);
}

function getInitialCenter(w, h, radius) {
  if (h > w * 1.18) {
    return {
      x: clamp(w * 0.7, radius, Math.max(radius, w - radius)),
      y: clamp(h * 0.34, radius, Math.max(radius, h - radius))
    };
  }

  return {
    x: clamp(w * 0.42, radius, Math.max(radius, w - radius)),
    y: clamp(h * 0.48, radius, Math.max(radius, h - radius))
  };
}

function generateSpawnOffsets(count, radius) {
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < count; i++) {
    const t = count <= 1 ? 0 : (i + 0.5) / count;
    const ringR = Math.sqrt(t) * radius * 0.92;
    const angle = i * GOLDEN_ANGLE;
    const x = Math.cos(angle) * ringR;
    const y = Math.sin(angle) * ringR;
    spawnX[i] = x;
    spawnY[i] = y;
    phase[i] = (angle + t * TWO_PI) % TWO_PI;
    sumX += x;
    sumY += y;
  }

  const avgX = count > 0 ? sumX / count : 0;
  const avgY = count > 0 ? sumY / count : 0;
  for (let i = 0; i < count; i++) {
    spawnX[i] -= avgX;
    spawnY[i] -= avgY;
  }
}

function addGelLink(a, b, rest, seen, neighborCounts) {
  if (a === b || blob.linkCount >= gelLinkA.length) return false;
  const i = Math.min(a, b);
  const j = Math.max(a, b);
  const key = `${i}:${j}`;
  if (seen.has(key)) return false;

  const contactRest = blob.ballRadius * 2.14;
  const maxRest = blob.ballRadius * 4.8;
  const linkIndex = blob.linkCount++;
  const baseRest = clamp(rest, contactRest, maxRest);
  const radialA = Math.hypot(spawnX[i], spawnY[i]);
  const radialB = Math.hypot(spawnX[j], spawnY[j]);
  const edgeBias = clamp((radialA + radialB) / Math.max(1, blob.spawnRadius * 2), 0, 1);
  const noise = Math.sin((i + 1) * 12.9898 + (j + 1) * 78.233) * 43758.5453;
  const grain = noise - Math.floor(noise);
  gelLinkA[linkIndex] = i;
  gelLinkB[linkIndex] = j;
  gelLinkRest[linkIndex] = baseRest;
  gelLinkBaseRest[linkIndex] = baseRest;
  gelLinkSoftness[linkIndex] = clamp(0.34 + grain * 0.58 - edgeBias * 0.14, 0.26, 1);
  gelLinkStretch[linkIndex] = clamp(0.94 + (1 - gelLinkSoftness[linkIndex]) * 0.36 + edgeBias * 0.22, 0.92, 1.5);
  neighborCounts[i]++;
  neighborCounts[j]++;
  seen.add(key);
  return true;
}

function buildGelLinks(count) {
  ensureGelLinkCapacity(count);
  blob.linkCount = 0;
  if (count <= 1) return;

  const seen = new Set();
  const neighborCounts = new Uint8Array(count);

  for (let i = 1; i < count; i++) {
    let nearest = 0;
    let nearestDistSq = Number.POSITIVE_INFINITY;
    for (let j = 0; j < i; j++) {
      const dx = spawnX[j] - spawnX[i];
      const dy = spawnY[j] - spawnY[i];
      const distSq = dx * dx + dy * dy;
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearest = j;
      }
    }
    addGelLink(i, nearest, Math.sqrt(nearestDistSq), seen, neighborCounts);
  }

  for (let i = 0; i < count; i++) {
    const candidates = [];
    for (let j = 0; j < count; j++) {
      if (i === j) continue;
      const dx = spawnX[j] - spawnX[i];
      const dy = spawnY[j] - spawnY[i];
      candidates.push({ index: j, distSq: dx * dx + dy * dy });
    }
    candidates.sort((a, b) => a.distSq - b.distSq);

    let added = 0;
    for (let c = 0; c < candidates.length && added < GEL_TARGET_NEIGHBORS; c++) {
      const j = candidates[c].index;
      if (neighborCounts[i] >= GEL_MAX_NEIGHBORS && neighborCounts[j] >= GEL_MAX_NEIGHBORS) continue;
      if (addGelLink(i, j, Math.sqrt(candidates[c].distSq), seen, neighborCounts)) added++;
    }
  }

  rebuildGelAdjacency(count);
}

function rebuildGelAdjacency(count) {
  gelAdjHead.fill(-1, 0, count);
  let edge = 0;

  for (let link = 0; link < blob.linkCount; link++) {
    const a = gelLinkA[link];
    const b = gelLinkB[link];

    gelAdjOther[edge] = b;
    gelAdjLink[edge] = link;
    gelAdjNext[edge] = gelAdjHead[a];
    gelAdjHead[a] = edge++;

    gelAdjOther[edge] = a;
    gelAdjLink[edge] = link;
    gelAdjNext[edge] = gelAdjHead[b];
    gelAdjHead[b] = edge++;
  }
}

function getCenterStats() {
  const g = getGlobals();
  const balls = g.balls || [];
  const count = Math.min(blob.count, balls.length);
  let x = 0;
  let y = 0;
  let vx = 0;
  let vy = 0;
  let speed = 0;

  for (let i = 0; i < count; i++) {
    const ball = balls[i];
    x += ball.x;
    y += ball.y;
    vx += ball.vx;
    vy += ball.vy;
    speed += Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  }

  if (count > 0) {
    x /= count;
    y /= count;
    vx /= count;
    vy /= count;
    speed /= count;
  }

  let radius = blob.ballRadius;
  for (let i = 0; i < count; i++) {
    const ball = balls[i];
    const dx = ball.x - x;
    const dy = ball.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    radius = Math.max(radius, dist + blob.ballRadius);
  }

  centerStats.x = x;
  centerStats.y = y;
  centerStats.vx = vx;
  centerStats.vy = vy;
  centerStats.radius = Math.max(blob.ballRadius, radius);
  blob.averageSpeed = speed;
  return centerStats;
}

function writeRoundedRectViolation(cx, cy, w, h, margin, g, out) {
  const dpr = g.DPR || 1;
  const cornerRadiusPx = (typeof g.getCanvasCornerRadius === 'function')
    ? g.getCanvasCornerRadius()
    : (g.cornerRadius ?? g.wallRadius ?? 0);
  const cr = Math.max(0, Number(cornerRadiusPx) || 0) * dpr;
  const hx = w * 0.5;
  const hy = h * 0.5;
  const rr = Math.max(0, Math.min(cr, hx, hy));
  const lx = cx - hx;
  const ly = cy - hy;
  const ax = Math.abs(lx);
  const ay = Math.abs(ly);
  const rdx = ax - (hx - rr);
  const rdy = ay - (hy - rr);
  let nx = 0;
  let ny = 0;

  if (rdx > 0 && rdy > 0) {
    const len = Math.hypot(rdx, rdy);
    if (len > 1e-6) {
      nx = rdx / len;
      ny = rdy / len;
    }
  } else if (rdx > rdy) {
    nx = 1;
  } else {
    ny = 1;
  }

  const outsideCorner = Math.hypot(Math.max(rdx, 0), Math.max(rdy, 0));
  const insideRect = Math.min(Math.max(rdx, rdy), 0);
  const sdfDist = outsideCorner + insideRect - rr;
  const wi = Number(g.wallInset);
  const borderInset = Math.max(0, Number.isFinite(wi) ? wi : 0) * dpr;
  const penetration = sdfDist + margin + borderInset;
  if (penetration <= 0) return false;
  out.nx = nx * (lx < 0 ? -1 : 1);
  out.ny = ny * (ly < 0 ? -1 : 1);
  out.penetration = penetration;
  return true;
}

function prepareGrid(interactionRadius) {
  const g = getGlobals();
  const canvas = g.canvas;
  const cellSize = Math.max(blob.ballRadius * 2.05, interactionRadius);
  const cols = Math.max(1, Math.ceil(canvas.width / cellSize) + 2);
  const rows = Math.max(1, Math.ceil(canvas.height / cellSize) + 2);
  const cellCount = cols * rows;

  blob.gridCellSize = cellSize;
  blob.gridCols = cols;
  blob.gridRows = rows;
  blob.gridCellCount = cellCount;
  ensureGridCapacity(cellCount);
  gridHead.fill(-1, 0, cellCount);
}

function getCellIndex(x, y) {
  const cx = clamp(Math.floor(x / blob.gridCellSize), 0, blob.gridCols - 1);
  const cy = clamp(Math.floor(y / blob.gridCellSize), 0, blob.gridRows - 1);
  return cy * blob.gridCols + cx;
}

function buildGrid() {
  const g = getGlobals();
  const balls = g.balls || [];
  for (let i = 0; i < blob.count; i++) {
    const cell = getCellIndex(balls[i].x, balls[i].y);
    gridNext[i] = gridHead[cell];
    gridHead[cell] = i;
  }
}

function applyGelDrift(dt, internalCurrent, localDeform, slimeWobble, shear) {
  if (internalCurrent <= 0) return;
  const g = getGlobals();
  const balls = g.balls || [];
  const stats = getCenterStats();
  const dpr = g.DPR || 1;
  const radius = Math.max(blob.ballRadius * 4, stats.radius);
  const wobble = clamp(slimeWobble, 0, 1);
  const currentAccel = (3 + localDeform * 6 + wobble * 4) * internalCurrent * dpr;
  const breathingAccel = currentAccel * (0.08 + wobble * 0.08);

  for (let i = 0; i < blob.count; i++) {
    const ball = balls[i];
    const dx = ball.x - stats.x;
    const dy = ball.y - stats.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    const tx = -ny;
    const ty = nx;
    const radial = clamp(dist / radius, 0, 1.8);
    const waveA = Math.sin(blob.time * (0.52 + wobble * 0.38) + phase[i] + radial * 2.6);
    const waveB = Math.cos(blob.time * (0.32 + wobble * 0.42) + phase[i] * 1.73 + dx / radius);
    const swirlSign = Math.sin(blob.time * 0.18 + radial * 1.7) >= 0 ? 1 : -1;
    const swirl = currentAccel * (0.14 + radial * 0.22) * swirlSign;
    const breathe = breathingAccel * waveA * (0.08 + radial * 0.22);
    const cross = currentAccel * (0.04 + shear * 0.08) * waveB;
    ball.vx += (tx * swirl + nx * breathe + ty * cross) * dt;
    ball.vy += (ty * swirl + ny * breathe - tx * cross) * dt;
  }
}

function applyWeakShapeMemory(dt, shapeMemory) {
  if (shapeMemory <= 0) return;
  const g = getGlobals();
  const balls = g.balls || [];
  const stats = getCenterStats();
  const memoryAccel = shapeMemory * 7 * (g.DPR || 1);

  for (let i = 0; i < blob.count; i++) {
    const ball = balls[i];
    const targetX = stats.x + spawnX[i];
    const targetY = stats.y + spawnY[i];
    ball.vx += (targetX - ball.x) * memoryAccel * dt;
    ball.vy += (targetY - ball.y) * memoryAccel * dt;
  }
}

function applyGelLinkDamping(dt, viscosity, materialFlow) {
  const g = getGlobals();
  const balls = g.balls || [];
  const normalMix = clamp((viscosity * 0.038 + materialFlow * 0.01) * dt * 60, 0, 0.42);
  const tangentialMix = normalMix * 0.55;
  if (normalMix <= 0 || blob.linkCount <= 0) return;

  for (let link = 0; link < blob.linkCount; link++) {
    const i = gelLinkA[link];
    const j = gelLinkB[link];
    const a = balls[i];
    const b = balls[j];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    const tx = -ny;
    const ty = nx;
    const relVx = b.vx - a.vx;
    const relVy = b.vy - a.vy;
    const relNormal = relVx * nx + relVy * ny;
    const relTangent = relVx * tx + relVy * ty;
    const normalDelta = relNormal * normalMix * 0.5;
    const tangentDelta = relTangent * tangentialMix * 0.5;

    a.vx += nx * normalDelta + tx * tangentDelta;
    a.vy += ny * normalDelta + ty * tangentDelta;
    b.vx -= nx * normalDelta + tx * tangentDelta;
    b.vy -= ny * normalDelta + ty * tangentDelta;
  }
}

function solveGelLinks(iterations, linkStrength, compressionStrength, maxStretchRatio, linkGuard, tensionGrain) {
  const g = getGlobals();
  const balls = g.balls || [];
  if (blob.linkCount <= 0) return;

  const hardStretchStrength = clamp(Math.max(0.72, linkStrength + linkGuard * 0.14), 0.72, 0.94);
  const correctionLimit = blob.ballRadius * (0.12 + linkStrength * 0.22 + linkGuard * 0.05);
  const hardCorrectionLimit = blob.ballRadius * (0.9 + linkGuard * 0.78);

  for (let iter = 0; iter < iterations; iter++) {
    for (let link = 0; link < blob.linkCount; link++) {
      const i = gelLinkA[link];
      const j = gelLinkB[link];
      const a = balls[i];
      const b = balls[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist = Math.hypot(dx, dy);
      if (dist < OVERLAP_EPS) {
        dx = Math.cos(phase[i]);
        dy = Math.sin(phase[i]);
        dist = 1;
      }

      const nx = dx / dist;
      const ny = dy / dist;
      const rest = gelLinkRest[link];
      const linkSoftness = 1 + ((gelLinkSoftness[link] || 1) - 1) * tensionGrain;
      const localStretch = 1 + ((gelLinkStretch[link] || 1) - 1) * tensionGrain;
      const hardMaxRest = gelLinkBaseRest[link] * maxStretchRatio * localStretch;
      let target = rest;
      let stiffness = linkStrength * linkSoftness;

      if (dist > hardMaxRest) {
        target = hardMaxRest;
        stiffness = hardStretchStrength * clamp(0.72 + linkSoftness * 0.28, 0.68, 1);
      } else if (dist < rest) {
        stiffness *= compressionStrength;
      }

      const strain = dist - target;
      if (Math.abs(strain) < 0.01) continue;

      const limit = dist > hardMaxRest ? hardCorrectionLimit : correctionLimit * clamp(0.78 + linkSoftness * 0.34, 0.72, 1.12);
      const amount = clamp((strain / dist) * 0.5 * stiffness * dist, -limit, limit);
      a.x += nx * amount;
      a.y += ny * amount;
      b.x -= nx * amount;
      b.y -= ny * amount;
    }
  }
}

function creepGelLinks(dt, materialFlow, shapeMemory, maxStretchRatio) {
  const g = getGlobals();
  const balls = g.balls || [];
  if (blob.linkCount <= 0) return;

  const creep = clamp(materialFlow * 0.0012 * dt * 60, 0, 0.008);
  const memory = clamp(shapeMemory * 0.004 * dt * 60, 0, 0.018);
  const minRest = blob.ballRadius * 2.1;

  for (let link = 0; link < blob.linkCount; link++) {
    const a = balls[gelLinkA[link]];
    const b = balls[gelLinkB[link]];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const maxRest = gelLinkBaseRest[link] * Math.max(1.06, maxStretchRatio * 0.92);
    const adaptiveRest = clamp(dist, minRest, maxRest);
    gelLinkRest[link] += (adaptiveRest - gelLinkRest[link]) * creep;
    gelLinkRest[link] += (gelLinkBaseRest[link] - gelLinkRest[link]) * memory;
  }
}

function resolveParticleContacts(iterations, restitution) {
  const g = getGlobals();
  const balls = g.balls || [];
  const dpr = g.DPR || 1;
  const renderedContactDistance = blob.ballRadius * 2;
  const contactSkin = Math.max(1.2 * dpr, blob.ballRadius * 0.04);
  const contactDistance = renderedContactDistance + contactSkin;
  const contactDistanceSq = contactDistance * contactDistance;
  const slop = 0;
  let maxOverlap = 0;

  for (let iter = 0; iter < iterations; iter++) {
    if (iter > 0) {
      gridHead.fill(-1, 0, blob.gridCellCount);
      buildGrid();
    }

    for (let cell = 0; cell < blob.gridCellCount; cell++) {
      const head = gridHead[cell];
      if (head < 0) continue;
      const cx = cell % blob.gridCols;
      const cy = (cell / blob.gridCols) | 0;

      for (let oy = -1; oy <= 1; oy++) {
        const gridY = cy + oy;
        if (gridY < 0 || gridY >= blob.gridRows) continue;
        for (let ox = -1; ox <= 1; ox++) {
          const gridX = cx + ox;
          if (gridX < 0 || gridX >= blob.gridCols) continue;
          const otherCell = gridY * blob.gridCols + gridX;

          for (let i = head; i >= 0; i = gridNext[i]) {
            const a = balls[i];
            for (let j = gridHead[otherCell]; j >= 0; j = gridNext[j]) {
              if (j <= i) continue;
              const b = balls[j];
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const distSq = dx * dx + dy * dy;
              if (distSq >= contactDistanceSq) continue;

              let dist = Math.sqrt(Math.max(distSq, OVERLAP_EPS));
              let nx = dx / dist;
              let ny = dy / dist;
              if (!Number.isFinite(nx) || !Number.isFinite(ny)) {
                nx = Math.cos(phase[i]);
                ny = Math.sin(phase[i]);
                dist = 0;
              }

              const overlap = contactDistance - dist;
              const correction = Math.max(0, overlap - slop) * 0.5;
              a.x -= nx * correction;
              a.y -= ny * correction;
              b.x += nx * correction;
              b.y += ny * correction;

              if (iter === iterations - 1) {
                const nextDx = b.x - a.x;
                const nextDy = b.y - a.y;
                const visualOverlap = renderedContactDistance - Math.sqrt(nextDx * nextDx + nextDy * nextDy);
                if (visualOverlap > maxOverlap) maxOverlap = visualOverlap;
              }

              const rvx = b.vx - a.vx;
              const rvy = b.vy - a.vy;
              const vn = rvx * nx + rvy * ny;
              if (restitution > 0 && vn < 0) {
                const impulse = -vn * restitution;
                a.vx -= nx * impulse;
                a.vy -= ny * impulse;
                b.vx += nx * impulse;
                b.vy += ny * impulse;
              }
            }
          }
        }
      }
    }
  }

  blob.maxOverlap = maxOverlap;
}

function beginDragHandle(detail) {
  const g = getGlobals();
  const balls = g.balls || [];
  if (!detail?.inBounds || blob.count <= 0 || !isPointOnBlobBody(detail.x, detail.y)) {
    blob.isDragging = false;
    blob.dragPointerId = null;
    blob.dragWeightTotal = 0;
    grabWeight.fill(0, 0, blob.count);
    return false;
  }

  const dpr = g.DPR || 1;
  const radius = Math.max(blob.ballRadius * 4.5, Number(g.flubberBlobInfluenceRadius ?? 320) * dpr);
  const radiusSq = radius * radius;
  const falloff = clamp(Number(g.flubberBlobGrabLocality ?? 0.32), 0, 1);
  const exponent = 0.85 + falloff * 1.45;
  let total = 0;
  let nearest = -1;
  let nearestDistSq = Number.POSITIVE_INFINITY;

  for (let i = 0; i < blob.count; i++) {
    const ball = balls[i];
    const dx = ball.x - detail.x;
    const dy = ball.y - detail.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq;
      nearest = i;
    }

    let weight = 0;
    if (distSq < radiusSq) {
      weight = Math.pow(1 - distSq / radiusSq, exponent);
    }
    grabWeight[i] = weight;
    grabOffsetX[i] = dx;
    grabOffsetY[i] = dy;
    total += weight;
  }

  if (total <= 0 && nearest >= 0) {
    grabWeight[nearest] = 1;
    grabOffsetX[nearest] = balls[nearest].x - detail.x;
    grabOffsetY[nearest] = balls[nearest].y - detail.y;
    total = 1;
  }

  blob.isDragging = total > 0;
  blob.dragPointerId = detail.pointerId ?? null;
  blob.dragWeightTotal = total;
  return blob.isDragging;
}

function applyDragHandle(dt, speedLimit) {
  if (!blob.isDragging || blob.dragWeightTotal <= 0) return;
  const g = getGlobals();
  const balls = g.balls || [];
  const dragStrength = clamp(Number(g.flubberBlobMousePush ?? 2.1), 0, 3);
  if (dragStrength <= 0) return;

  const stiffness = 20 + dragStrength * 34;
  const velocityBlend = clamp((0.08 + dragStrength * 0.065) * dt * 60, 0.05, 0.42);
  const positionBlend = clamp((0.1 + dragStrength * 0.065) * dt * 60, 0.06, 0.46);
  const maxPositionStep = blob.ballRadius * (0.55 + dragStrength * 0.26);
  const pointerVx = clamp(blob.pointerVx, -speedLimit, speedLimit);
  const pointerVy = clamp(blob.pointerVy, -speedLimit, speedLimit);
  let pullX = 0;
  let pullY = 0;
  let pullWeight = 0;

  for (let i = 0; i < blob.count; i++) {
    const weight = grabWeight[i];
    if (weight <= 0) continue;

    const ball = balls[i];
    const targetX = blob.pointerX + grabOffsetX[i];
    const targetY = blob.pointerY + grabOffsetY[i];
    const dx = targetX - ball.x;
    const dy = targetY - ball.y;
    const weightedPositionBlend = positionBlend * weight;
    let stepX = dx * weightedPositionBlend;
    let stepY = dy * weightedPositionBlend;
    const stepLen = Math.hypot(stepX, stepY);
    if (stepLen > maxPositionStep && stepLen > 1e-6) {
      const scale = maxPositionStep / stepLen;
      stepX *= scale;
      stepY *= scale;
    }

    ball.x += stepX;
    ball.y += stepY;
    ball.vx += (dx * stiffness * dt + (pointerVx - ball.vx) * velocityBlend) * weight;
    ball.vy += (dy * stiffness * dt + (pointerVy - ball.vy) * velocityBlend) * weight;

    pullX += stepX * weight;
    pullY += stepY * weight;
    pullWeight += weight;
  }

  if (pullWeight > 0) {
    const follow = clamp(Number(g.flubberBlobBodyFollow ?? 0.08), 0, 1) * 0.18;
    const nudgeX = (pullX / pullWeight) * follow;
    const nudgeY = (pullY / pullWeight) * follow;
    for (let i = 0; i < blob.count; i++) {
      const inverseWeight = 1 - Math.min(1, grabWeight[i]);
      balls[i].x += nudgeX * inverseWeight;
      balls[i].y += nudgeY * inverseWeight;
      balls[i].vx += pointerVx * follow * 0.035 * inverseWeight;
      balls[i].vy += pointerVy * follow * 0.035 * inverseWeight;
    }
  }
}

function endDragHandle(cancelled = false) {
  if (!blob.isDragging) return;
  const g = getGlobals();
  const balls = g.balls || [];
  const dpr = g.DPR || 1;
  const speedLimit = clamp(Number(g.flubberBlobMaxSpeed ?? 1200), 360, 1800) * dpr;
  const throwGain = cancelled ? 0 : clamp(Number(g.flubberBlobClickRepulsion ?? 1.25), 0, 3);
  const pointerVx = clamp(blob.pointerVx, -speedLimit, speedLimit);
  const pointerVy = clamp(blob.pointerVy, -speedLimit, speedLimit);
  const patchTransfer = throwGain * 0.34;
  const bodyTransfer = throwGain * 0.06;

  if (throwGain > 0) {
    for (let i = 0; i < blob.count; i++) {
      const weight = grabWeight[i];
      const bodyWeight = 1 - Math.min(1, weight);
      balls[i].vx += pointerVx * (weight * patchTransfer + bodyWeight * bodyTransfer);
      balls[i].vy += pointerVy * (weight * patchTransfer + bodyWeight * bodyTransfer);
    }
  }

  blob.isDragging = false;
  blob.dragPointerId = null;
  blob.dragWeightTotal = 0;
  grabWeight.fill(0, 0, blob.count);
}

function isPointOnBlobBody(x, y) {
  const g = getGlobals();
  const balls = g.balls || [];
  if (blob.count <= 0) return false;

  const stats = getCenterStats();
  const dxCenter = x - stats.x;
  const dyCenter = y - stats.y;
  const centerGate = stats.radius + blob.ballRadius * 1.8;
  if ((dxCenter * dxCenter + dyCenter * dyCenter) > centerGate * centerGate) return false;

  const nearBodyDistance = blob.ballRadius * 2.6;
  const nearBodyDistanceSq = nearBodyDistance * nearBodyDistance;
  for (let i = 0; i < blob.count; i++) {
    const ball = balls[i];
    const dx = x - ball.x;
    const dy = y - ball.y;
    if ((dx * dx + dy * dy) <= nearBodyDistanceSq) return true;
  }

  return false;
}

function measureGelConnectivity(maxStretchRatio) {
  if (blob.count <= 1) {
    blob.connectedComponents = blob.count;
    blob.maxLinkStretch = 1;
    return;
  }
  const g = getGlobals();
  const balls = g.balls || [];
  const linkLimitPadding = Math.max(1.18, maxStretchRatio * 1.18);
  let maxStretch = 1;

  for (let link = 0; link < blob.linkCount; link++) {
    const a = balls[gelLinkA[link]];
    const b = balls[gelLinkB[link]];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const stretch = Math.sqrt(dx * dx + dy * dy) / Math.max(1, gelLinkBaseRest[link]);
    gelLinkWorkStretch[link] = stretch;
    if (stretch > maxStretch) maxStretch = stretch;
  }

  visited.fill(0, 0, blob.count);
  let components = 0;

  for (let start = 0; start < blob.count; start++) {
    if (visited[start]) continue;
    components++;
    let qStart = 0;
    let qEnd = 0;
    queue[qEnd++] = start;
    visited[start] = components;

    while (qStart < qEnd) {
      const i = queue[qStart++];
      for (let edge = gelAdjHead[i]; edge >= 0; edge = gelAdjNext[edge]) {
        const next = gelAdjOther[edge];
        if (visited[next]) continue;

        const link = gelAdjLink[edge];
        const stretch = gelLinkWorkStretch[link];
        if (stretch > linkLimitPadding) continue;

        visited[next] = components;
        queue[qEnd++] = next;
      }
    }
  }

  blob.connectedComponents = components;
  blob.maxLinkStretch = maxStretch;
}

function applyGelEnvelope(dt, surfaceTension, stretch) {
  if (surfaceTension <= 0) return;
  const g = getGlobals();
  const balls = g.balls || [];
  const stats = getCenterStats();
  const maxRadius = blob.spawnRadius * (1.55 + stretch * 0.75);
  const edgeAccel = surfaceTension * 9 * (g.DPR || 1);

  for (let i = 0; i < blob.count; i++) {
    const ball = balls[i];
    const dx = ball.x - stats.x;
    const dy = ball.y - stats.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= maxRadius) continue;
    const nx = dx / Math.max(dist, 1);
    const ny = dy / Math.max(dist, 1);
    const excess = dist - maxRadius;
    ball.vx -= nx * excess * edgeAccel * dt;
    ball.vy -= ny * excess * edgeAccel * dt;
  }
}

function resolveWalls(dt, wallBounce, wallFriction, wallLocality, wallSquish, impactRipple, shear) {
  const g = getGlobals();
  const canvas = g.canvas;
  const balls = g.balls || [];
  if (!canvas || blob.count <= 0) return;

  const w = canvas.width;
  const h = canvas.height;
  const preStats = getCenterStats();
  const preX = preStats.x;
  const preY = preStats.y;
  const preRadius = preStats.radius;
  const impulseScale = (0.025 + wallSquish * 0.035) * (1 - wallLocality * 0.48);
  const contactBand = blob.ballRadius * (0.9 + wallSquish * 0.14);
  const maxWallImpulse = blob.ballRadius * (2.8 + wallBounce * 4.6);

  for (let iter = 0; iter < 2; iter++) {
    let anyContact = false;
    for (let i = 0; i < blob.count; i++) {
      const ball = balls[i];
      if (!writeRoundedRectViolation(ball.x, ball.y, w, h, blob.ballRadius, g, wallHit)) continue;

      anyContact = true;
      const nx = wallHit.nx;
      const ny = wallHit.ny;
      const tx = -ny;
      const ty = nx;
      const contactWeight = smoothstep01(wallHit.penetration / Math.max(1, contactBand));
      const releasePadding = Math.min(blob.ballRadius * 0.06, (0.14 + wallSquish * 0.12) * (g.DPR || 1));
      ball.x -= nx * (wallHit.penetration + releasePadding);
      ball.y -= ny * (wallHit.penetration + releasePadding);

      const vn = ball.vx * nx + ball.vy * ny;
      const vt = ball.vx * tx + ball.vy * ty;
      const inwardSpeed = Math.max(0, vn);
      const separationAssist = clamp(
        wallHit.penetration * (2.8 + wallSquish * 3.4),
        0,
        blob.ballRadius * 0.34
      );
      const impactThreshold = 2.5 * (g.DPR || 1);
      if (inwardSpeed > impactThreshold || wallHit.penetration > blob.ballRadius * 0.08) {
        const impulse = clamp(
          inwardSpeed * (1 + wallBounce * 0.65 * contactWeight) +
            separationAssist * (inwardSpeed > impactThreshold ? 0.06 : 0.025),
          0,
          inwardSpeed + maxWallImpulse * contactWeight
        );

        ball.vx -= nx * impulse;
        ball.vy -= ny * impulse;
        ball.vx -= tx * vt * wallFriction * (0.62 + contactWeight * 0.38);
        ball.vy -= ty * vt * wallFriction * (0.62 + contactWeight * 0.38);

        const impact = clamp(inwardSpeed / Math.max(180, blob.spawnRadius * 1.2), 0, 1.2);
        const ripple = impact * impactRipple * blob.ballRadius * 3.2 * (0.35 + contactWeight * 0.65);
        if (ripple > 0) {
          ball.vx += tx * Math.sin(blob.time * 7 + phase[i]) * ripple * (0.35 + shear * 0.35) * dt;
          ball.vy += ty * Math.sin(blob.time * 7 + phase[i]) * ripple * (0.35 + shear * 0.35) * dt;
        }

        for (let j = 0; j < blob.count; j++) {
          if (j === i) continue;
          const other = balls[j];
          const side = ((other.x - preX) * nx + (other.y - preY) * ny) / Math.max(1, preRadius);
          if (side <= 0.1) continue;
          const amount = side * side * inwardSpeed * contactWeight * impulseScale / Math.max(14, blob.count * 0.28);
          other.vx -= nx * amount;
          other.vy -= ny * amount;
        }
      } else if (Math.abs(vt) > 0.01) {
        ball.vx -= tx * vt * wallFriction * 0.45;
        ball.vy -= ty * vt * wallFriction * 0.45;
      }
    }
    if (!anyContact) break;
  }
}

function applyWallRepulsion(dt, wallBounce, wallSquish) {
  const g = getGlobals();
  const canvas = g.canvas;
  const balls = g.balls || [];
  if (!canvas || blob.count <= 0) return;

  const dpr = g.DPR || 1;
  const cushion = blob.ballRadius * (1.25 + wallSquish * 0.45);
  const repelAccel = (92 + wallBounce * 290 + wallSquish * 55) * dpr;
  const margin = blob.ballRadius + cushion;

  for (let i = 0; i < blob.count; i++) {
    const ball = balls[i];
    if (!writeRoundedRectViolation(ball.x, ball.y, canvas.width, canvas.height, margin, g, wallHit)) continue;

    const nx = wallHit.nx;
    const ny = wallHit.ny;
    const t = smoothstep01(wallHit.penetration / Math.max(1, cushion));
    const vn = ball.vx * nx + ball.vy * ny;
    const inwardSpeed = Math.max(0, vn);
    const shove = repelAccel * t * t * dt + inwardSpeed * wallBounce * 0.045 * t;
    ball.vx -= nx * shove;
    ball.vy -= ny * shove;
  }
}

function applyVelocityLimits(speedLimit, viscosity, dt) {
  const g = getGlobals();
  const balls = g.balls || [];
  const globalDrag = Math.exp(-0.0015 * dt);
  const localDrag = Math.exp(-(0.72 + viscosity * 1.85) * dt);

  const stats = getCenterStats();
  for (let i = 0; i < blob.count; i++) {
    const ball = balls[i];
    const localVx = ball.vx - stats.vx;
    const localVy = ball.vy - stats.vy;
    ball.vx = (stats.vx + localVx * localDrag) * globalDrag;
    ball.vy = (stats.vy + localVy * localDrag) * globalDrag;

    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > speedLimit && speed > 1e-6) {
      const scale = speedLimit / speed;
      ball.vx *= scale;
      ball.vy *= scale;
    }
  }
}

function storePreviousPositions() {
  const g = getGlobals();
  const balls = g.balls || [];
  for (let i = 0; i < blob.count; i++) {
    prevX[i] = balls[i].x;
    prevY[i] = balls[i].y;
  }
}

function reconstructVelocities(dt, viscosity, speedLimit) {
  const g = getGlobals();
  const balls = g.balls || [];
  const damping = Math.exp(-0.0015 * dt);
  const blend = clamp(0.14 - viscosity * 0.012, 0.08, 0.14);

  for (let i = 0; i < blob.count; i++) {
    const ball = balls[i];
    const pbdVx = (ball.x - prevX[i]) / Math.max(dt, MIN_DT);
    const pbdVy = (ball.y - prevY[i]) / Math.max(dt, MIN_DT);
    ball.vx = (ball.vx * (1 - blend) + pbdVx * blend) * damping;
    ball.vy = (ball.vy * (1 - blend) + pbdVy * blend) * damping;

    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > speedLimit && speed > 1e-6) {
      const scale = speedLimit / speed;
      ball.vx *= scale;
      ball.vy *= scale;
    }
  }
}

function integrateParticles(dt) {
  const g = getGlobals();
  const balls = g.balls || [];
  for (let i = 0; i < blob.count; i++) {
    const ball = balls[i];
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.r = blob.ballRadius;
    ball.rBase = blob.ballRadius;
    ball.squash = 1;
    ball.squashAmount = 0;
    ball.alpha = 1;
    ball._noSquash = true;
  }
}

function updatePointerKinematics(detail, smoothing = 0.35) {
  const now = detail.time || performance.now();
  const dt = Math.max(0.008, (now - blob.lastPointerTime) / 1000);
  const vx = (detail.x - blob.lastPointerX) / dt;
  const vy = (detail.y - blob.lastPointerY) / dt;
  blob.pointerVx += (vx - blob.pointerVx) * smoothing;
  blob.pointerVy += (vy - blob.pointerVy) * smoothing;
  blob.pointerX = detail.x;
  blob.pointerY = detail.y;
  blob.lastPointerX = detail.x;
  blob.lastPointerY = detail.y;
  blob.lastPointerTime = now;
  blob.pointerActive = detail.inBounds === true;
}

function resizeBlobIfNeeded() {
  const g = getGlobals();
  const canvas = g.canvas;
  const balls = g.balls || [];
  if (!canvas || blob.count <= 0) return;
  const w = canvas.width;
  const h = canvas.height;
  if (Math.abs(w - blob.lastW) < 1 && Math.abs(h - blob.lastH) < 1) return;

  const oldW = Math.max(1, blob.lastW || w);
  const oldH = Math.max(1, blob.lastH || h);
  const sx = w / oldW;
  const sy = h / oldH;
  const scale = Math.min(sx, sy);
  const nextSpawnRadius = computeSpawnRadius(blob.count, blob.ballRadius, w, h);
  const center = getCenterStats();
  const restScale = nextSpawnRadius / Math.max(1, blob.spawnRadius);

  for (let i = 0; i < blob.count; i++) {
    const ball = balls[i];
    ball.x = center.x * sx + (ball.x - center.x) * scale;
    ball.y = center.y * sy + (ball.y - center.y) * scale;
    ball.vx *= scale;
    ball.vy *= scale;
    spawnX[i] *= restScale;
    spawnY[i] *= restScale;
  }

  for (let link = 0; link < blob.linkCount; link++) {
    gelLinkRest[link] *= restScale;
    gelLinkBaseRest[link] *= restScale;
  }

  blob.spawnRadius = nextSpawnRadius;
  blob.lastW = w;
  blob.lastH = h;
}

function handlePointer(type, detail) {
  const g = getGlobals();
  if (g.currentMode !== MODES.FLUBBER_BLOB) return;
  if (!detail) return;

  if (type === 'down') {
    if (!detail.inBounds) return;
    updatePointerKinematics(detail, 0.52);
    if (!beginDragHandle(detail)) {
      blob.pointerActive = false;
      blob.pointerVx = 0;
      blob.pointerVy = 0;
    }
    return;
  }

  if (type === 'move') {
    if (!blob.isDragging) return;
    if (blob.isDragging && blob.dragPointerId !== null && detail.pointerId !== null && detail.pointerId !== blob.dragPointerId) return;
    updatePointerKinematics(detail, 0.52);
    return;
  }

  if (type === 'up' || type === 'cancel') {
    if (blob.isDragging && blob.dragPointerId !== null && detail.pointerId !== null && detail.pointerId !== blob.dragPointerId) return;
    endDragHandle(type === 'cancel');
    if (type === 'cancel') blob.pointerActive = false;
  }
}

function ensurePointerSubscription() {
  if (unsubscribePointer) return;
  unsubscribePointer = subscribeScenePointer(handlePointer);
}

function exposeAuditHook() {
  if (typeof window === 'undefined') return;
  window.__ABS_FLUBBER_BLOB_AUDIT__ = {
    getMetrics: () => ({ ...auditMetrics })
  };
}

function updateAuditMetrics() {
  const stats = getCenterStats();
  auditMetrics.mode = MODES.FLUBBER_BLOB;
  auditMetrics.particleCount = blob.count;
  auditMetrics.linkCount = blob.linkCount;
  auditMetrics.maxOverlapPx = blob.maxOverlap;
  auditMetrics.connectedComponentCount = blob.connectedComponents;
  auditMetrics.maxLinkStretch = blob.maxLinkStretch;
  auditMetrics.averageSpeed = blob.averageSpeed;
  auditMetrics.centerX = stats.x;
  auditMetrics.centerY = stats.y;
  auditMetrics.radius = stats.radius;
}

export function initializeFlubberBlob() {
  const g = getGlobals();
  clearBalls();
  ensurePointerSubscription();
  exposeAuditHook();

  const canvas = g.canvas;
  if (!canvas) return;

  const w = canvas.width;
  const h = canvas.height;
  const count = getMobileAdjustedCount(g.flubberBlobBallCount || 120);
  if (count <= 0) return;

  ensureCapacity(count);
  blob.count = count;
  blob.ballRadius = Math.max(2, Number(g.R_MED) || 10);
  blob.spawnRadius = computeSpawnRadius(count, blob.ballRadius, w, h);
  blob.lastW = w;
  blob.lastH = h;
  blob.time = 0;
  blob.frame = 0;
  blob.maxOverlap = 0;
  blob.maxLinkStretch = 1;
  blob.connectedComponents = 1;
  blob.averageSpeed = 0;
  blob.pointerActive = false;
  blob.isDragging = false;
  blob.dragPointerId = null;
  blob.dragWeightTotal = 0;

  const start = getInitialCenter(w, h, blob.spawnRadius + blob.ballRadius);
  const speed = Math.max(0, Number(g.flubberBlobInitialSpeed ?? 520)) * (g.DPR || 1);
  const angle = ((Number(g.flubberBlobInitialAngleDeg ?? -18) || 0) * Math.PI) / 180;
  const baseVx = Math.cos(angle) * speed;
  const baseVy = Math.sin(angle) * speed;

  generateSpawnOffsets(count, blob.spawnRadius);
  buildGelLinks(count);
  for (let i = 0; i < count; i++) {
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const ball = new Ball(start.x + spawnX[i], start.y + spawnY[i], blob.ballRadius, color);
    const swirl = Math.sin(phase[i] * 1.9) * 18 * (g.DPR || 1);
    const dx = spawnX[i];
    const dy = spawnY[i];
    const len = Math.hypot(dx, dy) || 1;
    ball.vx = baseVx + (-dy / len) * swirl;
    ball.vy = baseVy + (dx / len) * swirl;
    ball.rBase = blob.ballRadius;
    ball.distributionIndex = distributionIndex;
    ball.isFlubberBlob = true;
    ball._noSquash = true;
    ball.squash = 1;
    ball.squashAmount = 0;
    ball.omega = 0;
    g.balls.push(ball);
  }

  updateAuditMetrics();
}

export function stepFlubberBlob(dtSeconds) {
  const g = getGlobals();
  if (g.currentMode !== MODES.FLUBBER_BLOB || blob.count <= 0) return;

  const dt = clamp(dtSeconds || MIN_DT, MIN_DT, MAX_DT);
  const canvas = g.canvas;
  if (!canvas) return;

  resizeBlobIfNeeded();

  blob.time += dt;
  blob.frame++;
  const dpr = g.DPR || 1;
  const isMobile = Boolean(g.isMobile || g.isMobileViewport);
  const particleCollisions = true;
  const configuredContactIterations = Number(g.flubberBlobContactIterations);
  const defaultContactIterations = isMobile ? 4 : 5;
  const configuredIterations = clampInt(
    Number.isFinite(configuredContactIterations) ? configuredContactIterations : defaultContactIterations,
    1,
    6
  );
  const contactIterations = Math.max(defaultContactIterations, configuredIterations);
  const viscosity = clamp(Number(g.flubberBlobViscosity ?? 0.45), 0.02, 2.5);
  const cohesionGain = clamp(Number(g.flubberBlobCohesion ?? 2.35), 0.8, 6);
  const surfaceTension = clamp(Number(g.flubberBlobSurfaceTension ?? 0.04), 0, 1.5);
  const materialFlow = clamp(Number(g.flubberBlobMaterialFlow ?? 0.5), 0, 1);
  const shapeMemory = clamp(Number(g.flubberBlobShapeMemory ?? 0), 0, 1);
  const linkGuardControl = clamp(Number(g.flubberBlobConnectivityPull ?? 1.1), 0, 1.5);
  const linkGuard = 0.46 + linkGuardControl * 0.42;
  const tensionGrain = clamp(Number(g.flubberBlobTensionGrain ?? 0.9), 0, 1);
  const localDeform = clamp(Number(g.flubberBlobLocalDeform ?? 1.2), 0, 1.2);
  const slimeWobble = clamp(Number(g.flubberBlobSlimeWobble ?? 0.08), 0, 1);
  const shear = clamp(Number(g.flubberBlobShear ?? 0.95), 0, 1);
  const stretch = clamp(Number(g.flubberBlobStretch ?? 1.2), 0, 1.2);
  const internalCurrent = clamp(Number(g.flubberBlobInternalCurrent ?? 0.1), 0, 0.35) * 0.35;
  const wallBounce = clamp(Number(g.flubberBlobWallBounce ?? 0.34), 0, 0.75) * 0.82;
  const wallFriction = clamp(Number(g.flubberBlobWallFriction ?? 0.006), 0, 0.8);
  const wallLocality = clamp(Number(g.flubberBlobWallLocality ?? 0.78), 0, 1);
  const wallSquish = clamp(Number(g.flubberBlobWallSquish ?? 0.42), 0, 1.5);
  const impactRipple = clamp(Number(g.flubberBlobImpactRipple ?? 0.05), 0, 1.4);
  const speedLimit = clamp(Number(g.flubberBlobMaxSpeed ?? 1400), 360, 1800) * dpr;
  const contactRadius = blob.ballRadius * 2.25;
  const maxStretchRatio = 1.24 + stretch * 0.56 + materialFlow * 0.18;
  const linkStrength = clamp(0.08 + cohesionGain * 0.048 + surfaceTension * 0.05, 0.1, 0.72);
  const compressionStrength = clamp(0.08 + surfaceTension * 0.05, 0.06, 0.26);

  storePreviousPositions();
  applyVelocityLimits(speedLimit, viscosity, dt);
  applyGelDrift(dt, internalCurrent, localDeform, slimeWobble, shear);
  applyWeakShapeMemory(dt, shapeMemory);
  applyGelLinkDamping(dt, viscosity, materialFlow);
  applyGelEnvelope(dt, surfaceTension, stretch);
  applyWallRepulsion(dt, wallBounce, wallSquish);
  integrateParticles(dt);
  applyDragHandle(dt, speedLimit);

  for (let iter = 0; iter < contactIterations; iter++) {
    solveGelLinks(1, linkStrength, compressionStrength, maxStretchRatio, linkGuard, tensionGrain);
    if (particleCollisions) {
      prepareGrid(contactRadius);
      buildGrid();
      resolveParticleContacts(1, 0);
    } else {
      blob.maxOverlap = 0;
    }
    resolveWalls(dt, wallBounce, wallFriction, wallLocality, wallSquish, impactRipple, shear);
  }

  if (particleCollisions) {
    const finalContactIterations = contactIterations + (blob.isDragging ? 4 : 3);
    for (let pass = 0; pass < 2; pass++) {
      resolveWalls(dt, wallBounce, wallFriction, wallLocality, wallSquish, impactRipple, shear);
      prepareGrid(contactRadius);
      buildGrid();
      resolveParticleContacts(finalContactIterations, 0);
    }
  }

  creepGelLinks(dt, materialFlow, shapeMemory, maxStretchRatio);
  reconstructVelocities(dt, viscosity, speedLimit);
  measureGelConnectivity(maxStretchRatio);
  updateAuditMetrics();
}

export function renderFlubberBlob(ctx) {
  const g = getGlobals();
  const balls = g.balls || [];
  if (!ctx || balls.length === 0) return;

  let currentColor = '';
  let previousAlpha = 1;
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    if (!ball) continue;
    const alpha = Math.max(0, Math.min(1, (ball.alpha ?? 1) * (ball.filterOpacity ?? 1)));
    if (alpha <= 0) continue;
    if (ball.color !== currentColor) {
      currentColor = ball.color;
      ctx.fillStyle = currentColor;
    }
    if (alpha !== previousAlpha) {
      ctx.globalAlpha = alpha;
      previousAlpha = alpha;
    }
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
  }
  if (previousAlpha !== 1) ctx.globalAlpha = 1;
}
