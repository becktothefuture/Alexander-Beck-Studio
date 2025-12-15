// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       BALL PIT (SIDE THROWS) MODE                             ║
// ║            Color-by-color batches thrown from top corners                     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { spawnBall } from '../physics/spawn.js';
import { getGlobals, clearBalls } from '../core/state.js';
import { getColorByIndex } from '../visual/colors.js';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function randBetween(min, max) {
  return min + Math.random() * (max - min);
}

function shuffle8InPlace(a) {
  // Fisher-Yates shuffle for an 8-slot array (numbers 0..7).
  for (let i = 7; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
}

function getNextBalancedColorIndex(state) {
  // Match Ball Pit’s “random colors but balanced” feel:
  // - Each bag contains 0..7 exactly once (guarantees each color appears)
  // - Bag order is randomized (feels random, avoids deterministic cycles)
  // - Refill + reshuffle when exhausted
  const bag = state.colorBag;
  if (!bag) return 0;
  if (state.colorBagIdx >= 8) {
    shuffle8InPlace(bag);
    state.colorBagIdx = 0;
  }
  const c = bag[state.colorBagIdx] | 0;
  state.colorBagIdx++;
  return c;
}

function spawnOneThrow(g, colorIndex, side, { speedMul = 1, spreadMul = 1 } = {}) {
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

  const baseSpeed = clamp(g.pitThrowSpeed ?? 650, 50, 4000);
  const speedJitter = clamp(g.pitThrowSpeedJitter ?? 0.22, 0, 0.8);
  const angleJitter = clamp(g.pitThrowAngleJitter ?? 0.16, 0, 0.8);

  const ball = spawnBall(x, y, getColorByIndex(colorIndex));

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

  // Emitter state (kept on globals to avoid per-frame allocations)
  g._pitThrows = {
    colorIndex: 0,
    side: 0, // 0 = left, 1 = right
    inColorRemaining: clamp(g.pitThrowBatchSize ?? 13, 1, 120) | 0,
    cooldown: 0,
    phase: 'throw', // 'throw' | 'pause'
    queueA: -1,
    queueB: -1,
    queueColorA: 0,
    queueColorB: 0,
    queueSideA: 0,
    queueSideB: 1,

    // Balanced “random” color distribution (like standard Ball Pit):
    // each bag contains all 8 colors once, shuffled.
    colorBag: [0, 1, 2, 3, 4, 5, 6, 7],
    colorBagIdx: 8
  };

  // Force initial shuffle so the first run is not 0..7 in order.
  shuffle8InPlace(g._pitThrows.colorBag);
  g._pitThrows.colorBagIdx = 0;

  // Start on a randomized-but-balanced first color.
  g._pitThrows.colorIndex = getNextBalancedColorIndex(g._pitThrows);

  // IMPORTANT: Physics loop early-returns if there are no balls, so seed with 1 throw.
  spawnOneThrow(g, g._pitThrows.colorIndex, g._pitThrows.side);
  g._pitThrows.inColorRemaining = Math.max(0, g._pitThrows.inColorRemaining - 1);
}

export function updatePitThrows(dtSeconds) {
  const g = getGlobals();
  if (!g || g.currentMode !== 'pit-throws') return;

  const targetBalls = Math.max(0, (g.maxBalls ?? 300) | 0);
  if (targetBalls <= 0) return;
  if (g.balls.length >= targetBalls) return;

  const s = g._pitThrows;
  if (!s) return;

  // Timing
  const intervalMs = clamp(g.pitThrowIntervalMs ?? 70, 10, 2000);
  const pauseMs = clamp(g.pitThrowColorPauseMs ?? 180, 0, 5000);
  const interval = intervalMs / 1000;
  const pause = pauseMs / 1000;
  const pairChance = clamp(g.pitThrowPairChance ?? 0.35, 0, 1);
  const pairStagger = clamp(g.pitThrowPairStaggerMs ?? 18, 0, 300) / 1000;
  const speedVar = clamp(g.pitThrowSpeedVar ?? 0.18, 0, 1);
  const spreadVar = clamp(g.pitThrowSpreadVar ?? 0.25, 0, 1);

  s.cooldown -= dtSeconds;
  if (s.cooldown < 0) s.cooldown = 0;

  // Cap how many we spawn per frame to keep frame time stable
  const maxSpawnsThisFrame = 6;
  let spawned = 0;

  // Service queued stagger throws (A/B lanes)
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

  while (spawned < maxSpawnsThisFrame && g.balls.length < targetBalls) {
    if (s.phase === 'pause') {
      // Transition into next color
      s.phase = 'throw';
      s.colorIndex = getNextBalancedColorIndex(s);
      s.side = 1 - s.side; // alternate starting side each color
      s.inColorRemaining = clamp(g.pitThrowBatchSize ?? 13, 1, 120) | 0;
    }

    if (s.inColorRemaining > 0) {
      // Alternate side within the color too (more overlap + interleaving)
      const thisSide = s.side;
      s.side = 1 - s.side;

      const speedMul = 1 + randBetween(-speedVar, speedVar);
      const spreadMul = 1 + randBetween(-spreadVar, spreadVar);
      spawnOneThrow(g, s.colorIndex, thisSide, { speedMul, spreadMul });
      s.inColorRemaining--;
      spawned++;

      // Optional paired throw from the opposite side, slightly staggered
      if (pairStagger > 0 && Math.random() < pairChance && g.balls.length < targetBalls) {
        const side2 = 1 - thisSide;
        // Put into one of two tiny queues (A/B) so we can stagger without allocations.
        // If both occupied, we just skip pairing this time.
        if (s.queueA < 0) {
          s.queueA = pairStagger;
          s.queueColorA = s.colorIndex;
          s.queueSideA = side2;
        } else if (s.queueB < 0) {
          s.queueB = pairStagger;
          s.queueColorB = s.colorIndex;
          s.queueSideB = side2;
        }
      }

      if (s.inColorRemaining <= 0) {
        // Finished this color: short pause before next color
        s.phase = 'pause';
        s.cooldown = pause;
        break;
      } else {
        // Short interval between balls of the same color
        s.cooldown = interval;
        break;
      }
    } else {
      // Safety: if somehow depleted, force a pause->next-color transition
      s.phase = 'pause';
      s.cooldown = pause;
      break;
    }
  }
}

