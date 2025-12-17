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
  
  while (acc >= DT && physicsSteps < CONSTANTS.MAX_PHYSICS_STEPS) {
    // Integrate physics for all modes
      const len = balls.length;
      for (let i = 0; i < len; i++) {
        balls[i].step(DT, applyForcesFunc);
      }
    
    // Ball-to-ball collisions:
    // - Disabled for Flies (swarm aesthetic)
    // - Disabled for Orbit 3D (clean swirl aesthetic)
    // - Reduced for Kaleidoscope modes (performance)
    // - Standard for Tilt (many light balls flow like water)
    if (globals.currentMode === MODES.KALEIDOSCOPE ||
        globals.currentMode === MODES.KALEIDOSCOPE_1 ||
        globals.currentMode === MODES.KALEIDOSCOPE_2 ||
        globals.currentMode === MODES.KALEIDOSCOPE_3) {
      resolveCollisions(6); // fewer iterations than heavy modes; enough to prevent overlap
    } else if (globals.currentMode !== MODES.FLIES && 
               globals.currentMode !== MODES.ORBIT_3D &&
               globals.currentMode !== MODES.PARALLAX_LINEAR &&
               globals.currentMode !== MODES.PARALLAX_PERSPECTIVE) {
      resolveCollisions(10); // standard solver iterations for stability
    }

    // Clear wall pressure before re-accumulating (called each physics step)
    wallState.clearAllPressure();
    
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
      const lenWalls = balls.length;
      for (let i = 0; i < lenWalls; i++) {
        applyCornerRepellers(balls[i], canvas);
        balls[i].walls(canvas.width, canvas.height, DT, wallRestitution);
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
  
  // Clear / Ghost layer (motion trails)
  if (globals.ghostLayerEnabled) {
    const alpha = globals.ghostLayerUsePerThemeOpacity
      ? (globals.isDarkMode ? globals.ghostLayerOpacityDark : globals.ghostLayerOpacityLight)
      : globals.ghostLayerOpacity;

    // IMPORTANT: Fade to TRANSPARENT (not to a solid background color).
    // This preserves visibility of DOM elements behind the canvas (e.g. the logo).
    if (alpha >= 1) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else if (alpha > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = alpha;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
  
  // Draw rubber walls LAST (in front of balls)
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
