// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      PHYSICS ENGINE (COMPLETE)                               ║
// ║           Fixed-timestep with collision detection                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { CONSTANTS, MODES } from '../core/constants.js';
import { getGlobals } from '../core/state.js';
import { resolveCollisions } from './collision.js';
import { updatePulseGrid } from '../modes/pulse-grid.js';
import { drawCursor } from '../rendering/cursor.js';

const DT = CONSTANTS.PHYSICS_DT;
let acc = 0;

export function updatePhysics(dtSeconds, applyForcesFunc) {
  const globals = getGlobals();
  const balls = globals.balls;
  const canvas = globals.canvas;
  
  if (!canvas || balls.length === 0) return;
  
  acc += dtSeconds;
  let physicsSteps = 0;
  
  while (acc >= DT && physicsSteps < CONSTANTS.MAX_PHYSICS_STEPS) {
    // Skip physics step for pulse grid mode
    if (globals.currentMode !== MODES.PULSE_GRID) {
      const len = balls.length;
      for (let i = 0; i < len; i++) {
        balls[i].step(DT, applyForcesFunc);
      }
    }
    
    // Ball-to-ball collisions (disabled for Flies and Pulse Grid modes)
    if (globals.currentMode !== MODES.FLIES && globals.currentMode !== MODES.PULSE_GRID) {
      resolveCollisions(6); // Use spatial hashing
    }
    
    // Wall collisions (all modes except Pulse Grid)
    if (globals.currentMode !== MODES.PULSE_GRID) {
      const wallRestitution = (globals.currentMode === MODES.WEIGHTLESS) ? globals.weightlessBounce : globals.REST;
      const len = balls.length;
      for (let i = 0; i < len; i++) {
        balls[i].walls(canvas.width, canvas.height, DT, wallRestitution);
      }
    }
    
    acc -= DT;
    physicsSteps++;
  }
  
  // Pulse grid updates run per-frame, not per-substep
  if (globals.currentMode === MODES.PULSE_GRID) {
    updatePulseGrid(dtSeconds);
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
  
  // Draw balls
  for (let i = 0; i < balls.length; i++) {
    balls[i].draw(ctx);
  }
  // Cursor overlay
  drawCursor(ctx);
}
