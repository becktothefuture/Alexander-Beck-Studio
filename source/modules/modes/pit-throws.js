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

/**
 * Create a weighted color bag that ensures all colors appear while maintaining ratio
 * Bag contains 100 items: [50, 25, 12, 6, 3, 2, 1, 1] for colors [0-7]
 */
function createWeightedColorBag() {
  const g = getGlobals();
  const colors = g.currentColors;
  if (!colors || colors.length === 0) {
    return [getColorByIndex(0)]; // Fallback
  }

  const bag = [];
  // Fill bag according to weights (scaled to 100 items for exact ratio)
  const counts = [50, 25, 12, 6, 3, 2, 1, 1];
  for (let i = 0; i < 8 && i < colors.length; i++) {
    for (let j = 0; j < counts[i]; j++) {
      bag.push(colors[i]);
    }
  }
  
  // Fisher-Yates shuffle
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = bag[i];
    bag[i] = bag[j];
    bag[j] = tmp;
  }
  
  return bag;
}

/**
 * Create an initial “one-of-each” bag (0..7) so Pit Throws matches the same
 * palette-coverage rationale as other modes: you always *see* all colors early.
 * (After the bootstrap, we use the weighted bag to preserve the Ball Pit ratio.)
 */
function createBootstrapColorBag() {
  const bag = [];
  for (let i = 0; i < 8; i++) bag.push(getColorByIndex(i));

  // Fisher-Yates shuffle
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = bag[i];
    bag[i] = bag[j];
    bag[j] = tmp;
  }

  return bag;
}

/**
 * Get next color from weighted bag, refilling when exhausted
 */
function getNextWeightedColor(state) {
  // Bootstrap: guarantee each palette color appears once (0..7) before weighted distribution.
  if (state.bootstrapBag && state.bootstrapIdx < state.bootstrapBag.length) {
    const color = state.bootstrapBag[state.bootstrapIdx];
    state.bootstrapIdx++;
    return color;
  }

  if (!state.colorBag || state.colorBagIdx >= state.colorBag.length) {
    state.colorBag = createWeightedColorBag();
    state.colorBagIdx = 0;
  }
  const color = state.colorBag[state.colorBagIdx];
  state.colorBagIdx++;
  return color;
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

  const baseSpeed = clamp(g.pitThrowSpeed ?? 650, 50, 4000);
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

  // Emitter state (kept on globals to avoid per-frame allocations)
  const initialState = {
    bootstrapBag: createBootstrapColorBag(),
    bootstrapIdx: 0,
    colorBag: null,
    colorBagIdx: 0,
    side: 0, // 0 = left, 1 = right
    inColorRemaining: clamp(g.pitThrowBatchSize ?? 13, 1, 120) | 0,
    cooldown: 0,
    phase: 'throw', // 'throw' | 'pause'
    queueA: -1,
    queueB: -1,
    queueColorA: null,
    queueColorB: null,
    queueSideA: 0,
    queueSideB: 1
  };
  
  // Initialize weighted color bag and get first color
  initialState.color = getNextWeightedColor(initialState);
  initialState.queueColorA = getNextWeightedColor(initialState);
  initialState.queueColorB = getNextWeightedColor(initialState);
  
  g._pitThrows = initialState;

  // IMPORTANT: Physics loop early-returns if there are no balls, so seed with 1 throw.
  spawnOneThrow(g, g._pitThrows.color, g._pitThrows.side);
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
      // Transition into next color (using weighted bag - ensures all colors appear)
      s.phase = 'throw';
      s.color = getNextWeightedColor(s);
      s.side = 1 - s.side; // alternate starting side each color
      s.inColorRemaining = clamp(g.pitThrowBatchSize ?? 13, 1, 120) | 0;
    }

    if (s.inColorRemaining > 0) {
      // Alternate side within the color too (more overlap + interleaving)
      const thisSide = s.side;
      s.side = 1 - s.side;

      const speedMul = 1 + randBetween(-speedVar, speedVar);
      const spreadMul = 1 + randBetween(-spreadVar, spreadVar);
      spawnOneThrow(g, s.color, thisSide, { speedMul, spreadMul });
      s.inColorRemaining--;
      spawned++;

      // Optional paired throw from the opposite side, slightly staggered
      if (pairStagger > 0 && Math.random() < pairChance && g.balls.length < targetBalls) {
        const side2 = 1 - thisSide;
        // Put into one of two tiny queues (A/B) so we can stagger without allocations.
        // If both occupied, we just skip pairing this time.
        if (s.queueA < 0) {
          s.queueA = pairStagger;
          s.queueColorA = s.color;
          s.queueSideA = side2;
        } else if (s.queueB < 0) {
          s.queueB = pairStagger;
          s.queueColorB = s.color;
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

