// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      PHYSICS ENGINE (COMPLETE)                               ║
// ║           Fixed-timestep with collision detection                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { CONSTANTS, MODES } from '../core/constants.js';
import { getGlobals } from '../core/state.js';
import { resolveCollisions, resolveCollisionsCustom } from './collision.js';
import { updateWaterRipples, getWaterRipples } from '../modes/water.js';
import { wallState, drawWalls, updateChromeColor } from './wall-state.js';
import { getModeUpdater, getModeRenderer } from '../modes/mode-controller.js';
import { renderKaleidoscope } from '../modes/kaleidoscope.js';
import { applyKaleidoscopeBounds } from '../modes/kaleidoscope.js';
import { drawMouseTrail } from '../visual/mouse-trail.js';

const DT = CONSTANTS.PHYSICS_DT;
let acc = 0;
const CORNER_RADIUS = 42; // matches rounded container corners
const CORNER_FORCE = 1800;
const WARMUP_FRAME_DT = 1 / 60;

function applyCornerRepellers(ball, canvas) {
  const corners = [
    { x: CORNER_RADIUS, y: CORNER_RADIUS },
    { x: canvas.width - CORNER_RADIUS, y: CORNER_RADIUS },
    { x: CORNER_RADIUS, y: canvas.height - CORNER_RADIUS },
    { x: canvas.width - CORNER_RADIUS, y: canvas.height - CORNER_RADIUS }
  ];
  for (let i = 0; i < corners.length; i++) {
    const cx = corners[i].x;
    const cy = corners[i].y;
    const dx = ball.x - cx;
    const dy = ball.y - cy;
    const dist = Math.max(1, Math.hypot(dx, dy));
    if (dist < CORNER_RADIUS + ball.r) {
      const pen = (CORNER_RADIUS + ball.r) - dist;
      const strength = (pen / (CORNER_RADIUS + ball.r)) * CORNER_FORCE;
      const nx = dx / dist;
      const ny = dy / dist;
      ball.vx += nx * strength * DT;
      ball.vy += ny * strength * DT;
    }
  }
}

function updatePhysicsInternal(dtSeconds, applyForcesFunc) {
  const globals = getGlobals();
  const balls = globals.balls;
  const canvas = globals.canvas;
  
  if (!canvas) return;

  if (balls.length === 0) return;

  // Kaleidoscope modes have their own lightweight physics path:
  // - Smooth (per-frame), not fixed-timestep accumulator
  // - Collisions on (prevents overlap)
  // - NO rubber wall deformation / impacts
  // - Simple bounds handling (no corner repellers, no wall wobble)
  if (globals.currentMode === MODES.KALEIDOSCOPE ||
      globals.currentMode === MODES.KALEIDOSCOPE_1 ||
      globals.currentMode === MODES.KALEIDOSCOPE_2 ||
      globals.currentMode === MODES.KALEIDOSCOPE_3) {
    const dt = Math.min(0.033, Math.max(0, dtSeconds));
    const len = balls.length;
    for (let i = 0; i < len; i++) {
      balls[i].step(dt, applyForcesFunc);
    }

    // Keep circles apart (non-overlap) with a lighter solver
    resolveCollisionsCustom({
      iterations: 3,
      positionalCorrectionPercent: 0.22,
      maxCorrectionPx: 1.25 * (globals.DPR || 1),
      enableSound: false
    });

    // Simple bounds (no impacts / no wobble)
    for (let i = 0; i < len; i++) {
      applyKaleidoscopeBounds(balls[i], canvas.width, canvas.height, dt);
    }

    // No wallState.step() in Kaleidoscope
    acc = 0;
    return;
  }
  
  acc += dtSeconds;
  let physicsSteps = 0;

  // Wall input accumulation:
  // The wall ring integrates at a configurable cadence (Tier 1), but impacts/pressure
  // are registered during the fixed-timestep loop. If we clear pressure inside the
  // 120Hz loop, the wall never sees stable "resting pressure" and can become overly wobbly.
  // Clear pressure ONCE per render-frame, then accumulate across physics substeps.
  wallState.clearPressureFrame();
  
  while (acc >= DT && physicsSteps < CONSTANTS.MAX_PHYSICS_STEPS) {
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
    // - Disabled for Orbit 3D (clean swirl aesthetic)
    // - Reduced for Kaleidoscope modes (performance)
    // - Standard for Tilt (many light balls flow like water)
    if (globals.currentMode === MODES.KALEIDOSCOPE ||
        globals.currentMode === MODES.KALEIDOSCOPE_1 ||
        globals.currentMode === MODES.KALEIDOSCOPE_2 ||
        globals.currentMode === MODES.KALEIDOSCOPE_3) {
      resolveCollisions(6); // handled by kaleidoscope early-return, kept for safety
    } else if (globals.currentMode !== MODES.FLIES && 
               globals.currentMode !== MODES.ORBIT_3D &&
               globals.currentMode !== MODES.PARALLAX_LINEAR &&
               globals.currentMode !== MODES.PARALLAX_PERSPECTIVE) {
      resolveCollisions(collisionIterations); // configurable solver iterations
    }

    // Reset per-step caps/counters (impacts + pressure-event budget)
    wallState.resetStepBudgets();
    
    // Wall collisions + corner repellers
    // Skip for Orbit modes (they orbit freely without wall constraints)
    // Skip for Parallax modes (they have internal wrap logic, no wall physics)
    // Skip for Lattice mode (infinite mesh extends beyond viewport, no wall physics needed)
    if (globals.currentMode !== MODES.ORBIT_3D && 
        globals.currentMode !== MODES.ORBIT_3D_2 &&
        globals.currentMode !== MODES.PARALLAX_LINEAR &&
        globals.currentMode !== MODES.PARALLAX_PERSPECTIVE &&
        globals.currentMode !== MODES.LATTICE) {
      const wallRestitution = (globals.currentMode === MODES.WEIGHTLESS) ? globals.weightlessBounce : globals.REST;
      const isPitLike = (globals.currentMode === MODES.PIT || globals.currentMode === MODES.PIT_THROWS);
      const lenWalls = balls.length;
      for (let i = 0; i < lenWalls; i++) {
        // Ball Pit has explicit rounded-corner arc clamping in Ball.walls().
        // Avoid an additional velocity-based corner repeller there, which can
        // create local compressions in dense corner stacks.
        if (!isPitLike) applyCornerRepellers(balls[i], canvas);
        balls[i].walls(canvas.width, canvas.height, DT, wallRestitution);
      }
    }

    // Ball Pit stabilization:
    // Wall/corner clamping can re-introduce overlaps in dense stacks (especially near the floor).
    // Run a small post-wall collision pass for Pit-like modes only.
    if (globals.currentMode === MODES.PIT || globals.currentMode === MODES.PIT_THROWS) {
      resolveCollisions(3);

      // The post-wall collision pass can push bodies slightly outside the inset wall bounds.
      // Clamp once more without registering wall effects (sound/pressure/wobble).
      const wallRestitution = globals.REST;
      const lenClamp = balls.length;
      for (let i = 0; i < lenClamp; i++) {
        balls[i].walls(canvas.width, canvas.height, DT, wallRestitution, { registerEffects: false });
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
      const wThresh = Number.isFinite(globals.sleepAngularThreshold) ? globals.sleepAngularThreshold : 0.18;
      const tSleep = globals.timeToSleep ?? 0.25;
      
      for (let i = 0; i < lenClamp; i++) {
        const b = balls[i];
        if (!b || b.isSleeping) continue;
        
        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        const angSpeed = Math.abs(b.omega);
        
        // Aggressive stabilization: if grounded OR supported with tiny velocity, zero it
        // hasSupport = resting on another ball; isGrounded = touching floor
        const isSettled = b.isGrounded || b.hasSupport;
        if (isSettled && speed < vThresh && angSpeed < wThresh) {
          // Aggressively dampen toward zero (static friction simulation)
          b.vx *= 0.5;
          b.vy *= 0.5;
          b.omega *= 0.5;
          
          // If really tiny, snap to zero (DPR-scaled)
          if (speed < 2 * DPR) {
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
      const mode = globals.currentMode;
      const eligible =
        mode !== MODES.FLIES &&
        mode !== MODES.ORBIT_3D &&
        mode !== MODES.ORBIT_3D_2 &&
        mode !== MODES.PARALLAX_LINEAR &&
        mode !== MODES.PARALLAX_PERSPECTIVE &&
        mode !== MODES.KALEIDOSCOPE &&
        mode !== MODES.KALEIDOSCOPE_1 &&
        mode !== MODES.KALEIDOSCOPE_2 &&
        mode !== MODES.KALEIDOSCOPE_3 &&
        mode !== MODES.PIT &&
        mode !== MODES.PIT_THROWS;

      if (eligible) {
        const DPR = globals.DPR || 1;
        const vThresh = Math.max(0, Number(globals.physicsSleepThreshold ?? 12.0) || 0) * DPR;
        const tSleep = Math.max(0, Number(globals.physicsSleepTime ?? 0.25) || 0);
        const wThresh = Number.isFinite(globals.sleepAngularThreshold) ? globals.sleepAngularThreshold : 0.18;

        if (vThresh > 0 && tSleep > 0) {
          const lenSleep = balls.length;
          for (let i = 0; i < lenSleep; i++) {
            const b = balls[i];
            if (!b || b.isSleeping) continue;

            const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            const angSpeed = Math.abs(b.omega);
            if (speed < vThresh && angSpeed < wThresh) {
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
    
    acc -= DT;
    physicsSteps++;
  }
  
  // Mode-specific per-frame updates (water ripples, magnetic explosions, tilt transform, etc.)
  const modeUpdater = getModeUpdater();
  if (modeUpdater) {
    modeUpdater(dtSeconds);
  }
  
  // Update rubber wall physics (all non-kaleidoscope modes)
  wallState.step(dtSeconds);

  // Reset accumulator if falling behind
  if (acc > DT * CONSTANTS.ACCUMULATOR_RESET_THRESHOLD) acc = 0;
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
    acc = 0;

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
  
  // Clear frame (ghost trails removed per performance optimization plan)
  // Clear BEFORE applying clip so the corners never accumulate stale pixels.
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Hard clip the entire render to the rounded-rect canvas radius.
  // This prevents “corner bleed” on iOS/mobile (balls peeking past rounded corners),
  // especially in modes that use non-rounded bounds (e.g., Kaleidoscope).
  const clipPath = globals.canvasClipPath;
  if (clipPath) {
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
  
  // Draw balls (or mode-specific renderer)
  if (globals.currentMode === MODES.KALEIDOSCOPE ||
      globals.currentMode === MODES.KALEIDOSCOPE_1 ||
      globals.currentMode === MODES.KALEIDOSCOPE_2 ||
      globals.currentMode === MODES.KALEIDOSCOPE_3) {
    renderKaleidoscope(ctx);
  } else {
  for (let i = 0; i < balls.length; i++) {
    balls[i].draw(ctx);
    }
  }

  if (modeRenderer && modeRenderer.postRender) {
    modeRenderer.postRender(ctx);
  }

  // Mouse trail: lightweight overlay pass (kept behind the wall/frame draw)
  drawMouseTrail(ctx);
  
  // Restore clip BEFORE drawing walls (walls extend beyond canvas edges)
  if (clipPath) {
    ctx.restore();
  }
  
  // Draw rubber walls LAST (in front of balls, outside clip path)
  drawWalls(ctx, canvas.width, canvas.height);
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
