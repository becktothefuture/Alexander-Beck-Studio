// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            WEIGHTLESS MODE                                   ║
// ║            Extracted from balls-source.html lines 3559-3585                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { spawnBall } from '../physics/spawn.js';
import { getGlobals, clearBalls } from '../core/state.js';

export function initializeWeightless() {
  const globals = getGlobals();
  clearBalls();
  
  const targetBalls = globals.weightlessCount;
  const w = globals.canvas.width;
  const h = globals.canvas.height;
  const margin = 40 * globals.DPR;
  
  for (let i = 0; i < targetBalls; i++) {
    const x = margin + Math.random() * (w - 2 * margin);
    const y = margin + Math.random() * (h - 2 * margin);
    
    const ball = spawnBall(x, y);
    
    const angle = Math.random() * Math.PI * 2;
    const speed = globals.weightlessInitialSpeed * (0.7 + Math.random() * 0.3);
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.driftAx = 0;
    ball.driftTime = 0;
  }
}


