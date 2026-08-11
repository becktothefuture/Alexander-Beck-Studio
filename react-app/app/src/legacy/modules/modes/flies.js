// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                FLIES MODE                                    ║
// ║            Extracted from balls-source.html lines 3521-3551                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { spawnBall } from '../physics/spawn.js';
import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { pickRandomColor } from '../visual/colors.js';
import { CONSTANTS } from '../core/constants.js';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const neighbourGrid = new Map();
const neighbourCellPool = [];
const neighbourScratch = [];
const neighbourCellScratch = new Array(9);
const neighbourCellPositions = new Uint16Array(9);
let neighbourCellPoolIndex = 0;
let neighbourGridColumns = 1;
let neighbourGridRows = 1;
let neighbourGridCellSize = 1;

function buildNeighbourGrid(globals, cellSize) {
  neighbourCellPoolIndex = 0;
  for (const cell of neighbourGrid.values()) cell.length = 0;
  neighbourGrid.clear();
  neighbourGridCellSize = Math.max(1, cellSize);
  neighbourGridColumns = Math.max(1, Math.ceil(globals.canvas.width / neighbourGridCellSize));
  neighbourGridRows = Math.max(1, Math.ceil(globals.canvas.height / neighbourGridCellSize));
  for (let index = 0; index < globals.balls.length; index += 1) {
    const ball = globals.balls[index];
    const cellX = clamp(Math.floor(ball.x / neighbourGridCellSize), 0, neighbourGridColumns - 1);
    const cellY = clamp(Math.floor(ball.y / neighbourGridCellSize), 0, neighbourGridRows - 1);
    const key = cellY * neighbourGridColumns + cellX;
    let cell = neighbourGrid.get(key);
    if (!cell) {
      cell = neighbourCellPool[neighbourCellPoolIndex] || [];
      neighbourCellPool[neighbourCellPoolIndex] = cell;
      neighbourCellPoolIndex += 1;
      neighbourGrid.set(key, cell);
    }
    cell.push(index);
  }
  if (globals.performanceAuditEnabled === true) {
    globals.fliesNeighbourGridBuildCount = (Number(globals.fliesNeighbourGridBuildCount) || 0) + 1;
  }
}

function collectNeighbourIndices(ball) {
  neighbourScratch.length = 0;
  let cellCount = 0;
  const cellX = clamp(Math.floor(ball.x / neighbourGridCellSize), 0, neighbourGridColumns - 1);
  const cellY = clamp(Math.floor(ball.y / neighbourGridCellSize), 0, neighbourGridRows - 1);
  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    const y = cellY + offsetY;
    if (y < 0 || y >= neighbourGridRows) continue;
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      const x = cellX + offsetX;
      if (x < 0 || x >= neighbourGridColumns) continue;
      const cell = neighbourGrid.get(y * neighbourGridColumns + x);
      if (!cell?.length) continue;
      neighbourCellScratch[cellCount] = cell;
      neighbourCellPositions[cellCount] = 0;
      cellCount += 1;
    }
  }

  // Each grid cell is populated in global ball-index order. Merge the at-most
  // nine sorted cell lists so force accumulation keeps the original all-balls
  // order without an allocation or an Array.sort for every body.
  while (true) {
    let nextCell = -1;
    let nextIndex = Number.POSITIVE_INFINITY;
    for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
      const cell = neighbourCellScratch[cellIndex];
      const position = neighbourCellPositions[cellIndex];
      if (position >= cell.length) continue;
      const candidate = cell[position];
      if (candidate < nextIndex) {
        nextIndex = candidate;
        nextCell = cellIndex;
      }
    }
    if (nextCell < 0) break;
    neighbourScratch.push(nextIndex);
    neighbourCellPositions[nextCell] += 1;
  }
  return neighbourScratch;
}
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getIdleTargetX(globals, timeS = performance.now() * 0.001) {
  const dpr = globals.DPR || 1;
  const compactViewport = Boolean(globals.isMobileViewport) || window.innerWidth < 700;
  const baseX = compactViewport ? 0.55 : 0.64;
  const driftX = Math.min(globals.canvas.width * 0.13, 170 * dpr);
  return globals.canvas.width * baseX
    + Math.sin(timeS * 0.19) * driftX
    + Math.sin(timeS * 0.071 + 1.4) * driftX * 0.35;
}

function getIdleTargetY(globals, timeS = performance.now() * 0.001) {
  const dpr = globals.DPR || 1;
  const compactViewport = Boolean(globals.isMobileViewport) || window.innerWidth < 700;
  const baseY = compactViewport ? 0.39 : 0.34;
  const driftY = Math.min(globals.canvas.height * 0.075, 78 * dpr);
  return globals.canvas.height * baseY
    + Math.cos(timeS * 0.17 + 0.8) * driftY;
}

function spawnFly(globals, index, total, color) {
  const dpr = globals.DPR || 1;
  const targetX = getIdleTargetX(globals, 0);
  const targetY = getIdleTargetY(globals, 0);
  const spread = clamp(Math.min(globals.canvas.width, globals.canvas.height) * 0.28, 155 * dpr, 285 * dpr);
  const sequenceRatio = (index + 0.5) / Math.max(1, total);
  const angle = index * GOLDEN_ANGLE + (Math.random() - 0.5) * 0.72;
  const distance = (0.34 + Math.sqrt(sequenceRatio) * 0.78 + Math.random() * 0.16) * spread;
  const margin = 36 * dpr;
  const x = clamp(targetX + Math.cos(angle) * distance * 1.18, margin, globals.canvas.width - margin);
  const y = clamp(targetY + Math.sin(angle) * distance * 0.78, margin, globals.canvas.height - margin);
  const ball = spawnBall(x, y, color);
  return ball;
}

export function initializeFlies() {
  const globals = getGlobals();
  clearBalls();
  
  const targetBalls = getMobileAdjustedCount(globals.fliesBallCount ?? 60);
  if (targetBalls <= 0) return;
  
  // Initial velocity base (DPR-scaled)
  const baseSpeed = 240 * globals.DPR;
  
  // First, seed a visible weighted-palette group into an asymmetric cloud so
  // the loaded simulation does not inherit the boot spinner's centred orbit.
  for (let colorIndex = 0; colorIndex < 8; colorIndex++) {
    const ball = spawnFly(globals, colorIndex, targetBalls, pickRandomColor());
    
    const speedVariation = 0.5 + Math.random() * 0.5;
    const vAngle = Math.random() * Math.PI * 2;
    const speed = baseSpeed * speedVariation;
    ball.vx = Math.cos(vAngle) * speed;
    ball.vy = Math.sin(vAngle) * speed;
    ball.driftAx = 0;
    ball.driftTime = 0;
  }
  
  // Then fill the rest with random colors
  for (let i = 8; i < targetBalls; i++) {
    const ball = spawnFly(globals, i, targetBalls);
    
    const speedVariation = 0.5 + Math.random() * 0.5;
    const vAngle = Math.random() * Math.PI * 2;
    const speed = baseSpeed * speedVariation;
    ball.vx = Math.cos(vAngle) * speed;
    ball.vy = Math.sin(vAngle) * speed;
    ball.driftAx = 0;
    ball.driftTime = 0;
  }
}

export function applyFliesForces(ball, dt) {
  const globals = getGlobals();
  const attractionPower = globals.attractionPower ?? 5000;
  const swarmSpeed = globals.swarmSpeed ?? 0.4;
  const pointerActive = globals.mouseX !== CONSTANTS.OFFSCREEN_MOUSE && globals.mouseY !== CONSTANTS.OFFSCREEN_MOUSE;
  const timeS = performance.now() * 0.001;
  const separationRadius = 120 * globals.DPR;
  if (ball === globals.balls[0]) buildNeighbourGrid(globals, separationRadius);
  
  const swarmCenterX = pointerActive ? globals.mouseX : getIdleTargetX(globals, timeS);
  const swarmCenterY = pointerActive ? globals.mouseY : getIdleTargetY(globals, timeS);
  
  const dx = swarmCenterX - ball.x;
  const dy = swarmCenterY - ball.y;
  const d = Math.sqrt(dx*dx + dy*dy + 1);
  
  const dirX = dx / d;
  const dirY = dy / d;
  
  const attractForce = attractionPower * swarmSpeed * (pointerActive ? 2.0 : 1.35);
  ball.vx += dirX * attractForce * dt;
  ball.vy += dirY * attractForce * dt;
  
  // Separation
  let sepX = 0, sepY = 0, neighborCount = 0;
  const neighbours = collectNeighbourIndices(ball);
  for (let i = 0; i < neighbours.length; i++) {
    const other = globals.balls[neighbours[i]];
    if (other === ball) continue;
    const dx2 = ball.x - other.x;
    const dy2 = ball.y - other.y;
    const d2 = dx2*dx2 + dy2*dy2;
    if (d2 < separationRadius * separationRadius && d2 > 0) {
      const d_other = Math.sqrt(d2);
      const strength = 1 - (d_other / separationRadius);
      sepX += (dx2 / d_other) * strength;
      sepY += (dy2 / d_other) * strength;
      neighborCount++;
    }
  }
  if (globals.performanceAuditEnabled === true) {
    globals.fliesNeighbourCandidateCount = (Number(globals.fliesNeighbourCandidateCount) || 0) + neighbours.length;
  }
  if (neighborCount > 0) {
    const separationForce = globals.fliesSeparation ?? 15000;
    ball.vx += (sepX / neighborCount) * separationForce * dt;
    ball.vy += (sepY / neighborCount) * separationForce * dt;
  }
  
  if (!pointerActive) {
    const eddyForce = 900 * swarmSpeed * (globals.DPR || 1);
    ball.vx += Math.sin((ball.x + ball.y) * 0.0018 + timeS * 0.9) * eddyForce * dt;
    ball.vy += Math.cos((ball.x - ball.y) * 0.0016 - timeS * 0.7) * eddyForce * dt;
  }

  // Small living jitter; quieter while idle so the loaded page does not feel
  // like a busy loader continuing to spin.
  const jitterBase = (pointerActive ? 2500 : 850) * swarmSpeed;
  ball.vx += (Math.random() - 0.5) * jitterBase * dt;
  ball.vy += (Math.random() - 0.5) * jitterBase * dt;
}
