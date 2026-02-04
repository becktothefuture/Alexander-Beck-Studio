// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      PHYSICS ENGINE (COMPLETE)                               ║
// ║           Fixed-timestep with collision detection                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { CONSTANTS, MODES } from '../core/constants.js';
import { getGlobals } from '../core/state.js';
import { resolveCollisions, resolveCollisionsCustom } from './collision.js';
import { updateWaterRipples, getWaterRipples } from '../modes/water.js';
import { drawWalls, updateChromeColor } from './wall-state.js';
import { drawDepthWash } from '../visual/depth-wash.js';
import { getModeUpdater, getModeRenderer } from '../modes/mode-controller.js';
import { renderKaleidoscope } from '../modes/kaleidoscope.js';
import { applyKaleidoscopeBounds } from '../modes/kaleidoscope.js';
import { drawMouseTrail } from '../visual/mouse-trail.js';
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
      applyKaleidoscopeBounds(balls[i], canvas.width, canvas.height, dt);
    }

    setAccumulator(0);
    return;
  }
  
  addToAccumulator(dtSeconds);
  let physicsSteps = 0;

  // Wall input accumulation:
  
  while (getAccumulator() >= DT && physicsSteps < CONSTANTS.MAX_PHYSICS_STEPS) {
    // Integrate physics for all modes
      const len = balls.length;
      for (let i = 0; i < len; i++) {
        balls[i].step(DT, applyForcesFunc);
      }
    
    // Collision solver iterations (performance tuning)
    const collisionIterations = Math.max(
      1,
      Math.min(20, Math.round(Number(globals.physicsCollisionIterations ?? 10) || 10))
    );

    // Ball-to-ball collisions:
    // - Disabled for Flies (swarm aesthetic)
    // - Reduced for Kaleidoscope mode (performance)
    // - Standard for remaining physics modes
    if (globals.currentMode === MODES.KALEIDOSCOPE) {
      resolveCollisions(6); // handled by kaleidoscope early-return, kept for safety
    } else if (globals.currentMode !== MODES.FLIES &&
               globals.currentMode !== MODES.SPHERE_3D &&
               globals.currentMode !== MODES.CUBE_3D &&
               globals.currentMode !== MODES.PARALLAX_LINEAR &&
               globals.currentMode !== MODES.PARALLAX_FLOAT &&
               globals.currentMode !== MODES.STARFIELD_3D &&
               globals.currentMode !== MODES.DVD_LOGO) {
      resolveCollisions(collisionIterations); // configurable solver iterations
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
      const isPitLike = (mode === MODES.PIT);
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
    if (mode === MODES.PIT) {
      resolveCollisions(3);

      // The post-wall collision pass can push bodies slightly outside the inset wall bounds.
      // Clamp once more without registering wall effects (sound/pressure/wobble).
      // PERF: Reuse preallocated options object
      const wallRestitution = globals.REST;
      const lenClamp = balls.length;
      const canvasW = canvas.width;
      const canvasH = canvas.height;
      for (let i = 0; i < lenClamp; i++) {
        balls[i].walls(canvasW, canvasH, DT, wallRestitution, PIT_CLAMP_OPTS);
      }

      // ══════════════════════════════════════════════════════════════════════════
      // POST-PHYSICS STABILIZATION (Pit modes only)
      // After all constraints, aggressively dampen near-stationary balls.
      // This simulates static friction and prevents perpetual micro-wiggle on mobile.
      // ══════════════════════════════════════════════════════════════════════════
      const DPR = globals.DPR || 1;
      // Thresholds must be DPR-scaled: physics runs in canvas pixels (displayPx * DPR)
      // Same apparent motion = DPRx higher velocity in canvas space
      const vThresh = (Number.isFinite(globals.sleepVelocityThreshold) ? globals.sleepVelocityThreshold : 12.0) * DPR;
      // PERF: Precompute squared thresholds to avoid Math.sqrt in hot loop
      const vThreshSq = vThresh * vThresh;
      const tinySpeedSq = (2 * DPR) * (2 * DPR);
      const wThresh = Number.isFinite(globals.sleepAngularThreshold) ? globals.sleepAngularThreshold : 0.18;
      const tSleep = globals.timeToSleep ?? 0.25;
      
      for (let i = 0; i < lenClamp; i++) {
        const b = balls[i];
        if (!b || b.isSleeping) continue;
        
        // PERF: Use squared speed comparison to avoid Math.sqrt
        const speedSq = b.vx * b.vx + b.vy * b.vy;
        const angSpeed = Math.abs(b.omega);
        
        // Aggressive stabilization: if grounded OR supported with tiny velocity, zero it
        // hasSupport = resting on another ball; isGrounded = touching floor
        const isSettled = b.isGrounded || b.hasSupport;
        if (isSettled && speedSq < vThreshSq && angSpeed < wThresh) {
          // Aggressively dampen toward zero (static friction simulation)
          b.vx *= 0.5;
          b.vy *= 0.5;
          b.omega *= 0.5;
          
          // If really tiny, snap to zero (DPR-scaled)
          if (speedSq < tinySpeedSq) {
            b.vx = 0;
            b.vy = 0;
          }
          if (angSpeed < 0.02) {
            b.omega = 0;
          }
          
          // Accumulate sleep timer
          b.sleepTimer += DT;
          if (b.sleepTimer >= tSleep) {
            b.vx = 0;
            b.vy = 0;
            b.omega = 0;
            b.isSleeping = true;
          }
        } else {
          // Moving too fast - reset sleep timer
          b.sleepTimer = 0;
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
        mode !== MODES.PIT;

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
}

export async function updatePhysics(dtSeconds, applyForcesFunc) {
  const globals = getGlobals();
  const canvas = globals.canvas;
  const balls = globals.balls;

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

  // Update logo entrance animation
  updateLogoEntrance(dtSeconds);
}

export function render() {
  const globals = getGlobals();
  const ctx = globals.ctx;
  const balls = globals.balls;
  const canvas = globals.canvas;
  
  if (!ctx || !canvas) return;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // LOGO: Update size (early-exits if no changes)
  // ═══════════════════════════════════════════════════════════════════════════════
  const dpr = globals.DPR || 1;
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
  
  if (globals.currentMode === MODES.KALEIDOSCOPE) {
    // Kaleidoscope has special rendering - draw logo first, then kaleidoscope on top
    if (logoReady) {
      drawLogo(ctx, canvas.width, canvas.height);
    }
    renderKaleidoscope(ctx);
  } else if (!needsZPartition) {
    // ═══════════════════════════════════════════════════════════════════════════
    // CATEGORY A: All balls render ON TOP of logo (no z-partitioning)
    // ═══════════════════════════════════════════════════════════════════════════
    if (logoReady) {
      drawLogo(ctx, canvas.width, canvas.height);
    }
    
    // Draw all balls (color-batched for performance)
    renderBallsColorBatched(ctx, balls);
    
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
      renderBallsColorBatched(ctx, zPartitionCache.behind, true); // Apply depth fog
    }
    
    // Draw logo
    if (logoReady) {
      drawLogo(ctx, canvas.width, canvas.height);
    }
    
    // Draw balls in front of logo (also apply depth fog for consistent effect)
    if (zPartitionCache.inFront.length > 0) {
      renderBallsColorBatched(ctx, zPartitionCache.inFront, true); // Apply depth fog
    }
  }

  if (modeRenderer && modeRenderer.postRender) {
    modeRenderer.postRender(ctx);
  }
  
  // Restore clip BEFORE drawing walls (walls extend beyond canvas edges)
  if (needsClip) {
    ctx.restore();
  }
  
  // Mouse trail: draw after clip restore so it's always visible
  drawMouseTrail(ctx);

  // Depth wash: gradient overlay between balls/trail and wall
  drawDepthWash(ctx, canvas.width, canvas.height);
  
  // Draw rubber walls LAST (in front of balls, outside clip path)
  drawWalls(ctx, canvas.width, canvas.height);
}

/**
 * Render balls with color batching optimization
 * Groups balls by color to reduce ctx.fillStyle changes
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} ballsToRender - Array of Ball objects
 * @param {boolean} applyDepthFog - Whether to apply z-depth fog (for balls behind logo)
 */
function renderBallsColorBatched(ctx, ballsToRender, applyDepthFog = false) {
  if (!ballsToRender || ballsToRender.length === 0) return;
  
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
      
      // Handle special rendering cases (squash, alpha, filtering)
      const hasSquash = ball.squashAmount > 0.01;
      const filterOpacity = ball.filterOpacity ?? 1;
      let effectiveAlpha = ball.alpha * filterOpacity;
      
      // Apply depth fog for balls behind logo (more transparent when further back)
      if (applyDepthFog) {
        const fogOpacity = getDepthFogOpacity(ball.z ?? 1.0);
        effectiveAlpha *= fogOpacity;
      }
      
      const hasAlpha = effectiveAlpha < 1.0;
      
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
          ctx.arc(ball.x, ball.y, ball.getDisplayRadius(), 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.restore();
      } else {
        // Fast path: simple circle (no transforms, no save/restore)
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.getDisplayRadius(), 0, Math.PI * 2);
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
  // Physics still uses ripples via getWaterRipples() in water.js forces.
}
