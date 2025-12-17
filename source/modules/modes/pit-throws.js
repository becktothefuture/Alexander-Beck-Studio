// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       BALL PIT (SIDE THROWS) MODE                             ║
// ║            Color-by-color batches thrown from top corners                     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { spawnBall } from '../physics/spawn.js';
import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { getColorByIndex } from '../visual/colors.js';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function randBetween(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Ball Pit color rule (to match the main Ball Pit look exactly):
 * - First 8 spawns: force indices 0..7 (guaranteed palette coverage)
 * - After that: leave color undefined so spawnBall() uses pickRandomColor()
 *   (which uses the same COLOR_WEIGHTS as Ball Pit).
 */
function getNextPitLikeColor(state) {
  const i = state.spawnedTotal | 0;
  state.spawnedTotal = i + 1;
  return (i < 8) ? getColorByIndex(i) : undefined;
}

function spawnOneThrow(g, color, side, { speedMul = 1, spreadMul = 1 } = {}) {
  const w = g.canvas.width;
  const h = g.canvas.height;
  const DPR = g.DPR;

  const padding = (g.wallThickness || 20) * DPR;
  const usableW = Math.max(1, w - 2 * padding);

  // Spawn just above the visible area, near the top-left / top-right “inlets”.
  const yTop = -h * 0.35;
  const yBottom = -h * 0.05;

  const inletInset = clamp(g.pitThrowInletInset ?? 0.06, 0.0, 0.2);
  const leftX = padding + usableW * inletInset;
  const rightX = w - padding - usableW * inletInset;

  const x0 = side === 0 ? leftX : rightX;
  const spawnSpreadBase = clamp(g.pitThrowSpawnSpread ?? 0.02, 0.0, 0.12);
  const spawnSpread = clamp(spawnSpreadBase * spreadMul, 0.0, 0.18);
  const x = x0 + randBetween(-usableW * spawnSpread, usableW * spawnSpread);
  const y = randBetween(yTop, yBottom);

  // Cross-aim (left throws slightly to the right, right throws slightly to the left)
  const targetYFrac = clamp(g.pitThrowTargetYFrac ?? 0.36, 0.12, 0.7);
  const crossBias = clamp(g.pitThrowCrossBias ?? 0.12, 0, 0.35);
  const aimJitterBase = clamp(g.pitThrowAimJitter ?? 0.04, 0.0, 0.2);
  const aimJitterFrac = clamp(aimJitterBase * spreadMul, 0.0, 0.25);
  const aimJitter = randBetween(-aimJitterFrac, aimJitterFrac);
  const aimX = w * (0.5 + (side === 0 ? crossBias : -crossBias) + aimJitter);
  const aimY = h * targetYFrac;

  // Base speed (DPR-scaled)
  const baseSpeed = clamp(g.pitThrowSpeed ?? 650, 50, 4000) * DPR;
  const speedJitter = clamp(g.pitThrowSpeedJitter ?? 0.22, 0, 0.8);
  const angleJitter = clamp(g.pitThrowAngleJitter ?? 0.16, 0, 0.8);

  const ball = spawnBall(x, y, color);

  // Aim vector toward (aimX, aimY), with angular jitter.
  const dx = aimX - x;
  const dy = aimY - y;
  const d = Math.max(1e-4, Math.sqrt(dx * dx + dy * dy));
  let nx = dx / d;
  let ny = dy / d;

  // Rotate unit vector by a small random angle.
  const a = randBetween(-Math.PI, Math.PI) * angleJitter;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const rx = nx * ca - ny * sa;
  const ry = nx * sa + ny * ca;
  nx = rx;
  ny = ry;

  // Speed with jitter.
  const v = baseSpeed * speedMul * (1 + randBetween(-speedJitter, speedJitter));
  ball.vx = nx * v;
  ball.vy = ny * v;

  // Ball Pit wants stable settling: disable default spawn drift impulse.
  ball.driftAx = 0;
  ball.driftTime = 0;

  return ball;
}

export function initializePitThrows() {
  const g = getGlobals();
  clearBalls();

  const targetBalls = getMobileAdjustedCount(g.maxBalls ?? 300);
  if (targetBalls <= 0) return;

  // Emitter state (kept on globals to avoid per-frame allocations)
  const initialState = {
    spawnedTotal: 0,
    side: 0, // 0 = left, 1 = right
    cooldown: 0,
    batchCount: 0,       // balls thrown in current batch
    batchPaused: false,  // true during inter-batch pause
    queueA: -1,
    queueB: -1,
    queueColorA: undefined,
    queueColorB: undefined,
    queueSideA: 0,
    queueSideB: 1
  };
  
  g._pitThrows = initialState;

  // IMPORTANT: Physics loop early-returns if there are no balls, so seed with 1 throw.
  const c0 = getNextPitLikeColor(g._pitThrows);
  spawnOneThrow(g, c0, g._pitThrows.side);
  g._pitThrows.side = 1 - g._pitThrows.side;
}

export function updatePitThrows(dtSeconds) {
  const g = getGlobals();
  if (!g || g.currentMode !== 'pit-throws') return;

  const targetBalls = Math.max(0, getMobileAdjustedCount(g.maxBalls ?? 300));
  if (targetBalls <= 0) return;
  if (g.balls.length >= targetBalls) return;

  const s = g._pitThrows;
  if (!s) return;

  // Timing config
  const intervalMs = clamp(g.pitThrowIntervalMs ?? 70, 10, 2000);
  const interval = intervalMs / 1000;
  const batchSize = clamp(g.pitThrowBatchSize ?? 12, 1, 100);
  const batchPauseMs = clamp(g.pitThrowColorPauseMs ?? 400, 0, 3000);
  const batchPause = batchPauseMs / 1000;
  const pairChance = clamp(g.pitThrowPairChance ?? 0.35, 0, 1);
  const pairStagger = clamp(g.pitThrowPairStaggerMs ?? 18, 0, 300) / 1000;
  const speedVar = clamp(g.pitThrowSpeedVar ?? 0.18, 0, 1);
  const spreadVar = clamp(g.pitThrowSpreadVar ?? 0.25, 0, 1);

  s.cooldown -= dtSeconds;
  if (s.cooldown < 0) s.cooldown = 0;

  // Cap how many we spawn per frame to keep frame time stable
  const maxSpawnsThisFrame = 6;
  let spawned = 0;

  // Service queued stagger throws (A/B lanes) - these don't count toward batch
  if (s.queueA >= 0) s.queueA -= dtSeconds;
  if (s.queueB >= 0) s.queueB -= dtSeconds;

  while (spawned < maxSpawnsThisFrame && g.balls.length < targetBalls) {
    let didQueueSpawn = false;

    if (s.queueA >= 0 && s.queueA <= 0) {
      const speedMul = 1 + randBetween(-speedVar, speedVar);
      const spreadMul = 1 + randBetween(-spreadVar, spreadVar);
      spawnOneThrow(g, s.queueColorA, s.queueSideA, { speedMul, spreadMul });
      s.queueA = -1;
      spawned++;
      didQueueSpawn = true;
    }

    if (spawned >= maxSpawnsThisFrame || g.balls.length >= targetBalls) break;

    if (s.queueB >= 0 && s.queueB <= 0) {
      const speedMul = 1 + randBetween(-speedVar, speedVar);
      const spreadMul = 1 + randBetween(-spreadVar, spreadVar);
      spawnOneThrow(g, s.queueColorB, s.queueSideB, { speedMul, spreadMul });
      s.queueB = -1;
      spawned++;
      didQueueSpawn = true;
    }

    if (!didQueueSpawn) break;
  }

  if (s.cooldown > 0) return;

  // Check if we're in a batch pause
  if (s.batchPaused) {
    // Batch pause complete → flip side for next batch, start fresh
    s.batchPaused = false;
    s.batchCount = 0;
    s.side = 1 - s.side; // Alternate side between batches
  }

  while (spawned < maxSpawnsThisFrame && g.balls.length < targetBalls) {
    // Check if batch is complete → enter pause
    if (batchPause > 0 && s.batchCount >= batchSize) {
      s.cooldown = batchPause;
      s.batchPaused = true;
      break;
    }

    // This entire batch comes from the same side
    const thisSide = s.side;

    const speedMul = 1 + randBetween(-speedVar, speedVar);
    const spreadMul = 1 + randBetween(-spreadVar, spreadVar);
    const color = getNextPitLikeColor(s);
    spawnOneThrow(g, color, thisSide, { speedMul, spreadMul });
    spawned++;
    s.batchCount++;

    // Optional extra ball from SAME side (handful effect)
    if (Math.random() < pairChance && g.balls.length < targetBalls && s.batchCount < batchSize) {
      const c2 = getNextPitLikeColor(s);
      if (s.queueA < 0) {
        s.queueA = pairStagger;
        s.queueColorA = c2;
        s.queueSideA = thisSide; // Same side for handful effect
        s.batchCount++;
      }
    }

    // Interval between throws within batch
    s.cooldown = interval;
    break;
  }
}

