// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      PHYSICS ENGINE (COMPLETE)                               ║
// ║           Fixed-timestep with collision detection                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { CONSTANTS, MODES, isPitLikeMode } from "/src/legacy/modules/core/constants.js";
import { getGlobals } from "/src/legacy/modules/core/state.js";
import { resolveCollisions, resolveCollisionsCustom } from "/src/legacy/modules/physics/collision.js";
import { drawWalls, updateChromeColor } from "/src/legacy/modules/physics/wall-state.js";
import {
  getModeUpdater,
  getModeRenderer,
  getModeCustomRenderer,
  getModeCustomStep,
  getModeBoundsHandler,
  getModeDepthRenderer
} from "/src/legacy/modules/modes/mode-controller.js";
import { updateCursorExplosion, drawCursorExplosion } from "/src/legacy/modules/visual/cursor-explosion.js";
import { getRenderQualityProfile } from "/src/legacy/modules/utils/render-quality.js";
import { appendPebbleBodyPath, getPebbleBodyRotation } from "/src/legacy/modules/visual/pebble-body.js";
import { TITLE_DEPTH_PLANE_Z, drawHomepageCanvasTitle, modeUsesDepthTitlePlane } from "/src/legacy/modules/rendering/title-depth.js";
import { 
  getAccumulator, 
  setAccumulator, 
  addToAccumulator, 
  subtractFromAccumulator,
  resetPhysicsAccumulator 
} from "/src/legacy/modules/physics/accumulator.js";


// Re-export for backwards compatibility
export { resetPhysicsAccumulator };

const DT_DESKTOP = CONSTANTS.PHYSICS_DT;


const DT_MOBILE = CONSTANTS.PHYSICS_DT_MOBILE;
const DEPTH_FOG_MIN_OPACITY = 0.3;
const DEPTH_FOG_START_Z = 0.75;
const CORNER_RADIUS = 42; // matches rounded container corners
const CORNER_FORCE = 1800;
const WARMUP_FRAME_DT = 1 / 60;
const PIT_PERF_WINDOW = 120;
const EMPTY_COLLISION_STATS = Object.freeze({
  pairCount: 0,
  overlapDebt: 0,
  sleepingPairSkips: 0
});
const zPartitionCache = {
  behind: [],
  inFront: []
};

function resetZPartitionCache() {
  zPartitionCache.behind.length = 0;
  zPartitionCache.inFront.length = 0;
}

function getDepthFogOpacity(z) {
  if (z >= DEPTH_FOG_START_Z) return 1;
  const t = Math.max(0, z) / DEPTH_FOG_START_Z;
  return DEPTH_FOG_MIN_OPACITY + t * (1 - DEPTH_FOG_MIN_OPACITY);
}

function modeNeedsDepthTitleLayer(mode) {
  return modeUsesDepthTitlePlane(mode);
}

function isDepthTitleRouteActive() {
  if (typeof document === 'undefined') return true;
  const routeId = document.documentElement?.dataset?.shellRoute || '';
  return routeId === '' || routeId === 'home';
}

function disposeDepthTitleCanvas(globals) {
  const container = globals?.container || document.getElementById('simulations');
  const frontCanvas = globals?.depthTitleFrontCanvas || document.getElementById('simulation-front-depth-canvas');
  try {
    const frontCtx = globals?.depthTitleFrontCtx;
    frontCtx?.clearRect(0, 0, frontCanvas?.width || 0, frontCanvas?.height || 0);
  } catch (e) {
    /* ignore */
  }
  frontCanvas?.remove?.();
  container?.classList?.remove('simulation-depth-title-layer-active');
  if (globals) {
    globals.depthTitleFrontCanvas = null;
    globals.depthTitleFrontCtx = null;
  }
}

function syncDepthTitleCanvas(globals, sourceCanvas) {
  if (!globals || !sourceCanvas) return null;
  if (!isDepthTitleRouteActive()) {
    disposeDepthTitleCanvas(globals);
    return null;
  }

  const container = globals.container || document.getElementById('simulations');
  if (!container) return null;

  let frontCanvas = globals.depthTitleFrontCanvas;
  if (!frontCanvas || !frontCanvas.isConnected) {
    frontCanvas = document.createElement('canvas');
    frontCanvas.id = 'simulation-front-depth-canvas';
    frontCanvas.className = 'simulation-front-depth-canvas';
    frontCanvas.setAttribute('aria-hidden', 'true');
    frontCanvas.setAttribute('role', 'presentation');
    container.appendChild(frontCanvas);
    globals.depthTitleFrontCanvas = frontCanvas;
    globals.depthTitleFrontCtx = frontCanvas.getContext('2d', { alpha: true });
  }

  if (frontCanvas.width !== sourceCanvas.width) frontCanvas.width = sourceCanvas.width;
  if (frontCanvas.height !== sourceCanvas.height) frontCanvas.height = sourceCanvas.height;

  return globals.depthTitleFrontCtx || frontCanvas.getContext('2d', { alpha: true });
}

function setDepthTitleLayerActive(globals, active) {
  const nextActive = Boolean(active && isDepthTitleRouteActive());
  if (!nextActive) {
    disposeDepthTitleCanvas(globals);
    return;
  }

  const container = globals?.container || document.getElementById('simulations');
  if (container) {
    container.classList.toggle('simulation-depth-title-layer-active', nextActive);
  }

  const frontCanvas = globals?.depthTitleFrontCanvas;
  if (frontCanvas) {
    frontCanvas.dataset.active = 'true';
  }
}

function clampNumber(value, min, max, fallback) {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  if (next < min) return min;
  if (next > max) return max;
  return next;
}

function getPortfolioPitMotionProfile(globals) {
  const motion = globals?.portfolioPitConfig?.motion || {};
  return {
    wallRestitution: clampNumber(motion.wallRestitution, 0, 1, 0.3),
    maxPhysicsSteps: Math.round(clampNumber(motion.maxPhysicsSteps, 4, 10, 6)),
    accumulatorResetThreshold: clampNumber(motion.accumulatorResetThreshold, 3, 24, 8),
    sleepVelocityThreshold: clampNumber(motion.sleepVelocityThreshold, 4, 48, 18),
    sleepAngularThreshold: clampNumber(motion.sleepAngularThreshold, 0.04, 1.2, 0.24),
    timeToSleep: clampNumber(motion.timeToSleep, 0.04, 1, 0.16),
    restingContactHold: clampNumber(motion.restingContactHoldMs, 0, 1200, 180) / 1000,
    groundedVerticalSnap: clampNumber(motion.groundedVerticalSnapPx, 0, 40, 9),
    supportVerticalSnap: clampNumber(motion.supportVerticalSnapPx, 0, 40, 12),
    restingLateralSnap: clampNumber(motion.restingLateralSnapPx, 0, 40, 8),
    restingAngularSnap: clampNumber(motion.restingAngularSnap, 0.01, 1.5, 0.08),
  };
}

function pushWindowSample(target, value) {
  if (!Array.isArray(target)) return;
  target.push(Number.isFinite(value) ? value : 0);
  if (target.length > PIT_PERF_WINDOW) target.shift();
}

function percentile(samples, ratio) {
  if (!Array.isArray(samples) || samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * ratio)));
  return sorted[index];
}

function mean(samples) {
  if (!Array.isArray(samples) || samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i];
  return sum / samples.length;
}

function getPitPerfStore(globals) {
  if (!globals) return null;
  if (!globals.pitPerfStore) {
    globals.pitPerfStore = {
      frameMs: [],
      physicsMs: [],
      collisionMs: [],
      renderMs: [],
      postFxMs: [],
      overlapDebt: [],
      pairCount: [],
      sleepingPairSkips: [],
      frames: 0,
      throttledFrames: 0,
      pendingPhysics: {
        physicsMs: 0,
        collisionMs: 0,
        overlapDebt: 0,
        pairCount: 0,
        sleepingPairSkips: 0
      },
      summary: null
    };
  }
  return globals.pitPerfStore;
}

function finalizePitPerfSample(globals, renderMs, postFxMs) {
  const store = getPitPerfStore(globals);
  if (!store) return null;
  const pending = store.pendingPhysics || EMPTY_COLLISION_STATS;
  const frameMs = (Number.isFinite(pending.physicsMs) ? pending.physicsMs : 0) + (Number.isFinite(renderMs) ? renderMs : 0);

  pushWindowSample(store.frameMs, frameMs);
  pushWindowSample(store.physicsMs, pending.physicsMs);
  pushWindowSample(store.collisionMs, pending.collisionMs);
  pushWindowSample(store.renderMs, renderMs);
  pushWindowSample(store.postFxMs, postFxMs);
  pushWindowSample(store.overlapDebt, pending.overlapDebt);
  pushWindowSample(store.pairCount, pending.pairCount);
  pushWindowSample(store.sleepingPairSkips, pending.sleepingPairSkips);

  store.frames += 1;
  if (globals.__pitFrameThrottled) store.throttledFrames += 1;
  const throttleShare = store.frames > 0 ? (store.throttledFrames / store.frames) : 0;

  const summary = {
    frameP50Ms: percentile(store.frameMs, 0.5),
    frameP95Ms: percentile(store.frameMs, 0.95),
    physicsP95Ms: percentile(store.physicsMs, 0.95),
    collisionP95Ms: percentile(store.collisionMs, 0.95),
    renderP95Ms: percentile(store.renderMs, 0.95),
    postFxP95Ms: percentile(store.postFxMs, 0.95),
    overlapDebtP95: percentile(store.overlapDebt, 0.95),
    pairCountMean: mean(store.pairCount),
    sleepingPairSkipsMean: mean(store.sleepingPairSkips),
    throttleShare,
    sampleCount: store.frameMs.length
  };

  store.summary = summary;
  globals.pitPerfSummary = summary;
  return summary;
}

function resolvePitCollisionIterations(globals, baseIterations) {
  const mode = globals?.currentMode;
  if (!isPitLikeMode(mode)) return baseIterations;

  const minIterations = Math.max(1, Math.round(clampNumber(globals?.pitCollisionIterationsMin, 1, 20, 2)));
  const maxIterations = Math.max(minIterations, Math.round(clampNumber(globals?.pitCollisionIterationsMax, minIterations, 20, baseIterations)));
  let next = Math.max(minIterations, Math.min(maxIterations, Math.round(baseIterations)));

  // Portfolio pit: never reduce iterations when FPS drops — under-solving reads as “no collisions”.
  if (mode === MODES.PORTFOLIO_PIT) {
    return Math.max(minIterations, Math.min(maxIterations, next));
  }

  const throttleLevel = Math.max(0, Math.min(2, Math.round(Number(globals?.adaptiveThrottleLevel) || 0)));
  if (throttleLevel === 1) next = Math.max(minIterations, next - 1);
  if (throttleLevel >= 2) next = Math.max(minIterations, next - 2);

  const avgFps = Number(globals?.adaptiveAverageFps);
  if (Number.isFinite(avgFps) && avgFps > 0 && avgFps < 30) {
    next = Math.max(minIterations, next - 1);
  }

  return Math.max(minIterations, Math.min(maxIterations, next));
}

function shouldResolveBallCollisionsForMode(mode) {
  return mode !== MODES.FLIES &&
    mode !== MODES.CRITTERS &&
    mode !== MODES.SPHERE_3D &&
    mode !== MODES.CUBE_3D &&
    mode !== MODES.PARALLAX_FLOAT &&
    mode !== MODES.STARFIELD_3D &&
    mode !== MODES.PRESSURE_CRUCIBLE &&
    mode !== MODES.SHAPES;
}

// ════════════════════════════════════════════════════════════════════════════════
// PERF: Preallocated options objects to avoid per-loop/per-frame allocations
// ════════════════════════════════════════════════════════════════════════════════
const WALL_EFFECTS_ON = {};
const WALL_EFFECTS_OFF = Object.freeze({ registerEffects: false });
const PIT_CLAMP_OPTS = WALL_EFFECTS_OFF;
const PORTFOLIO_PIT_CLAMP_OPTS = Object.freeze({ registerEffects: false, wakeOnCollision: false });
// Kaleidoscope collision options - mutable maxCorrectionPx updated per-frame
const KALEIDO_COLLISION_OPTS = {
  iterations: 3,
  positionalCorrectionPercent: 0.22,
  maxCorrectionPx: 1.25,
  enableSound: false
};

// ════════════════════════════════════════════════════════════════════════════════
// PERF: Reusable color batch cache to eliminate per-frame Map/array allocations
// ════════════════════════════════════════════════════════════════════════════════
const colorBatchCache = {
  map: new Map(),
  arrays: [],
  arrayIndex: 0
};

function getColorArray() {
  if (colorBatchCache.arrayIndex < colorBatchCache.arrays.length) {
    const arr = colorBatchCache.arrays[colorBatchCache.arrayIndex++];
    arr.length = 0;
    return arr;
  }
  const newArr = [];
  colorBatchCache.arrays.push(newArr);
  colorBatchCache.arrayIndex++;
  return newArr;
}

function resetColorBatchCache() {
  colorBatchCache.map.clear();
  colorBatchCache.arrayIndex = 0;
}

// PERF: Zero-allocation corner repeller - computes corners inline, uses squared distance
function applyCornerRepellers(ball, canvasW, canvasH, dt, mobile = false) {
  const r = ball.r;
  const threshold = CORNER_RADIUS + r;
  const thresholdSq = threshold * threshold;
  
  // Compute corners inline (no array allocation)
  // Corner 0: top-left
  let dx = ball.x - CORNER_RADIUS;
  let dy = ball.y - CORNER_RADIUS;
  let d2 = dx * dx + dy * dy;
  if (d2 < thresholdSq && d2 > 0) {
    const dist = Math.sqrt(d2);
    const pen = threshold - dist;
    const strength = (pen / threshold) * CORNER_FORCE;
    const invDist = 1 / dist;
    ball.vx += dx * invDist * strength * dt;
    ball.vy += dy * invDist * strength * dt;
  }
  
  // Corner 1: top-right
  dx = ball.x - (canvasW - CORNER_RADIUS);
  dy = ball.y - CORNER_RADIUS;
  d2 = dx * dx + dy * dy;
  if (d2 < thresholdSq && d2 > 0) {
    const dist = Math.sqrt(d2);
    const pen = threshold - dist;
    const strength = (pen / threshold) * CORNER_FORCE;
    const invDist = 1 / dist;
    ball.vx += dx * invDist * strength * dt;
    ball.vy += dy * invDist * strength * dt;
  }
  
  // Mobile: only check top 2 corners (bottom corners rarely needed on small screens)
  if (mobile) return;
  
  // Corner 2: bottom-left
  dx = ball.x - CORNER_RADIUS;
  dy = ball.y - (canvasH - CORNER_RADIUS);
  d2 = dx * dx + dy * dy;
  if (d2 < thresholdSq && d2 > 0) {
    const dist = Math.sqrt(d2);
    const pen = threshold - dist;
    const strength = (pen / threshold) * CORNER_FORCE;
    const invDist = 1 / dist;
    ball.vx += dx * invDist * strength * dt;
    ball.vy += dy * invDist * strength * dt;
  }
  
  // Corner 3: bottom-right
  dx = ball.x - (canvasW - CORNER_RADIUS);
  dy = ball.y - (canvasH - CORNER_RADIUS);
  d2 = dx * dx + dy * dy;
  if (d2 < thresholdSq && d2 > 0) {
    const dist = Math.sqrt(d2);
    const pen = threshold - dist;
    const strength = (pen / threshold) * CORNER_FORCE;
    const invDist = 1 / dist;
    ball.vx += dx * invDist * strength * dt;
    ball.vy += dy * invDist * strength * dt;
  }
}

function updatePhysicsInternal(dtSeconds, applyForcesFunc) {
  const globals = getGlobals();
  const balls = globals.balls;
  const canvas = globals.canvas;
  
  if (!canvas) return;

  if (balls.length === 0) return;

  const customStep = getModeCustomStep();
  if (customStep) {
    const dt = Math.min(0.033, Math.max(0, dtSeconds));
    customStep(dt);
    setAccumulator(0);
    return;
  }

  // Select physics timestep based on device type (60Hz mobile, 120Hz desktop)
  const DT = (globals.isMobile || globals.isMobileViewport) ? DT_MOBILE : DT_DESKTOP;

  // Kaleidoscope mode has its own lightweight physics path:
  // - Smooth (per-frame), not fixed-timestep accumulator
  // - Collisions on (prevents overlap)
  // - NO rubber wall deformation / impacts
  // - Simple bounds handling (no corner repellers, no wall wobble)
  if (globals.currentMode === MODES.KALEIDOSCOPE || globals.currentMode === MODES.KALEIDOSCOPE_RIFT) {
    const kaleidoBoundsHandler = getModeBoundsHandler();
    const dt = Math.min(0.033, Math.max(0, dtSeconds));
    const len = balls.length;
    for (let i = 0; i < len; i++) {
      balls[i].step(dt, applyForcesFunc);
    }

    // Keep circles apart (non-overlap) with a lighter solver
    // PERF: Reuse preallocated options object, update DPR-dependent value
    KALEIDO_COLLISION_OPTS.maxCorrectionPx = 1.25 * (globals.DPR || 1);
    resolveCollisionsCustom(KALEIDO_COLLISION_OPTS);

    // Simple bounds (no impacts / no wobble)
    for (let i = 0; i < len; i++) {
      if (kaleidoBoundsHandler) {
        kaleidoBoundsHandler(balls[i], canvas.width, canvas.height, dt);
      }
    }

    setAccumulator(0);
    return;
  }
  
  addToAccumulator(dtSeconds);
  let physicsSteps = 0;
  const isPitMode = isPitLikeMode(globals.currentMode);
  let pitPhysicsMs = 0;
  let pitCollisionMs = 0;
  let pitOverlapDebt = 0;
  let pitPairCount = 0;
  let pitSleepingPairSkips = 0;
  const portfolioMotion = globals.currentMode === MODES.PORTFOLIO_PIT
    ? getPortfolioPitMotionProfile(globals)
    : null;
  const maxPhysicsSteps = portfolioMotion?.maxPhysicsSteps ?? CONSTANTS.MAX_PHYSICS_STEPS;

  // Wall input accumulation:
  
  while (getAccumulator() >= DT && physicsSteps < maxPhysicsSteps) {
    const physicsStepStart = isPitMode ? performance.now() : 0;
    // Integrate physics for all modes
      const len = balls.length;
      for (let i = 0; i < len; i++) {
        balls[i].step(DT, applyForcesFunc);
      }
    
    // Collision solver iterations (performance tuning)
    const baseCollisionIterations = Math.max(
      1,
      Math.min(20, Math.round(Number(globals.physicsCollisionIterations ?? 10) || 10))
    );
    const collisionIterations = resolvePitCollisionIterations(globals, baseCollisionIterations);

    // Ball-to-ball collisions:
    // - Disabled for Flies (swarm aesthetic)
    // - Reduced for Kaleidoscope mode (performance)
    // - Standard for remaining physics modes
    let collisionStats = EMPTY_COLLISION_STATS;
    const collisionStart = isPitMode ? performance.now() : 0;
    if (globals.currentMode === MODES.KALEIDOSCOPE || globals.currentMode === MODES.KALEIDOSCOPE_RIFT) {
      collisionStats = resolveCollisions(6) || EMPTY_COLLISION_STATS; // handled by kaleidoscope early-return, kept for safety
    } else if (globals.currentMode === MODES.WEAVE_FIELD) {
      const weaveIterations = Math.max(
        0,
        Math.min(6, Math.round(Number(globals.weaveFieldCollisionIterations ?? 2) || 0))
      );
      if (weaveIterations > 0) {
        collisionStats = resolveCollisions(weaveIterations) || EMPTY_COLLISION_STATS;
      }
    } else if (
      shouldResolveBallCollisionsForMode(globals.currentMode)
      && !(Boolean(globals.isMobile || globals.isMobileViewport) && globals.currentMode === MODES.BUBBLES)
    ) {
      collisionStats = resolveCollisions(collisionIterations) || EMPTY_COLLISION_STATS; // configurable solver iterations
    }
    if (isPitMode) {
      pitCollisionMs += (performance.now() - collisionStart);
      pitOverlapDebt += Number(collisionStats.overlapDebt) || 0;
      pitPairCount += Number(collisionStats.pairCount) || 0;
      pitSleepingPairSkips += Number(collisionStats.sleepingPairSkips) || 0;
    }

    
    // Wall collisions + corner repellers
    // Skip for Parallax modes (internal wrap logic, no wall physics)
    // PERF: Hoist mode/mobile checks and canvas dimensions outside loops
    const mode = globals.currentMode;
    if (mode !== MODES.SPHERE_3D &&
        mode !== MODES.CUBE_3D &&
        mode !== MODES.PARALLAX_FLOAT &&
        mode !== MODES.STARFIELD_3D) {
      const portfolioMotion = mode === MODES.PORTFOLIO_PIT
        ? getPortfolioPitMotionProfile(globals)
        : null;
      const wallRestitution = mode === MODES.WEIGHTLESS
        ? globals.weightlessBounce
        : (portfolioMotion?.wallRestitution ?? globals.REST);
      const isPitLike = isPitLikeMode(mode);
      const lenWalls = balls.length;
      // PERF: Preallocated options object - always enable effects for rumble
      const wallEffectsOptions = WALL_EFFECTS_ON;
      const isMobile = globals.isMobile || globals.isMobileViewport;
      const canvasW = canvas.width;
      const canvasH = canvas.height;
      for (let i = 0; i < lenWalls; i++) {
        const ball = balls[i];
        // Skip wall collisions for DVD logo balls (they handle their own bouncing)
        if (ball.isDvdLogo) continue;
        // Pointer-dragged balls are positioned by the UI; walls() would fight the cursor.
        if (ball.isPointerLocked) continue;

        // Ball Field has explicit rounded-corner arc clamping in Ball.walls().
        // Avoid an additional velocity-based corner repeller there, which can
        // create local compressions in dense corner stacks.
        if (!isPitLike) applyCornerRepellers(ball, canvasW, canvasH, DT, isMobile);
        ball.walls(canvasW, canvasH, DT, wallRestitution, wallEffectsOptions);
      }
    }

    // Ball Field stabilization:
    // Wall/corner clamping can re-introduce overlaps in dense stacks (especially near the floor).
    // Run a small post-wall collision pass for Pit-like modes only.
    if (isPitLikeMode(mode)) {
      const overlapThreshold = mode === MODES.PORTFOLIO_PIT
        ? 0
        : Math.max(0, Number(globals.pitPostPassOverlapThreshold ?? 0));
      const shouldRunPostPass = overlapThreshold <= 0 || (Number(collisionStats.overlapDebt) || 0) >= overlapThreshold;
      if (shouldRunPostPass) {
        const postPassStart = isPitMode ? performance.now() : 0;
        resolveCollisions(3);
        if (isPitMode) {
          pitCollisionMs += (performance.now() - postPassStart);
        }

        // The post-wall collision pass can push bodies slightly outside the inset wall bounds.
        // Clamp once more without registering wall effects (sound/pressure/wobble).
        // PERF: Reuse preallocated options object
        const postPassPortfolioMotion = mode === MODES.PORTFOLIO_PIT
          ? getPortfolioPitMotionProfile(globals)
          : null;
        const wallRestitution = postPassPortfolioMotion?.wallRestitution ?? globals.REST;
        const lenClamp = balls.length;
        const canvasW = canvas.width;
        const canvasH = canvas.height;
        for (let i = 0; i < lenClamp; i++) {
          const b = balls[i];
          if (b?.isPointerLocked) continue;
          b.walls(
            canvasW,
            canvasH,
            DT,
            wallRestitution,
            mode === MODES.PORTFOLIO_PIT ? PORTFOLIO_PIT_CLAMP_OPTS : PIT_CLAMP_OPTS
          );
        }

        // ════════════════════════════════════════════════════════════════════════
        // POST-PHYSICS STABILIZATION (Pit modes only)
        // ════════════════════════════════════════════════════════════════════════
        const DPR = globals.DPR || 1;
        const pitMotion = mode === MODES.PORTFOLIO_PIT
          ? getPortfolioPitMotionProfile(globals)
          : null;
        const vThreshBase = pitMotion?.sleepVelocityThreshold
          ?? (Number.isFinite(globals.sleepVelocityThreshold) ? globals.sleepVelocityThreshold : 12.0);
        const vThresh = vThreshBase * DPR;
        const vThreshSq = vThresh * vThresh;
        const tinySpeedSq = (2 * DPR) * (2 * DPR);
        const wThresh = pitMotion?.sleepAngularThreshold
          ?? (Number.isFinite(globals.sleepAngularThreshold) ? globals.sleepAngularThreshold : 0.18);
        const tSleep = pitMotion?.timeToSleep ?? globals.timeToSleep ?? 0.25;
        const groundedVerticalSnap = (pitMotion?.groundedVerticalSnap ?? 6) * DPR;
        const supportVerticalSnap = (pitMotion?.supportVerticalSnap ?? groundedVerticalSnap) * DPR;
        const restingLateralSnap = (pitMotion?.restingLateralSnap ?? 6) * DPR;
        const restingAngularSnap = pitMotion?.restingAngularSnap ?? 0.06;
        
        for (let i = 0; i < lenClamp; i++) {
          const b = balls[i];
          if (!b || b.isSleeping) continue;
          const speedSq = b.vx * b.vx + b.vy * b.vy;
          const angSpeed = Math.abs(b.omega);
          const hasRestingContact = Number(b.restingContactTimer) > 0;
          const isSettled = b.isGrounded || b.hasSupport || hasRestingContact;
          if (isSettled && speedSq < vThreshSq && angSpeed < wThresh) {
            b.vx *= 0.32;
            b.vy *= 0.2;
            b.omega *= 0.28;
            if (b.isGrounded && Math.abs(b.vy) < groundedVerticalSnap) {
              b.vy = 0;
            }
            if (b.hasSupport && Math.abs(b.vy) < supportVerticalSnap) {
              b.vy = 0;
            }
            if (Math.abs(b.vx) < restingLateralSnap) {
              b.vx = 0;
            }
            if (speedSq < tinySpeedSq) {
              b.vx = 0;
              b.vy = 0;
            }
            if (angSpeed < restingAngularSnap) {
              b.omega = 0;
            }
            const nearRest = Math.abs(b.vx) < restingLateralSnap
              && Math.abs(b.vy) < Math.max(groundedVerticalSnap, supportVerticalSnap)
              && angSpeed < Math.max(restingAngularSnap * 1.5, 0.03);
            if (nearRest && pitMotion?.restingContactHold > 0) {
              b.restingContactTimer = Math.max(Number(b.restingContactTimer) || 0, pitMotion.restingContactHold);
            }
            const directSleepEligible = nearRest
              && hasRestingContact
              && Math.abs(b.vy) < (Math.min(groundedVerticalSnap, supportVerticalSnap) * 0.35)
              && speedSq < (tinySpeedSq * 4)
              && (Number(b.restingContactTimer) || 0) >= Math.min(pitMotion?.restingContactHold ?? 0, 0.12);
            if (directSleepEligible) {
              b.vx = 0;
              b.vy = 0;
              b.omega = 0;
              b.sleepTimer = tSleep;
              b.isSleeping = true;
              continue;
            }
            b.sleepTimer += nearRest ? (DT * 2) : DT;
            if (b.sleepTimer >= tSleep) {
              b.vx = 0;
              b.vy = 0;
              b.omega = 0;
              b.isSleeping = true;
            }
          } else {
            b.sleepTimer = 0;
          }
        }
      }
    }

    // Global sleep (non-pit physics modes):
    // If enabled, allow truly-stationary balls to sleep to reduce per-ball work.
    // Uses physicsSleepThreshold/physicsSleepTime (DPR-scaled) and the shared angular threshold.
    if (globals.physicsSkipSleepingSteps !== false) {
      // PERF: Reuse mode variable from wall collision block (already hoisted)
      const eligible =
        mode !== MODES.FLIES &&
        mode !== MODES.SPHERE_3D &&
        mode !== MODES.CUBE_3D &&
        mode !== MODES.PARALLAX_FLOAT &&
        mode !== MODES.KALEIDOSCOPE &&
        mode !== MODES.KALEIDOSCOPE_RIFT &&
        mode !== MODES.WEAVE_FIELD &&
        mode !== MODES.SHAPES &&
        mode !== MODES.PRESSURE_CRUCIBLE &&
        !isPitLikeMode(mode);

      if (eligible) {
        const DPR = globals.DPR || 1;
        const vThresh = Math.max(0, Number(globals.physicsSleepThreshold ?? 12.0) || 0) * DPR;
        // PERF: Precompute squared threshold to avoid Math.sqrt in hot loop
        const vThreshSq = vThresh * vThresh;
        const tSleep = Math.max(0, Number(globals.physicsSleepTime ?? 0.25) || 0);
        const wThresh = Number.isFinite(globals.sleepAngularThreshold) ? globals.sleepAngularThreshold : 0.18;

        if (vThresh > 0 && tSleep > 0) {
          const lenSleep = balls.length;
          for (let i = 0; i < lenSleep; i++) {
            const b = balls[i];
            if (!b || b.isSleeping) continue;
            
            // Never allow meteors to sleep - they need to register wall impacts
            if (b.isMeteor === true) {
              b.sleepTimer = 0;
              continue;
            }

            // PERF: Use squared speed comparison to avoid Math.sqrt
            const speedSq = b.vx * b.vx + b.vy * b.vy;
            const angSpeed = Math.abs(b.omega);
            if (speedSq < vThreshSq && angSpeed < wThresh) {
              b.sleepTimer += DT;
              if (b.sleepTimer >= tSleep) {
                b.vx = 0;
                b.vy = 0;
                b.omega = 0;
                b.isSleeping = true;
              }
            } else {
              b.sleepTimer = 0;
            }
          }
        }
      }
    }
    
    subtractFromAccumulator(DT);
    physicsSteps++;
    if (globals.currentMode === MODES.PORTFOLIO_PIT) {
      const recoveryFrames = Number(globals.portfolioResizeRecoveryFrames) || 0;
      if (recoveryFrames > 0) {
        globals.portfolioResizeRecoveryFrames = Math.max(0, recoveryFrames - 1);
      }
    }
    if (isPitMode) {
      pitPhysicsMs += (performance.now() - physicsStepStart);
    }
  }
  
  // Mode-specific per-frame updates (water ripples, magnetic explosions, tilt transform, etc.)
  const modeUpdater = getModeUpdater();
  if (modeUpdater) {
    modeUpdater(dtSeconds);
  }
  

  // Reset accumulator if falling behind
  const accumulatorResetThreshold = portfolioMotion?.accumulatorResetThreshold
    ?? CONSTANTS.ACCUMULATOR_RESET_THRESHOLD;
  if (getAccumulator() > DT * accumulatorResetThreshold) {
    setAccumulator(0);
  }

  if (isPitMode) {
    const store = getPitPerfStore(globals);
    if (store) {
      store.pendingPhysics = {
        physicsMs: pitPhysicsMs,
        collisionMs: pitCollisionMs,
        overlapDebt: pitOverlapDebt,
        pairCount: pitPairCount,
        sleepingPairSkips: pitSleepingPairSkips
      };
    }
  }
}

export function updatePhysics(dtSeconds, applyForcesFunc) {
  const globals = getGlobals();
  const canvas = globals.canvas;
  const balls = globals.balls;

  const pitFxThrottleAware = isPitLikeMode(globals.currentMode)
    && String(globals.pitFxThrottlePolicy || 'throttle-aware') === 'throttle-aware';
  const shouldUpdateCursorExplosion = !(pitFxThrottleAware && (Number(globals.adaptiveThrottleLevel) || 0) >= 1);
  if (shouldUpdateCursorExplosion) {
    updateCursorExplosion(dtSeconds);
  }

  if (!canvas) return;
  if (!balls || balls.length === 0) return;

  // Mode warmup: consume synchronously before first render after init.
  // This prevents visible “settling” motion (no pop-in/flash) by advancing physics
  // N render-frames without drawing.
  const warmupFrames = Math.max(0, Math.round(globals.warmupFramesRemaining || 0));
  if (warmupFrames > 0) {
    globals.warmupFramesRemaining = 0;
    setAccumulator(0);

    for (let i = 0; i < warmupFrames; i++) {
      updatePhysicsInternal(WARMUP_FRAME_DT, applyForcesFunc);
    }
    // No further physics this frame; render will show the settled state.
    return;
  }

  updatePhysicsInternal(dtSeconds, applyForcesFunc);
}

export function render() {
  const globals = getGlobals();
  const ctx = globals.ctx;
  const balls = globals.balls;
  const canvas = globals.canvas;
  
  if (!ctx || !canvas) return;
  if (globalThis.__ABS_ROUTE_PERF_AUDIT__ === true) {
    canvas.__absAuditFrameCount = (Number(canvas.__absAuditFrameCount) || 0) + 1;
  }
  const isPitMode = isPitLikeMode(globals.currentMode);
  const renderStart = isPitMode ? performance.now() : 0;
  let postFxMs = 0;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // LOGO: Update size (early-exits if no changes)
  // ═══════════════════════════════════════════════════════════════════════════════
  const dpr = globals.DPR || 1;
  const qualityProfile = getRenderQualityProfile(globals);
  const pitFxThrottleAware = isPitMode
    && String(globals.pitFxThrottlePolicy || 'throttle-aware') === 'throttle-aware'
    && (Number(globals.adaptiveThrottleLevel) || 0) >= 1;
  const drawCursorExplosionEnabled = !pitFxThrottleAware && qualityProfile.drawCursorExplosion;
  const pitRenderLodEnabled = isPitMode && globals.pitRenderLodEnabled !== false;
  const crittersRenderLodEnabled = globals.currentMode === MODES.CRITTERS
    && qualityProfile.tier !== 'high';
  const weaveRenderLodEnabled = globals.currentMode === MODES.WEAVE_FIELD;
  const shapesRenderEnabled = globals.currentMode === MODES.SHAPES;
  const mobileCircleFastPath = Boolean(globals.isMobile || globals.isMobileViewport)
    && Number(globals.pebbleBlend ?? 0) <= 0.02;
  let ballRenderOptions = null;
  if (pitRenderLodEnabled) {
    ballRenderOptions = {
      pitRenderLodEnabled,
      pitTinyRadiusPx: Math.max(0.25, Number(globals.pitRenderLodTinyRadiusPx ?? 1.4) * dpr),
      pitSquashThreshold: Math.max(0, Math.min(1, Number(globals.pitRenderLodSquashThreshold ?? 0.06))),
      canvasWidth: canvas.width,
      canvasHeight: canvas.height
    };
  } else if (crittersRenderLodEnabled || weaveRenderLodEnabled || shapesRenderEnabled) {
    ballRenderOptions = {
      simpleCircleBodies: true,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height
    };
  }
  if (mobileCircleFastPath) {
    ballRenderOptions = {
      ...(ballRenderOptions || {}),
      simpleCircleBodies: true,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height
    };
  }
  globals.renderQualityTierResolved = qualityProfile.tier;
  
  // Clear frame (ghost trails removed per performance optimization plan).
  // CSS on #simulations owns the only visual clip.
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw water ripples (behind balls)
  if (globals.currentMode === MODES.WATER) {
    drawWaterRipples(ctx);
  }
  
  const modeRenderer = getModeRenderer();
  if (modeRenderer && modeRenderer.preRender) {
    modeRenderer.preRender(ctx);
  }

  const customRenderer = getModeCustomRenderer();
  const depthRenderer = getModeDepthRenderer();
  const needsDepthTitleLayer = !customRenderer && modeNeedsDepthTitleLayer(globals.currentMode);
  if (
    needsDepthTitleLayer &&
    (globals.currentMode === MODES.SPHERE_3D || globals.currentMode === MODES.CUBE_3D)
  ) {
    ballRenderOptions = {
      ...(ballRenderOptions || {}),
      simpleCircleBodies: true,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height
    };
  }
  const frontCtx = needsDepthTitleLayer ? syncDepthTitleCanvas(globals, canvas) : null;
  const frontCanvas = globals.depthTitleFrontCanvas;
  setDepthTitleLayerActive(globals, Boolean(needsDepthTitleLayer && frontCtx));
  if (frontCtx && frontCanvas) {
    frontCtx.clearRect(0, 0, frontCanvas.width, frontCanvas.height);
  }

  if (customRenderer) {
    drawHomepageCanvasTitle(ctx, globals);
    customRenderer(ctx);
  } else if (needsDepthTitleLayer && frontCtx && depthRenderer) {
    depthRenderer(ctx, {
      layer: 'behind',
      depthPlane: TITLE_DEPTH_PLANE_Z,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height
    });

    drawHomepageCanvasTitle(ctx, globals);

    depthRenderer(frontCtx, {
      layer: 'front',
      depthPlane: TITLE_DEPTH_PLANE_Z,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height
    });
  } else if (needsDepthTitleLayer && frontCtx) {
    resetZPartitionCache();

    for (let i = 0; i < balls.length; i++) {
      const ball = balls[i];
      const z = ball.z ?? 1;
      if (z < TITLE_DEPTH_PLANE_Z) {
        zPartitionCache.behind.push(ball);
      } else {
        zPartitionCache.inFront.push(ball);
      }
    }

    if (zPartitionCache.behind.length > 0) {
      renderBallsColorBatched(ctx, zPartitionCache.behind, true, ballRenderOptions);
    }

    drawHomepageCanvasTitle(ctx, globals);

    if (zPartitionCache.inFront.length > 0) {
      renderBallsColorBatched(frontCtx, zPartitionCache.inFront, true, ballRenderOptions);
    }
  } else {
    drawHomepageCanvasTitle(ctx, globals);
    renderBallsColorBatched(ctx, balls, false, ballRenderOptions);
  }

  if (modeRenderer && modeRenderer.postRender) {
    modeRenderer.postRender(ctx);
  }
  
  const postFxStart = isPitMode ? performance.now() : 0;
  if (drawCursorExplosionEnabled) drawCursorExplosion(ctx);

  // Draw rubber walls LAST (in front of balls, outside clip path)
  drawWalls(ctx, canvas.width, canvas.height, {
    wallGradientStrokeEnabled: qualityProfile.wallGradientStrokeEnabled
  });
  if (isPitMode) {
    postFxMs = performance.now() - postFxStart;
    finalizePitPerfSample(globals, performance.now() - renderStart, postFxMs);
  }
}

/**
 * Render balls with color batching optimization
 * Groups balls by color to reduce ctx.fillStyle changes
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} ballsToRender - Array of Ball objects
 */
function renderBallsColorBatched(ctx, ballsToRender, applyDepthFog = false, renderOptions = null) {
  if (!ballsToRender || ballsToRender.length === 0) return;
  const globals = getGlobals();
  const pitLodEnabled = Boolean(renderOptions?.pitRenderLodEnabled);
  const tinyRadiusPx = Number(renderOptions?.pitTinyRadiusPx) || 0;
  const squashThreshold = pitLodEnabled
    ? Math.max(0, Math.min(1, Number(renderOptions?.pitSquashThreshold ?? 0.06)))
    : 0.01;
  const canvasWidth = Number(renderOptions?.canvasWidth) || Number.POSITIVE_INFINITY;
  const canvasHeight = Number(renderOptions?.canvasHeight) || Number.POSITIVE_INFINITY;
  const cullPad = pitLodEnabled ? Math.max(1, tinyRadiusPx) : 0;
  const simpleCircleBodies = Boolean(renderOptions?.simpleCircleBodies);
  
  // Group balls by color (O(n) pass, minimal overhead)
  // PERF: Reuse cached Map and arrays to eliminate per-frame allocations
  resetColorBatchCache();
  const ballsByColor = colorBatchCache.map;
  
  for (let i = 0; i < ballsToRender.length; i++) {
    const ball = ballsToRender[i];
    const color = ball.color;
    if (!ballsByColor.has(color)) {
      ballsByColor.set(color, getColorArray());
    }
    ballsByColor.get(color).push(ball);
  }
  
  // Draw in batches (far fewer fillStyle state changes)
  for (const [color, group] of ballsByColor) {
    ctx.fillStyle = color;

    if (simpleCircleBodies) {
      ctx.beginPath();
      let hasOpaqueCircles = false;
      for (let i = 0; i < group.length; i++) {
        const ball = group[i];
        const radius = ball.getDisplayRadius();
        if (radius <= 0.05) continue;
        if (
          ball.x + radius < -cullPad ||
          ball.y + radius < -cullPad ||
          ball.x - radius > canvasWidth + cullPad ||
          ball.y - radius > canvasHeight + cullPad
        ) {
          continue;
        }
        const filterOpacity = ball.filterOpacity ?? 1;
        let effectiveAlpha = (ball.alpha ?? 1) * filterOpacity;
        if (applyDepthFog) {
          effectiveAlpha *= getDepthFogOpacity(ball.z ?? 1);
        }
        if (effectiveAlpha <= 0.001) continue;
        if (effectiveAlpha < 0.999) {
          ctx.save();
          ctx.globalAlpha = effectiveAlpha;
          ctx.beginPath();
          ctx.moveTo(ball.x + radius, ball.y);
          ctx.arc(ball.x, ball.y, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          continue;
        }
        ctx.moveTo(ball.x + radius, ball.y);
        ctx.arc(ball.x, ball.y, radius, 0, Math.PI * 2);
        hasOpaqueCircles = true;
      }
      if (hasOpaqueCircles) {
        ctx.fill();
      }
      continue;
    }
    
    for (let i = 0; i < group.length; i++) {
      const ball = group[i];
      const radius = ball.getDisplayRadius();
      if (radius <= 0.05) continue;
      if (
        ball.x + radius < -cullPad ||
        ball.y + radius < -cullPad ||
        ball.x - radius > canvasWidth + cullPad ||
        ball.y - radius > canvasHeight + cullPad
      ) {
        continue;
      }
      
      // Handle special rendering cases (squash, alpha, filtering)
      const hasSquash = ball.squashAmount > squashThreshold;
      const filterOpacity = ball.filterOpacity ?? 1;
      let effectiveAlpha = ball.alpha * filterOpacity;
      if (applyDepthFog) {
        effectiveAlpha *= getDepthFogOpacity(ball.z ?? 1);
      }
      
      const hasAlpha = effectiveAlpha < 1.0;
      if (pitLodEnabled && !hasSquash && !hasAlpha && radius <= tinyRadiusPx) {
        ctx.fillRect(Math.round(ball.x), Math.round(ball.y), 1, 1);
        continue;
      }
      
      if (hasSquash || hasAlpha) {
        // Complex case: use save/restore for alpha and transforms
        ctx.save();
        ctx.globalAlpha = effectiveAlpha;
        
        if (hasSquash) {
          // Use existing Ball.draw() for squash (it handles transforms)
          // But we've already set globalAlpha, so temporarily override
          const originalAlpha = ball.alpha;
          const originalFilterOpacity = ball.filterOpacity;
          ball.alpha = 1.0; // Prevent double-applying alpha
          ball.filterOpacity = 1.0;
          ball.draw(ctx);
          ball.alpha = originalAlpha;
          ball.filterOpacity = originalFilterOpacity;
        } else {
          // Simple alpha case: draw the pebble silhouette with alpha.
          ctx.translate(ball.x, ball.y);
          const rotationRad = getPebbleBodyRotation(ball);
          if (rotationRad !== 0) ctx.rotate(rotationRad);
          ctx.beginPath();
          appendPebbleBodyPath(ctx, ball, radius, globals);
          ctx.fill();
        }
        
        ctx.restore();
      } else {
        // Fast path: pebble fill with shared batch color.
        ctx.save();
        ctx.translate(ball.x, ball.y);
        const rotationRad = getPebbleBodyRotation(ball);
        if (rotationRad !== 0) ctx.rotate(rotationRad);
        ctx.beginPath();
        appendPebbleBodyPath(ctx, ball, radius, globals);
        ctx.fill();
        ctx.restore();
      }
    }
  }

}

/**
 * Sync chrome color from CSS (call on theme change)
 */
export function syncChromeColor() {
  updateChromeColor();
}

/**
 * Get the current balls array (for sound system etc.)
 * @returns {Array} Array of Ball objects
 */
export function getBalls() {
  const globals = getGlobals();
  return globals.balls || [];
}

function drawWaterRipples(ctx) {
  // Visual ripple rendering intentionally disabled (invisible ripples).
  // Physics ripples are still applied inside the Water mode force hook.
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImVuZ2luZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyDilZTilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZdcbi8vIOKVkSAgICAgICAgICAgICAgICAgICAgICBQSFlTSUNTIEVOR0lORSAoQ09NUExFVEUpICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIOKVkVxuLy8g4pWRICAgICAgICAgICBGaXhlZC10aW1lc3RlcCB3aXRoIGNvbGxpc2lvbiBkZXRlY3Rpb24gICAgICAgICAgICAgICAgICAgICAgICAgICAg4pWRXG4vLyDilZrilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZ1cblxuaW1wb3J0IHsgQ09OU1RBTlRTLCBNT0RFUywgaXNQaXRMaWtlTW9kZSB9IGZyb20gXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL2NvcmUvY29uc3RhbnRzLmpzXCI7XG5pbXBvcnQgeyBnZXRHbG9iYWxzIH0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvY29yZS9zdGF0ZS5qc1wiO1xuaW1wb3J0IHsgcmVzb2x2ZUNvbGxpc2lvbnMsIHJlc29sdmVDb2xsaXNpb25zQ3VzdG9tIH0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvcGh5c2ljcy9jb2xsaXNpb24uanNcIjtcbmltcG9ydCB7IGRyYXdXYWxscywgdXBkYXRlQ2hyb21lQ29sb3IgfSBmcm9tIFwiL3NyYy9sZWdhY3kvbW9kdWxlcy9waHlzaWNzL3dhbGwtc3RhdGUuanNcIjtcbmltcG9ydCB7XG4gIGdldE1vZGVVcGRhdGVyLFxuICBnZXRNb2RlUmVuZGVyZXIsXG4gIGdldE1vZGVDdXN0b21SZW5kZXJlcixcbiAgZ2V0TW9kZUN1c3RvbVN0ZXAsXG4gIGdldE1vZGVCb3VuZHNIYW5kbGVyLFxuICBnZXRNb2RlRGVwdGhSZW5kZXJlclxufSBmcm9tIFwiL3NyYy9sZWdhY3kvbW9kdWxlcy9tb2Rlcy9tb2RlLWNvbnRyb2xsZXIuanNcIjtcbmltcG9ydCB7IHVwZGF0ZUN1cnNvckV4cGxvc2lvbiwgZHJhd0N1cnNvckV4cGxvc2lvbiB9IGZyb20gXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL3Zpc3VhbC9jdXJzb3ItZXhwbG9zaW9uLmpzXCI7XG5pbXBvcnQgeyBnZXRSZW5kZXJRdWFsaXR5UHJvZmlsZSB9IGZyb20gXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL3V0aWxzL3JlbmRlci1xdWFsaXR5LmpzXCI7XG5pbXBvcnQgeyBhcHBlbmRQZWJibGVCb2R5UGF0aCwgZ2V0UGViYmxlQm9keVJvdGF0aW9uIH0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvdmlzdWFsL3BlYmJsZS1ib2R5LmpzXCI7XG5pbXBvcnQgeyBUSVRMRV9ERVBUSF9QTEFORV9aLCBkcmF3SG9tZXBhZ2VDYW52YXNUaXRsZSwgbW9kZVVzZXNEZXB0aFRpdGxlUGxhbmUgfSBmcm9tIFwiL3NyYy9sZWdhY3kvbW9kdWxlcy9yZW5kZXJpbmcvdGl0bGUtZGVwdGguanNcIjtcbmltcG9ydCB7IFxuICBnZXRBY2N1bXVsYXRvciwgXG4gIHNldEFjY3VtdWxhdG9yLCBcbiAgYWRkVG9BY2N1bXVsYXRvciwgXG4gIHN1YnRyYWN0RnJvbUFjY3VtdWxhdG9yLFxuICByZXNldFBoeXNpY3NBY2N1bXVsYXRvciBcbn0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvcGh5c2ljcy9hY2N1bXVsYXRvci5qc1wiO1xuXG5cbi8vIFJlLWV4cG9ydCBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHlcbmV4cG9ydCB7IHJlc2V0UGh5c2ljc0FjY3VtdWxhdG9yIH07XG5cbmNvbnN0IERUX0RFU0tUT1AgPSBDT05TVEFOVFMuUEhZU0lDU19EVDtcblxuXG5jb25zdCBEVF9NT0JJTEUgPSBDT05TVEFOVFMuUEhZU0lDU19EVF9NT0JJTEU7XG5jb25zdCBERVBUSF9GT0dfTUlOX09QQUNJVFkgPSAwLjM7XG5jb25zdCBERVBUSF9GT0dfU1RBUlRfWiA9IDAuNzU7XG5jb25zdCBDT1JORVJfUkFESVVTID0gNDI7IC8vIG1hdGNoZXMgcm91bmRlZCBjb250YWluZXIgY29ybmVyc1xuY29uc3QgQ09STkVSX0ZPUkNFID0gMTgwMDtcbmNvbnN0IFdBUk1VUF9GUkFNRV9EVCA9IDEgLyA2MDtcbmNvbnN0IFBJVF9QRVJGX1dJTkRPVyA9IDEyMDtcbmNvbnN0IEVNUFRZX0NPTExJU0lPTl9TVEFUUyA9IE9iamVjdC5mcmVlemUoe1xuICBwYWlyQ291bnQ6IDAsXG4gIG92ZXJsYXBEZWJ0OiAwLFxuICBzbGVlcGluZ1BhaXJTa2lwczogMFxufSk7XG5jb25zdCB6UGFydGl0aW9uQ2FjaGUgPSB7XG4gIGJlaGluZDogW10sXG4gIGluRnJvbnQ6IFtdXG59O1xuXG5mdW5jdGlvbiByZXNldFpQYXJ0aXRpb25DYWNoZSgpIHtcbiAgelBhcnRpdGlvbkNhY2hlLmJlaGluZC5sZW5ndGggPSAwO1xuICB6UGFydGl0aW9uQ2FjaGUuaW5Gcm9udC5sZW5ndGggPSAwO1xufVxuXG5mdW5jdGlvbiBnZXREZXB0aEZvZ09wYWNpdHkoeikge1xuICBpZiAoeiA+PSBERVBUSF9GT0dfU1RBUlRfWikgcmV0dXJuIDE7XG4gIGNvbnN0IHQgPSBNYXRoLm1heCgwLCB6KSAvIERFUFRIX0ZPR19TVEFSVF9aO1xuICByZXR1cm4gREVQVEhfRk9HX01JTl9PUEFDSVRZICsgdCAqICgxIC0gREVQVEhfRk9HX01JTl9PUEFDSVRZKTtcbn1cblxuZnVuY3Rpb24gbW9kZU5lZWRzRGVwdGhUaXRsZUxheWVyKG1vZGUpIHtcbiAgcmV0dXJuIG1vZGVVc2VzRGVwdGhUaXRsZVBsYW5lKG1vZGUpO1xufVxuXG5mdW5jdGlvbiBpc0RlcHRoVGl0bGVSb3V0ZUFjdGl2ZSgpIHtcbiAgaWYgKHR5cGVvZiBkb2N1bWVudCA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybiB0cnVlO1xuICBjb25zdCByb3V0ZUlkID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50Py5kYXRhc2V0Py5zaGVsbFJvdXRlIHx8ICcnO1xuICByZXR1cm4gcm91dGVJZCA9PT0gJycgfHwgcm91dGVJZCA9PT0gJ2hvbWUnO1xufVxuXG5mdW5jdGlvbiBkaXNwb3NlRGVwdGhUaXRsZUNhbnZhcyhnbG9iYWxzKSB7XG4gIGNvbnN0IGNvbnRhaW5lciA9IGdsb2JhbHM/LmNvbnRhaW5lciB8fCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2ltdWxhdGlvbnMnKTtcbiAgY29uc3QgZnJvbnRDYW52YXMgPSBnbG9iYWxzPy5kZXB0aFRpdGxlRnJvbnRDYW52YXMgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NpbXVsYXRpb24tZnJvbnQtZGVwdGgtY2FudmFzJyk7XG4gIHRyeSB7XG4gICAgY29uc3QgZnJvbnRDdHggPSBnbG9iYWxzPy5kZXB0aFRpdGxlRnJvbnRDdHg7XG4gICAgZnJvbnRDdHg/LmNsZWFyUmVjdCgwLCAwLCBmcm9udENhbnZhcz8ud2lkdGggfHwgMCwgZnJvbnRDYW52YXM/LmhlaWdodCB8fCAwKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIC8qIGlnbm9yZSAqL1xuICB9XG4gIGZyb250Q2FudmFzPy5yZW1vdmU/LigpO1xuICBjb250YWluZXI/LmNsYXNzTGlzdD8ucmVtb3ZlKCdzaW11bGF0aW9uLWRlcHRoLXRpdGxlLWxheWVyLWFjdGl2ZScpO1xuICBpZiAoZ2xvYmFscykge1xuICAgIGdsb2JhbHMuZGVwdGhUaXRsZUZyb250Q2FudmFzID0gbnVsbDtcbiAgICBnbG9iYWxzLmRlcHRoVGl0bGVGcm9udEN0eCA9IG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gc3luY0RlcHRoVGl0bGVDYW52YXMoZ2xvYmFscywgc291cmNlQ2FudmFzKSB7XG4gIGlmICghZ2xvYmFscyB8fCAhc291cmNlQ2FudmFzKSByZXR1cm4gbnVsbDtcbiAgaWYgKCFpc0RlcHRoVGl0bGVSb3V0ZUFjdGl2ZSgpKSB7XG4gICAgZGlzcG9zZURlcHRoVGl0bGVDYW52YXMoZ2xvYmFscyk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBjb250YWluZXIgPSBnbG9iYWxzLmNvbnRhaW5lciB8fCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2ltdWxhdGlvbnMnKTtcbiAgaWYgKCFjb250YWluZXIpIHJldHVybiBudWxsO1xuXG4gIGxldCBmcm9udENhbnZhcyA9IGdsb2JhbHMuZGVwdGhUaXRsZUZyb250Q2FudmFzO1xuICBpZiAoIWZyb250Q2FudmFzIHx8ICFmcm9udENhbnZhcy5pc0Nvbm5lY3RlZCkge1xuICAgIGZyb250Q2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgZnJvbnRDYW52YXMuaWQgPSAnc2ltdWxhdGlvbi1mcm9udC1kZXB0aC1jYW52YXMnO1xuICAgIGZyb250Q2FudmFzLmNsYXNzTmFtZSA9ICdzaW11bGF0aW9uLWZyb250LWRlcHRoLWNhbnZhcyc7XG4gICAgZnJvbnRDYW52YXMuc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XG4gICAgZnJvbnRDYW52YXMuc2V0QXR0cmlidXRlKCdyb2xlJywgJ3ByZXNlbnRhdGlvbicpO1xuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChmcm9udENhbnZhcyk7XG4gICAgZ2xvYmFscy5kZXB0aFRpdGxlRnJvbnRDYW52YXMgPSBmcm9udENhbnZhcztcbiAgICBnbG9iYWxzLmRlcHRoVGl0bGVGcm9udEN0eCA9IGZyb250Q2FudmFzLmdldENvbnRleHQoJzJkJywgeyBhbHBoYTogdHJ1ZSB9KTtcbiAgfVxuXG4gIGlmIChmcm9udENhbnZhcy53aWR0aCAhPT0gc291cmNlQ2FudmFzLndpZHRoKSBmcm9udENhbnZhcy53aWR0aCA9IHNvdXJjZUNhbnZhcy53aWR0aDtcbiAgaWYgKGZyb250Q2FudmFzLmhlaWdodCAhPT0gc291cmNlQ2FudmFzLmhlaWdodCkgZnJvbnRDYW52YXMuaGVpZ2h0ID0gc291cmNlQ2FudmFzLmhlaWdodDtcblxuICByZXR1cm4gZ2xvYmFscy5kZXB0aFRpdGxlRnJvbnRDdHggfHwgZnJvbnRDYW52YXMuZ2V0Q29udGV4dCgnMmQnLCB7IGFscGhhOiB0cnVlIH0pO1xufVxuXG5mdW5jdGlvbiBzZXREZXB0aFRpdGxlTGF5ZXJBY3RpdmUoZ2xvYmFscywgYWN0aXZlKSB7XG4gIGNvbnN0IG5leHRBY3RpdmUgPSBCb29sZWFuKGFjdGl2ZSAmJiBpc0RlcHRoVGl0bGVSb3V0ZUFjdGl2ZSgpKTtcbiAgaWYgKCFuZXh0QWN0aXZlKSB7XG4gICAgZGlzcG9zZURlcHRoVGl0bGVDYW52YXMoZ2xvYmFscyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgY29udGFpbmVyID0gZ2xvYmFscz8uY29udGFpbmVyIHx8IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaW11bGF0aW9ucycpO1xuICBpZiAoY29udGFpbmVyKSB7XG4gICAgY29udGFpbmVyLmNsYXNzTGlzdC50b2dnbGUoJ3NpbXVsYXRpb24tZGVwdGgtdGl0bGUtbGF5ZXItYWN0aXZlJywgbmV4dEFjdGl2ZSk7XG4gIH1cblxuICBjb25zdCBmcm9udENhbnZhcyA9IGdsb2JhbHM/LmRlcHRoVGl0bGVGcm9udENhbnZhcztcbiAgaWYgKGZyb250Q2FudmFzKSB7XG4gICAgZnJvbnRDYW52YXMuZGF0YXNldC5hY3RpdmUgPSAndHJ1ZSc7XG4gIH1cbn1cblxuZnVuY3Rpb24gY2xhbXBOdW1iZXIodmFsdWUsIG1pbiwgbWF4LCBmYWxsYmFjaykge1xuICBjb25zdCBuZXh0ID0gTnVtYmVyKHZhbHVlKTtcbiAgaWYgKCFOdW1iZXIuaXNGaW5pdGUobmV4dCkpIHJldHVybiBmYWxsYmFjaztcbiAgaWYgKG5leHQgPCBtaW4pIHJldHVybiBtaW47XG4gIGlmIChuZXh0ID4gbWF4KSByZXR1cm4gbWF4O1xuICByZXR1cm4gbmV4dDtcbn1cblxuZnVuY3Rpb24gZ2V0UG9ydGZvbGlvUGl0TW90aW9uUHJvZmlsZShnbG9iYWxzKSB7XG4gIGNvbnN0IG1vdGlvbiA9IGdsb2JhbHM/LnBvcnRmb2xpb1BpdENvbmZpZz8ubW90aW9uIHx8IHt9O1xuICByZXR1cm4ge1xuICAgIHdhbGxSZXN0aXR1dGlvbjogY2xhbXBOdW1iZXIobW90aW9uLndhbGxSZXN0aXR1dGlvbiwgMCwgMSwgMC4zKSxcbiAgICBtYXhQaHlzaWNzU3RlcHM6IE1hdGgucm91bmQoY2xhbXBOdW1iZXIobW90aW9uLm1heFBoeXNpY3NTdGVwcywgNCwgMTAsIDYpKSxcbiAgICBhY2N1bXVsYXRvclJlc2V0VGhyZXNob2xkOiBjbGFtcE51bWJlcihtb3Rpb24uYWNjdW11bGF0b3JSZXNldFRocmVzaG9sZCwgMywgMjQsIDgpLFxuICAgIHNsZWVwVmVsb2NpdHlUaHJlc2hvbGQ6IGNsYW1wTnVtYmVyKG1vdGlvbi5zbGVlcFZlbG9jaXR5VGhyZXNob2xkLCA0LCA0OCwgMTgpLFxuICAgIHNsZWVwQW5ndWxhclRocmVzaG9sZDogY2xhbXBOdW1iZXIobW90aW9uLnNsZWVwQW5ndWxhclRocmVzaG9sZCwgMC4wNCwgMS4yLCAwLjI0KSxcbiAgICB0aW1lVG9TbGVlcDogY2xhbXBOdW1iZXIobW90aW9uLnRpbWVUb1NsZWVwLCAwLjA0LCAxLCAwLjE2KSxcbiAgICByZXN0aW5nQ29udGFjdEhvbGQ6IGNsYW1wTnVtYmVyKG1vdGlvbi5yZXN0aW5nQ29udGFjdEhvbGRNcywgMCwgMTIwMCwgMTgwKSAvIDEwMDAsXG4gICAgZ3JvdW5kZWRWZXJ0aWNhbFNuYXA6IGNsYW1wTnVtYmVyKG1vdGlvbi5ncm91bmRlZFZlcnRpY2FsU25hcFB4LCAwLCA0MCwgOSksXG4gICAgc3VwcG9ydFZlcnRpY2FsU25hcDogY2xhbXBOdW1iZXIobW90aW9uLnN1cHBvcnRWZXJ0aWNhbFNuYXBQeCwgMCwgNDAsIDEyKSxcbiAgICByZXN0aW5nTGF0ZXJhbFNuYXA6IGNsYW1wTnVtYmVyKG1vdGlvbi5yZXN0aW5nTGF0ZXJhbFNuYXBQeCwgMCwgNDAsIDgpLFxuICAgIHJlc3RpbmdBbmd1bGFyU25hcDogY2xhbXBOdW1iZXIobW90aW9uLnJlc3RpbmdBbmd1bGFyU25hcCwgMC4wMSwgMS41LCAwLjA4KSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gcHVzaFdpbmRvd1NhbXBsZSh0YXJnZXQsIHZhbHVlKSB7XG4gIGlmICghQXJyYXkuaXNBcnJheSh0YXJnZXQpKSByZXR1cm47XG4gIHRhcmdldC5wdXNoKE51bWJlci5pc0Zpbml0ZSh2YWx1ZSkgPyB2YWx1ZSA6IDApO1xuICBpZiAodGFyZ2V0Lmxlbmd0aCA+IFBJVF9QRVJGX1dJTkRPVykgdGFyZ2V0LnNoaWZ0KCk7XG59XG5cbmZ1bmN0aW9uIHBlcmNlbnRpbGUoc2FtcGxlcywgcmF0aW8pIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KHNhbXBsZXMpIHx8IHNhbXBsZXMubGVuZ3RoID09PSAwKSByZXR1cm4gMDtcbiAgY29uc3Qgc29ydGVkID0gWy4uLnNhbXBsZXNdLnNvcnQoKGEsIGIpID0+IGEgLSBiKTtcbiAgY29uc3QgaW5kZXggPSBNYXRoLm1heCgwLCBNYXRoLm1pbihzb3J0ZWQubGVuZ3RoIC0gMSwgTWF0aC5yb3VuZCgoc29ydGVkLmxlbmd0aCAtIDEpICogcmF0aW8pKSk7XG4gIHJldHVybiBzb3J0ZWRbaW5kZXhdO1xufVxuXG5mdW5jdGlvbiBtZWFuKHNhbXBsZXMpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KHNhbXBsZXMpIHx8IHNhbXBsZXMubGVuZ3RoID09PSAwKSByZXR1cm4gMDtcbiAgbGV0IHN1bSA9IDA7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc2FtcGxlcy5sZW5ndGg7IGkrKykgc3VtICs9IHNhbXBsZXNbaV07XG4gIHJldHVybiBzdW0gLyBzYW1wbGVzLmxlbmd0aDtcbn1cblxuZnVuY3Rpb24gZ2V0UGl0UGVyZlN0b3JlKGdsb2JhbHMpIHtcbiAgaWYgKCFnbG9iYWxzKSByZXR1cm4gbnVsbDtcbiAgaWYgKCFnbG9iYWxzLnBpdFBlcmZTdG9yZSkge1xuICAgIGdsb2JhbHMucGl0UGVyZlN0b3JlID0ge1xuICAgICAgZnJhbWVNczogW10sXG4gICAgICBwaHlzaWNzTXM6IFtdLFxuICAgICAgY29sbGlzaW9uTXM6IFtdLFxuICAgICAgcmVuZGVyTXM6IFtdLFxuICAgICAgcG9zdEZ4TXM6IFtdLFxuICAgICAgb3ZlcmxhcERlYnQ6IFtdLFxuICAgICAgcGFpckNvdW50OiBbXSxcbiAgICAgIHNsZWVwaW5nUGFpclNraXBzOiBbXSxcbiAgICAgIGZyYW1lczogMCxcbiAgICAgIHRocm90dGxlZEZyYW1lczogMCxcbiAgICAgIHBlbmRpbmdQaHlzaWNzOiB7XG4gICAgICAgIHBoeXNpY3NNczogMCxcbiAgICAgICAgY29sbGlzaW9uTXM6IDAsXG4gICAgICAgIG92ZXJsYXBEZWJ0OiAwLFxuICAgICAgICBwYWlyQ291bnQ6IDAsXG4gICAgICAgIHNsZWVwaW5nUGFpclNraXBzOiAwXG4gICAgICB9LFxuICAgICAgc3VtbWFyeTogbnVsbFxuICAgIH07XG4gIH1cbiAgcmV0dXJuIGdsb2JhbHMucGl0UGVyZlN0b3JlO1xufVxuXG5mdW5jdGlvbiBmaW5hbGl6ZVBpdFBlcmZTYW1wbGUoZ2xvYmFscywgcmVuZGVyTXMsIHBvc3RGeE1zKSB7XG4gIGNvbnN0IHN0b3JlID0gZ2V0UGl0UGVyZlN0b3JlKGdsb2JhbHMpO1xuICBpZiAoIXN0b3JlKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgcGVuZGluZyA9IHN0b3JlLnBlbmRpbmdQaHlzaWNzIHx8IEVNUFRZX0NPTExJU0lPTl9TVEFUUztcbiAgY29uc3QgZnJhbWVNcyA9IChOdW1iZXIuaXNGaW5pdGUocGVuZGluZy5waHlzaWNzTXMpID8gcGVuZGluZy5waHlzaWNzTXMgOiAwKSArIChOdW1iZXIuaXNGaW5pdGUocmVuZGVyTXMpID8gcmVuZGVyTXMgOiAwKTtcblxuICBwdXNoV2luZG93U2FtcGxlKHN0b3JlLmZyYW1lTXMsIGZyYW1lTXMpO1xuICBwdXNoV2luZG93U2FtcGxlKHN0b3JlLnBoeXNpY3NNcywgcGVuZGluZy5waHlzaWNzTXMpO1xuICBwdXNoV2luZG93U2FtcGxlKHN0b3JlLmNvbGxpc2lvbk1zLCBwZW5kaW5nLmNvbGxpc2lvbk1zKTtcbiAgcHVzaFdpbmRvd1NhbXBsZShzdG9yZS5yZW5kZXJNcywgcmVuZGVyTXMpO1xuICBwdXNoV2luZG93U2FtcGxlKHN0b3JlLnBvc3RGeE1zLCBwb3N0RnhNcyk7XG4gIHB1c2hXaW5kb3dTYW1wbGUoc3RvcmUub3ZlcmxhcERlYnQsIHBlbmRpbmcub3ZlcmxhcERlYnQpO1xuICBwdXNoV2luZG93U2FtcGxlKHN0b3JlLnBhaXJDb3VudCwgcGVuZGluZy5wYWlyQ291bnQpO1xuICBwdXNoV2luZG93U2FtcGxlKHN0b3JlLnNsZWVwaW5nUGFpclNraXBzLCBwZW5kaW5nLnNsZWVwaW5nUGFpclNraXBzKTtcblxuICBzdG9yZS5mcmFtZXMgKz0gMTtcbiAgaWYgKGdsb2JhbHMuX19waXRGcmFtZVRocm90dGxlZCkgc3RvcmUudGhyb3R0bGVkRnJhbWVzICs9IDE7XG4gIGNvbnN0IHRocm90dGxlU2hhcmUgPSBzdG9yZS5mcmFtZXMgPiAwID8gKHN0b3JlLnRocm90dGxlZEZyYW1lcyAvIHN0b3JlLmZyYW1lcykgOiAwO1xuXG4gIGNvbnN0IHN1bW1hcnkgPSB7XG4gICAgZnJhbWVQNTBNczogcGVyY2VudGlsZShzdG9yZS5mcmFtZU1zLCAwLjUpLFxuICAgIGZyYW1lUDk1TXM6IHBlcmNlbnRpbGUoc3RvcmUuZnJhbWVNcywgMC45NSksXG4gICAgcGh5c2ljc1A5NU1zOiBwZXJjZW50aWxlKHN0b3JlLnBoeXNpY3NNcywgMC45NSksXG4gICAgY29sbGlzaW9uUDk1TXM6IHBlcmNlbnRpbGUoc3RvcmUuY29sbGlzaW9uTXMsIDAuOTUpLFxuICAgIHJlbmRlclA5NU1zOiBwZXJjZW50aWxlKHN0b3JlLnJlbmRlck1zLCAwLjk1KSxcbiAgICBwb3N0RnhQOTVNczogcGVyY2VudGlsZShzdG9yZS5wb3N0RnhNcywgMC45NSksXG4gICAgb3ZlcmxhcERlYnRQOTU6IHBlcmNlbnRpbGUoc3RvcmUub3ZlcmxhcERlYnQsIDAuOTUpLFxuICAgIHBhaXJDb3VudE1lYW46IG1lYW4oc3RvcmUucGFpckNvdW50KSxcbiAgICBzbGVlcGluZ1BhaXJTa2lwc01lYW46IG1lYW4oc3RvcmUuc2xlZXBpbmdQYWlyU2tpcHMpLFxuICAgIHRocm90dGxlU2hhcmUsXG4gICAgc2FtcGxlQ291bnQ6IHN0b3JlLmZyYW1lTXMubGVuZ3RoXG4gIH07XG5cbiAgc3RvcmUuc3VtbWFyeSA9IHN1bW1hcnk7XG4gIGdsb2JhbHMucGl0UGVyZlN1bW1hcnkgPSBzdW1tYXJ5O1xuICByZXR1cm4gc3VtbWFyeTtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZVBpdENvbGxpc2lvbkl0ZXJhdGlvbnMoZ2xvYmFscywgYmFzZUl0ZXJhdGlvbnMpIHtcbiAgY29uc3QgbW9kZSA9IGdsb2JhbHM/LmN1cnJlbnRNb2RlO1xuICBpZiAoIWlzUGl0TGlrZU1vZGUobW9kZSkpIHJldHVybiBiYXNlSXRlcmF0aW9ucztcblxuICBjb25zdCBtaW5JdGVyYXRpb25zID0gTWF0aC5tYXgoMSwgTWF0aC5yb3VuZChjbGFtcE51bWJlcihnbG9iYWxzPy5waXRDb2xsaXNpb25JdGVyYXRpb25zTWluLCAxLCAyMCwgMikpKTtcbiAgY29uc3QgbWF4SXRlcmF0aW9ucyA9IE1hdGgubWF4KG1pbkl0ZXJhdGlvbnMsIE1hdGgucm91bmQoY2xhbXBOdW1iZXIoZ2xvYmFscz8ucGl0Q29sbGlzaW9uSXRlcmF0aW9uc01heCwgbWluSXRlcmF0aW9ucywgMjAsIGJhc2VJdGVyYXRpb25zKSkpO1xuICBsZXQgbmV4dCA9IE1hdGgubWF4KG1pbkl0ZXJhdGlvbnMsIE1hdGgubWluKG1heEl0ZXJhdGlvbnMsIE1hdGgucm91bmQoYmFzZUl0ZXJhdGlvbnMpKSk7XG5cbiAgLy8gUG9ydGZvbGlvIHBpdDogbmV2ZXIgcmVkdWNlIGl0ZXJhdGlvbnMgd2hlbiBGUFMgZHJvcHMg4oCUIHVuZGVyLXNvbHZpbmcgcmVhZHMgYXMg4oCcbm8gY29sbGlzaW9uc+KAnS5cbiAgaWYgKG1vZGUgPT09IE1PREVTLlBPUlRGT0xJT19QSVQpIHtcbiAgICByZXR1cm4gTWF0aC5tYXgobWluSXRlcmF0aW9ucywgTWF0aC5taW4obWF4SXRlcmF0aW9ucywgbmV4dCkpO1xuICB9XG5cbiAgY29uc3QgdGhyb3R0bGVMZXZlbCA9IE1hdGgubWF4KDAsIE1hdGgubWluKDIsIE1hdGgucm91bmQoTnVtYmVyKGdsb2JhbHM/LmFkYXB0aXZlVGhyb3R0bGVMZXZlbCkgfHwgMCkpKTtcbiAgaWYgKHRocm90dGxlTGV2ZWwgPT09IDEpIG5leHQgPSBNYXRoLm1heChtaW5JdGVyYXRpb25zLCBuZXh0IC0gMSk7XG4gIGlmICh0aHJvdHRsZUxldmVsID49IDIpIG5leHQgPSBNYXRoLm1heChtaW5JdGVyYXRpb25zLCBuZXh0IC0gMik7XG5cbiAgY29uc3QgYXZnRnBzID0gTnVtYmVyKGdsb2JhbHM/LmFkYXB0aXZlQXZlcmFnZUZwcyk7XG4gIGlmIChOdW1iZXIuaXNGaW5pdGUoYXZnRnBzKSAmJiBhdmdGcHMgPiAwICYmIGF2Z0ZwcyA8IDMwKSB7XG4gICAgbmV4dCA9IE1hdGgubWF4KG1pbkl0ZXJhdGlvbnMsIG5leHQgLSAxKTtcbiAgfVxuXG4gIHJldHVybiBNYXRoLm1heChtaW5JdGVyYXRpb25zLCBNYXRoLm1pbihtYXhJdGVyYXRpb25zLCBuZXh0KSk7XG59XG5cbmZ1bmN0aW9uIHNob3VsZFJlc29sdmVCYWxsQ29sbGlzaW9uc0Zvck1vZGUobW9kZSkge1xuICByZXR1cm4gbW9kZSAhPT0gTU9ERVMuRkxJRVMgJiZcbiAgICBtb2RlICE9PSBNT0RFUy5DUklUVEVSUyAmJlxuICAgIG1vZGUgIT09IE1PREVTLlNQSEVSRV8zRCAmJlxuICAgIG1vZGUgIT09IE1PREVTLkNVQkVfM0QgJiZcbiAgICBtb2RlICE9PSBNT0RFUy5QQVJBTExBWF9GTE9BVCAmJlxuICAgIG1vZGUgIT09IE1PREVTLlNUQVJGSUVMRF8zRCAmJlxuICAgIG1vZGUgIT09IE1PREVTLlBSRVNTVVJFX0NSVUNJQkxFICYmXG4gICAgbW9kZSAhPT0gTU9ERVMuU0hBUEVTO1xufVxuXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbi8vIFBFUkY6IFByZWFsbG9jYXRlZCBvcHRpb25zIG9iamVjdHMgdG8gYXZvaWQgcGVyLWxvb3AvcGVyLWZyYW1lIGFsbG9jYXRpb25zXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbmNvbnN0IFdBTExfRUZGRUNUU19PTiA9IHt9O1xuY29uc3QgV0FMTF9FRkZFQ1RTX09GRiA9IE9iamVjdC5mcmVlemUoeyByZWdpc3RlckVmZmVjdHM6IGZhbHNlIH0pO1xuY29uc3QgUElUX0NMQU1QX09QVFMgPSBXQUxMX0VGRkVDVFNfT0ZGO1xuY29uc3QgUE9SVEZPTElPX1BJVF9DTEFNUF9PUFRTID0gT2JqZWN0LmZyZWV6ZSh7IHJlZ2lzdGVyRWZmZWN0czogZmFsc2UsIHdha2VPbkNvbGxpc2lvbjogZmFsc2UgfSk7XG4vLyBLYWxlaWRvc2NvcGUgY29sbGlzaW9uIG9wdGlvbnMgLSBtdXRhYmxlIG1heENvcnJlY3Rpb25QeCB1cGRhdGVkIHBlci1mcmFtZVxuY29uc3QgS0FMRUlET19DT0xMSVNJT05fT1BUUyA9IHtcbiAgaXRlcmF0aW9uczogMyxcbiAgcG9zaXRpb25hbENvcnJlY3Rpb25QZXJjZW50OiAwLjIyLFxuICBtYXhDb3JyZWN0aW9uUHg6IDEuMjUsXG4gIGVuYWJsZVNvdW5kOiBmYWxzZVxufTtcblxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4vLyBQRVJGOiBSZXVzYWJsZSBjb2xvciBiYXRjaCBjYWNoZSB0byBlbGltaW5hdGUgcGVyLWZyYW1lIE1hcC9hcnJheSBhbGxvY2F0aW9uc1xuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG5jb25zdCBjb2xvckJhdGNoQ2FjaGUgPSB7XG4gIG1hcDogbmV3IE1hcCgpLFxuICBhcnJheXM6IFtdLFxuICBhcnJheUluZGV4OiAwXG59O1xuXG5mdW5jdGlvbiBnZXRDb2xvckFycmF5KCkge1xuICBpZiAoY29sb3JCYXRjaENhY2hlLmFycmF5SW5kZXggPCBjb2xvckJhdGNoQ2FjaGUuYXJyYXlzLmxlbmd0aCkge1xuICAgIGNvbnN0IGFyciA9IGNvbG9yQmF0Y2hDYWNoZS5hcnJheXNbY29sb3JCYXRjaENhY2hlLmFycmF5SW5kZXgrK107XG4gICAgYXJyLmxlbmd0aCA9IDA7XG4gICAgcmV0dXJuIGFycjtcbiAgfVxuICBjb25zdCBuZXdBcnIgPSBbXTtcbiAgY29sb3JCYXRjaENhY2hlLmFycmF5cy5wdXNoKG5ld0Fycik7XG4gIGNvbG9yQmF0Y2hDYWNoZS5hcnJheUluZGV4Kys7XG4gIHJldHVybiBuZXdBcnI7XG59XG5cbmZ1bmN0aW9uIHJlc2V0Q29sb3JCYXRjaENhY2hlKCkge1xuICBjb2xvckJhdGNoQ2FjaGUubWFwLmNsZWFyKCk7XG4gIGNvbG9yQmF0Y2hDYWNoZS5hcnJheUluZGV4ID0gMDtcbn1cblxuLy8gUEVSRjogWmVyby1hbGxvY2F0aW9uIGNvcm5lciByZXBlbGxlciAtIGNvbXB1dGVzIGNvcm5lcnMgaW5saW5lLCB1c2VzIHNxdWFyZWQgZGlzdGFuY2VcbmZ1bmN0aW9uIGFwcGx5Q29ybmVyUmVwZWxsZXJzKGJhbGwsIGNhbnZhc1csIGNhbnZhc0gsIGR0LCBtb2JpbGUgPSBmYWxzZSkge1xuICBjb25zdCByID0gYmFsbC5yO1xuICBjb25zdCB0aHJlc2hvbGQgPSBDT1JORVJfUkFESVVTICsgcjtcbiAgY29uc3QgdGhyZXNob2xkU3EgPSB0aHJlc2hvbGQgKiB0aHJlc2hvbGQ7XG4gIFxuICAvLyBDb21wdXRlIGNvcm5lcnMgaW5saW5lIChubyBhcnJheSBhbGxvY2F0aW9uKVxuICAvLyBDb3JuZXIgMDogdG9wLWxlZnRcbiAgbGV0IGR4ID0gYmFsbC54IC0gQ09STkVSX1JBRElVUztcbiAgbGV0IGR5ID0gYmFsbC55IC0gQ09STkVSX1JBRElVUztcbiAgbGV0IGQyID0gZHggKiBkeCArIGR5ICogZHk7XG4gIGlmIChkMiA8IHRocmVzaG9sZFNxICYmIGQyID4gMCkge1xuICAgIGNvbnN0IGRpc3QgPSBNYXRoLnNxcnQoZDIpO1xuICAgIGNvbnN0IHBlbiA9IHRocmVzaG9sZCAtIGRpc3Q7XG4gICAgY29uc3Qgc3RyZW5ndGggPSAocGVuIC8gdGhyZXNob2xkKSAqIENPUk5FUl9GT1JDRTtcbiAgICBjb25zdCBpbnZEaXN0ID0gMSAvIGRpc3Q7XG4gICAgYmFsbC52eCArPSBkeCAqIGludkRpc3QgKiBzdHJlbmd0aCAqIGR0O1xuICAgIGJhbGwudnkgKz0gZHkgKiBpbnZEaXN0ICogc3RyZW5ndGggKiBkdDtcbiAgfVxuICBcbiAgLy8gQ29ybmVyIDE6IHRvcC1yaWdodFxuICBkeCA9IGJhbGwueCAtIChjYW52YXNXIC0gQ09STkVSX1JBRElVUyk7XG4gIGR5ID0gYmFsbC55IC0gQ09STkVSX1JBRElVUztcbiAgZDIgPSBkeCAqIGR4ICsgZHkgKiBkeTtcbiAgaWYgKGQyIDwgdGhyZXNob2xkU3EgJiYgZDIgPiAwKSB7XG4gICAgY29uc3QgZGlzdCA9IE1hdGguc3FydChkMik7XG4gICAgY29uc3QgcGVuID0gdGhyZXNob2xkIC0gZGlzdDtcbiAgICBjb25zdCBzdHJlbmd0aCA9IChwZW4gLyB0aHJlc2hvbGQpICogQ09STkVSX0ZPUkNFO1xuICAgIGNvbnN0IGludkRpc3QgPSAxIC8gZGlzdDtcbiAgICBiYWxsLnZ4ICs9IGR4ICogaW52RGlzdCAqIHN0cmVuZ3RoICogZHQ7XG4gICAgYmFsbC52eSArPSBkeSAqIGludkRpc3QgKiBzdHJlbmd0aCAqIGR0O1xuICB9XG4gIFxuICAvLyBNb2JpbGU6IG9ubHkgY2hlY2sgdG9wIDIgY29ybmVycyAoYm90dG9tIGNvcm5lcnMgcmFyZWx5IG5lZWRlZCBvbiBzbWFsbCBzY3JlZW5zKVxuICBpZiAobW9iaWxlKSByZXR1cm47XG4gIFxuICAvLyBDb3JuZXIgMjogYm90dG9tLWxlZnRcbiAgZHggPSBiYWxsLnggLSBDT1JORVJfUkFESVVTO1xuICBkeSA9IGJhbGwueSAtIChjYW52YXNIIC0gQ09STkVSX1JBRElVUyk7XG4gIGQyID0gZHggKiBkeCArIGR5ICogZHk7XG4gIGlmIChkMiA8IHRocmVzaG9sZFNxICYmIGQyID4gMCkge1xuICAgIGNvbnN0IGRpc3QgPSBNYXRoLnNxcnQoZDIpO1xuICAgIGNvbnN0IHBlbiA9IHRocmVzaG9sZCAtIGRpc3Q7XG4gICAgY29uc3Qgc3RyZW5ndGggPSAocGVuIC8gdGhyZXNob2xkKSAqIENPUk5FUl9GT1JDRTtcbiAgICBjb25zdCBpbnZEaXN0ID0gMSAvIGRpc3Q7XG4gICAgYmFsbC52eCArPSBkeCAqIGludkRpc3QgKiBzdHJlbmd0aCAqIGR0O1xuICAgIGJhbGwudnkgKz0gZHkgKiBpbnZEaXN0ICogc3RyZW5ndGggKiBkdDtcbiAgfVxuICBcbiAgLy8gQ29ybmVyIDM6IGJvdHRvbS1yaWdodFxuICBkeCA9IGJhbGwueCAtIChjYW52YXNXIC0gQ09STkVSX1JBRElVUyk7XG4gIGR5ID0gYmFsbC55IC0gKGNhbnZhc0ggLSBDT1JORVJfUkFESVVTKTtcbiAgZDIgPSBkeCAqIGR4ICsgZHkgKiBkeTtcbiAgaWYgKGQyIDwgdGhyZXNob2xkU3EgJiYgZDIgPiAwKSB7XG4gICAgY29uc3QgZGlzdCA9IE1hdGguc3FydChkMik7XG4gICAgY29uc3QgcGVuID0gdGhyZXNob2xkIC0gZGlzdDtcbiAgICBjb25zdCBzdHJlbmd0aCA9IChwZW4gLyB0aHJlc2hvbGQpICogQ09STkVSX0ZPUkNFO1xuICAgIGNvbnN0IGludkRpc3QgPSAxIC8gZGlzdDtcbiAgICBiYWxsLnZ4ICs9IGR4ICogaW52RGlzdCAqIHN0cmVuZ3RoICogZHQ7XG4gICAgYmFsbC52eSArPSBkeSAqIGludkRpc3QgKiBzdHJlbmd0aCAqIGR0O1xuICB9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVBoeXNpY3NJbnRlcm5hbChkdFNlY29uZHMsIGFwcGx5Rm9yY2VzRnVuYykge1xuICBjb25zdCBnbG9iYWxzID0gZ2V0R2xvYmFscygpO1xuICBjb25zdCBiYWxscyA9IGdsb2JhbHMuYmFsbHM7XG4gIGNvbnN0IGNhbnZhcyA9IGdsb2JhbHMuY2FudmFzO1xuICBcbiAgaWYgKCFjYW52YXMpIHJldHVybjtcblxuICBpZiAoYmFsbHMubGVuZ3RoID09PSAwKSByZXR1cm47XG5cbiAgY29uc3QgY3VzdG9tU3RlcCA9IGdldE1vZGVDdXN0b21TdGVwKCk7XG4gIGlmIChjdXN0b21TdGVwKSB7XG4gICAgY29uc3QgZHQgPSBNYXRoLm1pbigwLjAzMywgTWF0aC5tYXgoMCwgZHRTZWNvbmRzKSk7XG4gICAgY3VzdG9tU3RlcChkdCk7XG4gICAgc2V0QWNjdW11bGF0b3IoMCk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gU2VsZWN0IHBoeXNpY3MgdGltZXN0ZXAgYmFzZWQgb24gZGV2aWNlIHR5cGUgKDYwSHogbW9iaWxlLCAxMjBIeiBkZXNrdG9wKVxuICBjb25zdCBEVCA9IChnbG9iYWxzLmlzTW9iaWxlIHx8IGdsb2JhbHMuaXNNb2JpbGVWaWV3cG9ydCkgPyBEVF9NT0JJTEUgOiBEVF9ERVNLVE9QO1xuXG4gIC8vIEthbGVpZG9zY29wZSBtb2RlIGhhcyBpdHMgb3duIGxpZ2h0d2VpZ2h0IHBoeXNpY3MgcGF0aDpcbiAgLy8gLSBTbW9vdGggKHBlci1mcmFtZSksIG5vdCBmaXhlZC10aW1lc3RlcCBhY2N1bXVsYXRvclxuICAvLyAtIENvbGxpc2lvbnMgb24gKHByZXZlbnRzIG92ZXJsYXApXG4gIC8vIC0gTk8gcnViYmVyIHdhbGwgZGVmb3JtYXRpb24gLyBpbXBhY3RzXG4gIC8vIC0gU2ltcGxlIGJvdW5kcyBoYW5kbGluZyAobm8gY29ybmVyIHJlcGVsbGVycywgbm8gd2FsbCB3b2JibGUpXG4gIGlmIChnbG9iYWxzLmN1cnJlbnRNb2RlID09PSBNT0RFUy5LQUxFSURPU0NPUEUgfHwgZ2xvYmFscy5jdXJyZW50TW9kZSA9PT0gTU9ERVMuS0FMRUlET1NDT1BFX1JJRlQpIHtcbiAgICBjb25zdCBrYWxlaWRvQm91bmRzSGFuZGxlciA9IGdldE1vZGVCb3VuZHNIYW5kbGVyKCk7XG4gICAgY29uc3QgZHQgPSBNYXRoLm1pbigwLjAzMywgTWF0aC5tYXgoMCwgZHRTZWNvbmRzKSk7XG4gICAgY29uc3QgbGVuID0gYmFsbHMubGVuZ3RoO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGJhbGxzW2ldLnN0ZXAoZHQsIGFwcGx5Rm9yY2VzRnVuYyk7XG4gICAgfVxuXG4gICAgLy8gS2VlcCBjaXJjbGVzIGFwYXJ0IChub24tb3ZlcmxhcCkgd2l0aCBhIGxpZ2h0ZXIgc29sdmVyXG4gICAgLy8gUEVSRjogUmV1c2UgcHJlYWxsb2NhdGVkIG9wdGlvbnMgb2JqZWN0LCB1cGRhdGUgRFBSLWRlcGVuZGVudCB2YWx1ZVxuICAgIEtBTEVJRE9fQ09MTElTSU9OX09QVFMubWF4Q29ycmVjdGlvblB4ID0gMS4yNSAqIChnbG9iYWxzLkRQUiB8fCAxKTtcbiAgICByZXNvbHZlQ29sbGlzaW9uc0N1c3RvbShLQUxFSURPX0NPTExJU0lPTl9PUFRTKTtcblxuICAgIC8vIFNpbXBsZSBib3VuZHMgKG5vIGltcGFjdHMgLyBubyB3b2JibGUpXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgaWYgKGthbGVpZG9Cb3VuZHNIYW5kbGVyKSB7XG4gICAgICAgIGthbGVpZG9Cb3VuZHNIYW5kbGVyKGJhbGxzW2ldLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQsIGR0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBzZXRBY2N1bXVsYXRvcigwKTtcbiAgICByZXR1cm47XG4gIH1cbiAgXG4gIGFkZFRvQWNjdW11bGF0b3IoZHRTZWNvbmRzKTtcbiAgbGV0IHBoeXNpY3NTdGVwcyA9IDA7XG4gIGNvbnN0IGlzUGl0TW9kZSA9IGlzUGl0TGlrZU1vZGUoZ2xvYmFscy5jdXJyZW50TW9kZSk7XG4gIGxldCBwaXRQaHlzaWNzTXMgPSAwO1xuICBsZXQgcGl0Q29sbGlzaW9uTXMgPSAwO1xuICBsZXQgcGl0T3ZlcmxhcERlYnQgPSAwO1xuICBsZXQgcGl0UGFpckNvdW50ID0gMDtcbiAgbGV0IHBpdFNsZWVwaW5nUGFpclNraXBzID0gMDtcbiAgY29uc3QgcG9ydGZvbGlvTW90aW9uID0gZ2xvYmFscy5jdXJyZW50TW9kZSA9PT0gTU9ERVMuUE9SVEZPTElPX1BJVFxuICAgID8gZ2V0UG9ydGZvbGlvUGl0TW90aW9uUHJvZmlsZShnbG9iYWxzKVxuICAgIDogbnVsbDtcbiAgY29uc3QgbWF4UGh5c2ljc1N0ZXBzID0gcG9ydGZvbGlvTW90aW9uPy5tYXhQaHlzaWNzU3RlcHMgPz8gQ09OU1RBTlRTLk1BWF9QSFlTSUNTX1NURVBTO1xuXG4gIC8vIFdhbGwgaW5wdXQgYWNjdW11bGF0aW9uOlxuICBcbiAgd2hpbGUgKGdldEFjY3VtdWxhdG9yKCkgPj0gRFQgJiYgcGh5c2ljc1N0ZXBzIDwgbWF4UGh5c2ljc1N0ZXBzKSB7XG4gICAgY29uc3QgcGh5c2ljc1N0ZXBTdGFydCA9IGlzUGl0TW9kZSA/IHBlcmZvcm1hbmNlLm5vdygpIDogMDtcbiAgICAvLyBJbnRlZ3JhdGUgcGh5c2ljcyBmb3IgYWxsIG1vZGVzXG4gICAgICBjb25zdCBsZW4gPSBiYWxscy5sZW5ndGg7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGJhbGxzW2ldLnN0ZXAoRFQsIGFwcGx5Rm9yY2VzRnVuYyk7XG4gICAgICB9XG4gICAgXG4gICAgLy8gQ29sbGlzaW9uIHNvbHZlciBpdGVyYXRpb25zIChwZXJmb3JtYW5jZSB0dW5pbmcpXG4gICAgY29uc3QgYmFzZUNvbGxpc2lvbkl0ZXJhdGlvbnMgPSBNYXRoLm1heChcbiAgICAgIDEsXG4gICAgICBNYXRoLm1pbigyMCwgTWF0aC5yb3VuZChOdW1iZXIoZ2xvYmFscy5waHlzaWNzQ29sbGlzaW9uSXRlcmF0aW9ucyA/PyAxMCkgfHwgMTApKVxuICAgICk7XG4gICAgY29uc3QgY29sbGlzaW9uSXRlcmF0aW9ucyA9IHJlc29sdmVQaXRDb2xsaXNpb25JdGVyYXRpb25zKGdsb2JhbHMsIGJhc2VDb2xsaXNpb25JdGVyYXRpb25zKTtcblxuICAgIC8vIEJhbGwtdG8tYmFsbCBjb2xsaXNpb25zOlxuICAgIC8vIC0gRGlzYWJsZWQgZm9yIEZsaWVzIChzd2FybSBhZXN0aGV0aWMpXG4gICAgLy8gLSBSZWR1Y2VkIGZvciBLYWxlaWRvc2NvcGUgbW9kZSAocGVyZm9ybWFuY2UpXG4gICAgLy8gLSBTdGFuZGFyZCBmb3IgcmVtYWluaW5nIHBoeXNpY3MgbW9kZXNcbiAgICBsZXQgY29sbGlzaW9uU3RhdHMgPSBFTVBUWV9DT0xMSVNJT05fU1RBVFM7XG4gICAgY29uc3QgY29sbGlzaW9uU3RhcnQgPSBpc1BpdE1vZGUgPyBwZXJmb3JtYW5jZS5ub3coKSA6IDA7XG4gICAgaWYgKGdsb2JhbHMuY3VycmVudE1vZGUgPT09IE1PREVTLktBTEVJRE9TQ09QRSB8fCBnbG9iYWxzLmN1cnJlbnRNb2RlID09PSBNT0RFUy5LQUxFSURPU0NPUEVfUklGVCkge1xuICAgICAgY29sbGlzaW9uU3RhdHMgPSByZXNvbHZlQ29sbGlzaW9ucyg2KSB8fCBFTVBUWV9DT0xMSVNJT05fU1RBVFM7IC8vIGhhbmRsZWQgYnkga2FsZWlkb3Njb3BlIGVhcmx5LXJldHVybiwga2VwdCBmb3Igc2FmZXR5XG4gICAgfSBlbHNlIGlmIChnbG9iYWxzLmN1cnJlbnRNb2RlID09PSBNT0RFUy5XRUFWRV9GSUVMRCkge1xuICAgICAgY29uc3Qgd2VhdmVJdGVyYXRpb25zID0gTWF0aC5tYXgoXG4gICAgICAgIDAsXG4gICAgICAgIE1hdGgubWluKDYsIE1hdGgucm91bmQoTnVtYmVyKGdsb2JhbHMud2VhdmVGaWVsZENvbGxpc2lvbkl0ZXJhdGlvbnMgPz8gMikgfHwgMCkpXG4gICAgICApO1xuICAgICAgaWYgKHdlYXZlSXRlcmF0aW9ucyA+IDApIHtcbiAgICAgICAgY29sbGlzaW9uU3RhdHMgPSByZXNvbHZlQ29sbGlzaW9ucyh3ZWF2ZUl0ZXJhdGlvbnMpIHx8IEVNUFRZX0NPTExJU0lPTl9TVEFUUztcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKFxuICAgICAgc2hvdWxkUmVzb2x2ZUJhbGxDb2xsaXNpb25zRm9yTW9kZShnbG9iYWxzLmN1cnJlbnRNb2RlKVxuICAgICAgJiYgIShCb29sZWFuKGdsb2JhbHMuaXNNb2JpbGUgfHwgZ2xvYmFscy5pc01vYmlsZVZpZXdwb3J0KSAmJiBnbG9iYWxzLmN1cnJlbnRNb2RlID09PSBNT0RFUy5CVUJCTEVTKVxuICAgICkge1xuICAgICAgY29sbGlzaW9uU3RhdHMgPSByZXNvbHZlQ29sbGlzaW9ucyhjb2xsaXNpb25JdGVyYXRpb25zKSB8fCBFTVBUWV9DT0xMSVNJT05fU1RBVFM7IC8vIGNvbmZpZ3VyYWJsZSBzb2x2ZXIgaXRlcmF0aW9uc1xuICAgIH1cbiAgICBpZiAoaXNQaXRNb2RlKSB7XG4gICAgICBwaXRDb2xsaXNpb25NcyArPSAocGVyZm9ybWFuY2Uubm93KCkgLSBjb2xsaXNpb25TdGFydCk7XG4gICAgICBwaXRPdmVybGFwRGVidCArPSBOdW1iZXIoY29sbGlzaW9uU3RhdHMub3ZlcmxhcERlYnQpIHx8IDA7XG4gICAgICBwaXRQYWlyQ291bnQgKz0gTnVtYmVyKGNvbGxpc2lvblN0YXRzLnBhaXJDb3VudCkgfHwgMDtcbiAgICAgIHBpdFNsZWVwaW5nUGFpclNraXBzICs9IE51bWJlcihjb2xsaXNpb25TdGF0cy5zbGVlcGluZ1BhaXJTa2lwcykgfHwgMDtcbiAgICB9XG5cbiAgICBcbiAgICAvLyBXYWxsIGNvbGxpc2lvbnMgKyBjb3JuZXIgcmVwZWxsZXJzXG4gICAgLy8gU2tpcCBmb3IgUGFyYWxsYXggbW9kZXMgKGludGVybmFsIHdyYXAgbG9naWMsIG5vIHdhbGwgcGh5c2ljcylcbiAgICAvLyBQRVJGOiBIb2lzdCBtb2RlL21vYmlsZSBjaGVja3MgYW5kIGNhbnZhcyBkaW1lbnNpb25zIG91dHNpZGUgbG9vcHNcbiAgICBjb25zdCBtb2RlID0gZ2xvYmFscy5jdXJyZW50TW9kZTtcbiAgICBpZiAobW9kZSAhPT0gTU9ERVMuU1BIRVJFXzNEICYmXG4gICAgICAgIG1vZGUgIT09IE1PREVTLkNVQkVfM0QgJiZcbiAgICAgICAgbW9kZSAhPT0gTU9ERVMuUEFSQUxMQVhfRkxPQVQgJiZcbiAgICAgICAgbW9kZSAhPT0gTU9ERVMuU1RBUkZJRUxEXzNEKSB7XG4gICAgICBjb25zdCBwb3J0Zm9saW9Nb3Rpb24gPSBtb2RlID09PSBNT0RFUy5QT1JURk9MSU9fUElUXG4gICAgICAgID8gZ2V0UG9ydGZvbGlvUGl0TW90aW9uUHJvZmlsZShnbG9iYWxzKVxuICAgICAgICA6IG51bGw7XG4gICAgICBjb25zdCB3YWxsUmVzdGl0dXRpb24gPSBtb2RlID09PSBNT0RFUy5XRUlHSFRMRVNTXG4gICAgICAgID8gZ2xvYmFscy53ZWlnaHRsZXNzQm91bmNlXG4gICAgICAgIDogKHBvcnRmb2xpb01vdGlvbj8ud2FsbFJlc3RpdHV0aW9uID8/IGdsb2JhbHMuUkVTVCk7XG4gICAgICBjb25zdCBpc1BpdExpa2UgPSBpc1BpdExpa2VNb2RlKG1vZGUpO1xuICAgICAgY29uc3QgbGVuV2FsbHMgPSBiYWxscy5sZW5ndGg7XG4gICAgICAvLyBQRVJGOiBQcmVhbGxvY2F0ZWQgb3B0aW9ucyBvYmplY3QgLSBhbHdheXMgZW5hYmxlIGVmZmVjdHMgZm9yIHJ1bWJsZVxuICAgICAgY29uc3Qgd2FsbEVmZmVjdHNPcHRpb25zID0gV0FMTF9FRkZFQ1RTX09OO1xuICAgICAgY29uc3QgaXNNb2JpbGUgPSBnbG9iYWxzLmlzTW9iaWxlIHx8IGdsb2JhbHMuaXNNb2JpbGVWaWV3cG9ydDtcbiAgICAgIGNvbnN0IGNhbnZhc1cgPSBjYW52YXMud2lkdGg7XG4gICAgICBjb25zdCBjYW52YXNIID0gY2FudmFzLmhlaWdodDtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuV2FsbHM7IGkrKykge1xuICAgICAgICBjb25zdCBiYWxsID0gYmFsbHNbaV07XG4gICAgICAgIC8vIFNraXAgd2FsbCBjb2xsaXNpb25zIGZvciBEVkQgbG9nbyBiYWxscyAodGhleSBoYW5kbGUgdGhlaXIgb3duIGJvdW5jaW5nKVxuICAgICAgICBpZiAoYmFsbC5pc0R2ZExvZ28pIGNvbnRpbnVlO1xuICAgICAgICAvLyBQb2ludGVyLWRyYWdnZWQgYmFsbHMgYXJlIHBvc2l0aW9uZWQgYnkgdGhlIFVJOyB3YWxscygpIHdvdWxkIGZpZ2h0IHRoZSBjdXJzb3IuXG4gICAgICAgIGlmIChiYWxsLmlzUG9pbnRlckxvY2tlZCkgY29udGludWU7XG5cbiAgICAgICAgLy8gQmFsbCBGaWVsZCBoYXMgZXhwbGljaXQgcm91bmRlZC1jb3JuZXIgYXJjIGNsYW1waW5nIGluIEJhbGwud2FsbHMoKS5cbiAgICAgICAgLy8gQXZvaWQgYW4gYWRkaXRpb25hbCB2ZWxvY2l0eS1iYXNlZCBjb3JuZXIgcmVwZWxsZXIgdGhlcmUsIHdoaWNoIGNhblxuICAgICAgICAvLyBjcmVhdGUgbG9jYWwgY29tcHJlc3Npb25zIGluIGRlbnNlIGNvcm5lciBzdGFja3MuXG4gICAgICAgIGlmICghaXNQaXRMaWtlKSBhcHBseUNvcm5lclJlcGVsbGVycyhiYWxsLCBjYW52YXNXLCBjYW52YXNILCBEVCwgaXNNb2JpbGUpO1xuICAgICAgICBiYWxsLndhbGxzKGNhbnZhc1csIGNhbnZhc0gsIERULCB3YWxsUmVzdGl0dXRpb24sIHdhbGxFZmZlY3RzT3B0aW9ucyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQmFsbCBGaWVsZCBzdGFiaWxpemF0aW9uOlxuICAgIC8vIFdhbGwvY29ybmVyIGNsYW1waW5nIGNhbiByZS1pbnRyb2R1Y2Ugb3ZlcmxhcHMgaW4gZGVuc2Ugc3RhY2tzIChlc3BlY2lhbGx5IG5lYXIgdGhlIGZsb29yKS5cbiAgICAvLyBSdW4gYSBzbWFsbCBwb3N0LXdhbGwgY29sbGlzaW9uIHBhc3MgZm9yIFBpdC1saWtlIG1vZGVzIG9ubHkuXG4gICAgaWYgKGlzUGl0TGlrZU1vZGUobW9kZSkpIHtcbiAgICAgIGNvbnN0IG92ZXJsYXBUaHJlc2hvbGQgPSBtb2RlID09PSBNT0RFUy5QT1JURk9MSU9fUElUXG4gICAgICAgID8gMFxuICAgICAgICA6IE1hdGgubWF4KDAsIE51bWJlcihnbG9iYWxzLnBpdFBvc3RQYXNzT3ZlcmxhcFRocmVzaG9sZCA/PyAwKSk7XG4gICAgICBjb25zdCBzaG91bGRSdW5Qb3N0UGFzcyA9IG92ZXJsYXBUaHJlc2hvbGQgPD0gMCB8fCAoTnVtYmVyKGNvbGxpc2lvblN0YXRzLm92ZXJsYXBEZWJ0KSB8fCAwKSA+PSBvdmVybGFwVGhyZXNob2xkO1xuICAgICAgaWYgKHNob3VsZFJ1blBvc3RQYXNzKSB7XG4gICAgICAgIGNvbnN0IHBvc3RQYXNzU3RhcnQgPSBpc1BpdE1vZGUgPyBwZXJmb3JtYW5jZS5ub3coKSA6IDA7XG4gICAgICAgIHJlc29sdmVDb2xsaXNpb25zKDMpO1xuICAgICAgICBpZiAoaXNQaXRNb2RlKSB7XG4gICAgICAgICAgcGl0Q29sbGlzaW9uTXMgKz0gKHBlcmZvcm1hbmNlLm5vdygpIC0gcG9zdFBhc3NTdGFydCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUaGUgcG9zdC13YWxsIGNvbGxpc2lvbiBwYXNzIGNhbiBwdXNoIGJvZGllcyBzbGlnaHRseSBvdXRzaWRlIHRoZSBpbnNldCB3YWxsIGJvdW5kcy5cbiAgICAgICAgLy8gQ2xhbXAgb25jZSBtb3JlIHdpdGhvdXQgcmVnaXN0ZXJpbmcgd2FsbCBlZmZlY3RzIChzb3VuZC9wcmVzc3VyZS93b2JibGUpLlxuICAgICAgICAvLyBQRVJGOiBSZXVzZSBwcmVhbGxvY2F0ZWQgb3B0aW9ucyBvYmplY3RcbiAgICAgICAgY29uc3QgcG9zdFBhc3NQb3J0Zm9saW9Nb3Rpb24gPSBtb2RlID09PSBNT0RFUy5QT1JURk9MSU9fUElUXG4gICAgICAgICAgPyBnZXRQb3J0Zm9saW9QaXRNb3Rpb25Qcm9maWxlKGdsb2JhbHMpXG4gICAgICAgICAgOiBudWxsO1xuICAgICAgICBjb25zdCB3YWxsUmVzdGl0dXRpb24gPSBwb3N0UGFzc1BvcnRmb2xpb01vdGlvbj8ud2FsbFJlc3RpdHV0aW9uID8/IGdsb2JhbHMuUkVTVDtcbiAgICAgICAgY29uc3QgbGVuQ2xhbXAgPSBiYWxscy5sZW5ndGg7XG4gICAgICAgIGNvbnN0IGNhbnZhc1cgPSBjYW52YXMud2lkdGg7XG4gICAgICAgIGNvbnN0IGNhbnZhc0ggPSBjYW52YXMuaGVpZ2h0O1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbkNsYW1wOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBiID0gYmFsbHNbaV07XG4gICAgICAgICAgaWYgKGI/LmlzUG9pbnRlckxvY2tlZCkgY29udGludWU7XG4gICAgICAgICAgYi53YWxscyhcbiAgICAgICAgICAgIGNhbnZhc1csXG4gICAgICAgICAgICBjYW52YXNILFxuICAgICAgICAgICAgRFQsXG4gICAgICAgICAgICB3YWxsUmVzdGl0dXRpb24sXG4gICAgICAgICAgICBtb2RlID09PSBNT0RFUy5QT1JURk9MSU9fUElUID8gUE9SVEZPTElPX1BJVF9DTEFNUF9PUFRTIDogUElUX0NMQU1QX09QVFNcbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4gICAgICAgIC8vIFBPU1QtUEhZU0lDUyBTVEFCSUxJWkFUSU9OIChQaXQgbW9kZXMgb25seSlcbiAgICAgICAgLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4gICAgICAgIGNvbnN0IERQUiA9IGdsb2JhbHMuRFBSIHx8IDE7XG4gICAgICAgIGNvbnN0IHBpdE1vdGlvbiA9IG1vZGUgPT09IE1PREVTLlBPUlRGT0xJT19QSVRcbiAgICAgICAgICA/IGdldFBvcnRmb2xpb1BpdE1vdGlvblByb2ZpbGUoZ2xvYmFscylcbiAgICAgICAgICA6IG51bGw7XG4gICAgICAgIGNvbnN0IHZUaHJlc2hCYXNlID0gcGl0TW90aW9uPy5zbGVlcFZlbG9jaXR5VGhyZXNob2xkXG4gICAgICAgICAgPz8gKE51bWJlci5pc0Zpbml0ZShnbG9iYWxzLnNsZWVwVmVsb2NpdHlUaHJlc2hvbGQpID8gZ2xvYmFscy5zbGVlcFZlbG9jaXR5VGhyZXNob2xkIDogMTIuMCk7XG4gICAgICAgIGNvbnN0IHZUaHJlc2ggPSB2VGhyZXNoQmFzZSAqIERQUjtcbiAgICAgICAgY29uc3QgdlRocmVzaFNxID0gdlRocmVzaCAqIHZUaHJlc2g7XG4gICAgICAgIGNvbnN0IHRpbnlTcGVlZFNxID0gKDIgKiBEUFIpICogKDIgKiBEUFIpO1xuICAgICAgICBjb25zdCB3VGhyZXNoID0gcGl0TW90aW9uPy5zbGVlcEFuZ3VsYXJUaHJlc2hvbGRcbiAgICAgICAgICA/PyAoTnVtYmVyLmlzRmluaXRlKGdsb2JhbHMuc2xlZXBBbmd1bGFyVGhyZXNob2xkKSA/IGdsb2JhbHMuc2xlZXBBbmd1bGFyVGhyZXNob2xkIDogMC4xOCk7XG4gICAgICAgIGNvbnN0IHRTbGVlcCA9IHBpdE1vdGlvbj8udGltZVRvU2xlZXAgPz8gZ2xvYmFscy50aW1lVG9TbGVlcCA/PyAwLjI1O1xuICAgICAgICBjb25zdCBncm91bmRlZFZlcnRpY2FsU25hcCA9IChwaXRNb3Rpb24/Lmdyb3VuZGVkVmVydGljYWxTbmFwID8/IDYpICogRFBSO1xuICAgICAgICBjb25zdCBzdXBwb3J0VmVydGljYWxTbmFwID0gKHBpdE1vdGlvbj8uc3VwcG9ydFZlcnRpY2FsU25hcCA/PyBncm91bmRlZFZlcnRpY2FsU25hcCkgKiBEUFI7XG4gICAgICAgIGNvbnN0IHJlc3RpbmdMYXRlcmFsU25hcCA9IChwaXRNb3Rpb24/LnJlc3RpbmdMYXRlcmFsU25hcCA/PyA2KSAqIERQUjtcbiAgICAgICAgY29uc3QgcmVzdGluZ0FuZ3VsYXJTbmFwID0gcGl0TW90aW9uPy5yZXN0aW5nQW5ndWxhclNuYXAgPz8gMC4wNjtcbiAgICAgICAgXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuQ2xhbXA7IGkrKykge1xuICAgICAgICAgIGNvbnN0IGIgPSBiYWxsc1tpXTtcbiAgICAgICAgICBpZiAoIWIgfHwgYi5pc1NsZWVwaW5nKSBjb250aW51ZTtcbiAgICAgICAgICBjb25zdCBzcGVlZFNxID0gYi52eCAqIGIudnggKyBiLnZ5ICogYi52eTtcbiAgICAgICAgICBjb25zdCBhbmdTcGVlZCA9IE1hdGguYWJzKGIub21lZ2EpO1xuICAgICAgICAgIGNvbnN0IGhhc1Jlc3RpbmdDb250YWN0ID0gTnVtYmVyKGIucmVzdGluZ0NvbnRhY3RUaW1lcikgPiAwO1xuICAgICAgICAgIGNvbnN0IGlzU2V0dGxlZCA9IGIuaXNHcm91bmRlZCB8fCBiLmhhc1N1cHBvcnQgfHwgaGFzUmVzdGluZ0NvbnRhY3Q7XG4gICAgICAgICAgaWYgKGlzU2V0dGxlZCAmJiBzcGVlZFNxIDwgdlRocmVzaFNxICYmIGFuZ1NwZWVkIDwgd1RocmVzaCkge1xuICAgICAgICAgICAgYi52eCAqPSAwLjMyO1xuICAgICAgICAgICAgYi52eSAqPSAwLjI7XG4gICAgICAgICAgICBiLm9tZWdhICo9IDAuMjg7XG4gICAgICAgICAgICBpZiAoYi5pc0dyb3VuZGVkICYmIE1hdGguYWJzKGIudnkpIDwgZ3JvdW5kZWRWZXJ0aWNhbFNuYXApIHtcbiAgICAgICAgICAgICAgYi52eSA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYi5oYXNTdXBwb3J0ICYmIE1hdGguYWJzKGIudnkpIDwgc3VwcG9ydFZlcnRpY2FsU25hcCkge1xuICAgICAgICAgICAgICBiLnZ5ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChNYXRoLmFicyhiLnZ4KSA8IHJlc3RpbmdMYXRlcmFsU25hcCkge1xuICAgICAgICAgICAgICBiLnZ4ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzcGVlZFNxIDwgdGlueVNwZWVkU3EpIHtcbiAgICAgICAgICAgICAgYi52eCA9IDA7XG4gICAgICAgICAgICAgIGIudnkgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGFuZ1NwZWVkIDwgcmVzdGluZ0FuZ3VsYXJTbmFwKSB7XG4gICAgICAgICAgICAgIGIub21lZ2EgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbmVhclJlc3QgPSBNYXRoLmFicyhiLnZ4KSA8IHJlc3RpbmdMYXRlcmFsU25hcFxuICAgICAgICAgICAgICAmJiBNYXRoLmFicyhiLnZ5KSA8IE1hdGgubWF4KGdyb3VuZGVkVmVydGljYWxTbmFwLCBzdXBwb3J0VmVydGljYWxTbmFwKVxuICAgICAgICAgICAgICAmJiBhbmdTcGVlZCA8IE1hdGgubWF4KHJlc3RpbmdBbmd1bGFyU25hcCAqIDEuNSwgMC4wMyk7XG4gICAgICAgICAgICBpZiAobmVhclJlc3QgJiYgcGl0TW90aW9uPy5yZXN0aW5nQ29udGFjdEhvbGQgPiAwKSB7XG4gICAgICAgICAgICAgIGIucmVzdGluZ0NvbnRhY3RUaW1lciA9IE1hdGgubWF4KE51bWJlcihiLnJlc3RpbmdDb250YWN0VGltZXIpIHx8IDAsIHBpdE1vdGlvbi5yZXN0aW5nQ29udGFjdEhvbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZGlyZWN0U2xlZXBFbGlnaWJsZSA9IG5lYXJSZXN0XG4gICAgICAgICAgICAgICYmIGhhc1Jlc3RpbmdDb250YWN0XG4gICAgICAgICAgICAgICYmIE1hdGguYWJzKGIudnkpIDwgKE1hdGgubWluKGdyb3VuZGVkVmVydGljYWxTbmFwLCBzdXBwb3J0VmVydGljYWxTbmFwKSAqIDAuMzUpXG4gICAgICAgICAgICAgICYmIHNwZWVkU3EgPCAodGlueVNwZWVkU3EgKiA0KVxuICAgICAgICAgICAgICAmJiAoTnVtYmVyKGIucmVzdGluZ0NvbnRhY3RUaW1lcikgfHwgMCkgPj0gTWF0aC5taW4ocGl0TW90aW9uPy5yZXN0aW5nQ29udGFjdEhvbGQgPz8gMCwgMC4xMik7XG4gICAgICAgICAgICBpZiAoZGlyZWN0U2xlZXBFbGlnaWJsZSkge1xuICAgICAgICAgICAgICBiLnZ4ID0gMDtcbiAgICAgICAgICAgICAgYi52eSA9IDA7XG4gICAgICAgICAgICAgIGIub21lZ2EgPSAwO1xuICAgICAgICAgICAgICBiLnNsZWVwVGltZXIgPSB0U2xlZXA7XG4gICAgICAgICAgICAgIGIuaXNTbGVlcGluZyA9IHRydWU7XG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYi5zbGVlcFRpbWVyICs9IG5lYXJSZXN0ID8gKERUICogMikgOiBEVDtcbiAgICAgICAgICAgIGlmIChiLnNsZWVwVGltZXIgPj0gdFNsZWVwKSB7XG4gICAgICAgICAgICAgIGIudnggPSAwO1xuICAgICAgICAgICAgICBiLnZ5ID0gMDtcbiAgICAgICAgICAgICAgYi5vbWVnYSA9IDA7XG4gICAgICAgICAgICAgIGIuaXNTbGVlcGluZyA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGIuc2xlZXBUaW1lciA9IDA7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gR2xvYmFsIHNsZWVwIChub24tcGl0IHBoeXNpY3MgbW9kZXMpOlxuICAgIC8vIElmIGVuYWJsZWQsIGFsbG93IHRydWx5LXN0YXRpb25hcnkgYmFsbHMgdG8gc2xlZXAgdG8gcmVkdWNlIHBlci1iYWxsIHdvcmsuXG4gICAgLy8gVXNlcyBwaHlzaWNzU2xlZXBUaHJlc2hvbGQvcGh5c2ljc1NsZWVwVGltZSAoRFBSLXNjYWxlZCkgYW5kIHRoZSBzaGFyZWQgYW5ndWxhciB0aHJlc2hvbGQuXG4gICAgaWYgKGdsb2JhbHMucGh5c2ljc1NraXBTbGVlcGluZ1N0ZXBzICE9PSBmYWxzZSkge1xuICAgICAgLy8gUEVSRjogUmV1c2UgbW9kZSB2YXJpYWJsZSBmcm9tIHdhbGwgY29sbGlzaW9uIGJsb2NrIChhbHJlYWR5IGhvaXN0ZWQpXG4gICAgICBjb25zdCBlbGlnaWJsZSA9XG4gICAgICAgIG1vZGUgIT09IE1PREVTLkZMSUVTICYmXG4gICAgICAgIG1vZGUgIT09IE1PREVTLlNQSEVSRV8zRCAmJlxuICAgICAgICBtb2RlICE9PSBNT0RFUy5DVUJFXzNEICYmXG4gICAgICAgIG1vZGUgIT09IE1PREVTLlBBUkFMTEFYX0ZMT0FUICYmXG4gICAgICAgIG1vZGUgIT09IE1PREVTLktBTEVJRE9TQ09QRSAmJlxuICAgICAgICBtb2RlICE9PSBNT0RFUy5LQUxFSURPU0NPUEVfUklGVCAmJlxuICAgICAgICBtb2RlICE9PSBNT0RFUy5XRUFWRV9GSUVMRCAmJlxuICAgICAgICBtb2RlICE9PSBNT0RFUy5TSEFQRVMgJiZcbiAgICAgICAgbW9kZSAhPT0gTU9ERVMuUFJFU1NVUkVfQ1JVQ0lCTEUgJiZcbiAgICAgICAgIWlzUGl0TGlrZU1vZGUobW9kZSk7XG5cbiAgICAgIGlmIChlbGlnaWJsZSkge1xuICAgICAgICBjb25zdCBEUFIgPSBnbG9iYWxzLkRQUiB8fCAxO1xuICAgICAgICBjb25zdCB2VGhyZXNoID0gTWF0aC5tYXgoMCwgTnVtYmVyKGdsb2JhbHMucGh5c2ljc1NsZWVwVGhyZXNob2xkID8/IDEyLjApIHx8IDApICogRFBSO1xuICAgICAgICAvLyBQRVJGOiBQcmVjb21wdXRlIHNxdWFyZWQgdGhyZXNob2xkIHRvIGF2b2lkIE1hdGguc3FydCBpbiBob3QgbG9vcFxuICAgICAgICBjb25zdCB2VGhyZXNoU3EgPSB2VGhyZXNoICogdlRocmVzaDtcbiAgICAgICAgY29uc3QgdFNsZWVwID0gTWF0aC5tYXgoMCwgTnVtYmVyKGdsb2JhbHMucGh5c2ljc1NsZWVwVGltZSA/PyAwLjI1KSB8fCAwKTtcbiAgICAgICAgY29uc3Qgd1RocmVzaCA9IE51bWJlci5pc0Zpbml0ZShnbG9iYWxzLnNsZWVwQW5ndWxhclRocmVzaG9sZCkgPyBnbG9iYWxzLnNsZWVwQW5ndWxhclRocmVzaG9sZCA6IDAuMTg7XG5cbiAgICAgICAgaWYgKHZUaHJlc2ggPiAwICYmIHRTbGVlcCA+IDApIHtcbiAgICAgICAgICBjb25zdCBsZW5TbGVlcCA9IGJhbGxzLmxlbmd0aDtcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlblNsZWVwOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGIgPSBiYWxsc1tpXTtcbiAgICAgICAgICAgIGlmICghYiB8fCBiLmlzU2xlZXBpbmcpIGNvbnRpbnVlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBOZXZlciBhbGxvdyBtZXRlb3JzIHRvIHNsZWVwIC0gdGhleSBuZWVkIHRvIHJlZ2lzdGVyIHdhbGwgaW1wYWN0c1xuICAgICAgICAgICAgaWYgKGIuaXNNZXRlb3IgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgYi5zbGVlcFRpbWVyID0gMDtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFBFUkY6IFVzZSBzcXVhcmVkIHNwZWVkIGNvbXBhcmlzb24gdG8gYXZvaWQgTWF0aC5zcXJ0XG4gICAgICAgICAgICBjb25zdCBzcGVlZFNxID0gYi52eCAqIGIudnggKyBiLnZ5ICogYi52eTtcbiAgICAgICAgICAgIGNvbnN0IGFuZ1NwZWVkID0gTWF0aC5hYnMoYi5vbWVnYSk7XG4gICAgICAgICAgICBpZiAoc3BlZWRTcSA8IHZUaHJlc2hTcSAmJiBhbmdTcGVlZCA8IHdUaHJlc2gpIHtcbiAgICAgICAgICAgICAgYi5zbGVlcFRpbWVyICs9IERUO1xuICAgICAgICAgICAgICBpZiAoYi5zbGVlcFRpbWVyID49IHRTbGVlcCkge1xuICAgICAgICAgICAgICAgIGIudnggPSAwO1xuICAgICAgICAgICAgICAgIGIudnkgPSAwO1xuICAgICAgICAgICAgICAgIGIub21lZ2EgPSAwO1xuICAgICAgICAgICAgICAgIGIuaXNTbGVlcGluZyA9IHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGIuc2xlZXBUaW1lciA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIHN1YnRyYWN0RnJvbUFjY3VtdWxhdG9yKERUKTtcbiAgICBwaHlzaWNzU3RlcHMrKztcbiAgICBpZiAoZ2xvYmFscy5jdXJyZW50TW9kZSA9PT0gTU9ERVMuUE9SVEZPTElPX1BJVCkge1xuICAgICAgY29uc3QgcmVjb3ZlcnlGcmFtZXMgPSBOdW1iZXIoZ2xvYmFscy5wb3J0Zm9saW9SZXNpemVSZWNvdmVyeUZyYW1lcykgfHwgMDtcbiAgICAgIGlmIChyZWNvdmVyeUZyYW1lcyA+IDApIHtcbiAgICAgICAgZ2xvYmFscy5wb3J0Zm9saW9SZXNpemVSZWNvdmVyeUZyYW1lcyA9IE1hdGgubWF4KDAsIHJlY292ZXJ5RnJhbWVzIC0gMSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpc1BpdE1vZGUpIHtcbiAgICAgIHBpdFBoeXNpY3NNcyArPSAocGVyZm9ybWFuY2Uubm93KCkgLSBwaHlzaWNzU3RlcFN0YXJ0KTtcbiAgICB9XG4gIH1cbiAgXG4gIC8vIE1vZGUtc3BlY2lmaWMgcGVyLWZyYW1lIHVwZGF0ZXMgKHdhdGVyIHJpcHBsZXMsIG1hZ25ldGljIGV4cGxvc2lvbnMsIHRpbHQgdHJhbnNmb3JtLCBldGMuKVxuICBjb25zdCBtb2RlVXBkYXRlciA9IGdldE1vZGVVcGRhdGVyKCk7XG4gIGlmIChtb2RlVXBkYXRlcikge1xuICAgIG1vZGVVcGRhdGVyKGR0U2Vjb25kcyk7XG4gIH1cbiAgXG5cbiAgLy8gUmVzZXQgYWNjdW11bGF0b3IgaWYgZmFsbGluZyBiZWhpbmRcbiAgY29uc3QgYWNjdW11bGF0b3JSZXNldFRocmVzaG9sZCA9IHBvcnRmb2xpb01vdGlvbj8uYWNjdW11bGF0b3JSZXNldFRocmVzaG9sZFxuICAgID8/IENPTlNUQU5UUy5BQ0NVTVVMQVRPUl9SRVNFVF9USFJFU0hPTEQ7XG4gIGlmIChnZXRBY2N1bXVsYXRvcigpID4gRFQgKiBhY2N1bXVsYXRvclJlc2V0VGhyZXNob2xkKSB7XG4gICAgc2V0QWNjdW11bGF0b3IoMCk7XG4gIH1cblxuICBpZiAoaXNQaXRNb2RlKSB7XG4gICAgY29uc3Qgc3RvcmUgPSBnZXRQaXRQZXJmU3RvcmUoZ2xvYmFscyk7XG4gICAgaWYgKHN0b3JlKSB7XG4gICAgICBzdG9yZS5wZW5kaW5nUGh5c2ljcyA9IHtcbiAgICAgICAgcGh5c2ljc01zOiBwaXRQaHlzaWNzTXMsXG4gICAgICAgIGNvbGxpc2lvbk1zOiBwaXRDb2xsaXNpb25NcyxcbiAgICAgICAgb3ZlcmxhcERlYnQ6IHBpdE92ZXJsYXBEZWJ0LFxuICAgICAgICBwYWlyQ291bnQ6IHBpdFBhaXJDb3VudCxcbiAgICAgICAgc2xlZXBpbmdQYWlyU2tpcHM6IHBpdFNsZWVwaW5nUGFpclNraXBzXG4gICAgICB9O1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlUGh5c2ljcyhkdFNlY29uZHMsIGFwcGx5Rm9yY2VzRnVuYykge1xuICBjb25zdCBnbG9iYWxzID0gZ2V0R2xvYmFscygpO1xuICBjb25zdCBjYW52YXMgPSBnbG9iYWxzLmNhbnZhcztcbiAgY29uc3QgYmFsbHMgPSBnbG9iYWxzLmJhbGxzO1xuXG4gIGNvbnN0IHBpdEZ4VGhyb3R0bGVBd2FyZSA9IGlzUGl0TGlrZU1vZGUoZ2xvYmFscy5jdXJyZW50TW9kZSlcbiAgICAmJiBTdHJpbmcoZ2xvYmFscy5waXRGeFRocm90dGxlUG9saWN5IHx8ICd0aHJvdHRsZS1hd2FyZScpID09PSAndGhyb3R0bGUtYXdhcmUnO1xuICBjb25zdCBzaG91bGRVcGRhdGVDdXJzb3JFeHBsb3Npb24gPSAhKHBpdEZ4VGhyb3R0bGVBd2FyZSAmJiAoTnVtYmVyKGdsb2JhbHMuYWRhcHRpdmVUaHJvdHRsZUxldmVsKSB8fCAwKSA+PSAxKTtcbiAgaWYgKHNob3VsZFVwZGF0ZUN1cnNvckV4cGxvc2lvbikge1xuICAgIHVwZGF0ZUN1cnNvckV4cGxvc2lvbihkdFNlY29uZHMpO1xuICB9XG5cbiAgaWYgKCFjYW52YXMpIHJldHVybjtcbiAgaWYgKCFiYWxscyB8fCBiYWxscy5sZW5ndGggPT09IDApIHJldHVybjtcblxuICAvLyBNb2RlIHdhcm11cDogY29uc3VtZSBzeW5jaHJvbm91c2x5IGJlZm9yZSBmaXJzdCByZW5kZXIgYWZ0ZXIgaW5pdC5cbiAgLy8gVGhpcyBwcmV2ZW50cyB2aXNpYmxlIOKAnHNldHRsaW5n4oCdIG1vdGlvbiAobm8gcG9wLWluL2ZsYXNoKSBieSBhZHZhbmNpbmcgcGh5c2ljc1xuICAvLyBOIHJlbmRlci1mcmFtZXMgd2l0aG91dCBkcmF3aW5nLlxuICBjb25zdCB3YXJtdXBGcmFtZXMgPSBNYXRoLm1heCgwLCBNYXRoLnJvdW5kKGdsb2JhbHMud2FybXVwRnJhbWVzUmVtYWluaW5nIHx8IDApKTtcbiAgaWYgKHdhcm11cEZyYW1lcyA+IDApIHtcbiAgICBnbG9iYWxzLndhcm11cEZyYW1lc1JlbWFpbmluZyA9IDA7XG4gICAgc2V0QWNjdW11bGF0b3IoMCk7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHdhcm11cEZyYW1lczsgaSsrKSB7XG4gICAgICB1cGRhdGVQaHlzaWNzSW50ZXJuYWwoV0FSTVVQX0ZSQU1FX0RULCBhcHBseUZvcmNlc0Z1bmMpO1xuICAgIH1cbiAgICAvLyBObyBmdXJ0aGVyIHBoeXNpY3MgdGhpcyBmcmFtZTsgcmVuZGVyIHdpbGwgc2hvdyB0aGUgc2V0dGxlZCBzdGF0ZS5cbiAgICByZXR1cm47XG4gIH1cblxuICB1cGRhdGVQaHlzaWNzSW50ZXJuYWwoZHRTZWNvbmRzLCBhcHBseUZvcmNlc0Z1bmMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyKCkge1xuICBjb25zdCBnbG9iYWxzID0gZ2V0R2xvYmFscygpO1xuICBjb25zdCBjdHggPSBnbG9iYWxzLmN0eDtcbiAgY29uc3QgYmFsbHMgPSBnbG9iYWxzLmJhbGxzO1xuICBjb25zdCBjYW52YXMgPSBnbG9iYWxzLmNhbnZhcztcbiAgXG4gIGlmICghY3R4IHx8ICFjYW52YXMpIHJldHVybjtcbiAgaWYgKGdsb2JhbFRoaXMuX19BQlNfUk9VVEVfUEVSRl9BVURJVF9fID09PSB0cnVlKSB7XG4gICAgY2FudmFzLl9fYWJzQXVkaXRGcmFtZUNvdW50ID0gKE51bWJlcihjYW52YXMuX19hYnNBdWRpdEZyYW1lQ291bnQpIHx8IDApICsgMTtcbiAgfVxuICBjb25zdCBpc1BpdE1vZGUgPSBpc1BpdExpa2VNb2RlKGdsb2JhbHMuY3VycmVudE1vZGUpO1xuICBjb25zdCByZW5kZXJTdGFydCA9IGlzUGl0TW9kZSA/IHBlcmZvcm1hbmNlLm5vdygpIDogMDtcbiAgbGV0IHBvc3RGeE1zID0gMDtcbiAgXG4gIC8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuICAvLyBMT0dPOiBVcGRhdGUgc2l6ZSAoZWFybHktZXhpdHMgaWYgbm8gY2hhbmdlcylcbiAgLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4gIGNvbnN0IGRwciA9IGdsb2JhbHMuRFBSIHx8IDE7XG4gIGNvbnN0IHF1YWxpdHlQcm9maWxlID0gZ2V0UmVuZGVyUXVhbGl0eVByb2ZpbGUoZ2xvYmFscyk7XG4gIGNvbnN0IHBpdEZ4VGhyb3R0bGVBd2FyZSA9IGlzUGl0TW9kZVxuICAgICYmIFN0cmluZyhnbG9iYWxzLnBpdEZ4VGhyb3R0bGVQb2xpY3kgfHwgJ3Rocm90dGxlLWF3YXJlJykgPT09ICd0aHJvdHRsZS1hd2FyZSdcbiAgICAmJiAoTnVtYmVyKGdsb2JhbHMuYWRhcHRpdmVUaHJvdHRsZUxldmVsKSB8fCAwKSA+PSAxO1xuICBjb25zdCBkcmF3Q3Vyc29yRXhwbG9zaW9uRW5hYmxlZCA9ICFwaXRGeFRocm90dGxlQXdhcmUgJiYgcXVhbGl0eVByb2ZpbGUuZHJhd0N1cnNvckV4cGxvc2lvbjtcbiAgY29uc3QgcGl0UmVuZGVyTG9kRW5hYmxlZCA9IGlzUGl0TW9kZSAmJiBnbG9iYWxzLnBpdFJlbmRlckxvZEVuYWJsZWQgIT09IGZhbHNlO1xuICBjb25zdCBjcml0dGVyc1JlbmRlckxvZEVuYWJsZWQgPSBnbG9iYWxzLmN1cnJlbnRNb2RlID09PSBNT0RFUy5DUklUVEVSU1xuICAgICYmIHF1YWxpdHlQcm9maWxlLnRpZXIgIT09ICdoaWdoJztcbiAgY29uc3Qgd2VhdmVSZW5kZXJMb2RFbmFibGVkID0gZ2xvYmFscy5jdXJyZW50TW9kZSA9PT0gTU9ERVMuV0VBVkVfRklFTEQ7XG4gIGNvbnN0IHNoYXBlc1JlbmRlckVuYWJsZWQgPSBnbG9iYWxzLmN1cnJlbnRNb2RlID09PSBNT0RFUy5TSEFQRVM7XG4gIGNvbnN0IG1vYmlsZUNpcmNsZUZhc3RQYXRoID0gQm9vbGVhbihnbG9iYWxzLmlzTW9iaWxlIHx8IGdsb2JhbHMuaXNNb2JpbGVWaWV3cG9ydClcbiAgICAmJiBOdW1iZXIoZ2xvYmFscy5wZWJibGVCbGVuZCA/PyAwKSA8PSAwLjAyO1xuICBsZXQgYmFsbFJlbmRlck9wdGlvbnMgPSBudWxsO1xuICBpZiAocGl0UmVuZGVyTG9kRW5hYmxlZCkge1xuICAgIGJhbGxSZW5kZXJPcHRpb25zID0ge1xuICAgICAgcGl0UmVuZGVyTG9kRW5hYmxlZCxcbiAgICAgIHBpdFRpbnlSYWRpdXNQeDogTWF0aC5tYXgoMC4yNSwgTnVtYmVyKGdsb2JhbHMucGl0UmVuZGVyTG9kVGlueVJhZGl1c1B4ID8/IDEuNCkgKiBkcHIpLFxuICAgICAgcGl0U3F1YXNoVGhyZXNob2xkOiBNYXRoLm1heCgwLCBNYXRoLm1pbigxLCBOdW1iZXIoZ2xvYmFscy5waXRSZW5kZXJMb2RTcXVhc2hUaHJlc2hvbGQgPz8gMC4wNikpKSxcbiAgICAgIGNhbnZhc1dpZHRoOiBjYW52YXMud2lkdGgsXG4gICAgICBjYW52YXNIZWlnaHQ6IGNhbnZhcy5oZWlnaHRcbiAgICB9O1xuICB9IGVsc2UgaWYgKGNyaXR0ZXJzUmVuZGVyTG9kRW5hYmxlZCB8fCB3ZWF2ZVJlbmRlckxvZEVuYWJsZWQgfHwgc2hhcGVzUmVuZGVyRW5hYmxlZCkge1xuICAgIGJhbGxSZW5kZXJPcHRpb25zID0ge1xuICAgICAgc2ltcGxlQ2lyY2xlQm9kaWVzOiB0cnVlLFxuICAgICAgY2FudmFzV2lkdGg6IGNhbnZhcy53aWR0aCxcbiAgICAgIGNhbnZhc0hlaWdodDogY2FudmFzLmhlaWdodFxuICAgIH07XG4gIH1cbiAgaWYgKG1vYmlsZUNpcmNsZUZhc3RQYXRoKSB7XG4gICAgYmFsbFJlbmRlck9wdGlvbnMgPSB7XG4gICAgICAuLi4oYmFsbFJlbmRlck9wdGlvbnMgfHwge30pLFxuICAgICAgc2ltcGxlQ2lyY2xlQm9kaWVzOiB0cnVlLFxuICAgICAgY2FudmFzV2lkdGg6IGNhbnZhcy53aWR0aCxcbiAgICAgIGNhbnZhc0hlaWdodDogY2FudmFzLmhlaWdodFxuICAgIH07XG4gIH1cbiAgZ2xvYmFscy5yZW5kZXJRdWFsaXR5VGllclJlc29sdmVkID0gcXVhbGl0eVByb2ZpbGUudGllcjtcbiAgXG4gIC8vIENsZWFyIGZyYW1lIChnaG9zdCB0cmFpbHMgcmVtb3ZlZCBwZXIgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uIHBsYW4pLlxuICAvLyBDU1Mgb24gI3NpbXVsYXRpb25zIG93bnMgdGhlIG9ubHkgdmlzdWFsIGNsaXAuXG4gIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcbiAgXG4gIC8vIERyYXcgd2F0ZXIgcmlwcGxlcyAoYmVoaW5kIGJhbGxzKVxuICBpZiAoZ2xvYmFscy5jdXJyZW50TW9kZSA9PT0gTU9ERVMuV0FURVIpIHtcbiAgICBkcmF3V2F0ZXJSaXBwbGVzKGN0eCk7XG4gIH1cbiAgXG4gIGNvbnN0IG1vZGVSZW5kZXJlciA9IGdldE1vZGVSZW5kZXJlcigpO1xuICBpZiAobW9kZVJlbmRlcmVyICYmIG1vZGVSZW5kZXJlci5wcmVSZW5kZXIpIHtcbiAgICBtb2RlUmVuZGVyZXIucHJlUmVuZGVyKGN0eCk7XG4gIH1cblxuICBjb25zdCBjdXN0b21SZW5kZXJlciA9IGdldE1vZGVDdXN0b21SZW5kZXJlcigpO1xuICBjb25zdCBkZXB0aFJlbmRlcmVyID0gZ2V0TW9kZURlcHRoUmVuZGVyZXIoKTtcbiAgY29uc3QgbmVlZHNEZXB0aFRpdGxlTGF5ZXIgPSAhY3VzdG9tUmVuZGVyZXIgJiYgbW9kZU5lZWRzRGVwdGhUaXRsZUxheWVyKGdsb2JhbHMuY3VycmVudE1vZGUpO1xuICBpZiAoXG4gICAgbmVlZHNEZXB0aFRpdGxlTGF5ZXIgJiZcbiAgICAoZ2xvYmFscy5jdXJyZW50TW9kZSA9PT0gTU9ERVMuU1BIRVJFXzNEIHx8IGdsb2JhbHMuY3VycmVudE1vZGUgPT09IE1PREVTLkNVQkVfM0QpXG4gICkge1xuICAgIGJhbGxSZW5kZXJPcHRpb25zID0ge1xuICAgICAgLi4uKGJhbGxSZW5kZXJPcHRpb25zIHx8IHt9KSxcbiAgICAgIHNpbXBsZUNpcmNsZUJvZGllczogdHJ1ZSxcbiAgICAgIGNhbnZhc1dpZHRoOiBjYW52YXMud2lkdGgsXG4gICAgICBjYW52YXNIZWlnaHQ6IGNhbnZhcy5oZWlnaHRcbiAgICB9O1xuICB9XG4gIGNvbnN0IGZyb250Q3R4ID0gbmVlZHNEZXB0aFRpdGxlTGF5ZXIgPyBzeW5jRGVwdGhUaXRsZUNhbnZhcyhnbG9iYWxzLCBjYW52YXMpIDogbnVsbDtcbiAgY29uc3QgZnJvbnRDYW52YXMgPSBnbG9iYWxzLmRlcHRoVGl0bGVGcm9udENhbnZhcztcbiAgc2V0RGVwdGhUaXRsZUxheWVyQWN0aXZlKGdsb2JhbHMsIEJvb2xlYW4obmVlZHNEZXB0aFRpdGxlTGF5ZXIgJiYgZnJvbnRDdHgpKTtcbiAgaWYgKGZyb250Q3R4ICYmIGZyb250Q2FudmFzKSB7XG4gICAgZnJvbnRDdHguY2xlYXJSZWN0KDAsIDAsIGZyb250Q2FudmFzLndpZHRoLCBmcm9udENhbnZhcy5oZWlnaHQpO1xuICB9XG5cbiAgaWYgKGN1c3RvbVJlbmRlcmVyKSB7XG4gICAgZHJhd0hvbWVwYWdlQ2FudmFzVGl0bGUoY3R4LCBnbG9iYWxzKTtcbiAgICBjdXN0b21SZW5kZXJlcihjdHgpO1xuICB9IGVsc2UgaWYgKG5lZWRzRGVwdGhUaXRsZUxheWVyICYmIGZyb250Q3R4ICYmIGRlcHRoUmVuZGVyZXIpIHtcbiAgICBkZXB0aFJlbmRlcmVyKGN0eCwge1xuICAgICAgbGF5ZXI6ICdiZWhpbmQnLFxuICAgICAgZGVwdGhQbGFuZTogVElUTEVfREVQVEhfUExBTkVfWixcbiAgICAgIGNhbnZhc1dpZHRoOiBjYW52YXMud2lkdGgsXG4gICAgICBjYW52YXNIZWlnaHQ6IGNhbnZhcy5oZWlnaHRcbiAgICB9KTtcblxuICAgIGRyYXdIb21lcGFnZUNhbnZhc1RpdGxlKGN0eCwgZ2xvYmFscyk7XG5cbiAgICBkZXB0aFJlbmRlcmVyKGZyb250Q3R4LCB7XG4gICAgICBsYXllcjogJ2Zyb250JyxcbiAgICAgIGRlcHRoUGxhbmU6IFRJVExFX0RFUFRIX1BMQU5FX1osXG4gICAgICBjYW52YXNXaWR0aDogY2FudmFzLndpZHRoLFxuICAgICAgY2FudmFzSGVpZ2h0OiBjYW52YXMuaGVpZ2h0XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAobmVlZHNEZXB0aFRpdGxlTGF5ZXIgJiYgZnJvbnRDdHgpIHtcbiAgICByZXNldFpQYXJ0aXRpb25DYWNoZSgpO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBiYWxscy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgYmFsbCA9IGJhbGxzW2ldO1xuICAgICAgY29uc3QgeiA9IGJhbGwueiA/PyAxO1xuICAgICAgaWYgKHogPCBUSVRMRV9ERVBUSF9QTEFORV9aKSB7XG4gICAgICAgIHpQYXJ0aXRpb25DYWNoZS5iZWhpbmQucHVzaChiYWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHpQYXJ0aXRpb25DYWNoZS5pbkZyb250LnB1c2goYmFsbCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHpQYXJ0aXRpb25DYWNoZS5iZWhpbmQubGVuZ3RoID4gMCkge1xuICAgICAgcmVuZGVyQmFsbHNDb2xvckJhdGNoZWQoY3R4LCB6UGFydGl0aW9uQ2FjaGUuYmVoaW5kLCB0cnVlLCBiYWxsUmVuZGVyT3B0aW9ucyk7XG4gICAgfVxuXG4gICAgZHJhd0hvbWVwYWdlQ2FudmFzVGl0bGUoY3R4LCBnbG9iYWxzKTtcblxuICAgIGlmICh6UGFydGl0aW9uQ2FjaGUuaW5Gcm9udC5sZW5ndGggPiAwKSB7XG4gICAgICByZW5kZXJCYWxsc0NvbG9yQmF0Y2hlZChmcm9udEN0eCwgelBhcnRpdGlvbkNhY2hlLmluRnJvbnQsIHRydWUsIGJhbGxSZW5kZXJPcHRpb25zKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZHJhd0hvbWVwYWdlQ2FudmFzVGl0bGUoY3R4LCBnbG9iYWxzKTtcbiAgICByZW5kZXJCYWxsc0NvbG9yQmF0Y2hlZChjdHgsIGJhbGxzLCBmYWxzZSwgYmFsbFJlbmRlck9wdGlvbnMpO1xuICB9XG5cbiAgaWYgKG1vZGVSZW5kZXJlciAmJiBtb2RlUmVuZGVyZXIucG9zdFJlbmRlcikge1xuICAgIG1vZGVSZW5kZXJlci5wb3N0UmVuZGVyKGN0eCk7XG4gIH1cbiAgXG4gIGNvbnN0IHBvc3RGeFN0YXJ0ID0gaXNQaXRNb2RlID8gcGVyZm9ybWFuY2Uubm93KCkgOiAwO1xuICBpZiAoZHJhd0N1cnNvckV4cGxvc2lvbkVuYWJsZWQpIGRyYXdDdXJzb3JFeHBsb3Npb24oY3R4KTtcblxuICAvLyBEcmF3IHJ1YmJlciB3YWxscyBMQVNUIChpbiBmcm9udCBvZiBiYWxscywgb3V0c2lkZSBjbGlwIHBhdGgpXG4gIGRyYXdXYWxscyhjdHgsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCwge1xuICAgIHdhbGxHcmFkaWVudFN0cm9rZUVuYWJsZWQ6IHF1YWxpdHlQcm9maWxlLndhbGxHcmFkaWVudFN0cm9rZUVuYWJsZWRcbiAgfSk7XG4gIGlmIChpc1BpdE1vZGUpIHtcbiAgICBwb3N0RnhNcyA9IHBlcmZvcm1hbmNlLm5vdygpIC0gcG9zdEZ4U3RhcnQ7XG4gICAgZmluYWxpemVQaXRQZXJmU2FtcGxlKGdsb2JhbHMsIHBlcmZvcm1hbmNlLm5vdygpIC0gcmVuZGVyU3RhcnQsIHBvc3RGeE1zKTtcbiAgfVxufVxuXG4vKipcbiAqIFJlbmRlciBiYWxscyB3aXRoIGNvbG9yIGJhdGNoaW5nIG9wdGltaXphdGlvblxuICogR3JvdXBzIGJhbGxzIGJ5IGNvbG9yIHRvIHJlZHVjZSBjdHguZmlsbFN0eWxlIGNoYW5nZXNcbiAqIEBwYXJhbSB7Q2FudmFzUmVuZGVyaW5nQ29udGV4dDJEfSBjdHhcbiAqIEBwYXJhbSB7QXJyYXl9IGJhbGxzVG9SZW5kZXIgLSBBcnJheSBvZiBCYWxsIG9iamVjdHNcbiAqL1xuZnVuY3Rpb24gcmVuZGVyQmFsbHNDb2xvckJhdGNoZWQoY3R4LCBiYWxsc1RvUmVuZGVyLCBhcHBseURlcHRoRm9nID0gZmFsc2UsIHJlbmRlck9wdGlvbnMgPSBudWxsKSB7XG4gIGlmICghYmFsbHNUb1JlbmRlciB8fCBiYWxsc1RvUmVuZGVyLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICBjb25zdCBnbG9iYWxzID0gZ2V0R2xvYmFscygpO1xuICBjb25zdCBwaXRMb2RFbmFibGVkID0gQm9vbGVhbihyZW5kZXJPcHRpb25zPy5waXRSZW5kZXJMb2RFbmFibGVkKTtcbiAgY29uc3QgdGlueVJhZGl1c1B4ID0gTnVtYmVyKHJlbmRlck9wdGlvbnM/LnBpdFRpbnlSYWRpdXNQeCkgfHwgMDtcbiAgY29uc3Qgc3F1YXNoVGhyZXNob2xkID0gcGl0TG9kRW5hYmxlZFxuICAgID8gTWF0aC5tYXgoMCwgTWF0aC5taW4oMSwgTnVtYmVyKHJlbmRlck9wdGlvbnM/LnBpdFNxdWFzaFRocmVzaG9sZCA/PyAwLjA2KSkpXG4gICAgOiAwLjAxO1xuICBjb25zdCBjYW52YXNXaWR0aCA9IE51bWJlcihyZW5kZXJPcHRpb25zPy5jYW52YXNXaWR0aCkgfHwgTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZO1xuICBjb25zdCBjYW52YXNIZWlnaHQgPSBOdW1iZXIocmVuZGVyT3B0aW9ucz8uY2FudmFzSGVpZ2h0KSB8fCBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFk7XG4gIGNvbnN0IGN1bGxQYWQgPSBwaXRMb2RFbmFibGVkID8gTWF0aC5tYXgoMSwgdGlueVJhZGl1c1B4KSA6IDA7XG4gIGNvbnN0IHNpbXBsZUNpcmNsZUJvZGllcyA9IEJvb2xlYW4ocmVuZGVyT3B0aW9ucz8uc2ltcGxlQ2lyY2xlQm9kaWVzKTtcbiAgXG4gIC8vIEdyb3VwIGJhbGxzIGJ5IGNvbG9yIChPKG4pIHBhc3MsIG1pbmltYWwgb3ZlcmhlYWQpXG4gIC8vIFBFUkY6IFJldXNlIGNhY2hlZCBNYXAgYW5kIGFycmF5cyB0byBlbGltaW5hdGUgcGVyLWZyYW1lIGFsbG9jYXRpb25zXG4gIHJlc2V0Q29sb3JCYXRjaENhY2hlKCk7XG4gIGNvbnN0IGJhbGxzQnlDb2xvciA9IGNvbG9yQmF0Y2hDYWNoZS5tYXA7XG4gIFxuICBmb3IgKGxldCBpID0gMDsgaSA8IGJhbGxzVG9SZW5kZXIubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBiYWxsID0gYmFsbHNUb1JlbmRlcltpXTtcbiAgICBjb25zdCBjb2xvciA9IGJhbGwuY29sb3I7XG4gICAgaWYgKCFiYWxsc0J5Q29sb3IuaGFzKGNvbG9yKSkge1xuICAgICAgYmFsbHNCeUNvbG9yLnNldChjb2xvciwgZ2V0Q29sb3JBcnJheSgpKTtcbiAgICB9XG4gICAgYmFsbHNCeUNvbG9yLmdldChjb2xvcikucHVzaChiYWxsKTtcbiAgfVxuICBcbiAgLy8gRHJhdyBpbiBiYXRjaGVzIChmYXIgZmV3ZXIgZmlsbFN0eWxlIHN0YXRlIGNoYW5nZXMpXG4gIGZvciAoY29uc3QgW2NvbG9yLCBncm91cF0gb2YgYmFsbHNCeUNvbG9yKSB7XG4gICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yO1xuXG4gICAgaWYgKHNpbXBsZUNpcmNsZUJvZGllcykge1xuICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgbGV0IGhhc09wYXF1ZUNpcmNsZXMgPSBmYWxzZTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZ3JvdXAubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgYmFsbCA9IGdyb3VwW2ldO1xuICAgICAgICBjb25zdCByYWRpdXMgPSBiYWxsLmdldERpc3BsYXlSYWRpdXMoKTtcbiAgICAgICAgaWYgKHJhZGl1cyA8PSAwLjA1KSBjb250aW51ZTtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIGJhbGwueCArIHJhZGl1cyA8IC1jdWxsUGFkIHx8XG4gICAgICAgICAgYmFsbC55ICsgcmFkaXVzIDwgLWN1bGxQYWQgfHxcbiAgICAgICAgICBiYWxsLnggLSByYWRpdXMgPiBjYW52YXNXaWR0aCArIGN1bGxQYWQgfHxcbiAgICAgICAgICBiYWxsLnkgLSByYWRpdXMgPiBjYW52YXNIZWlnaHQgKyBjdWxsUGFkXG4gICAgICAgICkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGZpbHRlck9wYWNpdHkgPSBiYWxsLmZpbHRlck9wYWNpdHkgPz8gMTtcbiAgICAgICAgbGV0IGVmZmVjdGl2ZUFscGhhID0gKGJhbGwuYWxwaGEgPz8gMSkgKiBmaWx0ZXJPcGFjaXR5O1xuICAgICAgICBpZiAoYXBwbHlEZXB0aEZvZykge1xuICAgICAgICAgIGVmZmVjdGl2ZUFscGhhICo9IGdldERlcHRoRm9nT3BhY2l0eShiYWxsLnogPz8gMSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVmZmVjdGl2ZUFscGhhIDw9IDAuMDAxKSBjb250aW51ZTtcbiAgICAgICAgaWYgKGVmZmVjdGl2ZUFscGhhIDwgMC45OTkpIHtcbiAgICAgICAgICBjdHguc2F2ZSgpO1xuICAgICAgICAgIGN0eC5nbG9iYWxBbHBoYSA9IGVmZmVjdGl2ZUFscGhhO1xuICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgICBjdHgubW92ZVRvKGJhbGwueCArIHJhZGl1cywgYmFsbC55KTtcbiAgICAgICAgICBjdHguYXJjKGJhbGwueCwgYmFsbC55LCByYWRpdXMsIDAsIE1hdGguUEkgKiAyKTtcbiAgICAgICAgICBjdHguZmlsbCgpO1xuICAgICAgICAgIGN0eC5yZXN0b3JlKCk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY3R4Lm1vdmVUbyhiYWxsLnggKyByYWRpdXMsIGJhbGwueSk7XG4gICAgICAgIGN0eC5hcmMoYmFsbC54LCBiYWxsLnksIHJhZGl1cywgMCwgTWF0aC5QSSAqIDIpO1xuICAgICAgICBoYXNPcGFxdWVDaXJjbGVzID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmIChoYXNPcGFxdWVDaXJjbGVzKSB7XG4gICAgICAgIGN0eC5maWxsKCk7XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBncm91cC5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgYmFsbCA9IGdyb3VwW2ldO1xuICAgICAgY29uc3QgcmFkaXVzID0gYmFsbC5nZXREaXNwbGF5UmFkaXVzKCk7XG4gICAgICBpZiAocmFkaXVzIDw9IDAuMDUpIGNvbnRpbnVlO1xuICAgICAgaWYgKFxuICAgICAgICBiYWxsLnggKyByYWRpdXMgPCAtY3VsbFBhZCB8fFxuICAgICAgICBiYWxsLnkgKyByYWRpdXMgPCAtY3VsbFBhZCB8fFxuICAgICAgICBiYWxsLnggLSByYWRpdXMgPiBjYW52YXNXaWR0aCArIGN1bGxQYWQgfHxcbiAgICAgICAgYmFsbC55IC0gcmFkaXVzID4gY2FudmFzSGVpZ2h0ICsgY3VsbFBhZFxuICAgICAgKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBIYW5kbGUgc3BlY2lhbCByZW5kZXJpbmcgY2FzZXMgKHNxdWFzaCwgYWxwaGEsIGZpbHRlcmluZylcbiAgICAgIGNvbnN0IGhhc1NxdWFzaCA9IGJhbGwuc3F1YXNoQW1vdW50ID4gc3F1YXNoVGhyZXNob2xkO1xuICAgICAgY29uc3QgZmlsdGVyT3BhY2l0eSA9IGJhbGwuZmlsdGVyT3BhY2l0eSA/PyAxO1xuICAgICAgbGV0IGVmZmVjdGl2ZUFscGhhID0gYmFsbC5hbHBoYSAqIGZpbHRlck9wYWNpdHk7XG4gICAgICBpZiAoYXBwbHlEZXB0aEZvZykge1xuICAgICAgICBlZmZlY3RpdmVBbHBoYSAqPSBnZXREZXB0aEZvZ09wYWNpdHkoYmFsbC56ID8/IDEpO1xuICAgICAgfVxuICAgICAgXG4gICAgICBjb25zdCBoYXNBbHBoYSA9IGVmZmVjdGl2ZUFscGhhIDwgMS4wO1xuICAgICAgaWYgKHBpdExvZEVuYWJsZWQgJiYgIWhhc1NxdWFzaCAmJiAhaGFzQWxwaGEgJiYgcmFkaXVzIDw9IHRpbnlSYWRpdXNQeCkge1xuICAgICAgICBjdHguZmlsbFJlY3QoTWF0aC5yb3VuZChiYWxsLngpLCBNYXRoLnJvdW5kKGJhbGwueSksIDEsIDEpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKGhhc1NxdWFzaCB8fCBoYXNBbHBoYSkge1xuICAgICAgICAvLyBDb21wbGV4IGNhc2U6IHVzZSBzYXZlL3Jlc3RvcmUgZm9yIGFscGhhIGFuZCB0cmFuc2Zvcm1zXG4gICAgICAgIGN0eC5zYXZlKCk7XG4gICAgICAgIGN0eC5nbG9iYWxBbHBoYSA9IGVmZmVjdGl2ZUFscGhhO1xuICAgICAgICBcbiAgICAgICAgaWYgKGhhc1NxdWFzaCkge1xuICAgICAgICAgIC8vIFVzZSBleGlzdGluZyBCYWxsLmRyYXcoKSBmb3Igc3F1YXNoIChpdCBoYW5kbGVzIHRyYW5zZm9ybXMpXG4gICAgICAgICAgLy8gQnV0IHdlJ3ZlIGFscmVhZHkgc2V0IGdsb2JhbEFscGhhLCBzbyB0ZW1wb3JhcmlseSBvdmVycmlkZVxuICAgICAgICAgIGNvbnN0IG9yaWdpbmFsQWxwaGEgPSBiYWxsLmFscGhhO1xuICAgICAgICAgIGNvbnN0IG9yaWdpbmFsRmlsdGVyT3BhY2l0eSA9IGJhbGwuZmlsdGVyT3BhY2l0eTtcbiAgICAgICAgICBiYWxsLmFscGhhID0gMS4wOyAvLyBQcmV2ZW50IGRvdWJsZS1hcHBseWluZyBhbHBoYVxuICAgICAgICAgIGJhbGwuZmlsdGVyT3BhY2l0eSA9IDEuMDtcbiAgICAgICAgICBiYWxsLmRyYXcoY3R4KTtcbiAgICAgICAgICBiYWxsLmFscGhhID0gb3JpZ2luYWxBbHBoYTtcbiAgICAgICAgICBiYWxsLmZpbHRlck9wYWNpdHkgPSBvcmlnaW5hbEZpbHRlck9wYWNpdHk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gU2ltcGxlIGFscGhhIGNhc2U6IGRyYXcgdGhlIHBlYmJsZSBzaWxob3VldHRlIHdpdGggYWxwaGEuXG4gICAgICAgICAgY3R4LnRyYW5zbGF0ZShiYWxsLngsIGJhbGwueSk7XG4gICAgICAgICAgY29uc3Qgcm90YXRpb25SYWQgPSBnZXRQZWJibGVCb2R5Um90YXRpb24oYmFsbCk7XG4gICAgICAgICAgaWYgKHJvdGF0aW9uUmFkICE9PSAwKSBjdHgucm90YXRlKHJvdGF0aW9uUmFkKTtcbiAgICAgICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICAgICAgYXBwZW5kUGViYmxlQm9keVBhdGgoY3R4LCBiYWxsLCByYWRpdXMsIGdsb2JhbHMpO1xuICAgICAgICAgIGN0eC5maWxsKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGN0eC5yZXN0b3JlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBGYXN0IHBhdGg6IHBlYmJsZSBmaWxsIHdpdGggc2hhcmVkIGJhdGNoIGNvbG9yLlxuICAgICAgICBjdHguc2F2ZSgpO1xuICAgICAgICBjdHgudHJhbnNsYXRlKGJhbGwueCwgYmFsbC55KTtcbiAgICAgICAgY29uc3Qgcm90YXRpb25SYWQgPSBnZXRQZWJibGVCb2R5Um90YXRpb24oYmFsbCk7XG4gICAgICAgIGlmIChyb3RhdGlvblJhZCAhPT0gMCkgY3R4LnJvdGF0ZShyb3RhdGlvblJhZCk7XG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgYXBwZW5kUGViYmxlQm9keVBhdGgoY3R4LCBiYWxsLCByYWRpdXMsIGdsb2JhbHMpO1xuICAgICAgICBjdHguZmlsbCgpO1xuICAgICAgICBjdHgucmVzdG9yZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG59XG5cbi8qKlxuICogU3luYyBjaHJvbWUgY29sb3IgZnJvbSBDU1MgKGNhbGwgb24gdGhlbWUgY2hhbmdlKVxuICovXG5leHBvcnQgZnVuY3Rpb24gc3luY0Nocm9tZUNvbG9yKCkge1xuICB1cGRhdGVDaHJvbWVDb2xvcigpO1xufVxuXG4vKipcbiAqIEdldCB0aGUgY3VycmVudCBiYWxscyBhcnJheSAoZm9yIHNvdW5kIHN5c3RlbSBldGMuKVxuICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiBCYWxsIG9iamVjdHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEJhbGxzKCkge1xuICBjb25zdCBnbG9iYWxzID0gZ2V0R2xvYmFscygpO1xuICByZXR1cm4gZ2xvYmFscy5iYWxscyB8fCBbXTtcbn1cblxuZnVuY3Rpb24gZHJhd1dhdGVyUmlwcGxlcyhjdHgpIHtcbiAgLy8gVmlzdWFsIHJpcHBsZSByZW5kZXJpbmcgaW50ZW50aW9uYWxseSBkaXNhYmxlZCAoaW52aXNpYmxlIHJpcHBsZXMpLlxuICAvLyBQaHlzaWNzIHJpcHBsZXMgYXJlIHN0aWxsIGFwcGxpZWQgaW5zaWRlIHRoZSBXYXRlciBtb2RlIGZvcmNlIGhvb2suXG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENB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S0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakQsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNyRDs7QUFFQSxRQUFRLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3BDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQy9ELENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25ELENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ2pHLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztBQUN0Qjs7QUFFQSxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQy9ELENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUM1RCxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU07QUFDN0I7O0FBRUEsUUFBUSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSTtBQUMzQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUNmLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7QUFDeEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDdEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7QUFDdEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7QUFDdEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ2YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsWUFBWTtBQUM3Qjs7QUFFQSxRQUFRLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDNUQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUM7QUFDeEMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUk7QUFDekIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMscUJBQXFCO0FBQy9ELENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFM0gsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDMUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO0FBQ3RELENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQztBQUMxRCxDQUFDLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUM1QyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUM1QyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUM7QUFDMUQsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO0FBQ3RELENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUM7O0FBRXRFLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM3RCxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFckYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ25ELENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ3ZELENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ2pELENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ2pELENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ3ZELENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUM7QUFDeEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUM7QUFDeEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQztBQUMvQixDQUFDLENBQUMsQ0FBQzs7QUFFSCxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTztBQUN6QixDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsT0FBTztBQUNsQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU87QUFDaEI7O0FBRUEsUUFBUSxDQUFDLDZCQUE2QixDQUFDLE9BQU8sQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ2hFLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxXQUFXO0FBQ25DLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjOztBQUVqRCxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMseUJBQXlCLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO0FBQy9JLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDOztBQUV6RixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDO0FBQ25HLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2pFLENBQUMsQ0FBQzs7QUFFRixDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6RyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25FLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVsRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLGtCQUFrQixDQUFDO0FBQ3BELENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDNUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQy9EOztBQUVBLFFBQVEsQ0FBQyxrQ0FBa0MsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNsRCxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM3QixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQ3RDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU07QUFDekI7O0FBRUEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztBQUNsRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxQixLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDbEUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCO0FBQ3ZDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUNsRyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO0FBQ3hFLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7QUFDZixDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUNuQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDdkIsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ2YsQ0FBQzs7QUFFRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztBQUNyRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO0FBQ3hCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDaEIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNaLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNkLENBQUM7O0FBRUQsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7QUFDekIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDbEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0FBQ3BFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHO0FBQ2QsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuQixDQUFDLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO0FBQ3JDLENBQUMsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDOUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNO0FBQ2Y7O0FBRUEsUUFBUSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztBQUNoQyxDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUM3QixDQUFDLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoQzs7QUFFQSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztBQUNqRixRQUFRLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMxRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyQyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTO0FBQzNDLENBQUM7QUFDRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFVBQVU7QUFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDbkIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWE7QUFDakMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWE7QUFDakMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDNUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztBQUM5QixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWTtBQUNyRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUMzQyxDQUFDLENBQUM7QUFDRixDQUFDO0FBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDbkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQztBQUN6QyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhO0FBQzdCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDeEIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztBQUM5QixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWTtBQUNyRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUMzQyxDQUFDLENBQUM7QUFDRixDQUFDO0FBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPO0FBQ3BGLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNO0FBQ3BCLENBQUM7QUFDRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUN0QixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhO0FBQzdCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUM7QUFDekMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUN4QixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZO0FBQ3JELENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzNDLENBQUMsQ0FBQztBQUNGLENBQUM7QUFDRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUN0QixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUM7QUFDekMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUN4QixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZO0FBQ3JELENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzNDLENBQUMsQ0FBQztBQUNGOztBQUVBLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUMzRCxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDOUIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLO0FBQzdCLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTTtBQUMvQixDQUFDO0FBQ0QsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTTs7QUFFckIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFN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LEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVKLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDdkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQztBQUNyRSxDQUFDLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0RSxDQUFDLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLHNCQUFzQixDQUFDOztBQUVuRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTTtBQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FB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LElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUM7QUFDcEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVztBQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUNyQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDN0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyw0QkFBNEIsQ0FBQyxPQUFPO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUM3QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDNUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTTtBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO0FBQ3ZFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsZUFBZTtBQUNoRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0I7QUFDbkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUs7QUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU07QUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUTtBQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTTtBQUN6RixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLFFBQVE7O0FBRTFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDOUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDM0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU07QUFDM0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLGtCQUFrQixDQUFDO0FBQzdFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFSixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYTtBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztBQUNqRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSTtBQUNuRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCO0FBQ3RILENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDO0FBQy9ELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFUixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU07QUFDOUYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO0FBQ25GLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQztBQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDdkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsNEJBQTRCLENBQUMsT0FBTztBQUNoRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSTtBQUN4RixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU07QUFDckMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLO0FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTTtBQUNyQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsUUFBUTtBQUMxQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU87QUFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTztBQUNuQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ2QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZTtBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7QUFDdEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVSLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJO0FBQ3JELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLDRCQUE0QixDQUFDLE9BQU87QUFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUN0RyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQ3pDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU87QUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUNwRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDNUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztBQUNqRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7QUFDbEcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztBQUM3RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUN4RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxRQUFRO0FBQzFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDbkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUI7QUFDN0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN0RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQ3ZFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUN0RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ3JELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxtQkFBbUI7QUFDcEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDcEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUM7QUFDaEgsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDWixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzdGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDM0csQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUNyQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDcEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNqQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRUosQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJO0FBQ2hGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTO0FBQ2hHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDcEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU87QUFDN0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQztBQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDckMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQzFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDMUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQzs7QUFFNUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztBQUM3RixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUM7QUFDeEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7O0FBRTdHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU07QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM3QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxRQUFRO0FBQzVDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNYLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7QUFDekUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3JDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRO0FBQ3RCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVaLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztBQUNoRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUNyRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDOUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMzRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUM7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMs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QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxPQUFPO0FBQ2pELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuRixDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUM7QUFDekQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxD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L0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVOLENBQUMsQ0FBQyxDQUFDLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDOztBQUV6QyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNwQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxtQkFBbUI7QUFDckMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUs7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDOztBQUUxQixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMs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QUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRO0FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDWCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNuRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYTtBQUM5RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUTtBQUM3QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxjQUFjO0FBQzFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNwQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVE7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUk7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRO0FBQ2QsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMs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QUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVE7QUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztBQUN4RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxjQUFjO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVU7QUFDdkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUM7QUFDL0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSztBQUMxQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWE7QUFDMUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7QUFDdkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsYUFBYTtBQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLHFCQUFxQjtBQUNwRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNmLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUs7QUFDckUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDO0FBQ3pELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUM7QUFDeEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDMUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNiLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLO0FBQ3pELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDckMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQztBQUN2RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUM7QUFDdEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ3hELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUM7O0FBRUY7O0FBRUEsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU07QUFDbkQsQ0FBQyxDQUFDO0FBQ0YsTUFBTSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO0FBQ2xDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQ3JCOztBQUVBLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQztBQUNsQyxDQUFDLENBQUM7QUFDRixNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDM0IsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUI7O0FBRUEsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQztBQUN2RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUk7QUFDdkU7In0=