// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      PHYSICS ENGINE (COMPLETE)                               ║
// ║           Fixed-timestep with collision detection                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { CONSTANTS, MODES } from '../core/constants.js';
import { getGlobals } from '../core/state.js';
import { resolveCollisions } from './collision.js';
import { updateWaterRipples, getWaterRipples } from '../modes/water.js';
import { drawCursor } from '../rendering/cursor.js';

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
  
  acc += dtSeconds;
  let physicsSteps = 0;
  
  while (acc >= DT && physicsSteps < CONSTANTS.MAX_PHYSICS_STEPS) {
    // Integrate physics for all modes
    const len = balls.length;
    for (let i = 0; i < len; i++) {
      balls[i].step(DT, applyForcesFunc);
    }
    
    // Ball-to-ball collisions (disabled for Flies mode)
    if (globals.currentMode !== MODES.FLIES) {
      resolveCollisions(10); // more solver iterations for stability
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
  
  // Water ripple updates run per-frame
  if (globals.currentMode === MODES.WATER) {
    updateWaterRipples(dtSeconds);
  }

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
  
  // Draw water ripples (behind balls for gorgeous effect)
  if (globals.currentMode === MODES.WATER) {
    drawWaterRipples(ctx);
  }
  
  // Draw balls
  for (let i = 0; i < balls.length; i++) {
    balls[i].draw(ctx);
  }
  
  // Cursor overlay
  drawCursor(ctx);
}

function drawWaterRipples(ctx) {
  // Visual ripple rendering intentionally disabled (invisible ripples).
  // Physics still uses ripples via getWaterRipples() in water.js forces.
}
