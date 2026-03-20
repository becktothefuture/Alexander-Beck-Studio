// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         COLLISION DETECTION (COMPLETE)                       ║
// ║              Spatial hashing + resolution from lines 2350-2466               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { CONSTANTS, isPitLikeMode, MODES } from '../core/constants.js';
import { getGlobals } from '../core/state.js';
import { playCollisionSound } from '../audio/sound-engine.js';
import { portfolioPitNarrowPhase, portfolioPitKinematicOverlap } from './portfolio-pit-narrow-phase.js';

/** Min center distance for ball–ball (canvas buffer px): r1+r2 + ratio padding + flat gap */
export function getBallBallRestDistance(A, B, globals) {
  const spacingRatio = globals.ballSpacing || 0;
  const avgRadius = (A.r + B.r) * 0.5;
  const gapPx = Math.max(0, Number(globals.ballBallSurfaceGapPx) || 0);
  return A.r + B.r + (avgRadius * spacingRatio) + gapPx;
}

function getCollisionPositionalSlop(globals) {
  const s = globals.collisionPairSlopPx;
  if (typeof s === 'number' && Number.isFinite(s)) return Math.max(0, s);
  return 0.5 * (globals.DPR || 1);
}

const spatialGrid = new Map();
const reusablePairs = [];
const pairPool = [];
const lastBroadphaseStats = {
  sleepingPairSkips: 0
};

/** Centers closer than this use an arbitrary separation axis (avoids div-by-zero / skipped pairs). */
const COINCIDENT_CENTERS_EPS2 = 1e-8;

function collectPairsSorted() {
  const globals = getGlobals();
  const balls = globals.balls;
  const canvas = globals.canvas;
  const R_MAX = globals.R_MAX;
  const spacingRatio = globals.ballSpacing || 0; // Ratio of average radius (0.1 = 10% of ball size)
  const surfaceGapPx = Math.max(0, Number(globals.ballBallSurfaceGapPx) || 0);

  const n = balls.length;
  // Always reuse the same array to avoid per-frame allocations.
  reusablePairs.length = 0;
  lastBroadphaseStats.sleepingPairSkips = 0;
  if (n < 2) return reusablePairs;

  // Portfolio project radii are huge vs home pit defaults; R_MAX can lag or stay stale (e.g. 18px).
  // cellSize must cover max rSum or the 3×3 stencil misses overlapping pairs → clipping / no stacks.
  let cellRMax = Number.isFinite(R_MAX) && R_MAX > 0 ? R_MAX : 1;
  if (globals.currentMode === MODES.PORTFOLIO_PIT) {
    for (let bi = 0; bi < n; bi += 1) {
      const br = balls[bi]?.r;
      if (Number.isFinite(br) && br > cellRMax) cellRMax = br;
    }
    if (cellRMax > (Number(globals.R_MAX) || 0)) {
      globals.R_MAX = cellRMax;
    }
  }

  const reuseGrid = globals.physicsSpatialGridOptimization !== false;
  const pitLike = isPitLikeMode(globals.currentMode);
  // With a flat surface gap, sleeping stacks must still generate pairs or gaps won't hold.
  const pitSleepAwareBroadphase = pitLike
    && globals.pitSleepAwareBroadphaseEnabled !== false
    && surfaceGapPx <= 0;

  // Fast path: if everything is sleeping, skip broadphase (huge win for 300-ball home pit).
  // MUST NOT run when a minimum ball–ball gap is active: overlaps would never be corrected.
  // Small pit-like modes (e.g. portfolio) also keep collecting pairs so settled stacks stay valid.
  if (reuseGrid) {
    let anyAwake = false;
    for (let i = 0; i < n; i++) {
      const b = balls[i];
      if (b && !b.isSleeping) { anyAwake = true; break; }
    }
    const smallPitLike = pitLike && n <= 64;
    if (!anyAwake && surfaceGapPx <= 0 && !smallPitLike) return reusablePairs;
  }
  
  // Cell size must account for spacing + optional flat surface gap between balls.
  const cellSize = Math.max(1, cellRMax * 2 * (1 + spacingRatio) + surfaceGapPx * 2);
  const gridWidth = Math.ceil(canvas.width / cellSize) + 1;
  if (reuseGrid) {
    for (const arr of spatialGrid.values()) arr.length = 0;
  } else {
    spatialGrid.clear();
  }
  
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
  
  for (const [key, arr] of spatialGrid) {
    if (arr.length === 0) continue;
    const cy = (key / gridWidth) | 0;
    const cx = key % gridWidth;
    
    // Check 9 neighboring cells
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const neighborKey = (cy + oy) * gridWidth + (cx + ox);
        const nb = spatialGrid.get(neighborKey);
        if (!nb) continue;
        if (nb.length === 0) continue;
        
        for (let ii = 0; ii < arr.length; ii++) {
          const i = arr[ii];
          for (let jj = 0; jj < nb.length; jj++) {
            const j = nb[jj];
            if (j <= i) continue;
            
            const A = balls[i], B = balls[j];
            if (pitSleepAwareBroadphase && A.isSleeping && B.isSleeping) {
              lastBroadphaseStats.sleepingPairSkips++;
              continue;
            }
            const dx = B.x - A.x, dy = B.y - A.y;
            const rSum = getBallBallRestDistance(A, B, globals);
            const dist2 = dx*dx + dy*dy;
            
            if (dist2 < rSum*rSum) {
              const dist = Math.sqrt(Math.max(dist2, CONSTANTS.MIN_DISTANCE_EPSILON));
              const overlap = rSum - dist;
              const idx = reusablePairs.length;
              let p = pairPool[idx];
              if (!p) { p = { i: 0, j: 0, overlap: 0 }; pairPool[idx] = p; }
              p.i = i;
              p.j = j;
              p.overlap = overlap;
              reusablePairs.push(p);
            }
          }
        }
      }
    }
  }
  
  // PERF: Sort removed - O(n log n) overhead not needed for convergence
  // Collision resolution works fine without prioritizing by overlap size
  return reusablePairs;
}

export function resolveCollisions(iterations = 10) {
  const globals = getGlobals();
  const balls = globals.balls;
  const pairs = collectPairsSorted();
  const sleepingPairSkips = lastBroadphaseStats.sleepingPairSkips;
  const REST = globals.REST;
  const POS_CORRECT_PERCENT = 0.8;
  const POS_CORRECT_SLOP = getCollisionPositionalSlop(globals);
  const REST_VEL_THRESHOLD = 30;
  const skipSleepingCollisions = Boolean(globals.physicsSkipSleepingCollisions);
  let overlapDebt = 0;
  
  for (let iter = 0; iter < iterations; iter++) {
    for (let k = 0; k < pairs.length; k++) {
      const { i, j } = pairs[k];
      const A = balls[i];
      const B = balls[j];
      if (A.isPointerLocked && B.isPointerLocked) continue;

      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const rSum = getBallBallRestDistance(A, B, globals);
      const dist2 = dx * dx + dy * dy;
      if (dist2 > rSum * rSum) continue;

      let dist;
      let nx;
      let ny;
      let overlap;

      const usePortfolioSat =
        globals.currentMode === MODES.PORTFOLIO_PIT
        && A.projectIndex !== undefined
        && B.projectIndex !== undefined;
      const narrow = usePortfolioSat ? portfolioPitNarrowPhase(A, B, globals) : null;

      if (narrow && !narrow.useCircle && narrow.hasContact) {
        nx = narrow.nx;
        ny = narrow.ny;
        overlap = narrow.overlap;
        dist = Math.max(CONSTANTS.MIN_DISTANCE_EPSILON, 1e-4);
      } else {
        if (dist2 < COINCIDENT_CENTERS_EPS2) {
          nx = 1;
          ny = 0;
          dist = Math.max(CONSTANTS.MIN_DISTANCE_EPSILON, 1e-4);
        } else {
          dist = Math.sqrt(dist2);
          nx = dx / dist;
          ny = dy / dist;
        }
        overlap = rSum - dist;
      }
      if (iter === 0 && overlap > 0) overlapDebt += overlap;
      const invA = A.isPointerLocked ? 0 : (1 / Math.max(A.m, 0.001));
      const invB = B.isPointerLocked ? 0 : (1 / Math.max(B.m, 0.001));
      const invSum = invA + invB;
      if (invSum <= 0) continue;

      const bothSleeping = A.isSleeping && B.isSleeping;

      // Positional correction (always applied to prevent overlap, even for sleeping bodies)
      const correctionMag = POS_CORRECT_PERCENT * Math.max(overlap - POS_CORRECT_SLOP, 0) / invSum;
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
      const isPitLike = isPitLikeMode(globals.currentMode);
      if (isPitLike && ny < -0.3) { // Normal pointing up = B is on top of A
        // B is supported from below by A
        B.hasSupport = true;
      } else if (isPitLike && ny > 0.3) { // Normal pointing down = A is on top of B
        // A is supported from below by B
        A.hasSupport = true;
      }

      // PERFORMANCE: When both bodies are sleeping, we still need positional correction
      // (prevents overlap drift), but we can skip all velocity/sound/squash work.
      if (skipSleepingCollisions && bothSleeping) continue;

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
        const j = -(1 + e) * velAlongNormal / invSum;
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
          if (!A.isPointerLocked) {
            A.omega -= tangentSign * gain * slipMag / Math.max(A.r, 1);
          }
          if (!B.isPointerLocked) {
            B.omega += tangentSign * gain * slipMag / Math.max(B.r, 1);
          }
        }

        // Squash
        const impact = Math.min(1, Math.abs(velAlongNormal) / ((A.r + B.r) * 50));
        const sAmt = Math.min(globals.getSquashMax(), impact * 0.8);
        if (!A.isPointerLocked) {
          A.squashAmount = Math.max(A.squashAmount, sAmt * 0.8);
          A.squashNormalAngle = Math.atan2(-ny, -nx);
        }
        if (!B.isPointerLocked) {
          B.squashAmount = Math.max(B.squashAmount, sAmt * 0.8);
          B.squashNormalAngle = Math.atan2(ny, nx);
        }
        
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

  return {
    pairCount: pairs.length,
    overlapDebt,
    sleepingPairSkips
  };
}

// Pointer-driven ball: separate overlaps without relying on broadphase (sleeping stacks
// often omit ball–ball pairs for perf). Then reuse the global solver to propagate forces.
const KINEMATIC_OVERLAP_ITERS = 22;
const KINEMATIC_POS_PERCENT = 1;
const KINEMATIC_POST_SOLVER_ITERS = 10;

/**
 * Push all non-kinematic balls out of overlap with `kinematicBall`, then run a short
 * collision solve so stacks and neighbors redistribute. O(n * iters); safe for portfolio
 * ball counts. Call from pointermove after the kinematic position is set.
 */
export function relaxOverlapsWithKinematicBall(kinematicBall) {
  if (!kinematicBall?.isPointerLocked) return;
  const globals = getGlobals();
  const balls = globals.balls;
  if (!Array.isArray(balls) || balls.length < 2) return;

  const slop = getCollisionPositionalSlop(globals);
  const n = balls.length;

  for (let iter = 0; iter < KINEMATIC_OVERLAP_ITERS; iter += 1) {
    for (let i = 0; i < n; i += 1) {
      const B = balls[i];
      if (!B || B === kinematicBall) continue;
      if (B.isPointerLocked) continue;
      if (B.__portfolioHidden) continue;

      const dx = B.x - kinematicBall.x;
      const dy = B.y - kinematicBall.y;
      const dist2 = dx * dx + dy * dy;
      const rSum = getBallBallRestDistance(kinematicBall, B, globals);

      const usePortfolioK =
        globals.currentMode === MODES.PORTFOLIO_PIT
        && kinematicBall.projectIndex !== undefined
        && B.projectIndex !== undefined;

      if (usePortfolioK) {
        const pk = portfolioPitKinematicOverlap(kinematicBall, B, globals);
        if (!pk) continue;
        const sep = KINEMATIC_POS_PERCENT * Math.max(pk.overlap - slop, 0);
        if (sep <= 0) continue;
        B.x += pk.nx * sep;
        B.y += pk.ny * sep;
        B.wake?.();
        continue;
      }

      if (dist2 >= rSum * rSum) continue;

      let dist;
      let nx;
      let ny;
      if (dist2 < COINCIDENT_CENTERS_EPS2) {
        nx = 1;
        ny = 0;
        dist = Math.max(CONSTANTS.MIN_DISTANCE_EPSILON, 1e-4);
      } else {
        dist = Math.sqrt(dist2);
        nx = dx / dist;
        ny = dy / dist;
      }
      const overlap = rSum - dist;
      const sep = KINEMATIC_POS_PERCENT * Math.max(overlap - slop, 0);
      if (sep <= 0) continue;

      B.x += nx * sep;
      B.y += ny * sep;
      B.wake?.();
    }
  }

  resolveCollisions(KINEMATIC_POST_SOLVER_ITERS);
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
  const POS_CORRECT_SLOP = (positionalCorrectionSlopPx ?? getCollisionPositionalSlop(globals));
  const REST_VEL_THRESHOLD = 30;
  const correctionCap = (maxCorrectionPx ?? (2.0 * (globals.DPR || 1)));

  for (let iter = 0; iter < iterations; iter++) {
    for (let k = 0; k < pairs.length; k++) {
      const { i, j } = pairs[k];
      const A = balls[i];
      const B = balls[j];
      if (A.isPointerLocked && B.isPointerLocked) continue;

      if (A.isSleeping && B.isSleeping) continue;
      if (A.isSleeping) A.wake();
      if (B.isSleeping) B.wake();

      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const rSum = getBallBallRestDistance(A, B, globals);
      const dist2 = dx * dx + dy * dy;
      if (dist2 > rSum * rSum) continue;

      let dist;
      let nx;
      let ny;
      if (dist2 < COINCIDENT_CENTERS_EPS2) {
        nx = 1;
        ny = 0;
        dist = Math.max(CONSTANTS.MIN_DISTANCE_EPSILON, 1e-4);
      } else {
        dist = Math.sqrt(dist2);
        nx = dx / dist;
        ny = dy / dist;
      }
      const overlap = rSum - dist;
      const invA = A.isPointerLocked ? 0 : (1 / Math.max(A.m, 0.001));
      const invB = B.isPointerLocked ? 0 : (1 / Math.max(B.m, 0.001));
      const invSum = invA + invB;
      if (invSum <= 0) continue;

      // Positional correction (capped to prevent visible pops)
      let correctionMag = POS_CORRECT_PERCENT * Math.max(overlap - POS_CORRECT_SLOP, 0) / invSum;
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
        const jImpulse = -(1 + e) * velAlongNormal / invSum;
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

  return {
    pairCount: pairs.length,
    overlapDebt: 0,
    sleepingPairSkips: lastBroadphaseStats.sleepingPairSkips
  };
}
