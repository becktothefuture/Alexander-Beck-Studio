// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      PHYSICS ENGINE (COMPLETE)                               ║
// ║           Fixed-timestep with collision detection                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { CONSTANTS, MODES } from '../core/constants.js';
import { getGlobals } from '../core/state.js';
import { resolveCollisions } from './collision.js';
import { updateWaterRipples, getWaterRipples } from '../modes/water.js';
import { wallState, drawWalls, updateChromeColor } from './wall-state.js';
import { getModeUpdater } from '../modes/mode-controller.js';
import { renderKaleidoscope } from '../modes/kaleidoscope.js';

const DT = CONSTANTS.PHYSICS_DT;
let acc = 0;
const CORNER_RADIUS = 42; // matches rounded container corners
const CORNER_FORCE = 1800;

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

export async function updatePhysics(dtSeconds, applyForcesFunc) {
  const globals = getGlobals();
  const balls = globals.balls;
  const canvas = globals.canvas;
  
  if (!canvas || balls.length === 0) return;

  // Kaleidoscope should only move when the pointer moves.
  // If the pointer hasn't moved recently, freeze physics entirely (no drift/settling).
  if (globals.currentMode === MODES.KALEIDOSCOPE) {
    const nowMs = performance.now();
    const lastMove = globals.lastPointerMoveMs || 0;
    if (nowMs - lastMove > 40) {
      acc = 0;
      return;
    }
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
    // - Reduced for Kaleidoscope (performance)
    // - Standard for Tilt (many light balls flow like water)
    if (globals.currentMode === MODES.KALEIDOSCOPE) {
      resolveCollisions(6); // fewer iterations than heavy modes; enough to prevent overlap
    } else if (globals.currentMode !== MODES.FLIES) {
      resolveCollisions(10); // standard solver iterations for stability
    }
    
    // Wall collisions + corner repellers
      const wallRestitution = (globals.currentMode === MODES.WEIGHTLESS) ? globals.weightlessBounce : globals.REST;
    const lenWalls = balls.length;
    for (let i = 0; i < lenWalls; i++) {
      applyCornerRepellers(balls[i], canvas);
        balls[i].walls(canvas.width, canvas.height, DT, wallRestitution);
    }
    
    acc -= DT;
    physicsSteps++;
  }
  
  // Mode-specific per-frame updates (water ripples, magnetic explosions, tilt transform, etc.)
  const modeUpdater = getModeUpdater();
  if (modeUpdater) {
    modeUpdater(dtSeconds);
  }
  
  // Update rubber wall physics (always runs, only renders when deformed)
  wallState.step(dtSeconds);

  // Reset accumulator if falling behind
  if (acc > DT * CONSTANTS.ACCUMULATOR_RESET_THRESHOLD) acc = 0;
}

export function render() {
  const globals = getGlobals();
  const ctx = globals.ctx;
  const balls = globals.balls;
  const canvas = globals.canvas;
  
  if (!ctx || !canvas) return;
  
  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw water ripples (behind balls)
  if (globals.currentMode === MODES.WATER) {
    drawWaterRipples(ctx);
  }
  
  // Draw balls (or mode-specific renderer)
  if (globals.currentMode === MODES.KALEIDOSCOPE) {
    renderKaleidoscope(ctx);
  } else {
  for (let i = 0; i < balls.length; i++) {
    balls[i].draw(ctx);
    }
  }
  
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
