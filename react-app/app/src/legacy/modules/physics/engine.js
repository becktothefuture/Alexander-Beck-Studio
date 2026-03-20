// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      PHYSICS ENGINE (COMPLETE)                               ║
// ║           Fixed-timestep with collision detection                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { CONSTANTS, MODES, isPitLikeMode } from '../core/constants.js';
import { getGlobals } from '../core/state.js';
import { resolveCollisions, resolveCollisionsCustom } from './collision.js';
import { drawWalls, updateChromeColor } from './wall-state.js';
import { drawDepthWash } from '../visual/depth-wash.js';
import {
  getModeUpdater,
  getModeRenderer,
  getModeCustomRenderer,
  getModeBoundsHandler
} from '../modes/mode-controller.js';
import { updateCursorExplosion, drawCursorExplosion } from '../visual/cursor-explosion.js';
import { getRenderQualityProfile } from '../utils/render-quality.js';
import { 
  getAccumulator, 
  setAccumulator, 
  addToAccumulator, 
  subtractFromAccumulator,
  resetPhysicsAccumulator 
} from './accumulator.js';
import {
  initCanvasLogo,
  updateLogoSize,
  drawLogo,
  updateLogoEntrance,
  isCanvasLogoReady
} from '../rendering/canvas-logo.js';

// Re-export for backwards compatibility
export { resetPhysicsAccumulator };

const DT_DESKTOP = CONSTANTS.PHYSICS_DT;

// ═══════════════════════════════════════════════════════════════════════════════
// LOGO Z-DEPTH CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
const LOGO_Z = 0.5; // Logo renders at z=0.5 (middle of depth range)

// Depth fog settings for z-partitioned modes
// Balls further back (z closer to 0) fade out more
// Note: This is additive to any mode-specific fog (e.g., 3D cube's own fog)
// Keep subtle to avoid over-darkening
const DEPTH_FOG_MIN_OPACITY = 0.3;   // Minimum opacity for balls at z=0 (furthest back)
const DEPTH_FOG_START_Z = 0.75;      // Z value where fog starts fading (balls above this are fully opaque)

// Modes that render ALL balls on top of logo (no z-partitioning needed)
// Category A: Simple particle simulations
const MODES_ALWAYS_ON_TOP = new Set([
  MODES.PIT,
  MODES.PORTFOLIO_PIT,
  MODES.FLIES,
  MODES.WEIGHTLESS,
  MODES.CRITTERS,
  MODES.MAGNETIC,
  MODES.ELASTIC_CENTER,
  MODES.WATER,
  MODES.KALEIDOSCOPE,
  MODES.DVD_LOGO,
  MODES.SHOOTING_STARS
]);

/**
 * Calculate depth fog opacity multiplier based on z-depth
 * Efficient linear interpolation - no expensive calculations
 * z=0 (back) → DEPTH_FOG_MIN_OPACITY (30% opacity)
 * z>=DEPTH_FOG_START_Z (front) → 1.0 (100% opacity)
 * Linear interpolation between
 * @param {number} z - Z-depth value (0-1)
 * @returns {number} Opacity multiplier (0-1)
 */
function getDepthFogOpacity(z) {
  if (z >= DEPTH_FOG_START_Z) return 1.0;
  // Linear fade from MIN_OPACITY at z=0 to 1.0 at z=DEPTH_FOG_START_Z
  // This is just: minOpacity + (z / startZ) * (1 - minOpacity)
  // Very cheap calculation - no conditionals, no expensive math
  const t = z / DEPTH_FOG_START_Z;
  return DEPTH_FOG_MIN_OPACITY + t * (1.0 - DEPTH_FOG_MIN_OPACITY);
}

/**
 * Check if current mode needs z-partitioning for logo rendering
 * Returns false for Category A modes (balls always on top)
 * Returns true for Category B/C/D modes (spatial/3D)
 */
function modeNeedsZPartitioning(mode) {
  return !MODES_ALWAYS_ON_TOP.has(mode);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGO Z-PARTITION CACHE (avoid per-frame allocations)
// ═══════════════════════════════════════════════════════════════════════════════
const zPartitionCache = {
  behind: [],
  inFront: []
};

function resetZPartitionCache() {
  zPartitionCache.behind.length = 0;
  zPartitionCache.inFront.length = 0;
}
const DT_MOBILE = CONSTANTS.PHYSICS_DT_MOBILE;
const CORNER_RADIUS = 42; // matches rounded container corners
const CORNER_FORCE = 1800;
const WARMUP_FRAME_DT = 1 / 60;
const PIT_PERF_WINDOW = 120;
const EMPTY_COLLISION_STATS = Object.freeze({
  pairCount: 0,
  overlapDebt: 0,
  sleepingPairSkips: 0
});

function clampNumber(value, min, max, fallback) {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  if (next < min) return min;
  if (next > max) return max;
  return next;
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

// ════════════════════════════════════════════════════════════════════════════════
// PERF: Preallocated options objects to avoid per-loop/per-frame allocations
// ════════════════════════════════════════════════════════════════════════════════
const WALL_EFFECTS_ON = {};
const WALL_EFFECTS_OFF = Object.freeze({ registerEffects: false });
const PIT_CLAMP_OPTS = WALL_EFFECTS_OFF;
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

  // Select physics timestep based on device type (60Hz mobile, 120Hz desktop)
  const DT = (globals.isMobile || globals.isMobileViewport) ? DT_MOBILE : DT_DESKTOP;

  // Kaleidoscope mode has its own lightweight physics path:
  // - Smooth (per-frame), not fixed-timestep accumulator
  // - Collisions on (prevents overlap)
  // - NO rubber wall deformation / impacts
  // - Simple bounds handling (no corner repellers, no wall wobble)
  if (globals.currentMode === MODES.KALEIDOSCOPE) {
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

  // Wall input accumulation:
  
  while (getAccumulator() >= DT && physicsSteps < CONSTANTS.MAX_PHYSICS_STEPS) {
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
    if (globals.currentMode === MODES.KALEIDOSCOPE) {
      collisionStats = resolveCollisions(6) || EMPTY_COLLISION_STATS; // handled by kaleidoscope early-return, kept for safety
    } else if (globals.currentMode !== MODES.FLIES &&
               globals.currentMode !== MODES.SPHERE_3D &&
               globals.currentMode !== MODES.CUBE_3D &&
               globals.currentMode !== MODES.PARALLAX_LINEAR &&
               globals.currentMode !== MODES.PARALLAX_FLOAT &&
               globals.currentMode !== MODES.STARFIELD_3D &&
               globals.currentMode !== MODES.DVD_LOGO) {
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
        mode !== MODES.PARALLAX_LINEAR &&
        mode !== MODES.PARALLAX_FLOAT &&
        mode !== MODES.STARFIELD_3D) {
      const wallRestitution = (mode === MODES.WEIGHTLESS) ? globals.weightlessBounce : globals.REST;
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

        // Ball Pit has explicit rounded-corner arc clamping in Ball.walls().
        // Avoid an additional velocity-based corner repeller there, which can
        // create local compressions in dense corner stacks.
        if (!isPitLike) applyCornerRepellers(ball, canvasW, canvasH, DT, isMobile);
        ball.walls(canvasW, canvasH, DT, wallRestitution, wallEffectsOptions);
      }
    }

    // Ball Pit stabilization:
    // Wall/corner clamping can re-introduce overlaps in dense stacks (especially near the floor).
    // Run a small post-wall collision pass for Pit-like modes only.
    if (isPitLikeMode(mode)) {
      const overlapThreshold = Math.max(0, Number(globals.pitPostPassOverlapThreshold ?? 0));
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
        const wallRestitution = globals.REST;
        const lenClamp = balls.length;
        const canvasW = canvas.width;
        const canvasH = canvas.height;
        for (let i = 0; i < lenClamp; i++) {
          const b = balls[i];
          if (b?.isPointerLocked) continue;
          b.walls(canvasW, canvasH, DT, wallRestitution, PIT_CLAMP_OPTS);
        }

        // ════════════════════════════════════════════════════════════════════════
        // POST-PHYSICS STABILIZATION (Pit modes only)
        // ════════════════════════════════════════════════════════════════════════
        const DPR = globals.DPR || 1;
        const vThresh = (Number.isFinite(globals.sleepVelocityThreshold) ? globals.sleepVelocityThreshold : 12.0) * DPR;
        const vThreshSq = vThresh * vThresh;
        const tinySpeedSq = (2 * DPR) * (2 * DPR);
        const wThresh = Number.isFinite(globals.sleepAngularThreshold) ? globals.sleepAngularThreshold : 0.18;
        const tSleep = globals.timeToSleep ?? 0.25;
        
        for (let i = 0; i < lenClamp; i++) {
          const b = balls[i];
          if (!b || b.isSleeping) continue;
          const speedSq = b.vx * b.vx + b.vy * b.vy;
          const angSpeed = Math.abs(b.omega);
          const isSettled = b.isGrounded || b.hasSupport;
          if (isSettled && speedSq < vThreshSq && angSpeed < wThresh) {
            b.vx *= 0.5;
            b.vy *= 0.5;
            b.omega *= 0.5;
            if (speedSq < tinySpeedSq) {
              b.vx = 0;
              b.vy = 0;
            }
            if (angSpeed < 0.02) {
              b.omega = 0;
            }
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

    // Global sleep (non-pit physics modes):
    // If enabled, allow truly-stationary balls to sleep to reduce per-ball work.
    // Uses physicsSleepThreshold/physicsSleepTime (DPR-scaled) and the shared angular threshold.
    if (globals.physicsSkipSleepingSteps !== false) {
      // PERF: Reuse mode variable from wall collision block (already hoisted)
      const eligible =
        mode !== MODES.FLIES &&
        mode !== MODES.SPHERE_3D &&
        mode !== MODES.CUBE_3D &&
        mode !== MODES.PARALLAX_LINEAR &&
        mode !== MODES.PARALLAX_FLOAT &&
        mode !== MODES.KALEIDOSCOPE &&
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
  if (getAccumulator() > DT * CONSTANTS.ACCUMULATOR_RESET_THRESHOLD) {
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

export async function updatePhysics(dtSeconds, applyForcesFunc) {
  const globals = getGlobals();
  const canvas = globals.canvas;
  const balls = globals.balls;

  // Keep entrance/micro FX progressing even in modes that intentionally use 0 balls
  // (e.g. starfield custom renderer). Otherwise logo entrance can get stuck at opacity 0.
  updateLogoEntrance(dtSeconds);
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
  const pitRenderOptions = pitRenderLodEnabled
    ? {
        pitRenderLodEnabled,
        pitTinyRadiusPx: Math.max(0.25, Number(globals.pitRenderLodTinyRadiusPx ?? 1.4) * dpr),
        pitSquashThreshold: Math.max(0, Math.min(1, Number(globals.pitRenderLodSquashThreshold ?? 0.06))),
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
      }
    : null;
  globals.renderQualityTierResolved = qualityProfile.tier;
  updateLogoSize(canvas.width, canvas.height, dpr);
  
  // Clear frame (ghost trails removed per performance optimization plan)
  // Clear BEFORE applying clip so the corners never accumulate stale pixels.
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ══════════════════════════════════════════════════════════════════════════════
  // OPTIMIZATION #5: Skip clip when corner radius is 0 (save/restore is expensive)
  // ══════════════════════════════════════════════════════════════════════════════
  const clipPath = globals.canvasClipPath;
  const cornerRadius = globals.cornerRadius ?? globals.wallRadius ?? 0;
  const needsClip = clipPath && cornerRadius > 0;
  
  if (needsClip) {
    ctx.save();
    try { ctx.clip(clipPath); } catch (e) {}
  }
  
  // Draw water ripples (behind balls)
  if (globals.currentMode === MODES.WATER) {
    drawWaterRipples(ctx);
  }
  
  const modeRenderer = getModeRenderer();
  if (modeRenderer && modeRenderer.preRender) {
    modeRenderer.preRender(ctx);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // LOGO + BALLS RENDERING WITH Z-DEPTH
  // 
  // Category A modes (particle sims): Logo first, then all balls on top
  // Category B/C/D modes (spatial/3D): Partition balls by z, draw behind → logo → front
  // ═══════════════════════════════════════════════════════════════════════════════
  const needsZPartition = modeNeedsZPartitioning(globals.currentMode);
  const logoReady = isCanvasLogoReady();
  
  const customRenderer = getModeCustomRenderer();
  const skipCanvasLogo = globals.currentMode === MODES.PORTFOLIO_PIT;
  if (customRenderer) {
    if (logoReady && !needsZPartition && !skipCanvasLogo) {
      drawLogo(ctx, canvas.width, canvas.height);
    }
    customRenderer(ctx);
  } else if (!needsZPartition) {
    // ═══════════════════════════════════════════════════════════════════════════
    // CATEGORY A: All balls render ON TOP of logo (no z-partitioning)
    // ═══════════════════════════════════════════════════════════════════════════
    if (logoReady) {
      drawLogo(ctx, canvas.width, canvas.height);
    }
    
    // Draw all balls (color-batched for performance)
    renderBallsColorBatched(ctx, balls, false, pitRenderOptions);
    
  } else {
    // ═══════════════════════════════════════════════════════════════════════════
    // CATEGORY B/C/D: Partition balls by z-depth
    // Balls with z < 0.5 render behind logo, z >= 0.5 render in front
    // ═══════════════════════════════════════════════════════════════════════════
    resetZPartitionCache();
    
    for (let i = 0; i < balls.length; i++) {
      const ball = balls[i];
      const z = ball.z ?? 1.0; // Default to front if z not set
      if (z < LOGO_Z) {
        zPartitionCache.behind.push(ball);
      } else {
        zPartitionCache.inFront.push(ball);
      }
    }
    
    // Draw balls behind logo (with depth fog for atmospheric effect)
    if (zPartitionCache.behind.length > 0) {
      renderBallsColorBatched(ctx, zPartitionCache.behind, true, pitRenderOptions); // Apply depth fog
    }
    
    // Draw logo
    if (logoReady) {
      drawLogo(ctx, canvas.width, canvas.height);
    }
    
    // Draw balls in front of logo (also apply depth fog for consistent effect)
    if (zPartitionCache.inFront.length > 0) {
      renderBallsColorBatched(ctx, zPartitionCache.inFront, true, pitRenderOptions); // Apply depth fog
    }
  }

  if (modeRenderer && modeRenderer.postRender) {
    modeRenderer.postRender(ctx);
  }
  
  // Restore clip BEFORE drawing walls (walls extend beyond canvas edges)
  if (needsClip) {
    ctx.restore();
  }
  
  const postFxStart = isPitMode ? performance.now() : 0;
  if (drawCursorExplosionEnabled) drawCursorExplosion(ctx);

  // Depth wash: gradient overlay between balls/trail and wall
  drawDepthWash(ctx, canvas.width, canvas.height, {
    opacityScale: qualityProfile.depthWashOpacityScale
  });
  
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
 * @param {boolean} applyDepthFog - Whether to apply z-depth fog (for balls behind logo)
 */
function renderBallsColorBatched(ctx, ballsToRender, applyDepthFog = false, renderOptions = null) {
  if (!ballsToRender || ballsToRender.length === 0) return;
  const pitLodEnabled = Boolean(renderOptions?.pitRenderLodEnabled);
  const tinyRadiusPx = Number(renderOptions?.pitTinyRadiusPx) || 0;
  const squashThreshold = pitLodEnabled
    ? Math.max(0, Math.min(1, Number(renderOptions?.pitSquashThreshold ?? 0.06)))
    : 0.01;
  const canvasWidth = Number(renderOptions?.canvasWidth) || Number.POSITIVE_INFINITY;
  const canvasHeight = Number(renderOptions?.canvasHeight) || Number.POSITIVE_INFINITY;
  const cullPad = pitLodEnabled ? Math.max(1, tinyRadiusPx) : 0;
  
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
    
    for (let i = 0; i < group.length; i++) {
      const ball = group[i];
      const radius = ball.getDisplayRadius();
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
      
      // Apply depth fog for balls behind logo (more transparent when further back)
      if (applyDepthFog) {
        const fogOpacity = getDepthFogOpacity(ball.z ?? 1.0);
        effectiveAlpha *= fogOpacity;
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
          ball.alpha = 1.0; // Prevent double-applying alpha
          ball.draw(ctx);
          ball.alpha = originalAlpha;
        } else {
          // Simple alpha case: just draw circle with alpha
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.restore();
      } else {
        // Fast path: simple circle (no transforms, no save/restore)
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, radius, 0, Math.PI * 2);
        ctx.fill();
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
