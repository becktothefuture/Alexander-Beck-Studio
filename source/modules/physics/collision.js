// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         COLLISION DETECTION (COMPLETE)                       ║
// ║              Spatial hashing + resolution from lines 2350-2466               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { CONSTANTS } from '../core/constants.js';
import { getGlobals } from '../core/state.js';
import { playCollisionSound } from '../audio/sound-engine.js';

const spatialGrid = new Map();

function collectPairsSorted() {
  const globals = getGlobals();
  const balls = globals.balls;
  const canvas = globals.canvas;
  const R_MAX = globals.R_MAX;
  const spacingRatio = globals.ballSpacing || 0; // Ratio of average radius (0.1 = 10% of ball size)
  
  const n = balls.length;
  if (n < 2) return [];
  
  // Cell size must account for spacing: max collision distance is R_MAX*2*(1+spacingRatio/2)
  // since spacing is applied to the average radius. Using (1 + spacingRatio) to be safe.
  const cellSize = Math.max(1, R_MAX * 2 * (1 + spacingRatio));
  const gridWidth = Math.ceil(canvas.width / cellSize) + 1;
  spatialGrid.clear();
  
  // Build grid
  for (let i = 0; i < n; i++) {
    const b = balls[i];
    const cx = (b.x / cellSize) | 0;
    const cy = (b.y / cellSize) | 0;
    const key = cy * gridWidth + cx;
    let arr = spatialGrid.get(key);
    if (!arr) { arr = []; spatialGrid.set(key, arr); }
    arr.push(i);
  }
  
  const pairs = [];
  for (const [key, arr] of spatialGrid) {
    const cy = (key / gridWidth) | 0;
    const cx = key % gridWidth;
    
    // Check 9 neighboring cells
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const neighborKey = (cy + oy) * gridWidth + (cx + ox);
        const nb = spatialGrid.get(neighborKey);
        if (!nb) continue;
        
        for (let ii = 0; ii < arr.length; ii++) {
          const i = arr[ii];
          for (let jj = 0; jj < nb.length; jj++) {
            const j = nb[jj];
            if (j <= i) continue;
            
            const A = balls[i], B = balls[j];
            const dx = B.x - A.x, dy = B.y - A.y;
            const avgRadius = (A.r + B.r) / 2;
            const rSum = A.r + B.r + (avgRadius * spacingRatio); // Spacing as ratio of average radius
            const dist2 = dx*dx + dy*dy;
            
            if (dist2 < rSum*rSum) {
              const dist = Math.sqrt(Math.max(dist2, CONSTANTS.MIN_DISTANCE_EPSILON));
              const overlap = rSum - dist;
              pairs.push({ i, j, overlap });
            }
          }
        }
      }
    }
  }
  
  pairs.sort((a, b) => b.overlap - a.overlap);
  return pairs;
}

export function resolveCollisions(iterations = 10) {
  const globals = getGlobals();
  const balls = globals.balls;
  const pairs = collectPairsSorted();
  const REST = globals.REST;
  const POS_CORRECT_PERCENT = 0.8;
  const POS_CORRECT_SLOP = 0.5 * globals.DPR;
  const REST_VEL_THRESHOLD = 30;
  const spacingRatio = globals.ballSpacing || 0; // Ratio of average radius
  
  for (let iter = 0; iter < iterations; iter++) {
    for (let k = 0; k < pairs.length; k++) {
      const { i, j } = pairs[k];
      const A = balls[i];
      const B = balls[j];
      
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const avgRadius = (A.r + B.r) / 2;
      const rSum = A.r + B.r + (avgRadius * spacingRatio); // Spacing as ratio of average radius
      const dist2 = dx * dx + dy * dy;
      if (dist2 === 0 || dist2 > rSum * rSum) continue;
      const dist = Math.sqrt(dist2);
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = rSum - dist;
      const invA = 1 / Math.max(A.m, 0.001);
      const invB = 1 / Math.max(B.m, 0.001);

      const bothSleeping = A.isSleeping && B.isSleeping;

      // Positional correction (always applied to prevent overlap, even for sleeping bodies)
      const correctionMag = POS_CORRECT_PERCENT * Math.max(overlap - POS_CORRECT_SLOP, 0) / (invA + invB);
      const cx = correctionMag * nx;
      const cy = correctionMag * ny;
      A.x -= cx * invA; A.y -= cy * invA;
      B.x += cx * invB; B.y += cy * invB;

      // ════════════════════════════════════════════════════════════════════════════
      // BALL-ON-BALL SUPPORT DETECTION (Pit modes only)
      // If ball B is resting on ball A (B above A, contact normal pointing up),
      // mark B as "supported" so gravity is balanced by normal force next step.
      // This prevents gravity→collision→bounce jitter in stacked balls.
      // ════════════════════════════════════════════════════════════════════════════
      const isPitLike = (globals.currentMode === 'pit' || globals.currentMode === 'pit-throws');
      if (isPitLike && ny < -0.3) { // Normal pointing up = B is on top of A
        // B is supported from below by A
        B.hasSupport = true;
      } else if (isPitLike && ny > 0.3) { // Normal pointing down = A is on top of B
        // A is supported from below by B
        A.hasSupport = true;
      }

      // If both bodies are sleeping, skip velocity impulses entirely
      // (prevents micro-jiggle in fully settled stacks).
      if (bothSleeping) continue;

      // Velocity impulse calculation
      const rvx = B.vx - A.vx;
      const rvy = B.vy - A.vy;
      const velAlongNormal = rvx * nx + rvy * ny;
      
      // ════════════════════════════════════════════════════════════════════════════
      // REAL PHYSICS: Only wake sleeping balls if impulse is significant
      // Small positional corrections shouldn't wake settled stacks (causes cascade)
      // Threshold DPR-scaled: physics runs in canvas pixels (displayPx * DPR)
      // ════════════════════════════════════════════════════════════════════════════
      const DPR = globals.DPR || 1;
      const WAKE_VEL_THRESHOLD = 15 * DPR; // px/s - only wake if approaching at meaningful speed
      const shouldWake = velAlongNormal < -WAKE_VEL_THRESHOLD;
      
      if (A.isSleeping && !shouldWake) continue; // Don't wake from tiny impulse
      if (B.isSleeping && !shouldWake) continue;
      if (A.isSleeping) A.wake();
      if (B.isSleeping) B.wake();

      if (velAlongNormal < 0) {
        const e = Math.abs(velAlongNormal) < REST_VEL_THRESHOLD ? 0 : REST;
        const j = -(1 + e) * velAlongNormal / (invA + invB);
        const ix = j * nx;
        const iy = j * ny;
        A.vx -= ix * invA; A.vy -= iy * invA;
        B.vx += ix * invB; B.vy += iy * invB;

        // Spin transfer
        const tvx = rvx - velAlongNormal * nx;
        const tvy = rvy - velAlongNormal * ny;
        const slipMag = Math.hypot(tvx, tvy);
        if (slipMag > 1e-3) {
          const tangentSign = (tvx * -ny + tvy * nx) >= 0 ? 1 : -1;
          const gain = CONSTANTS.SPIN_GAIN_TANGENT;
          A.omega -= tangentSign * gain * slipMag / Math.max(A.r, 1);
          B.omega += tangentSign * gain * slipMag / Math.max(B.r, 1);
        }
        
        // Squash
        const impact = Math.min(1, Math.abs(velAlongNormal) / ((A.r + B.r) * 50));
        const sAmt = Math.min(globals.getSquashMax(), impact * 0.8);
        A.squashAmount = Math.max(A.squashAmount, sAmt * 0.8);
        A.squashNormalAngle = Math.atan2(-ny, -nx);
        B.squashAmount = Math.max(B.squashAmount, sAmt * 0.8);
        B.squashNormalAngle = Math.atan2(ny, nx);
        
        // ════════════════════════════════════════════════════════════════════════
        // SOUND: Play collision sound (threshold handled by sound engine)
        // Only on first iteration to avoid duplicate sounds
        // ════════════════════════════════════════════════════════════════════════
        if (iter === 0) {
          const avgRadius = (A.r + B.r) / 2;
          const midX = (A.x + B.x) / 2;
          const canvasWidth = globals.canvas?.width || 1;
          const xNormalized = midX / canvasWidth;
          // Use combined index as unique ID to debounce
          const collisionId = `${i}-${j}`;
          playCollisionSound(avgRadius, impact, xNormalized, collisionId);
        }
      }
    }
  }
}

/**
 * Kaleidoscope-friendly collision resolution:
 * - Avoids large, sudden positional corrections ("popping")
 * - Optionally disables sound/squash/spin side-effects
 * - Caps per-pair correction magnitude to keep motion continuous
 */
export function resolveCollisionsCustom({
  iterations = 4,
  positionalCorrectionPercent = 0.25,
  positionalCorrectionSlopPx = null,
  maxCorrectionPx = null,
  enableSound = true
} = {}) {
  const globals = getGlobals();
  const balls = globals.balls;
  const pairs = collectPairsSorted();
  const REST = globals.REST;
  const POS_CORRECT_PERCENT = positionalCorrectionPercent;
  const POS_CORRECT_SLOP = (positionalCorrectionSlopPx ?? (0.5 * globals.DPR));
  const REST_VEL_THRESHOLD = 30;
  const spacingRatio = globals.ballSpacing || 0; // Ratio of average radius
  const correctionCap = (maxCorrectionPx ?? (2.0 * (globals.DPR || 1)));

  for (let iter = 0; iter < iterations; iter++) {
    for (let k = 0; k < pairs.length; k++) {
      const { i, j } = pairs[k];
      const A = balls[i];
      const B = balls[j];

      if (A.isSleeping && B.isSleeping) continue;
      if (A.isSleeping) A.wake();
      if (B.isSleeping) B.wake();

      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const avgRadius = (A.r + B.r) / 2;
      const rSum = A.r + B.r + (avgRadius * spacingRatio); // Spacing as ratio of average radius
      const dist2 = dx * dx + dy * dy;
      if (dist2 === 0 || dist2 > rSum * rSum) continue;

      const dist = Math.sqrt(dist2);
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = rSum - dist;
      const invA = 1 / Math.max(A.m, 0.001);
      const invB = 1 / Math.max(B.m, 0.001);

      // Positional correction (capped to prevent visible pops)
      let correctionMag = POS_CORRECT_PERCENT * Math.max(overlap - POS_CORRECT_SLOP, 0) / (invA + invB);
      if (correctionMag > correctionCap) correctionMag = correctionCap;
      const cx = correctionMag * nx;
      const cy = correctionMag * ny;
      A.x -= cx * invA; A.y -= cy * invA;
      B.x += cx * invB; B.y += cy * invB;

      // Velocity impulse (keeps them from re-overlapping immediately)
      const rvx = B.vx - A.vx;
      const rvy = B.vy - A.vy;
      const velAlongNormal = rvx * nx + rvy * ny;
      if (velAlongNormal < 0) {
        const e = Math.abs(velAlongNormal) < REST_VEL_THRESHOLD ? 0 : REST;
        const jImpulse = -(1 + e) * velAlongNormal / (invA + invB);
        const ix = jImpulse * nx;
        const iy = jImpulse * ny;
        A.vx -= ix * invA; A.vy -= iy * invA;
        B.vx += ix * invB; B.vy += iy * invB;

        // SOUND (optional)
        if (enableSound && iter === 0) {
          const avgRadius = (A.r + B.r) / 2;
          const midX = (A.x + B.x) / 2;
          const canvasWidth = globals.canvas?.width || 1;
          const xNormalized = midX / canvasWidth;
          const impact = Math.min(1, Math.abs(velAlongNormal) / ((A.r + B.r) * 50));
          const collisionId = `${i}-${j}`;
          playCollisionSound(avgRadius, impact, xNormalized, collisionId);
        }
      }
    }
  }
}


